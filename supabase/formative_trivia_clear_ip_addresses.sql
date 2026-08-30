-- Scroll Trivia: scrub stored IP addresses (privacy / breach minimization)
-- Run in Supabase SQL Editor (Ctrl+A → Run). Safe to re-run.
-- New submissions already write ip_address = NULL from the API.

-- Preview (optional):
-- select
--   (select count(*) from public.trivia_responses where ip_address is not null and btrim(ip_address) <> '') as responses_with_ip,
--   (select count(*) from public.trivia_sessions where ip_address is not null and btrim(ip_address) <> '') as sessions_with_ip;

update public.trivia_responses
set ip_address = null
where ip_address is not null;

update public.trivia_sessions
set ip_address = null
where ip_address is not null;
