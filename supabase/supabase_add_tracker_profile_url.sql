-- Adds tracker.gg profile URL storage for user profile stats cards
ALTER TABLE public.user_data
ADD COLUMN IF NOT EXISTS tracker_profile_url text;

