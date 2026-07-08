const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, 'apply-item-tags-from-user.js');
const { loadBuildsWithTags } = require('./item-tags-io');

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]/g, '');

const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
const block = script.match(/ITEM_TAG_ENTRIES = `([\s\S]*?)`;/)[1];
const userEntries = block
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && l.includes('|'))
  .map((l) => {
    const i = l.indexOf('|');
    return { name: l.slice(0, i).trim(), tags: l.slice(i + 1).trim() };
  });

const { flat } = loadBuildsWithTags();

function findItem(name) {
  const k = norm(name);
  let hit = flat.find((i) => norm(i.name) === k || norm(i.internalName) === k);
  if (hit) return hit;
  const c = flat.filter((i) => {
    const n = norm(i.name);
    return n.includes(k) || k.includes(n);
  });
  return c.length === 1 ? c[0] : null;
}

const missingFromDb = [];
const matched = new Set();
userEntries.forEach(({ name }) => {
  const item = findItem(name);
  if (!item) missingFromDb.push(name);
  else matched.add(norm(item.name));
});

const notInYourList = flat
  .filter((i) => !matched.has(norm(i.name)))
  .map((i) => i.name)
  .sort((a, b) => a.localeCompare(b));

const TAG_CANONICAL = {
  STR: 'Strength',
  INT: 'Intelligence',
  AS: 'Attack Speed',
  LifeSteal: 'Lifesteal',
  ScalingHybrid: 'Hybrid Scaling',
  OmniP: 'Omni-Protect',
};

const badTags = new Set();
flat.forEach((i) =>
  (i.tags || []).forEach((t) => {
    if (TAG_CANONICAL[t] || (t.length <= 3 && t !== 'CC')) badTags.add(t);
  })
);

console.log(JSON.stringify({ missingFromDb, notInYourList, badTags: [...badTags], userEntryCount: userEntries.length, dbItemCount: flat.length }, null, 2));
