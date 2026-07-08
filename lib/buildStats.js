import { computeItemPassiveBonuses } from './customBuildItemPassives';
import { getBasicAttackPowerCoefficients } from './basicAttackScaling';

export const BUILD_STAT_DISPLAY_NAMES = {
  MaxHealth: 'Health',
  Health: 'Health',
  MaxMana: 'Mana',
  Mana: 'Mana',
  HealthPerSecond: 'Health Regen',
  ManaPerSecond: 'Mana Regen',
  PhysicalProtection: 'Physical Protection',
  MagicalProtection: 'Magical Protection',
  BasicDamage: 'Attack Damage',
  AttackSpeedEffective: 'Attack Speed',
  Strength: 'Strength',
  Intelligence: 'Intelligence',
  MovementSpeed: 'Movement Speed',
  Penetration: 'Penetration',
  FlatPenetration: 'Penetration',
  'Flat Penetration': 'Penetration',
  Lifesteal: 'Lifesteal',
  CooldownReduction: 'Cooldown Reduction',
  CritChance: 'Critical Chance',
  Plating: 'Plating',
  PercentMagicalPenetration: '% Magical Penetration',
  PercentPhysicalPenetration: '% Physical Penetration',
  Pathfinding: 'Pathfinding',
  Dampening: 'Dampening',
  Tenacity: 'Tenacity',
  Echo: 'Echo',
};

export function normalizeBuildStatKey(itemKey) {
  const mapping = {
    Health: 'MaxHealth',
    Mana: 'MaxMana',
    'Health Regen': 'HealthPerSecond',
    HP5: 'HealthPerSecond',
    'Mana Regen': 'ManaPerSecond',
    MP5: 'ManaPerSecond',
    'Physical Protection': 'PhysicalProtection',
    'Magical Protection': 'MagicalProtection',
    'Physical Power': 'BasicDamage',
    'Magical Power': 'BasicDamage',
    'Attack Damage': 'BasicDamage',
    'Basic Damage': 'BasicDamage',
    'Attack Speed': 'AttackSpeedPercent',
    AttackSpeed: 'AttackSpeedPercent',
    'Attack Speed %': 'AttackSpeedPercent',
    'AttackSpeed %': 'AttackSpeedPercent',
    'Attack Speed Percent': 'AttackSpeedPercent',
    'AttackSpeed Percent': 'AttackSpeedPercent',
    'Critical Chance': 'CritChance',
    'Critical Strike Chance': 'CritChance',
    'Cooldown Rate': 'CooldownReduction',
    'Flat Penetration': 'Penetration',
    FlatPenetration: 'Penetration',
    PercentMagicalPenetration: 'PercentMagicalPenetration',
    PercentPhysicalPenetration: 'PercentPhysicalPenetration',
    '% Magical Penetration': 'PercentMagicalPenetration',
    '% Physical Penetration': 'PercentPhysicalPenetration',
  };
  return mapping[itemKey] || itemKey;
}

/** @deprecated Kept for tests; display no longer uses a synthetic reference prot. */
export const PENETRATION_REFERENCE_PROTECTION = 56;

const PENETRATION_RAW_KEYS = new Set([
  'Penetration',
  'Flat Penetration',
  'FlatPenetration',
  'PercentMagicalPenetration',
  'PercentPhysicalPenetration',
]);

export function getFlatPenetration(totalStats) {
  if (!totalStats) return 0;
  return (
    (totalStats.Penetration || 0) +
    (totalStats['Flat Penetration'] || 0) +
    (totalStats.FlatPenetration || 0)
  );
}

export function getPercentPenetration(totalStats) {
  if (!totalStats) return { mag: 0, phys: 0 };
  return {
    mag: totalStats.PercentMagicalPenetration || 0,
    phys: totalStats.PercentPhysicalPenetration || 0,
  };
}

/** flat + optional % — no synthetic "effective" number (OB38 uses real flat vs % on items). */
export function formatPenetrationDisplay(flat, percentPct) {
  const flatRounded = Math.round(flat || 0);
  const pct = Math.round(percentPct || 0);
  if (flatRounded === 0 && pct === 0) return '0';
  if (pct === 0) return String(flatRounded);
  if (flatRounded === 0) return `${pct}%`;
  return `${flatRounded} + ${pct}%`;
}

