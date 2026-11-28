-- RPC: Delete an AI-use entry and return the deleted row.
-- The entry delete policy permits active staff to delete entries.
-- Requires schema.sql, functions.sql and policies.sql first.

begin;

select private.drop_function_versions('delete_entry');

create function public.delete_entry(p_id bigint)
returns public.entry
language plpgsql
set search_path = ''
as $$
declare
  result public.entry;
begin
  delete from public.entry where id = p_id returning * into result;

  if not found then
    raise exception 'No entry with id % that you can delete', p_id using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

revoke execute on function public.delete_entry(bigint) from public, anon;
grant execute on function public.delete_entry(bigint) to authenticated;

commit;
