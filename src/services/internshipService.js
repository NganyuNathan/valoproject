import { supabase } from './supabase';

// Every text column that appears on (or behind) an internship card.
const SEARCHABLE_TEXT_COLUMNS = [
  'title',
  'description',
  'responsibilities',
  'requirements',
  'skills_required',
  'departments',
  'category',
  'industry',
  'location',
  'duration',
  'internship_type', // remote / hybrid / onsite
  'benefits',
];

// Strip characters that would break PostgREST's comma/parenthesis filter syntax.
const clean = (v) => String(v ?? '').trim().replace(/[,()"\\%*]/g, ' ').replace(/\s+/g, ' ').trim();

async function runListInternships({
  search, category, industry, location, workMode, paid, duration,
  company, skills, minSalary, closingWithin,
  page = 1, pageSize = 12,
} = {}, skipColumns = []) {
  const searchColumns = SEARCHABLE_TEXT_COLUMNS.filter((c) => !skipColumns.includes(c));
  let query = supabase.from('internships').select('*, companies(*)', { count: 'exact' }).eq('status', 'published');

  if (search) {
    // Split the search into words. Every word must match SOMETHING on the
    // internship (AND between words, OR between fields), so "marketing douala
    // remote" finds remote marketing internships in Douala.
    // PostgREST's `or=` syntax uses commas/parentheses as separators, so strip
    // any the user typed to avoid breaking the filter string.
    const words = search
      .trim()
      .replace(/[,()"\\%*]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8);

    // Company name lives on a joined table, which PostgREST's `.or()` can't
    // filter directly, so look up matching company ids for every word first.
    const companyIdsPerWord = await Promise.all(
      words.map(async (w) => {
        const { data } = await supabase.from('companies').select('id').ilike('name', `%${w}%`);
        return (data || []).map((c) => c.id);
      })
    );

    words.forEach((w, idx) => {
      const orParts = searchColumns.map((col) => `${col}.ilike.%${w}%`);
      const lower = w.toLowerCase();

      // Numbers match the salary exactly (e.g. "50000").
      if (/^\d+(\.\d+)?$/.test(w)) orParts.push(`salary.eq.${w}`);
      // Words that describe pay.
      if (lower === 'paid') orParts.push('is_paid.eq.true');
      if (lower === 'unpaid') orParts.push('is_paid.eq.false');

      const companyIds = companyIdsPerWord[idx];
      if (companyIds.length) orParts.push(`company_id.in.(${companyIds.join(',')})`);

      // Each .or() call is ANDed with the others.
      query = query.or(orParts.join(','));
    });
  }
  // Department: the card shows a free-text `departments` list as well as the
  // `category`, so match either one.
  const dept = clean(category);
  if (dept) {
    query = skipColumns.includes('departments')
      ? query.ilike('category', `%${dept}%`)
      : query.or(`category.ilike.%${dept}%,departments.ilike.%${dept}%`);
  }

  if (industry) query = query.eq('industry', industry);

  const loc = clean(location);
  if (loc) query = query.ilike('location', `%${loc}%`);

  if (workMode) query = query.eq('internship_type', workMode);
  if (paid) query = query.eq('is_paid', paid === 'paid');

  const dur = clean(duration);
  if (dur) query = query.ilike('duration', `%${dur}%`);

  // Each skill typed (comma or space separated) must appear in skills_required.
  String(skills || '')
    .split(/[,\s]+/)
    .map(clean)
    .filter(Boolean)
    .slice(0, 6)
    .forEach((sk) => { query = query.ilike('skills_required', `%${sk}%`); });

  // Company name lives on a joined table: find matching company ids first.
  const comp = clean(company);
  if (comp) {
    const { data: matches } = await supabase.from('companies').select('id').ilike('name', `%${comp}%`);
    const ids = (matches || []).map((c) => c.id);
    // No company matched -> force an empty result instead of ignoring the filter.
    query = ids.length ? query.in('company_id', ids) : query.in('company_id', ['00000000-0000-0000-0000-000000000000']);
  }

  const min = Number(minSalary);
  if (minSalary !== '' && minSalary != null && !Number.isNaN(min) && min > 0) query = query.gte('salary', min);

  // Deadline falls within the next N days.
  const days = Number(closingWithin);
  if (days > 0) {
    const today = new Date();
    const end = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const iso = (d) => d.toISOString().slice(0, 10);
    query = query.gte('deadline', iso(today)).lte('deadline', iso(end));
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

/**
 * Lists published internships. If the database doesn't have one of the columns
 * we search (PostgREST error 42703 "column ... does not exist"), that column is
 * skipped and the search is retried, so one missing column can't break search.
 */
export async function listInternships(params = {}) {
  const skip = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await runListInternships(params, skip);
    } catch (err) {
      const match = /column (?:\w+\.)?(\w+) does not exist/i.exec(err?.message || '');
      const col = match && match[1];
      if (err?.code === '42703' && col && !skip.includes(col)) {
        // eslint-disable-next-line no-console
        console.warn(`Internship search: column "${col}" doesn't exist in the database, skipping it.`);
        skip.push(col);
        continue;
      }
      throw err;
    }
  }
  return runListInternships(params, skip);
}

/**
 * Admin-only: every internship ever added, whatever its status (published,
 * draft or archived). Supabase returns at most 1000 rows per request, so this
 * keeps asking for the next batch until there's nothing left — there is no cap.
 */
export async function listAllInternshipsForAdmin() {
  const BATCH = 1000;
  let all = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from('internships')
      .select('*, companies(id, name)')
      .order('created_at', { ascending: false })
      .range(from, from + BATCH - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < BATCH) break;
  }
  return all;
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
