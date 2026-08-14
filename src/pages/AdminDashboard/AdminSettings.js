import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { updatePassword } from '../../services/authService';

export default function AdminSettings() {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try { await updatePassword(password); toast.success('Password updated'); setPassword(''); } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 20 }}>Settings</h1>
      <div className="card" style={{ padding: 24, maxWidth: 400 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Change password</h3>
        <form onSubmit={handleSubmit}>
          <div className="field"><label>New password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  );
}
