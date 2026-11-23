-- 4 of 5: triggers and the functions they run. Requires schema.sql first.
-- Safe to re-run (CREATE OR REPLACE / DROP TRIGGER IF EXISTS).
--
-- A trigger is a function that Postgres runs automatically when a row in a table is
-- inserted, updated or deleted.

begin;

-- When an auth.users row is created, link it to the matching staff row.
-- Also re-links a reactivated staff member, who gets a brand-new auth.users row.
create or replace function public.link_staff_to_auth_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.staff set user_id = new.id
  where email = lower(new.email) and active;
  return new;
end;
$$;

revoke execute on function public.link_staff_to_auth_user() from public, anon, authenticated;

drop trigger if exists link_staff_on_signup on auth.users;
create trigger link_staff_on_signup
  after insert on auth.users
  for each row execute function public.link_staff_to_auth_user();

-- Deactivating a staff member deletes their auth.users row (ends their sessions and refresh tokens).
-- The `when` clause below makes the trigger fire only on a true -> false change.
create or replace function public.remove_auth_user_on_deactivate()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.user_id is not null then
    delete from auth.users where id = old.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.remove_auth_user_on_deactivate() from public, anon, authenticated;

drop trigger if exists staff_deactivate on public.staff;
create trigger staff_deactivate
  after update of active on public.staff
  for each row
  when (old.active and not new.active)
  execute function public.remove_auth_user_on_deactivate();

commit;
