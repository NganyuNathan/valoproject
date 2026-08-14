/**
 * Mobile money payment configuration.
 * EDIT THESE VALUES before going live — this is the number/amount
 * students will be prompted to send the application fee to.
 */
export const PAYMENT_CONFIG = {
  amount: 250, // FCFA
  currency: 'FCFA',
  mtn: {
    // The organisation's MTN Mobile Money number, in local format (no country code), e.g. '677123456'
    number: '654101614',
  },
  orange: {
    // The organisation's Orange Money number, in local format, e.g. '699123456'
    number: '699000000',
  },
};

/**
 * Builds a tel: link that pre-fills the phone dialer with an MTN MoMo
 * "send money" USSD string. The student still has to tap Call themselves,
 * and still has to enter their own MoMo PIN on their own phone — this link
 * only saves them from typing the menu selections and number by hand.
 *
 * Chain: *126# -> 1 (money transfer) -> 2 (to non-MTN/personal number)
 *        -> recipient number -> amount
 */
export function buildMtnDialLink() {
  const { number } = PAYMENT_CONFIG.mtn;
  const { amount } = PAYMENT_CONFIG;
  const ussd = `*126*1*2*${number}*${amount}%23`; // %23 = URL-encoded '#'
  return `tel:${ussd}`;
}

/**
 * Orange Money Cameroon's menu code is #150#. Orange's chained "transfer"
 * shortcut format varies more by market than MTN's, so this opens the base
 * menu pre-filled — the student picks "Transfer" and enters the number/amount
 * themselves inside the USSD menu rather than everything being pre-chained.
 */
export function buildOrangeDialLink() {
  return 'tel:%23150%23';
}
