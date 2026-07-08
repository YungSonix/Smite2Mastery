import { STRING_TABLES } from './stringTables.generated';
import { ABILITY_TOOLTIP_DETAIL } from './abilityTooltipDetail';
import { normalizeKeywordTaggedDescription } from './abilityDescriptionText';
import { applyAbilityLevelValues } from './abilityValueKeys';
import ITEM_STRING_TABLE_ALIASES from './itemStringTableAliases.json';

const {
  itemShortDescriptions,
  itemShortDescriptionLookup,
  abilityCompactDescriptions,
  abilityCompactDescriptionLookup,
  abilityDescriptions,
  abilityDescriptionLookup,
  godTalents,
} = STRING_TABLES;

export function cleanStringTableText(text) {
  return String(text || '')
    .replace(/<highlight>/gi, '')
    .replace(/<\/highlight>/gi, '')
    .replace(/<Highlight>/g, '')
    .replace(/\[KEY\]\s*/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function normLookupKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[b.length];
}

function fuzzyItemCanonicalKey(internalName) {
  const target = normLookupKey(internalName);
  if (target.length < 5) return null;
  let best = null;
  let bestDist = 2;
  for (const entryKey of Object.keys(itemShortDescriptions)) {
    const dist = levenshtein(target, normLookupKey(entryKey));
    if (dist < bestDist) {
      bestDist = dist;
      best = entryKey;
    }
  }
  return best;
}

function resolveItemDescriptionByKey(key) {
  if (!key) return null;
  const canonical = itemShortDescriptionLookup[key] || key;
  const text = itemShortDescriptions[canonical];
  return text ? cleanStringTableText(text) : null;
}

/** Resolve item subtitle from internalName / name aliases. */
export function getItemShortDescription(item) {
  if (!item) return null;

  const candidates = [
    item.internalName,
    item.name,
    String(item.internalName || '').replace(/\s+/g, ''),
    String(item.name || '').replace(/[^a-zA-Z0-9]/g, ''),
  ].filter(Boolean);

  const seen = new Set();
  for (const candidate of candidates) {
    const keys = [candidate, candidate.toLowerCase(), normLookupKey(candidate)];
    for (const key of keys) {
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const text = resolveItemDescriptionByKey(key);
      if (text) return text;
    }
  }

  if (item.internalName) {
    const starterText = resolveItemDescriptionByKey(`Starter.${item.internalName}`);
    if (starterText) return starterText;
  }

  const manualKey = ITEM_STRING_TABLE_ALIASES[item.internalName];
  if (manualKey) {
    const manualText = resolveItemDescriptionByKey(manualKey);
    if (manualText) return manualText;
  }

  const fuzzy = fuzzyItemCanonicalKey(item.internalName);
  if (fuzzy && itemShortDescriptions[fuzzy]) {
    return cleanStringTableText(itemShortDescriptions[fuzzy]);
  }

  return null;
}

function truncateItemPassive(text, maxLen = 360) {
  const cleaned = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLen) return cleaned;
  const slice = cleaned.slice(0, maxLen);
  const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '));
  if (lastBreak > maxLen * 0.45) {
    return `${slice.slice(0, lastBreak + (slice[lastBreak] === '.' ? 1 : 0)).trim()}…`;
  }
  return `${slice.trim()}…`;
}

/** One-line or short passive for minimal item tooltips — string table first, else trimmed passive. */
export function getItemMinimalDescription(item) {
  if (!item) return null;
  const fromTable = getItemShortDescription(item);
  if (fromTable) return fromTable;
  return truncateItemPassive(item.passive);
}

/** Descriptive item tooltip — minimal summary plus full passive when different. */
export function getItemDescriptiveDescription(item) {
  if (!item) return null;
  const minimal = getItemMinimalDescription(item);
  const full = String(item.passive || '').trim();
  if (!full) return minimal;
  if (!minimal || minimal === full || full.startsWith(minimal)) return full;
  return `${minimal}\n\n${full}`;
}

function normalizeGodKey(raw) {
  let key = String(raw || '').trim();
  if (!key) return null;
  if (/^god\./i.test(key)) {
    key = key.slice(key.indexOf('.') + 1);
  }
  key = key.replace(/_Item$/i, '').trim();
  return key || null;
}

