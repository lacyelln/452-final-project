-- RPC: Create semester. Called from the client as
--   supabase.rpc('create_semester', { p_name: 'Fall 2026' })
-- Returns the new semester row (including its id, which students are created under).
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * The name is trimmed. A blank name becomes null, which the table rejects (not null).
--   * Fails with a unique-violation error if a semester with that name already exists.
--   * The "active staff" RLS policy on `semester` decides who may insert.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('create_semester');

create function public.create_semester(p_name text)
returns public.semester
language sql
set search_path = ''
as $$
  insert into public.semester (name)
  values (nullif(trim(p_name), ''))
  returning *;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.create_semester(text) from public, anon;
grant execute on function public.create_semester(text) to authenticated;

commit;
