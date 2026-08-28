-- Scroll Trivia RLS hardening
-- Paste in Supabase SQL Editor AFTER formative_trivia.sql (and session migrations).
--
-- Goal: anon/authenticated clients may only SELECT assigned quiz metadata.
-- Questions, responses, and sessions are service-role + /api/trivia/* only.

-- ---------------------------------------------------------------------------
-- Drop legacy / dangerous policies (safe if they never existed)
-- ---------------------------------------------------------------------------

-- Questions: never public — correct answers live in `correct` + `meta`
drop policy if exists trivia_questions_public_read_assigned on public.trivia_questions;
drop policy if exists trivia_questions_anon_read on public.trivia_questions;
drop policy if exists trivia_questions_anon_select on public.trivia_questions;
drop policy if exists trivia_questions_public_select on public.trivia_questions;
drop policy if exists trivia_questions_anon_insert on public.trivia_questions;
drop policy if exists trivia_questions_anon_update on public.trivia_questions;
drop policy if exists trivia_questions_anon_delete on public.trivia_questions;

-- Responses: host-only (IPs, answers, scores)
drop policy if exists trivia_responses_public_insert on public.trivia_responses;
drop policy if exists trivia_responses_anon_insert on public.trivia_responses;
drop policy if exists trivia_responses_public_select on public.trivia_responses;
drop policy if exists trivia_responses_anon_select on public.trivia_responses;
drop policy if exists trivia_responses_anon_read on public.trivia_responses;
drop policy if exists trivia_responses_anon_update on public.trivia_responses;
drop policy if exists trivia_responses_anon_delete on public.trivia_responses;

-- Sessions: live takers — host/API only
drop policy if exists trivia_sessions_public_insert on public.trivia_sessions;
drop policy if exists trivia_sessions_anon_insert on public.trivia_sessions;
drop policy if exists trivia_sessions_public_select on public.trivia_sessions;
drop policy if exists trivia_sessions_anon_select on public.trivia_sessions;
drop policy if exists trivia_sessions_anon_read on public.trivia_sessions;
drop policy if exists trivia_sessions_anon_update on public.trivia_sessions;
drop policy if exists trivia_sessions_anon_delete on public.trivia_sessions;
drop policy if exists trivia_sessions_public_all on public.trivia_sessions;

-- Quizzes: replace with minimal public read (assigned card + slug lookup metadata)
drop policy if exists trivia_quizzes_public_read_assigned on public.trivia_quizzes;
drop policy if exists trivia_quizzes_anon_insert on public.trivia_quizzes;
drop policy if exists trivia_quizzes_anon_update on public.trivia_quizzes;
drop policy if exists trivia_quizzes_anon_delete on public.trivia_quizzes;

create policy trivia_quizzes_public_read_assigned
  on public.trivia_quizzes
  for select
  to anon, authenticated
  using (is_assigned = true);

-- ---------------------------------------------------------------------------
-- Ensure RLS is on (idempotent)
-- ---------------------------------------------------------------------------
alter table public.trivia_quizzes enable row level security;
alter table public.trivia_questions enable row level security;
alter table public.trivia_responses enable row level security;
alter table public.trivia_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- Verify (run manually; should return only trivia_quizzes_public_read_assigned)
-- ---------------------------------------------------------------------------
-- select schemaname, tablename, policyname, roles, cmd
-- from pg_policies
-- where tablename like 'trivia_%'
-- order by tablename, policyname;