export function resolveGodKey(god, ability) {
  if (god?.key) {
    const fromKey = normalizeGodKey(god.key);
    if (fromKey) return fromKey;
  }
  if (god?.internalName) {
    const fromInternal = normalizeGodKey(god.internalName);
    if (fromInternal) return fromInternal;
  }
  if (god?.name) {
    const fromName = String(god.name).replace(/[^a-zA-Z0-9]/g, '');
    if (fromName) return fromName;
  }
  const abilityKey = ability?.key;
  if (typeof abilityKey === 'string' && abilityKey.includes('.')) {
    return normalizeGodKey(abilityKey.split('.')[0]);
  }
  return null;
}

function lookupAbilityCompact(godKeyNorm, abilityNameNorm) {
  if (!godKeyNorm || !abilityNameNorm) return null;
  const compoundKey = abilityCompactDescriptionLookup[`${godKeyNorm}|${abilityNameNorm}`];
  if (!compoundKey) return null;
  const text = abilityCompactDescriptions[compoundKey];
  return text ? cleanStringTableText(text) : null;
}

/** Ability slot from kit key (A01, PSV, Basic.RangedMag, …). */
export function extractAbilitySlot(ability) {
  if (ability?.abilitySlot) return String(ability.abilitySlot).trim();
  const key = String(ability?.key || '').trim();
  if (!key) return null;
  const dotted = key.match(/^[^.]+\.(.+?)\.(?:InGame|OutOfGame)(?:\.|$)/i);
  if (dotted) return dotted[1];
  if (/^(A0[1-4]|PSV)$/i.test(key)) return key.toUpperCase();
  if (/^basic(?:\.[A-Za-z0-9]+)?$/i.test(key)) return key;
  return null;
}

/** Match string-table prefix (e.g. Agni.A01) from god context + slot — ignores wrong ability.key god. */
export function findDescriptionPrefixForGodSlot(god, slot) {
  const slotNorm = normLookupKey(slot);
  if (!slotNorm) return null;

  const godCandidates = new Set();
  const primary = resolveGodKey(god, null);
  if (primary) godCandidates.add(normLookupKey(primary));
  if (god?.name) godCandidates.add(normLookupKey(String(god.name).replace(/[^a-zA-Z0-9]/g, '')));
  if (god?.internalName) godCandidates.add(normLookupKey(god.internalName));

  for (const fullKey of Object.keys(abilityDescriptions)) {
    if (typeof abilityDescriptions[fullKey] !== 'string') continue;
    const parts = fullKey.split('.');
    if (parts.length < 3) continue;
    const keyGod = parts[0];
    const keySlot = parts[1];
    if (normLookupKey(keySlot) !== slotNorm) continue;
    if (!godCandidates.has(normLookupKey(keyGod))) continue;
    return `${keyGod}.${keySlot}`;
  }
  return null;
}

/** Prefix for ST_HW_God_AbilityDescriptions (god + slot, not spoofable ability.key). */
export function resolveAbilityDescriptionPrefix(ability, god, options = {}) {
  const { useTalent = false, forceTalent = false, talentIndex = null } = options;

  const slot = extractAbilitySlot(ability);
  if (useTalent || forceTalent) {
    const talentPrefix = findTalentDescriptionPrefix(god, slot, talentIndex, { force: forceTalent });
    if (talentPrefix) return talentPrefix;
    if (forceTalent) return null;
  }

  if (god && slot) {
    const fromGod = findDescriptionPrefixForGodSlot(god, slot);
    if (fromGod) return fromGod;
  }

  const key = String(ability?.key || '').trim();
  if (!key) return null;
  const inGame = key.match(/^(.+)\.InGame\./i);
  if (inGame) {
    const prefix = inGame[1];
    const keyGodNorm = normLookupKey(prefix.split('.')[0]);
    const godNorm = normLookupKey(resolveGodKey(god, ability) || '');
    if (!godNorm || keyGodNorm === godNorm) return prefix;
  }
  const outGame = key.match(/^(.+)\.OutOfGame(?:\.|$)/i);
  if (outGame) {
    const prefix = outGame[1];
    const keyGodNorm = normLookupKey(prefix.split('.')[0]);
    const godNorm = normLookupKey(resolveGodKey(god, ability) || '');
    if (!godNorm || keyGodNorm === godNorm) return prefix;
  }
  return null;
}

