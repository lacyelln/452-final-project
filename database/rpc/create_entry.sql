-- RPC: Create an AI-use entry. Called from the client as
--   supabase.rpc('create_entry', {
--     p_student_id: 7, p_assignment: 'Homework 3', p_submission_link: 'https://...'
--   })
-- Returns the new entry row. p_notes and p_date are optional.
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * entered_by is never sent. The column default (current_staff_id(), in schema.sql) fills in
--     the signed-in staff member, and the insert policy rejects any row that isn't theirs.
--   * Blank assignment and submission-link values become null and are rejected by the table.
--   * A student_id that doesn't exist is a foreign-key error.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

select private.drop_function_versions('create_entry');

create function public.create_entry(
  p_student_id     bigint,
  p_assignment     text,
  p_submission_link text,
  p_notes          text default null,
  p_date           date default null
)
returns public.entry
language sql
set search_path = ''
as $$
  insert into public.entry (student_id, assignment, notes, date, submission_link)
  values (
    p_student_id,
    nullif(trim(p_assignment), ''),
    nullif(trim(p_notes), ''),
    coalesce(p_date, current_date),
    nullif(trim(p_submission_link), '')
  )
  returning *;
$$;

revoke execute on function public.create_entry(bigint, text, text, text, date) from public, anon;
grant execute on function public.create_entry(bigint, text, text, text, date) to authenticated;

commit;
