-- Scroll Trivia: per-question answer rows (timing, correctness, distractors)
-- Run in Supabase SQL Editor after deploy. Safe to re-run (IF NOT EXISTS).
-- Does not change live take behavior until API writes rows on new submits.
-- Backfill existing submissions: npm run trivia:backfill-question-responses -- <quiz-slug>

create table if not exists public.trivia_question_responses (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.trivia_responses(id) on delete cascade,
  quiz_id uuid not null references public.trivia_quizzes(id) on delete cascade,
  question_id uuid not null references public.trivia_questions(id) on delete cascade,
  discord_username text not null,
  variant_index int not null default 0,
  is_correct boolean not null default false,
  earned numeric not null default 0,
  max_points numeric not null default 0,
  response_time_ms int,
  category text,
  answer_json jsonb,
  created_at timestamptz not null default now(),
  unique (response_id, question_id)
);

create index if not exists trivia_qr_quiz_question_idx
  on public.trivia_question_responses (quiz_id, question_id);

create index if not exists trivia_qr_response_idx
  on public.trivia_question_responses (response_id);

create index if not exists trivia_qr_quiz_category_idx
  on public.trivia_question_responses (quiz_id, category)
  where category is not null and btrim(category) <> '';

alter table public.trivia_question_responses enable row level security;

-- Service role / API only (same as trivia_responses host path)
drop policy if exists trivia_qr_public_read on public.trivia_question_responses;
drop policy if exists trivia_qr_anon_all on public.trivia_question_responses;

comment on table public.trivia_question_responses is
  'One row per scored question per submission; populated on submit from answers.__timings + per_question.';

-- Example: median seconds per question
-- select question_id,
--   percentile_cont(0.5) within group (order by response_time_ms) / 1000.0 as median_seconds,
--   count(*) as n
-- from public.trivia_question_responses
-- where quiz_id = '<uuid>' and response_time_ms is not null
-- group by question_id;

-- Example: difficulty + middle band
-- select question_id,
--   round(100.0 * avg(case when is_correct then 1 else 0 end), 1) as pct_correct,
--   count(*) as n
-- from public.trivia_question_responses
-- where quiz_id = '<uuid>'
-- group by question_id
-- order by pct_correct;
