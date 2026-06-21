/**
 * Merge pantheon skin JSON files back into builds.json (preserves non-skin god fields).
 *
 * Reads: app/data/God Information/Skins/{Pantheon}.json
 *
 * Usage:
 *   node scripts/merge-god-skins-into-builds.js --dry-run
 *   node scripts/merge-god-skins-into-builds.js --write
 */
const fs = require('fs');
const { BUILDS_JSON } = require('../config/dataPaths');
const {
  flattenGods,
  getGodDisplayName,
  getGodSkinsRecord,
  jsonRowToBuildsSkin,
  loadBuildsJson,
  readPantheonSkinFiles,
} = require('./lib/godSkinsPaths');

const dryRun = !process.argv.includes('--write');

function godMatchKey(god) {
  const name = getGodDisplayName(god).toLowerCase();
  const internal = String(god.internalName || '').toLowerCase();
  return `${name}|${internal}`;
}

function buildSkinMapFromPantheonFiles() {
  const payloads = readPantheonSkinFiles();
  /** @type {Map<string, Record<string, object>>} */
  const byGod = new Map();

  for (const payload of payloads) {
    if (!payload?.gods || !Array.isArray(payload.gods)) continue;
    for (const godEntry of payload.gods) {
      const godName = String(godEntry.godName || '').trim();
      if (!godName) continue;
      const internalName = godEntry.internalName
        ? String(godEntry.internalName).toLowerCase()
        : '';
      const key = `${godName.toLowerCase()}|${internalName}`;
      const skins = {};
      for (const row of godEntry.skins || []) {
        if (!row?.skinKey) continue;
        skins[row.skinKey] = jsonRowToBuildsSkin(row);
      }
      byGod.set(key, skins);
    }
  }
  return byGod;
}

function setGodSkins(god, skins) {
  if (god.baseInformation && typeof god.baseInformation === 'object') {
    god.baseInformation.skins = skins;
  }
  god.skins = skins;
}

function main() {
  const skinMap = buildSkinMapFromPantheonFiles();
  if (!skinMap.size) {
    console.error('No pantheon skin files found. Run: npm run export-god-skins');
    process.exit(1);
  }

  const builds = loadBuildsJson();
  const gods = flattenGods(builds.gods);
  let mergedGods = 0;
  let mergedSkins = 0;

  for (const god of gods) {
    const key = godMatchKey(god);
    const fromFiles = skinMap.get(key);
    if (!fromFiles) continue;

    const existing = getGodSkinsRecord(god) || {};
    const merged = { ...existing };
    for (const [skinKey, skin] of Object.entries(fromFiles)) {
      merged[skinKey] = { ...(existing[skinKey] || {}), ...skin };
      mergedSkins += 1;
    }
    setGodSkins(god, merged);
    mergedGods += 1;
  }

  if (dryRun) {
    console.log(
      `[dry-run] Would merge ${mergedSkins} skins into ${mergedGods} gods in ${BUILDS_JSON}`
    );
    return;
  }

  fs.writeFileSync(BUILDS_JSON, `${JSON.stringify(builds, null, 4)}\n`, 'utf8');
  console.log(`Merged ${mergedSkins} skins into ${mergedGods} gods → ${BUILDS_JSON}`);
}

main();
