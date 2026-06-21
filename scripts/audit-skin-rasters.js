'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'app', 'data', 'NewGodSkins');
const BUILDS = path.join(__dirname, '..', 'app', 'data', 'God Information', 'Builds', 'builds.json');

const isRaster = (f) => /\.(png|webp|jpe?g)$/i.test(f);
const isCard = (f) => /GodCard|SkinCard|Card/i.test(f);
const isPortrait = (f) => /GodPortrait|SkinPortrait|Portrait/i.test(f);

function listFiles(d) {
  try {
    return fs.readdirSync(d).filter((f) => fs.statSync(path.join(d, f)).isFile());
  } catch {
    return [];
  }
}

function listDirs(d) {
  try {
    return fs.readdirSync(d).filter((f) => fs.statSync(path.join(d, f)).isDirectory());
  } catch {
    return [];
  }
}

function walkSkinDirs(god) {
  const out = [];
  const godRoot = path.join(ROOT, god);
  out.push({ label: 'Default', dir: path.join(godRoot, 'Default') });

  const skinsRoot = path.join(godRoot, 'Skins');
  for (const skin of listDirs(skinsRoot)) {
    out.push({ label: `Skins/${skin}`, dir: path.join(skinsRoot, skin) });
    const prismsRoot = path.join(skinsRoot, skin, 'Prisms');
    for (const prism of listDirs(prismsRoot)) {
      out.push({ label: `Skins/${skin}/Prisms/${prism}`, dir: path.join(prismsRoot, prism) });
    }
  }
  return out;
}

const jsonOnly = [];
const noRasterAtAll = [];

for (const god of listDirs(ROOT).sort()) {
  for (const { label, dir } of walkSkinDirs(god)) {
    const files = listFiles(dir);
    if (!files.length) continue;

    const rasters = files.filter(isRaster);
    const jsons = files.filter((f) => /\.json$/i.test(f));
    const cardR = rasters.filter(isCard);
    const portR = rasters.filter(isPortrait);
    const cardJ = jsons.filter(isCard);
    const portJ = jsons.filter(isPortrait);

    if (!rasters.length && jsons.length) {
      noRasterAtAll.push({ god, folder: label });
      continue;
    }

    const missing = [];
    if (!cardR.length && cardJ.length) missing.push('card');
    if (!portR.length && portJ.length) missing.push('portrait');
    if (missing.length) jsonOnly.push({ god, folder: label, missing });
  }
}

function flattenGods(godsRoot) {
  if (!godsRoot) return [];
  if (!Array.isArray(godsRoot)) return [godsRoot].filter(Boolean);
  return godsRoot.flat(Infinity).filter(Boolean);
}

const builds = JSON.parse(fs.readFileSync(BUILDS, 'utf8'));
const pointsToJson = [];
const missingFile = [];
const emptyField = [];

for (const g of flattenGods(builds.gods)) {
  const gn = g.name || g.GodName;
  const skins = g.skins || {};
  for (const [k, e] of Object.entries(skins)) {
    if (e.hideFromSkinList) continue;
    for (const field of ['skin', 'cardArt', 'icon']) {
      const p = e[field];
      if (!p) {
        emptyField.push({ god: gn, skin: k, field });
        continue;
      }
      const abs = path.join(__dirname, '..', p.replace(/^app\/data\//, 'app/data/'));
      if (/\.json$/i.test(p)) pointsToJson.push({ god: gn, skin: k, field, path: p });
      else if (!fs.existsSync(abs)) missingFile.push({ god: gn, skin: k, field, path: p });
    }
  }
}

function groupByGod(rows, keyFn) {
  const m = new Map();
  for (const row of rows) {
    const g = row.god;
    if (!m.has(g)) m.set(g, []);
    m.get(g).push(keyFn(row));
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

console.log('=== Folders with ONLY .json (no PNG/WebP/JPEG at all) ===');
if (!noRasterAtAll.length) console.log('(none)');
else for (const x of noRasterAtAll) console.log(`  ${x.god}/${x.folder}`);

console.log(`\n=== Folders with card/portrait JSON but missing raster (${jsonOnly.length}) ===`);
for (const x of jsonOnly) console.log(`  ${x.god}/${x.folder} — missing ${x.missing.join(', ')}`);

console.log(`\n=== builds.json still pointing at .json (${pointsToJson.length} fields) ===`);
for (const [g, items] of groupByGod(pointsToJson, (x) => `${x.skin}/${x.field}`)) {
  console.log(`  ${g}: ${[...new Set(items)].join(', ')}`);
}

console.log(`\n=== builds.json paths to missing files (${missingFile.length}) ===`);
for (const [g, items] of groupByGod(missingFile, (x) => `${x.skin} (${x.field})`)) {
  console.log(`  ${g}: ${[...new Set(items)].join('; ')}`);
}

console.log(`\n=== Empty skin/cardArt/icon in builds (${emptyField.length}) ===`);
for (const [g, items] of groupByGod(emptyField, (x) => `${x.skin}/${x.field}`)) {
  console.log(`  ${g}: ${[...new Set(items)].join(', ')}`);
}
