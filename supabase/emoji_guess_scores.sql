-- Guess the Emoji minigame scores (best run points per mode).
-- Run in Supabase SQL Editor after ability_scores / app auth helpers exist.

create table if not exists public.emoji_guess_scores (
  username text not null,
  mode text not null check (mode in ('easy', 'hard', 'classic')),
  best_run_score integer not null default 0 check (best_run_score >= 0),
  updated_at timestamptz not null default now(),
  primary key (username, mode)
);

create index if not exists emoji_guess_scores_mode_score_idx
  on public.emoji_guess_scores (mode, best_run_score desc, updated_at asc);

alter table public.emoji_guess_scores enable row level security;

drop policy if exists emoji_guess_scores_read_all on public.emoji_guess_scores;
create policy emoji_guess_scores_read_all on public.emoji_guess_scores
  for select to public using (true);

drop policy if exists emoji_guess_scores_self_write on public.emoji_guess_scores;
create policy emoji_guess_scores_self_write on public.emoji_guess_scores
  for all to public
  using (username = public.current_app_username())
  with check (username = public.current_app_username());

grant select on public.emoji_guess_scores to anon, authenticated;
grant insert, update, delete on public.emoji_guess_scores to anon, authenticated;
