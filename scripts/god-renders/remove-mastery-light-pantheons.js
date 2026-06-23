#!/usr/bin/env node
/**
 * Remove duplicate Mastery Light variants (in-game tier is Radiant; Light icon → Radiant row).
 *
 *   node scripts/remove-mastery-light-pantheons.js --write
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { SKINS_DIR } = require('../../config/dataPaths');
const { removeMasteryLightInGodSkinsArray } = require('../lib/godSkinsPaths');

function main() {
  const write = process.argv.includes('--write');
  if (!fs.existsSync(SKINS_DIR)) {
    console.error('Missing skins dir:', SKINS_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SKINS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort();

  let godsChanged = 0;
  let filesChanged = 0;

  for (const file of files) {
    const abs = path.join(SKINS_DIR, file);
    const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
    let fileDirty = false;

    for (const god of data.gods || []) {
      if (removeMasteryLightInGodSkinsArray(god)) {
        godsChanged += 1;
        fileDirty = true;
        console.log(`  ${file} · ${god.godName} → Mastery Light removed`);
      }
    }

    if (fileDirty) {
      filesChanged += 1;
      if (write) {
        fs.writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      }
    }
  }

  console.log(
    `\n${write ? 'Updated' : 'Would update'} ${filesChanged} pantheon file(s); ${godsChanged} god(s) cleaned.`
  );
  if (!write && godsChanged > 0) {
    console.log('Re-run with --write to apply.');
  }
}

main();
