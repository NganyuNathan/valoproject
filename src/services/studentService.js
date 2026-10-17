import { supabase } from './supabase';

export async function listStudents({ search } = {}) {
  let query = supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false });
  // Strip characters that have a special meaning inside PostgREST's or=(...) filter syntax.
  const term = (search || '').trim().replace(/[,()"\\]/g, '');
  if (term) query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function suspendStudent(id, suspended = true) {
  const { data, error } = await supabase.from('profiles').update({ suspended }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStudent(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}
