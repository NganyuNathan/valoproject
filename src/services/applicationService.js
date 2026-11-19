import { supabase } from './supabase';

/**
 * Creates the application row up front (status: 'unpaid', payment_status:
 * 'unpaid') — or returns the existing one if this student already started
 * applying to this internship. This exists so the Fapshi Edge Function has
 * a real application id to attach the payment to *before* the student pays,
 * and so `payment_status` only ever gets set to 'verified' by that trusted
 * backend function (via UPDATE), never by the student directly.
 */
export async function createOrGetDraftApplication({ studentId, internshipId }) {
  const { data, error } = await supabase
    .from('applications')
    .upsert(
      { student_id: studentId, internship_id: internshipId },
      { onConflict: 'student_id,internship_id', ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fills in the resume, cover letter and any extra documents on an
 * already-created application row. `documents` is a list of { name, path } and
 * is only written when the student attached some. Never touches status or payment_status.
 */
export async function updateApplicationDetails(id, { resumeUrl, coverLetterUrl, documents }) {
  const changes = { resume_url: resumeUrl, cover_letter_url: coverLetterUrl };
  if (documents && documents.length > 0) changes.documents = documents;

  const { data, error } = await supabase
    .from('applications')
    .update(changes)
    .eq('id', id)
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

/**
 * Admin: permanently deletes a student's application, plus the documents that only
 * belonged to it.
 * A blocked delete (missing permission) doesn't raise an error in Supabase — it
 * just deletes 0 rows — so we check that a row really went away.
 */
export async function deleteApplication(id) {
  // Remember which files belonged to it before the row disappears.
  const { data: app } = await supabase
    .from('applications')
    .select('student_id, resume_url, cover_letter_url, documents')
    .eq('id', id)
    .maybeSingle();

  const { data, error } = await supabase.from('applications').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Could not delete this application. Check that the admin delete policy exists in Supabase.');
  }
  if (app) await removeApplicationFiles(id, app); // best effort: never blocks the delete
}

async function removeApplicationFiles(id, app) {
  try {
    // The extra documents belong to this application alone.
    const docPaths = (Array.isArray(app.documents) ? app.documents : []).map((d) => d?.path).filter(Boolean);
    if (docPaths.length) await supabase.storage.from('resumes').remove(docPaths);

    // The resume / cover letter may be shared with the student's profile or other
    // applications, so only remove them when nothing else points at the same file.
    const { data: profile } = await supabase
      .from('profiles').select('resume_url, cover_letter_url').eq('id', app.student_id).maybeSingle();
    const { data: others } = await supabase
      .from('applications').select('resume_url, cover_letter_url').eq('student_id', app.student_id).neq('id', id);
    const stillUsed = new Set([
      profile?.resume_url, profile?.cover_letter_url,
      ...(others || []).flatMap((o) => [o.resume_url, o.cover_letter_url]),
    ].filter(Boolean));

    if (app.resume_url && !stillUsed.has(app.resume_url)) {
      await supabase.storage.from('resumes').remove([app.resume_url]);
    }
    if (app.cover_letter_url && !stillUsed.has(app.cover_letter_url)) {
      await supabase.storage.from('cover-letters').remove([app.cover_letter_url]);
    }
  } catch {
    // Leftover files are harmless; the application itself is already deleted.
  }
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
    .neq('status', 'unpaid') // unpaid drafts are not submitted applications; admins never see them
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

/**
 * Spreadsheet programs run cells that start with = + - @ as formulas, and students
 * choose their own names — so those cells get a leading apostrophe to stay plain text.
 */
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
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
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}
