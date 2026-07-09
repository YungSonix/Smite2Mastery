import { SMITE_WARS_ACCESS } from '../config/appConfig';

const DEV_USERNAME_SET = new Set(
  (SMITE_WARS_ACCESS.devUsernames || []).map((u) => String(u).trim().toLowerCase()).filter(Boolean)
);

export function isSmiteWarsDevUsername(username) {
  const user = String(username || '').trim().toLowerCase();
  return !!user && DEV_USERNAME_SET.has(user);
}

/** Sync gate — __DEV__, allowlisted username, or already-known is_dev flag. */
export function canAccessSmiteWars({ username, isDevAccount = false } = {}) {
  if (SMITE_WARS_ACCESS.public) return true;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  if (isDevAccount) return true;
  if (isSmiteWarsDevUsername(username)) return true;
  return false;
}

export async function fetchSmiteWarsIsDevAccount(username) {
  const user = String(username || '').trim();
  if (!user) return false;
  if (isSmiteWarsDevUsername(user)) return true;
  try {
    const { supabase } = require('../config/supabase');
    if (!supabase || typeof supabase.from !== 'function') return false;
    const { data, error } = await supabase
      .from('user_data')
      .select('is_dev')
      .eq('username', user)
      .maybeSingle();
    if (error) return false;
    return !!data?.is_dev;
  } catch (_) {
    return false;
  }
}
