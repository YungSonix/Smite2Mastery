/**
 * Supabase RPCs for secret-link Discord bot drafts (see supabase/discord_bot_shared_builds.sql).
 * Client uses anon key; bot uses service role on the table directly.
 */

export async function getDiscordBotSharedBuildPayload(token) {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase.rpc('get_discord_bot_shared_build', {
      p_token: token,
    });
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
}

export async function saveDiscordBotSharedBuildPayload(token, payload) {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase.rpc('save_discord_bot_shared_build', {
      p_token: token,
      p_payload: payload,
    });
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
}

export async function listDiscordBotSharedBuilds() {
  try {
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase.rpc('list_discord_bot_shared_builds');
    return { data, error };
  } catch (e) {
    return { data: null, error: e };
  }
}
