/**
 * Mobile money payment configuration.
 * Fapshi handles the actual MTN MoMo / Orange Money charge — see
 * supabase/functions/fapshi-payment. This file just holds the fee amount.
 */
export const PAYMENT_CONFIG = {
  amount: 250, // FCFA
  currency: 'FCFA',
};
