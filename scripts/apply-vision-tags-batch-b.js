#!/usr/bin/env node
/**
 * Apply vision-tagged God Render extractions (batch B) to pantheon JSON files.
 *
 * Input: scripts/.vision-tag-batch-b-data.json
 * Log:   scripts/.vision-tag-batch-b.log
 *
 *   node scripts/apply-vision-tags-batch-b.js [--write]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, SKINS_DIR } = require('../config/dataPaths');
const { loadoutFrameDefaults } = require('./lib/godRenderUiRegions');
const { tierBadgeRelPath } = require('./lib/godRenderTiers');
const { mergeGodScreenshotMap } = require('./lib/godRenderScreenshotTags');
const {
  normalizeKey,
  findPantheonFileForGod,
  titleCaseWords,
  mergeExtractionsIntoGod,
  promoteMasteryShadowInGodSkinsArray,
  removeMasteryLightInGodSkinsArray,
} = require('./extract-god-render-metadata');
const { shadowSkinRowFromVariant } = require('./lib/godSkinsPaths');

const DEFAULT_DATA_PATH = path.join(PROJECT_ROOT, 'scripts', '.vision-tag-batch-b-data.json');
const DEFAULT_LOG_PATH = path.join(PROJECT_ROOT, 'scripts', '.vision-tag-batch-b.log');

function pathArg(argv, prefix, fallback) {
  const arg = argv.find((a) => a.startsWith(prefix));
  if (!arg) return fallback;
  return path.resolve(PROJECT_ROOT, arg.slice(prefix.length));
}

const { normalizeFolderKey, godNameFromRenderFolder } = require('./lib/godRenderFolderAliases');

function godNameFromFolder(folder) {
  return godNameFromRenderFolder(folder, titleCaseWords);
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
    buttonText: row.buttonText || null,
    loadout: {
      screenshot,
      frame: loadoutFrameDefaults(row.frame || {}),
    },
  };
}

function main() {
  const write = process.argv.includes('--write');
  const DATA_PATH = pathArg(process.argv, '--data=', DEFAULT_DATA_PATH);
  const LOG_PATH = pathArg(process.argv, '--log=', DEFAULT_LOG_PATH);
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Missing ${DATA_PATH}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const byPantheon = {};
  const logLines = [];
  const stats = { gods: 0, shots: 0, applied: 0, failed: 0, problems: [] };

  logLines.push(`# vision-tag batch B — ${new Date().toISOString()}`);
  logLines.push('');

  for (const godBlock of payload.gods || []) {
    const folder = godBlock.folder;
    const godName = godBlock.godName || godNameFromFolder(folder);
    const pantheonHit = findPantheonFileForGod(godName);
    if (!pantheonHit) {
      stats.problems.push({ god: godName, folder, reason: 'god not in pantheon JSON' });
      logLines.push(`FAIL ${godName} (${folder}): not in pantheon JSON`);
      continue;
    }

    if (!byPantheon[pantheonHit.file]) {
      byPantheon[pantheonHit.file] = { data: pantheonHit.data, tags: [], reports: [] };
    }
    const bucket = byPantheon[pantheonHit.file];
    const godIdx = bucket.data.gods.findIndex((g) => normalizeKey(g.godName) === normalizeKey(godName));
    const god = bucket.data.gods[godIdx];

    for (const skin of god.skins || []) {
      if (skin.isBaseSkin) {
        skin.rarity = null;
        skin.isPrism = false;
        delete skin.tierBadge;
        delete skin.unlock;
        delete skin.information;
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

    const { report, screenshotTags } = mergeExtractionsIntoGod(god, extractions);
    bucket.tags.push({ folder, tags: screenshotTags });
    bucket.reports.push({ godName, folder, report });

    logLines.push(`## ${godName} (${folder}) → ${pantheonHit.file}`);
    for (const row of report) {
      const e = row.extracted;
      const fileName = path.basename(e.screenshot || '');
      if (row.ok) {
        stats.applied += 1;
        logLines.push(`OK  ${fileName} → ${row.appliedTo} · ${e.displayName} · tier ${e.tier || '—'} · cost ${e.cost?.amount ?? '—'}`);
      } else {
        stats.failed += 1;
        stats.problems.push({
          god: godName,
          file: fileName,
          displayName: e.displayName,
          reason: row.reason,
        });
        logLines.push(`FAIL ${fileName} · ${e.displayName} (${row.reason})`);
      }
    }
    logLines.push('');

    promoteMasteryShadowInGodSkinsArray(god);
    removeMasteryLightInGodSkinsArray(god);
  }

  let screenshotGods = {};
  if (fs.existsSync(path.join(SKINS_DIR, '_godRenderScreenshotMap.json'))) {
    screenshotGods = JSON.parse(
      fs.readFileSync(path.join(SKINS_DIR, '_godRenderScreenshotMap.json'), 'utf8')
    ).gods || {};
  }

  for (const [file, bucket] of Object.entries(byPantheon)) {
    for (const { folder, tags } of bucket.tags) {
      screenshotGods = mergeGodScreenshotMap(screenshotGods, folder, tags);
    }
    if (write) {
      const outPath = path.join(SKINS_DIR, file);
      fs.writeFileSync(outPath, JSON.stringify(bucket.data, null, 2) + '\n', 'utf8');
      console.log(`Wrote ${outPath}`);
    }
  }

  if (write) {
    const mapPath = path.join(SKINS_DIR, '_godRenderScreenshotMap.json');
    fs.writeFileSync(
      mapPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), gods: screenshotGods }, null, 2) + '\n',
      'utf8'
    );
    console.log(`Wrote ${mapPath}`);
  }

  logLines.push('---');
  logLines.push(`gods=${stats.gods} shots=${stats.shots} applied=${stats.applied} failed=${stats.failed}`);
  if (stats.problems.length) {
    logLines.push('problems:');
    for (const p of stats.problems) {
      logLines.push(`  - ${p.god}${p.file ? `/${p.file}` : ''}: ${p.reason}${p.displayName ? ` (${p.displayName})` : ''}`);
    }
  }

  fs.writeFileSync(LOG_PATH, logLines.join('\n') + '\n', 'utf8');
  console.log(`Log → ${LOG_PATH}`);
  console.log(JSON.stringify(stats, null, 2));

  if (stats.failed && !write) process.exitCode = 1;
}

main();
