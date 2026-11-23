-- 2 of 5: general-purpose functions. Requires schema.sql first.
-- Safe to re-run.

begin;

-- True when the caller's JWT belongs to an active staff member. Used by the RLS policies in policies.sql.
--
-- "language sql" means the body is written in sql
-- "stable" means it won't modify data
-- "security definer" lets it read `staff` even though RLS is on for that table.
-- "set search_path = ''" is good practice to fully qualify table names (schema.table -> public.staff)
create or replace function public.is_active_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff
    where user_id = (select auth.uid()) and active
  );
$$;

commit;
