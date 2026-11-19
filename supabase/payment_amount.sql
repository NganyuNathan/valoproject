-- =========================================================
-- payment_amount: remembers how much a student was asked to pay on Fapshi, so the
-- server can check the payment really was that much — even if an admin later edits
-- the internship's amount. Run once in the Supabase SQL Editor. Safe to re-run.
-- Run it BEFORE (or right after) deploying the updated fapshi-payment function.
-- =========================================================
alter table applications add column if not exists payment_amount integer;

-- Only the server (service role) and admins may set it; students never can.
create or replace function protect_payment_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin()
     and new.payment_amount is distinct from old.payment_amount then
    raise exception 'You cannot change the payment amount';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_payment_amount on applications;
create trigger trg_protect_payment_amount
  before update on applications
  for each row execute function protect_payment_amount();
