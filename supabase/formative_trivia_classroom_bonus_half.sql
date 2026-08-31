-- Allow half-point classroom bonuses (±0.5).
-- Run in Supabase SQL editor after formative_trivia_player_profiles.sql.

alter table public.trivia_player_profiles
  alter column classroom_bonus type numeric(10, 1)
  using classroom_bonus::numeric(10, 1);

comment on column public.trivia_player_profiles.classroom_bonus is
  'Host manual ClassDojo-style bonus (supports half points). Total pts = classroom_points + classroom_bonus.';
