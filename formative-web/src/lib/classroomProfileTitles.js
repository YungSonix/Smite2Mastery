import { SHOP_ITEM_POOL } from '@repo-lib/shopData.js';

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SHOP_TITLES = (SHOP_ITEM_POOL || [])
  .filter((item) => item.type === 'title' && item.value)
  .map((item) => String(item.value).trim())
  .filter(Boolean);

/**
 * Deterministic placeholder title when no smite2app profile_title is linked.
 * Same discord_key always resolves to the same shop title string.
 */
export function pickDeterministicShopTitle(discordKey) {
  const key = String(discordKey || '').trim().toLowerCase();
  if (!key || !SHOP_TITLES.length) return '';
  return SHOP_TITLES[fnv1a(key) % SHOP_TITLES.length];
}

export function resolveClassroomProfileTitle(discordKey, linkedTitle = '') {
  const linked = String(linkedTitle || '').trim();
  if (linked) return linked;
  return pickDeterministicShopTitle(discordKey);
}
