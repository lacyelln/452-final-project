-- RPC: Update student. Called from the client as
--   supabase.rpc('update_student', { p_id: 7, p_lab_section: 14 })
--   supabase.rpc('update_student', { p_id: 7, p_full_name: 'Jane Q. Doe', p_online: true })
-- Returns the updated student row.
--
-- Partial update: pass p_id plus only the fields you want to change. An argument you leave
-- out (or send blank) is null, and `coalesce(new_value, current_value)` then keeps the
-- current value. Every column except id can be changed, including semester_id.
-- (The all-optional trick is fine for the SET list because the WHERE is always p_id.)
--
-- Conventions for everything in database/rpc/ are in database/rpc/README.md.
-- Notes specific to this one:
--   * Text fields are trimmed; a blank string counts as "not given". net_id is lowercased
--     like create_student stores it.
--   * Raises "No student with id N" if nothing was updated. That also happens when RLS hides
--     the row from you, so you can't tell "doesn't exist" from "not allowed".
--   * Changing net_id (or moving to another semester) so that it collides with an existing
--     (net_id, semester_id) pair is a unique-violation error. A semester that doesn't
--     exist is a foreign-key error.
--   * The "active staff" RLS policy on `student` decides who may update.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

-- Drop every existing version of this function (any argument list) first, so changing
-- the signature doesn't leave a duplicate. The helper is defined in functions.sql.
select private.drop_function_versions('update_student');

create function public.update_student(
  p_id              bigint,
  p_semester_id     bigint  default null,
  p_full_name       text    default null,
  p_lecture_section bigint  default null,
  p_lab_section     bigint  default null,
  p_online          boolean default null,
  p_net_id          text    default null
)
returns public.student
language plpgsql
set search_path = ''
as $$
declare
  result public.student;
begin
  update public.student set
    semester_id     = coalesce(p_semester_id, semester_id),
    full_name       = coalesce(nullif(trim(p_full_name), ''), full_name),
    lecture_section = coalesce(p_lecture_section, lecture_section),
    lab_section     = coalesce(p_lab_section, lab_section),
    online          = coalesce(p_online, online),
    net_id          = coalesce(nullif(lower(trim(p_net_id)), ''), net_id)
  where id = p_id
  returning * into result;

  if not found then
    raise exception 'No student with id %', p_id using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

-- New functions are executable by everyone by default; narrow that to signed-in users.
revoke execute on function public.update_student(bigint, bigint, text, bigint, bigint, boolean, text) from public, anon;
grant execute on function public.update_student(bigint, bigint, text, bigint, bigint, boolean, text) to authenticated;

commit;
