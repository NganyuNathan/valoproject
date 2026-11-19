// Supabase Edge Function: admin-delete-user
//
// Lets an ADMIN permanently delete a student: their login account (which cascades to
// their profile, applications and saved internships) and every file they uploaded.
// The browser alone can't do this: deleting a login account needs the service-role key,
// which must never be shipped to the browser.
//
// Deploy (JWT verification stays ON — only signed-in users can reach it, and the
// function itself checks that the caller is an admin):
//   supabase functions deploy admin-delete-user
//
// Optional secret (locks it to your site):
//   supabase secrets set ALLOWED_ORIGINS=https://your-site.vercel.app

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);

const BUCKETS = ['resumes', 'cover-letters', 'avatars'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsFor(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.length === 0 ? '*' : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

/** Every file path under a user's folder, including sub-folders like "documents/". */
async function collectFiles(admin: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  const out: string[] = [];
  // deno-lint-ignore no-explicit-any
  for (const item of (data || []) as any[]) {
    if (item.id === null) out.push(...(await collectFiles(admin, bucket, `${prefix}/${item.name}`)));
    else out.push(`${prefix}/${item.name}`);
  }
  return out;
}

Deno.serve(async (req) => {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) });

  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return reply({ error: 'You need to be signed in.' }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: caller } = await admin.auth.getUser(token);
    const callerId = caller?.user?.id;
    if (!callerId) return reply({ error: 'You need to be signed in.' }, 401);

    const { data: me } = await admin.from('profiles').select('role').eq('id', callerId).maybeSingle();
    if (me?.role !== 'admin') return reply({ error: 'Only admins can do this.' }, 403);

    const { userId } = await req.json();
    if (typeof userId !== 'string' || !UUID.test(userId)) return reply({ error: 'Invalid user id.' }, 400);
    if (userId === callerId) return reply({ error: 'You cannot delete your own account here.' }, 400);

    const { data: target } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (target?.role === 'admin') return reply({ error: 'Admin accounts cannot be deleted here.' }, 400);

    // 1. Remove their uploaded files
    for (const bucket of BUCKETS) {
      const paths = await collectFiles(admin, bucket, userId);
      for (let i = 0; i < paths.length; i += 100) {
        await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      }
    }

    // 2. Delete the login account (cascades to profile, applications, saved internships)
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('deleteUser failed:', error);
      return reply({ error: 'Could not delete this account. Please try again.' }, 500);
    }
    return reply({ deleted: true });
  } catch (err) {
    console.error('admin-delete-user error:', err);
    return reply({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