export function consolidatePenetrationInStats(stats) {
  if (!stats) return stats;
  const flat = getFlatPenetration(stats);
  delete stats['Flat Penetration'];
  delete stats.FlatPenetration;
  stats.Penetration = flat;
  return stats;
}

export function buildPenetrationDisplayRows(totalStats) {
  const flat = getFlatPenetration(totalStats);
  const { mag: magPct, phys: physPct } = getPercentPenetration(totalStats);
  const rows = [];
  const penColor = getBuildStatColor('Penetration', 'Penetration');

  if (magPct > 0 && physPct > 0) {
    rows.push({
      key: '__MagPen__',
      label: 'Magical Penetration',
      value: formatPenetrationDisplay(flat, magPct),
      color: penColor,
    });
    rows.push({
      key: '__PhysPen__',
      label: 'Physical Penetration',
      value: formatPenetrationDisplay(flat, physPct),
      color: penColor,
    });
  } else if (magPct > 0 || physPct > 0 || flat > 0) {
    const pct = magPct > 0 ? magPct : physPct;
    rows.push({
      key: '__Pen__',
      label: 'Penetration',
      value: formatPenetrationDisplay(flat, pct),
      color: penColor,
    });
  }

  return rows;
}

export function formatBuildStatValue(raw, statKey) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return raw;
  if (statKey === 'AttackSpeedEffective') {
    return Number(raw.toFixed(2));
  }
  if (statKey === 'ManaPerSecond' || statKey === 'HealthPerSecond') {
    return Number(raw.toFixed(1));
  }
  if (statKey === 'BasicDamage') {
    return Math.floor(raw);
  }
  return Math.round(raw);
}

