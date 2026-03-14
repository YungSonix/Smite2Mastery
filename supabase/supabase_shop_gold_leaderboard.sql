-- Add shop gold and leaderboard columns to user_data.
-- Run this in Supabase SQL editor so gold and purchases are stored on the user's account (global sync).

ALTER TABLE user_data ADD COLUMN IF NOT EXISTS gold integer NOT NULL DEFAULT 0;
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS total_gold_earned integer NOT NULL DEFAULT 0;
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS shop_owned text;

-- gold = current balance (spent when buying).
-- total_gold_earned = lifetime gold earned (for leaderboard; never decreases).
-- shop_owned = JSON array of purchased item ids so users keep what they bought, e.g. ["name_fx_flame","title_ascended"].
