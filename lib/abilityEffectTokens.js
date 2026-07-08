import { STRING_TABLES } from './stringTables.generated';
import { getBuildStatColor } from './buildStats';

const { abilityShortDescriptions = {} } = STRING_TABLES;

/** In-game tooltip phrases (checked before single-word effect tokens). */
const GAME_PHRASES = [
  { key: 'PhysicalDamage', label: 'Physical Damage', color: '#fda4af' },
  { key: 'MagicalDamage', label: 'Magical Damage', color: '#e879f9' },
  { key: 'TrueDamage', label: 'True Damage', color: '#f87171' },
  { key: 'AttackDamage', label: 'Attack Damage', color: '#fda4af' },
  { key: 'AbilityDamage', label: 'Ability Damage', color: '#e879f9' },
  { key: 'BonusStunDuration', label: 'Bonus Stun Duration', color: '#86efac' },
  { key: 'BonusDamageScaling', label: 'Bonus Damage Scaling', color: '#fb923c' },
  { key: 'DamageScaling', label: 'Damage Scaling', color: '#fda4af' },
  { key: 'StunDuration', label: 'Stun Duration', color: '#f472b6' },
  { key: 'AntiHeal', label: 'Anti-Heal', color: '#f43f5e' },
  { key: 'SpeedUp', label: 'Speed Up', color: '#a78bfa' },
  { key: 'CrowdControl', label: 'Crowd Control', color: '#fb7185' },
  { key: 'Armored', label: 'Armored', color: '#86efac' },
  { key: 'Armor', label: 'Armor', color: '#fdba74' },
];

const INFLECTION_SUFFIX = /^(ning|ned|ing|ed|es|s|d|er|ers|ly)$/;

