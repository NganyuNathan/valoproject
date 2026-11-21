// Supabase Edge Function: fapshi-payment
//
// Handles Fapshi's "Initiate Pay" flow (hosted checkout covering MTN MoMo and
// Orange Money). It is the ONLY thing allowed to mark an application as paid.
//
// Three kinds of calls reach this function:
//   1. { action: 'request', applicationId, email, redirectUrl }   (from the app, student's JWT)
//   2. { action: 'status',  transId }                              (from the app, student's JWT)
//   3. Fapshi's webhook: { transId, status, ... } with no `action`  (from Fapshi, no JWT)
//   4. { action: 'sync' }  catches up payments that were completed but never confirmed
//      (student closed the tab, webhook missed). Admins sync every pending application,
//      students only their own.
//
// IMPORTANT: set the webhook URL in your Fapshi dashboard to
//   https://<your-project-ref>.supabase.co/functions/v1/fapshi-payment
// so payments flip to "Paid" on their own even if the student closes the page.
//
// Deploy (note --no-verify-jwt so Fapshi's webhook can reach it; the app's calls
// are verified inside this function instead):
//   supabase functions deploy fapshi-payment --no-verify-jwt
//
// Secrets:
//   supabase secrets set FAPSHI_API_USER=... FAPSHI_API_KEY=... FAPSHI_ENV=sandbox
//   (optional) FAPSHI_APPLICATION_FEE=300   <- only used when an internship has no usable amount
//
// How much the student pays: the "Salary / stipend" amount the admin typed on the
// internship. Fapshi only accepts whole amounts of at least 100 XAF, so an internship
// with no amount (or under 100) uses the standard fee above instead.
//   Strongly recommended (locks the function to your own website):
//   supabase secrets set ALLOWED_ORIGINS=https://your-site.vercel.app,https://your-domain.com
//   supabase secrets set APP_URL=https://your-site.vercel.app

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FAPSHI_ENV = Deno.env.get('FAPSHI_ENV') || 'sandbox'; // 'sandbox' | 'live'
const FAPSHI_BASE_URL = FAPSHI_ENV === 'live' ? 'https://live.fapshi.com' : 'https://sandbox.fapshi.com';

const API_USER = Deno.env.get('FAPSHI_API_USER')!;
const API_KEY = Deno.env.get('FAPSHI_API_KEY')!;

// The fee is decided HERE, never by the browser, so nobody can pay less.
const APPLICATION_FEE = Number(Deno.env.get('FAPSHI_APPLICATION_FEE') || 300);
const MIN_AMOUNT = 100; // Fapshi rejects anything below 100 XAF, and amounts must be whole numbers

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Only your own website may call this function from a browser, and Fapshi may only
// send students back to your own website. Leave ALLOWED_ORIGINS unset only while testing.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
const APP_URL = (Deno.env.get('APP_URL') || ALLOWED_ORIGINS[0] || '').replace(/\/$/, '');

function corsFor(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.length === 0 ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

/** Never pass a browser-supplied redirect straight to Fapshi (open-redirect / phishing risk). */
function safeRedirect(url?: string): string | undefined {
  const fallback = APP_URL ? `${APP_URL}/internships` : undefined;
  if (!url) return fallback;
  try {
    const u = new URL(url);
    const allowed = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : (APP_URL ? [APP_URL] : []);
    return allowed.includes(u.origin) ? u.toString() : fallback;
  } catch {
    return fallback;
  }
}

/** Simple in-memory rate limiter (best effort: each function instance counts separately). */
const hits = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return recent.length > max;
}

/** Errors whose message is safe to show to the user. Anything else becomes a generic message. */
class PublicError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const fapshiHeaders = {
  'Content-Type': 'application/json',
  apiuser: API_USER,
  apikey: API_KEY,
};

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/** Works out which logged-in student is calling, from the JWT the app sends. */
async function getCaller(req: Request, supabase: SupabaseClient): Promise<{ id: string; email?: string } | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
}

/** Whole-number amount Fapshi will accept for an internship's amount, or the standard fee. */
function amountFromSalary(salary: unknown): number {
  const n = Math.round(Number(salary));
  return Number.isFinite(n) && n >= MIN_AMOUNT ? n : APPLICATION_FEE;
}

// deno-lint-ignore no-explicit-any
const one = (v: any) => (Array.isArray(v) ? v[0] : v);

/** What this application should be charged right now (read from the internship, never from the browser). */
async function currentAmount(supabase: SupabaseClient, applicationId: string): Promise<number> {
  const { data } = await supabase.from('applications').select('internships(salary)').eq('id', applicationId).maybeSingle();
  return amountFromSalary(one(data?.internships)?.salary);
}

