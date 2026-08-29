-- Stable client take token: one live session per attempt even if Discord/name is edited.
-- Run after formative_trivia_session_drafts.sql.

alter table public.trivia_sessions
  add column if not exists client_session_token text;

create unique index if not exists trivia_sessions_quiz_token_uidx
  on public.trivia_sessions (quiz_id, client_session_token)
  where client_session_token is not null;

comment on column public.trivia_sessions.client_session_token is
  'Opaque id from the take page; presence updates this row when Discord or in-game name changes.';
