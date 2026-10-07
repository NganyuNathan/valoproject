// Supabase Edge Function: fapshi-payment
// Handles Fapshi's "Initiate Pay" flow (hosted checkout link covering both
// MTN MoMo and Orange Money) plus status polling.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FAPSHI_ENV = Deno.env.get('FAPSHI_ENV') || 'sandbox'; // 'sandbox' | 'live'
const FAPSHI_BASE_URL = FAPSHI_ENV === 'live'
  ? 'https://live.fapshi.com'
  : 'https://sandbox.fapshi.com';

const API_USER = Deno.env.get('FAPSHI_API_USER')!;
const API_KEY = Deno.env.get('FAPSHI_API_KEY')!;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fapshiHeaders = {
  'Content-Type': 'application/json',
  apiuser: API_USER,
  apikey: API_KEY,
};

async function initiatePay({ amount, email, externalId, userId, redirectUrl }: {
  amount: number; email?: string; externalId: string; userId: string; redirectUrl?: string;
}) {
  const res = await fetch(`${FAPSHI_BASE_URL}/initiate-pay`, {
    method: 'POST',
    headers: fapshiHeaders,
    body: JSON.stringify({
      amount,
      email,
      externalId,
      userId,
      redirectUrl,
      message: 'InternPath application fee',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Fapshi initiate-pay failed: ${res.status}`);
  return data;
}

async function getPaymentStatus(transId: string) {
  const res = await fetch(`${FAPSHI_BASE_URL}/payment-status/${transId}`, {
    headers: fapshiHeaders,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Fapshi payment-status failed: ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (body.action === 'request') {
      const { applicationId, email, amount, userId, redirectUrl } = body;
      const result = await initiatePay({ amount, email, externalId: applicationId, userId, redirectUrl });

      await supabase.from('applications').update({
        payment_method: 'fapshi',
        payment_reference: result.transId,
        payment_status: 'unpaid',
      }).eq('id', applicationId);

      return new Response(JSON.stringify({ link: result.link, transId: result.transId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'status') {
      const { transId, applicationId } = body;
      const result = await getPaymentStatus(transId);

      if (result.status === 'SUCCESSFUL' && applicationId) {
        await supabase.from('applications').update({ payment_status: 'verified' }).eq('id', applicationId);
      } else if ((result.status === 'FAILED' || result.status === 'EXPIRED') && applicationId) {
        await supabase.from('applications').update({ payment_status: 'rejected' }).eq('id', applicationId);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});