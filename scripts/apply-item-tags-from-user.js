/**
 * Apply in-game item tags (full display names in itemTags.json).
 * TAG_ALIASES below is ONLY for parsing your shorthand in ITEM_TAG_ENTRIES —
 * the app always stores full labels like "Magical Protection", not "MP".
 */
const WRITE = process.argv.includes('--write');
const NOTEPAD_ONLY = process.argv.includes('--notepad-only');

const { STRUCTURAL_TAGS, mergeTags, stripSemanticTags, propagateItemTags } = require('./item-tag-shared');
const { loadBuildsWithTags, saveTagsFromSession } = require('./item-tags-io');

/** name fragment → semantic tags (user legend applied) */
const ITEM_TAG_ENTRIES = `
Bow|Attack Speed
Circlet|Mana
Medallion|Health
Rune|Magical Protection
Shield|Physical Protection
Reliquary|Mana
Sash|Heal
Ring|Cooldown Rate
Axe|Strength
Gem|Intelligence
Scythe|Lifesteal
Sabre|Critical
Mana Tome|Mana
Adroit Ring|Cooldown Rate
Olmec Blue|Health
Hunter's Bow|Attack Speed
Legionnaire Armor|Physical Protection
Circle of Protection|Magical Protection
Bowl Drum|Echo
Engraved Guard|Omni-Protect
Captain's Ring|Physical Protection,Cooldown Rate
Sage's Ring|Cooldown Rate,Magical Protection
Veve Charm|Health
Odigba|Health,Heal
Cleric's Cloak|Tenacity
Medal of Defense|Physical Protection,Health
Medal of Disruption|Magical Protection,Health
Cursed Sickle|Lifesteal
Runic Hide|Dampening
Void Shard|Penetration
Battle Axe|Strength
Killing Stone|Intelligence
Soul Reliquary|Intelligence,Mana
Enchanted Bracelet|Intelligence,Attack Speed
Plated Metal|Plating
Combat Boots|Pathfinding
Manchu Bow|Basic Attack Damage,Attack Speed
Flaming Pearl|Intelligence,Health
Ring of Dispel|Intelligence,Cooldown Rate
Oracle Staff|Intelligence,Mana
Hooked Sword|Critical
Caestus|Strength,Cooldown Rate
Skeggox|Strength
Survivor's Sash|Adaptive
Infused Axe|Mana
Zither|Omni-Power
Stalwart Sigil|Omni-Protect
Evil Eye|Intelligence
Adamantine Sickle|Strength,Lifesteal
Lucerne Hammer|Strength
Kopesh|Strength,Critical
Mote of Chaos|Omni-Power,Omni-Protect
Rod Of Asclepius|Intelligence,Active
Scepter of Dominion|Intelligence,Active
Lifebinder|Intelligence,Active
Shield Splitter|Hybrid,Active
Golden Blade|Strength,Basic Attack Damage
Helm of Radiance|Physical Protection,Intelligence
Gem of Isolation|Slow,Intelligence
Eye of the Storm|Magical Protection,Active
Brawler's Beat Stick|Adaptive,Omni-Protect
Runeforged Hammer|Strength,Crowd Control
Eye of Erebus|Adaptive,Active
Shifter's Shield|Adaptive,Hybrid Scaling
Sanguine Lash|Lifesteal,Active
Triton's Conch|Omni-Power,Aura
Helm of Darkness|Hybrid,Active
Sphere of Negation|Intelligence,Magical Protection
Wish-Granting Pearl|Intelligence,Health
Gauntlet of Thebes|Health
Yogi's Necklace|Health,Heal
Spectral Armor|Anti-Critical,Plating,Health
Eye of Providence|Vision,Omni-Protect
Chandra's Grace|Health,Cooldown Rate
Amanita Charm|Omni-Protect,Active
Genji's Guard|Cooldown Rate,Magical Protection
Alchemist Coat|Consumable,Dampening
Stampede|Physical Protection,Active
Screeching Gargoyle|Magical Protection,Active
Phoenix Feather|Magical Protection,Active
Shield of the Phoenix|Physical Protection,Heal
Prophetic Cloak|Omni-Protect,Mitigation
Breastplate of Valor|Cooldown Rate,Physical Protection
Berserker's Shield|Attack Speed,Omni-Protect
Magi's Cloak|Omni-Protect,CC Immunity
Contagion|Health,Anti-Lifesteal
Erosion|Anti-Shield,Omni-Protect
Kinetic Cuirass|Plating,Health,Omni-Protect
Midgardian Mail|Physical Protection,Health
Pharaoh's Curse|Attack Speed,Active,Magical Protection
Gladiator's Shield|Physical Protection,Ability
Oni Hunter's Garb|Magical Protection,Mitigation
Leviathan's Hide|Plating,Health,Physical Protection
Spirit Robe|Omni-Protect,Anti-CC,Tenacity
Shogun's Ofuda|Attack Speed,Dampening,Magical Protection
Ancile|Attack Speed,Active
Umbral Link|Physical Protection,Lifesteal
Shroud of Vengeance|Tenacity,Omni-Protect
Void Shield|Physical Protection,Penetration
Hide of the Nemean Lion|Physical Protection,Active
Void Stone|Magical Protection,Penetration
Mystical Mail|Physical Protection,Damage
Stone of Binding|Omni-Protect,Penetration
Glorious Pridwen|Omni-Protect,Active
Regrowth Striders|Omni-Protect,Active
Stygian Anchor|Omni-Protect,Anti-Heal
Mantle Of Discord|Omni-Protect,CC Immunity,Tenacity
Freya's Tears|Omni-Protect,Cooldown Rate
Ragnarok's Wake|Health,Physical Protection,Active
Wyrmskin Hide|Dampening,Strength,Magical Protection
Heartwood Charm|Heal,Active
Draconic Scale|Omni-Protect
Doublet of Binding|Dampening,Active,Magical Protection
Circe's Hexstone|Health,Active
Xibalban Effigy|Omni-Protect,Active
Resolute Mantle|Health,Tenacity
Radiant Bulwark|Plating,Active,Omni-Protect
Dwarven Plate|Omni-Protect,Active
Blood-Bound Book|Lifesteal
Book of Thoth|Mana,Intelligence
Eros' Bow|Attack Speed,Active
Bancroft's Talon|Intelligence,Lifesteal
Chronos' Pendant|Cooldown Rate,Intelligence
Transcendence|Mana,Strength
Jotunn's Revenge|Strength,Cooldown Rate
Sun Beam Bow|Adaptive,Active
Hydra's Lament|Strength,Basic Attack Damage
Odysseus' Bow|Attack Speed,Damage
Rage|Critical,Strength
Divine Ruin|Intelligence,Ability
Devourer's Gauntlet|Strength,Lifesteal
Dagger of Frenzy|Basic Attack Damage,Active
Bracer of The Abyss|Intelligence,Basic Attack Damage
Soul Gem|Intelligence,Ability
Barbed Carver|Strength,Ability
Lernaean Bow|Strength,Active
Nimble Ring|Intelligence,Basic Attack Damage
Daybreak Gavel|Adaptive,On Heal
Vital Amplifier|Adaptive,On Heal
Mercury's Talaria|Pathfinding,Movement Speed
Bloodforge|Lifesteal,Active
Polynomicon|Intelligence,Basic Attack Damage
Bragi's Harp|Omni-Power,Basic Attack Damage
Gem of Focus|Intelligence,Speed Up
The Executioner|Attack Speed,Penetration
Oath-Sworn Spear|Strength,Penetration
Necronomicon|Intelligence
The Reaper|Strength,Lifesteal
Qin's Blade|Anti-Tank,Basic Attack Damage
Death Metal|Omni-Power,Active
Tyrfing|Basic Attack Damage,Attack Speed
Ancient Signet|Intelligence,Ability
Typhon's Heart|Summon,Lifesteal
Gluttonous Grimoire|Intelligence,Lifesteal
The Cosmic Horror|Intelligence,Echo
Spear of Desolation|Intelligence,Cooldown Rate
Hastened Fatalis|Basic Attack Damage,Speed Up
Avenging Blade|Strength,Jungle
Arondight|Strength,Active
Tekko-Kagi|Strength,Speed Up
Musashi's Dual Swords|Critical,Speed Up
Doom Orb|Intelligence
Riptalon|Attack Speed,Lifesteal
Jade Scepter|Intelligence,Active
Demon Blade|Critical,Attack Speed
Pendulum Blade|Cooldown Rate,Active
Damaru|Echo,Critical
Totem of Death|Penetration,Intelligence
The World Stone|Intelligence,Cooldown Rate
The Crusher|Strength,Ability
Omen Drum|Adaptive,Echo
Deathbringer|Critical,Strength
Staff of Myrddin|Cooldown Rate,Active
Soul Reaver|Anti-Tank,Intelligence
Heartseeker|Strength,Damage
Rod of Tahuti|Intelligence
Obsidian Shard|Intelligence,Penetration
Titan's Bane|Strength,Penetration
Dreamer's Idol|Intelligence,Active
Avatar's Parashu|Strength,Active
Selflessness|Support,Anti-CC
War Flag|Support,Speed Up
Leather Cowl|Adaptive,Attack Speed
Bluestone Pendant|Adaptive,Ability
Vampiric Shroud|Adaptive,Heal
Bumba's Golden Dagger|Adaptive,Jungle
Bumba's Cudgel|Adaptive,Jungle
Conduit Gem|Adaptive,Ability
Sands Of Time|Adaptive,Cooldown Rate
Death's Toll|Basic Attack Damage,Heal
Warrior's Axe|Adaptive,Damage
Gilded Arrow|Basic Attack Damage,Farm
Health Potion|Heal
Mana Potion|Recovery
Multi Potion|Heal,Recovery
Vision Ward|Vision
Sentry Ward|Vision
Health Chalice|Heal
Warding Chalice|Vision
Elixir of Intelligence|Intelligence
Elixir of Strength|Strength
Bifrost Shard|Vision
Gjallarflare|Vision
Heimdall's Sight|Vision
Battle Cry|Buff
Meditation|Heal
Purification Beads|CC Immunity
Blink Rune|Teleport
Aegis Of Acceleration|Immune
Phantom Shell|Shield
Sundering Arc|Damage,Jungle
Agility Relic|Dash,Basic Attack Damage
Talisman of Purification|CC Immunity,Active
Time-Lock Aegis|Immune,Active
Shell of Rebuke|Shield,Active
Sundering Echo|Damage,Jungle,Active
Agility Greaves|Dash,Basic Attack Damage,Active
Blinking Abyss|Teleport,Active
Hunter's Cowl|Adaptive,Aura
`;

