#!/usr/bin/env node
/**
 * Restore skin loadout metadata from `_godRenderScreenshotMap.json` into pantheon JSON.
 *
 * This is a fast repair pass for when `loadout` / `loadoutMeta` fields are stripped
 * from `app/data/God Information/Skins/*.json` but the screenshot audit map remains.
 *
 *   node scripts/god-renders/restore-loadouts-from-screenshot-map.js
 *   node scripts/god-renders/restore-loadouts-from-screenshot-map.js --write
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { SKINS_DIR } = require('../../config/dataPaths');
const { tierBadgeRelPath } = require('./lib/godRenderTiers');
const { loadoutFrameDefaults } = require('./lib/godRenderUiRegions');

const WRITE = process.argv.includes('--write');
const MAP_PATH = path.join(SKINS_DIR, '_godRenderScreenshotMap.json');

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function pantheonFiles() {
  return fs
    .readdirSync(SKINS_DIR)
    .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
    .sort((a, b) => a.localeCompare(b));
}

function buildGodIndex() {
  const index = new Map();
  for (const file of pantheonFiles()) {
    const filePath = path.join(SKINS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const god of data.gods || []) {
      index.set(normalizeKey(god.godName), { file, filePath, data, god });
    }
  }
  return index;
}

function entryAssetText(entry) {
  const assets = entry?.assets || {};
  return [
    entry?.skinKey,
    entry?.skinName,
    entry?.type,
    assets.skin,
    assets.cardArt,
    assets.icon,
    entry?.skin,
    entry?.cardArt,
    entry?.icon,
  ]
    .filter(Boolean)
    .join(' ');
}

function tagCrossGenSkins(god) {
  let tagged = 0;
  for (const skin of god.skins || []) {
    const text = entryAssetText(skin);
    if (/cross\s*gen|crossgen|playstation|xbox/i.test(text)) {
      if (!skin.isCrossGen) tagged += 1;
      skin.isCrossGen = true;
    }
  }
  return tagged;
}

function findSkin(god, tag) {
  const skins = god.skins || [];
  const key = normalizeKey(tag.skinKey);
  const name = normalizeKey(tag.skinName);
  if (key) {
    const byKey = skins.find((skin) => normalizeKey(skin.skinKey) === key);
    if (byKey) return byKey;
  }
  if (name) {
    const byName = skins.find((skin) => normalizeKey(skin.skinName) === name);
    if (byName) return byName;
  }
  return null;
}

function findVariant(skin, tag) {
  const variants = skin?.variants || [];
  const name = normalizeKey(tag.variantName);
  if (!name) return null;
  const byName = variants.find((variant) => normalizeKey(variant.name) === name);
  if (byName) return byName;

  const slot = String(tag.variantName || '').match(/^Prism\s+(\d+)$/i);
  if (slot) {
    const index = Number(slot[1]) - 1;
    if (index >= 0 && index < variants.length) return variants[index];
  }
  return null;
}

function applyTagToEntry(entry, tag, godName) {
  if (!entry || !tag?.screenshot) return false;

  entry.loadout = {
    screenshot: tag.screenshot,
    frame: loadoutFrameDefaults(),
  };
  entry.loadoutMeta = {
    godName,
    displayName: tag.displayName || tag.skinName || tag.variantName || entry.skinName || entry.name || '',
    rarity: tag.tier || null,
    screenshot: tag.screenshot,
    extractedAt: new Date().toISOString().slice(0, 10),
    screenshotTag: { ...tag },
  };

  if (tag.tier && !entry.isBaseSkin) {
    entry.rarity = tag.tier;
    entry.tierBadge = tierBadgeRelPath(tag.tier) || entry.tierBadge;
  }
  if (tag.tier === 'Prisms') entry.isPrism = true;

  if (tag.cost?.amount != null) {
    const amount = String(tag.cost.amount);
    entry.cost = { currency: tag.cost.currency || 'diamonds', amount };
    entry.price = { ...(entry.price || {}), diamonds: amount };
  }

  return true;
}

function main() {
  if (!fs.existsSync(MAP_PATH)) {
    console.error(`Missing ${MAP_PATH}`);
    process.exit(1);
  }

  const screenshotMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')).gods || {};
  const godIndex = buildGodIndex();
  const touchedFiles = new Set();
  const stats = {
    appliedSkins: 0,
    appliedVariants: 0,
    crossGenTagged: 0,
    missingGods: 0,
    missingTargets: 0,
  };

  for (const entries of Object.values(screenshotMap)) {
    for (const tag of Object.values(entries || {})) {
      const hit = godIndex.get(normalizeKey(tag.godName));
      if (!hit) {
        stats.missingGods += 1;
        continue;
      }

      stats.crossGenTagged += tagCrossGenSkins(hit.god);

      const skin = findSkin(hit.god, tag);
      if (!skin) {
        stats.missingTargets += 1;
        continue;
      }

      let applied = false;
      if (tag.target === 'variant' || tag.variantName) {
        const variant = findVariant(skin, tag);
        if (variant) {
          applied = applyTagToEntry(variant, tag, hit.god.godName);
          if (applied) stats.appliedVariants += 1;
        }
      } else {
        applied = applyTagToEntry(skin, tag, hit.god.godName);
        if (applied) stats.appliedSkins += 1;
      }

      if (applied) touchedFiles.add(hit.file);
      if (!applied) stats.missingTargets += 1;
    }
  }

  if (WRITE) {
    for (const file of touchedFiles) {
      const hit = [...godIndex.values()].find((entry) => entry.file === file);
      fs.writeFileSync(hit.filePath, JSON.stringify(hit.data, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`${WRITE ? 'Restored' : 'Would restore'} god-render loadouts from screenshot map`);
  console.log(`  Skin loadouts:    ${stats.appliedSkins}`);
  console.log(`  Variant loadouts: ${stats.appliedVariants}`);
  console.log(`  Cross-gen tags:   ${stats.crossGenTagged}`);
  console.log(`  Files touched:    ${touchedFiles.size}`);
  console.log(`  Missing gods:     ${stats.missingGods}`);
  console.log(`  Missing targets:  ${stats.missingTargets}`);
  if (!WRITE) console.log('Dry run only — pass --write to apply.');
}

main();
