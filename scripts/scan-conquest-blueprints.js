/**
 * Scan Hemingway Blueprints for Conquest help-tip / camp references.
 * Usage: node scripts/scan-conquest-blueprints.js [blueprintsDir]
 */
const fs = require('fs');
const path = require('path');

const SRC =
  process.argv[2] ||
  process.env.CONQUEST_BLUEPRINTS_EXPORT ||
  'C:/Users/Carri/Downloads/Output/Exports/Hemingway/Content/Blueprints';

function walkJson(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJson(full, out);
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

const files = walkJson(SRC);
const hits = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(SRC, file).replace(/\\/g, '/');
  const keys = [...text.matchAll(/"Key":\s*"([^"]+)"/g)].map((m) => m[1]);
  const tables = [...text.matchAll(/ST_HW_HelpTip_Descriptions/g)].length;
  const campHints = /JungleCamp|GoldPickup|MoonlightRitual|Conquest_Role|Primal|Blight|Pathfinder|Inspiration|Oracle|Heliokrater/i.test(
    text
  );
  if (campHints || tables) {
    hits.push({ file: rel, keys: [...new Set(keys)].slice(0, 8), hasHelpTable: tables > 0 });
  }
}

console.log('Blueprint scan:', SRC);
console.log('Matching files:', hits.length);
hits.slice(0, 40).forEach((h) => {
  console.log('-', h.file, h.keys.join(', '));
});
