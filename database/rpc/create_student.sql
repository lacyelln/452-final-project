-- RPC: Create student. Called from the client as
--   supabase.rpc('create_student', {
--     p_semester_id: 1, p_full_name: 'Jane Doe', p_lecture_section: 1, p_lab_section: 12,
--     p_email: 'jane@byu.edu', p_net_id: 'jdoe' })        -- p_online is optional (default false)
-- Returns the new student row.
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * email and net_id are trimmed and lowercased, so the unique (net_id, semester_id) rule
--     can't be dodged by capitalization; full_name is only trimmed.
--   * Fails with a unique-violation error if that net_id is already in that semester, and
--     with a foreign-key error if the semester doesn't exist.
--   * The "active staff" RLS policy on `student` decides who may insert.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('create_student');

create function public.create_student(
  p_semester_id     bigint,
  p_full_name       text,
  p_lecture_section bigint,
  p_lab_section     bigint,
  p_email           text,
  p_net_id          text,
  p_online          boolean default false
)
returns public.student
language sql
set search_path = ''
as $$
  insert into public.student
    (semester_id, full_name, lecture_section, lab_section, online, email, net_id)
  values
    (p_semester_id, trim(p_full_name), p_lecture_section, p_lab_section,
     coalesce(p_online, false), lower(trim(p_email)), lower(trim(p_net_id))) -- coalesce turns p_online to false if it was null
  returning *;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.create_student(bigint, text, bigint, bigint, text, text, boolean) from public, anon;
grant execute on function public.create_student(bigint, text, bigint, bigint, text, text, boolean) to authenticated;

commit;
