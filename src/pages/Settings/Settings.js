import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { updatePassword } from '../../services/authService';
import useTheme from '../../hooks/useTheme';
import '../Register/Auth.css';

export default function Settings() {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await updatePassword(password);
      toast.success('Password updated');
      setPassword('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 20 }}>Settings</h1>

      <div className="card profile-section" style={{ padding: 24, marginBottom: 18 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Appearance</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
          <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} /> Dark mode
        </label>
      </div>

      <div className="card profile-section" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Change password</h3>
        <form onSubmit={handleChangePassword} style={{ maxWidth: 360 }}>
          <div className="field"><label>New password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  );
}