function talentTableSlot(slot) {
  const normalized = String(slot || '').trim();
  if (!normalized) return null;
  if (/^basic/i.test(normalized)) return 'Basic';
  return normalized.toUpperCase();
}

/** e.g. Achilles.Talent.1.A02 from god + slot + lineup index */
export function findTalentDescriptionPrefix(god, slot, talentIndex = null, { force = false } = {}) {
  const godKey = resolveGodKey(god, null);
  const tableSlot = talentTableSlot(slot);
  if (!godKey || !tableSlot) return null;

  let index = talentIndex;
  if (index == null) {
    try {
      const { getGodTalentLineup } = require('./godTalentLineups');
      index = getGodTalentLineup(god)?.talentIndex ?? 1;
    } catch {
      index = 1;
    }
  }

  const prefix = `${godKey}.Talent.${index}.${tableSlot}`;
  if (
    findAbilityDescriptionKey(`${prefix}.OutOfGame.Short`) ||
    findAbilityDescriptionKey(`${prefix}.InGame.Short`)
  ) {
    return prefix;
  }
  return null;
}

/** Name + summary from ST_HW_God_Talents.json (e.g. Achilles01Name / Achilles01Desc). */
export function getGodTalentInfo(god, talentIndex = null) {
  const godKey = resolveGodKey(god, null);
  if (!godKey || !godTalents) return null;

  let index = talentIndex;
  if (index == null) {
    try {
      const { getGodTalentLineup } = require('./godTalentLineups');
      index = getGodTalentLineup(god)?.talentIndex ?? 1;
    } catch {
      index = 1;
    }
  }

  const padded = String(index).padStart(2, '0');
  const candidates = [`${godKey}${padded}`, godKey];
  for (const base of candidates) {
    const name = godTalents[`${base}Name`];
    const description = godTalents[`${base}Desc`];
    if (name || description) {
      return {
        name: name ? cleanStringTableText(name) : null,
        description: description ? cleanStringTableText(description) : null,
        talentIndex: index,
      };
    }
  }

  return null;
}

function longEntrySortKey(fullKey, prefix) {
  const tail = fullKey.slice(prefix.length + 1);
  if (tail === 'InGame.Long') return [0, 0, ''];
  let m = tail.match(/^InGame\.Long(\d+)$/);
  if (m) return [1, parseInt(m[1], 10), ''];
  m = tail.match(/^InGame\.Long\.(\d+)$/);
  if (m) return [2, parseInt(m[1], 10), ''];
  m = tail.match(/^InGame\.Long\.(.+)$/);
  if (m) return [3, 0, m[1]];
  return null;
}

function findAbilityDescriptionKey(compoundKey) {
  if (!compoundKey) return null;
  if (abilityDescriptions[compoundKey]) return compoundKey;
  const norm = normLookupKey(compoundKey);
  return abilityDescriptionLookup[norm] || null;
}

function readAbilityDescriptionEntry(compoundKey, ability = null, levelIndex = 0) {
  const canonical = findAbilityDescriptionKey(compoundKey);
  if (!canonical) return null;
  let raw = abilityDescriptions[canonical];
  if (!raw || String(raw).trim() === 'NA') return null;
  if (ability?.valueKeys) {
    raw = applyAbilityLevelValues(raw, ability, levelIndex);
  }
  return normalizeKeywordTaggedDescription(raw);
}

function readShortDescriptionEntry(prefix, ability = null, levelIndex = 0) {
  const candidates = [
    `${prefix}.InGame.Short`,
    `${prefix}.OutOfGame.Short`,
    `${prefix}.OutOfGame`,
  ];
  for (const compoundKey of candidates) {
    const hit = readAbilityDescriptionEntry(compoundKey, ability, levelIndex);
    if (hit) return hit;
  }
  return null;
}

