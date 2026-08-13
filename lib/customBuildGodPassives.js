/**
 * God kit bonuses modeled on the Custom Builder stat sheet (stance buffs, etc.).
 */

/** Ult ranks on the level 20 static sheet (maxed kit). */
export function getUltimateAbilityRank(godLevel) {
  const lv = Math.max(1, Math.min(20, Number(godLevel) || 20));
  if (lv >= 20) return 5;
  if (lv < 5) return 0;
  return Math.floor(lv / 5);
}

const STANCE_LABELS = {
  axe: 'Axe',
  bow: 'Bow',
  bear: 'Bear',
  druid: 'Druid',
  ice: 'Ice',
  fire: 'Fire',
  arcane: 'Arcane',
};

function getValueAtRank(values, rank) {
  if (!Array.isArray(values) || values.length === 0 || rank < 1) return 0;
  const idx = Math.min(values.length - 1, rank - 1);
  const n = Number(values[idx]);
  return Number.isFinite(n) ? n : 0;
}

export function isStanceSwitcherGod(god) {
  return Boolean(god?.isStanceSwitcher && Array.isArray(god.stances) && god.stances.length > 0);
}

/** Gods whose stance toggle changes stat-sheet totals (not just ability labels). */
export function isGodStanceStatModeled(god) {
  const internal = (god?.internalName || god?.name || '').toString().toLowerCase();
  return internal === 'ullr';
}

/**
 * @param {object|null|undefined} god
 * @returns {{ stances: Array<{ id: string, label: string }>, defaultStance: string } | null}
 */
export function getGodStanceOptions(god) {
  if (!isStanceSwitcherGod(god)) return null;
  const ids = god.stances.filter(Boolean);
  if (ids.length === 0) return null;
  return {
    stances: ids.map((id) => ({
      id,
      label: STANCE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
    })),
    defaultStance: ids.includes('bow') ? 'bow' : ids[0],
  };
}

function getStanceUltAbility(god) {
  const abilities = god?.abilities;
  if (!abilities) return null;
  const a04 = abilities.A04 || abilities.a04;
  if (!a04 || typeof a04 !== 'object') return null;
  const stanceKeys = Object.keys(a04).filter((k) => typeof a04[k] === 'object' && a04[k]?.valueKeys);
  if (stanceKeys.length >= 2) return a04;
  return null;
}

function computeUllrStanceBonuses(god, godLevel, stance) {
  const out = { Strength: 0, Intelligence: 0, Lifesteal: 0 };
  const a04 = getStanceUltAbility(god);
  if (!a04) return out;

  const rank = getUltimateAbilityRank(godLevel);
  const bow = a04.bow || {};
  const axe = a04.axe || {};
  const bowStr = getValueAtRank(bow.valueKeys?.['Strength Buff'], rank);
  const axeLs = getValueAtRank(axe.valueKeys?.['Lifesteal Buff'], rank);

  if (stance === 'axe') {
    out.Lifesteal += axeLs;
    out.Strength += bowStr * 0.5;
  } else {
    out.Strength += bowStr;
    out.Lifesteal += axeLs * 0.5;
  }
  return out;
}

/**
 * @param {object|null|undefined} god
 * @param {number} godLevel
 * @param {{ godStance?: string, ullrStance?: string }} [options]
 * @returns {{ Strength: number, Intelligence: number, Lifesteal: number, Mana: number, MaxMana: number }}
 */
export function computeGodPassiveStatBonuses(god, godLevel, options = {}) {
  const out = { Strength: 0, Intelligence: 0, Lifesteal: 0, Mana: 0, MaxMana: 0 };
  if (!god) return out;

  const stanceOpts = getGodStanceOptions(god);
  if (!stanceOpts) return out;

  const stance =
    options.godStance ||
    options.ullrStance ||
    stanceOpts.defaultStance;

  const internal = (god.internalName || god.name || '').toString().toLowerCase();
  if (internal === 'ullr') {
    const ullr = computeUllrStanceBonuses(god, godLevel, stance === 'axe' ? 'axe' : 'bow');
    out.Strength += ullr.Strength;
    out.Lifesteal += ullr.Lifesteal;
  }

  return out;
}

/** Short hint under the stance switcher (no passive-audit UI). */
export function getGodStanceDetailText(god, godLevel, stance) {
  if (!god || !stance) return '';
  const internal = (god.internalName || god.name || '').toString().toLowerCase();
  if (internal === 'ullr') {
    const pick = computeUllrStanceBonuses(god, godLevel, stance === 'axe' ? 'axe' : 'bow');
    const ls = Number(pick.Lifesteal.toFixed(1));
    const str = Math.round(pick.Strength);
    if (stance === 'axe') {
      return `+${ls}% lifesteal, +${str} STR (half bow buff)`;
    }
    return `+${str} STR, +${ls}% lifesteal (half axe buff)`;
  }
  const label = STANCE_LABELS[stance] || stance;
  return `${label} — ability kit only (no stat-sheet change)`;
}
