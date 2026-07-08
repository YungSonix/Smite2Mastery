import { filterItemsForGod, isItemAllowedForGod } from './buildItemGodRules';

/** Smite 2 build rule — max 3 on-use / active items (starter + relic excluded). */
export const RANDOMIZER_MAX_ACTIVE_ITEMS = 3;

export function isRandomizerActiveItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.relic === true || item.consumable === true || item.starter === true) return false;
  if (item.active === true) return true;
  const passive = String(item.passive || '');
  if (/\bOn Use:/i.test(passive)) return true;
  if (/^Active:/im.test(passive)) return true;
  return false;
}

export function isRandomizerStarterItem(item) {
  return Boolean(item?.starter === true && (item.name || item.internalName));
}

function hasItemIdentity(item) {
  return Boolean(
    item &&
      typeof item === 'object' &&
      (item.tier || item.totalCost || (item.stats && Object.keys(item.stats).length > 0)) &&
      (!item.stepCost || item.tier) &&
      (item.name || item.internalName)
  );
}

export function getRandomizerItemPools(items, god = null) {
  const list = filterItemsForGod(
    (items || []).filter((item) => item && typeof item === 'object'),
    god
  );
  const starterItems = list.filter(isRandomizerStarterItem);
  const activeItems = list.filter((item) => isRandomizerActiveItem(item) && hasItemIdentity(item));
  const tier3Items = list.filter((item) => {
    if (item.tier !== 3 || item.relic || item.consumable || item.starter) return false;
    if (isRandomizerActiveItem(item)) return false;
    return Boolean(item.name || item.internalName);
  });
  return { starterItems, activeItems, tier3Items };
}

export function countRandomizerActiveItems(slots) {
  return (slots || []).slice(1, 7).filter(isRandomizerActiveItem).length;
}

function pickRandom(arr) {
  if (!arr?.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomUnique(arr, count) {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/** Starter + up to 3 unique actives (slots 1–3) + passive tier-3 fill (slots 4–6). */
export function rollRandomizerFullBuild(items, god = null) {
  const { starterItems, activeItems, tier3Items } = getRandomizerItemPools(items, god);
  if (!starterItems.length) return null;

  const newItems = Array(7).fill(null);
  newItems[0] = pickRandom(starterItems);

  const activesToPlace = pickRandomUnique(
    activeItems,
    Math.min(RANDOMIZER_MAX_ACTIVE_ITEMS, activeItems.length)
  );
  activesToPlace.forEach((item, i) => {
    newItems[i + 1] = item;
  });

  for (let slot = 1 + activesToPlace.length; slot < 7; slot += 1) {
    if (!tier3Items.length) break;
    newItems[slot] = pickRandom(tier3Items);
  }

  return sanitizeRandomizerItems(newItems, items, god);
}

/**
 * @param {number} slotIndex 0 = starter, 1–6 = final build slots
 */
export function rollRandomizerSlotItem(items, currentSlots, slotIndex, god = null) {
  const slots = [...(currentSlots || [])];
  while (slots.length < 7) slots.push(null);

  const { starterItems, activeItems, tier3Items } = getRandomizerItemPools(items, god);

  if (slotIndex === 0) {
    return pickRandom(starterItems);
  }

  if (slotIndex >= 4) {
    return pickRandom(tier3Items);
  }

  const activeElsewhere = slots
    .slice(1, 7)
    .filter((it, i) => i + 1 !== slotIndex && isRandomizerActiveItem(it)).length;
  const currentIsActive = isRandomizerActiveItem(slots[slotIndex]);

  let pool = tier3Items;
  if (activeElsewhere < RANDOMIZER_MAX_ACTIVE_ITEMS || currentIsActive) {
    pool = [...activeItems, ...tier3Items];
  }

  return pickRandom(pool);
}

function replaceDisallowedSlotItem(slotIndex, items, god) {
  const { starterItems, activeItems, tier3Items } = getRandomizerItemPools(items, god);
  if (slotIndex === 0) return pickRandom(starterItems);
  if (slotIndex >= 4) return pickRandom(tier3Items);
  return pickRandom([...activeItems, ...tier3Items]);
}

/** Demote extra actives and swap god-restricted items for legal picks. */
export function sanitizeRandomizerItems(slots, items, god = null) {
  const { tier3Items } = getRandomizerItemPools(items, god);
  const next = [...(slots || [])];
  while (next.length < 7) next.push(null);

  for (let i = 0; i < 7; i += 1) {
    if (next[i] && !isItemAllowedForGod(next[i], god)) {
      next[i] = replaceDisallowedSlotItem(i, items, god) || null;
    }
  }

  for (let i = 4; i < 7; i += 1) {
    if (isRandomizerActiveItem(next[i])) {
      next[i] = pickRandom(tier3Items) || null;
    }
  }

  const activeIndices = [];
  for (let i = 1; i < 7; i += 1) {
    if (isRandomizerActiveItem(next[i])) activeIndices.push(i);
  }

  while (activeIndices.length > RANDOMIZER_MAX_ACTIVE_ITEMS) {
    const dropSlot = activeIndices.pop();
    next[dropSlot] = pickRandom(tier3Items) || null;
  }

  for (let i = 0; i < 7; i += 1) {
    if (next[i] && !isItemAllowedForGod(next[i], god)) {
      next[i] = replaceDisallowedSlotItem(i, items, god) || null;
    }
  }

  return next.slice(0, 7);
}

export function randomizerSlotsEqual(a, b) {
  const left = a || [];
  const right = b || [];
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    const leftKey = left[i]?.internalName || left[i]?.name || '';
    const rightKey = right[i]?.internalName || right[i]?.name || '';
    if (leftKey !== rightKey) return false;
  }
  return true;
}
