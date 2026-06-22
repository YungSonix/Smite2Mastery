#!/usr/bin/env node
/**
 * Agent C — apply vision tags to Norse.json, Mayan.json, Chinese.json only.
 *
 *   node scripts/apply-vision-tags-agent-c.js --write
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, SKINS_DIR } = require('../config/dataPaths');
const { loadoutFrameDefaults } = require('./lib/godRenderUiRegions');
const { tierBadgeRelPath } = require('./lib/godRenderTiers');
const {
  normalizeKey,
  findPantheonFileForGod,
  mergeExtractionsIntoGod,
  promoteMasteryShadowInGodSkinsArray,
  removeMasteryLightInGodSkinsArray,
} = require('./extract-god-render-metadata');
const { shadowSkinRowFromVariant } = require('./lib/godSkinsPaths');
const { baseShot, shadowShot, masteryShot } = require('./lib/visionTagTemplates');

const LOG_PATH = path.join(PROJECT_ROOT, 'scripts', '.vision-tag-agent-c.log');
const NORSE_PATH = path.join(PROJECT_ROOT, 'scripts', '.vision-tag-norse-batch-b-data.json');
const MAYAN_PATH = path.join(PROJECT_ROOT, 'scripts', '.vision-tag-agent-c-mayan-data.json');
const CHINESE_MAP_PATH = path.join(PROJECT_ROOT, 'scripts', 'vision-tag-batch-c-mappings.json');

const AGENT_C_FILES = new Set(['Norse.json', 'Mayan.json', 'Chinese.json']);

const CHINESE_GODS = new Set([
  'Da Ji', 'Guan Yu', 'Hou Yi', 'Hua Mulan', 'Jing Wei', 'Ne Zha', 'Nu Wa', 'Sun Wukong',
]);

const NORSE_GODS = new Set([
  'Fenrir', 'Jormungandr', 'Loki', 'Odin', 'Ratatoskr', 'Sol', 'Thor', 'Ullr', 'Ymir',
]);

const MAYAN_GODS = new Set([
  'Ah Puch', 'Awilix', 'Cabrakan', 'Chaac', 'Hun Batz', 'Kukulkan', 'Xbalanque',
]);

function log(line) {
  fs.appendFileSync(LOG_PATH, `${line}\n`, 'utf8');
  console.log(line);
}

function ensureStandaloneShadowSkin(god) {
  if (!Array.isArray(god.skins)) return;
  const exists = god.skins.some(
    (s) =>
      !s.isBaseSkin &&
      (s.isMasteryShadowSkin || normalizeKey(s.skinKey) === 'shadow' || /^shadow$/i.test(s.skinName || ''))
  );
  if (exists) return;
  const folder = String(god.godName || '').replace(/\s+/g, '');
  const cardArt = `app/data/NewGodSkins/${folder}/Skins/Mastery/t_${folder}_Card_Mastery.png`;
  const icon = `app/data/NewGodSkins/${folder}/Skins/Mastery/T_${folder}_Icon_Shadow.png`;
  god.skins.push(
    shadowSkinRowFromVariant(god.godName, {
      name: 'Shadow',
      masteryFromDisk: true,
      cardArt,
      skin: cardArt,
      icon,
    })
  );
}

function buildExtraction(row) {
  const screenshot =
    row.screenshot ||
    `app/data/God Renders/${row.folder}/${row.fileName}`.replace(/\\/g, '/');
  const tier = row.tier || null;
  return {
    screenshot,
    godName: row.godName,
    displayName: row.displayName,
    parentSkinName: row.parentSkinName || null,
    variantName: row.variantName || null,
    tier,
    tierBadge: tier ? tierBadgeRelPath(tier) : null,
    cost: row.cost || null,
    unlock: row.unlock || null,
    information: row.information || null,
    carousel: row.carousel || null,
    grid: row.grid || (row.gridBadge ? { badge: row.gridBadge } : undefined),
    matchSkinKey: row.matchSkinKey || null,
    matchVariantName: row.matchVariantName || null,
    loadout: {
      screenshot,
      frame: loadoutFrameDefaults(row.frame || {}),
    },
  };
}

function mappingToExtraction(row) {
  const folder = row.folder || row.godName.toLowerCase();
  const screenshot = `app/data/God Renders/${folder}/${row.fileName}`;
  const base = {
    folder,
    fileName: row.fileName,
    godName: row.godName,
    displayName: row.displayName,
    screenshot,
    tier: row.tier || row.rarity || null,
    cost: row.cost || null,
    unlock: row.unlock || null,
    gridBadge: row.gridBadge || null,
    matchSkinKey: row.skinKey || null,
    matchVariantName: row.variantName || null,
    parentSkinName: row.variantName ? row.skinName : null,
    variantName: row.variantName || null,
  };

  if (row.displayName === 'Base') {
    return { ...baseShot(row.fileName), folder, godName: row.godName };
  }
  if (row.displayName === 'Shadow' || normalizeKey(row.skinKey) === 'shadow') {
    return { ...shadowShot(row.fileName), folder, godName: row.godName };
  }
  if (/^(Onyx|Opal|Radiant)$/.test(row.displayName)) {
    return { ...masteryShot(row.fileName, row.displayName), folder, godName: row.godName };
  }
  return base;
}

function loadGodBlocks() {
  const blocks = [];

  if (fs.existsSync(NORSE_PATH)) {
    const norse = JSON.parse(fs.readFileSync(NORSE_PATH, 'utf8'));
    for (const g of norse.gods || []) {
      if (NORSE_GODS.has(g.godName)) blocks.push(g);
    }
  }

  if (fs.existsSync(MAYAN_PATH)) {
    const mayan = JSON.parse(fs.readFileSync(MAYAN_PATH, 'utf8'));
    blocks.push(...(mayan.gods || []));
  }

  if (fs.existsSync(CHINESE_MAP_PATH)) {
    const mappings = JSON.parse(fs.readFileSync(CHINESE_MAP_PATH, 'utf8'));
    const byGod = {};
    for (const row of mappings) {
      if (!CHINESE_GODS.has(row.godName)) continue;
      if (!byGod[row.godName]) {
        byGod[row.godName] = {
          folder: row.folder,
          godName: row.godName,
          extractions: [],
        };
      }
      byGod[row.godName].extractions.push(mappingToExtraction(row));
    }
    blocks.push(...Object.values(byGod));
  }

  return blocks;
}

function main() {
  const write = process.argv.includes('--write');
  fs.writeFileSync(LOG_PATH, `# vision-tag agent C — ${new Date().toISOString()}\n\n`, 'utf8');

  const godBlocks = loadGodBlocks();
  const byPantheon = {};
  const stats = {
    pantheons: AGENT_C_FILES.size,
    gods: 0,
    shots: 0,
    applied: 0,
    failed: 0,
    problems: [],
    perPantheon: {},
  };

  for (const file of AGENT_C_FILES) {
    stats.perPantheon[file] = { gods: 0, applied: 0, failed: 0, shots: 0 };
  }

  for (const godBlock of godBlocks) {
    const godName = godBlock.godName;
    const folder = godBlock.folder;
    const pantheonHit = findPantheonFileForGod(godName);
    if (!pantheonHit || !AGENT_C_FILES.has(pantheonHit.file)) {
      stats.problems.push({ god: godName, reason: 'not in agent C pantheon files' });
      log(`SKIP ${godName}: not in Norse/Mayan/Chinese JSON`);
      continue;
    }

    if (!byPantheon[pantheonHit.file]) {
      byPantheon[pantheonHit.file] = JSON.parse(
        fs.readFileSync(path.join(SKINS_DIR, pantheonHit.file), 'utf8')
      );
    }
    const data = byPantheon[pantheonHit.file];
    const god = data.gods.find((g) => normalizeKey(g.godName) === normalizeKey(godName));
    if (!god) {
      stats.problems.push({ god: godName, reason: 'god missing from pantheon JSON' });
      log(`FAIL ${godName}: missing from ${pantheonHit.file}`);
      continue;
    }

    for (const skin of god.skins || []) {
      if (skin.isBaseSkin) {
        skin.rarity = null;
        skin.isPrism = false;
        delete skin.tierBadge;
        if (!skin.unlock || skin.unlock.source !== 'base') {
          skin.unlock = { source: 'base', displayText: 'Default god skin' };
        }
      }
    }

    ensureStandaloneShadowSkin(god);
    promoteMasteryShadowInGodSkinsArray(god);
    removeMasteryLightInGodSkinsArray(god);

    const extractions = (godBlock.extractions || []).map((row) =>
      buildExtraction({ ...row, folder, godName })
    );
    stats.gods += 1;
    stats.shots += extractions.length;
    stats.perPantheon[pantheonHit.file].gods += 1;
    stats.perPantheon[pantheonHit.file].shots += extractions.length;

    const { report } = mergeExtractionsIntoGod(god, extractions);

    log(`## ${godName} (${folder}) → ${pantheonHit.file}`);
    for (const row of report) {
      const fileName = path.basename(row.extracted.screenshot || '');
      if (row.ok) {
        stats.applied += 1;
        stats.perPantheon[pantheonHit.file].applied += 1;
        log(`OK  ${fileName} → ${row.appliedTo} · ${row.extracted.displayName}`);
      } else {
        stats.failed += 1;
        stats.perPantheon[pantheonHit.file].failed += 1;
        stats.problems.push({
          god: godName,
          file: fileName,
          displayName: row.extracted.displayName,
          reason: row.reason,
        });
        log(`FAIL ${fileName} · ${row.extracted.displayName} (${row.reason})`);
      }
    }
    log('');

    promoteMasteryShadowInGodSkinsArray(god);
    removeMasteryLightInGodSkinsArray(god);
  }

  if (write) {
    for (const [file, data] of Object.entries(byPantheon)) {
      for (const god of data.gods || []) {
        promoteMasteryShadowInGodSkinsArray(god);
        removeMasteryLightInGodSkinsArray(god);
      }
      const outPath = path.join(SKINS_DIR, file);
      fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      log(`WROTE ${file}`);
    }
  }

  log('---');
  log(`gods=${stats.gods} shots=${stats.shots} applied=${stats.applied} failed=${stats.failed} write=${write}`);
  for (const [file, s] of Object.entries(stats.perPantheon)) {
    log(`${file}: gods=${s.gods} shots=${s.shots} applied=${s.applied} failed=${s.failed}`);
  }
  if (stats.problems.length) {
    log('problems:');
    for (const p of stats.problems) {
      log(`  - ${p.god}${p.file ? `/${p.file}` : ''}: ${p.reason}${p.displayName ? ` (${p.displayName})` : ''}`);
    }
  }

  console.log(JSON.stringify(stats, null, 2));
  if (stats.failed) process.exitCode = 1;
}

main();
