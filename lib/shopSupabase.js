/**
 * Supabase sync for shop: gold, total_gold_earned, shop_owned.
 * Requires user_data columns: gold, total_gold_earned, shop_owned (run supabase_shop_gold_leaderboard.sql).
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

/**
 * Fetch user's gold, total_gold_earned, shop_owned from Supabase.
 * @returns {{ gold: number, total_gold_earned: number, shop_owned: string[] } | null }
 */
export async function fetchUserShopData(username) {
  const sb = getSupabase();
  if (!sb || !username) return null;
  try {
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
      total_gold_earned: typeof data.total_gold_earned === 'number' ? data.total_gold_earned : parseInt(data.total_gold_earned, 10) || 0,
      shop_owned: owned,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Update user's gold and/or total_gold_earned and/or shop_owned in Supabase.
 * - For purchase: pass newGold (balance after buy) and newOwned (full list of owned item ids).
 * - For awarding (challenges): pass addGold, addTotalEarned.
 * Purchases are saved to the user's account so they keep what they bought across devices.
 */
export async function updateUserShopData(username, { newGold, newOwned, addGold, addTotalEarned }) {
  const sb = getSupabase();
  if (!sb || !username) return false;
  try {
    const updates = { updated_at: new Date().toISOString() };
    if (newGold !== undefined) updates.gold = Math.max(0, newGold);
    if (newOwned !== undefined) updates.shop_owned = JSON.stringify(Array.isArray(newOwned) ? newOwned : []);
    if (addGold !== undefined || addTotalEarned !== undefined) {
      const { data: row } = await sb.from('user_data').select('gold, total_gold_earned').eq('username', username).maybeSingle();
      const currentGold = row != null ? (Number(row.gold) || 0) : 0;
      const currentTotal = row != null ? (Number(row.total_gold_earned) || 0) : 0;
      updates.gold = currentGold + (addGold || 0);
      updates.total_gold_earned = currentTotal + (addTotalEarned || 0);
    }
    const { error } = await sb.from('user_data').upsert({ username, ...updates }, { onConflict: 'username' });
    return !error;
  } catch (_) {
    return false;
  }
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
        total_gold_earned: typeof r.total_gold_earned === 'number' ? r.total_gold_earned : parseInt(r.total_gold_earned, 10) || 0,
      }));
  } catch (_) {
    return [];
  }
}
