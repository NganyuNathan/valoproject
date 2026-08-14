import { supabase } from './supabase';

export async function listStudents({ search } = {}) {
  let query = supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false });
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
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
