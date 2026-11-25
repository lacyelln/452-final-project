-- RPC: Create staff member. Called from the client as
--   supabase.rpc('create_staff', {
--     p_first_name: 'Jane', p_last_name: 'Doe', p_email: 'jane@byu.edu' })
--   supabase.rpc('create_staff', { ..., p_sections: [1, 12, 14] })     -- p_sections is optional
-- Returns the new staff row.
--
-- Adding a staff row is what lets that person sign in: when they first request a sign-in code
-- with this email, the before-user-created hook checks it against an ACTIVE staff row, and a
-- trigger then fills in staff.user_id (hooks.sql / triggers.sql). New staff start active.
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * The email is trimmed and lowercased (the table requires lowercase, and the sign-in
--     check compares against the lowercased email). Names are trimmed.
--   * Blank names or email become null, which the table rejects (not null).
--   * An email that already exists is a unique-violation error. To bring back someone who was
--     deactivated, update their row (active = true) instead of creating a new one.
--   * user_id is never set here; clients can't write that column (policies.sql).
--   * The "active staff" RLS policy on `staff` decides who may insert.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('create_staff');

create function public.create_staff(
  p_first_name text,
  p_last_name  text,
  p_email      text,
  p_sections   bigint[] default '{}'
)
returns public.staff
language sql
set search_path = ''
as $$
  insert into public.staff (first_name, last_name, email, sections)
  values (
    nullif(trim(p_first_name), ''),
    nullif(trim(p_last_name), ''),
    nullif(lower(trim(p_email)), ''),
    coalesce(p_sections, '{}')
  )
  returning *;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.create_staff(text, text, text, bigint[]) from public, anon;
grant execute on function public.create_staff(text, text, text, bigint[]) to authenticated;

commit;
