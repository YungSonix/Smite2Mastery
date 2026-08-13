/**
 * Push device-local profile + shop cache to Supabase when auth session is linked.
 * Used after login and on profile load so web/dev can catch up with mobile data.
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

function parseJsonArray(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** @returns {Promise<{ connected: boolean, reason?: string, linked?: string|null }>} */
export async function getAccountSyncStatus(username) {
  const auth = await ensureAuthenticatedForUsername(username);
  return {
    connected: auth.ready === true,
    reason: auth.reason,
    linked: auth.linked ?? null,
  };
}

/**
 * Merge local profile + shop into Supabase (when local has more / device never synced).
 * @returns {Promise<{ ok: boolean, reason?: string, gold?: number }>}
 */
export async function syncLocalAccountToCloud(username, storage) {
  const trimmed = String(username || '').trim();
  if (!trimmed || !storage?.getItem) return { ok: false, reason: 'missing_input' };

  const auth = await ensureAuthenticatedForUsername(trimmed);
  if (!auth.ready) return { ok: false, reason: auth.reason || 'not_authenticated' };

  const sb = getSupabase();
  if (!sb) return { ok: false, reason: 'missing_config' };

  const prefix = `shop_${trimmed}_`;
  const [
    pinnedBuildsRaw,
    pinnedGodsRaw,
    savedBuildsRaw,
    profileGodIcon,
    displayName,
    preferredRolesRaw,
    profileFont,
    localGoldRaw,
    localOwnedRaw,
  ] = await Promise.all([
    storage.getItem(`pinnedBuilds_${trimmed}`),
    storage.getItem(`pinnedGods_${trimmed}`),
    storage.getItem(`savedBuilds_${trimmed}`),
    storage.getItem(`profileGodIcon_${trimmed}`),
    storage.getItem(`displayName_${trimmed}`),
    storage.getItem(`preferredRoles_${trimmed}`),
    storage.getItem(`profile_font_${trimmed}`),
    storage.getItem(prefix + 'gold'),
    storage.getItem(prefix + 'owned'),
  ]);

  const pinnedBuilds = parseJsonArray(pinnedBuildsRaw);
  const pinnedGods = parseJsonArray(pinnedGodsRaw);
  const savedBuilds = parseJsonArray(savedBuildsRaw);
  const preferredRoles = parseJsonArray(preferredRolesRaw);
  const localGold = Math.max(0, parseInt(localGoldRaw || '0', 10) || 0);
  const localOwned = parseJsonArray(localOwnedRaw);

  const hasProfilePayload =
    pinnedBuilds.length > 0 ||
    pinnedGods.length > 0 ||
    savedBuilds.length > 0 ||
    preferredRoles.length > 0 ||
    displayName ||
    profileGodIcon;

  if (hasProfilePayload) {
    const { error } = await sb.from('user_data').upsert(
      {
        username: trimmed,
        pinned_builds: pinnedBuilds,
        pinned_gods: pinnedGods,
        saved_builds: savedBuilds,
        preferred_roles: preferredRoles,
        profile_god_icon: profileGodIcon || null,
        display_name: displayName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'username' }
    );
    if (error && error.code !== 'MISSING_CONFIG') {
      return { ok: false, reason: error.message || 'profile_sync_failed' };
    }
  }

  if (localGold > 0 || localOwned.length > 0) {
    const { data, error } = await sb.rpc('sync_device_shop_state', {
      p_local_gold: localGold,
      p_local_owned: localOwned,
    });
    if (error && error.code !== 'MISSING_CONFIG') {
      if (String(error.message || '').includes('sync_device_shop_state')) {
        return { ok: hasProfilePayload, reason: 'shop_rpc_missing' };
      }
      return { ok: false, reason: error.message || 'shop_sync_failed' };
    }
    const parsed = typeof data === 'object' ? data : null;
    if (parsed?.ok && parsed.gold != null) {
      await storage.setItem(prefix + 'gold', String(parsed.gold));
      if (parsed.shop_owned) {
        await storage.setItem(prefix + 'owned', JSON.stringify(parsed.shop_owned));
      }
      return { ok: true, gold: parsed.gold, goldDelta: parsed.gold_delta ?? 0 };
    }
  }

  return { ok: true };
}
