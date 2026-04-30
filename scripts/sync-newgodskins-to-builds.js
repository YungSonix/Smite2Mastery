/**
 * Maps `app/data/NewGodSkins/{God}/Skins/{SkinFolder}/` (and `.../{God}/Default/` for base)
 * into `app/data/builds.json` skin entries using repo-relative paths:
 *   `app/data/NewGodSkins/...` (loaded via `getSkinImage` → GitHub raw).
 *
 * Also:
 * - **Prisms**: `Skins/{Skin}/Prisms/*_Prism_*.png` (or prism files in the skin root) → `variants[]` overlays.
 * - **Folder inference**: skin keys that do not match a folder name (e.g. typos) can still resolve using
 *   display `name` tokens (e.g. "Ravenstrike" → `Skins/Ravenstrike`).
 * - **Duplicate keys** pointing at the same folder (legacy per-prism rows) → keep one canonical row, set
 *   `hideFromSkinList: true` on the others so the app shows a single skin with a prism strip.
 * - **Disk discovery**: each subfolder of `Skins/` that is not already represented by a skin row (by key or
 *   name inference) gets a new stub entry so assets can sync. The folder `Mastery` is never a separate skin row.
 * - **Mastery**: files in `Skins/Mastery/` (portraits / optional shared `*Card*Mastery*` card) are merged into
 *   the **base** skin’s `variants[]` (like prisms; portrait-only tiers are OK — splash falls back to base card).
 *
 * Usage: `node scripts/sync-newgodskins-to-builds.js` (dry-run) or `--write`
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'app', 'data', 'NewGodSkins');
const BUILDS = path.join(__dirname, '..', 'app', 'data', 'builds.json');

function listFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function listSubdirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

function pickCard(files) {
  const godCard = files.find((x) => /^t_GodCard_/i.test(x));
  if (godCard) return godCard;
  const baseSkinCard = files.find((x) => /t_SkinCard_/i.test(x) && /_Base\./i.test(x));
  if (baseSkinCard) return baseSkinCard;
  const noPrism = files.find((x) => /t_SkinCard_/i.test(x) && !/Prism/i.test(x));
  if (noPrism) return noPrism;
  return files.find((x) => /t_SkinCard_/i.test(x)) || null;
}

/** Icons for the default (non-prism) skin card — prism-only filenames are skipped. */
function pickIconBase(files) {
  const skinIcon = files.find((x) => /t_SkinIcon_/i.test(x) && !/Prism/i.test(x));
  if (skinIcon) return skinIcon;
  const skinPortrait = files.find((x) => /t_SkinPortrait_/i.test(x) && !/Prism/i.test(x));
  if (skinPortrait) return skinPortrait;
  return (
    files.find((x) => /t_GodPortrait_/i.test(x)) ||
    files.find((x) => /t_GodMini_/i.test(x)) ||
    null
  );
}

/** Icons inside a prism group (filenames are usually *_Prism_*.png). */
function pickIconPrism(files) {
  return (
    files.find((x) => /t_SkinIcon_/i.test(x)) ||
    files.find((x) => /t_SkinPortrait_/i.test(x)) ||
    files.find((x) => /t_GodPortrait_/i.test(x)) ||
    null
  );
}

function pickFullBody(files) {
  return files.find((x) => /^T_GodFull_/i.test(x)) || files.find((x) => /^t_GodFull_/i.test(x)) || null;
}

function posixJoin(...parts) {
  return parts.filter(Boolean).join('/');
}

function relFromDir(projectRoot, dir, file) {
  const relDir = path.relative(projectRoot, dir).split(path.sep).join('/');
  return posixJoin(relDir, file);
}

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

function godFolderCandidates(god) {
  const internal = String(god.internalName || '')
    .replace(/_Item$/i, '')
    .replace(/_God$/i, '')
    .trim();
  const name = String(god.name || god.GodName || '')
    .replace(/\s+/g, '')
    .trim();
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

function resolveSkinAssetDir(godFolder, skinKey, skinEntry) {
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
    String(skinKey).toLowerCase() === String(godFolder).toLowerCase();
  if (fs.existsSync(defaultDir) && isBase) return defaultDir;
  return null;
}

function extractPrismId(filename) {
  const m = String(filename).match(/_Prism_([A-Za-z0-9]+)/i);
  return m ? m[1] : null;
}

function findPrismsDirName(skinDir) {
  const subs = listSubdirs(skinDir);
  return subs.find((d) => /^prisms?$/i.test(d)) || null;
}

function collectPrismPairsById(skinDir) {
  const byId = new Map();
  function pushPair(id, dir, name) {
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push({ dir, name });
  }
  for (const name of listFiles(skinDir)) {
    const id = extractPrismId(name);
    if (id) pushPair(id, skinDir, name);
  }
  const pName = findPrismsDirName(skinDir);
  if (pName) {
    const pDir = path.join(skinDir, pName);
    for (const name of listFiles(pDir)) {
      const id = extractPrismId(name);
      if (id) pushPair(id, pDir, name);
    }
  }
  return byId;
}

function sortPrismIds(ids) {
  const rank = (id) => {
    const s = String(id).toLowerCase();
    if (s.length === 1 && s >= 'a' && s <= 'z') return s.charCodeAt(0) - 96;
    const n = parseInt(s, 10);
    if (!Number.isNaN(n)) return 100 + n;
    return 200 + s.charCodeAt(0);
  };
  return [...ids].sort((a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b)));
}

