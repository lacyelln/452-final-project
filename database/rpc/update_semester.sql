-- RPC: Update semester. Called from the client as
--   supabase.rpc('update_semester', { p_id: 1, p_name: 'Fall 2026' })
-- Returns the updated semester row.
--
-- Partial update, same shape as update_student: pass p_id plus the fields to change. name is
-- the only editable column today, so it is the only optional argument, but adding another
-- column later is one more argument and one more `coalesce` line. Passing nothing but p_id
-- is an error ("Nothing to update") instead of a silent no-op.
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * The name is trimmed; a blank name counts as "not given".
--   * Raises "No semester with id N" if nothing was updated. That also happens when RLS hides
--     the row from you, so you can't tell "doesn't exist" from "not allowed".
--   * Renaming to a name another semester already has is a unique-violation error.
--   * The "active staff" RLS policy on `semester` decides who may update.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('update_semester');

create function public.update_semester(
  p_id   bigint,
  p_name text default null
)
returns public.semester
language plpgsql
set search_path = ''
as $$
declare
  result public.semester;
begin
  -- Count the fields that would really change something (blank text counts as not given).
  if num_nonnulls(nullif(trim(p_name), '')) = 0 then
    raise exception 'Nothing to update: pass at least one field besides p_id';
  end if;

  update public.semester set
    name = coalesce(nullif(trim(p_name), ''), name)
  where id = p_id
  returning * into result;

  if not found then
    raise exception 'No semester with id %', p_id using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.update_semester(bigint, text) from public, anon;
grant execute on function public.update_semester(bigint, text) to authenticated;

commit;
