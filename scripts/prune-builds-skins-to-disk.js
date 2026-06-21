/**
 * Remove builds.json skin rows that are not backed by `app/data/NewGodSkins/`.
 *
 * Drops:
 * - Wallpaper-only rows (legacy prism recolors under /icons/Wallpapers/)
 * - Rows marked hideFromSkinList
 * - Gods with no NewGodSkins folder
 * - Rows that do not resolve to Default/ or Skins/{folder} on disk
 * - Rows whose resolved folder has no card/portrait/full-body asset file
 *
 * Usage:
 *   node scripts/prune-builds-skins-to-disk.js
 *   node scripts/prune-builds-skins-to-disk.js --write
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { BUILDS_JSON } = require('../config/dataPaths');

const ROOT = path.join(__dirname, '..', 'app', 'data', 'NewGodSkins');
const write = process.argv.includes('--write');

function flattenGods(godsRoot) {
  if (!godsRoot) return [];
  if (!Array.isArray(godsRoot)) return [godsRoot].filter(Boolean);
  return godsRoot.flat(Infinity).filter(Boolean);
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name);
  } catch {
    return [];
  }
}

function listSubdirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
}

function godFolderCandidates(god) {
  const internal = String(god.internalName || '')
    .replace(/_Item$/i, '')
    .replace(/_God$/i, '')
    .trim();
  const name = String(god.name || god.GodName || '').replace(/\s+/g, '').trim();
  return [...new Set([internal, name].filter(Boolean))];
}

function findGodFolderOnDisk(god, diskGods) {
  for (const c of godFolderCandidates(god)) {
    if (diskGods.includes(c)) return c;
  }
  return (
    diskGods.find((d) =>
      godFolderCandidates(god).some((c) => c && c.toLowerCase() === d.toLowerCase())
    ) || null
  );
}

const SKIN_FOLDER_REMAP = {
  Athena: { MysticGuardian: '02A' },
  Bellona: { MissSenshi: 'HiveQueen' },
  Apollo: { BitBlasterMechacore: 'BitBlaster' },
  Merlin: { MagicMischief: 'MysticMischief' },
};

function matchSkinSubdir(skinsRoot, skinKey) {
  if (!fs.existsSync(skinsRoot)) return null;
  const dirs = listSubdirs(skinsRoot);
  if (dirs.includes(skinKey)) return skinKey;
  return dirs.find((d) => d.toLowerCase() === String(skinKey).toLowerCase()) || null;
}

function inferSkinSubdir(skinsRoot, skinKey, skinEntry) {
  if (!fs.existsSync(skinsRoot)) return null;
  const dirs = listSubdirs(skinsRoot);
  const sub = matchSkinSubdir(skinsRoot, skinKey);
  if (sub) return sub;
  const rawName = String(skinEntry.name || '');
  const tokens = rawName
    .split(/[\s()]+/)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  for (const t of tokens) {
    const hit = dirs.find((d) => d.toLowerCase() === t.toLowerCase());
    if (hit) return hit;
  }
  const collapsed = rawName.replace(/[()]/g, '').replace(/\s+/g, '');
  for (const d of dirs) {
    if (collapsed.toLowerCase().includes(d.toLowerCase())) return d;
  }
  return null;
}

function resolveRemappedSkinDir(godFolder, skinKey) {
  const godMap = SKIN_FOLDER_REMAP[godFolder];
  if (!godMap || !godMap[skinKey]) return null;
  const want = godMap[skinKey];
  const skinsRoot = path.join(ROOT, godFolder, 'Skins');
  if (!fs.existsSync(skinsRoot)) return null;
  const hit = listSubdirs(skinsRoot).find((d) => d.toLowerCase() === String(want).toLowerCase());
  return hit ? path.join(skinsRoot, hit) : null;
}

function resolveSkinAssetDir(godFolder, skinKey, skinEntry) {
  const remapped = resolveRemappedSkinDir(godFolder, skinKey);
  if (remapped) return remapped;

  const skinsRoot = path.join(ROOT, godFolder, 'Skins');
  let sub = matchSkinSubdir(skinsRoot, skinKey);
  if (!sub) sub = inferSkinSubdir(skinsRoot, skinKey, skinEntry);
  if (sub) return path.join(skinsRoot, sub);

  const defaultDir = path.join(ROOT, godFolder, 'Default');
  const type = String(skinEntry.type || '');
  const nm = String(skinEntry.name || '');
  const isBase =
    /base skin/i.test(type) ||
    /base\b/i.test(nm) ||
    skinKey === godFolder ||
    String(skinKey).toLowerCase() === String(godFolder).toLowerCase() ||
    godFolderCandidates({ internalName: skinKey, name: skinKey }).some(
      (c) => c.toLowerCase() === godFolder.toLowerCase()
    );
  if (fs.existsSync(defaultDir) && isBase) return defaultDir;
  return null;
}

function collectAssetPaths(entry) {
  const out = [];
  for (const key of ['skin', 'cardArt', 'icon', 'inGame', 'card_art', 'in_game']) {
    if (entry[key]) out.push(String(entry[key]));
  }
  for (const v of entry.variants || []) {
    if (!v || typeof v !== 'object') continue;
    for (const key of ['skin', 'cardArt', 'icon']) {
      if (v[key]) out.push(String(v[key]));
    }
  }
  return out;
}

function isWallpaperOnlySkin(entry) {
  const paths = collectAssetPaths(entry);
  if (!paths.length) return false;
  return paths.every((p) => /\/icons\/wallpapers\//i.test(p.replace(/\\/g, '/')));
}

function dirHasDisplayAsset(dir) {
  const files = listFiles(dir);
  return files.some(
    (f) =>
      /\.(png|webp|jpe?g|json)$/i.test(f) &&
      /t_GodCard_|SkinCard|GodPortrait|SkinPortrait|SkinIcon|GodFull/i.test(f)
  );
}

function setGodSkins(god, skins) {
  if (god.baseInformation && typeof god.baseInformation === 'object') {
    god.baseInformation.skins = skins;
  }
  god.skins = skins;
}

function main() {
  if (!fs.existsSync(BUILDS_JSON)) {
    console.error('Missing', BUILDS_JSON);
    process.exit(1);
  }
  if (!fs.existsSync(ROOT)) {
    console.error('Missing', ROOT);
    process.exit(1);
  }

  const builds = JSON.parse(fs.readFileSync(BUILDS_JSON, 'utf8'));
  const gods = flattenGods(builds.gods);
  const diskGods = listSubdirs(ROOT);
  const removed = [];
  let totalRemoved = 0;

  for (const god of gods) {
    const skins = god.baseInformation?.skins || god.skins;
    if (!skins || typeof skins !== 'object') continue;
    const godName = String(god.name || god.internalName || 'Unknown');
    const godFolder = findGodFolderOnDisk(god, diskGods);

    for (const skinKey of [...Object.keys(skins)]) {
      const entry = skins[skinKey];
      if (!entry || typeof entry !== 'object') {
        delete skins[skinKey];
        totalRemoved += 1;
        removed.push(`${godName}/${skinKey} (empty row)`);
        continue;
      }

      let reason = null;
      if (entry.hideFromSkinList || entry.hide_from_skin_list) reason = 'hidden duplicate';
      else if (/^master(y|ies)$/i.test(String(skinKey)) || /^master(y|ies)$/i.test(String(entry.name || '').trim())) {
        reason = 'mastery folder (merged into base skin variants)';
      } else if (isWallpaperOnlySkin(entry)) reason = 'wallpaper-only';
      else if (!godFolder) reason = 'no NewGodSkins folder';
      else if (/^pris[i]?ms?$/i.test(skinKey)) reason = 'orphan Prisms key';
      else {
        const dir = resolveSkinAssetDir(godFolder, skinKey, entry);
        if (!dir) reason = 'no matching Skins folder';
        else if (!dirHasDisplayAsset(dir)) reason = 'folder has no card/portrait assets';
      }

      if (reason) {
        delete skins[skinKey];
        totalRemoved += 1;
        removed.push(`${godName}/${skinKey} (${reason})`);
      }
    }

    setGodSkins(god, skins);
  }

  console.log(JSON.stringify({ removedSkinRows: totalRemoved, write }, null, 2));
  if (removed.length) {
    console.log('\nRemoved:');
    for (const line of removed.slice(0, 80)) console.log(' ', line);
    if (removed.length > 80) console.log(`  … and ${removed.length - 80} more`);
  }

  if (write) {
    fs.writeFileSync(BUILDS_JSON, `${JSON.stringify(builds, null, 4)}\n`, 'utf8');
    console.log('\nWrote', BUILDS_JSON);
  } else {
    console.log('\nDry-run. Re-run with --write to save.');
  }
}

main();
