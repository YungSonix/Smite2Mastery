import { tightenMultilineGameText } from './alignedBulletText';
import { ABILITY_TOOLTIP_DETAIL, DEFAULT_ABILITY_TOOLTIP_DETAIL } from '../lib/abilityTooltipDetail';
import { getAbilityTooltipDescription } from './stringTableLookup';
import {
  applyAbilityLevelValues,
  getLevelValue,
  toLevelValueArray,
  isAbilityStatConstantAcrossLevels,
  formatAbilityStatDisplayValue,
} from './abilityValueKeys';

export { applyAbilityLevelValues, getLevelValue, isAbilityStatConstantAcrossLevels, formatAbilityStatDisplayValue };

export const KIT_ABILITY_TOOLTIP_BODY_MAX = 3200;
export const KIT_ABILITY_TOOLTIP_BODY_MINIMAL_MAX = 1400;
export const KIT_TOOLTIP_LEVELS = [1, 2, 3, 4, 5];
export const KIT_TOOLTIP_CARD_WIDTH = 420;
export const KIT_TOOLTIP_CARD_HEIGHT = 400;
export const KIT_TOOLTIP_CARD_HEIGHT_MINIMAL = 260;
export const KIT_TOOLTIP_CARD_HEIGHT_DESCRIPTIVE_MAX = 480;

function normalizeDetailLevel(detailLevel) {
  return detailLevel === ABILITY_TOOLTIP_DETAIL.MINIMAL
    ? ABILITY_TOOLTIP_DETAIL.MINIMAL
    : ABILITY_TOOLTIP_DETAIL.DESCRIPTIVE;
}

export function buildKitAbilityTooltipBody(
  ability,
  detailLevel = DEFAULT_ABILITY_TOOLTIP_DETAIL,
  god = null,
  levelIndex = 0,
  options = {}
) {
  if (!ability || typeof ability !== 'object') return '';
  const mode = normalizeDetailLevel(detailLevel);

  const fromTable = getAbilityTooltipDescription(god, ability, mode, levelIndex, options);
  if (fromTable) {
    let text = fromTable;
    const maxLen =
      mode === ABILITY_TOOLTIP_DETAIL.MINIMAL
        ? KIT_ABILITY_TOOLTIP_BODY_MINIMAL_MAX
        : KIT_ABILITY_TOOLTIP_BODY_MAX;
    text = tightenMultilineGameText(text);
    if (text.length > maxLen) {
      return `${text.slice(0, maxLen)}…`;
    }
    return text;
  }

  const desc = ability.shortDesc || ability.description || '';
  let text = applyAbilityLevelValues(String(desc).trim(), ability, levelIndex);

  if (mode === ABILITY_TOOLTIP_DETAIL.DESCRIPTIVE) {
    const minimalFromTable = getAbilityTooltipDescription(
      god,
      ability,
      ABILITY_TOOLTIP_DETAIL.MINIMAL,
      levelIndex,
      options
    );
    if (minimalFromTable && minimalFromTable !== text && !text.includes(minimalFromTable)) {
      text = text ? `${minimalFromTable}\n\n${text}` : minimalFromTable;
    }
    if (ability.scales) {
      const scales = String(ability.scales).trim();
      if (scales) {
        const clip = scales.length > 160 ? `${scales.slice(0, 160)}…` : scales;
        text = text ? `${text}\nScales:\n${clip}` : `Scales:\n${clip}`;
      }
    }
  }

  text = tightenMultilineGameText(text);
  const maxLen =
    mode === ABILITY_TOOLTIP_DETAIL.MINIMAL
      ? KIT_ABILITY_TOOLTIP_BODY_MINIMAL_MAX
      : KIT_ABILITY_TOOLTIP_BODY_MAX;
  if (text.length > maxLen) {
    return `${text.slice(0, maxLen)}…`;
  }
  return text || 'No description available.';
}

export function buildKitAspectTooltipBody(aspect, detailLevel = DEFAULT_ABILITY_TOOLTIP_DETAIL, god = null) {
  if (!aspect || typeof aspect !== 'object') return '';
  if (god) {
    const { buildKitTalentTooltipBody } = require('./kitTalentTooltip');
    return buildKitTalentTooltipBody(god, aspect, detailLevel, 0);
  }
  const mode = normalizeDetailLevel(detailLevel);
  const rawName = aspect.name ? String(aspect.name).replace(/\*\*__|__\*\*/g, '') : '';
  const desc = aspect.description ? String(aspect.description).trim() : '';
  let text = rawName && desc ? `${rawName}\n\n${desc}` : rawName || desc;
  const maxLen =
    mode === ABILITY_TOOLTIP_DETAIL.MINIMAL
      ? KIT_ABILITY_TOOLTIP_BODY_MINIMAL_MAX
      : KIT_ABILITY_TOOLTIP_BODY_MAX;
  if (text.length > maxLen) {
    return `${text.slice(0, maxLen)}…`;
  }
  return text || 'No description available.';
}

function extractLeadingNumber(raw) {
  const match = String(raw ?? '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

export function formatIncreaseFromBase(raw, levelIndex) {
  if (levelIndex <= 0) return null;
  const base = getLevelValue(raw, 0);
  const current = getLevelValue(raw, levelIndex);
  const baseNum = extractLeadingNumber(base);
  const currentNum = extractLeadingNumber(current);
  if (!Number.isFinite(baseNum) || !Number.isFinite(currentNum)) return null;
  const delta = currentNum - baseNum;
  const rounded = Math.abs(delta) >= 10 || Number.isInteger(delta) ? Math.round(delta) : Number(delta.toFixed(2));
  return `${rounded >= 0 ? '+' : ''}${rounded}`;
}

export function formatAbilityStatKey(statKey) {
  const raw = String(statKey || '')
    .replace(/_/g, ' ')
    .trim();
  if (!raw) return '';
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** In-game descriptive row: 0/10/30/50/70/90 */
export function formatAbilityStatValueFull(raw) {
  const arr = toLevelValueArray(raw);
  if (!arr.length) return '';
  return arr.map((v) => String(v).trim()).join('/');
}

const MINIMAL_STAT_PATTERNS = [
  'damage scaling',
  'scaling',
  'cooldown',
  'cost',
  'mana',
  'heal',
  'damage',
  'strength',
  'intelligence',
  'buff duration',
  'drunkenness',
];

/** Footer stats for minimal tooltips — key lines only (like in-game short view). */
export function pickMinimalAbilityStatEntries(valueKeys) {
  if (!valueKeys || typeof valueKeys !== 'object') return [];

  const entries = Object.entries(valueKeys).filter(([key]) => {
    if (String(key || '').replace(/\s+/g, '').toLowerCase() === 'radiuscheat') return false;
    return true;
  });

  const picked = [];
  const used = new Set();

  MINIMAL_STAT_PATTERNS.forEach((pattern) => {
    const hit = entries.find(([key]) => {
      if (used.has(key)) return false;
      const label = formatAbilityStatKey(key).toLowerCase();
      return label.includes(pattern);
    });
    if (hit) {
      used.add(hit[0]);
      picked.push(hit);
    }
  });

  if (picked.length > 0) return picked.slice(0, 5);

  return entries.slice(0, 3);
}
