import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { sendPasswordReset } from '../../services/authService';
import '../Register/Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
      toast.success('Reset link sent — check your inbox');
    } catch (err) {
      toast.error(err.message || 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div className="card auth-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-card__brand"><HiOutlineAcademicCap /></div>
        <h1>Reset your password</h1>
        <p className="auth-card__subtitle">Enter the email on your account and we'll send a reset link.</p>
        {sent ? (
          <p style={{ textAlign: 'center' }}>Check <strong>{email}</strong> for a link to reset your password.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field"><label>Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}
        <p className="auth-card__footer"><Link to="/login">Back to sign in</Link></p>
      </motion.div>
    </div>
  );
}
