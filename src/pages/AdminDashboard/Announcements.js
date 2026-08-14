import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '../../services/announcementService';
import { formatDate } from '../../utils/formatters';
import './AdminTables.css';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); listAnnouncements().then(setAnnouncements).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    try { await createAnnouncement({ title, message }); toast.success('Announcement posted'); setTitle(''); setMessage(''); load(); } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    try { await deleteAnnouncement(id); toast.success('Removed'); load(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="admin-header"><h1>Announcements</h1></div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 22, marginBottom: 22, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="field"><label>Message</label><textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><HiOutlinePlus /> Post announcement</button>
      </form>

      {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {announcements.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--color-line-soft)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>{a.message}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: 4 }}>{formatDate(a.created_at)}</div>
              </div>
              <button onClick={() => handleDelete(a.id)} aria-label="Delete" style={{ background: 'none', border: 'none', color: 'var(--color-danger)', flexShrink: 0 }}><HiOutlineTrash /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
