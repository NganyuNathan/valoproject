import { supabase } from './supabase';

export async function listAnnouncements() {
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAnnouncement({ title, message }) {
  const { data, error } = await supabase.from('announcements').insert([{ title, message }]).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
