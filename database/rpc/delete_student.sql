-- RPC: Delete student. Called from the client as
--   supabase.rpc('delete_student', { p_id: 7 })
-- Returns the deleted student row.
--
-- Deleting a student cascades (schema.sql): every entry and action about them is deleted too,
-- including ones other staff wrote. This function doesn't guard against that on purpose;
-- the app is expected to read the student first and warn the user how destructive it is.
-- (To keep a student's history, don't delete them.)
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * Raises "No student with id N" if nothing was deleted. That also happens when RLS hides
--     the row from you, so you can't tell "doesn't exist" from "not allowed".
--   * The "active staff" RLS policy on `student` decides who may delete.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('delete_student');

create function public.delete_student(p_id bigint)
returns public.student
language plpgsql
set search_path = ''
as $$
declare
  result public.student;
begin
  delete from public.student where id = p_id returning * into result;

  if not found then
    raise exception 'No student with id %', p_id using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.delete_student(bigint) from public, anon;
grant execute on function public.delete_student(bigint) to authenticated;

commit;
