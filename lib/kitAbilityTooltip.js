import { tightenMultilineGameText } from './alignedBulletText';

export const KIT_ABILITY_TOOLTIP_BODY_MAX = 520;
export const KIT_TOOLTIP_LEVELS = [1, 2, 3, 4, 5];
export const KIT_TOOLTIP_CARD_WIDTH = 340;
export const KIT_TOOLTIP_CARD_HEIGHT = 430;

export function buildKitAbilityTooltipBody(ability) {
  if (!ability || typeof ability !== 'object') return '';
  const desc = ability.shortDesc || ability.description || '';
  let text = String(desc).trim();
  if (ability.scales) {
    const scales = String(ability.scales).trim();
    if (scales) {
      const clip = scales.length > 160 ? `${scales.slice(0, 160)}…` : scales;
      text = text ? `${text}\nScales:\n${clip}` : `Scales:\n${clip}`;
    }
  }
  text = tightenMultilineGameText(text);
  if (text.length > KIT_ABILITY_TOOLTIP_BODY_MAX) {
    return `${text.slice(0, KIT_ABILITY_TOOLTIP_BODY_MAX)}…`;
  }
  return text || 'No description available.';
}

export function buildKitAspectTooltipBody(aspect) {
  if (!aspect || typeof aspect !== 'object') return '';
  const rawName = aspect.name ? String(aspect.name).replace(/\*\*__|__\*\*/g, '') : '';
  const desc = aspect.description ? String(aspect.description).trim() : '';
  let text = rawName && desc ? `${rawName}\n\n${desc}` : rawName || desc;
  if (text.length > KIT_ABILITY_TOOLTIP_BODY_MAX) {
    return `${text.slice(0, KIT_ABILITY_TOOLTIP_BODY_MAX)}…`;
  }
  return text || 'No description available.';
}

function toLevelValueArray(raw) {
  if (Array.isArray(raw)) return raw.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (raw === null || raw === undefined) return [];
  const text = String(raw).trim();
  if (!text) return [];
  if (text.includes('/')) {
    return text
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [raw];
}

export function getLevelValue(raw, levelIndex) {
  const arr = toLevelValueArray(raw);
  if (arr.length === 0) return null;
  const idx = Math.max(0, Math.min(levelIndex, arr.length - 1));
  return arr[idx];
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
