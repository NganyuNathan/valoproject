import { supabase } from './supabase';

/**
 * supabase.functions.invoke() throws a generic "non-2xx status code" error
 * whenever the function responds with an error status — it does NOT
 * automatically surface the actual message our function sent back in the
 * response body. This pulls out the real reason so we're not debugging blind.
 */
async function getRealErrorMessage(error, fallbackData) {
  if (fallbackData?.error) return fallbackData.error;
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) return body.error;
    }
  } catch {
    // response body wasn't JSON or couldn't be read — fall through to the generic message
  }
  return error?.message || 'Unknown error calling the payment function';
}

/** Asks the server what this application will really be charged, so the screen always matches Fapshi's page. */
export async function getApplicationFee(applicationId) {
  const { data, error } = await supabase.functions.invoke('fapshi-payment', {
    body: { action: 'fee', applicationId },
  });
  if (error || !data?.amount) return null;
  return Number(data.amount);
}

/**
 * Creates a Fapshi-hosted checkout link for the application fee. The
 * student completes the actual payment on Fapshi's page (choosing MTN MoMo
 * or Orange Money) — nothing is charged automatically from here.
 */
export async function requestFapshiPayment({ applicationId }) {
  const { data, error } = await supabase.functions.invoke('fapshi-payment', {
    // The server decides the amount and uses the signed-in account's own email;
    // the redirect is checked against an allow-list there too.
    body: {
      action: 'request',
      applicationId,
      redirectUrl: `${window.location.origin}/internships`,
    },
  });
  if (error || data?.error) throw new Error(await getRealErrorMessage(error, data));
  return data; // { link, transId }
}

/** Checks the current status of a previously initiated Fapshi payment. */
export async function checkFapshiPaymentStatus({ transId, applicationId }) {
  const { data, error } = await supabase.functions.invoke('fapshi-payment', {
    body: { action: 'status', transId, applicationId },
  });
  if (error || data?.error) throw new Error(await getRealErrorMessage(error, data));
  return data; // { status: 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED', ... }
}

/**
 * Polls checkFapshiPaymentStatus every `intervalMs` until it resolves to
 * SUCCESSFUL/FAILED/EXPIRED or `timeoutMs` is reached.
 */
export async function pollFapshiPayment({ transId, applicationId, intervalMs = 4000, timeoutMs = 180000 }) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await checkFapshiPaymentStatus({ transId, applicationId });
    if (['SUCCESSFUL', 'FAILED', 'EXPIRED'].includes(result.status)) return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Payment confirmation timed out — if you completed payment, refresh and check My Applications.');
}
