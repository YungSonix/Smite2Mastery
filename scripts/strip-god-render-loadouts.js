#!/usr/bin/env node
/**
 * Remove untrusted god-render loadout fields from pantheon JSON.
 * Keeps Achilles (Greek.json) as the vision-tag reference; strips all other gods.
 *
 *   node scripts/strip-god-render-loadouts.js           # dry-run (default)
 *   node scripts/strip-god-render-loadouts.js --dry-run
 *   node scripts/strip-god-render-loadouts.js --write
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { SKINS_DIR } = require('../config/dataPaths');
const { collectTagsFromGod } = require('./rebuild-god-render-audit');

const KEEP_GOD = 'Achilles';
const STRIP_KEYS = ['loadout', 'loadoutMeta'];

function listPantheonFiles() {
  return fs
    .readdirSync(SKINS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort((a, b) => a.localeCompare(b));
}

function stripEntry(entry) {
  let removed = 0;
  for (const key of STRIP_KEYS) {
    if (entry && Object.prototype.hasOwnProperty.call(entry, key)) {
      delete entry[key];
      removed += 1;
    }
  }
  return removed;
}

function stripGod(god) {
  let removed = 0;
  for (const skin of god.skins || []) {
    removed += stripEntry(skin);
    for (const variant of skin.variants || []) {
      removed += stripEntry(variant);
    }
  }
  return removed;
}

function countTagsInPantheons() {
  let godsWithTags = 0;
  let totalTags = 0;
  for (const file of listPantheonFiles()) {
    const data = JSON.parse(fs.readFileSync(path.join(SKINS_DIR, file), 'utf8'));
    for (const god of data.gods || []) {
      const tags = collectTagsFromGod(god);
      if (tags.length) {
        godsWithTags += 1;
        totalTags += tags.length;
      }
    }
  }
  return { godsWithTags, totalTags };
}

function stripAll({ write }) {
  const before = countTagsInPantheons();
  const perFile = [];
  let entriesStripped = 0;
  let godsTouched = 0;

  for (const file of listPantheonFiles()) {
    const filePath = path.join(SKINS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileEntries = 0;
    let fileGods = 0;

    for (const god of data.gods || []) {
      if (god.godName === KEEP_GOD) continue;
      const removed = stripGod(god);
      if (removed > 0) {
        fileGods += 1;
        fileEntries += removed;
      }
    }

    if (write && fileEntries > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }

    if (fileEntries > 0) {
      perFile.push({ file, gods: fileGods, entries: fileEntries });
      entriesStripped += fileEntries;
      godsTouched += fileGods;
    }
  }

  const after = write ? countTagsInPantheons() : before;

  return {
    write,
    keepGod: KEEP_GOD,
    before,
    after: write ? after : { godsWithTags: before.godsWithTags, totalTags: 0, note: 'dry-run — after counts assume full strip' },
    godsTouched,
    entriesStripped,
    perFile,
  };
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const dryRun = args.includes('--dry-run') || !write;

  if (write && dryRun && !args.includes('--write')) {
    // --write wins when explicitly passed
  }

  const mode = write ? 'WRITE' : 'DRY-RUN';
  const stats = stripAll({ write });

  console.log(`strip-god-render-loadouts (${mode})`);
  console.log(`Reference god preserved: ${KEEP_GOD}`);
  console.log(`Before: ${stats.before.godsWithTags} gods, ${stats.before.totalTags} screenshotTag entries`);
  console.log(`Gods touched: ${stats.godsTouched}, fields removed: ${stats.entriesStripped}`);

  if (stats.perFile.length) {
    console.log('Per pantheon file:');
    for (const row of stats.perFile) {
      console.log(`  ${row.file}: ${row.gods} gods, ${row.entries} loadout/loadoutMeta fields`);
    }
  } else {
    console.log('Nothing to strip.');
  }

  if (write) {
    console.log(`After: ${stats.after.godsWithTags} gods, ${stats.after.totalTags} screenshotTag entries`);
    console.log('Run: node scripts/rebuild-god-render-audit.js');
  } else {
    console.log('Pass --write to apply changes.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { stripAll, stripGod, stripEntry, KEEP_GOD };
