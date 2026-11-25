-- 1 of 5: tables and indexes
-- Safe to re-run on a project that already has THIS schema (uses IF NOT EXISTS).
-- It will NOT migrate an older version of the tables (e.g. if the table name or
-- columns changed): on a project with no data, drop those first.

begin;

-- One row per term (e.g. 'Fall 2026').
create table if not exists public.semester (
  id    bigint generated always as identity primary key,
  name  varchar not null unique
);

-- One row per student PER semester
-- net_id is unique within a semester, not globally, so a student could retake the class
-- restrict: a semester can't be deleted while it still has students.
create table if not exists public.student (
  id              bigint generated always as identity primary key,
  semester_id     bigint not null references public.semester(id) on delete restrict,
  full_name       varchar not null, -- some students have middle names in gradescope, others don't, so doesn't make sense to split it up
  lecture_section bigint not null,
  lab_section     bigint not null,
  online          boolean not null default false,
  net_id          varchar not null, -- BYU email is net_id || '@byu.edu', so it isn't stored
  unique (net_id, semester_id)
);

-- A TA or professor. Rows are added (by existing staff) BEFORE the person ever signs in, so
-- user_id starts out null and is filled in when their auth.users row is created.
-- `sections` holds lab sections for TAs and lecture sections for professors
-- Staff are deactivated (active = false), never deleted, so entries keep their author.
create table if not exists public.staff (
  id          bigint generated always as identity primary key,
  first_name  varchar not null,
  last_name   varchar not null,
  sections    bigint[] not null default '{}', -- (lab and lecture numbers never overlap, so one generic column is enough).
  email       varchar not null unique check (email = lower(email)),
  active      boolean not null default true,
  user_id     uuid unique references auth.users(id) on delete set null
);

-- The staff.id of whoever is making the request (null if there's no active staff member
-- behind the caller's JWT). Used as the default for entered_by below, so clients never
-- send entered_by themselves, and by the policies in policies.sql.
-- It lives here, not in functions.sql, because the entry/action column defaults need the
-- function to exist when those tables are created, and it needs `staff` to exist first.
create or replace function public.current_staff_id()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select id from public.staff
  where user_id = (select auth.uid()) and active;
$$;

-- One AI-use incident for one assignment. Deleting a student deletes their entries
-- (cascade). entered_by is `restrict`: a staff member who has entries can't be deleted.
-- entered_by defaults to the caller's staff id; if the client omits it, the database fills it in.
create table if not exists public.entry (
  id              bigint generated always as identity primary key,
  student_id      bigint not null references public.student(id) on delete cascade,
  assignment      varchar not null,
  notes           varchar,                         -- the only nullable column
  entered_by      bigint not null default public.current_staff_id() references public.staff(id) on delete restrict,
  date            date not null default current_date,
  submission_link varchar not null
);

-- Something done about a student as a whole (not tied to one assignment), so it is
-- separate from entries. Deleting a student deletes their actions (cascade).
create table if not exists public.action (
  id           bigint generated always as identity primary key,
  student_id   bigint not null references public.student(id) on delete cascade,
  description  varchar not null,
  date         date not null default current_date,
  entered_by   bigint not null default public.current_staff_id() references public.staff(id) on delete restrict
);

-- Postgres does not index foreign keys automatically. 
-- Allows fast lookup of "all actions" or "all entries" for a given student
create index if not exists student_semester_id_idx on public.student(semester_id);
create index if not exists entry_student_id_idx  on public.entry(student_id);
create index if not exists action_student_id_idx on public.action(student_id);

-- Student records are sensitive. Supabase exposes public tables through its REST API,
-- so every table has RLS enabled. With RLS on and no policy, a role gets nothing;
-- the service_role key and direct DB connections bypass RLS. Access is opened up in policies.sql.
alter table public.semester enable row level security;
alter table public.student enable row level security;
alter table public.staff   enable row level security;
alter table public.entry   enable row level security;
alter table public.action  enable row level security;

commit;

-- ---------------------------------------------------------------------------
-- One-time bootstrap (run by hand, not part of the migration), AFTER all five
-- files have run: add the first staff member so they can sign in and add everyone
-- else.
--
--   insert into public.staff (first_name, last_name, email)
--   values ('First', 'Last', 'someone@byu.edu');   -- lowercase email
-- ---------------------------------------------------------------------------
