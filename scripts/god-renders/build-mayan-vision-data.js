#!/usr/bin/env node
/**
 * Build scripts/god-renders/.vision-tag-mayan-data.json from Mayan.json loadoutMeta
 * (vision-verified panel text already embedded in pantheon JSON).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../../config/dataPaths');
const { normalizeFolderKey } = require('./lib/godRenderFolderAliases');

const MAYAN_PATH = path.join(PROJECT_ROOT, 'app/data/God Information/Skins/Mayan.json');
const OUT_PATH = path.join(PROJECT_ROOT, 'scripts/god-renders/.vision-tag-mayan-data.json');

const FOLDER_BY_GOD = {
  'ah puch': 'ah puch',
  awilix: 'awilix',
  cabrakan: 'cabrakan',
  chaac: 'chaac',
  'hun batz': 'hun batz',
  kukulkan: 'kukulkan',
  xbalanque: 'xbalanque',
};

function folderFromScreenshot(screenshot) {
  const m = String(screenshot || '').match(/God Renders\/([^/]+)\//i);
  return m ? m[1] : null;
}

function fileNameFromScreenshot(screenshot) {
  const m = String(screenshot || '').match(/\/([^/]+\.png)$/i);
  return m ? m[1] : null;
}

function metaToExtraction(meta, skin, variant) {
  const screenshot = meta.screenshot || skin?.loadout?.screenshot;
  if (!screenshot) return null;

  const tag = meta.screenshotTag || {};
  const row = {
    fileName: tag.fileName || fileNameFromScreenshot(screenshot),
    displayName: meta.displayName,
    tier: tag.tier ?? meta.rarity ?? null,
    information: meta.information || skin?.information || variant?.information || null,
    buttonText: meta.buttonText || null,
  };

  if (tag.skinKey || skin?.skinKey) row.matchSkinKey = tag.skinKey || skin.skinKey;
  if (tag.variantName || variant?.name) row.matchVariantName = tag.variantName || variant.name;
  if (tag.skinName && tag.target === 'variant') row.parentSkinName = tag.parentSkinName || tag.skinName;
  if (variant?.name) {
    row.variantName = variant.name;
    row.parentSkinName = tag.parentSkinName || skin?.skinName;
  }

  const cost = tag.cost ?? (skin?.cost != null ? { ...skin.cost, owned: skin.cost?.owned } : null);
  if (cost) {
    if (cost.currency === 'diamonds' && cost.amount != null) {
      row.cost = { currency: 'diamonds', amount: String(cost.amount), owned: cost.owned ?? false };
    } else if (cost.navigateOnly || cost.currency == null) {
      row.cost = { currency: null, amount: null, navigateOnly: true };
    } else {
      row.cost = cost;
    }
  } else if (skin?.isBaseSkin) {
    row.cost = { currency: 'diamonds', amount: '0', owned: true };
    row.unlock = skin.unlock || { source: 'base', displayText: 'Base god' };
  }

  if (skin?.unlock && !row.unlock) row.unlock = skin.unlock;
  if (variant?.unlock && !row.unlock) row.unlock = variant.unlock;
  if (meta.gridBadge) row.gridBadge = meta.gridBadge;

  return row;
}

function collectGodExtractions(god) {
  const byFile = new Map();

  function add(row, screenshot) {
    if (!row?.fileName) return;
    if (byFile.has(row.fileName)) return;
    byFile.set(row.fileName, row);
  }

  for (const skin of god.skins || []) {
    if (skin.loadoutMeta) {
      add(metaToExtraction(skin.loadoutMeta, skin), skin.loadout?.screenshot);
    } else if (skin.loadout?.screenshot && skin.isBaseSkin) {
      add(
        {
          fileName: fileNameFromScreenshot(skin.loadout.screenshot),
          displayName: 'Base',
          tier: null,
          cost: { currency: 'diamonds', amount: '0', owned: true },
          unlock: { source: 'base', displayText: 'Base god' },
        },
        skin.loadout.screenshot
      );
    }

    for (const variant of skin.variants || []) {
      if (variant.loadoutMeta) {
        add(metaToExtraction(variant.loadoutMeta, skin, variant), variant.loadout?.screenshot);
      }
    }
  }

  const shots = [...byFile.values()];
  const folder =
    folderFromScreenshot(shots[0] && `app/data/God Renders/x/${shots[0].fileName}`) ||
    FOLDER_BY_GOD[normalizeFolderKey(god.godName)] ||
    god.godName.toLowerCase();

  const folderFromFirst = (() => {
    for (const skin of god.skins || []) {
      const s = skin.loadout?.screenshot || skin.loadoutMeta?.screenshot;
      const f = folderFromScreenshot(s);
      if (f) return f;
      for (const v of skin.variants || []) {
        const vf = folderFromScreenshot(v.loadout?.screenshot || v.loadoutMeta?.screenshot);
        if (vf) return vf;
      }
    }
    return folder;
  })();

  shots.sort((a, b) => {
    const na = parseInt(a.fileName.replace(/\D/g, ''), 10);
    const nb = parseInt(b.fileName.replace(/\D/g, ''), 10);
    return na - nb;
  });

  return { folder: folderFromFirst, godName: god.godName, extractions: shots };
}

function main() {
  const mayan = JSON.parse(fs.readFileSync(MAYAN_PATH, 'utf8'));
  const gods = (mayan.gods || []).map(collectGodExtractions);
  const totalShots = gods.reduce((n, g) => n + g.extractions.length, 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    note: `Mayan pantheon (7 gods). Vision-verified panel text; ${totalShots} PNGs from loadoutMeta.`,
    gods,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUT_PATH} (${gods.length} gods, ${totalShots} shots)`);
}

main();
