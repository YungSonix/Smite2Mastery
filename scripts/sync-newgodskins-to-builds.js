/**
 * Maps `app/data/NewGodSkins/{God}/Skins/{SkinFolder}/` (and `.../{God}/Default/` for base)
 * into `app/data/builds.json` skin entries using repo-relative paths:
 *   `app/data/NewGodSkins/...` (loaded via `getSkinImage` → GitHub raw).
 *
 * Also:
 * - **Prisms**: `*_Prism_*.png` in the skin folder **or** under `Skins/{Skin}/Prisms/` → `variants[]` overlays.
 * - **Tier-tint files** (e.g. Artemis Frostwarden): under `Prisms/` only, names like
 *   `t_SkinCard_*_T1_B.png` / `t_SkinIcon_*_T2_A.png` (no `_Prism_` substring) → one chip per `T{tier}_{letter}`.
 * - **Folder inference**: skin keys that do not match a folder name (e.g. typos) can still resolve using
 *   display `name` tokens (e.g. "Ravenstrike" → `Skins/Ravenstrike`).
 * - **Duplicate keys** pointing at the same folder (legacy per-prism rows) → keep one canonical row, set
 *   `hideFromSkinList: true` on the others so the app shows a single skin with a prism strip.
 * - **Disk discovery**: each subfolder of `Skins/` that is not already represented by a skin row (by key or
 *   name inference) gets a new stub entry so assets can sync. The folder `Mastery` is never a separate skin row.
 * - **Mastery**: files in `Skins/Mastery/` (portraits / optional shared `*Card*Mastery*` card) are merged into
 *   the **base** skin’s `variants[]` (like prisms; portrait-only tiers are OK — splash falls back to base card).
 * - **Palette prisms**: filenames ending in `_P1.png`…`_P4.png` (e.g. Mystic Guardian) become variant chips like
 *   `_Prism_*` files. **`SKIN_FOLDER_REMAP`**: map canonical `builds.json` skin key → on-disk folder (e.g. MysticGuardian → `02A`);
 *   duplicate JSON rows named after the disk folder are removed on each run.
 *
 * - **God-level prism folders**: loose `Skins/Prisms` or `Skins/Prisims` (sibling of skin folders) are
 *   rehomed into `Skins/{ParentSkin}/Prisms/` using filename tokens; orphan `Prisms` JSON rows are removed.
 * - **Preserves** existing `type`, `price`, and `variants[]` when disk has no prism files (only updates paths from matched folders).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'app', 'data', 'NewGodSkins');
const BUILDS = path.join(__dirname, '..', 'app', 'data', 'builds.json');

/**
 * When the on-disk skin folder name (e.g. internal `02A`) does not match `builds.json` skin key
 * (e.g. `MysticGuardian`), map canonical key → folder name so assets + prisms sync to one row.
 */
const STATIC_SKIN_FOLDER_REMAP = {
  Athena: {
    MysticGuardian: '02A',
  },
};

const AUDIT_BATCH_REMAP_FILES = [2, 3, 4, 5, 6, 7].map((n) =>
  path.join(__dirname, `skin-sync-audit-batch-${n}.json`)
);

function deepCloneObject(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function hasAlphaNum(str) {
  return /[a-z0-9]/i.test(String(str || ''));
}

function mergeRemapInto(target, remapLike) {
  if (!isPlainObject(remapLike)) return;
  for (const [godKey, map] of Object.entries(remapLike)) {
    if (!hasAlphaNum(godKey) || !isPlainObject(map)) continue;
    if (!target[godKey]) target[godKey] = {};
    for (const [skinKey, folder] of Object.entries(map)) {
      if (!hasAlphaNum(skinKey) || !hasAlphaNum(folder)) continue;
      target[godKey][skinKey] = String(folder);
    }
  }
}

function loadAuditRemaps() {
  const merged = deepCloneObject(STATIC_SKIN_FOLDER_REMAP);
  for (const file of AUDIT_BATCH_REMAP_FILES) {
    if (!fs.existsSync(file)) continue;
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) continue;
      mergeRemapInto(merged, parsed.SKIN_FOLDER_REMAP);
      mergeRemapInto(merged, parsed.skinFolderRemap);
      mergeRemapInto(merged, parsed.skinFolderRemapSuggestions);
      mergeRemapInto(merged, parsed.remap);
      if (Array.isArray(parsed.gods)) {
        for (const godEntry of parsed.gods) {
          if (!isPlainObject(godEntry)) continue;
          const godFolder = String(godEntry.godFolder || '').trim();
          if (!hasAlphaNum(godFolder)) continue;
          mergeRemapInto(merged, { [godFolder]: godEntry.suggestedRemaps });
        }
      }
    } catch {
      // Ignore malformed audit files to keep sync resilient.
    }
  }
  return merged;
}

