import {
  computeTotalBuildStats,
  getFlatPenetration,
  getPercentPenetration,
  computeEffectiveHealth,
  getBaseStatsForGodAtLevel,
  parseItemGoldCost,
} from './buildStats';
import { getBasicAttackPowerCoefficients } from './basicAttackScaling';

/** Build cumulative stat points: Base → each final item in slot order. */
export function buildItemProgressionSteps(finalItems = []) {
  const steps = [{ id: 'base', label: 'Base', shortLabel: 'Base', items: [] }];
  const equipped = [];

  finalItems.filter(Boolean).forEach((item, index) => {
    equipped.push(item);
    const label = item.name || item.internalName || `Item ${index + 1}`;
    steps.push({
      id: item.internalName || `${label}-${index}`,
      label,
      shortLabel: shortenItemLabel(label),
      items: [...equipped],
      item,
    });
  });

  return steps;
}

function shortenItemLabel(name) {
  const n = String(name || '').trim();
  if (n.length <= 14) return n;
  return `${n.slice(0, 12)}…`;
}

export function computeBuildProgressionSeries(god, godLevel, finalItems = []) {
  const steps = buildItemProgressionSteps(finalItems);
  const baseBasic = Math.round(getBaseStatsForGodAtLevel(god, godLevel).BasicDamage || 0);
  const { strength: strCoeff, intelligence: intCoeff } = getBasicAttackPowerCoefficients(god);

  return steps.map((step) => {
    const { totalStats } = computeTotalBuildStats(god, godLevel, step.items);
    const { mag: magPen, phys: physPen } = getPercentPenetration(totalStats);
    const penPct = magPen > 0 ? magPen : physPen;
    const str = Math.round(totalStats.Strength || 0);
    const int = Math.round(totalStats.Intelligence || 0);
    const basic = Math.floor(totalStats.BasicDamage || 0);
    const attackSpeed = Number(totalStats.AttackSpeedEffective || 0);
    const ehp = computeEffectiveHealth(totalStats);
    const scalingDamage = Math.floor(str * strCoeff + int * intCoeff);
    const manaRegen = Number((totalStats.ManaPerSecond || 0).toFixed(1));
    const healthRegen = Number((totalStats.HealthPerSecond || 0).toFixed(1));

    return {
      stepId: step.id,
      label: step.label,
      shortLabel: step.shortLabel,
      isBase: !step.item,
      itemIcon: step.item?.icon || null,
      itemInternalName: step.item?.internalName || null,
      int,
      strength: str,
      basic,
      damage: scalingDamage,
      dps: Math.floor(basic * attackSpeed),
      penPct: Math.round(penPct || 0),
      flatPen: Math.round(getFlatPenetration(totalStats)),
      attackSpeed: Number(attackSpeed.toFixed(2)),
      hp: Math.round(totalStats.MaxHealth || 0),
      phys: Math.round(totalStats.PhysicalProtection || 0),
      mag: Math.round(totalStats.MagicalProtection || 0),
      physEhp: ehp.PHP,
      magEhp: ehp.EHP,
      cdr: Math.round(totalStats.CooldownReduction || 0),
      manaRegen,
      healthRegen,
      baseBasic,
    };
  });
}

/** Reads one metric off a stats map for the optimizer (mirrors the chart series). */
function readStatMetric(god, totalStats, statKey, coeffs) {
  switch (statKey) {
    case 'int':
      return totalStats.Intelligence || 0;
    case 'strength':
      return totalStats.Strength || 0;
    case 'basic':
      return totalStats.BasicDamage || 0;
    case 'damage':
      return (totalStats.Strength || 0) * coeffs.strength + (totalStats.Intelligence || 0) * coeffs.intelligence;
    case 'dps':
      return (totalStats.BasicDamage || 0) * (totalStats.AttackSpeedEffective || 0);
    case 'attackSpeed':
      return totalStats.AttackSpeedEffective || 0;
    case 'penPct': {
      const { mag, phys } = getPercentPenetration(totalStats);
      return mag > 0 ? mag : phys;
    }
    case 'hp':
      return totalStats.MaxHealth || 0;
    case 'phys':
      return totalStats.PhysicalProtection || 0;
    case 'mag':
      return totalStats.MagicalProtection || 0;
    case 'physEhp':
      return computeEffectiveHealth(totalStats).PHP;
    case 'magEhp':
      return computeEffectiveHealth(totalStats).EHP;
    case 'cdr':
      return totalStats.CooldownReduction || 0;
    case 'manaRegen':
      return totalStats.ManaPerSecond || 0;
    case 'healthRegen':
      return totalStats.HealthPerSecond || 0;
    default:
      return totalStats.Intelligence || 0;
  }
}

/**
 * Greedily reorders final items (slots 1+) so each purchase step maximizes the
 * chosen metric. Slot 0 (starter / "S" row) is always pinned first on the curve.
 *
 * Score at each step = marginal stat gain / (gold cost ^ bias).
 */
export function optimizeItemOrder(god, godLevel, finalItems = [], statKey = 'int', options = {}) {
  const slots = Array.isArray(finalItems) ? finalItems : [];
  const pinnedStarter = slots[0] || null;
  const restItems = slots.slice(1).filter(Boolean);

  if (!god) {
    return slots.filter(Boolean);
  }
  if (restItems.length < 1) {
    return pinnedStarter ? [pinnedStarter] : [];
  }

  const orderedRest =
    restItems.length >= 2
      ? optimizeItemOrderGreedy(god, godLevel, restItems, statKey, options, pinnedStarter ? [pinnedStarter] : [])
      : restItems;

  return pinnedStarter ? [pinnedStarter, ...orderedRest] : orderedRest;
}

function optimizeItemOrderGreedy(god, godLevel, items, statKey, options, initialEquipped = []) {
  const bias = typeof options.goldBias === 'number' ? options.goldBias : 0.35;
  const coeffs = getBasicAttackPowerCoefficients(god);

  const metricFor = (equipped) => {
    const { totalStats } = computeTotalBuildStats(god, godLevel, equipped);
    return readStatMetric(god, totalStats, statKey, coeffs);
  };

  const remaining = items.slice();
  const ordered = [];
  let prevMetric = metricFor(initialEquipped.slice());

  while (remaining.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const metric = metricFor([...initialEquipped, ...ordered, candidate]);
      const gain = metric - prevMetric;
      const gold = Math.max(1, parseItemGoldCost(candidate));
      const score = gain / Math.pow(gold, bias);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const [picked] = remaining.splice(bestIdx, 1);
    ordered.push(picked);
    prevMetric = metricFor([...initialEquipped, ...ordered]);
  }

  return ordered;
}
