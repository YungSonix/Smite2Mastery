/**
 * Build app/data/StringTables/God/godAbilityTalentLineups.json from ability description keys.
 * Slots with a God.Talent.N.Slot.* string → "talent"; otherwise "base".
 * Run: node scripts/generate-god-talent-lineups.js [--write]
 */
const fs = require('fs');
const path = require('path');

const ABILITY_DESC_PATH = path.join(
  __dirname,
  '../app/data/StringTables/God/ST_HW_God_AbilityDescriptions.json'
);
const OUT_PATH = path.join(__dirname, '../app/data/StringTables/God/godAbilityTalentLineups.json');
const WRITE = process.argv.includes('--write');

const STANDARD_SLOTS = ['A01', 'A02', 'A03', 'A04', 'PSV', 'BASIC'];

function readStringTable(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entry = Array.isArray(raw) ? raw[0] : raw;
  return entry?.StringTable?.KeysToEntries || {};
}

const entries = readStringTable(ABILITY_DESC_PATH);
const talentByGod = {};

Object.keys(entries).forEach((key) => {
  if (typeof entries[key] !== 'string') return;
  const match = key.match(/^([^.]+)\.Talent\.(\d+)\.([^.]+)\./);
  if (!match) return;
  const [, god, talentIndex, rawSlot] = match;
  const slot = rawSlot.toUpperCase() === 'BASIC' ? 'BASIC' : rawSlot.toUpperCase();
  if (!talentByGod[god]) {
    talentByGod[god] = { talentIndex: parseInt(talentIndex, 10), talentSlots: new Set() };
  }
  talentByGod[god].talentSlots.add(slot);
});

const gods = {};
Object.entries(talentByGod).forEach(([god, { talentIndex, talentSlots }]) => {
  const slots = {};
  STANDARD_SLOTS.forEach((slot) => {
    slots[slot] = talentSlots.has(slot) ? 'talent' : 'base';
  });
  gods[god] = { talentIndex, slots };
});

const payload = {
  description:
    'Per-god talent ability lineup. Each slot: "base" | "talent". ' +
    'Edit manually; run node scripts/generate-god-talent-lineups.js --write to refresh from string tables.',
  gods,
};

console.log(`Gods with talent lineups: ${Object.keys(gods).length}`);
console.log('Achilles:', JSON.stringify(gods.Achilles));

if (WRITE) {
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log('Wrote', OUT_PATH);
} else {
  console.log('Dry run — pass --write to save');
}
