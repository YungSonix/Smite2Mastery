-- Discord bot–shared custom builds (secret link editor)
-- Run in Supabase SQL Editor.
--
-- Flow:
-- 1) Bot (service role) INSERTs a row with a chosen uuid token (and optional empty payload).
-- 2) App opens /discord-build/{token}; anon calls get_discord_bot_shared_build + save_discord_bot_shared_build.
-- 3) Bot reads payload with service role: .from('discord_bot_shared_builds').select('payload').eq('token', token).single()

CREATE TABLE IF NOT EXISTS public.discord_bot_shared_builds (
  token uuid PRIMARY KEY,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discord_bot_shared_builds_updated_at_idx
  ON public.discord_bot_shared_builds (updated_at DESC);

ALTER TABLE public.discord_bot_shared_builds ENABLE ROW LEVEL SECURITY;

-- Block direct table access from clients; use RPCs + service role from the bot.
REVOKE ALL ON TABLE public.discord_bot_shared_builds FROM anon, authenticated;

GRANT ALL ON TABLE public.discord_bot_shared_builds TO service_role;

-- Fetch payload for one token (no listing).
CREATE OR REPLACE FUNCTION public.get_discord_bot_shared_build(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.payload
  FROM public.discord_bot_shared_builds d
  WHERE d.token = p_token
  LIMIT 1;
$$;

-- Update only; bot must create the row first so random UUIDs cannot be claimed from the client.
CREATE OR REPLACE FUNCTION public.save_discord_bot_shared_build(p_token uuid, p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.discord_bot_shared_builds
  SET
    payload = COALESCE(p_payload, '{}'::jsonb),
    updated_at = now()
  WHERE token = p_token;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_discord_bot_shared_build(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_discord_bot_shared_build(uuid, jsonb) TO anon, authenticated;

-- List all shared bot drafts for "View Builds" screen.
CREATE OR REPLACE FUNCTION public.list_discord_bot_shared_builds()
RETURNS TABLE (
  token uuid,
  payload jsonb,
  updated_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.token,
    d.payload,
    d.updated_at,
    d.created_at
  FROM public.discord_bot_shared_builds d
  ORDER BY d.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_discord_bot_shared_builds() TO anon, authenticated;
