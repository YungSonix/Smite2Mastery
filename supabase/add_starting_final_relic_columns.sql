-- Optional: store starting + final relic separately (Custom Builder writes these; legacy `relic` = final).
-- Run in Supabase SQL editor if inserts/updates fail with "column does not exist".

alter table public.contributor_builds
  add column if not exists starting_relic jsonb,
  add column if not exists final_relic jsonb;

alter table public.community_builds
  add column if not exists starting_relic jsonb,
  add column if not exists final_relic jsonb;
