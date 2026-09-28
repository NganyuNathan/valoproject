import React, { useState } from 'react';
import { HiOutlineCreditCard, HiOutlineExternalLink, HiOutlineXCircle } from 'react-icons/hi';
import { PAYMENT_CONFIG } from '../../config/payment';
import { requestFapshiPayment, pollFapshiPayment } from '../../services/paymentService';

/**
 * Step 1 of applying: pay the application fee via Fapshi's hosted checkout
 * (covers both MTN MoMo and Orange Money on one page). The student pays and
 * confirms on their own phone on Fapshi's page — we only poll for the real,
 * confirmed result. Nothing here can be faked by editing form data, since
 * `payment_status` is only ever written by the trusted backend function.
 */
export default function PaymentStep({ applicationId, userId, email, onConfirmed }) {
  const [stage, setStage] = useState('idle'); // 'idle' | 'redirecting' | 'waiting' | 'failed'
  const [error, setError] = useState(null);

  const handlePay = async () => {
    setStage('redirecting');
    setError(null);
    try {
      const { link, transId } = await requestFapshiPayment({
        applicationId, userId, email, amount: PAYMENT_CONFIG.amount,
      });

      const checkoutWindow = window.open(link, '_blank', 'noopener,noreferrer');
      if (!checkoutWindow) {
        // Popup blocked — fall back to the current tab.
        window.location.href = link;
        return;
      }

      setStage('waiting');
      const result = await pollFapshiPayment({ transId, applicationId });

      if (result.status === 'SUCCESSFUL') {
        onConfirmed();
      } else {
        setStage('failed');
        setError('Payment was not completed. You can try again.');
      }
    } catch (err) {
      setStage('failed');
      setError(err.message || 'Something went wrong starting the payment.');
    }
  };

  return (
    <div className="payment-step">
      <div className="payment-step__amount">
        <span>Application fee</span>
        <strong>{PAYMENT_CONFIG.amount} {PAYMENT_CONFIG.currency}</strong>
      </div>

      <p className="payment-step__help">
        Pay securely via MTN MoMo or Orange Money on Fapshi's checkout page. You'll confirm the payment yourself on your own phone — we only find out once it's genuinely completed.
      </p>

      {stage === 'idle' && (
        <button type="button" className="btn btn-primary btn-block payment-step__pay-btn" onClick={handlePay}>
          <HiOutlineCreditCard /> Pay with Fapshi <HiOutlineExternalLink />
        </button>
      )}

      {stage === 'redirecting' && (
        <div className="payment-step__status">
          <span className="payment-step__spinner" />
          Opening secure checkout…
        </div>
      )}

      {stage === 'waiting' && (
        <div className="payment-step__status">
          <span className="payment-step__spinner" />
          Waiting for you to complete payment in the other tab…
        </div>
      )}

      {stage === 'failed' && (
        <div className="payment-step__result payment-step__result--failed">
          <HiOutlineXCircle />
          <span>{error}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={handlePay}>Try again</button>
        </div>
      )}
    </div>
  );
}
