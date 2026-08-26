-- Learn the VGS minigame scores (best streak per drill mode).
-- Run in Supabase SQL Editor after emoji_guess_scores / app auth helpers exist.

create table if not exists public.vgs_learn_scores (
  username text not null,
  mode text not null check (mode in ('callouts', 'listen')),
  best_streak integer not null default 0 check (best_streak >= 0),
  updated_at timestamptz not null default now(),
  primary key (username, mode)
);

create index if not exists vgs_learn_scores_mode_streak_idx
  on public.vgs_learn_scores (mode, best_streak desc, updated_at asc);

alter table public.vgs_learn_scores enable row level security;

drop policy if exists vgs_learn_scores_read_all on public.vgs_learn_scores;
create policy vgs_learn_scores_read_all on public.vgs_learn_scores
  for select to public using (true);

drop policy if exists vgs_learn_scores_self_write on public.vgs_learn_scores;
create policy vgs_learn_scores_self_write on public.vgs_learn_scores
  for all to public
  using (username = public.current_app_username())
  with check (username = public.current_app_username());

grant select on public.vgs_learn_scores to anon, authenticated;
grant insert, update, delete on public.vgs_learn_scores to anon, authenticated;