const TAG_ALIASES = {
  as: 'Attack Speed',
  attack: 'Basic Attack Damage',
  m: 'Mana',
  mp: 'Magical Protection',
  pp: 'Physical Protection',
  cd: 'Cooldown Rate',
  int: 'Intelligence',
  crit: 'Critical',
  hl: 'Heal',
  str: 'Strength',
  op: 'Omni-Protect',
  omnip: 'Omni-Protect',
  pene: 'Penetration',
  a: 'Active',
  ls: 'Lifesteal',
  movement: 'Movement Speed',
};

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeTag(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;
  const key = t.toLowerCase().replace(/\s+/g, '');
  if (TAG_ALIASES[key]) return TAG_ALIASES[key];
  // Already a full label — keep as-is (don't title-case Intelligence -> Intelligence ok)
  return t;
}

function parseTags(tagStr) {
  return tagStr
    .split(/[,/]/)
    .map((t) => normalizeTag(t))
    .filter(Boolean);
}

function parseEntries(text) {
  const map = new Map();
  text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .forEach((line) => {
      const pipe = line.indexOf('|');
      if (pipe < 0) return;
      const name = line.slice(0, pipe).trim();
      const tags = parseTags(line.slice(pipe + 1));
      map.set(normName(name), { name, tags });
    });
  return map;
}