function pickIconFallbackFromPrisms(byId, projectRoot) {
  for (const id of sortPrismIds([...byId.keys()])) {
    const pairs = byId.get(id);
    const names = pairs.map((p) => p.name);
    const iconName = pickIconPrism(names);
    if (iconName) {
      const dir = pairs.find((p) => p.name === iconName).dir;
      return relFromDir(projectRoot, dir, iconName);
    }
  }
  return null;
}

function buildVariantOverlays(skinDir, projectRoot, baseCardPath, baseIconPath) {
  const byId = collectPrismPairsById(skinDir);
  if (byId.size === 0) return [];

  const overlays = [];
  for (const id of sortPrismIds([...byId.keys()])) {
    const pairs = byId.get(id);
    const names = pairs.map((p) => p.name);
    const cardName = pickCard(names);
    const iconName = pickIconPrism(names);
    const fullName = pickFullBody(names);

    const o = { name: `Prism ${String(id).toUpperCase()}` };
    if (cardName) {
      const dir = pairs.find((p) => p.name === cardName).dir;
      const cardPath = relFromDir(projectRoot, dir, cardName);
      o.cardArt = cardPath;
      o.skin = cardPath;
    }
    if (iconName) {
      const dir = pairs.find((p) => p.name === iconName).dir;
      o.icon = relFromDir(projectRoot, dir, iconName);
    }
    if (fullName) {
      const dir = pairs.find((p) => p.name === fullName).dir;
      o.inGame = relFromDir(projectRoot, dir, fullName);
    }

    const redundant =
      (!o.cardArt || o.cardArt === baseCardPath) &&
      (!o.icon || o.icon === baseIconPath) &&
      !o.inGame;
    if (!redundant) overlays.push(o);
  }
  return overlays;
}

function pickCanonicalSkinKey(dirAbs, members) {
  const baseName = path.basename(dirAbs);
  const exact = members.find(
    (x) => x.skinKey === baseName || String(x.skinKey).toLowerCase() === baseName.toLowerCase()
  );
  if (exact) return exact.skinKey;
  const noOpenParen = members.find((x) => !String(x.entry.name || '').includes('('));
  if (noOpenParen) return noOpenParen.skinKey;
  return [...members].sort((a, b) => String(a.skinKey).length - String(b.skinKey).length)[0].skinKey;
}

