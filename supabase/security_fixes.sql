-- =========================================================
-- Security fixes. Run ONCE in the Supabase SQL Editor. Safe to re-run.
--
-- Fixes:
--   1. Students could make themselves admin (profiles update/insert rules)
--   2. Students could tamper with their own application row
--   3. Applications could be created for draft/archived/expired internships
--   4. Suspended accounts were not actually blocked
--   5. Students could forge notifications
--   6. File type / size limits on storage buckets (and keep sensitive buckets private)
--   7. Functions without a fixed search_path
--   8. Admins can delete stored files when removing an application
--
-- BEFORE you run it, check nobody unexpected is already an admin:
--   select id, email, role from profiles where role = 'admin';
-- =========================================================

-- The `documents` column used by the "Upload listed documents" field
alter table applications add column if not exists documents jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------
-- 0. Helpers
-- ---------------------------------------------------------
create or replace function is_suspended()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select suspended from profiles where id = auth.uid()), false);
$$;

-- 7. Pin the search_path on the existing SECURITY DEFINER functions
alter function is_admin() set search_path = public;
alter function notify_on_application_status_change() set search_path = public;
alter function notify_on_new_announcement() set search_path = public;

-- ---------------------------------------------------------
-- 1. profiles: nobody but an admin can change role / suspension / identity
-- ---------------------------------------------------------
create or replace function protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for the service role (Edge Functions), which stays allowed.
  if auth.uid() is not null and not is_admin() then
    if new.role is distinct from old.role
       or new.suspended is distinct from old.suspended
       or new.id is distinct from old.id
       or new.email is distinct from old.email then
      raise exception 'You cannot change your role, suspension status or email here';
    end if;

    -- Stored file paths must point into the user's own folder.
    if new.resume_url is distinct from old.resume_url and new.resume_url is not null
       and position(old.id::text || '/' in new.resume_url) = 0 then
      raise exception 'Invalid resume path';
    end if;
    if new.cover_letter_url is distinct from old.cover_letter_url and new.cover_letter_url is not null
       and position(old.id::text || '/' in new.cover_letter_url) = 0 then
      raise exception 'Invalid cover letter path';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_columns on profiles;
create trigger trg_protect_profile_columns
  before update on profiles
  for each row execute function protect_profile_columns();

-- A profile a user creates for themselves can only ever be a normal, active student.
drop policy if exists "Anyone can create their own profile on signup" on profiles;
drop policy if exists "Users can create their own student profile" on profiles;
create policy "Users can create their own student profile"
  on profiles for insert
  with check (auth.uid() = id and role = 'student' and coalesce(suspended, false) = false);

drop policy if exists "Students can update their own profile" on profiles;
create policy "Students can update their own profile"
  on profiles for update
  using (auth.uid() = id or is_admin())
  with check (auth.uid() = id or is_admin());

-- ---------------------------------------------------------
-- 2. applications: students can't rewrite who/what/payment on their own row
-- ---------------------------------------------------------
create or replace function protect_application_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d jsonb;
begin
  if auth.uid() is not null and not is_admin() then
    if new.student_id is distinct from old.student_id
       or new.internship_id is distinct from old.internship_id
       or new.payment_method is distinct from old.payment_method
       or new.payment_reference is distinct from old.payment_reference
       or new.applied_at is distinct from old.applied_at then
      raise exception 'You cannot change those fields on an application';
    end if;

    if new.resume_url is distinct from old.resume_url and new.resume_url is not null
       and position(new.student_id::text || '/' in new.resume_url) = 0 then
      raise exception 'Invalid resume path';
    end if;
    if new.cover_letter_url is distinct from old.cover_letter_url and new.cover_letter_url is not null
       and position(new.student_id::text || '/' in new.cover_letter_url) = 0 then
      raise exception 'Invalid cover letter path';
    end if;

    if new.documents is distinct from old.documents then
      if jsonb_typeof(new.documents) <> 'array' then
        raise exception 'Invalid documents';
      end if;
      for d in select * from jsonb_array_elements(new.documents) loop
        if jsonb_typeof(d) <> 'object'
           or position(new.student_id::text || '/' in coalesce(d->>'path', '')) <> 1 then
          raise exception 'Invalid document path';
        end if;
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_application_columns on applications;
create trigger trg_protect_application_columns
  before update on applications
  for each row execute function protect_application_columns();

