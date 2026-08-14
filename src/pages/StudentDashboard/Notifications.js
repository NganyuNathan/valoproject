import React from 'react';
import { HiOutlineBell } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import useNotifications from '../../hooks/useNotifications';
import { formatDate } from '../../utils/formatters';

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, loading, markAsRead } = useNotifications(user?.id);

  return (
    <div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 20 }}>Notifications</h1>
      {loading ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : notifications.length === 0 ? (
        <div className="card empty-state"><h3>You're all caught up</h3><p>We'll notify you here about matching internships, application updates, and announcements.</p></div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {notifications.map((n) => (
            <div key={n.id} onClick={() => markAsRead(n.id)} style={{
              display: 'flex', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--color-line-soft)',
              background: n.read ? 'transparent' : 'var(--color-mint-50)', cursor: 'pointer',
            }}>
              <HiOutlineBell style={{ color: 'var(--color-forest)', fontSize: '1.2rem', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{n.message}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: 4 }}>{formatDate(n.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
