/**
 * Export item tags to StringTables/Items/itemTags.json and remove tags from builds.json.
 * Run: node scripts/extract-item-tags.js --write
 */
const fs = require('fs');
const path = require('path');

const BUILDS_PATH = path.join(__dirname, '../app/data/God Information/Builds/builds.json');
const TAGS_PATH = path.join(__dirname, '../app/data/StringTables/Items/itemTags.json');
const WRITE = process.argv.includes('--write');

function flattenItems(itemsRoot, out = []) {
  if (!itemsRoot) return out;
  if (!Array.isArray(itemsRoot)) {
    if (itemsRoot && typeof itemsRoot === 'object') out.push(itemsRoot);
    return out;
  }
  itemsRoot.forEach((node) => {
    if (!node) return;
    if (Array.isArray(node)) flattenItems(node, out);
    else if (typeof node === 'object') out.push(node);
  });
  return out;
}

const builds = JSON.parse(fs.readFileSync(BUILDS_PATH, 'utf8'));
const flat = flattenItems(builds.items);

const items = flat
  .filter((item) => item?.internalName)
  .map((item) => ({
    internalName: item.internalName,
    name: item.name || item.internalName,
    tags: Array.isArray(item.tags) ? [...item.tags] : [],
  }))
  .sort((a, b) => String(a.internalName).localeCompare(String(b.internalName)));

const payload = {
  description:
    'Item tags by internalName. Edit tags here — builds.json no longer stores tags. ' +
    'Run apply-loadout-item-tags.js / propagate-item-tags.js against this file.',
  items,
};

let stripped = 0;
flat.forEach((item) => {
  if (!item || !Object.prototype.hasOwnProperty.call(item, 'tags')) return;
  delete item.tags;
  stripped += 1;
});

console.log(`Items with tags export: ${items.length}`);
console.log(`Tags entries (non-empty): ${items.filter((i) => i.tags.length).length}`);
console.log(`Stripped tags from builds.json nodes: ${stripped}`);

if (WRITE) {
  fs.writeFileSync(TAGS_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(BUILDS_PATH, JSON.stringify(builds, null, 4) + '\n', 'utf8');
  console.log('\nWrote', TAGS_PATH);
  console.log('Wrote', BUILDS_PATH);
} else {
  console.log('\nDry run — pass --write to save');
}
