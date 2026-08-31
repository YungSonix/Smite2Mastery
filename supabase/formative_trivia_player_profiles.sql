-- Cross-trivia player profiles for giveaways + analytics persistence.

-- Run in Supabase SQL editor after formative_trivia.sql.

-- Production rows only (excludes host practice / test-link submissions).



create or replace view public.trivia_player_stats as

select

  lower(trim(discord_username)) as discord_key,

  max(discord_username) filter (where discord_username is not null and discord_username <> '') as discord_username,

  max(ingame_name) filter (where ingame_name is not null and ingame_name <> '') as last_ingame_name,

  count(*)::int as events_entered,

  count(distinct quiz_id)::int as distinct_quizzes,

  round(avg(case when max_score > 0 then (score / max_score) * 100 end))::int as avg_pct,

  round(max(case when max_score > 0 then (score / max_score) * 100 end))::int as best_pct,

  count(*) filter (

    where max_score > 0 and (score / max_score) * 100 >= 70

  )::int as pass_count,

  min(submitted_at) as first_seen_at,

  max(submitted_at) as last_seen_at

from public.trivia_responses

where coalesce((answers->>'__test_take')::boolean, false) = false

group by lower(trim(discord_username));



comment on view public.trivia_player_stats is

  'Aggregated production trivia attempts per Discord identity (excludes answers.__test_take).';



create table if not exists public.trivia_player_profiles (

  discord_key text primary key,

  discord_username text,

  last_ingame_name text,

  ingame_names jsonb not null default '[]'::jsonb,

  events_entered int not null default 0,

  trivias_done int not null default 0,

  total_score numeric not null default 0,

  total_max numeric not null default 0,

  avg_pct int,

  best_pct int,

  pass_count int not null default 0,

  avg_duration_ms int,

  strong_topics jsonb not null default '[]'::jsonb,

  weak_topics jsonb not null default '[]'::jsonb,

  notes text,

  giveaway_eligible boolean not null default true,

  first_seen_at timestamptz,

  last_seen_at timestamptz,

  updated_at timestamptz not null default now()

);



-- Upgrade older installs that only had the minimal columns.

alter table public.trivia_player_profiles add column if not exists ingame_names jsonb not null default '[]'::jsonb;

alter table public.trivia_player_profiles add column if not exists events_entered int not null default 0;

alter table public.trivia_player_profiles add column if not exists trivias_done int not null default 0;

alter table public.trivia_player_profiles add column if not exists total_score numeric not null default 0;

alter table public.trivia_player_profiles add column if not exists total_max numeric not null default 0;

alter table public.trivia_player_profiles add column if not exists avg_pct int;

alter table public.trivia_player_profiles add column if not exists best_pct int;

alter table public.trivia_player_profiles add column if not exists pass_count int not null default 0;

alter table public.trivia_player_profiles add column if not exists avg_duration_ms int;

alter table public.trivia_player_profiles add column if not exists strong_topics jsonb not null default '[]'::jsonb;

alter table public.trivia_player_profiles add column if not exists weak_topics jsonb not null default '[]'::jsonb;

alter table public.trivia_player_profiles add column if not exists avatar_badge text;

alter table public.trivia_player_profiles add column if not exists avatar_kind text default 'badge';

alter table public.trivia_player_profiles add column if not exists avatar_ref text;

alter table public.trivia_player_profiles add column if not exists classroom_points int not null default 0;

alter table public.trivia_player_profiles add column if not exists classroom_bonus int not null default 0;

create index if not exists trivia_player_profiles_classroom_points_idx
  on public.trivia_player_profiles (classroom_points desc);

create index if not exists trivia_player_profiles_last_seen_idx
  on public.trivia_player_profiles (last_seen_at desc);

create index if not exists trivia_player_profiles_trivias_done_idx
  on public.trivia_player_profiles (trivias_done desc);



alter table public.trivia_player_profiles enable row level security;



-- Host reads/writes via service role only (same as responses).



create or replace function public.trivia_sync_player_profiles()

returns void

language plpgsql

security definer

set search_path = public

as $$

begin

  insert into public.trivia_player_profiles (

    discord_key,

    discord_username,

    last_ingame_name,

    events_entered,

    trivias_done,

    avg_pct,

    best_pct,

    pass_count,

    first_seen_at,

    last_seen_at,

    updated_at

  )

  select

    s.discord_key,

    s.discord_username,

    s.last_ingame_name,

    s.events_entered,

    s.distinct_quizzes,

    s.avg_pct,

    s.best_pct,

    s.pass_count,

    s.first_seen_at,

    s.last_seen_at,

    now()

  from public.trivia_player_stats s

  on conflict (discord_key) do update set

    discord_username = excluded.discord_username,

    last_ingame_name = excluded.last_ingame_name,

    events_entered = excluded.events_entered,

    trivias_done = excluded.trivias_done,

    avg_pct = excluded.avg_pct,

    best_pct = excluded.best_pct,

    pass_count = excluded.pass_count,

    first_seen_at = coalesce(trivia_player_profiles.first_seen_at, excluded.first_seen_at),

    last_seen_at = excluded.last_seen_at,

    updated_at = now();

end;

$$;



comment on function public.trivia_sync_player_profiles is

  'Lightweight upsert from trivia_player_stats view (basic columns). Full stats sync runs via host API / submit hook.';



-- Backfill basic columns from view (full stats via npm run trivia:sync-players or analytics load):

-- select public.trivia_sync_player_profiles();


