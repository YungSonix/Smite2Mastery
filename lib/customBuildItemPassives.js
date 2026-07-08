/**
 * Computes a subset of Smite 2 item passive stat bonuses for the Custom Builder.
 * Only passives with clear, datable rules are modeled; everything else stays in item.passive text.
 */

/** smitecalc static totals assume ~90% available mana for Pendulum (+7 INT per 10% chunk). */
export const PENDULUM_STATIC_SHEET_MANA_PERCENT = 90;

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
 * @returns {{ Intelligence: number, Strength: number, ManaPerSecond: number }}
 */
export function computeItemPassiveBonuses(equippedItems, options = {}) {
  const items = (equippedItems || []).filter(Boolean);

  const manaFromItems = sumItemStat(items, 'Mana');
  const flatIntFromItems = sumItemStat(items, 'Intelligence');
  const flatStrFromItems = sumItemStat(items, 'Strength');

  const availableManaPct = Math.max(
    0,
    Math.min(100, Number(options.pendulumAvailableManaPercent ?? PENDULUM_STATIC_SHEET_MANA_PERCENT) || 0)
  );
  const missingManaPct = Math.max(
    0,
    Math.min(100, Number(options.pendulumMissingManaPercent ?? 0) || 0)
  );

  let bonusInt = 0;
  let bonusStr = 0;
  let bonusMps = 0;

  // Death's Embrace — adaptive +40 STR or +70 INT from highest item stat line.
  if (hasItem(items, 'DeathsEmbrace')) {
    if (flatStrFromItems >= flatIntFromItems) {
      bonusStr += 40;
    } else {
      bonusInt += 70;
    }
  }

  // Book of Thoth — % of Mana from Items as Intelligence (evolved overrides base).
  let thothInt = 0;
  if (hasItem(items, 'EvolvedBookOfThoth')) {
    thothInt = Math.round(0.07 * manaFromItems);
  } else if (hasItem(items, 'BookOfThoth')) {
    thothInt = Math.round(0.05 * manaFromItems);
  }
  bonusInt += thothInt;

  // Pendulum Of The Ages — adaptive base + mana-scaled stat (defaults to smitecalc static sheet mana).
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

  // Rod of Tahuti — 25% Intelligence from items (flat + Thoth + Pendulum passives).
  // Floor each 25% tick until stable (matches smitecalc static sheet convergence).
  if (hasItem(items, 'EldritchOrb')) {
    const tahutiBase = flatIntFromItems + thothInt + pendulumInt;
    let tahutiBonus = 0;
    for (let i = 0; i < 32; i += 1) {
      const next = Math.floor(0.25 * (tahutiBase + tahutiBonus));
      if (next === tahutiBonus) break;
      tahutiBonus = next;
    }
    bonusInt += tahutiBonus;
  }

  // Obsidian Shard / Titan's Bane % pen lives on item stats (OB38+) — not modeled here.

  return {
    Intelligence: bonusInt,
    Strength: bonusStr,
    ManaPerSecond: bonusMps,
  };
}
