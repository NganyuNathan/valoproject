-- =========================================================
-- Payment gating: an application only counts once it's PAID.
-- Run this once in the Supabase SQL Editor. Safe to re-run.
-- =========================================================

-- 1. New statuses. 'unpaid' = started but not paid yet (a draft),
--    'paid' = payment confirmed by Fapshi. Admin then moves it on from there.
alter table applications drop constraint if exists applications_status_check;
alter table applications add constraint applications_status_check
  check (status in ('unpaid', 'paid', 'pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected'));

alter table applications alter column status set default 'unpaid';

-- 2. payment_method must allow 'fapshi'
alter table applications drop constraint if exists applications_payment_method_check;
alter table applications add constraint applications_payment_method_check
  check (payment_method in ('mtn', 'orange', 'fapshi'));

-- 3. Tidy up existing rows. Triggers are switched off just for this step so
--    students don't get a flood of "status changed" notifications.
alter table applications disable trigger user;
update applications set status = 'unpaid' where status = 'pending' and payment_status in ('unpaid', 'rejected');
update applications set status = 'paid'   where status = 'pending' and payment_status = 'verified';
alter table applications enable trigger user;

-- 4. Students can never set their own status or payment status (UPDATE).
--    The Edge Function runs with no logged-in user (auth.uid() is null), so it is allowed.
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

-- 5. ...and they can't create a row that's already "paid" (INSERT).
--    Without this, a student could skip payment by inserting status = 'paid' directly.
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
