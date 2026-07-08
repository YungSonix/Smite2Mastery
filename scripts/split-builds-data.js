/**
 * Split canonical `builds.json` into app-facing chunks for lazy loading.
 *
 * Source of truth for scripts/API: `app/data/God Information/Builds/builds.json`
 * Generated (do not edit by hand):
 *   - builds.gods.json   — gods + tierlist (~4MB)
 *   - builds.items.json  — items only (~200KB)
 *
 * Run after `.scripts/update-builds.js` or any builds.json edit:
 *   npm run builds:split
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BUILDS_DIR = path.join(ROOT, 'app/data/God Information/Builds');
const SOURCE_PATH = path.join(BUILDS_DIR, 'builds.json');
const GODS_PATH = path.join(BUILDS_DIR, 'builds.gods.json');
const ITEMS_PATH = path.join(BUILDS_DIR, 'builds.items.json');

function splitBuildsDataFromSource() {
  if (!fs.existsSync(SOURCE_PATH)) {
    throw new Error(`Missing source file: ${SOURCE_PATH}`);
  }

  const builds = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  if (!Array.isArray(builds.gods) || !Array.isArray(builds.items)) {
    throw new Error('builds.json must contain gods[] and items[]');
  }

  const godsPayload = {
    _generatedFrom: 'builds.json',
    _generatedAt: new Date().toISOString(),
    gods: builds.gods,
    tierlist: builds.tierlist ?? [],
  };

  const itemsPayload = {
    _generatedFrom: 'builds.json',
    _generatedAt: new Date().toISOString(),
    items: builds.items,
  };

  fs.writeFileSync(GODS_PATH, `${JSON.stringify(godsPayload, null, 4)}\n`, 'utf8');
  fs.writeFileSync(ITEMS_PATH, `${JSON.stringify(itemsPayload, null, 4)}\n`, 'utf8');

  return {
    godsPath: GODS_PATH,
    itemsPath: ITEMS_PATH,
    godsBytes: fs.statSync(GODS_PATH).size,
    itemsBytes: fs.statSync(ITEMS_PATH).size,
  };
}

if (require.main === module) {
  const result = splitBuildsDataFromSource();
  console.log('Split builds.json →');
  console.log(`  gods:  ${(result.godsBytes / 1e6).toFixed(2)} MB  ${result.godsPath}`);
  console.log(`  items: ${(result.itemsBytes / 1e6).toFixed(2)} MB  ${result.itemsPath}`);
}

module.exports = { splitBuildsDataFromSource, SOURCE_PATH, GODS_PATH, ITEMS_PATH };