const SKIN_FOLDER_REMAP = loadAuditRemaps();

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

function hasNamedToken(filename, token) {
  return new RegExp(`(?:^|_)${token}(?:_|\\.|$)`, 'i').test(String(filename));
}

function isSkinCardFile(filename) {
  return hasNamedToken(filename, 'SkinCard');
}

function isSkinPortraitFile(filename) {
  return hasNamedToken(filename, 'SkinPortrait');
}

function isSkinIconFile(filename) {
  return hasNamedToken(filename, 'SkinIcon');
}

function isGodPortraitFile(filename) {
  return hasNamedToken(filename, 'GodPortrait') || /t_GodPortrait_/i.test(String(filename));
}

function pickCard(files) {
  const godCard = files.find((x) => /^t_GodCard_/i.test(x));
  if (godCard) return godCard;
  const baseSkinCard = files.find((x) => isSkinCardFile(x) && /_Base\./i.test(x));
  if (baseSkinCard) return baseSkinCard;
  const noPrism = files.find((x) => isSkinCardFile(x) && !/Prism/i.test(x));
  if (noPrism) return noPrism;
  return files.find((x) => isSkinCardFile(x)) || null;
}

/** Icons for the default row — skip `_Prism_*` and numeric `_P1`… palette files so base uses neutral portrait. */
function pickIconBase(files) {
  const noPrism = (x) => !/Prism/i.test(x);
  const noPalette = (x) => !/_P\d+\.(png|webp)$/i.test(x);

  const godPort = files.find((x) => isGodPortraitFile(x) && noPrism(x) && noPalette(x));
  if (godPort) return godPort;
  const skinIconN = files.find((x) => isSkinIconFile(x) && noPrism(x) && noPalette(x));
  if (skinIconN) return skinIconN;
  const skinPortraitN = files.find((x) => isSkinPortraitFile(x) && noPrism(x) && noPalette(x));
  if (skinPortraitN) return skinPortraitN;
  return (
    files.find((x) => isSkinIconFile(x) && noPrism(x)) ||
    files.find((x) => isSkinPortraitFile(x) && noPrism(x)) ||
    files.find((x) => isGodPortraitFile(x)) ||
    files.find((x) => /t_GodMini_/i.test(x)) ||
    null
  );
}