function prettifyFolderName(folder) {
  return String(folder)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

/** Any existing skin row already maps to this `Skins/{folderName}` directory. */
function isFolderCoveredByExistingSkin(skinsRoot, skins, folderName) {
  for (const skinKey of Object.keys(skins)) {
    const entry = skins[skinKey];
    if (!entry || typeof entry !== 'object') continue;
    let sub = matchSkinSubdir(skinsRoot, skinKey);
    if (!sub) sub = inferSkinSubdir(skinsRoot, skinKey, entry);
    if (sub === folderName) return true;
  }
  return false;
}

/**
 * Add `Skins/{dir}` stubs for dirs on disk that have no matching builds.json skin key.
 * Skips `Mastery` (handled as variants on the base skin).
 */
function discoverMissingSkinFolders(godFolder, skins) {
  const skinsRoot = path.join(ROOT, godFolder, 'Skins');
  if (!fs.existsSync(skinsRoot)) return 0;
  let added = 0;
  for (const d of listSubdirs(skinsRoot)) {
    if (/^mastery$/i.test(d)) continue;
    if (isFolderCoveredByExistingSkin(skinsRoot, skins, d)) continue;
    if (skins[d]) continue;
    skins[d] = {
      name: prettifyFolderName(d),
      skin: '',
      type: '',
      price: { gems: '', diamonds: '', gemsdia: '' },
    };
    added += 1;
  }
  return added;
}

function findBaseSkinKey(skins, godFolder, god) {
  const display = String(god.name || god.GodName || '').trim();
  const keys = Object.keys(skins);
  for (const k of keys) {
    const e = skins[k];
    if (!e || typeof e !== 'object') continue;
    if (/base skin/i.test(String(e.type || ''))) return k;
  }
  for (const k of keys) {
    const n = String(skins[k]?.name || '');
    if (/\bbase\b/i.test(n)) return k;
  }
  for (const k of keys) {
    if (k === display) return k;
    if (k.replace(/\s+/g, '').toLowerCase() === display.replace(/\s+/g, '').toLowerCase()) return k;
  }
  const gCompact = godFolder.replace(/_/g, '');
  for (const k of keys) {
    if (k.replace(/\s+/g, '').toLowerCase() === gCompact.toLowerCase()) return k;
  }
  return keys[0] || null;
}

function extractMasteryTierLabel(filename, godFolder) {
  const noExt = filename.replace(/\.png$/i, '');
  let rest = noExt
    .replace(/^t_SkinPortrait_/i, '')
    .replace(/^t_SkinIcon_/i, '')
    .replace(/^T_SkinPortrait_/i, '')
    .replace(/^T_SkinIcon_/i, '');
  const candidates = [...new Set([godFolder, godFolder.replace(/_/g, '')])].filter(Boolean);
  for (const g of candidates) {
    const prefix = `${g}_`;
    if (rest.toLowerCase().startsWith(prefix.toLowerCase())) {
      rest = rest.slice(prefix.length);
      break;
    }
  }
  const human = rest.replace(/_/g, ' ').trim();
  return human || 'Variant';
}

function findSharedMasteryCard(files) {
  return files.find((f) => /\.png$/i.test(f) && /card.*mastery|mastery.*card|_Card_Mastery/i.test(f)) || null;
}

function pickPortraitOrIconForTier(tierFiles) {
  return (
    tierFiles.find((f) => /t_SkinPortrait_/i.test(f)) ||
    tierFiles.find((f) => /t_SkinIcon_/i.test(f)) ||
    null
  );
}

/**
 * Variants for `Skins/Mastery/` — merged onto the base skin (chips + optional shared card art).
 * Each object is tagged `masteryFromDisk` so the next run can replace mastery rows without dropping prism variants.
 */
function buildMasteryFolderVariants(godFolder, projectRoot) {
  const masteryDir = path.join(ROOT, godFolder, 'Skins', 'Mastery');
  if (!fs.existsSync(masteryDir)) return [];
  const files = listFiles(masteryDir).filter((f) => /\.png$/i.test(f));
  if (files.length === 0) return [];

  const sharedCardName = findSharedMasteryCard(files);
  const sharedCardPath = sharedCardName ? relFromDir(projectRoot, masteryDir, sharedCardName) : null;

  const tierMap = new Map();
  for (const f of files) {
    if (sharedCardName && f === sharedCardName) continue;
    if (!/t_SkinPortrait_|t_SkinIcon_/i.test(f)) continue;
    const label = extractMasteryTierLabel(f, godFolder);
    if (!tierMap.has(label)) tierMap.set(label, []);
    tierMap.get(label).push(f);
  }

  const labels = [...tierMap.keys()].sort((a, b) => a.localeCompare(b));
  const out = [];
  for (const label of labels) {
    const tierFiles = tierMap.get(label);
    const iconName = pickPortraitOrIconForTier(tierFiles);
    if (!iconName) continue;
    const o = {
      name: `Mastery ${label}`,
      icon: relFromDir(projectRoot, masteryDir, iconName),
      masteryFromDisk: true,
    };
    if (sharedCardPath) {
      o.cardArt = sharedCardPath;
      o.skin = sharedCardPath;
    }
    out.push(o);
  }
  return out;
}

function main() {
  const write = process.argv.includes('--write');
  if (!fs.existsSync(ROOT)) {
    console.error('Missing folder:', ROOT);
    process.exit(1);
  }
  const diskGods = listSubdirs(ROOT);
  const raw = fs.readFileSync(BUILDS, 'utf8');
  const builds = JSON.parse(raw);

  function flattenGods(root) {
    if (!root) return [];
    if (!Array.isArray(root)) return [root];
    return root.flat(Infinity).filter(Boolean);
  }
  const gods = flattenGods(builds.gods);
  if (gods.length === 0) {
    console.error('builds.json: no gods found');
    process.exit(1);
  }

  const projectRoot = path.join(__dirname, '..');
  let updated = 0;
  let skipped = 0;
  let prismGroups = 0;
  let hiddenDupes = 0;
  let discoveredSkinStubs = 0;
  let godsWithMasteryVariants = 0;

  for (const god of gods) {
    const skins = god.baseInformation && god.baseInformation.skins;
    if (!skins || typeof skins !== 'object') continue;
    const godFolder = findGodFolderOnDisk(god, diskGods);
    if (!godFolder) {
      skipped += Object.keys(skins).length;
      continue;
    }

    discoveredSkinStubs += discoverMissingSkinFolders(godFolder, skins);

    /** @type {Map<string, { skinKey: string, entry: object }[]>} */
    const dirGroups = new Map();
    const resolutions = [];

    for (const skinKey of Object.keys(skins)) {
      const entry = skins[skinKey];
      if (!entry || typeof entry !== 'object') continue;
      const dir = resolveSkinAssetDir(godFolder, skinKey, entry);
      resolutions.push({ skinKey, entry, dir });
      if (dir) {
        const norm = path.resolve(dir).toLowerCase();
        if (!dirGroups.has(norm)) dirGroups.set(norm, []);
        dirGroups.get(norm).push({ skinKey, entry });
      }
    }

    for (const [, members] of dirGroups) {
      if (members.length <= 1) continue;
      const dirAbs = resolveSkinAssetDir(godFolder, members[0].skinKey, members[0].entry);
      if (!dirAbs) continue;
      const defaultDir = path.join(ROOT, godFolder, 'Default');
      if (path.resolve(dirAbs) === path.resolve(defaultDir)) continue;

      const canon = pickCanonicalSkinKey(dirAbs, members);
      for (const m of members) {
        if (m.skinKey === canon) {
          delete m.entry.hideFromSkinList;
          delete m.entry.hide_from_skin_list;
        } else {
          m.entry.hideFromSkinList = true;
          hiddenDupes += 1;
        }
      }
    }

    for (const { skinKey, entry, dir } of resolutions) {
      if (!dir) {
        skipped += 1;
        continue;
      }
      if (entry.hideFromSkinList || entry.hide_from_skin_list) {
        continue;
      }

      const files = listFiles(dir);
      const cardFile = pickCard(files);
      let iconRel = null;
      const iconBaseName = pickIconBase(files);
      const relDir = path.relative(projectRoot, dir).split(path.sep).join('/');
      if (iconBaseName) {
        iconRel = posixJoin(relDir, iconBaseName);
      }

      const byPrism = collectPrismPairsById(dir);
      if (!iconRel) {
        iconRel = pickIconFallbackFromPrisms(byPrism, projectRoot);
      }

      if (!cardFile && !iconRel) {
        skipped += 1;
        continue;
      }

      let cardPath = null;
      if (cardFile) {
        cardPath = posixJoin(relDir, cardFile);
        entry.cardArt = cardPath;
        entry.skin = cardPath;
      }
      if (iconRel) {
        entry.icon = iconRel;
      }

      const fullFile = pickFullBody(files);
      if (fullFile) {
        entry.inGame = posixJoin(relDir, fullFile);
      }

      const baseCardPath = cardPath || (entry.cardArt ? String(entry.cardArt) : null);
      const baseIconPath = entry.icon ? String(entry.icon) : null;
      const overlays = buildVariantOverlays(dir, projectRoot, baseCardPath, baseIconPath);
      if (overlays.length > 0) {
        entry.variants = overlays;
        prismGroups += 1;
      } else {
        delete entry.variants;
      }

      updated += 1;
    }

    const baseKey = findBaseSkinKey(skins, godFolder, god);
    if (baseKey && skins[baseKey]) {
      const e = skins[baseKey];
      const nonMastery = (e.variants || []).filter((v) => !v.masteryFromDisk);
      const masteryVars = buildMasteryFolderVariants(godFolder, projectRoot);
      if (nonMastery.length > 0 || masteryVars.length > 0) {
        e.variants = [...nonMastery, ...masteryVars];
        if (masteryVars.length > 0) godsWithMasteryVariants += 1;
      } else {
        delete e.variants;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        updatedSkinEntries: updated,
        skippedNoMatchOrAssets: skipped,
        prismVariantSkins: prismGroups,
        hiddenDuplicateSkinRows: hiddenDupes,
        discoveredSkinStubsFromDisk: discoveredSkinStubs,
        godsWithMasteryVariantsOnBase: godsWithMasteryVariants,
        write,
      },
      null,
      2
    )
  );
  if (write) {
    fs.writeFileSync(BUILDS, JSON.stringify(builds, null, 4) + '\n', 'utf8');
    console.log('Wrote', BUILDS);
  } else {
    console.log('Dry-run only. Re-run with --write to save.');
  }
}

main();
