/**
 * Reads app/data/builds.json and lists:
 * 1) All Gods (name + pantheon)
 * 2) All Items grouped by tier (Tier 1, Tier 2, Tier 3)
 * Run: node scripts/list-gods-and-items.js
 */

const fs = require('fs');
const path = require('path');

const buildsPath = path.join(__dirname, '../app/data/builds.json');
const buildsData = JSON.parse(fs.readFileSync(buildsPath, 'utf8'));

function flatten(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.flat(Infinity).filter(Boolean);
}

const gods = flatten(buildsData.gods || []);
const itemsRaw = flatten(buildsData.items || []);

// Group items by tier (1, 2, 3)
const byTier = { 1: [], 2: [], 3: [] };
itemsRaw.forEach((item) => {
  const tier = item.tier;
  if (tier === 1 || tier === 2 || tier === 3) {
    const name = item.name || item.internalName || 'Unknown';
    byTier[tier].push(name);
  }
});
[1, 2, 3].forEach((t) => byTier[t].sort());

console.log('='.repeat(80));
console.log('GODS (name + pantheon)');
console.log('='.repeat(80));
console.log(`Total gods: ${gods.length}\n`);

gods.forEach((god) => {
  const name = god.name || god.internalName || 'Unknown';
  const pantheon = god.pantheon || '—';
  console.log(`${name} — ${pantheon}`);
});

console.log('\n' + '='.repeat(80));
console.log('ITEMS BY TIER');
console.log('='.repeat(80));

[1, 2, 3].forEach((tier) => {
  const list = byTier[tier];
  console.log(`\n--- Tier ${tier} (${list.length} items) ---`);
  list.forEach((name) => console.log(`  ${name}`));
});

console.log('\n' + '='.repeat(80));
console.log('Done.');