function findItem(flat, normKey, displayName) {
  let hit = flat.find((i) => normName(i.name) === normKey || normName(i.internalName) === normKey);
  if (hit) return hit;
  const candidates = flat.filter((i) => {
    const n = normName(i.name);
    return n.includes(normKey) || normKey.includes(n);
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const exact = candidates.find((i) => normName(i.name) === normKey);
    if (exact) return exact;
  }
  return null;
}

function mergeTagsLocal(item, semanticTags) {
  return mergeTags(item, semanticTags);
}

const session = loadBuildsWithTags();
const { builds, tagsFile, tagsMap } = session;
const flat = session.flat.filter((i) => i.name || i.internalName);
const entries = parseEntries(ITEM_TAG_ENTRIES);

if (NOTEPAD_ONLY) {
  const stripped = stripSemanticTags(flat);
  console.log(`--notepad-only: stripped semantic tags from ${stripped} items`);
}

const applied = [];
const missing = [];
const skipped = [];

entries.forEach((entry, normKey) => {
  const item = findItem(flat, normKey, entry.name);
  if (!item) {
    missing.push(entry.name);
    return;
  }
  const before = [...(item.tags || [])];
  item.tags = mergeTagsLocal(item, entry.tags);
  if (JSON.stringify(before) !== JSON.stringify(item.tags)) {
    applied.push({ name: item.name, tags: item.tags });
  } else {
    skipped.push(item.name);
  }
});

console.log(`Matched: ${applied.length} updated, ${skipped.length} unchanged, ${missing.length} not in builds.json`);
if (missing.length) {
  console.log('\nNot found (skipped):');
  missing.forEach((n) => console.log('  -', n));
}

if (NOTEPAD_ONLY) {
  const propagated = propagateItemTags(builds);
  console.log(`\nPropagated tags on ${propagated.length} starter/evolved items`);
  propagated.forEach((line) => console.log(' ', line));
}

if (WRITE) {
  saveTagsFromSession({ tagsFile, flat: session.flat, tagsMap });
  console.log('\nWrote app/data/StringTables/Items/itemTags.json');
} else {
  console.log('\nDry run — pass --write to save');
  console.log('Sample updates:');
  applied.slice(0, 8).forEach((a) => console.log(' ', a.name, '→', a.tags.join(', ')));
}