function readStatNum(statData, key) {
  const v = statData[key];
  if (v === undefined || v === null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function getBaseStatValueForLevel(statData, level) {
  const lv = Math.max(1, Math.min(20, Number(level) || 20));
  const levelKeys = Object.keys(statData)
    .filter((k) => /^\d+$/.test(k))
    .map((k) => parseInt(k, 10))
    .filter((n) => n >= 1 && n <= 20)
    .sort((a, b) => a - b);

  if (levelKeys.length >= 2) {
    const first = levelKeys[0];
    const last = levelKeys[levelKeys.length - 1];
    if (lv <= first) return readStatNum(statData, String(first));
    if (lv >= last) return readStatNum(statData, String(last));
    let i = 0;
    while (i < levelKeys.length - 1 && levelKeys[i + 1] < lv) {
      i += 1;
    }
    const lo = levelKeys[i];
    const hi = levelKeys[i + 1];
    const vLo = readStatNum(statData, String(lo));
    const vHi = readStatNum(statData, String(hi));
    if (Number.isFinite(vLo) && Number.isFinite(vHi)) {
      const t = (lv - lo) / (hi - lo);
      return vLo + t * (vHi - vLo);
    }
  } else if (levelKeys.length === 1) {
    const v = readStatNum(statData, String(levelKeys[0]));
    if (Number.isFinite(v)) return v;
  }

  const v1 = readStatNum(statData, '1');
  const rate = readStatNum(statData, 'rate');
  if (Number.isFinite(v1) && Number.isFinite(rate)) {
    return v1 + (lv - 1) * rate;
  }
  const v20 = readStatNum(statData, '20');
  if (Number.isFinite(v1) && Number.isFinite(v20)) {
    const t = (lv - 1) / 19;
    return v1 + (v20 - v1) * t;
  }
  return Number.isFinite(v1) ? v1 : 0;
}

export function getBaseStatsForGodAtLevel(god, godLevel = 20) {
  const stats = {};
  if (!god?.baseStats) return stats;

  Object.keys(god.baseStats).forEach((statKey) => {
    const statData = god.baseStats[statKey];
    const outKey = normalizeBuildStatKey(statKey);
    if (statData && typeof statData === 'object') {
      const statValue = getBaseStatValueForLevel(statData, godLevel);
      const n = Number(statValue);
      if (statKey === 'BaseAttackSpeed' || statKey === 'AttackSpeedPercent') {
        stats[outKey] = Number.isFinite(n) ? n : 0;
      } else {
        stats[outKey] = Number.isFinite(n) ? n : 0;
      }
    } else if (statData !== null && statData !== undefined) {
      const n = Number(statData);
      stats[outKey] = Number.isFinite(n) ? n : statData;
    }
  });

  return stats;
}

export function computeTotalBuildStats(god, godLevel, equippedItems = [], passiveOptions = {}) {
  const baseStats = getBaseStatsForGodAtLevel(god, godLevel);
  const stats = { ...baseStats };

  const addItemStats = (item) => {
    if (item?.stats) {
      Object.keys(item.stats).forEach((itemKey) => {
        const normalizedKey = normalizeBuildStatKey(itemKey);
        stats[normalizedKey] = (stats[normalizedKey] || 0) + (item.stats[itemKey] || 0);
      });
    }
  };

  equippedItems.filter(Boolean).forEach(addItemStats);

  // Time-Lock Aegis — +6% to stats gained from items (flat item totals only).
  if (equippedItems.filter(Boolean).some((i) => i.internalName === 'TimeLockAegis')) {
    Object.keys(stats).forEach((key) => {
      if (key === 'BaseAttackSpeed' || key === 'AttackSpeedPercent') return;
      const baseVal = baseStats[key] || 0;
      const totalVal = stats[key] || 0;
      const fromItems = totalVal - baseVal;
      if (fromItems > 0) {
        stats[key] = baseVal + fromItems * 1.06;
      }
    });
  }

  const passiveBonuses = computeItemPassiveBonuses(equippedItems.filter(Boolean), passiveOptions);
  Object.keys(passiveBonuses).forEach((k) => {
    const add = passiveBonuses[k];
    if (typeof add === 'number' && Number.isFinite(add) && add !== 0) {
      stats[k] = (stats[k] || 0) + add;
    }
  });

  const flatAttack =
    (stats.BasicDamage || 0) + (stats['Attack Damage'] || 0) + (stats['Basic Damage'] || 0);
  const strPow = stats.Strength || 0;
  const intPow = stats.Intelligence || 0;
  const { strength: strCoeff, intelligence: intCoeff } = getBasicAttackPowerCoefficients(god);
  if (strCoeff !== 0 || intCoeff !== 0) {
    stats.BasicDamage = Math.floor(flatAttack + strPow * strCoeff + intPow * intCoeff);
  } else {
    stats.BasicDamage = Math.floor(flatAttack + strPow);
  }
  delete stats['Attack Damage'];
  delete stats['Basic Damage'];

  const baseAS = stats.BaseAttackSpeed || 0;
  const bonusASPercent = stats.AttackSpeedPercent || 0;
  if (baseAS) {
    stats.AttackSpeedEffective = Number((baseAS * (1 + bonusASPercent / 100)).toFixed(2));
  }

  delete stats.AttackSpeedPercent;
  delete stats.BaseAttackSpeed;

  consolidatePenetrationInStats(stats);

  consolidateRegenInStats(stats);

  return { baseStats, totalStats: stats };
}

/** Merge god base regen keys (ManaPerTime / HealthPerTime) into display keys. */
export function consolidateRegenInStats(stats) {
  if (!stats || typeof stats !== 'object') return;

  const manaPerTime = stats.ManaPerTime || 0;
  if (manaPerTime) {
    stats.ManaPerSecond = (stats.ManaPerSecond || 0) + manaPerTime;
    delete stats.ManaPerTime;
  }

  const healthPerTime = stats.HealthPerTime || 0;
  if (healthPerTime) {
    stats.HealthPerSecond = (stats.HealthPerSecond || 0) + healthPerTime;
    delete stats.HealthPerTime;
  }
}

export function computeEffectiveHealth(totalStats) {
  const hp = totalStats.MaxHealth || totalStats.Health || 0;
  const physicalProtection = totalStats.PhysicalProtection || 0;
  const magicalProtection = totalStats.MagicalProtection || 0;
  return {
    PHP: Math.round((hp * (physicalProtection + 100)) / 100),
    EHP: Math.round((hp * (magicalProtection + 100)) / 100),
  };
}

/** Relics/consumables may use totalCost "N/A" — treat as 0 so gold math stays valid. */
export function parseItemGoldCost(item) {
  if (!item) return 0;
  const raw = item.totalCost;
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || /^n\/?a$/i.test(trimmed)) return 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatItemGoldCost(item) {
  const cost = parseItemGoldCost(item);
  if (cost <= 0) return 'Free';
  return `${cost.toLocaleString()} Gold`;
}

/** Gold label for UI rows that show GOLD_ICON before the amount. */
export function getItemGoldCostParts(item) {
  const cost = parseItemGoldCost(item);
  if (cost <= 0) return { isFree: true, label: 'Free' };
  return { isFree: false, label: cost.toLocaleString() };
}

export function getStepGoldCostParts(stepCost) {
  const n = Number(stepCost);
  if (!Number.isFinite(n) || n <= 0) return { isFree: true, label: 'Free' };
  return { isFree: false, label: n.toLocaleString() };
}

export function computeBuildGoldCost(items = [], relic = null) {
  let sum = 0;
  items.filter(Boolean).forEach((item) => {
    sum += parseItemGoldCost(item);
  });
  sum += parseItemGoldCost(relic);
  return sum;
}

export function getBuildStatColor(statKey, statDisplayName) {
  let statColor = '#94a3b8';
  const statName = (statDisplayName || '').toLowerCase();
  const statKeyLower = String(statKey || '').toLowerCase();
  if (statName.includes('health') || statKeyLower.includes('health') || statName.includes('hp5') || statKeyLower.includes('healthper')) {
    statColor = '#22c55e';
  } else if (
    (statName.includes('mana') || statKeyLower.includes('mana') || statName.includes('mp5') || statKeyLower.includes('manaper')) &&
    !statName.includes('health')
  ) {
    statColor = '#3b82f6';
  } else if (statName.includes('physical protection') || statKeyLower.includes('physicalprotection')) {
    statColor = '#ef4444';
  } else if (statName.includes('magical protection') || statKeyLower.includes('magicalprotection')) {
    statColor = '#a855f7';
  } else if (statName.includes('physical power') || statKeyLower.includes('basicdamage')) {
    statColor = '#f97316';
  } else if (statName.includes('magical power') || statKeyLower.includes('magicalpower')) {
    statColor = '#ec4899';
  } else if (statName.includes('attack speed') || statKeyLower.includes('attackspeed')) {
    statColor = '#f97316';
  } else if (statName.includes('movement speed') || statKeyLower.includes('movementspeed')) {
    statColor = '#10b981';
  } else if (statName.includes('penetration') || statKeyLower.includes('penetration')) {
    statColor = '#ef4444';
  } else if (statName.includes('lifesteal') || statKeyLower.includes('lifesteal')) {
    statColor = '#84cc16';
  } else if (statName.includes('cooldown') || statKeyLower.includes('cooldown')) {
    statColor = '#0ea5e9';
  } else if (statName.includes('critical') || statKeyLower.includes('critical') || statName.includes('crit')) {
    statColor = '#f97316';
  } else if (statName.includes('strength') || statKeyLower.includes('strength')) {
    statColor = '#facc15';
  } else if (statName.includes('intelligence') || statKeyLower.includes('intelligence')) {
    statColor = '#a855f7';
  } else if (statKey === 'MovementSpeed' || statName.includes('movement speed')) {
    statColor = '#0ea5e9';
  } else if (statKey === '%statsFromItems' || statName.includes('stats from items')) {
    statColor = '#f97316';
  } else if (
    statName.includes('dampening') ||
    statName.includes('tenacity') ||
    statName.includes('plating') ||
    statName.includes('echo')
  ) {
    statColor = '#94a3b8';
  }
  return statColor;
}

/** Numeric stat line from patch notes, e.g. "225 Max Health" or "1.5% Health Heal". */
export function parsePatchStatLine(line) {
  const full = String(line || '').trim();
  const match = full.match(/^(\d+(?:\.\d+)?\s*%?)\s+(.+)$/i);
  if (!match) return { full, value: null, statName: full };
  return { full, value: match[1].trim(), statName: match[2].trim() };
}

export function getPatchLineStatColor(line) {
  const changelog = parsePatchChangelogStatLine(line);
  if (changelog) return getBuildStatColor(changelog.statPhrase, changelog.statPhrase);
  const statLine = parsePatchStatLine(line);
  if (statLine.value) return getBuildStatColor(statLine.statName, statLine.statName);
  return null;
}

/** Leading stat phrase from patch changelog lines, e.g. "Strength" in "Strength reduced from 35 to 20". */
export function parsePatchChangelogStatLine(line) {
  const trimmed = String(line || '').trim();
  const match = trimmed.match(/^(.+?)\s+(reduced|increased|decreased|lowered|changed)\b/i);
  if (!match) return null;
  return {
    statPhrase: match[1].trim(),
    verb: match[2],
    tail: trimmed.slice(match[0].length),
  };
}

export function getBuildStatDisplayRows(totalStats, baseStats) {
  const statOrder = [
    'AttackSpeedEffective',
    'BasicDamage',
    'MaxHealth',
    'HealthPerSecond',
    'MaxMana',
    'ManaPerSecond',
    'PhysicalProtection',
    'MagicalProtection',
  ];
  const allStats = Object.keys(totalStats).filter(
    (key) =>
      (totalStats[key] !== 0 || baseStats[key]) &&
      key !== 'BaseAttackSpeed' &&
      key !== 'ManaPerTime' &&
      key !== 'HealthPerTime' &&
      !PENETRATION_RAW_KEYS.has(key)
  );
  const orderedStats = statOrder.filter((key) => allStats.includes(key));
  const remainingStats = allStats.filter((key) => !statOrder.includes(key)).sort();
  const finalStats = [];
  orderedStats.forEach((statKey) => {
    finalStats.push(statKey);
    if (statKey === 'PhysicalProtection' && (totalStats.MaxHealth || totalStats.Health)) {
      finalStats.push('__PhysicalEHP__');
    }
    if (statKey === 'MagicalProtection' && (totalStats.MaxHealth || totalStats.Health)) {
      finalStats.push('__MagicalEHP__');
    }
  });
  finalStats.push(...remainingStats);

  const ehp = computeEffectiveHealth(totalStats);
  const penRows = buildPenetrationDisplayRows(totalStats);
  if (penRows.length > 0) {
    const afterMagEhp = finalStats.indexOf('__MagicalEHP__');
    const afterMagProt = finalStats.indexOf('MagicalProtection');
    const insertAt =
      afterMagEhp >= 0 ? afterMagEhp + 1 : afterMagProt >= 0 ? afterMagProt + 1 : finalStats.length;
    finalStats.splice(insertAt, 0, ...penRows.map((r) => r.key));
  }

  const penRowByKey = Object.fromEntries(penRows.map((r) => [r.key, r]));

  return finalStats.map((statKey) => {
    if (penRowByKey[statKey]) {
      const row = penRowByKey[statKey];
      return { key: row.key, label: row.label, value: row.value, color: row.color };
    }
    if (statKey === '__PhysicalEHP__') {
      return {
        key: statKey,
        label: 'Physical EHP',
        value: ehp.PHP.toLocaleString(),
        color: '#ef4444',
      };
    }
    if (statKey === '__MagicalEHP__') {
      return {
        key: statKey,
        label: 'Magical EHP',
        value: ehp.EHP.toLocaleString(),
        color: '#a855f7',
      };
    }
    const label = BUILD_STAT_DISPLAY_NAMES[statKey] || statKey;
    const raw = totalStats[statKey];
    const value = formatBuildStatValue(raw, statKey);
    return {
      key: statKey,
      label,
      value,
      color: getBuildStatColor(statKey, label),
    };
  });
}
