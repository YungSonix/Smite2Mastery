'use strict';

/**
 * List Skins/{folder} on disk that no builds.json skin row resolves to (uses sync remaps).
 */
const fs = require('fs');
const path = require('path');
const { BUILDS_JSON } = require('../config/dataPaths');

const ROOT = path.join(__dirname, '..', 'app', 'data', 'NewGodSkins');

const STATIC = {
  Athena: { MysticGuardian: '02A' },
  Bellona: { MissSenshi: 'HiveQueen' },
  Apollo: { BitBlasterMechacore: 'BitBlaster' },
  Merlin: { MagicMischief: 'MysticMischief' },
  Pele: { SupernovaSplash1920x1080: 'SuperNova' },
  Danzaburou: { BossmanSplash1920x1080: 'BossMan' },
};

function listDirs(d) {
  try {
    return fs.readdirSync(d).filter((f) => fs.statSync(path.join(d, f)).isDirectory());
  } catch {
    return [];
  }
}

function listFiles(d) {
  try {
    return fs.readdirSync(d).filter((f) => fs.statSync(path.join(d, f)).isFile());
  } catch {
    return [];
  }
}

function flattenGods(godsRoot) {
  if (!godsRoot) return [];
  if (!Array.isArray(godsRoot)) return [godsRoot].filter(Boolean);
  return godsRoot.flat(Infinity).filter(Boolean);
}

function godFolderCandidates(god) {
  const internal = String(god.internalName || '')
    .replace(/_Item$/i, '')
    .replace(/_God$/i, '')
    .trim();
  const name = String(god.name || god.GodName || '').replace(/\s+/g, '').trim();
  return [...new Set([internal, name].filter(Boolean))];
}

function getSkins(god) {
  if (god.skins && typeof god.skins === 'object') return god.skins;
  return god.baseInformation?.skins || {};
}

function resolveRemapped(godFolder, skinKey, remap) {
  const want = remap[godFolder]?.[skinKey];
  if (!want) return null;
  const dir = path.join(ROOT, godFolder, 'Skins', want);
  return fs.existsSync(dir) ? want : null;
}

function resolvesToFolder(godFolder, folderName, skins, remap) {
  for (const skinKey of Object.keys(skins)) {
    const entry = skins[skinKey];
    if (!entry || entry.hideFromSkinList) continue;
    const remapped = resolveRemapped(godFolder, skinKey, remap);
    if (remapped && remapped.toLowerCase() === folderName.toLowerCase()) return skinKey;
    if (skinKey.toLowerCase() === folderName.toLowerCase()) return skinKey;
    const skinsRoot = path.join(ROOT, godFolder, 'Skins');
    if (fs.existsSync(path.join(skinsRoot, folderName)) && fs.existsSync(path.join(skinsRoot, skinKey))) {
      if (skinKey.toLowerCase() === folderName.toLowerCase()) return skinKey;
    }
    for (const token of String(entry.name || '').split(/[\s()]+/)) {
      const t = token.replace(/[^a-zA-Z0-9]/g, '');
      if (t && t.toLowerCase() === folderName.toLowerCase()) return skinKey;
    }
    for (const [canon, disk] of Object.entries(remap[godFolder] || {})) {
      if (disk.toLowerCase() === folderName.toLowerCase() && skinKey === canon) return skinKey;
    }
  }
  return null;
}

const builds = JSON.parse(fs.readFileSync(BUILDS_JSON, 'utf8'));
const diskGods = listDirs(ROOT);
const remap = STATIC;
const uncovered = [];

for (const god of flattenGods(builds.gods)) {
  const cands = godFolderCandidates(god);
  const godFolder = diskGods.find((d) => cands.some((c) => c.toLowerCase() === d.toLowerCase()));
  if (!godFolder) continue;
  const skinsRoot = path.join(ROOT, godFolder, 'Skins');
  if (!fs.existsSync(skinsRoot)) continue;
  const skins = getSkins(god);
  for (const sub of listDirs(skinsRoot)) {
    if (/^mastery$/i.test(sub) || /^pris/i.test(sub)) continue;
    const files = listFiles(path.join(skinsRoot, sub)).filter((f) =>
      /\.(png|webp|jpe?g)$/i.test(f)
    );
    if (!files.length) continue;
    if (!resolvesToFolder(godFolder, sub, skins, remap)) {
      uncovered.push(`${god.name || godFolder}/Skins/${sub}`);
    }
  }
}

console.log(`Uncovered skin folders with raster assets (${uncovered.length}):`);
for (const u of uncovered.sort()) console.log(`  ${u}`);
