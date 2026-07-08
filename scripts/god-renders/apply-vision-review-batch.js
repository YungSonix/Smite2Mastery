#!/usr/bin/env node
/**
 * Merge vision-review batch JSON files into pantheon skins JSON + screenshot map.
 *
 *   node scripts/god-renders/apply-vision-review-batch.js           # dry-run
 *   node scripts/god-renders/apply-vision-review-batch.js --write
 *   node scripts/god-renders/apply-vision-review-batch.js --batch 3 --write
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, SKINS_DIR } = require('../../config/dataPaths');
const { mergeGodScreenshotMap } = require('./lib/godRenderScreenshotTags');

const REVIEWS_DIR = path.join(__dirname, 'vision-reviews');
const SCREENSHOT_MAP = path.join(SKINS_DIR, '_godRenderScreenshotMap.json');

const STANDARD_LOADOUT_FRAME = {
  focalX: 50,
  focalY: 50,
  zoom: 1.148936170212766,
  aspectWidth: 586,
  aspectHeight: 940,
  cropWidth: 586,
  cropHeight: 940,
};

const PRISM_TIER_BADGE = 'app/data/Tiers/t_FE_Cosmetics_RecolorsTier.png';

function parseArgs(argv) {
  const args = { write: false, batch: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') args.write = true;
    else if (a === '--batch' && argv[i + 1]) args.batch = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function deepMerge(target, patch) {
  if (patch == null) return target;
  if (Array.isArray(patch)) return patch.slice();
  if (typeof patch !== 'object') return patch;
  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function findSkinRow(god, skinKey, variantKey) {
  const skins = god.skins || [];
  const skin = skins.find((s) => normalizeKey(s.skinKey) === normalizeKey(skinKey));
  if (!skin) return null;
  if (!variantKey) return { skin, variant: null };
  const variants = skin.variants || [];
  const key = normalizeKey(variantKey);
  let variant = variants.find(
    (v) =>
      normalizeKey(v.name) === key ||
      normalizeKey(v.variantKey) === key ||
      normalizeKey(v.skinKey) === key ||
      normalizeKey(v.displayName) === key ||
      normalizeKey(v.loadoutMeta?.displayName) === key
  );
  // Prism 1 / Prism 2 … → nth variant on parent skin (by folder order)
  if (!variant && /^prism\s*[\da-z]+$/i.test(String(variantKey).replace(/\s+/g, ''))) {
    const keyRaw = String(variantKey).replace(/\s+/g, '');
    const letterMatch = keyRaw.match(/^prism([a-z])$/i);
    const variants = skin.variants || [];
    if (letterMatch) {
      const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < variants.length) variant = variants[idx];
    } else {
      const n = Number(keyRaw.replace(/\D+/g, ''));
      if (n >= 1 && n <= variants.length) variant = variants[n - 1];
    }
  }
  return { skin, variant };
}

function ensureVariantRow(skin, variantKey, patch) {
  if (!skin) return null;
  skin.variants = skin.variants || [];
  const found = findSkinRow({ skins: [skin] }, skin.skinKey, variantKey);
  if (found.variant) return found.variant;
  const name =
    patch?.name ||
    patch?.loadoutMeta?.screenshotTag?.variantName ||
    String(variantKey || 'Prism').replace(/^prism\s*/i, 'Prism ');
  const row = {
    name,
    ...(patch?.cardArt ? { cardArt: patch.cardArt, skin: patch.skin, icon: patch.icon } : {}),
  };
  skin.variants.push(row);
  return row;
}

function applyPatchToRow(row, patch) {
  if (!row || !patch) return false;
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const prev = JSON.stringify(row[k]);
    row[k] = Array.isArray(v) || (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
    if (JSON.stringify(row[k]) !== prev) changed = true;
  }
  return changed;
}

/** Every vision-reviewed shot must wire `loadout.screenshot` from the PNG path. */
function buildPatchFromShot(shot, godName, row) {
  const screenshot = shot.screenshotPath;
  if (!screenshot) return shot.patch || null;

  const patch = shot.patch ? JSON.parse(JSON.stringify(shot.patch)) : {};
  const vr = shot.visionRead || {};
  const variantTarget = Boolean(shot.target?.variantKey);
  const isPrismShot =
    vr.tier === 'Prisms' ||
    /^prism\s*\d+$/i.test(String(shot.target?.variantKey || '')) ||
    /prism/i.test(String(vr.displayName || ''));

  if (!patch.loadout?.screenshot || patch.loadout.screenshot !== screenshot) {
    patch.loadout = {
      screenshot,
      frame: { ...STANDARD_LOADOUT_FRAME, ...(patch.loadout?.frame || {}) },
    };
  }

  patch.loadoutMeta = patch.loadoutMeta || {};
  if (!patch.loadoutMeta.screenshot) patch.loadoutMeta.screenshot = screenshot;
  if (!patch.loadoutMeta.godName) patch.loadoutMeta.godName = godName;
  if (!patch.loadoutMeta.displayName && vr.displayName) patch.loadoutMeta.displayName = vr.displayName;
  if (!patch.loadoutMeta.rarity && vr.tier) {
    patch.loadoutMeta.rarity = vr.tier === 'Prisms' ? 'Prisms' : vr.tier;
  }
  if (!patch.loadoutMeta.buttonText && (vr.button === 'GO TO' || vr.buttonText === 'GO TO')) {
    patch.loadoutMeta.buttonText = 'GO TO';
  }

  if (variantTarget && isPrismShot) {
    patch.isPrism = true;
    patch.rarity = patch.rarity || 'Prisms';
    patch.tierBadge = patch.tierBadge || PRISM_TIER_BADGE;
    patch.loadoutMeta.gridBadge = patch.loadoutMeta.gridBadge || { type: 'prism' };
    patch.loadoutMeta.rarity = patch.loadoutMeta.rarity || 'Prisms';
  }

  if (!shot.patch && row?.loadout?.screenshot === screenshot) return null;
  return patch;
}

