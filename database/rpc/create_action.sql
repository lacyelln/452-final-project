-- RPC: Create student action. Called from the client as
--   supabase.rpc('create_action', { p_student_id: 7, p_description: 'Met with student about ...' })
--   supabase.rpc('create_action', { p_student_id: 7, p_description: '...', p_date: '2026-11-20' })
-- Returns the new action row. p_date is optional (defaults to today).
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * entered_by is never sent. The column default (current_staff_id(), in schema.sql) fills in
--     the signed-in staff member, and the insert policy rejects any row that isn't theirs.
--   * The description is trimmed. A blank description becomes null, which the table rejects
--     (not null).
--   * A student_id that doesn't exist is a foreign-key error.
--   * "today" is current_date, the same as the column default (it follows the database's
--     time zone, which is UTC on Supabase).
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('create_action');

create function public.create_action(
  p_student_id  bigint,
  p_description text,
  p_date        date default null
)
returns public.action
language sql
set search_path = ''
as $$
  insert into public.action (student_id, description, date)
  values (p_student_id, nullif(trim(p_description), ''), coalesce(p_date, current_date))
  returning *;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.create_action(bigint, text, date) from public, anon;
grant execute on function public.create_action(bigint, text, date) to authenticated;

commit;
