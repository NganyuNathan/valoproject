import React, { useState } from 'react';
import { HiOutlinePhone, HiOutlineInformationCircle } from 'react-icons/hi';
import { PAYMENT_CONFIG, buildMtnDialLink, buildOrangeDialLink } from '../../config/payment';

const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Step 1 of applying: pay the application fee via mobile money.
 *
 * IMPORTANT — this is a "click to dial" convenience, not a payment API.
 * Tapping a button opens the phone's own dialer pre-filled with the USSD
 * string; the student still has to tap Call themselves and enter their own
 * MoMo/Orange Money PIN on their own device. Nothing is charged
 * automatically, and this app has no way to confirm the payment actually
 * went through — the student self-reports the SMS confirmation code they
 * receive, and an admin cross-checks it manually before approving.
 */
export default function PaymentStep({ onConfirmed }) {
  const [method, setMethod] = useState(null); // 'mtn' | 'orange'
  const [dialed, setDialed] = useState(false);
  const [reference, setReference] = useState('');
  const mobile = isMobileBrowser();

  const handleDial = (m) => {
    setMethod(m);
    setDialed(true);
    window.location.href = m === 'mtn' ? buildMtnDialLink() : buildOrangeDialLink();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!method || !reference.trim()) return;
    onConfirmed({ method, reference: reference.trim() });
  };

  return (
    <div className="payment-step">
      <div className="payment-step__amount">
        <span>Application fee</span>
        <strong>{PAYMENT_CONFIG.amount} {PAYMENT_CONFIG.currency}</strong>
      </div>

      {!mobile && (
        <div className="payment-step__notice">
          <HiOutlineInformationCircle />
          You're on a computer, so we can't open your phone's dialer directly. Open this page on your phone to use the one-tap payment buttons below, or dial the USSD code manually from your phone.
        </div>
      )}

      <p className="payment-step__help">
        Tap a button below to open your phone's dialer with the payment already filled in. You'll still need to tap <strong>Call</strong> yourself and enter your own PIN — we never do this automatically.
      </p>

      <div className="payment-step__buttons">
        <button type="button" className="btn btn-outline payment-step__method" onClick={() => handleDial('mtn')}>
          <HiOutlinePhone /> Pay with MTN MoMo
        </button>
        <button type="button" className="btn btn-outline payment-step__method" onClick={() => handleDial('orange')}>
          <HiOutlinePhone /> Pay with Orange Money
        </button>
      </div>

      {dialed && (
        <form onSubmit={handleSubmit} className="payment-step__confirm">
          <div className="field">
            <label>Confirmation code from your payment SMS</label>
            <input
              className="input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. the code MTN/Orange texted you"
              required
            />
            <div className="field-hint">We'll ask an admin to verify this against your payment before your application is approved.</div>
          </div>
          <button className="btn btn-primary btn-block" disabled={!reference.trim()}>
            I've paid — continue to application
          </button>
        </form>
      )}
    </div>
  );
}
