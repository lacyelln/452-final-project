-- RPC: Delete semester. Called from the client as
--   supabase.rpc('delete_semester', { p_id: 1 })
-- Returns the deleted semester row.
--
-- Only works for a semester with no students. student.semester_id is `on delete restrict`
-- (schema.sql), so if any student still belongs to the semester, Postgres refuses with a
-- foreign-key violation (23503) and nothing is deleted. Delete or move the students first.
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * Raises "No semester with id N" if nothing was deleted. That also happens when RLS hides
--     the row from you, so you can't tell "doesn't exist" from "not allowed".
--   * The "active staff" RLS policy on `semester` decides who may delete.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('delete_semester');

create function public.delete_semester(p_id bigint)
returns public.semester
language plpgsql
set search_path = ''
as $$
declare
  result public.semester;
begin
  delete from public.semester where id = p_id returning * into result;

  if not found then
    raise exception 'No semester with id %', p_id using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.delete_semester(bigint) from public, anon;
grant execute on function public.delete_semester(bigint) to authenticated;

commit;
