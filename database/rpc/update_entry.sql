-- RPC: Update an AI-use entry. Pass p_id and at least one field to change.
-- Omitted or blank fields keep their current values. Only the author may update an entry.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

select private.drop_function_versions('update_entry');

create function public.update_entry(
  p_id              bigint,
  p_assignment      text default null,
  p_submission_link text default null,
  p_notes           text default null,
  p_date            date default null
)
returns public.entry
language plpgsql
set search_path = ''
as $$
declare
  result public.entry;
begin
  if num_nonnulls(nullif(trim(p_assignment), ''), nullif(trim(p_submission_link), ''),
                  nullif(trim(p_notes), ''), p_date) = 0 then
    raise exception 'Nothing to update: pass at least one field besides p_id';
  end if;

  update public.entry set
    assignment      = coalesce(nullif(trim(p_assignment), ''), assignment),
    submission_link = coalesce(nullif(trim(p_submission_link), ''), submission_link),
    notes           = coalesce(nullif(trim(p_notes), ''), notes),
    date            = coalesce(p_date, date)
  where id = p_id
  returning * into result;

  if not found then
    raise exception 'No entry with id % that you can edit', p_id using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

revoke execute on function public.update_entry(bigint, text, text, text, date) from public, anon;
grant execute on function public.update_entry(bigint, text, text, text, date) to authenticated;

commit;
