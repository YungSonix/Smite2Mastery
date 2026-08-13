/**
 * Smite 2 item passive stat bonuses for the Custom Builder static sheet (level 20).
 * Assumes full health / max combat stacks unless passiveOptions overrides.
 */

/** smitecalc static totals assume ~90% available mana for Pendulum (+7 INT per 10% chunk). */
export const PENDULUM_STATIC_SHEET_MANA_PERCENT = 90;

/** Evolved Transcendence / Book of Thoth — max Mana Infusion stacks on the static sheet. */
export const TRANSCENDENCE_MAX_STACK_MANA = 500;

/** Post-evolve Devourer's stacks beyond the 75 baked into Evolved item stats. */
export const DEVOURER_EXTRA_STACKS_DEFAULT = 100;

/** Bracer of the Abyss — max stacks on end-game sheet. */
export const HAND_OF_ABYSS_MAX_STACKS = 8;

/** Necronomicon — kill stacks on full stack sheet. */
export const NECRONOMICON_MAX_STACKS = 6;

/** Brawler's Beat Stick — in-combat stacks. */
export const BRAWLERS_MAX_COMBAT_STACKS = 5;

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
  const key = String(name).toLowerCase();
  return equippedItems.some((i) => internalName(i).toLowerCase() === key);
}

function scaledItemStat(items, statKey, mult) {
  return sumItemStat(items, statKey) * mult;
}

/** Parse "+35 STR/+60 INT" adaptive lines from item passive text. */
export function parseAdaptiveStatFromPassive(passive) {
  if (!passive) return null;
  const p = String(passive).replace(/\r/g, '');
  let m = p.match(/Adaptive Stat:\s*\+(\d+)\s*STR\s*\/\s*\+?(\d+)\s*INT/i);
  if (m) return { str: Number(m[1]), int: Number(m[2]) };
  m = p.match(/Adaptive Stat:\s*\+(\d+)\s*Strength\s*\/\s*\+(\d+)\s*Intelligence/i);
  if (m) return { str: Number(m[1]), int: Number(m[2]) };
  m = p.match(/Adaptive Stat:\s*\+(\d+)\s*Strength\s*or\s*\+(\d+)\s*Intelligence/i);
  if (m) return { str: Number(m[1]), int: Number(m[2]) };
  m = p.match(/Adaptive Stat:\s*\+(\d+)\s*STR\s*\/\s*(\d+)\s*INT/i);
  if (m) return { str: Number(m[1]), int: Number(m[2]) };
  return null;
}

function applyAdaptiveStatBonus(flatStrFromItems, flatIntFromItems, strBonus, intBonus) {
  if (flatStrFromItems >= flatIntFromItems) return { str: strBonus, int: 0 };
  return { str: 0, int: intBonus };
}

/** Parse "+7.5% Stats from Items" (and "of all Stats from Items") from item passive text. */
export function parseStatsFromItemsPercent(passive) {
  if (!passive) return 0;
  const m = String(passive).match(/(\d+(?:\.\d+)?)\s*%\s*(?:of all )?stats from items/i);
  return m ? Number(m[1]) : 0;
}

/** Aladdin's Lamp relic — 9% at level 20 per item text. */
export function getAladdinsLampStatsPercent(godLevel = 20) {
  const lv = Math.max(1, Math.min(20, Number(godLevel) || 20));
  if (lv >= 20) return 9;
  return 1 + 0.4 * lv;
}

/** Sum % Stats from Items passives + Aladdin's Lamp relic. */
export function getStatsFromItemsPercentBonus(equippedItems, godLevel = 20) {
  let pct = 0;
  for (const item of (equippedItems || []).filter(Boolean)) {
    pct += parseStatsFromItemsPercent(item.passive);
  }
  if (hasItem(equippedItems, 'aladdinslamp')) {
    pct += getAladdinsLampStatsPercent(godLevel);
  }
  return pct;
}

