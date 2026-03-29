/**
 * Computes a subset of Smite 2 item passive stat bonuses for the Custom Builder.
 * Only passives with clear, datable rules are modeled; everything else stays in item.passive text.
 */

function sumItemStat(equippedItems, statKey) {
  let sum = 0;
  for (const item of equippedItems) {
    if (!item?.stats || typeof item.stats !== 'object') continue;
    const v = item.stats[statKey];
    if (typeof v === 'number' && Number.isFinite(v)) sum += v;
  }
  return sum;
}

function internalName(item) {
  return (item?.internalName || '').toString();
}

function hasItem(equippedItems, name) {
  return equippedItems.some((i) => internalName(i) === name);
}

/**
 * @param {Array<object|null|undefined>} equippedItems - starting + final slots, in any order
 * @param {{ pendulumAvailableManaPercent?: number, pendulumMissingManaPercent?: number }} [options]
 * @returns {{ Intelligence: number, Strength: number, ManaPerSecond: number, PercentMagicalPenetration: number, PercentPhysicalPenetration: number }}
 */
export function computeItemPassiveBonuses(equippedItems, options = {}) {
  const items = (equippedItems || []).filter(Boolean);

  const manaFromItems = sumItemStat(items, 'Mana');
  const flatIntFromItems = sumItemStat(items, 'Intelligence');
  const flatStrFromItems = sumItemStat(items, 'Strength');

  const availableManaPct = Math.max(
    0,
    Math.min(100, Number(options.pendulumAvailableManaPercent ?? 100) || 0)
  );
  const missingManaPct = Math.max(
    0,
    Math.min(100, Number(options.pendulumMissingManaPercent ?? 0) || 0)
  );

  let bonusInt = 0;
  let bonusStr = 0;
  let bonusMps = 0;
  let percentMagPen = 0;
  let percentPhysPen = 0;

  // Book of Thoth — % of Mana from Items as Intelligence (evolved overrides base).
  let thothInt = 0;
  if (hasItem(items, 'EvolvedBookOfThoth')) {
    thothInt = Math.round(0.07 * manaFromItems);
  } else if (hasItem(items, 'BookOfThoth')) {
    thothInt = Math.round(0.05 * manaFromItems);
  }
  bonusInt += thothInt;

  // Pendulum Of The Ages — adaptive + mana-scaled stat; MP5 from missing mana.
  let pendulumInt = 0;
  let pendulumStr = 0;
  if (hasItem(items, 'PendulumOfTheAges')) {
    const intPath = flatIntFromItems >= flatStrFromItems;
    const availChunks = Math.floor(availableManaPct / 10);
    const missingChunks = Math.floor(missingManaPct / 10);
    if (intPath) {
      pendulumInt = 70 + 7 * availChunks;
      bonusInt += pendulumInt;
    } else {
      pendulumStr = 45 + 3 * availChunks;
      bonusStr += pendulumStr;
    }
    bonusMps += 4 * missingChunks;
  }

  // Rod of Tahuti — 25% Intelligence from items; includes Thoth passive INT and Pendulum passive INT.
  if (hasItem(items, 'EldritchOrb')) {
    const intForTahuti = flatIntFromItems + thothInt + pendulumInt;
    bonusInt += Math.round(0.25 * intForTahuti);
  }

  // Shattering (Obsidian / Titan's) — % pen; does not stack with itself (one source).
  if (hasItem(items, 'BalorsEye')) {
    percentMagPen = Math.max(percentMagPen, 35);
  }
  if (hasItem(items, 'SerpentSpear')) {
    percentPhysPen = Math.max(percentPhysPen, 35);
  }

  return {
    Intelligence: bonusInt,
    Strength: bonusStr,
    ManaPerSecond: bonusMps,
    PercentMagicalPenetration: percentMagPen,
    PercentPhysicalPenetration: percentPhysPen,
  };
}