function readLongDescriptionParts(prefix, ability = null, levelIndex = 0) {
  if (!prefix) return [];
  const prefixDot = `${prefix}.`;
  return Object.keys(abilityDescriptions)
    .filter((k) => {
      if (!k.startsWith(prefixDot) || typeof abilityDescriptions[k] !== 'string') return false;
      return longEntrySortKey(k, prefix) != null;
    })
    .sort((a, b) => {
      const ra = longEntrySortKey(a, prefix);
      const rb = longEntrySortKey(b, prefix);
      if (ra[0] !== rb[0]) return ra[0] - rb[0];
      if (ra[1] !== rb[1]) return ra[1] - rb[1];
      return String(ra[2]).localeCompare(String(rb[2]));
    })
    .map((k) => readAbilityDescriptionEntry(k, ability, levelIndex))
    .filter(Boolean);
}

function dedupeDescriptionParts(parts) {
  const out = [];
  const seen = new Set();
  parts.forEach((part) => {
    const text = String(part || '').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push(text);
  });
  return out;
}

function formatLongPartBullet(part) {
  const text = String(part || '').trim();
  if (!text) return '';
  if (/^[\u2022•]\s/.test(text)) return text;
  if (/^-\s+/.test(text)) return `• ${text.slice(1).trimStart()}`;
  return `• ${text}`;
}

/**
 * Tooltip body from ST_HW_God_AbilityDescriptions:
 * - Minimal → InGame.Short (formula-free keywords), else OutOfGame.Short
 * - Descriptive → same short block, then InGame.Long* lines as extra bullets
 */
export function getAbilityTooltipDescription(god, ability, detailLevel, levelIndex = 0, options = {}) {
  if (!ability || typeof ability !== 'object') return null;

  const { buildUsesTalent = false } = options;
  let prefixOptions = { ...options };

  if (buildUsesTalent) {
    const slot = extractAbilitySlot(ability);
    const { shouldUseTalentAbilityCopy } = require('./godTalentLineups');
    if (shouldUseTalentAbilityCopy(god, slot, true)) {
      prefixOptions = { ...prefixOptions, useTalent: true };
    }
  }

  const prefix = resolveAbilityDescriptionPrefix(ability, god, prefixOptions);
  if (!prefix) return null;

  const isMinimal = detailLevel === ABILITY_TOOLTIP_DETAIL.MINIMAL;
  const short = readShortDescriptionEntry(prefix, ability, levelIndex);

  if (isMinimal) {
    return short;
  }

  const parts = dedupeDescriptionParts([
    short,
    ...readLongDescriptionParts(prefix, ability, levelIndex),
  ]);

  if (!parts.length) return null;

  if (parts.length === 1) return parts[0];

  const [head, ...longParts] = parts;
  if (!longParts.length) return head;
  return `${head}\n\n${longParts.map(formatLongPartBullet).join('\n')}`;
}

/** Compact ability line above full description in kit tooltips. */
export function getAbilityCompactSubtitle(god, ability) {
  if (!ability || typeof ability !== 'object') return null;

  const godKey = resolveGodKey(god, ability);
  const abilityNames = [
    ability.name,
    ability.passive?.name,
    ability.title,
  ].filter(Boolean);

  if (!godKey || !abilityNames.length) return null;

  const godKeyNorm = normLookupKey(godKey);
  for (const abilityName of abilityNames) {
    const hit = lookupAbilityCompact(godKeyNorm, normLookupKey(abilityName));
    if (hit) return hit;
  }

  // Aspect kits: compact keys use "God-AspectofX.AbilityName"
  const aspectPrefix = `${godKeyNorm}aspectof`;
  for (const abilityName of abilityNames) {
    const abilityNorm = normLookupKey(abilityName);
    for (const [lookupKey, compoundKey] of Object.entries(abilityCompactDescriptionLookup)) {
      const pipe = lookupKey.indexOf('|');
      if (pipe < 0) continue;
      const lookupGod = lookupKey.slice(0, pipe);
      const lookupAbility = lookupKey.slice(pipe + 1);
      if (!lookupGod.startsWith(aspectPrefix) || lookupAbility !== abilityNorm) continue;
      const text = abilityCompactDescriptions[compoundKey];
      if (text) return cleanStringTableText(text);
    }
  }

  return null;
}
