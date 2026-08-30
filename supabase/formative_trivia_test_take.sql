-- Allow one production + one practice (test-link) submission per Discord per quiz.
-- Practice rows are tagged via answers.__test_take = true on submit.

drop index if exists public.trivia_responses_quiz_discord_uidx;

create unique index if not exists trivia_responses_quiz_discord_prod_uidx
  on public.trivia_responses (quiz_id, lower(discord_username))
  where coalesce((answers->>'__test_take')::boolean, false) = false;

create unique index if not exists trivia_responses_quiz_discord_test_uidx
  on public.trivia_responses (quiz_id, lower(discord_username))
  where coalesce((answers->>'__test_take')::boolean, false) = true;
