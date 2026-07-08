/**
 * Compile Unreal StringTable exports → lib/stringTables.generated.js
 * Run: node scripts/compile-string-tables.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'lib/stringTables.generated.js');
const ITEM_ALIASES_PATH = path.join(ROOT, 'lib/itemStringTableAliases.json');

function loadItemStringTableAliases() {
  if (!fs.existsSync(ITEM_ALIASES_PATH)) return {};
  return JSON.parse(fs.readFileSync(ITEM_ALIASES_PATH, 'utf8'));
}

const SOURCES = {
  itemShortDescriptions: path.join(
    ROOT,
    'app/data/StringTables/Items/ST_HW_Items_ItemDescriptions_Short.json'
  ),
  abilityCompactDescriptions: path.join(
    ROOT,
    'app/data/StringTables/God/ST_HW_God_AbilityCompactDescriptions.json'
  ),
  abilityShortDescriptions: path.join(
    ROOT,
    'app/data/StringTables/God/ST_HW_God_AbilityShortDescriptions.json'
  ),
  abilityDescriptions: path.join(
    ROOT,
    'app/data/StringTables/God/ST_HW_God_AbilityDescriptions.json'
  ),
  godTalents: path.join(ROOT, 'app/data/StringTables/God/ST_HW_God_Talents.json'),
  godSummaries: path.join(ROOT, 'app/data/StringTables/God/ST_HW_God_GodSummary.json'),
  rolePreference: path.join(ROOT, 'app/data/StringTables/RolePreference/ST_HW_RolePreference.json'),
  helpTips: path.join(ROOT, 'app/data/StringTables/HelpTips/ST_HW_HelpTip_Descriptions.json'),
};

function readStringTable(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entry = Array.isArray(raw) ? raw[0] : raw;
  return entry?.StringTable?.KeysToEntries || {};
}

function normLookupKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function buildItemIndex(entries, extraAliases = {}) {
  const byKey = {};
  const byLookup = {};

  Object.entries(entries).forEach(([key, text]) => {
    byKey[key] = text;
    const aliases = new Set([
      key,
      key.toLowerCase(),
      normLookupKey(key),
    ]);
    aliases.forEach((alias) => {
      if (alias && !byLookup[alias]) byLookup[alias] = key;
    });
  });

  Object.entries(extraAliases).forEach(([alias, canonical]) => {
    if (!canonical || !byKey[canonical]) return;
    const keys = [alias, String(alias).toLowerCase(), normLookupKey(alias)];
    keys.forEach((key) => {
      if (key && !byLookup[key]) byLookup[key] = canonical;
    });
  });

  return { byKey, byLookup };
}

function flattenBuildItems(itemsRoot) {
  if (!itemsRoot) return [];
  if (!Array.isArray(itemsRoot)) return [itemsRoot].filter(Boolean);
  return itemsRoot.flat(Infinity).filter((item) => item && typeof item === 'object');
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

function findItemCanonicalKey(entries, item) {
  const entryKeys = Object.keys(entries);
  const candidates = [
    item.internalName,
    item.name,
    String(item.internalName || '').replace(/\s+/g, ''),
    String(item.name || '').replace(/[^a-zA-Z0-9]/g, ''),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const keys = [candidate, candidate.toLowerCase(), normLookupKey(candidate)];
    for (const key of keys) {
      if (entries[key]) return key;
      const match = entryKeys.find((entryKey) => normLookupKey(entryKey) === key);
      if (match) return match;
    }
  }

  if (item.internalName) {
    const starterKey = `Starter.${item.internalName}`;
    if (entries[starterKey]) return starterKey;
  }

  const manualKey = loadItemStringTableAliases()[item.internalName];
  if (manualKey && entries[manualKey]) return manualKey;

  const internalNorm = normLookupKey(item.internalName);
  if (internalNorm.length >= 5) {
    let best = null;
    let bestDist = 2;
    for (const entryKey of entryKeys) {
      const dist = levenshtein(internalNorm, normLookupKey(entryKey));
      if (dist < bestDist) {
        bestDist = dist;
        best = entryKey;
      }
    }
    if (best) return best;
  }

  return null;
}

function buildItemAliasesFromBuilds(entries) {
  const buildsPath = path.join(ROOT, 'app/data/God Information/Builds/builds.json');
  if (!fs.existsSync(buildsPath)) return {};

  const builds = JSON.parse(fs.readFileSync(buildsPath, 'utf8'));
  const aliases = {};
  const items = flattenBuildItems(builds.items);

  items.forEach((item) => {
    const canonical = findItemCanonicalKey(entries, item);
    if (!canonical) return;
    [item.internalName, item.name].filter(Boolean).forEach((alias) => {
      aliases[alias] = canonical;
    });
  });

  Object.entries(loadItemStringTableAliases()).forEach(([alias, canonical]) => {
    if (canonical && entries[canonical] && !aliases[alias]) {
      aliases[alias] = canonical;
    }
  });

  return aliases;
}

function buildAbilityDescriptionIndex(entries) {
  const byKey = {};
  const byLookup = {};

  Object.entries(entries).forEach(([key, text]) => {
    if (typeof text !== 'string' || !text.trim() || text.trim() === 'NA') return;
    byKey[key] = text;
    const norm = normLookupKey(key);
    if (!byLookup[norm]) byLookup[norm] = key;
  });

  return { byKey, byLookup };
}

function buildAbilityIndex(entries) {
  const byKey = {};
  const byLookup = {};

  Object.entries(entries).forEach(([compoundKey, text]) => {
    byKey[compoundKey] = text;
    const dot = compoundKey.indexOf('.');
    if (dot < 0) return;
    const godPart = compoundKey.slice(0, dot);
    const abilityPart = compoundKey.slice(dot + 1);
    const lookup = `${normLookupKey(godPart)}|${normLookupKey(abilityPart)}`;
    if (!byLookup[lookup]) byLookup[lookup] = compoundKey;
  });

  return { byKey, byLookup };
}

function stripGodPrefix(entries) {
  const out = {};
  Object.entries(entries).forEach(([key, text]) => {
    const short = key.startsWith('God.') ? key.slice(4) : key;
    out[short] = text;
    out[normLookupKey(short)] = text;
  });
  return out;
}

const itemEntries = readStringTable(SOURCES.itemShortDescriptions);
const abilityEntries = readStringTable(SOURCES.abilityCompactDescriptions);
const abilityShortEntries = readStringTable(SOURCES.abilityShortDescriptions);
const abilityDescriptionEntries = readStringTable(SOURCES.abilityDescriptions);
const godTalentEntries = readStringTable(SOURCES.godTalents);
const godSummaryEntries = readStringTable(SOURCES.godSummaries);
const rolePreferenceEntries = readStringTable(SOURCES.rolePreference);
const helpTipEntries = readStringTable(SOURCES.helpTips);

const itemIndex = buildItemIndex(itemEntries, buildItemAliasesFromBuilds(itemEntries));
const abilityIndex = buildAbilityIndex(abilityEntries);
const abilityDescriptionIndex = buildAbilityDescriptionIndex(abilityDescriptionEntries);
const godSummaries = stripGodPrefix(godSummaryEntries);

const payload = {
  itemShortDescriptions: itemIndex.byKey,
  itemShortDescriptionLookup: itemIndex.byLookup,
  abilityCompactDescriptions: abilityIndex.byKey,
  abilityCompactDescriptionLookup: abilityIndex.byLookup,
  abilityDescriptions: abilityDescriptionIndex.byKey,
  abilityDescriptionLookup: abilityDescriptionIndex.byLookup,
  godTalents: godTalentEntries,
  abilityShortDescriptions: abilityShortEntries,
  godSummaries,
  rolePreference: rolePreferenceEntries,
  helpTips: helpTipEntries,
};

const banner = `/** AUTO-GENERATED by scripts/compile-string-tables.js — do not edit */\n`;

const body = `${banner}export const STRING_TABLES = ${JSON.stringify(payload, null, 2)};\n`;

fs.writeFileSync(OUT_PATH, body, 'utf8');

console.log('Wrote', OUT_PATH);
console.log('  items:', Object.keys(itemIndex.byKey).length);
console.log('  ability compact:', Object.keys(abilityIndex.byKey).length);
console.log('  ability descriptions:', Object.keys(abilityDescriptionIndex.byKey).length);
console.log('  god talents:', Object.keys(godTalentEntries).length);
console.log('  ability short tokens:', Object.keys(abilityShortEntries).length);
console.log('  god summaries:', Object.keys(godSummaryEntries).length);
console.log('  role preference:', Object.keys(rolePreferenceEntries).length);
console.log('  help tips:', Object.keys(helpTipEntries).length);
