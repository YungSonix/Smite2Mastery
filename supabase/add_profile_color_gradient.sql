-- Add profile color and gradient to user_data so users can customize their profile
-- and other users see the same colors when viewing their profile.
-- Run this in Supabase SQL Editor.

ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS profile_color text,
  ADD COLUMN IF NOT EXISTS profile_gradient text;

COMMENT ON COLUMN user_data.profile_color IS 'Primary accent color (hex, e.g. #a855f7) for profile header/border';
COMMENT ON COLUMN user_data.profile_gradient IS 'Optional gradient as JSON array of 2 hex colors, e.g. ["#a855f7","#3b82f6"]';

-- Profile banner, title, badges, animated name (for richer profiles; others see when viewing)
ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS profile_banner text,
  ADD COLUMN IF NOT EXISTS profile_title text,
  ADD COLUMN IF NOT EXISTS profile_badges text,
  ADD COLUMN IF NOT EXISTS name_animation text;

COMMENT ON COLUMN user_data.profile_banner IS 'Banner preset key or image URL';
COMMENT ON COLUMN user_data.profile_title IS 'Profile title text (e.g. "Support Main")';
COMMENT ON COLUMN user_data.profile_badges IS 'JSON array of badge ids, e.g. ["early_adopter","support_main"]';
COMMENT ON COLUMN user_data.name_animation IS 'Name animation: none, gradient, pulse, shimmer';
