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
  Lifesteal: 'Lifesteal',
  CooldownReduction: 'Cooldown Reduction',
  CritChance: 'Critical Chance',
  Plating: 'Plating',
  PercentMagicalPenetration: '% Magical Penetration',
  PercentPhysicalPenetration: '% Physical Penetration',
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
    HealthPerTime: 'HealthPerSecond',
    ManaPerTime: 'ManaPerSecond',
  };
  return mapping[itemKey] || itemKey;
}

export function formatBuildStatValue(raw, statKey) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return raw;
  if (statKey === 'AttackSpeedEffective') {
    return Number(raw.toFixed(2));
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

export function computeTotalBuildStats(god, godLevel, equippedItems = []) {
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

  const passiveBonuses = computeItemPassiveBonuses(equippedItems.filter(Boolean));
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
    stats.BasicDamage = Math.round(flatAttack + strPow * strCoeff + intPow * intCoeff);
  } else {
    stats.BasicDamage = Math.round(flatAttack + strPow);
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

  return { baseStats, totalStats: stats };
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

export function computeBuildGoldCost(items = [], relic = null) {
  let sum = 0;
  items.filter(Boolean).forEach((item) => {
    if (item.totalCost) sum += item.totalCost;
  });
  if (relic?.totalCost) sum += relic.totalCost;
  return sum;
}

export function getBuildStatColor(statKey, statDisplayName) {
  let statColor = '#94a3b8';
  const statName = (statDisplayName || '').toLowerCase();
  const statKeyLower = String(statKey || '').toLowerCase();
  if (statName.includes('health') || statKeyLower.includes('health') || statName.includes('hp5') || statKeyLower.includes('healthper')) {
    statColor = '#22c55e';
  } else if (statName.includes('mana') || statKeyLower.includes('mana') || statName.includes('mp5') || statKeyLower.includes('manaper')) {
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
  }
  return statColor;
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
    (key) => (totalStats[key] !== 0 || baseStats[key]) && key !== 'BaseAttackSpeed'
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

  return finalStats.map((statKey) => {
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