/** Icons inside a prism group (filenames are usually *_Prism_*.png). */
function pickIconPrism(files) {
  return (
    files.find((x) => isSkinIconFile(x)) ||
    files.find((x) => isSkinPortraitFile(x)) ||
    files.find((x) => isGodPortraitFile(x)) ||
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

function resolveRemappedSkinDir(godFolder, skinKey) {
  const godMap = SKIN_FOLDER_REMAP[godFolder];
  if (!godMap || !godMap[skinKey]) return null;
  const want = godMap[skinKey];
  const skinsRoot = path.join(ROOT, godFolder, 'Skins');
  if (!fs.existsSync(skinsRoot)) return null;
  const dirs = listSubdirs(skinsRoot);
  const hit = dirs.find((d) => d.toLowerCase() === String(want).toLowerCase());
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
    String(skinKey).toLowerCase() === String(godFolder).toLowerCase();
  if (fs.existsSync(defaultDir) && isBase) return defaultDir;
  return null;
}

function extractPrismId(filename) {
  const m = String(filename).match(/_Pris[i]?m[_-]?([A-Za-z0-9]+)/i);
  return m ? m[1] : null;
}

function extractNumberedVariantId(filename) {
  const name = String(filename);
  if (!/(SkinCard|SkinPortrait|SkinIcon|GodPortrait)/i.test(name)) return null;
  if (/_T\d+_[A-Z]\.(png|webp)$/i.test(name)) return null;
  if (/_P\d+\.(png|webp)$/i.test(name)) return null;
  if (/_Base\.(png|webp)$/i.test(name)) return null;
  const m = name.match(/_(\d{1,2})\.(png|webp)$/i);
  return m ? String(parseInt(m[1], 10)) : null;
}

/**
 * Artemis-style prism folder: `..._T1_B.png`, `..._T2_A.png` (tier + style letter), no `_Prism_` in the name.
 * Only matched when `tierLetterInPrismsSubdir` is true (files scanned from `Skins/{Skin}/Prisms/`).
 */
function extractTierLetterStyleId(filename, tierLetterInPrismsSubdir) {
  if (!tierLetterInPrismsSubdir) return null;
  const m = String(filename).match(/_T(\d+)_([A-Z])\.(png|webp)$/i);
  if (!m) return null;
  return `${parseInt(m[1], 10)}_${m[2].toUpperCase()}`;
}

function findPrismsDirName(skinDir) {
  const subs = listSubdirs(skinDir);
  return subs.find((d) => /^prisms?$/i.test(d)) || null;
}

/**
 * When prism PNGs sit in `Skins/Prisms` (sibling of skin folders) instead of
 * `Skins/{Skin}/Prisms`, infer the parent skin from the filename and move them.
 */
const GOD_LEVEL_PRISM_PARENT_BY_GOD = {
  Cabrakan: 'NerdRage',
};

function extractSkinSlugFromPrismFilename(filename, godFolder) {
  const base = path.basename(filename, path.extname(filename));
  let s = base.replace(/^t_(?:SkinCard|SkinPortrait|SkinIcon|GodPortrait)_/i, '');
  const godEsc = String(godFolder).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  s = s.replace(new RegExp(`^${godEsc}_`, 'i'), '');
  s = s.replace(/_T\d+_Pris[i]?m_[A-Za-z0-9]+$/i, '');
  s = s.replace(/_Pris[i]?m_[A-Za-z0-9]+$/i, '');
  s = s.replace(/_Prism\d+$/i, '');
  s = s.trim();
  if (/^pris[i]?m(_[a-z0-9]+)?$/i.test(s)) return '';
  return s;
}

function matchSkinDirBySiblingPrismId(skinsRoot, filename) {
  const prismId = extractPrismId(filename);
  if (!prismId) return null;
  const dirs = listSubdirs(skinsRoot).filter(
    (d) => !/^mastery$/i.test(d) && !/^pris[i]?ms?$/i.test(d)
  );
  for (const d of dirs) {
    const prismDir = path.join(skinsRoot, d, 'Prisms');
    if (!fs.existsSync(prismDir)) continue;
    const hits = listFiles(prismDir).some((f) => extractPrismId(f) === prismId);
    if (hits) return d;
  }
  return null;
}

function matchSkinDirForPrismSlug(skinsRoot, slug, godFolder, filename) {
  const dirs = listSubdirs(skinsRoot).filter(
    (d) => !/^mastery$/i.test(d) && !/^pris[i]?ms?$/i.test(d)
  );
  if (!slug) {
    const fallback = GOD_LEVEL_PRISM_PARENT_BY_GOD[godFolder];
    if (fallback && dirs.some((d) => d.toLowerCase() === fallback.toLowerCase())) {
      return dirs.find((d) => d.toLowerCase() === fallback.toLowerCase());
    }
    return matchSkinDirBySiblingPrismId(skinsRoot, filename);
  }
  let hit = dirs.find((d) => d.toLowerCase() === slug.toLowerCase());
  if (hit) return hit;
  hit = dirs.find(
    (d) =>
      d.toLowerCase().includes(slug.toLowerCase()) || slug.toLowerCase().includes(d.toLowerCase())
  );
  if (hit) return hit;
  const slugLower = slug.toLowerCase();
  for (const d of dirs) {
    const files = listFiles(path.join(skinsRoot, d));
    if (files.some((f) => f.toLowerCase().includes(slugLower))) return d;
  }
  return null;
}

function findGodLevelPrismDir(skinsRoot) {
  for (const d of listSubdirs(skinsRoot)) {
    if (/^pris[i]?ms?$/i.test(d)) return path.join(skinsRoot, d);
  }
  return null;
}

function rehomeGodLevelPrismFolders(godFolder) {
  const skinsRoot = path.join(ROOT, godFolder, 'Skins');
  const looseDir = findGodLevelPrismDir(skinsRoot);
  if (!looseDir) return { movedFiles: 0, targetFolders: [] };

  const files = listFiles(looseDir);
  if (files.length === 0) {
    try {
      fs.rmdirSync(looseDir);
    } catch {
      // ignore
    }
    return { movedFiles: 0, targetFolders: [] };
  }

  const byTarget = new Map();
  for (const name of files) {
    const slug = extractSkinSlugFromPrismFilename(name, godFolder);
    const targetSkin = matchSkinDirForPrismSlug(skinsRoot, slug, godFolder, name);
    if (!targetSkin) continue;
    if (!byTarget.has(targetSkin)) byTarget.set(targetSkin, []);
    byTarget.get(targetSkin).push(name);
  }

  let movedFiles = 0;
  const targetFolders = [];
  for (const [targetSkin, names] of byTarget) {
    const destDir = path.join(skinsRoot, targetSkin, 'Prisms');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    targetFolders.push(targetSkin);
    for (const name of names) {
      const src = path.join(looseDir, name);
      const dest = path.join(destDir, name);
      if (fs.existsSync(dest)) {
        try {
          fs.unlinkSync(src);
        } catch {
          // ignore
        }
        continue;
      }
      fs.renameSync(src, dest);
      movedFiles += 1;
    }
  }

  const remaining = listFiles(looseDir);
  if (remaining.length === 0) {
    try {
      fs.rmdirSync(looseDir);
    } catch {
      // ignore
    }
  }

  return { movedFiles, targetFolders: [...new Set(targetFolders)] };
}

function stripOrphanPrismSkinKeys(skins) {
  let removed = 0;
  for (const key of [...Object.keys(skins)]) {
    if (/^pris[i]?ms?$/i.test(key)) {
      delete skins[key];
      removed += 1;
    }
  }
  return removed;
}

/** e.g. `_Prism_B` → `prism:B`; `.../Prisms/..._T1_B` → `tierstyle:1_B`; `_P2.png` → `palette:2` */
function variantGroupKeyFromFilename(filename, tierLetterInPrismsSubdir) {
  const prism = extractPrismId(filename);
  if (prism) return `prism:${prism}`;
  const tierId = extractTierLetterStyleId(filename, tierLetterInPrismsSubdir);
  if (tierId) return `tierstyle:${tierId}`;
  const numbered = extractNumberedVariantId(filename);
  if (numbered) return `numbered:${numbered}`;
  const m = String(filename).match(/_P(\d+)\.(png|webp)$/i);
  if (m) return `palette:${m[1]}`;
  return null;
}

/** Match icon/card/god portrait to the same variant key as the chosen card (multi-variant folders). */
function pairVariantKeyFromFilename(filename, tierLetterInPrismsSubdir) {
  const p = extractPrismId(filename);
  if (p) return `prism:${p}`;
  const tierId = extractTierLetterStyleId(filename, tierLetterInPrismsSubdir);
  if (tierId) return `tierstyle:${tierId}`;
  const numbered = extractNumberedVariantId(filename);
  if (numbered) return `numbered:${numbered}`;
  const m = String(filename).match(/_P(\d+)\.(png|webp)$/i);
  if (m) return `palette:${m[1]}`;
  return null;
}

function pickIconForVariant(names, cardName, tierLetterInPrismsSubdirForCard) {
  if (!cardName) return pickIconPrism(names);
  const cardKey = pairVariantKeyFromFilename(cardName, tierLetterInPrismsSubdirForCard);
  if (!cardKey) return pickIconPrism(names);
  const hit = names.find(
    (n) =>
      (isSkinIconFile(n) || isGodPortraitFile(n) || isSkinPortraitFile(n)) &&
      pairVariantKeyFromFilename(n, tierLetterInPrismsSubdirForCard) === cardKey
  );
  return hit || pickIconPrism(names);
}

function collectVariantPairsById(skinDir) {
  const byKey = new Map();
  function pushPair(key, dir, name) {
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ dir, name });
  }
  for (const name of listFiles(skinDir)) {
    const key = variantGroupKeyFromFilename(name, false);
    if (key) pushPair(key, skinDir, name);
  }
  const pName = findPrismsDirName(skinDir);
  if (pName) {
    const pDir = path.join(skinDir, pName);
    for (const name of listFiles(pDir)) {
      const key = variantGroupKeyFromFilename(name, true);
      if (key) pushPair(key, pDir, name);
    }
  }
  return byKey;
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

function sortTierStyleKeys(keys) {
  const tierKeys = keys.filter((k) => k.startsWith('tierstyle:'));
  return tierKeys.sort((a, b) => {
    const ra = a.slice('tierstyle:'.length);
    const rb = b.slice('tierstyle:'.length);
    const ma = ra.match(/^(\d+)_([A-Z])$/);
    const mb = rb.match(/^(\d+)_([A-Z])$/);
    if (ma && mb) {
      const d = parseInt(ma[1], 10) - parseInt(mb[1], 10);
      if (d !== 0) return d;
      return ma[2].localeCompare(mb[2]);
    }
    return ra.localeCompare(rb);
  });
}

function sortVariantGroupKeys(keys) {
  const palettes = keys
    .filter((k) => k.startsWith('palette:'))
    .sort((a, b) => parseInt(a.split(':')[1], 10) - parseInt(b.split(':')[1], 10));
  const tierStyles = sortTierStyleKeys(keys);
  const numbered = keys
    .filter((k) => k.startsWith('numbered:'))
    .sort((a, b) => parseInt(a.split(':')[1], 10) - parseInt(b.split(':')[1], 10));
  const prismKeys = keys.filter((k) => k.startsWith('prism:'));
  const prismIds = prismKeys.map((k) => k.split(':')[1]);
  const sortedPrismIds = sortPrismIds(prismIds);
  const prisms = sortedPrismIds.map((id) => `prism:${id}`).filter((k) => keys.includes(k));
  return [...palettes, ...tierStyles, ...numbered, ...prisms];
}

function pickIconFallbackFromVariants(byKey, projectRoot) {
  for (const mapKey of sortVariantGroupKeys([...byKey.keys()])) {
    const pairs = byKey.get(mapKey);
    const names = pairs.map((p) => p.name);
    const cardName = pickCard(names);
    const tierLetterHere = mapKey.startsWith('tierstyle:');
    const iconName = pickIconForVariant(names, cardName, tierLetterHere);
    if (iconName) {
      const dir = pairs.find((p) => p.name === iconName).dir;
      return relFromDir(projectRoot, dir, iconName);
    }
  }
  return null;
}

function buildVariantOverlays(skinDir, projectRoot, baseCardPath, baseIconPath) {
  const byKey = collectVariantPairsById(skinDir);
  if (byKey.size === 0) return [];

  const overlays = [];
  for (const mapKey of sortVariantGroupKeys([...byKey.keys()])) {
    const pairs = byKey.get(mapKey);
    const names = pairs.map((p) => p.name);
    const cardName = pickCard(names);
    const tierLetterHere = mapKey.startsWith('tierstyle:');
    const iconName = pickIconForVariant(names, cardName, tierLetterHere);
    const fullName = pickFullBody(names);

    const colon = mapKey.indexOf(':');
    const kind = colon >= 0 ? mapKey.slice(0, colon) : '';
    const rawId = colon >= 0 ? mapKey.slice(colon + 1) : mapKey;
    let variantLabel;
    if (kind === 'tierstyle') {
      const m = String(rawId).match(/^(\d+)_([A-Z])$/);
      variantLabel = m ? `Prism T${m[1]} ${m[2]}` : `Prism ${rawId}`;
    } else if (kind === 'numbered') {
      const n = parseInt(String(rawId), 10);
      variantLabel = Number.isNaN(n) ? `Prism ${rawId}` : `Prism ${n}`;
    } else if (kind === 'prism') {
      const n = parseInt(String(rawId), 10);
      variantLabel = Number.isNaN(n) ? `Prism ${String(rawId).toUpperCase()}` : `Prism ${n}`;
    } else {
      variantLabel = `Prism P${rawId}`;
    }
    const o = {
      name: variantLabel,
    };
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

/** Any existing skin row already resolves to this `Skins/{folderName}` directory (includes remaps). */
function isFolderCoveredByExistingSkin(godFolder, skinsRoot, skins, folderName) {
  for (const skinKey of Object.keys(skins)) {
    const entry = skins[skinKey];
    if (!entry || typeof entry !== 'object') continue;
    const resolved = resolveSkinAssetDir(godFolder, skinKey, entry);
    if (!resolved) continue;
    const sub = path.basename(resolved);
    if (sub === folderName || sub.toLowerCase() === String(folderName).toLowerCase()) return true;
  }
  return false;
}

function diskFolderIsOnlyRemapTarget(godFolder, folderName) {
  const m = SKIN_FOLDER_REMAP[godFolder];
  if (!m) return false;
  return Object.values(m).some(
    (v) => v === folderName || String(v).toLowerCase() === String(folderName).toLowerCase()
  );
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
    // Prism asset folders are merged into parent skin variants[], not separate picker rows.
    if (/^pris[i]?ms?$/i.test(d)) continue;
    if (diskFolderIsOnlyRemapTarget(godFolder, d)) continue;
    if (isFolderCoveredByExistingSkin(godFolder, skinsRoot, skins, d)) continue;
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

/**
 * When `Default/` has base assets but no skin row resolves there as Base Skin, add or retag a stub
 * so the main sync loop wires `t_GodCard_*` / `t_GodPortrait_*` / `T_GodFull_*` paths.
 */
function ensureDefaultBaseSkinStub(godFolder, skins, god) {
  const defaultDir = path.join(ROOT, godFolder, 'Default');
  if (!fs.existsSync(defaultDir)) return 0;

  const files = listFiles(defaultDir);
  if (!pickCard(files) && !pickIconBase(files)) return 0;

  for (const skinKey of Object.keys(skins)) {
    const entry = skins[skinKey];
    if (!entry || typeof entry !== 'object') continue;
    const type = String(entry.type || '');
    const nm = String(entry.name || '');
    const isBase =
      /base skin/i.test(type) ||
      /\bbase\b/i.test(nm) ||
      skinKey === godFolder ||
      String(skinKey).toLowerCase() === String(godFolder).toLowerCase();
    if (!isBase) continue;
    const dir = resolveSkinAssetDir(godFolder, skinKey, entry);
    if (dir && path.resolve(dir) === path.resolve(defaultDir)) return 0;
  }

  const display = String(god.name || god.GodName || godFolder).trim();
  const compactDisplay = display.replace(/\s+/g, '');
  let baseKey = godFolder;
  if (skins[baseKey] && !/base skin/i.test(String(skins[baseKey].type || ''))) {
    if (!skins[compactDisplay]) baseKey = compactDisplay;
    else if (!skins[display]) baseKey = display;
  }

  if (!skins[baseKey]) {
    skins[baseKey] = {
      name: display,
      skin: '',
      type: 'Base Skin',
      price: { diamonds: '0' },
    };
    return 1;
  }

  const entry = skins[baseKey];
  if (!/base skin/i.test(String(entry.type || ''))) {
    entry.type = 'Base Skin';
    if (!entry.name) entry.name = display;
    if (!entry.price) entry.price = { diamonds: '0' };
    return 1;
  }
  return 0;
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
  let prunedRemappedDuplicateSkinKeys = 0;
  let prunedOrphanPrismSkinKeys = 0;
  let rehomedGodLevelPrismFiles = 0;
  const rehomedGodLevelPrismTargets = [];
  let ensuredDefaultBaseStubs = 0;
  const skippedGods = new Set();

  for (const god of gods) {
    const skins = god.baseInformation && god.baseInformation.skins;
    if (!skins || typeof skins !== 'object') continue;
    const godFolder = findGodFolderOnDisk(god, diskGods);
    if (!godFolder) {
      skipped += Object.keys(skins).length;
      skippedGods.add(String(god.name || god.GodName || god.internalName || 'Unknown'));
      continue;
    }

    const rehome = rehomeGodLevelPrismFolders(godFolder);
    rehomedGodLevelPrismFiles += rehome.movedFiles;
    for (const t of rehome.targetFolders) rehomedGodLevelPrismTargets.push(`${godFolder}/${t}`);
    prunedOrphanPrismSkinKeys += stripOrphanPrismSkinKeys(skins);

    const godRemap = SKIN_FOLDER_REMAP[godFolder];
    if (godRemap) {
      for (const diskFolder of new Set(Object.values(godRemap))) {
        if (skins[diskFolder]) {
          delete skins[diskFolder];
          prunedRemappedDuplicateSkinKeys += 1;
        }
      }
    }

    discoveredSkinStubs += discoverMissingSkinFolders(godFolder, skins);
    ensuredDefaultBaseStubs += ensureDefaultBaseSkinStub(godFolder, skins, god);

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
        skippedGods.add(String(god.name || god.GodName || god.internalName || godFolder));
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

      const byVariants = collectVariantPairsById(dir);
      if (!iconRel) {
        iconRel = pickIconFallbackFromVariants(byVariants, projectRoot);
      }

      if (!cardFile && !iconRel) {
        skipped += 1;
        skippedGods.add(String(god.name || god.GodName || god.internalName || godFolder));
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
      }
      // If disk has no prism files, keep existing variants (do not wipe on failed/partial folder match).

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
        prunedRemappedDuplicateSkinKeys,
        prunedOrphanPrismSkinKeys,
        rehomedGodLevelPrismFiles,
        rehomedGodLevelPrismTargets,
        ensuredDefaultBaseStubs,
        skippedGodsCount: skippedGods.size,
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
