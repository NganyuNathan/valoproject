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

/**
 * Permanently deletes a student's login account, profile, applications and uploaded
 * files. This goes through the `admin-delete-user` Edge Function, which checks the
 * caller really is an admin (deleting a login account needs the service-role key,
 * which must never be in the browser).
 */
export async function deleteStudent(id) {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: id } });
  if (error || data?.error) {
    let message = data?.error;
    try {
      if (!message && error?.context && typeof error.context.json === 'function') {
        message = (await error.context.json())?.error;
      }
    } catch {
      // body wasn't JSON — fall through
    }
    throw new Error(message || 'Could not delete this student.');
  }
}
