-- RPC: Read semesters, filtered by any combination of the arguments below. Called from the client as
--   supabase.rpc('read_semesters')                           -- all semesters, newest first
--   supabase.rpc('read_semesters', { p_name: 'fall' })       -- names containing "fall"
--   supabase.rpc('read_semesters', { p_id: 3 })              -- one semester by id
--
-- Same pattern as read_students: every argument is optional, a missing one is null, and
-- `(p_x is null or column = p_x)` then keeps every row, so only the filters you pass narrow
-- the result (combined with AND). Adding a column to `semester` later means one more argument
-- and one more line in the where clause.
--
--   * p_id: exact match.
--   * p_name: case-insensitive "contains" match ('fall' finds 'Fall 2026'). Uses position(),
--     not ilike, so a % or _ typed in the name isn't treated as a wildcard.
--
-- Only for reads. Don't copy the all-optional pattern into update/delete functions: a
-- forgotten argument would then mean "every row".
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('read_semesters');

create function public.read_semesters(
  p_id   bigint default null,
  p_name text   default null
)
returns setof public.semester
language sql stable
set search_path = ''
as $$
  select * from public.semester
  where (p_id   is null or id = p_id)
    and (p_name is null or position(lower(trim(p_name)) in lower(name)) > 0)
  order by id desc;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.read_semesters(bigint, text) from public, anon;
grant execute on function public.read_semesters(bigint, text) to authenticated;

commit;
