import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';
import { login, loginWithGoogle, resendConfirmation } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import '../Register/Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false); // true when the account exists but the email isn't confirmed
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      await refreshProfile();
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      if (/not confirmed/i.test(err.message || '')) {
        setNeedsConfirm(true);
        toast.error('Please confirm your email first — check your inbox.');
      } else {
        setNeedsConfirm(false);
        toast.error(err.message || 'Could not sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendConfirmation(email);
      toast.success('Confirmation email sent — check your inbox.');
    } catch (err) {
      toast.error(err.message || 'Could not resend the email');
    }
  };

  return (
    <div className="auth-page">
      <motion.div className="card auth-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-card__brand"><HiOutlineAcademicCap /></div>
        <h1>Welcome back</h1>
        <p className="auth-card__subtitle">Sign in to keep tracking your applications.</p>

        <div className="auth-card__tabs">
          <span className="active">Sign in</span>
          <Link to="/register">Create account</Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="auth-card__row">
            <label className="checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>
          {needsConfirm && (
            <p className="field-hint" style={{ marginTop: 12, textAlign: 'center' }}>
              Your email isn't confirmed yet.{' '}
              <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-forest)', fontWeight: 600, textDecoration: 'underline' }}>
                Resend the confirmation email
              </button>
            </p>
          )}
        </form>

        <div className="auth-card__divider"><span>or</span></div>
        <button className="btn btn-outline btn-block" onClick={loginWithGoogle} type="button">
          <FcGoogle /> Continue with Google
        </button>

        <p className="auth-card__footer">Don't have an account? <Link to="/register">Register</Link></p>
      </motion.div>
    </div>
  );
}
