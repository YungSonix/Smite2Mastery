-- Live quiz sessions (in-progress takers + tab-away counts).
-- Paste into Supabase SQL Editor if trivia_quizzes already exists.
-- New installs: also included in formative_trivia.sql.

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

create unique index if not exists trivia_sessions_quiz_discord_uidx
  on public.trivia_sessions (quiz_id, lower(discord_username));

create index if not exists trivia_sessions_quiz_seen_idx
  on public.trivia_sessions (quiz_id, last_seen_at desc);

alter table public.trivia_sessions enable row level security;

comment on table public.trivia_sessions is
  'In-progress take sessions; host-only via service role. hidden_count = quiz tab went to background, not destination URL.';
