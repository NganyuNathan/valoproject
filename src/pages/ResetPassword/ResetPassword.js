import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { updatePassword } from '../../services/authService';
import '../Register/Auth.css';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await updatePassword(password);
      toast.success('Password updated. Please sign in again.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div className="card auth-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="auth-card__brand"><HiOutlineAcademicCap /></div>
        <h1>Set a new password</h1>
        <p className="auth-card__subtitle">Choose a strong password for your InternPath account.</p>
        <form onSubmit={handleSubmit}>
          <div className="field"><label>New password</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="field"><label>Confirm password</label><input className="input" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
        </form>
      </motion.div>
    </div>
  );
}
