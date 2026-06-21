/**
 * Export god skins from builds.json into one JSON file per pantheon:
 *   app/data/God Information/Skins/Greek.json
 *
 * Each file lists gods alphabetically; each god has a `skins` array (base + mastery + all others).
 *
 * Usage:
 *   node scripts/export-god-skins.js
 *   node scripts/export-god-skins.js --dry-run
 */
const fs = require('fs');
const path = require('path');
const {
  SKINS_DIR,
  buildPantheonExport,
  loadBuildsJson,
  pantheonToFileName,
  removeLegacySkinSubdirs,
} = require('./lib/godSkinsPaths');

const dryRun = process.argv.includes('--dry-run');

function main() {
  const builds = loadBuildsJson();
  const pantheons = buildPantheonExport(builds);
  let skinCount = 0;
  let godCount = 0;

  if (!dryRun) {
    if (!fs.existsSync(SKINS_DIR)) fs.mkdirSync(SKINS_DIR, { recursive: true });
    const removedDirs = removeLegacySkinSubdirs();
    if (removedDirs) console.log(`Removed ${removedDirs} legacy per-god skin folders`);
  }

  for (const payload of pantheons) {
    godCount += payload.gods.length;
    for (const god of payload.gods) skinCount += god.skins.length;

    const outPath = path.join(SKINS_DIR, `${pantheonToFileName(payload.pantheon)}.json`);
    if (!dryRun) {
      fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    }
  }

  console.log(
    dryRun
      ? `[dry-run] Would write ${pantheons.length} pantheon files (${godCount} gods, ${skinCount} skins) under ${SKINS_DIR}`
      : `Wrote ${pantheons.length} pantheon files (${godCount} gods, ${skinCount} skins) under ${SKINS_DIR}`
  );
}

main();
