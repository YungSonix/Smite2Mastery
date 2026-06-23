#!/usr/bin/env node
/**
 * Rebuild `_godRenderScreenshotMap.json` from pantheon JSON `loadoutMeta.screenshotTag`
 * fields (skins + variants). No OCR — tags only.
 *
 *   node scripts/rebuild-god-render-audit.js
 */
const fs = require('fs');
const path = require('path');
const { SKINS_DIR } = require('../../config/dataPaths');

const MAP_PATH = path.join(SKINS_DIR, '_godRenderScreenshotMap.json');
const RENDERS_FOLDER_RE = /God Renders[/\\]([^/\\]+)[/\\]/i;

function listPantheonFiles() {
  return fs
    .readdirSync(SKINS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort((a, b) => a.localeCompare(b));
}

function folderFromTag(tag, godName) {
  const screenshot = tag?.screenshot || null;
  if (screenshot) {
    const m = String(screenshot).match(RENDERS_FOLDER_RE);
    if (m) return m[1].toLowerCase();
  }
  return String(godName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function collectTagsFromEntry(entry, tags) {
  const tag = entry?.loadoutMeta?.screenshotTag;
  if (tag?.fileName) tags.push(tag);
}

function collectTagsFromGod(god) {
  const tags = [];
  for (const skin of god.skins || []) {
    collectTagsFromEntry(skin, tags);
    for (const variant of skin.variants || []) {
      collectTagsFromEntry(variant, tags);
    }
  }
  return tags;
}

function mergeTagsIntoMap(map, folderName, tags) {
  if (!folderName || !tags.length) return;
  if (!map[folderName]) map[folderName] = {};
  for (const tag of tags) {
    if (!tag?.fileName) continue;
    map[folderName][tag.fileName] = tag;
  }
}

function rebuildScreenshotMap() {
  const pantheonFiles = listPantheonFiles();
  const gods = {};
  const pantheonStats = [];

  let totalSkinsTagged = 0;
  let godsWithTags = 0;

  for (const file of pantheonFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(SKINS_DIR, file), 'utf8'));
    let pantheonTagCount = 0;

    for (const god of data.gods || []) {
      const tags = collectTagsFromGod(god);
      if (!tags.length) continue;

      pantheonTagCount += tags.length;
      totalSkinsTagged += tags.length;
      godsWithTags += 1;

      const folderName = folderFromTag(tags[0], god.godName);
      mergeTagsIntoMap(gods, folderName, tags);
    }

    pantheonStats.push({ file, tagCount: pantheonTagCount });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    gods,
  };

  fs.writeFileSync(MAP_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const godFoldersInMap = Object.keys(gods).length;
  let screenshotCount = 0;
  for (const folder of Object.keys(gods)) {
    screenshotCount += Object.keys(gods[folder]).length;
  }

  const zeroTagPantheons = pantheonStats.filter((p) => p.tagCount === 0).map((p) => p.file);

  return {
    mapPath: MAP_PATH,
    pantheonFiles: pantheonFiles.length,
    godsWithTags,
    godFoldersInMap,
    screenshotCount,
    totalSkinsTagged,
    zeroTagPantheons,
  };
}

function main() {
  const stats = rebuildScreenshotMap();

  console.log(`Wrote ${stats.mapPath}`);
  console.log(`Pantheon files scanned: ${stats.pantheonFiles}`);
  console.log(`Gods with ≥1 tag: ${stats.godsWithTags}`);
  console.log(`God folders in map: ${stats.godFoldersInMap}`);
  console.log(`Screenshots tagged: ${stats.screenshotCount}`);

  if (stats.zeroTagPantheons.length) {
    console.log(`Pantheons with zero tags (${stats.zeroTagPantheons.length}):`);
    for (const f of stats.zeroTagPantheons) console.log(`  - ${f}`);
  } else {
    console.log('All pantheon files have at least one tagged screenshot.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { rebuildScreenshotMap, collectTagsFromGod, folderFromTag };
