// Supabase Edge Function: fapshi-payment
//
// Handles Fapshi's "Initiate Pay" flow (hosted checkout covering MTN MoMo and
// Orange Money). It is the ONLY thing allowed to mark an application as paid.
//
// Three kinds of calls reach this function:
//   1. { action: 'request', applicationId, email, redirectUrl }   (from the app, student's JWT)
//   2. { action: 'status',  transId }                              (from the app, student's JWT)
//   3. Fapshi's webhook: { transId, status, ... } with no `action`  (from Fapshi, no JWT)
//
// Deploy (note --no-verify-jwt so Fapshi's webhook can reach it; the app's calls
// are verified inside this function instead):
//   supabase functions deploy fapshi-payment --no-verify-jwt
//
// Secrets:
//   supabase secrets set FAPSHI_API_USER=... FAPSHI_API_KEY=... FAPSHI_ENV=sandbox
//   (optional) FAPSHI_APPLICATION_FEE=250

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FAPSHI_ENV = Deno.env.get('FAPSHI_ENV') || 'sandbox'; // 'sandbox' | 'live'
const FAPSHI_BASE_URL = FAPSHI_ENV === 'live' ? 'https://live.fapshi.com' : 'https://sandbox.fapshi.com';

const API_USER = Deno.env.get('FAPSHI_API_USER')!;
const API_KEY = Deno.env.get('FAPSHI_API_KEY')!;

// The fee is decided HERE, never by the browser, so nobody can pay less.
const APPLICATION_FEE = Number(Deno.env.get('FAPSHI_APPLICATION_FEE') || 250);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const fapshiHeaders = {
  'Content-Type': 'application/json',
  apiuser: API_USER,
  apikey: API_KEY,
};

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/** Works out which logged-in student is calling, from the JWT the app sends. */
async function getCallerId(req: Request, supabase: SupabaseClient): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user?.id ?? null;
}

/** Creates a Fapshi-hosted checkout link the student completes payment on. */
async function initiatePay(args: { email?: string; externalId: string; userId: string; redirectUrl?: string }) {
  const res = await fetch(`${FAPSHI_BASE_URL}/initiate-pay`, {
    method: 'POST',
    headers: fapshiHeaders,
    body: JSON.stringify({
      amount: APPLICATION_FEE,
      email: args.email,
      externalId: args.externalId, // the application id: ties this transaction to exactly one application
      userId: args.userId,
      redirectUrl: args.redirectUrl,
      message: 'Application fee',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Fapshi initiate-pay failed: ${res.status}`);
  return data; // { message, link, transId, dateInitiated }
}

/** Asks Fapshi itself for the real status of a transaction. We never trust a status sent to us. */
async function getPaymentStatus(transId: string) {
  // transId comes from the request (or an unauthenticated webhook), so make sure it's a plain
  // id before it goes into a URL — otherwise something like "../balance" could reach other endpoints.
  if (typeof transId !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(transId)) {
    throw new Error('Invalid transaction id.');
  }
  const res = await fetch(`${FAPSHI_BASE_URL}/payment-status/${encodeURIComponent(transId)}`, { headers: fapshiHeaders });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Fapshi payment-status failed: ${res.status}`);
  return data; // { transId, status, externalId, ... }
}

/** Payment confirmed: record it and switch the application's status from 'unpaid' to 'paid'. */
async function markPaid(supabase: SupabaseClient, applicationId: string) {
  await supabase.from('applications').update({ payment_status: 'verified' }).eq('id', applicationId);
  // Only moves unpaid -> paid. If an admin has already progressed it, leave their status alone.
  await supabase.from('applications').update({ status: 'paid' }).eq('id', applicationId).eq('status', 'unpaid');
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
async function applyResult(supabase: SupabaseClient, result: { status: string; transId: string; externalId?: string }) {
  if (!result.externalId) return;
  if (result.status === 'SUCCESSFUL') await markPaid(supabase, result.externalId);
  else if (result.status === 'FAILED' || result.status === 'EXPIRED') await markFailed(supabase, result.externalId, result.transId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!API_USER || !API_KEY) {
    return reply({ error: 'FAPSHI_API_USER / FAPSHI_API_KEY are not set on this function. Run `supabase secrets set ...` and redeploy.' }, 500);
  }

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---- 3. Fapshi's webhook (no `action`): re-check with Fapshi, then update ----
    if (!body.action && body.transId) {
      const verified = await getPaymentStatus(body.transId);
      await applyResult(supabase, verified);
      return reply({ received: true });
    }

    // Everything below is a call from the app and needs a logged-in student.
    const callerId = await getCallerId(req, supabase);
    if (!callerId) return reply({ error: 'You need to be signed in.' }, 401);

    // ---- 1. Start a payment ----
    if (body.action === 'request') {
      const { applicationId, email, redirectUrl } = body;
      if (!applicationId) return reply({ error: 'Missing applicationId.' }, 400);

      const { data: app } = await supabase
        .from('applications').select('id, student_id, payment_status').eq('id', applicationId).maybeSingle();

      if (!app || app.student_id !== callerId) return reply({ error: 'Application not found.' }, 403);
      if (app.payment_status === 'verified') return reply({ error: 'This application is already paid.' }, 400);

      const result = await initiatePay({ email, externalId: app.id, userId: callerId, redirectUrl });

      await supabase.from('applications').update({
        payment_method: 'fapshi',
        payment_reference: result.transId,
        payment_status: 'unpaid',
      }).eq('id', app.id);

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

    return reply({ error: `Unknown action: ${body.action}` }, 400);
  } catch (err) {
    return reply({ error: (err as Error).message }, 500);
  }
});
