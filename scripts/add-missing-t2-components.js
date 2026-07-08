/**
 * Add T2 component items referenced in builds.json but missing as entries.
 * Enchanted Bracelet, Stalwart Sigil (in-game; wiki + SMITEFire stats).
 */
const fs = require('fs');
const path = require('path');

const BUILDS_PATH = path.join(__dirname, '../app/data/God Information/Builds/builds.json');
const WRITE = process.argv.includes('--write');

const MISSING_ITEMS = [
  {
    internalName: 'EnchantedBracelet',
    entry: {
      buildsFromT1: ['Bow', 'Gem'],
      buildsIntoT3: ['NimbleRing', 'HandOfTheAbyss'],
      components: ['Bow', 'Gem'],
      icon: '/icons/EnchantedBracelet.webp',
      internalName: 'EnchantedBracelet',
      name: 'Enchanted Bracelet',
      passive: '',
      stats: {
        Intelligence: 20,
        'Attack Speed': 8,
      },
      stepCost: 150,
      tags: ['Tier2', 'Passive', 'Intelligence', 'Attack Speed'],
      tier: 2,
      totalCost: 900,
    },
    buildsIntoPatches: [
      { internalName: 'Bow', add: 'EnchantedBracelet' },
      { internalName: 'Gem', add: 'EnchantedBracelet' },
    ],
  },
  {
    internalName: 'StalwartSigil',
    entry: {
      buildsFromT1: ['Shield', 'Rune'],
      buildsIntoT3: ['DraconicScale', 'DwarvenPlate', 'XibalbanEffigy'],
      components: ['Shield', 'Rune'],
      icon: '/icons/StalwartSigil.webp',
      internalName: 'StalwartSigil',
      name: 'Stalwart Sigil',
      passive: '',
      stats: {
        'Physical Protection': 15,
        'Magical Protection': 15,
      },
      stepCost: 550,
      tags: ['Tier2', 'Passive', 'Omni-Protect', 'Physical Protection', 'Magical Protection'],
      tier: 2,
      totalCost: 1150,
    },
    buildsIntoPatches: [
      { internalName: 'Shield', add: 'StalwartSigil' },
      { internalName: 'Rune', add: 'StalwartSigil' },
    ],
  },
];

function flatItems(builds) {
  return builds.items.flat(2).filter((i) => i && (i.name || i.internalName));
}

function ensureBuildsInto(item, name) {
  if (!item.buildsIntoT2) item.buildsIntoT2 = [];
  if (!item.buildsIntoT2.includes(name)) item.buildsIntoT2.push(name);
}

const builds = JSON.parse(fs.readFileSync(BUILDS_PATH, 'utf8'));
const flat = flatItems(builds);
const added = [];
const skipped = [];

MISSING_ITEMS.forEach(({ internalName, entry, buildsIntoPatches }) => {
  if (flat.some((i) => i.internalName === internalName)) {
    skipped.push(internalName);
    return;
  }

  const tier2 = builds.items[1];
  if (!Array.isArray(tier2)) {
    console.error('Expected builds.items[1] to be tier-2 array');
    process.exit(1);
  }
  tier2.push(entry);
  added.push(entry.name);

  buildsIntoPatches.forEach(({ internalName: parent, add }) => {
    const parentItem = flat.find((i) => i.internalName === parent);
    if (parentItem) ensureBuildsInto(parentItem, add);
  });
});

console.log(`Added: ${added.length}${added.length ? ` (${added.join(', ')})` : ''}`);
console.log(`Skipped (already present): ${skipped.length}${skipped.length ? ` (${skipped.join(', ')})` : ''}`);

if (WRITE) {
  fs.writeFileSync(BUILDS_PATH, JSON.stringify(builds, null, 4) + '\n', 'utf8');
  console.log('Wrote', BUILDS_PATH);
} else {
  console.log('\nDry run — pass --write to save');
}
