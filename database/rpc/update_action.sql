-- RPC: Update student action. Called from the client as
--   supabase.rpc('update_action', { p_id: 12, p_description: 'Updated notes ...' })
--   supabase.rpc('update_action', { p_id: 12, p_student_id: 9, p_date: '2026-11-20' })
-- Returns the updated action row.
--
-- Partial update, same shape as update_student: pass p_id plus the fields to change; a field
-- you leave out (or send blank) keeps its current value. Every column can be changed except
-- id and entered_by (the author is never editable). Passing nothing but p_id is an error
-- ("Nothing to update") instead of a silent no-op.
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * Only the staff member who wrote the action may update it (the "authors can update
--     actions" policy). For anyone else the row is invisible to the update, so you get the
--     "No action with id N that you can edit" error, same as for an id that doesn't exist.
--   * Moving it to a student_id that doesn't exist is a foreign-key error.
--   * The description is trimmed; a blank description counts as "not given".
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('update_action');

create function public.update_action(
  p_id          bigint,
  p_student_id  bigint default null,
  p_description text   default null,
  p_date        date   default null
)
returns public.action
language plpgsql
set search_path = ''
as $$
declare
  result public.action;
begin
  -- Count the fields that would really change something (blank text counts as not given).
  if num_nonnulls(p_student_id, nullif(trim(p_description), ''), p_date) = 0 then
    raise exception 'Nothing to update: pass at least one field besides p_id';
  end if;

  update public.action set
    student_id  = coalesce(p_student_id, student_id),
    description = coalesce(nullif(trim(p_description), ''), description),
    date        = coalesce(p_date, date)
  where id = p_id
  returning * into result;

  if not found then
    raise exception 'No action with id % that you can edit', p_id using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.update_action(bigint, bigint, text, date) from public, anon;
grant execute on function public.update_action(bigint, bigint, text, date) to authenticated;

commit;
