-- Scroll Trivia host (Smite Scroll)
-- Canonical schema. Paste this into the Supabase SQL Editor (new projects).
-- If tables already exist online, skip this and run the incremental files:
--   formative_trivia_types_expand.sql
--   formative_trivia_ingame_name.sql
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

alter table public.trivia_quizzes enable row level security;
alter table public.trivia_questions enable row level security;
alter table public.trivia_responses enable row level security;

-- Guests can read assigned quizzes + their questions by slug (anon).
drop policy if exists trivia_quizzes_public_read_assigned on public.trivia_quizzes;
create policy trivia_quizzes_public_read_assigned
  on public.trivia_quizzes for select
  using (is_assigned = true);

drop policy if exists trivia_questions_public_read_assigned on public.trivia_questions;
create policy trivia_questions_public_read_assigned
  on public.trivia_questions for select
  using (
    exists (
      select 1 from public.trivia_quizzes q
      where q.id = trivia_questions.quiz_id and q.is_assigned = true
    )
  );

-- Responses are host-only via service role API (no anon policies for insert/select).
-- Host CRUD also goes through service role API.

comment on table public.trivia_quizzes is 'Scroll Trivia quizzes for Smite Scroll host';
comment on table public.trivia_responses is 'Guest submissions; IP stored server-side only';
