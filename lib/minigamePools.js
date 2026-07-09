import { flattenBuildsGods } from './normalizeBuildsGod';
import { resolveSkinDisplayName } from './skinDisplayNames';

export function flattenAny(arr) {
  if (!arr) return [];
  if (!Array.isArray(arr)) return [arr];
  return arr.flat(Infinity).filter(Boolean);
}

const normalize = (s) => (s || '').toString().trim().toLowerCase();

export function buildSkinGuessPool(godsRoot) {
  const pool = [];
  const gods = flattenBuildsGods(godsRoot);
  gods.forEach((god) => {
    const godName = god?.name || god?.godName;
    if (!godName || !god.skins || typeof god.skins !== 'object') return;
    Object.entries(god.skins).forEach(([skinKey, skin]) => {
      if (!skin || typeof skin !== 'object') return;
      if (skin.hideFromSkinList) return;
      const type = String(skin.type || '').toLowerCase();
      const label = String(skin.name || skinKey || '');
      if (type.includes('base skin') || /base\s/i.test(label)) return;
      const imagePath = skin.cardArt || skin.skin || skin.inGame || skin.icon;
      if (!imagePath) return;
      // Prefer the human display name from the God Render screenshot map over the
      // internal builds.json names (e.g. variant "Prism B" -> "G.E.B. 1 - Stealth Strike").
      const baseDisplay = resolveSkinDisplayName({
        godName,
        skinKey,
        skinName: label,
        fallback: label || skinKey,
      });
      pool.push({
        godName,
        skinName: baseDisplay,
        imagePath,
      });
      (skin.variants || []).forEach((variant) => {
        const vPath = variant?.cardArt || variant?.skin || variant?.icon;
        if (!vPath) return;
        const variantDisplay = resolveSkinDisplayName({
          godName,
          skinKey,
          skinName: label,
          variantName: variant.name,
          fallback: variant.name || label,
        });
        pool.push({
          godName,
          skinName: variantDisplay,
          imagePath: vPath,
        });
      });
    });
  });
  return pool;
}

export function pickRandomSkinTarget(pool) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function buildItemGuessPool(itemsRoot) {
  const flat = flattenAny(itemsRoot);
  return flat.filter((item) => item?.name && item?.icon && item?.tier >= 2);
}

export function pickRandomItemTarget(pool) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const tier3 = pool.filter((i) => i.tier === 3);
  const source = tier3.length >= 24 ? tier3 : pool;
  return source[Math.floor(Math.random() * source.length)];
}

export function matchGodName(guess, targetName) {
  return normalize(guess) === normalize(targetName);
}

export function matchItemName(guess, item) {
  const g = normalize(guess);
  if (!g || !item) return false;
  return g === normalize(item.name) || g === normalize(item.internalName);
}

export function buildGodNameMap(gods) {
  const map = new Map();
  if (!Array.isArray(gods)) return map;
  gods.forEach((g) => {
    const key = normalize(g.godName || g.name);
    if (key && !map.has(key)) map.set(key, g);
  });
  return map;
}
