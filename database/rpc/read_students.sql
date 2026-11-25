-- Read all students (in one semester). Called from the client as
--   supabase.rpc('read_students', { p_semester_id: 1 })

--   * Safe to re-run. The file is named after its function, and the first step drops EVERY
--     existing function with that name (any argument list), so changing the arguments
--     replaces the old version instead of leaving an overload behind. 
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('read_students');

create function public.read_students(p_semester_id bigint)
returns setof public.student
language sql stable
set search_path = ''
as $$
  select * from public.student
  where semester_id = p_semester_id
  order by full_name;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.read_students(bigint) from public, anon;
grant execute on function public.read_students(bigint) to authenticated;

commit;
