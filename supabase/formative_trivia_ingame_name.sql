-- Add in-game name on trivia responses (run if tables already exist).
alter table public.trivia_responses
  add column if not exists ingame_name text;
