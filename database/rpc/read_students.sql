-- RPC: Read students, filtered by any combination of the arguments below. Called from the client as
--   supabase.rpc('read_students', { p_semester_id: 1 })                       -- one semester
--   supabase.rpc('read_students', { p_semester_id: 1, p_online: true })       -- online students in it
--   supabase.rpc('read_students', { p_net_id: 'jdoe' })                       -- that person, every semester
--
-- Every argument is optional. An argument that isn't given is null, and
-- `(p_x is null or column = p_x)` then keeps every row, so only the filters you pass narrow the
-- result. All the filters are combined with AND. With no arguments it returns EVERY student in
-- every semester (the API may cut that off at its row limit), so normally pass p_semester_id.
--
--   * p_full_name: case-insensitive "contains" match ('jane' finds 'Jane Doe'). Uses position(),
--     not ilike, so a % or _ typed in the name isn't treated as a wildcard.
--   * p_lecture_section, p_lab_section: exact match.
--   * p_online: true = online students, false = in-person. (null = either.)
--   * p_net_id: exact match, trimmed and lowercased like create_student stores it.
--
-- Only for reads. Unsafe to copy the all-optional pattern into update/delete functions.
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('read_students');

create function public.read_students(
  p_semester_id     bigint  default null,
  p_full_name       text    default null,
  p_lecture_section bigint  default null,
  p_lab_section     bigint  default null,
  p_online          boolean default null,
  p_net_id          text    default null
)
returns setof public.student
language sql stable
set search_path = ''
as $$
  select * from public.student
  where (p_semester_id     is null or semester_id = p_semester_id)
    and (p_full_name       is null or position(lower(trim(p_full_name)) in lower(full_name)) > 0)
    and (p_lecture_section is null or lecture_section = p_lecture_section)
    and (p_lab_section     is null or lab_section = p_lab_section)
    and (p_online          is null or online = p_online)
    and (p_net_id          is null or net_id = lower(trim(p_net_id)))
  order by semester_id desc, full_name;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.read_students(bigint, text, bigint, bigint, boolean, text) from public, anon;
grant execute on function public.read_students(bigint, text, bigint, bigint, boolean, text) to authenticated;

commit;