-- Re-assert the payment protections from payment_gating.sql (same code), so they
-- are in place even if that file was never run.
create or replace function prevent_application_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status or new.payment_status is distinct from old.payment_status)
     and auth.uid() is not null
     and not is_admin() then
    raise exception 'Only an admin can change application status or payment status';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_application_self_approval on applications;
create trigger trg_prevent_application_self_approval
  before update on applications
  for each row execute function prevent_application_self_approval();

create or replace function force_application_defaults_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin() then
    new.status := 'unpaid';
    new.payment_status := 'unpaid';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_force_application_defaults on applications;
create trigger trg_force_application_defaults
  before insert on applications
  for each row execute function force_application_defaults_on_insert();

-- ---------------------------------------------------------
-- 3. applications: only for published internships that are still open
-- ---------------------------------------------------------
drop policy if exists "Students create their own applications" on applications;
create policy "Students create their own applications"
  on applications for insert
  with check (
    auth.uid() = student_id
    and exists (
      select 1 from internships i
      where i.id = internship_id
        and i.status = 'published'
        and (i.deadline is null or i.deadline >= current_date)
    )
  );

drop policy if exists "Students or admins update applications" on applications;
create policy "Students or admins update applications"
  on applications for update
  using (auth.uid() = student_id or is_admin())
  with check (auth.uid() = student_id or is_admin());

-- ---------------------------------------------------------
-- 4. Suspended accounts can no longer write anything
--    (RESTRICTIVE policies are ANDed with the normal ones.)
-- ---------------------------------------------------------
drop policy if exists "Suspended users cannot create applications" on applications;
create policy "Suspended users cannot create applications"
  on applications as restrictive for insert with check (not is_suspended());

drop policy if exists "Suspended users cannot update applications" on applications;
create policy "Suspended users cannot update applications"
  on applications as restrictive for update using (not is_suspended());

drop policy if exists "Suspended users cannot save internships" on saved_internships;
create policy "Suspended users cannot save internships"
  on saved_internships as restrictive for insert with check (not is_suspended());

drop policy if exists "Suspended users cannot edit profiles" on profiles;
create policy "Suspended users cannot edit profiles"
  on profiles as restrictive for update using (not is_suspended());

drop policy if exists "Suspended users cannot upload files" on storage.objects;
create policy "Suspended users cannot upload files"
  on storage.objects as restrictive for insert with check (not is_suspended());

-- ---------------------------------------------------------
-- 5. notifications: only admins (and database triggers) create them;
--    students may only mark their own as read.
-- ---------------------------------------------------------
drop policy if exists "System/admins create notifications" on notifications;
drop policy if exists "Admins create notifications" on notifications;
create policy "Admins create notifications"
  on notifications for insert
  with check (is_admin());

create or replace function protect_notification_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.user_id is distinct from old.user_id
       or new.title is distinct from old.title
       or new.message is distinct from old.message
       or new.type is distinct from old.type then
      raise exception 'You can only mark notifications as read';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_notification_columns on notifications;
create trigger trg_protect_notification_columns
  before update on notifications
  for each row execute function protect_notification_columns();

-- ---------------------------------------------------------
-- 6. Storage: keep sensitive buckets private, limit file types and sizes
--    (enforced by Supabase on every upload, not just in the browser).
--    NOTE: SVG logos are not allowed because SVG files can carry scripts.
-- ---------------------------------------------------------
update storage.buckets set public = false where id in ('resumes', 'cover-letters');

update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]
where id in ('resumes', 'cover-letters');

update storage.buckets
set file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('company-logos', 'internship-images');

-- ---------------------------------------------------------
-- 8. Admins can delete stored documents (used when deleting an application)
-- ---------------------------------------------------------
drop policy if exists "Admins can delete resumes" on storage.objects;
create policy "Admins can delete resumes"
  on storage.objects for delete
  using (bucket_id = 'resumes' and is_admin());

drop policy if exists "Admins can delete cover letters" on storage.objects;
create policy "Admins can delete cover letters"
  on storage.objects for delete
  using (bucket_id = 'cover-letters' and is_admin());
