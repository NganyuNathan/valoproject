-- Application document payment gating.
-- Run this migration in the Supabase SQL Editor.
-- Documents are stored in the existing PRIVATE `resumes` and `cover-letters` buckets.
-- Application-specific files use: <student_id>/<application_id>/<filename>.

alter table public.applications add column if not exists documents jsonb not null default '[]'::jsonb;

-- Keep sensitive buckets private.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]
where id in ('resumes', 'cover-letters');

-- Admins may read a resume only when a paid application points to that exact object.
drop policy if exists "Admins can view all resumes" on storage.objects;
drop policy if exists "Admins can view paid application resumes" on storage.objects;
create policy "Admins can view paid application resumes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and public.is_admin()
    and exists (
      select 1
      from public.applications a
      where a.student_id::text = (storage.foldername(name))[1]
        and a.payment_status = 'verified'
        and a.status <> 'unpaid'
        and (
          a.resume_url = name
          or exists (
            select 1
            from jsonb_array_elements(coalesce(a.documents, '[]'::jsonb)) d
            where d->>'path' = name
          )
        )
    )
  );

-- Admins may read a cover letter only when a paid application points to that exact object.
drop policy if exists "Admins can view all cover letters" on storage.objects;
drop policy if exists "Admins can view paid application cover letters" on storage.objects;
create policy "Admins can view paid application cover letters"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'cover-letters'
    and public.is_admin()
    and exists (
      select 1
      from public.applications a
      where a.student_id::text = (storage.foldername(name))[1]
        and a.payment_status = 'verified'
        and a.status <> 'unpaid'
        and a.cover_letter_url = name
    )
  );

-- Application-specific uploads must belong to the signed-in student and to a
-- payment-verified application. Keep root-level resume uploads available for
-- the student's profile (for example: <student_id>/resume-<timestamp>).
drop policy if exists "Application files require verified payment" on storage.objects;
create policy "Application files require verified payment"
  on storage.objects as restrictive
  for insert
  to authenticated
  with check (
    bucket_id not in ('resumes', 'cover-letters')
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and (
        (bucket_id = 'resumes' and coalesce(array_length(storage.foldername(name), 1), 0) = 1)
        or exists (
          select 1
          from public.applications a
          where a.id::text = (storage.foldername(name))[2]
            and a.student_id = auth.uid()
            and a.payment_status = 'verified'
            and a.status <> 'unpaid'
            and (
              (bucket_id = 'resumes')
              or (bucket_id = 'cover-letters')
            )
        )
      )
    )
  );

-- Prevent students from attaching document paths to an unpaid application.
create or replace function public.prevent_unpaid_application_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and new.student_id = auth.uid()
     and new.payment_status <> 'verified'
     and (
       new.resume_url is distinct from old.resume_url
       or new.cover_letter_url is distinct from old.cover_letter_url
       or new.documents is distinct from old.documents
     ) then
    raise exception 'Application documents can only be attached after successful payment.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_unpaid_application_documents on public.applications;
create trigger trg_prevent_unpaid_application_documents
  before update on public.applications
  for each row execute function public.prevent_unpaid_application_documents();
