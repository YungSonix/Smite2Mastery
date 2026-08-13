/**
 * Persist profile cosmetics to Supabase (requires linked auth session).
 */

import { ensureAuthenticatedForUsername } from './appAuth';

function getSupabase() {
  try {
    const sb = require('../config/supabase').supabase;
    return sb && sb.from ? sb : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} username
 * @param {Record<string, unknown>} fields — user_data columns only
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function upsertUserProfileFields(username, fields) {
  const trimmed = String(username || '').trim();
  if (!trimmed) return { ok: false, reason: 'missing_username' };

  const auth = await ensureAuthenticatedForUsername(trimmed);
  if (!auth.ready) {
    return { ok: false, reason: auth.reason || 'not_authenticated' };
  }

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: 'missing_config' };

  const { error } = await sb.from('user_data').upsert(
    {
      username: trimmed,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'username' }
  );

  if (error && error.code !== 'MISSING_CONFIG') {
    return { ok: false, reason: error.message || 'save_failed' };
  }
  return { ok: true };
}
