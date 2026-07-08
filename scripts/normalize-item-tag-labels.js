/**
 * Normalize item tags in builds.json to full display names (no abbreviations).
 * Run: node scripts/normalize-item-tag-labels.js --write
 */
const fs = require('fs');
const path = require('path');

const { loadBuildsWithTags, saveTagsFromSession } = require('./item-tags-io');

const WRITE = process.argv.includes('--write');

/** Internal/abbrev keys → full in-game label (matches itemTags.js / store copy). */
const CANONICAL_TAG_LABELS = {
  STR: 'Strength',
  INT: 'Intelligence',
  AS: 'Attack Speed',
  MP: 'Magical Protection',
  PP: 'Physical Protection',
  Cd: 'Cooldown Rate',
  cd: 'Cooldown Rate',
  OmniP: 'Omni-Protect',
  OP: 'Omni-Protect',
  Pene: 'Penetration',
  LS: 'Lifesteal',
  LifeSteal: 'Lifesteal',
  Hl: 'Heal',
  A: 'Active',
  M: 'Mana',
  ScalingHybrid: 'Hybrid Scaling',
  ScalingINT: 'INT Scaling',
  ScalingSTR: 'STR Scaling',
  CC: 'Crowd Control',
};

function canonicalizeTag(tag) {
  const t = String(tag || '').trim();
  if (!t) return null;
  if (CANONICAL_TAG_LABELS[t]) return CANONICAL_TAG_LABELS[t];
  const lower = t.toLowerCase();
  for (const [key, label] of Object.entries(CANONICAL_TAG_LABELS)) {
    if (key.toLowerCase() === lower) return label;
  }
  return t;
}

const session = loadBuildsWithTags();
const { tagsFile, tagsMap } = session;
let changed = 0;

session.flat.forEach((item) => {
  if (!item || !Array.isArray(item.tags)) return;
  const before = item.tags.join('|');
  const next = [];
  item.tags.forEach((tag) => {
    const c = canonicalizeTag(tag);
    if (c && !next.includes(c)) next.push(c);
  });
  const after = next.join('|');
  if (before !== after) {
    item.tags = next;
    changed += 1;
  }
});

console.log(`Normalized tags on ${changed} items`);
if (WRITE) {
  saveTagsFromSession({ tagsFile, flat: session.flat, tagsMap });
  console.log('Wrote app/data/StringTables/Items/itemTags.json');
} else {
  console.log('Dry run — pass --write to save');
}
