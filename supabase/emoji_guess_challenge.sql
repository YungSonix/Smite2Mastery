-- Register Guess the Emoji challenge (once per day when claimed via claim_shop_challenge).
-- Run in Supabase SQL Editor if emoji_guess_win is missing from shop_challenge_defs.

insert into public.shop_challenge_defs (condition_key, gold_reward, repeatable) values
  ('emoji_guess_win', 50, true)
on conflict (condition_key) do update
set gold_reward = excluded.gold_reward,
    repeatable = excluded.repeatable;