/** Boost flat item stat lines by total % Stats from Items (additive across sources). */
export function applyStatsFromItemsPercentMultiplier(stats, baseStats, percentBonus) {
  if (!percentBonus || percentBonus <= 0 || !stats) return stats;
  const mult = 1 + percentBonus / 100;
  Object.keys(stats).forEach((key) => {
    if (key === 'BaseAttackSpeed' || key === 'AttackSpeedPercent') return;
    const baseVal = baseStats[key] || 0;
    const totalVal = stats[key] || 0;
    const fromItems = totalVal - baseVal;
    if (fromItems > 0) {
      stats[key] = baseVal + fromItems * mult;
    }
  });
  return stats;
}

function emptyBonusShape() {
  return {
    Intelligence: 0,
    Strength: 0,
    Mana: 0,
    MaxMana: 0,
    ManaPerSecond: 0,
    Lifesteal: 0,
    PhysicalProtection: 0,
    MagicalProtection: 0,
    AttackSpeedPercent: 0,
    BasicDamageFlat: 0,
    Pathfinding: 0,
    AttackDamageMultiplier: 1,
    MovementSpeed: 0,
  };
}

function applyProximityPassiveBonuses(passive, out, options) {
  const p = String(passive || '').replace(/\r/g, '');
  if (!p) return;
  const alone = (options.proximityMode || 'nearGod') === 'alone';

  if (alone) {
    let m = p.match(/Alone:\s*(\d+(?:\.\d+)?)% Movement Speed and (\d+)% Attack Speed,\s*and (\d+(?:\.\d+)?)% Lifesteal/i);
    if (m) {
      out.MovementSpeed += Number(m[1]);
      out.AttackSpeedPercent += Number(m[2]);
      out.Lifesteal += Number(m[3]);
      return;
    }
    m = p.match(/Alone:\s*\+?(\d+(?:\.\d+)?)% Attack Speed and \+?(\d+(?:\.\d+)?)% Movement Speed/i);
    if (m) {
      out.AttackSpeedPercent += Number(m[1]);
      out.MovementSpeed += Number(m[2]);
    }
    return;
  }

  let m = p.match(
    /Within 8\.8m of a god:\s*\+(\d+)% Attack Speed,\s*\+(\d+)% Movement Speed,\s*and \+(\d+(?:\.\d+)?)% Lifesteal/i
  );
  if (m) {
    out.AttackSpeedPercent += Number(m[1]);
    out.MovementSpeed += Number(m[2]);
    out.Lifesteal += Number(m[3]);
    return;
  }
  m = p.match(/Within 8\.8m of a god:\s*\+(\d+)% Attack Speed and \+(\d+(?:\.\d+)?)% Movement Speed/i);
  if (m) {
    out.AttackSpeedPercent += Number(m[1]);
    out.MovementSpeed += Number(m[2]);
  }
}

function isFullHealth(options) {
  return (options.healthMode || 'full') === 'full';
}

function isBelowHalfHealth(options) {
  return options.healthMode === 'below50';
}

function isLowHealth(options) {
  return options.healthMode === 'low' || options.healthMode === 'below40';
}

/**
 * @param {Array<object|null|undefined>} equippedItems
 * @param {{
 *   pendulumAvailableManaPercent?: number,
 *   pendulumMissingManaPercent?: number,
 *   statsFromItemsPercent?: number,
 *   godLevel?: number,
 *   healthMode?: 'full' | 'below50' | 'low' | 'below40',
 *   devourerExtraStacks?: number,
 * }} [options]
 */
