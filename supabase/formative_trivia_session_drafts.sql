-- Live sessions + draft answers for closed-tab auto-submit.
-- Safe to paste even if trivia_sessions was never created.
-- Requires public.trivia_quizzes (from formative_trivia.sql).

do $$
begin
  if to_regclass('public.trivia_quizzes') is null then
    raise exception 'public.trivia_quizzes does not exist. Run supabase/formative_trivia.sql first.';
  end if;
end $$;

create table if not exists public.trivia_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.trivia_quizzes(id) on delete cascade,
  discord_username text not null,
  ingame_name text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  answered_count int not null default 0,
  question_count int not null default 0,
  hidden_count int not null default 0,
  currently_hidden boolean not null default false,
  left_page boolean not null default false,
  draft_answers jsonb,
  variant_map jsonb,
  client_started_at timestamptz,
  ip_address text,
  user_agent text
);

alter table public.trivia_sessions
  add column if not exists draft_answers jsonb,
  add column if not exists variant_map jsonb,
  add column if not exists client_started_at timestamptz;

create unique index if not exists trivia_sessions_quiz_discord_uidx
  on public.trivia_sessions (quiz_id, lower(discord_username));

create index if not exists trivia_sessions_quiz_seen_idx
  on public.trivia_sessions (quiz_id, last_seen_at desc);

alter table public.trivia_sessions enable row level security;

comment on table public.trivia_sessions is
  'In-progress take sessions; host-only via service role.';

comment on column public.trivia_sessions.draft_answers is
  'Latest take-page answers from presence pings; flushed to trivia_responses when the timer ends or an untimed guest leaves.';
