import { supabase } from './supabase';

export async function applyToInternship({ studentId, internshipId, resumeUrl, coverLetterUrl, motivationLetter, paymentMethod, paymentReference }) {
  const { data, error } = await supabase
    .from('applications')
    .insert([{
      student_id: studentId,
      internship_id: internshipId,
      resume_url: resumeUrl,
      cover_letter_url: coverLetterUrl,
      motivation_letter: motivationLetter,
      status: 'pending',
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      payment_status: paymentReference ? 'reported' : 'unpaid',
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin marks a self-reported mobile money payment as verified or rejected after cross-checking the reference code. */
export async function updatePaymentStatus(id, paymentStatus) {
  const { data, error } = await supabase
    .from('applications')
    .update({ payment_status: paymentStatus })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMyApplications(studentId) {
  const { data, error } = await supabase
    .from('applications')
    .select('*, internships(*, companies(*))')
    .eq('student_id', studentId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAllApplications({ status, search } = {}) {
  let query = supabase
    .from('applications')
    .select('*, internships(title, company_id, companies(name)), profiles(first_name, last_name, email)')
    .order('applied_at', { ascending: false });

  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  if (search) {
    const term = search.toLowerCase();
    return data.filter((a) =>
      `${a.profiles?.first_name} ${a.profiles?.last_name}`.toLowerCase().includes(term) ||
      a.internships?.title?.toLowerCase().includes(term)
    );
  }
  return data;
}

export async function updateApplicationStatus(id, status) {
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Converts an array of application rows into a CSV string for export. */
export function applicationsToCSV(applications) {
  const headers = ['Student', 'Email', 'Internship', 'Status', 'Applied At'];
  const rows = applications.map((a) => [
    `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.trim(),
    a.profiles?.email || '',
    a.internships?.title || '',
    a.status,
    new Date(a.applied_at).toLocaleDateString(),
  ]);
  return [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}
