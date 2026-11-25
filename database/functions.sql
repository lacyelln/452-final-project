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

-- Helper for the files in database/rpc/: drops EVERY version of a public function by name
-- (whatever its arguments), so changing a function's arguments replaces it instead of
-- leaving an old overload behind. Each rpc file calls it first, in its own transaction.
--
-- It lives in the `private` schema, which Supabase's API doesn't expose, so it can't be
-- called through /rpc; and execute is revoked from the API roles. It is `security invoker`
-- on purpose: it runs as whoever applies the SQL (the owner), which is who may drop.
create schema if not exists private;

create or replace function private.drop_function_versions(p_name text)
returns void
language plpgsql
set search_path = ''
as $$
declare r record;
begin
  for r in
    select format('drop function public.%I(%s)', p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid)) as ddl
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = p_name
  loop
    execute r.ddl;
  end loop;
end;
$$;

revoke execute on function private.drop_function_versions(text) from public, anon, authenticated;

commit;
