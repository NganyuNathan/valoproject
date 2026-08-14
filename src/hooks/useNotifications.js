import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

/**
 * Reads notifications for a user and subscribes to realtime inserts
 * (application status changes, new matching internships, announcements).
 */
export default function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAll();
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) => [payload.new, ...prev]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId, fetchAll]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return { notifications, unreadCount, loading, markAsRead, refetch: fetchAll };
}
