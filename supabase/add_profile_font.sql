-- Profile display font (shop font key) — syncs across web and mobile
ALTER TABLE user_data
  ADD COLUMN IF NOT EXISTS profile_font text;

COMMENT ON COLUMN user_data.profile_font IS 'Shop font key for display name (e.g. dm_serif, lobster)';