function loadReviewFiles(batchFilter) {
  if (!fs.existsSync(REVIEWS_DIR)) return [];
  return fs
    .readdirSync(REVIEWS_DIR)
    .filter((f) => /^batch-\d+\.json$/i.test(f))
    .filter((f) => (batchFilter == null ? true : Number(f.match(/\d+/)[0]) === batchFilter))
    .sort()
    .map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(REVIEWS_DIR, f), 'utf8')) }));
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log('Usage: node scripts/god-renders/apply-vision-review-batch.js [--write] [--batch N]');
    process.exit(0);
  }

  const reviews = loadReviewFiles(args.batch);
  if (!reviews.length) {
    console.log('No batch-NN.json files in scripts/god-renders/vision-reviews/');
    process.exit(0);
  }

  const pantheonCache = new Map();
  let screenshotMap = JSON.parse(fs.readFileSync(SCREENSHOT_MAP, 'utf8'));
  let totalPatches = 0;
  let totalScreenshotTags = 0;

  for (const { file, data } of reviews) {
    console.log(`\n=== ${file} (batch ${data.batchId}) ===`);
    for (const godEntry of data.gods || []) {
      const pantheonFile = godEntry.pantheonFile;
      if (!pantheonFile) continue;
      const pantheonPath = path.join(SKINS_DIR, pantheonFile);
      if (!pantheonCache.has(pantheonPath)) {
        pantheonCache.set(pantheonPath, JSON.parse(fs.readFileSync(pantheonPath, 'utf8')));
      }
      const pantheon = pantheonCache.get(pantheonPath);
      const god = (pantheon.gods || []).find((g) => normalizeKey(g.godName) === normalizeKey(godEntry.godName));
      if (!god) {
        console.warn(`  skip ${godEntry.godName}: not in ${pantheonFile}`);
        continue;
      }

      for (const shot of godEntry.screenshots || godEntry.shots || []) {
        const target = shot.target || {};
        let found = findSkinRow(god, target.skinKey, target.variantKey);
        if (!found?.skin) {
          console.warn(`  skip ${shot.file}: target ${target.skinKey}/${target.variantKey || '-'}`);
          continue;
        }
        if (target.variantKey && !found.variant) {
          const prePatch = buildPatchFromShot(shot, godEntry.godName, null);
          found.variant = ensureVariantRow(found.skin, target.variantKey, prePatch);
        }
        const row = found.variant || found.skin;
        const patch = buildPatchFromShot(shot, godEntry.godName, row);
        if (patch && applyPatchToRow(row, patch)) {
          totalPatches++;
          console.log(`  patched ${godEntry.godName} ${target.skinKey}${target.variantKey ? '/' + target.variantKey : ''} ← ${shot.file}`);
        }
        if (shot.screenshotTag) {
          screenshotMap = mergeGodScreenshotMap(screenshotMap, godEntry.godName, shot.screenshotTag);
          totalScreenshotTags++;
        }
      }
    }
  }

  console.log(`\nSummary: ${totalPatches} row patches, ${totalScreenshotTags} screenshot tags`);
  if (!args.write) {
    console.log('Dry run — pass --write to save pantheon JSON + _godRenderScreenshotMap.json');
    return;
  }

  for (const [pantheonPath, pantheon] of pantheonCache) {
    fs.writeFileSync(pantheonPath, JSON.stringify(pantheon, null, 2) + '\n', 'utf8');
    console.log('Wrote', path.relative(PROJECT_ROOT, pantheonPath));
  }
  fs.writeFileSync(SCREENSHOT_MAP, JSON.stringify(screenshotMap, null, 2) + '\n', 'utf8');
  console.log('Wrote', path.relative(PROJECT_ROOT, SCREENSHOT_MAP));
  console.log('Run: npm run rebuild-god-render-audit');
}

main();
