-- =========================================================
-- InternPath — Supabase schema, RLS policies, and triggers
-- Run this once in the Supabase SQL editor (or via CLI migration)
-- =========================================================

create extension if not exists "uuid-ossp";

-- ---------- profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'admin')),
  first_name text,
  last_name text,
  username text unique,
  email text unique,
  phone text,
  gender text,
  date_of_birth date,
  education_level text default 'university' check (education_level in ('university', 'secondary_school')),
  university text,   -- university name, or secondary school name when education_level = 'secondary_school'
  faculty text,
  department text,
  field_of_study text,
  degree text,
  year_of_study text,
  student_id text,
  cgpa text,
  graduation_year text,
  preferred_industry text,
  preferred_location text,
  preferred_duration text,
  preferred_job_type text,
  skills text,                 -- comma-separated list, e.g. "React,Python,SQL"
  profile_photo text,
  resume_url text,
  cover_letter_url text,
  suspended boolean default false,
  created_at timestamptz default now()
);

-- ---------- companies ----------
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo text,
  industry text,
  website text,
  email text,
  phone text,
  description text,
  created_at timestamptz default now()
);

-- ---------- internships ----------
create table if not exists internships (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies (id) on delete cascade,
  title text not null,
  description text,
  responsibilities text,
  requirements text,
  skills_required text,        -- comma-separated
  location text,
  internship_type text check (internship_type in ('remote', 'hybrid', 'onsite')),
  duration text,
  salary numeric,
  is_paid boolean generated always as (salary is not null and salary > 0) stored,
  category text,
  industry text,
  benefits text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  deadline date,
  created_at timestamptz default now()
);

-- ---------- applications ----------
create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references profiles (id) on delete cascade,
  internship_id uuid references internships (id) on delete cascade,
  resume_url text,
  cover_letter_url text,
  motivation_letter text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected')),
  -- Application-fee payment (mobile money) — self-reported by the student via
  -- a USSD dial-link, then manually cross-checked by an admin against the
  -- reference/confirmation code. There is no automated payment API here.
  payment_method text check (payment_method in ('mtn', 'orange')),
  payment_reference text,        -- SMS confirmation code the student received
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'reported', 'verified', 'rejected')),
  applied_at timestamptz default now(),
  unique (student_id, internship_id)
);

-- ---------- saved_internships ----------
create table if not exists saved_internships (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references profiles (id) on delete cascade,
  internship_id uuid references internships (id) on delete cascade,
  created_at timestamptz default now(),
  unique (student_id, internship_id)
);

-- ---------- announcements ----------
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  created_at timestamptz default now()
);

-- ---------- notifications ----------
-- Powers the student "Notifications" page (new matches, status changes, interview invites, announcements)
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles (id) on delete cascade,
  title text not null,
  message text,
  type text default 'general' check (type in ('general', 'match', 'status_change', 'announcement', 'interview')),
  read boolean default false,
  created_at timestamptz default now()
);

