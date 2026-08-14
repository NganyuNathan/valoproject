import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and add your project URL + anon key.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Storage buckets used across the app. Create these in Supabase Storage.
export const BUCKETS = {
  AVATARS: 'avatars',
  RESUMES: 'resumes',
  COVER_LETTERS: 'cover-letters',
  COMPANY_LOGOS: 'company-logos',
};

// Buckets that hold sensitive documents — never made public, always accessed via signed URLs.
const PRIVATE_BUCKETS = [BUCKETS.RESUMES, BUCKETS.COVER_LETTERS];

/**
 * Upload a file to a Supabase Storage bucket and return its public URL.
 * Only use this for buckets that are actually public (avatars, company-logos).
 */
export async function uploadFile(bucket, path, file) {
  if (PRIVATE_BUCKETS.includes(bucket)) {
    throw new Error(`${bucket} is a private bucket — use uploadPrivateFile() instead.`);
  }
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a file to a private bucket (resumes, cover letters) and return the
 * storage PATH (not a URL) — private files have no public URL. Store this
 * path in the database, then call getSignedUrl() at view-time.
 */
export async function uploadPrivateFile(bucket, path, file) {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: '3600' });

  if (uploadError) throw uploadError;
  return path; // caller stores this path as resume_url / cover_letter_url
}

/**
 * Generate a temporary signed URL for a file in a private bucket.
 * `pathOrUrl` may be a raw storage path, or (for backwards compatibility with
 * older rows saved before this fix) a full public-style URL — either way we
 * extract just the path relative to the bucket before signing.
 */
export async function getSignedUrl(bucket, pathOrUrl, expiresInSeconds = 120) {
  if (!pathOrUrl) return null;
  const marker = `/${bucket}/`;
  const idx = pathOrUrl.indexOf(marker);
  const path = idx >= 0 ? pathOrUrl.slice(idx + marker.length) : pathOrUrl;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
