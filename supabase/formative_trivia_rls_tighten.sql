-- Drop anon SELECT on trivia_questions so the client key cannot dump
-- correct answers + full meta (PostgREST egress). Take pages use /api/trivia/public.
-- Assigned quiz rows stay readable (small: slug/title/banner).
-- Paste in Supabase SQL Editor after formative_trivia.sql.

drop policy if exists trivia_questions_public_read_assigned on public.trivia_questions;
