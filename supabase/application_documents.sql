-- Application documents metadata. Run once; safe to re-run.
alter table public.applications add column if not exists documents jsonb not null default '[]'::jsonb;

-- Application-specific files are stored in the private `resumes` bucket under
-- <student_id>/<application_id>/documents/... . The application row stores
-- only the storage path and original display name.
