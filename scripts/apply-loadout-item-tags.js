/**
 * Apply starter / curio / relic semantic tags by internalName (user loadout list).
 * Does not touch other items. Run: node scripts/apply-loadout-item-tags.js --write
 */
const { mergeTags, propagateItemTags } = require('./item-tag-shared');
const { loadBuildsWithTags, saveTagsFromSession } = require('./item-tags-io');

const WRITE = process.argv.includes('--write');

const TAG_ALIASES = {
  as: 'Attack Speed',
  attack: 'Attack',
  cd: 'Cooldown Rate',
  int: 'Intelligence',
  a: 'Active',
  farm: 'Farm',
  jungle: 'Jungle',
  immune: 'Immune',
  damage: 'Damage',
  heal: 'Heal',
  recovery: 'Recovery',
  vision: 'Vision',
  buff: 'Buff',
  support: 'Support',
  'anti-cc': 'Anti-CC',
  'speed up': 'Speed Up',
  adaptive: 'Adaptive',
  ability: 'Ability',
  aura: 'Aura',
  teleport: 'Teleport',
  shield: 'Shield',
  dash: 'Dash',
  'cc immunity': 'CC Immunity',
  str: 'Strength',
};

/** internalName → comma-separated shorthand tags */
const LOADOUT_TAGS = {
  Selflessness: 'Support, Anti-CC',
  WarFlag: 'Support, Speed Up',
  LeatherCowl: 'Adaptive, AS',
  BlueStonePendant: 'Adaptive, Ability',
  VampiricShroud: 'Adaptive, Heal',
  BumbasGoldenDagger: 'Adaptive, Jungle',
  BumbasCudgel: 'Adaptive, Jungle',
  ConduitGem: 'Adaptive, Ability',
  SandsOfTime: 'Adaptive, CD',
  DeathsToll: 'Attack, Heal',
  SunderingAxe: 'Adaptive, Damage',
  GildedArrow: 'Attack, Farm',
  HealthPotion: 'Heal',
  ManaPotion: 'Recovery',
  MultiPotion: 'Heal, Recovery',
  VisionWard: 'Vision',
  SentryWard: 'Vision',
  HealthChalice: 'Heal',
  WardingChalice: 'Vision',
  ElixirOfIntelligence: 'Intelligence',
  ElixirOfStrength: 'Strength',
  BifrostShard: 'Vision',
  Gjallarflare: 'Vision',
  HeimdallsSight: 'Vision',
  BattleCry: 'Buff',
  Meditation: 'Heal',
  PurificationBeads: 'CC Immunity',
  BlinkRune: 'Teleport',
  AegisOfAcceleration: 'Immune',
  PhantomShell: 'Shield',
  sunderingArc: 'Damage, Jungle',
  AgilityRelic: 'Dash, Attack',
  TalismanOfPurification: 'CC Immunity, Active',
  TimeLockAegis: 'Immune, Active',
  ShellOfRebuke: 'Shield, Active',
  SunderingEcho: 'Damage, Jungle, Active',
  AgilityGreaves: 'Dash, Attack, Active',
  BlinkingAbyss: 'Teleport, Active',
  HuntersCowl: 'Adaptive, Aura',
  Bow: 'Attack Speed',
  Circlet: 'Mana',
  Medallion: 'Health',
  Rune: 'Descriptor_MagProtection',
  Shield: 'Descriptor_PhysicalProtect',
  Reliquary: 'Mana Regen',
  Sash: 'Heal',
  Ring: 'Cooldown',
  Axe: 'Strength',
  Gem: 'Intelligence',
  Scythe: 'Lifesteal',
  Sabre: 'Critical',
};

function normalizeTag(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;
  const key = t.toLowerCase().replace(/\s+/g, ' ');
  if (TAG_ALIASES[key]) return TAG_ALIASES[key];
  const compact = key.replace(/\s+/g, '');
  if (TAG_ALIASES[compact]) return TAG_ALIASES[compact];
  return t;
}

function parseTags(str) {
  return String(str || '')
    .split(',')
    .map((t) => normalizeTag(t))
    .filter(Boolean);
}

const session = loadBuildsWithTags();
const { builds, tagsFile, tagsMap } = session;
const flat = session.flat.filter((i) => i.internalName);
const byInternal = new Map(flat.map((i) => [i.internalName, i]));

const applied = [];
const missing = [];

Object.entries(LOADOUT_TAGS).forEach(([internalName, tagStr]) => {
  const item = byInternal.get(internalName);
  if (!item) {
    missing.push(internalName);
    return;
  }
  const semantic = parseTags(tagStr);
  const before = [...(item.tags || [])];
  item.tags = mergeTags(item, semantic);
  if (JSON.stringify(before) !== JSON.stringify(item.tags)) {
    applied.push({ name: item.name, internalName, tags: item.tags });
  }
});

console.log(`Loadout tags: ${applied.length} updated, ${missing.length} not in builds.json`);
if (missing.length) {
  console.log('Missing internalNames:');
  missing.forEach((n) => console.log('  -', n));
}
applied.forEach((a) => console.log(`  ${a.name} → ${a.tags.filter((t) => !['Tier1', 'Tier2', 'Tier3', 'Starter', 'Relic', 'Passive', 'Consumable'].includes(t) && !t.startsWith('ItemTier')).join(', ')}`));

const propagated = propagateItemTags(builds);
console.log(`\nPropagated T2/evolved tags: ${propagated.length} items`);
propagated.forEach((line) => console.log(' ', line));

if (WRITE) {
  saveTagsFromSession({ tagsFile, flat: session.flat, tagsMap });
  console.log('\nWrote app/data/StringTables/Items/itemTags.json');
} else {
  console.log('\nDry run — pass --write to save');
}
