-- =========================================================
-- Required email confirmation: profile is created by the database.
-- With confirmation on, a new student isn't logged in until they click the
-- email link, so the browser can't write their profile at sign-up time.
-- Instead the sign-up form sends the details as metadata and this trigger
-- copies them into `profiles`. Run once in the Supabase SQL Editor. Safe to re-run.
-- =========================================================

-- Make sure every column the trigger fills exists (no-op if they already do)
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists education_level text default 'university';
alter table profiles add column if not exists university text;
alter table profiles add column if not exists degree text;
alter table profiles add column if not exists field_of_study text;
alter table profiles add column if not exists year_of_study text;
alter table profiles add column if not exists graduation_year text;
alter table profiles add column if not exists profile_photo text;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := coalesce(meta->>'full_name', meta->>'name', '');
begin
  insert into public.profiles (
    id, role, email, first_name, last_name, phone, education_level,
    university, degree, field_of_study, year_of_study, graduation_year, profile_photo
  )
  values (
    new.id,
    'student',  -- always student. Never read the role from metadata: users control that data.
    new.email,
    coalesce(nullif(meta->>'first_name', ''), meta->>'given_name', nullif(split_part(full_name, ' ', 1), '')),
    coalesce(nullif(meta->>'last_name', ''),  meta->>'family_name', nullif(btrim(regexp_replace(full_name, '^\S+\s*', '')), '')),
    nullif(meta->>'phone', ''),
    case when meta->>'education_level' in ('university', 'secondary_school')
         then meta->>'education_level' else 'university' end,
    nullif(meta->>'university', ''),
    nullif(meta->>'degree', ''),
    nullif(meta->>'field_of_study', ''),
    nullif(meta->>'year_of_study', ''),
    nullif(meta->>'graduation_year', ''),
    coalesce(meta->>'avatar_url', meta->>'picture')   -- Google sign-in supplies a photo
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();
