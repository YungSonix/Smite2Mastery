'use strict';

const fs = require('fs');
const path = require('path');
const { BUILDS_JSON } = require('../config/dataPaths');

const ROOT = path.join(__dirname, '..', 'app', 'data', 'NewGodSkins');
const isRaster = (f) => /\.(png|webp|jpe?g)$/i.test(f);
const isDisplay = (f) =>
  isRaster(f) &&
  /GodCard|SkinCard|GodPortrait|SkinPortrait|SkinIcon|GodIcon|GodFull|SkinFull/i.test(f);

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

const builds = JSON.parse(fs.readFileSync(BUILDS_JSON, 'utf8'));
const diskGods = listDirs(ROOT).sort();
const buildsByFolder = new Map();

for (const god of flattenGods(builds.gods)) {
  for (const c of godFolderCandidates(god)) {
    buildsByFolder.set(c.toLowerCase(), god);
  }
}

console.log('=== NewGodSkins folders with NO god in builds.json ===');
const orphanFolders = diskGods.filter((d) => !buildsByFolder.has(d.toLowerCase()));
console.log(orphanFolders.length ? orphanFolders.join(', ') : '(none)');

console.log('\n=== Gods in builds with NO NewGodSkins folder ===');
const missingDisk = [];
for (const god of flattenGods(builds.gods)) {
  const cands = godFolderCandidates(god);
  const hit = cands.find((c) => diskGods.some((d) => d.toLowerCase() === c.toLowerCase()));
  if (!hit) missingDisk.push(god.name || god.GodName);
}
console.log(missingDisk.length ? missingDisk.sort().join(', ') : '(none)');

console.log('\n=== Skins/ subfolders on disk not in builds (per god) ===');
let orphanSkinFolders = 0;
for (const godFolder of diskGods) {
  const god = buildsByFolder.get(godFolder.toLowerCase());
  if (!god) continue;
  const skins = god.baseInformation?.skins || god.skins || {};
  const skinKeys = new Set(Object.keys(skins).map((k) => k.toLowerCase()));
  const skinsRoot = path.join(ROOT, godFolder, 'Skins');
  for (const sub of listDirs(skinsRoot)) {
    if (/^mastery$/i.test(sub) || /^pris/i.test(sub)) continue;
    if (!skinKeys.has(sub.toLowerCase())) {
      const files = listFiles(path.join(skinsRoot, sub)).filter(isDisplay);
      if (files.length) {
        console.log(`  ${godFolder}/Skins/${sub} (${files.length} display assets)`);
        orphanSkinFolders += 1;
      }
    }
  }
}
if (!orphanSkinFolders) console.log('  (none with display assets)');

console.log('\n=== Default/ has display assets but god has no base skin row ===');
for (const godFolder of diskGods) {
  const god = buildsByFolder.get(godFolder.toLowerCase());
  if (!god) continue;
  const defaultDir = path.join(ROOT, godFolder, 'Default');
  const displayFiles = listFiles(defaultDir).filter(isDisplay);
  if (!displayFiles.length) continue;
  const skins = god.baseInformation?.skins || god.skins || {};
  const hasBase = Object.entries(skins).some(([k, e]) => {
    const type = String(e?.type || '');
    const nm = String(e?.name || '');
    return (
      /base skin/i.test(type) ||
      /\bbase\b/i.test(nm) ||
      k.toLowerCase() === godFolder.toLowerCase()
    );
  });
  if (!hasBase) console.log(`  ${godFolder} (${displayFiles.length} assets in Default/)`);
}
