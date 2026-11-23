-- 3 of 5: Supabase Auth hook functions. Requires schema.sql first.
-- Safe to re-run (CREATE OR REPLACE).
--
-- A hook is a function that the Supabase Auth service calls at a set point in its own
-- flow; the JSON it returns tells the auth service what to do next.
--
-- One manual step is NOT in this file: after running it, enable the
-- "Before User Created" auth hook in the Supabase dashboard
-- (Authentication -> Hooks) and point it at public.reject_unlisted_signup.

begin;

-- Used in a "Before User Created" hook to only let an auth.users row be created for an active staff email.
-- Must be enabled in the supabase dashboard (see file header).
create or replace function public.reject_unlisted_signup(event jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.staff
    where email = lower(event->'user'->>'email') and active
  ) then
    return '{}'::jsonb; -- No error header in the JSONB means it can carry on with adding to auth.users
  end if;
  return jsonb_build_object('error', jsonb_build_object( -- returns a JSONB with an error, which rejects the user
    'message', 'This email is not permitted.',
    'http_code', 403));
end;
$$;

-- Functions in `public` can be called through the REST API (/rpc).
-- Only the auth service should be able to call the hook, so remove everyone else's permission; otherwise
-- anyone could probe which emails are on the staff list.
revoke execute on function public.reject_unlisted_signup(jsonb) from public, anon, authenticated;
grant execute on function public.reject_unlisted_signup(jsonb) to supabase_auth_admin;

commit;
