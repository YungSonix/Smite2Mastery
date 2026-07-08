/**
 * Supabase shop sync — gold and purchases go through SECURITY DEFINER RPCs only.
 * Run supabase/security_hardening_economy.sql + shop_item_catalog_seed.sql in Supabase first.
 */

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  try {
    supabase = require('../config/supabase').supabase;
    return supabase && supabase.from ? supabase : null;
  } catch (_) {
    return null;
  }
}

/** Requires linked Supabase Auth session (auth.uid()) — not set_current_user alone. */
export async function ensureShopSession(username) {
  const { ensureAuthenticatedForUsername } = require('./appAuth');
  const auth = await ensureAuthenticatedForUsername(username);
  return auth.ready;
}

/**
 * Fetch user's gold, total_gold_earned, shop_owned from Supabase.
 * @returns {{ gold: number, total_gold_earned: number, shop_owned: string[] } | null }
 */
export async function fetchUserShopData(username) {
  const sb = getSupabase();
  if (!sb || !username) return null;
  try {
    const ready = await ensureShopSession(username);
    if (!ready) return null;
    const { data, error } = await sb
      .from('user_data')
      .select('gold, total_gold_earned, shop_owned')
      .eq('username', username)
      .maybeSingle();
    if (error || !data) return null;
    let owned = [];
    if (data.shop_owned != null) {
      try {
        const parsed = typeof data.shop_owned === 'string' ? JSON.parse(data.shop_owned) : data.shop_owned;
        owned = Array.isArray(parsed) ? parsed : [];
      } catch (_) {}
    }
    return {
      gold: typeof data.gold === 'number' ? data.gold : parseInt(data.gold, 10) || 0,
      total_gold_earned:
        typeof data.total_gold_earned === 'number'
          ? data.total_gold_earned
          : parseInt(data.total_gold_earned, 10) || 0,
      shop_owned: owned,
    };
  } catch (_) {
    return null;
  }
}

function parseRpcJson(data) {
  if (data == null) return null;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (_) {
    return null;
  }
}

/** Claim 50 daily shop gold (server-gated once per UTC day). */
export async function claimDailyShopGold(username) {
  const sb = getSupabase();
  if (!sb || !username) return { claimed: false };
  try {
    await ensureShopSession(username);
    const { data, error } = await sb.rpc('claim_daily_shop_gold');
    if (error) return { claimed: false, error };
    return parseRpcJson(data) || { claimed: false };
  } catch (e) {
    return { claimed: false, error: e };
  }
}

/** Purchase one shop item by id — server validates cost and ownership. */
export async function purchaseShopItem(username, itemId) {
  const sb = getSupabase();
  if (!sb || !username || !itemId) return { purchased: false };
  try {
    await ensureShopSession(username);
    const { data, error } = await sb.rpc('purchase_shop_item', { p_item_id: itemId });
    if (error) return { purchased: false, error };
    return parseRpcJson(data) || { purchased: false };
  } catch (e) {
    return { purchased: false, error: e };
  }
}

/** Award challenge gold (server tracks repeat / one-time). */
export async function claimShopChallenge(username, conditionKey) {
  const sb = getSupabase();
  if (!sb || !username || !conditionKey) return { awarded: false };
  try {
    await ensureShopSession(username);
    const { data, error } = await sb.rpc('claim_shop_challenge', { p_condition: conditionKey });
    if (error) return { awarded: false, error };
    return parseRpcJson(data) || { awarded: false };
  } catch (e) {
    return { awarded: false, error: e };
  }
}

/** Minigame bonus gold — server caps amount (max 200). */
export async function awardMinigameGold(username, amount) {
  const sb = getSupabase();
  if (!sb || !username) return { awarded: false, gold: 0 };
  const safeAmount = Number.isFinite(amount) ? Math.floor(amount) : 0;
  if (safeAmount <= 0) return { awarded: false, gold: 0 };
  try {
    await ensureShopSession(username);
    const { data, error } = await sb.rpc('award_minigame_gold', { p_amount: safeAmount });
    if (error) return { awarded: false, error };
    const parsed = parseRpcJson(data);
    return parsed || { awarded: false };
  } catch (e) {
    return { awarded: false, error: e };
  }
}

/** Prophecy / story mode gold spend or reward — server capped delta. */
export async function applyProphecyGoldDelta(username, delta) {
  const sb = getSupabase();
  if (!sb || !username) return { ok: false };
  try {
    await ensureShopSession(username);
    const { data, error } = await sb.rpc('apply_prophecy_gold_delta', { p_delta: Math.floor(delta) });
    if (error) return { ok: false, error };
    return parseRpcJson(data) || { ok: false };
  } catch (e) {
    return { ok: false, error: e };
  }
}

/**
 * @deprecated Direct client writes blocked by RLS trigger — use RPCs above.
 */
export async function updateUserShopData() {
  return false;
}

/**
 * Leaderboard: top N users by total_gold_earned (lifetime earned).
 * @returns {{ username: string, display_name?: string, total_gold_earned: number }[]}
 */
export async function fetchLeaderboard(limit = 10) {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('user_data')
      .select('username, display_name, total_gold_earned')
      .order('total_gold_earned', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data
      .filter((r) => r != null && (r.total_gold_earned != null ? Number(r.total_gold_earned) > 0 : true))
      .map((r) => ({
        username: r.username || '',
        display_name: r.display_name || null,
        total_gold_earned:
          typeof r.total_gold_earned === 'number'
            ? r.total_gold_earned
            : parseInt(r.total_gold_earned, 10) || 0,
      }));
  } catch (_) {
    return [];
  }
}
