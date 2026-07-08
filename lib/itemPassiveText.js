import { BUILD_STAT_DISPLAY_NAMES, getBuildStatColor } from './buildStats';
import { getAbilityEffectColor, getEffectTokenPatterns, splitEffectTokenText } from './abilityEffectTokens';
import { mergeOrphanPunctuation } from './abilityDescriptionText';
import { UI_THEME } from './uiTheme';

let cachedItemPatterns = null;

function buildItemPassivePatterns() {
  const seen = new Set();
  const patterns = [];

  const add = (key, label, color) => {
    const norm = String(label || '').toLowerCase();
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    patterns.push({ key, label, color });
  };

  Object.entries(BUILD_STAT_DISPLAY_NAMES).forEach(([key, label]) => {
    const color = getBuildStatColor(key, label);
    add(key, label, color);
    if (!label.endsWith('s')) add(key, `${label}s`, color);
  });

  add('PhysicalProtections', 'Physical Protections', getBuildStatColor('PhysicalProtection', 'Physical Protection'));
  add('MagicalProtections', 'Magical Protections', getBuildStatColor('MagicalProtection', 'Magical Protection'));
  add('OnUse', 'On Use', '#a78bfa');
  add('FromItems', 'from Items', '#fb923c');
  add('Cooldown', 'Cooldown', '#38bdf8');
  add('ActiveItem', 'active items', '#94a3b8');
  add('Switch', 'Switch', '#22d3ee');
  add('Toggle', 'toggle', '#cbd5e1');
  add('Protections', 'Protections', '#38bdf8');
  add('Protection', 'Protection', '#38bdf8');
  add('Bonus', 'bonus', '#cbd5e1');

  getEffectTokenPatterns().forEach((pattern) => {
    add(
      pattern.key,
      pattern.label,
      pattern.color || getAbilityEffectColor(pattern.key, pattern.label)
    );
  });

  patterns.sort((a, b) => b.label.length - a.label.length);
  return patterns;
}

function getItemPassivePatterns() {
  if (!cachedItemPatterns) cachedItemPatterns = buildItemPassivePatterns();
  return cachedItemPatterns;
}

/** Normalize spacing in passive footer lines (Cooldown:30s → Cooldown: 30s). */
export function normalizeItemPassiveLine(text) {
  return String(text || '')
    .replace(/Cooldown:(\s*)(\d)/gi, 'Cooldown: $2')
    .replace(/On Use:(?!\s)/gi, 'On Use: ')
    .trim();
}

function tryItemPassiveSpecialAt(raw, pos) {
  const slice = raw.slice(pos);

  const delta = slice.match(/^(\+\d+(?:\.\d+)?%)/);
  if (delta) {
    return {
      text: delta[1],
      length: delta[1].length,
      key: 'StatDelta',
      color: UI_THEME.statDelta,
    };
  }

  const pct = slice.match(/^(\d+(?:\.\d+)?%)/);
  if (pct) {
    return {
      text: pct[1],
      length: pct[1].length,
      key: 'Percent',
      color: UI_THEME.statDelta,
    };
  }

  const duration = slice.match(/^(\d+(?:\.\d+)?s\b)/i);
  if (duration) {
    return {
      text: duration[1],
      length: duration[1].length,
      key: 'Duration',
      color: '#38bdf8',
    };
  }

  return null;
}

/**
 * Color segments for item passive / active copy — stat names, deltas, cooldown, ability tokens.
 * @returns {{ type: 'text'|'token', text: string, color?: string }[]}
 */
export function splitItemPassiveText(raw) {
  const text = normalizeItemPassiveLine(raw);
  if (!text) return [];

  const patterns = getItemPassivePatterns();
  const segments = splitEffectTokenText(text, {
    patterns,
    trySpecialAt: tryItemPassiveSpecialAt,
  });

  return mergeOrphanPunctuation(
    segments.map((seg) =>
      seg.type === 'token'
        ? { type: 'token', text: seg.text, color: seg.color }
        : { type: 'text', text: seg.text }
    )
  );
}