/**
 * What a payment for this application must be at least worth to count as paid:
 * the amount locked in when the checkout was created (so an admin editing the
 * internship's amount afterwards can't make a real payment look too small).
 */
async function expectedAmount(supabase: SupabaseClient, applicationId: string): Promise<number> {
  let { data, error } = await supabase.from('applications').select('payment_amount, internships(salary)').eq('id', applicationId).maybeSingle();
  if (error) {
    // payment_amount.sql hasn't been run yet: fall back to the internship's current amount.
    ({ data } = await supabase.from('applications').select('internships(salary)').eq('id', applicationId).maybeSingle());
  }
  const stored = Number(data?.payment_amount);
  if (Number.isFinite(stored) && stored >= MIN_AMOUNT) return stored;
  return amountFromSalary(one(data?.internships)?.salary);
}

/** Creates a Fapshi-hosted checkout link the student completes payment on. */
async function initiatePay(args: { amount: number; email?: string; externalId: string; userId: string; redirectUrl?: string }) {
  const res = await fetch(`${FAPSHI_BASE_URL}/initiate-pay`, {
    method: 'POST',
    headers: fapshiHeaders,
    body: JSON.stringify({
      amount: args.amount,
      email: args.email,
      externalId: args.externalId, // the application id: ties this transaction to exactly one application
      userId: args.userId,
      redirectUrl: args.redirectUrl,
      message: 'Application fee',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Fapshi initiate-pay failed:', res.status, data);
    throw new PublicError('Could not start the payment. Please try again in a moment.', 502);
  }
  return data; // { message, link, transId, dateInitiated }
}

/** Asks Fapshi itself for the real status of a transaction. We never trust a status sent to us. */
async function getPaymentStatus(transId: string) {
  // transId comes from the request (or an unauthenticated webhook), so make sure it's a plain
  // id before it goes into a URL — otherwise something like "../balance" could reach other endpoints.
  if (typeof transId !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(transId)) {
    throw new PublicError('Invalid transaction id.', 400);
  }
  const res = await fetch(`${FAPSHI_BASE_URL}/payment-status/${encodeURIComponent(transId)}`, { headers: fapshiHeaders });
  const data = await res.json();
  if (!res.ok) {
    console.error('Fapshi payment-status failed:', res.status, data);
    throw new PublicError('Could not check the payment right now. Please try again.', 502);
  }
  return data; // { transId, status, externalId, amount, ... }
}

/** Payment confirmed: record it and switch the application's status from 'unpaid' to 'paid'. */
async function markPaid(supabase: SupabaseClient, applicationId: string) {
  // Set both fields together after the transaction has been verified with Fapshi.
  // If an admin has already progressed the application, preserve that status.
  const { data: app, error: readError } = await supabase
    .from('applications').select('status').eq('id', applicationId).maybeSingle();
  if (readError) throw readError;
  if (!app) throw new Error('Application not found while confirming payment.');
  const changes: Record<string, string> = { payment_status: 'verified' };
  if (app.status === 'unpaid') changes.status = 'paid';
  const { error } = await supabase.from('applications').update(changes).eq('id', applicationId);
  if (error) throw error;
}

/** Payment failed/expired. Ignored if it's an old attempt or the application is already paid. */
async function markFailed(supabase: SupabaseClient, applicationId: string, transId: string) {
  await supabase.from('applications')
    .update({ payment_status: 'rejected' })
    .eq('id', applicationId)
    .eq('payment_reference', transId)
    .neq('payment_status', 'verified');
}

/** Applies a Fapshi-verified result to the application it belongs to. */
async function applyResult(supabase: SupabaseClient, result: { status: string; transId: string; externalId?: string; amount?: number | string }) {
  if (!result.externalId) return;
  if (result.status === 'SUCCESSFUL') {
    // Defence in depth: never accept a payment smaller than what this application was charged.
    const paid = Number(result.amount);
    const expected = await expectedAmount(supabase, result.externalId);
    if (Number.isFinite(paid) && paid < expected) {
      console.error(`Payment ${result.transId} is below the amount due (${paid} < ${expected}); not marking as paid.`);
      return;
    }
    await markPaid(supabase, result.externalId);
  }
  else if (result.status === 'FAILED' || result.status === 'EXPIRED') await markFailed(supabase, result.externalId, result.transId);
}

Deno.serve(async (req) => {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) });

  if (!API_USER || !API_KEY) {
    console.error('FAPSHI_API_USER / FAPSHI_API_KEY are not set on this function.');
    return reply({ error: 'Payments are temporarily unavailable.' }, 500);
  }

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();

    // ---- 3. Fapshi's webhook (no `action`): re-check with Fapshi, then update ----
    if (!body.action && body.transId) {
      if (rateLimited(`ip:${ip}`, 60)) return reply({ error: 'Too many requests.' }, 429);
      const verified = await getPaymentStatus(body.transId);
      await applyResult(supabase, verified);
      return reply({ received: true });
    }

    // Everything below is a call from the app and needs a logged-in student.
    const caller = await getCaller(req, supabase);
    if (!caller) return reply({ error: 'You need to be signed in.' }, 401);
    if (rateLimited(`user:${caller.id}`, 40)) return reply({ error: 'Too many requests. Please slow down.' }, 429);
    const callerId = caller.id;

    // ---- 0. The amount due (so the app always shows what Fapshi will really charge) ----
    if (body.action === 'fee') {
      if (!body.applicationId) return reply({ amount: APPLICATION_FEE });
      const { data: own } = await supabase
        .from('applications').select('student_id').eq('id', body.applicationId).maybeSingle();
      if (!own || own.student_id !== callerId) return reply({ error: 'Application not found.' }, 403);
      return reply({ amount: await currentAmount(supabase, body.applicationId) });
    }

    // ---- 1. Start a payment ----
    if (body.action === 'request') {
      const { applicationId, redirectUrl } = body;
      if (!applicationId) return reply({ error: 'Missing applicationId.' }, 400);

      const { data: app } = await supabase
        .from('applications').select('id, student_id, payment_status').eq('id', applicationId).maybeSingle();

      if (!app || app.student_id !== callerId) return reply({ error: 'Application not found.' }, 403);
      if (app.payment_status === 'verified') return reply({ error: 'This application is already paid.' }, 400);

      // The amount is read from the internship itself — the browser has no say in it.
      const amount = await currentAmount(supabase, app.id);

      // The email comes from the signed-in account, and the redirect is checked against the allow-list.
      const result = await initiatePay({
        amount,
        email: caller.email,
        externalId: app.id,
        userId: callerId,
        redirectUrl: safeRedirect(redirectUrl),
      });

      // Lock in the amount that was charged (used later to check the payment was big enough).
      const record = { payment_method: 'fapshi', payment_reference: result.transId, payment_status: 'unpaid' };
      const { error: lockError } = await supabase.from('applications').update({ ...record, payment_amount: amount }).eq('id', app.id);
      // payment_amount.sql not run yet: still record the payment itself.
      if (lockError) await supabase.from('applications').update(record).eq('id', app.id);

      return reply({ link: result.link, transId: result.transId });
    }

    // ---- 2. Check on a payment (the app polls this while the student pays) ----
    if (body.action === 'status') {
      const { transId } = body;
      if (!transId) return reply({ error: 'Missing transId.' }, 400);

      const result = await getPaymentStatus(transId);

      // The transaction must belong to an application owned by the caller.
      const { data: app } = await supabase
        .from('applications').select('id, student_id').eq('id', result.externalId).maybeSingle();
      if (!app || app.student_id !== callerId) return reply({ error: 'Payment not found.' }, 403);

      await applyResult(supabase, result);
      return reply(result);
    }

    // ---- 4. Catch up on payments that were completed but never confirmed ----
    // Looks at applications still marked unpaid that have a Fapshi transaction, asks Fapshi
    // (never trusting the browser) and applies the real result. Safe to call repeatedly.
    if (body.action === 'sync') {
      if (rateLimited(`sync:${callerId}`, 6)) return reply({ error: 'Too many requests. Please slow down.' }, 429);
      const { data: me } = await supabase.from('profiles').select('role').eq('id', callerId).maybeSingle();
      let query = supabase
        .from('applications')
        .select('id, payment_reference')
        .eq('payment_status', 'unpaid')
        .not('payment_reference', 'is', null)
        .limit(25);
      if (me?.role !== 'admin') query = query.eq('student_id', callerId);
      const { data: pending } = await query;

      let confirmed = 0;
      for (const p of pending || []) {
        try {
          const result = await getPaymentStatus(p.payment_reference);
          if (result.externalId !== p.id) continue; // transaction belongs to another application
          await applyResult(supabase, result);
          if (result.status === 'SUCCESSFUL') confirmed++;
        } catch (err) {
          console.error('sync: could not check', p.payment_reference, err);
        }
      }
      return reply({ checked: (pending || []).length, confirmed });
    }

    return reply({ error: 'Unknown action.' }, 400);
  } catch (err) {
    if (err instanceof PublicError) return reply({ error: err.message }, err.status);
    // Real details stay in the function logs, never in the response.
    console.error('fapshi-payment error:', err);
    return reply({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
