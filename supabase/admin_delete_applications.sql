-- Lets admins delete applications. Safe to re-run.
drop policy if exists "Admins delete applications" on applications;
create policy "Admins delete applications"
  on applications for delete
  using (is_admin());