export function computeItemPassiveBonuses(equippedItems, options = {}) {
  const items = (equippedItems || []).filter(Boolean);
  const godLevel = Math.max(1, Math.min(20, Number(options.godLevel) || 20));
  const statsFromItemsPct =
    typeof options.statsFromItemsPercent === 'number'
      ? options.statsFromItemsPercent
      : getStatsFromItemsPercentBonus(items, godLevel);
  const mult = 1 + statsFromItemsPct / 100;

  const flatStrFromItems = scaledItemStat(items, 'Strength', mult);
  const flatIntFromItems = scaledItemStat(items, 'Intelligence', mult);
  const flatPhysProt = scaledItemStat(items, 'Physical Protection', mult);
  const flatMagProt = scaledItemStat(items, 'Magical Protection', mult);
  let manaFromItems = scaledItemStat(items, 'Mana', mult);

  const out = emptyBonusShape();

  // Evolved Transcendence — full Mana Infusion stacks (+10 Mana × 50).
  if (hasItem(items, 'EvolvedTranscendence')) {
    out.Mana += TRANSCENDENCE_MAX_STACK_MANA;
    manaFromItems += TRANSCENDENCE_MAX_STACK_MANA;
  }

  // Adaptive stat passives (starters, Death's Embrace, Brawler's, etc.).
  for (const item of items) {
    const name = internalName(item);
    if (name === 'DeathsEmbrace') continue;
    const adaptive = parseAdaptiveStatFromPassive(item.passive);
    if (!adaptive) continue;
    const pick = applyAdaptiveStatBonus(flatStrFromItems, flatIntFromItems, adaptive.str, adaptive.int);
    out.Strength += pick.str;
    out.Intelligence += pick.int;
  }

  if (hasItem(items, 'DeathsEmbrace')) {
    const pick = applyAdaptiveStatBonus(flatStrFromItems, flatIntFromItems, 40, 70);
    out.Strength += pick.str;
    out.Intelligence += pick.int;
  }

  // Transcendence / Evolved Transcendence — +3% Strength from Mana on items.
  if (hasItem(items, 'Transcendence') || hasItem(items, 'EvolvedTranscendence')) {
    out.Strength += Math.round(0.03 * manaFromItems);
  }

  // Book of Thoth — % of Mana from Items as Intelligence.
  let thothInt = 0;
  if (hasItem(items, 'EvolvedBookOfThoth')) {
    thothInt = Math.round(0.07 * manaFromItems);
  } else if (hasItem(items, 'BookOfThoth')) {
    thothInt = Math.round(0.05 * manaFromItems);
  }
  out.Intelligence += thothInt;

  // Pendulum Of The Ages.
  let pendulumInt = 0;
  const availableManaPct = Math.max(
    0,
    Math.min(100, Number(options.pendulumAvailableManaPercent ?? PENDULUM_STATIC_SHEET_MANA_PERCENT) || 0)
  );
  const missingManaPct = Math.max(
    0,
    Math.min(100, Number(options.pendulumMissingManaPercent ?? 0) || 0)
  );
  if (hasItem(items, 'PendulumOfTheAges')) {
    const intPath = flatIntFromItems >= flatStrFromItems;
    const availChunks = Math.floor(availableManaPct / 10);
    const missingChunks = Math.floor(missingManaPct / 10);
    if (intPath) {
      pendulumInt = 70 + 7 * availChunks;
      out.Intelligence += pendulumInt;
    } else {
      out.Strength += 45 + 3 * availChunks;
    }
    out.ManaPerSecond += 4 * missingChunks;
  }

  // Rod of Tahuti — 25% Intelligence from items (iterative).
  if (hasItem(items, 'EldritchOrb')) {
    const tahutiBase = flatIntFromItems + thothInt + pendulumInt;
    let tahutiBonus = 0;
    for (let i = 0; i < 32; i += 1) {
      const next = Math.floor(0.25 * (tahutiBase + tahutiBonus));
      if (next === tahutiBonus) break;
      tahutiBonus = next;
    }
    out.Intelligence += tahutiBonus;
  }

  // Dwarven Plate — +10% phys / +30% mag protections from items (both on static sheet).
  if (hasItem(items, 'DwarvenPlate')) {
    out.PhysicalProtection += Math.floor(flatPhysProt * 0.1);
    out.MagicalProtection += Math.floor(flatMagProt * 0.3);
  }

  // Shifter's Shield — over 75% HP: adaptive power; under: +20 prots each.
  if (hasItem(items, 'ShiftersShieldV2')) {
    if (isFullHealth(options)) {
      const pick = applyAdaptiveStatBonus(flatStrFromItems, flatIntFromItems, 45, 55);
      out.Strength += pick.str;
      out.Intelligence += pick.int;
    } else {
      out.PhysicalProtection += 20;
      out.MagicalProtection += 20;
    }
  }

  // Bancroft's Talon — caps at +60 INT and +10% LS at 40% HP.
  if (hasItem(items, 'BancroftsTalon') && isLowHealth(options)) {
    out.Intelligence += 60;
    out.Lifesteal += 10;
  }

  // Devourer's Gauntlet / Evolved — stack bonuses.
  const devourerExtra = Math.max(0, Number(options.devourerExtraStacks ?? DEVOURER_EXTRA_STACKS_DEFAULT) || 0);
  if (hasItem(items, 'EvolvedDevourersGauntlet')) {
    out.Strength += Math.round(devourerExtra * 0.4);
    out.Lifesteal += devourerExtra * 0.075;
  } else if (hasItem(items, 'DevourersGauntlet')) {
    const stacks = 75;
    out.Strength += Math.round(stacks * 0.4 + 10);
    out.Lifesteal += stacks * 0.05 + 3;
  }

  // Necronomicon — max kill stacks (+30 INT each).
  if (hasItem(items, 'Necronomicon')) {
    out.Intelligence += NECRONOMICON_MAX_STACKS * 30;
  }

  // Brawler's Beat Stick — max in-combat % stat stacks (+2% STR/INT/prot per stack).
  if (hasItem(items, 'BrawlersBeatstick')) {
    const pct = 0.02 * BRAWLERS_MAX_COMBAT_STACKS;
    out.Strength += Math.floor(flatStrFromItems * pct);
    out.Intelligence += Math.floor(flatIntFromItems * pct);
    out.PhysicalProtection += Math.floor(flatPhysProt * pct);
    out.MagicalProtection += Math.floor(flatMagProt * pct);
  }

  // Bracer of The Abyss — +8 Attack Damage per stack.
  if (hasItem(items, 'HandOfTheAbyss')) {
    out.BasicDamageFlat += 8 * HAND_OF_ABYSS_MAX_STACKS;
  }

  // Gem of Focus / The World Stone — max Momentum pathfinding stacks (+7% each).
  for (const item of items) {
    const passive = String(item.passive || '');
    if (/Momentum grants \+7% Pathfinding/i.test(passive)) {
      out.Pathfinding += 21;
    }
  }

  // Riptalon — health-band attack damage (and lifesteal below 50%).
  if (hasItem(items, 'Riptalon')) {
    if (isBelowHalfHealth(options)) {
      out.AttackDamageMultiplier *= 1.25;
      out.Lifesteal += 7.5;
    } else {
      out.AttackDamageMultiplier *= 1.1;
    }
  }

  // Hunter's Cowl / Leather Cowl / similar — default near-god for jungle static sheet.
  for (const item of items) {
    applyProximityPassiveBonuses(item.passive, out, options);
  }

  return out;
}

/**
 * Passives that depend on final Intelligence / Attack Speed totals.
 * Call after god + item passives are merged into stats (before basic-attack scaling).
 */
export function computeDerivedItemPassiveBonuses(stats, equippedItems = []) {
  const items = (equippedItems || []).filter(Boolean);
  const out = { BasicDamageFlat: 0, AttackSpeedPercent: 0, AttackDamageMultiplier: 1 };

  if (hasItem(items, 'NimbleRing')) {
    const totalInt = Math.floor(stats.Intelligence || 0);
    const chunks = Math.floor(totalInt / 10);
    out.BasicDamageFlat += chunks;
    out.AttackSpeedPercent += chunks;
  }

  return out;
}