function isWordBoundaryBefore(raw, pos) {
  return pos <= 0 || !/[A-Za-z']/.test(raw[pos - 1]);
}

function isWordBoundaryAfter(raw, pos, length) {
  const end = pos + length;
  return end >= raw.length || !/[A-Za-z']/.test(raw[end]);
}

let cachedPatterns = null;

/** Ability + phrase effect patterns (longest label first). */
export function getEffectTokenPatterns() {
  return buildPatterns();
}

function buildPatterns() {
  if (cachedPatterns) return cachedPatterns;

  const seen = new Set();
  const patterns = [];

  GAME_PHRASES.forEach((phrase) => {
    patterns.push({ ...phrase, source: 'phrase' });
    seen.add(phrase.label.toLowerCase());
  });

  Object.entries(abilityShortDescriptions).forEach(([key, label]) => {
    const display = String(label || key).trim();
    if (!display) return;
    const norm = display.toLowerCase();
    if (seen.has(norm)) return;
    seen.add(norm);
    patterns.push({ key, label: display, source: 'effect' });
  });

  patterns.sort((a, b) => b.label.length - a.label.length);
  cachedPatterns = patterns;
  return patterns;
}

export function expandTokenAt(raw, pos, pattern) {
  const slice = raw.slice(pos);
  const label = pattern.label;

  if (!isWordBoundaryBefore(raw, pos)) return null;

  if (label.includes(' ') || label.includes('-')) {
    if (slice.toLowerCase().startsWith(label.toLowerCase())) {
      if (!isWordBoundaryAfter(raw, pos, label.length)) return null;
      return {
        text: raw.slice(pos, pos + label.length),
        length: label.length,
        key: pattern.key,
        color: pattern.color || getAbilityEffectColor(pattern.key, label),
      };
    }
    return null;
  }

  const wordMatch = slice.match(/^[A-Za-z][A-Za-z']*/);
  if (!wordMatch) return null;

  const word = wordMatch[0];
  const labelLower = label.toLowerCase();
  const wordLower = word.toLowerCase();

  if (wordLower === labelLower) {
    if (!isWordBoundaryAfter(raw, pos, word.length)) return null;
    return {
      text: word,
      length: word.length,
      key: pattern.key,
      color: pattern.color || getAbilityEffectColor(pattern.key, label),
    };
  }

  if (wordLower.startsWith(labelLower)) {
    const suffix = wordLower.slice(labelLower.length);
    if (!suffix || INFLECTION_SUFFIX.test(suffix)) {
      if (!isWordBoundaryAfter(raw, pos, word.length)) return null;
      return {
        text: word,
        length: word.length,
        key: pattern.key,
        color: pattern.color || getAbilityEffectColor(pattern.key, label),
      };
    }
  }

  return null;
}

/** Color for CC / damage / heal tokens from ST_HW_God_AbilityShortDescriptions. */
export function getAbilityEffectColor(tokenKey, label) {
  const phrase = GAME_PHRASES.find(
    (p) => p.key === tokenKey || p.label.toLowerCase() === String(label || '').toLowerCase()
  );
  if (phrase?.color) return phrase.color;

  const statColor = getBuildStatColor(tokenKey, label);
  if (statColor !== '#94a3b8') return statColor;

  const lower = String(label || '').toLowerCase();
  const keyLower = String(tokenKey || '').toLowerCase();

  if (/cooldown/.test(lower) || keyLower === 'cooldown') return '#38bdf8';
  if (/anti-?heal/.test(lower)) return '#f43f5e';
  if (/heal|resurrect/.test(lower)) return '#4ade80';
  if (/shield|protect/.test(lower)) return '#38bdf8';
  if (/armor/.test(lower) && !/armored/.test(lower)) return '#fdba74';
  if (/armored/.test(lower)) return '#86efac';

  if (
    /stun|slow|silence|root|fear|cripple|disarm|taunt|mezmer|mesmer|knockup|knockback|grab|polymorph|blind|tremble/.test(
      lower
    )
  ) {
    return '#f472b6';
  }

  if (/immune/.test(lower)) return '#34d399';
  if (/dash|leap|teleport|mobility|flight|mount|charge|snipe|throw/.test(lower)) return '#22d3ee';
  if (/damage|execute|zone/.test(lower)) return '#fda4af';
  if (/buff|speed up|\bstance\b|transform|clone|summon|tether|utility/.test(lower)) return '#a78bfa';
  if (/debuff|pull|push/.test(lower)) return '#c084fc';
  if (/stealth/.test(lower)) return '#94a3b8';
  if (/strength/.test(lower)) return '#facc15';
  if (/intelligence/.test(lower)) return '#c084fc';

  return '#7dd3fc';
}

/** In-game stat label colors for ability valueKeys rows. */
export function getAbilityStatColor(statKey, label) {
  const lower = String(label || '').toLowerCase();
  const keyLower = String(statKey || '').toLowerCase();

  if (/bonus.*stun|stun.*bonus/.test(lower)) return '#86efac';
  if (/stun/.test(lower) || keyLower.includes('stun')) return '#f472b6';
  if (/bonus.*scaling|bonus.*damage/.test(lower)) return '#fb923c';
  if (/damage.*scaling|scaling/.test(lower)) return '#fda4af';
  if (/damage/.test(lower) || keyLower.includes('damage')) return '#fda4af';
  if (/cooldown/.test(lower) || keyLower.includes('cooldown')) return '#38bdf8';
  if (/cost|mana/.test(lower) || keyLower.includes('cost') || keyLower.includes('mana')) {
    return '#fbbf24';
  }
  if (/radius|cone|angle|range/.test(lower)) return '#fbbf24';
  if (/heal/.test(lower)) return '#4ade80';
  if (/armored/.test(lower)) return '#86efac';
  if (/armor/.test(lower)) return '#fdba74';

  return getBuildStatColor(statKey, label);
}

/**
 * Split copy into plain text + colored effect tokens (longest match first).
 * @param {string} text
 * @param {{ patterns?: object[], trySpecialAt?: (raw: string, pos: number) => object|null }} [options]
 * @returns {{ type: 'text'|'token', text: string, key?: string, color?: string }[]}
 */
export function splitEffectTokenText(text, options = {}) {
  const raw = String(text || '');
  if (!raw) return [];

  const patterns = options.patterns ?? buildPatterns();
  const trySpecialAt = options.trySpecialAt;
  const segments = [];
  let pos = 0;

  while (pos < raw.length) {
    let best = trySpecialAt ? trySpecialAt(raw, pos) : null;

    if (!best) {
      for (const pattern of patterns) {
        const hit = expandTokenAt(raw, pos, pattern);
        if (!hit) continue;
        if (!best || hit.length > best.length) {
          best = hit;
        }
      }
    }

    if (best) {
      segments.push({
        type: 'token',
        text: best.text,
        key: best.key,
        color: best.color,
      });
      pos += best.length;
      continue;
    }

    let nextPos = raw.length;
    for (const pattern of patterns) {
      for (let scan = pos + 1; scan < raw.length; scan += 1) {
        if (expandTokenAt(raw, scan, pattern)) {
          if (scan < nextPos) nextPos = scan;
          break;
        }
      }
    }
    if (trySpecialAt) {
      for (let scan = pos + 1; scan < raw.length; scan += 1) {
        if (trySpecialAt(raw, scan)) {
          if (scan < nextPos) nextPos = scan;
          break;
        }
      }
    }

    if (nextPos > pos) {
      segments.push({ type: 'text', text: raw.slice(pos, nextPos) });
      pos = nextPos;
    } else {
      segments.push({ type: 'text', text: raw[pos] });
      pos += 1;
    }
  }

  return segments;
}

/** Split ability copy using default ST effect patterns. */
export function splitAbilityEffectText(text) {
  return splitEffectTokenText(text);
}

/** Unique effect tokens found in a line (for compact chip rows). */
export function extractAbilityEffectTokens(text) {
  return splitAbilityEffectText(text).filter((seg) => seg.type === 'token');
}
