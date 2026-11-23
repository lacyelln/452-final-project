-- 5 of 5: row level security (RLS) policies. Requires schema.sql and functions.sql first
-- (policies call public.is_active_staff()). Safe to re-run.
--
-- semester, student and staff: one policy per table, signed-in users who are active staff can do everything.
-- entry and action have stricter, per-operation policies (see below).
-- Requests as `anon` match no policy and can do nothing. 
-- The service_role key bypasses RLS.

begin;

-- Each block drops the policy first so the file can be re-run (CREATE POLICY has no "if not exists").
--
-- Policies call helper functions as `(select public.fn())`. Wrapped in a select, Postgres
-- evaluates the function once per query instead of once per row (it doesn't depend on the row).

drop policy if exists "active staff" on public.semester;
create policy "active staff" on public.semester
  for all to authenticated using ((select public.is_active_staff()));

drop policy if exists "active staff" on public.student;
create policy "active staff" on public.student
  for all to authenticated using ((select public.is_active_staff()));

drop policy if exists "active staff" on public.staff;
create policy "active staff" on public.staff
  for all to authenticated using ((select public.is_active_staff()));

-- Column privileges on staff: clients can never set or change user_id.
-- current_staff_id() trusts staff.user_id to know who is making a request, so if staff
-- could edit it they could point another person's row at their own login and impersonate
-- them. Only the trigger in triggers.sql (and the foreign key's `on delete set null`) may
-- write it; they run with their owner's rights, which these revokes don't affect.
-- Revoking a table-level privilege also revokes its column-level grants, so each
-- revoke-then-grant pair is safe to re-run. select and delete are left alone.
revoke insert, update on public.staff from authenticated;
grant insert (first_name, last_name, sections, email, active) on public.staff to authenticated;
grant update (first_name, last_name, sections, email, active) on public.staff to authenticated;

-- `entry` and `action` tables: any active staff member can read and delete, but you can only add or
-- edit rows as yourself. entered_by column defaults to current_staff_id(). 
--   insert: `with check` rejects a row whose entered_by isn't you (no forging authors).
--   update: `using` limits you to rows you originally entered; `with check` requires the
--           row to still be yours afterwards, so entered_by can't be changed either.

drop policy if exists "active staff" on public.entry;
drop policy if exists "staff can read entries" on public.entry;
create policy "staff can read entries" on public.entry
  for select to authenticated using ((select public.is_active_staff()));

drop policy if exists "staff can insert own entries" on public.entry;
create policy "staff can insert own entries" on public.entry
  for insert to authenticated with check (entered_by = (select public.current_staff_id()));

drop policy if exists "authors can update entries" on public.entry;
create policy "authors can update entries" on public.entry
  for update to authenticated
  using (entered_by = (select public.current_staff_id()))
  with check (entered_by = (select public.current_staff_id()));

drop policy if exists "staff can delete entries" on public.entry;
create policy "staff can delete entries" on public.entry
  for delete to authenticated using ((select public.is_active_staff()));

drop policy if exists "active staff" on public.action;
drop policy if exists "staff can read actions" on public.action;
create policy "staff can read actions" on public.action
  for select to authenticated using ((select public.is_active_staff()));

drop policy if exists "staff can insert own actions" on public.action;
create policy "staff can insert own actions" on public.action
  for insert to authenticated with check (entered_by = (select public.current_staff_id()));

drop policy if exists "authors can update actions" on public.action;
create policy "authors can update actions" on public.action
  for update to authenticated
  using (entered_by = (select public.current_staff_id()))
  with check (entered_by = (select public.current_staff_id()));

drop policy if exists "staff can delete actions" on public.action;
create policy "staff can delete actions" on public.action
  for delete to authenticated using ((select public.is_active_staff()));

commit;
