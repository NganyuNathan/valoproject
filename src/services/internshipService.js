import { supabase } from './supabase';

export async function listInternships({ search, category, industry, location, workMode, paid, duration, page = 1, pageSize = 12 } = {}) {
  let query = supabase.from('internships').select('*, companies(*)', { count: 'exact' }).eq('status', 'published');

  if (search) {
    query = query.or(`title.ilike.%${search}%,skills_required.ilike.%${search}%`);
  }
  if (category) query = query.eq('category', category);
  if (industry) query = query.eq('industry', industry);
  if (location) query = query.ilike('location', `%${location}%`);
  if (workMode) query = query.eq('internship_type', workMode);
  if (paid) query = query.eq('is_paid', paid === 'paid');
  if (duration) query = query.eq('duration', duration);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getInternshipById(id) {
  const { data, error } = await supabase
    .from('internships')
    .select('*, companies(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createInternship(payload) {
  const { data, error } = await supabase.from('internships').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateInternship(id, updates) {
  const { data, error } = await supabase.from('internships').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInternship(id) {
  const { error } = await supabase.from('internships').delete().eq('id', id);
  if (error) throw error;
}

export async function setInternshipStatus(id, status) {
  return updateInternship(id, { status }); // 'published' | 'archived' | 'draft'
}

/* ---- Saved internships ---- */
export async function saveInternship(studentId, internshipId) {
  const { error } = await supabase.from('saved_internships').insert([{ student_id: studentId, internship_id: internshipId }]);
  if (error) throw error;
}

export async function unsaveInternship(studentId, internshipId, savedRowId = null) {
  let query = supabase.from('saved_internships').delete().eq('student_id', studentId);
  query = internshipId ? query.eq('internship_id', internshipId) : query.eq('id', savedRowId);
  const { error } = await query;
  if (error) throw error;
}

export async function listSavedInternships(studentId) {
  const { data, error } = await supabase
    .from('saved_internships')
    .select('id, created_at, internships(*, companies(*))')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