-- =========================================================
-- Migration: if you already ran this schema before and just added the
-- payment columns above, run this block once to add them to your
-- existing `applications` table (safe to re-run — it's all IF NOT EXISTS).
-- =========================================================
alter table applications add column if not exists payment_method text;
alter table applications add column if not exists payment_reference text;
alter table applications add column if not exists payment_status text not null default 'unpaid';

alter table profiles add column if not exists education_level text default 'university';
do $$ begin
  alter table profiles add constraint profiles_education_level_check
    check (education_level in ('university', 'secondary_school'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table applications add constraint applications_payment_method_check
    check (payment_method in ('mtn', 'orange'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table applications add constraint applications_payment_status_check
    check (payment_status in ('unpaid', 'reported', 'verified', 'rejected'));
exception when duplicate_object then null;
end $$;

-- =========================================================
-- Row Level Security
-- =========================================================

alter table profiles enable row level security;
alter table companies enable row level security;
alter table internships enable row level security;
alter table applications enable row level security;
alter table saved_internships enable row level security;
alter table announcements enable row level security;
alter table notifications enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- profiles policies ----------
create policy "Students can read their own profile"
  on profiles for select
  using (auth.uid() = id or is_admin());

create policy "Students can update their own profile"
  on profiles for update
  using (auth.uid() = id or is_admin());

create policy "Anyone can create their own profile on signup"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Admins can delete profiles"
  on profiles for delete
  using (is_admin());

-- ---------- companies policies (visitors: read-only) ----------
create policy "Anyone can view companies"
  on companies for select
  using (true);

create policy "Admins manage companies"
  on companies for insert with check (is_admin());
create policy "Admins update companies"
  on companies for update using (is_admin());
create policy "Admins delete companies"
  on companies for delete using (is_admin());

-- ---------- internships policies ----------
create policy "Anyone can view published internships"
  on internships for select
  using (status = 'published' or is_admin());

create policy "Admins manage internships"
  on internships for insert with check (is_admin());
create policy "Admins update internships"
  on internships for update using (is_admin());
create policy "Admins delete internships"
  on internships for delete using (is_admin());

-- ---------- applications policies ----------
create policy "Students see only their own applications"
  on applications for select
  using (auth.uid() = student_id or is_admin());

create policy "Students create their own applications"
  on applications for insert
  with check (auth.uid() = student_id);

create policy "Students or admins update applications"
  on applications for update
  using (auth.uid() = student_id or is_admin());

create policy "Admins delete applications"
  on applications for delete
  using (is_admin());

-- ---------- saved_internships policies ----------
create policy "Students manage their own saved internships"
  on saved_internships for all
  using (auth.uid() = student_id or is_admin())
  with check (auth.uid() = student_id);

-- ---------- announcements policies ----------
create policy "Anyone can read announcements"
  on announcements for select
  using (true);

create policy "Admins manage announcements"
  on announcements for insert with check (is_admin());
create policy "Admins update announcements"
  on announcements for update using (is_admin());
create policy "Admins delete announcements"
  on announcements for delete using (is_admin());

-- ---------- notifications policies ----------
create policy "Users read their own notifications"
  on notifications for select
  using (auth.uid() = user_id or is_admin());

create policy "System/admins create notifications"
  on notifications for insert
  with check (is_admin() or auth.uid() = user_id);

create policy "Users update their own notifications (mark as read)"
  on notifications for update
  using (auth.uid() = user_id or is_admin());

-- =========================================================
-- Triggers: keep students informed automatically
-- =========================================================

-- Notify a student whenever their application status changes
create or replace function notify_on_application_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status is distinct from old.status then
    insert into notifications (user_id, title, message, type)
    values (
      new.student_id,
      'Application status updated',
      'Your application status changed to ' || new.status || '.',
      'status_change'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_application_status_change on applications;
create trigger trg_application_status_change
  after update on applications
  for each row execute function notify_on_application_status_change();

-- Notify all students when a new announcement is posted
create or replace function notify_on_new_announcement()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into notifications (user_id, title, message, type)
  select id, 'New announcement: ' || new.title, new.message, 'announcement'
  from profiles where role = 'student';
  return new;
end;
$$;

drop trigger if exists trg_new_announcement on announcements;
create trigger trg_new_announcement
  after insert on announcements
  for each row execute function notify_on_new_announcement();

-- =========================================================
-- Storage buckets
-- Create these in Supabase Dashboard → Storage (or via API):
--   avatars           (public read, owner write)
--   resumes           (private — owner read/write, admin read)
--   cover-letters      (private — owner read/write, admin read)
--   company-logos      (public read, admin write)
--
-- Storage RLS is separate from table RLS above and lives on storage.objects.
-- Run these AFTER creating the buckets in the dashboard:

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users manage their own resumes"
  on storage.objects for all
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins can view all resumes"
  on storage.objects for select
  using (bucket_id = 'resumes' and is_admin());

create policy "Users manage their own cover letters"
  on storage.objects for all
  using (bucket_id = 'cover-letters' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'cover-letters' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins can view all cover letters"
  on storage.objects for select
  using (bucket_id = 'cover-letters' and is_admin());

create policy "Anyone can view company logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');

create policy "Admins manage company logos"
  on storage.objects for all
  using (bucket_id = 'company-logos' and is_admin())
  with check (bucket_id = 'company-logos' and is_admin());
