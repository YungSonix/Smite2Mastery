-- Scroll Trivia host (Smite Scroll)
-- Canonical schema. Paste this into the Supabase SQL Editor (new projects).
-- If tables already exist online, skip this and run the incremental files:
--   formative_trivia_types_expand.sql
--   formative_trivia_ingame_name.sql
--   formative_trivia_session_drafts.sql  (creates trivia_sessions if missing + draft columns)
-- Notes / storage split: formative_trivia_notes.sql

create extension if not exists "pgcrypto";

create table if not exists public.trivia_quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Untitled Scroll Trivia',
  banner_url text,
  owner_username text not null,
  join_code text,
  is_assigned boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trivia_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.trivia_quizzes(id) on delete cascade,
  sort_order int not null default 0,
  type text not null check (type in (
    'short_answer',
    'multiple_choice',
    'true_false',
    'image',
    'content',
    'audio',
    'video',
    'embed',
    'multiple_selection',
    'dropdown',
    'matching',
    'categorize',
    'ordering',
    'drag_drop',
    'file_response',
    'audio_response',
    'drawing',
    'hot_spot'
  )),
  prompt text not null default '',
  points numeric not null default 1,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  correct jsonb not null default '{}'::jsonb,
  image_url text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trivia_responses (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.trivia_quizzes(id) on delete cascade,
  discord_username text not null,
  ingame_name text,
  answers jsonb not null default '{}'::jsonb,
  score numeric not null default 0,
  max_score numeric not null default 0,
  per_question jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  submitted_at timestamptz not null default now()
);

create index if not exists trivia_quizzes_owner_idx on public.trivia_quizzes (owner_username);
create index if not exists trivia_questions_quiz_idx on public.trivia_questions (quiz_id, sort_order);
create index if not exists trivia_responses_quiz_idx on public.trivia_responses (quiz_id, submitted_at desc);
create unique index if not exists trivia_responses_quiz_discord_uidx
  on public.trivia_responses (quiz_id, lower(discord_username));

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

alter table public.trivia_quizzes enable row level security;
alter table public.trivia_questions enable row level security;
alter table public.trivia_responses enable row level security;
alter table public.trivia_sessions enable row level security;

-- Guests must not dump questions (including `correct` and fat `meta`) via the anon key.
-- Assigned quiz cards stay readable so the app can list the current contest.
-- Take payloads go through /api/trivia/public (service role, sanitized).

drop policy if exists trivia_quizzes_public_read_assigned on public.trivia_quizzes;
create policy trivia_quizzes_public_read_assigned
  on public.trivia_quizzes for select
  to anon, authenticated
  using (is_assigned = true);

drop policy if exists trivia_questions_public_read_assigned on public.trivia_questions;

-- Responses are host-only via service role API (no anon policies for insert/select).
-- Host CRUD also goes through service role API.

comment on table public.trivia_quizzes is 'Scroll Trivia quizzes for Smite Scroll host';
comment on table public.trivia_responses is 'Guest submissions; IP stored server-side only';
comment on table public.trivia_sessions is 'In-progress take sessions; host-only via service role';
