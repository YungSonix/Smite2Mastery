#!/usr/bin/env node
/**
 * Apply vision-derived screenshot tags (batch C) to pantheon skin JSON.
 * Mappings live in scripts/god-renders/vision-tag-batch-c-mappings.json
 *
 *   node scripts/god-renders/vision-tag-batch-c.js
 *   node scripts/god-renders/vision-tag-batch-c.js --dry-run
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, SKINS_DIR } = require('../../config/dataPaths');
const {
  loadBuildsJson,
  buildPantheonExport,
  promoteMasteryShadowInGodSkinsArray,
  removeMasteryLightInGodSkinsArray,
} = require('../lib/godSkinsPaths');

const LOG_PATH = path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-batch-c.log');
const MAP_PATH = path.join(PROJECT_ROOT, 'scripts', 'god-renders', 'vision-tag-batch-c-mappings.json');
const BOOTSTRAP_PATH = path.join(PROJECT_ROOT, 'scripts', 'god-renders', 'vision-tag-bootstrap-gods.json');

const STANDARD_FRAME = {
  focalX: 50,
  focalY: 50,
  zoom: 1.148936170212766,
  aspectWidth: 586,
  aspectHeight: 940,
  cropWidth: 586,
  cropHeight: 940,
};

const FOLDER_ALIASES = { Cernunnos: 'cernennos', 'Sun Wukong': 'sun wokong' };

const PANTHEON_BY_GOD = {
  'Da Ji': 'Chinese.json',
  'Guan Yu': 'Chinese.json',
  'Hou Yi': 'Chinese.json',
  'Hua Mulan': 'Chinese.json',
  'Jing Wei': 'Chinese.json',
  'Ne Zha': 'Chinese.json',
  'Nu Wa': 'Chinese.json',
  'Sun Wukong': 'Chinese.json',
  Amaterasu: 'Japanese.json',
  Danzaburou: 'Japanese.json',
  Izanami: 'Japanese.json',
  Susano: 'Japanese.json',
  Tsukuyomi: 'Japanese.json',
  Agni: 'Hindu.json',
  Ganesha: 'Hindu.json',
  Kali: 'Hindu.json',
  Rama: 'Hindu.json',
  Artio: 'Celtic.json',
  Cernunnos: 'Celtic.json',
  Gilgamesh: 'Babylonian.json',
  Ishtar: 'Babylonian.json',
  Merlin: 'Arthurian.json',
  Mordred: 'Arthurian.json',
  'Morgan Le Fay': 'Arthurian.json',
  Aladdin: 'Tales of Arabia.json',
  'Baron Samedi': 'Voodoo.json',
  Pele: 'Polynesian.json',
  'Princess Bari': 'Korean.json',
  Yemoja: 'Yoruba.json',
};

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function log(line) {
  fs.appendFileSync(LOG_PATH, `${line}\n`, 'utf8');
  console.log(line);
}

function folderForGod(godName) {
  if (FOLDER_ALIASES[godName]) return FOLDER_ALIASES[godName];
  return String(godName).toLowerCase();
}

function findSkin(god, skinKey, skinName) {
  const skins = god.skins || [];
  if (skinKey) {
    const hit = skins.find((s) => normalizeKey(s.skinKey) === normalizeKey(skinKey));
    if (hit) return hit;
  }
  if (skinName) {
    const hit = skins.find((s) => normalizeKey(s.skinName) === normalizeKey(skinName));
    if (hit) return hit;
  }
  return null;
}

function findVariant(skin, variantName) {
  if (!variantName) return null;
  return (skin.variants || []).find(
    (v) =>
      normalizeKey(v.name) === normalizeKey(variantName) ||
      v.name === variantName
  );
}

function applyTag(entry, row) {
  const folder = row.folder || folderForGod(row.godName);
  const screenshot = `app/data/God Renders/${folder}/${row.fileName}`;
  const loadout = { screenshot, frame: { ...STANDARD_FRAME } };

  const screenshotTag = {
    screenshot,
    fileName: row.fileName,
    godName: row.godName,
    displayName: row.displayName,
    target: row.variantName ? 'variant' : 'skin',
    skinKey: row.skinKey,
    skinName: row.skinName,
  };

  if (row.variantName) {
    screenshotTag.variantName = row.variantName;
    screenshotTag.parentSkinKey = row.skinKey;
    screenshotTag.parentSkinName = row.skinName;
    screenshotTag.appliedTo = `${row.skinName} → ${row.variantName}`;
  } else {
    screenshotTag.appliedTo = row.skinName;
  }

  if (row.cost) screenshotTag.cost = row.cost;
  if (row.tier) screenshotTag.tier = row.tier;

  entry.loadout = loadout;
  entry.loadoutMeta = {
    godName: row.godName,
    displayName: row.displayName,
    rarity: row.rarity ?? row.tier ?? entry.rarity ?? null,
    gridBadge: row.gridBadge ?? null,
    screenshot,
    extractedAt: row.extractedAt || '2026-06-21',
    screenshotTag,
  };

  if (row.tier) {
    entry.rarity = row.tier;
    if (row.tierBadge) entry.tierBadge = row.tierBadge;
    else if (row.tier === 'Heroic') entry.tierBadge = 'app/data/Tiers/t_FE_Cosmetics_HeroicTier.png';
    else if (row.tier === 'Classic') entry.tierBadge = 'app/data/Tiers/t_FE_Cosmetics_CommonTier.png';
    else if (row.tier === 'Prisms') entry.tierBadge = 'app/data/Tiers/t_FE_Cosmetics_RecolorsTier.png';
  }

  if (row.cost && row.cost.amount != null) {
    entry.cost = { currency: row.cost.currency || 'diamonds', amount: String(row.cost.amount) };
    entry.price = { diamonds: String(row.cost.amount) };
  }

  if (row.unlock) entry.unlock = { ...(entry.unlock || {}), ...row.unlock };

  if (row.gridBadge && entry.loadoutMeta) entry.loadoutMeta.gridBadge = row.gridBadge;
}

function bootstrapFromFile(pantheonFiles) {
  if (!fs.existsSync(BOOTSTRAP_PATH)) return 0;
  const rows = JSON.parse(fs.readFileSync(BOOTSTRAP_PATH, 'utf8'));
  let added = 0;
  for (const row of rows) {
    const fullPath = path.join(SKINS_DIR, row.pantheonFile);
    if (!pantheonFiles[fullPath]) {
      pantheonFiles[fullPath] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
    const data = pantheonFiles[fullPath];
    if (data.gods.find((g) => g.godName === row.godName)) continue;
    const god = {
      godName: row.godName,
      internalName: row.internalName,
      skins: row.skins.map((s) => ({
        ...s,
        cost: s.isBaseSkin ? { currency: 'diamonds', amount: '0' } : s.cost,
        price: s.isBaseSkin ? { diamonds: '0' } : undefined,
        isPrism: s.isPrism || false,
        isRecolor: false,
        isMastery: s.isMastery || false,
        isCrossGen: false,
        isBaseSkin: s.isBaseSkin || false,
      })),
    };
    data.gods.push(god);
    data.gods.sort((a, b) => a.godName.localeCompare(b.godName, undefined, { sensitivity: 'base' }));
    added += 1;
    log(`BOOTSTRAP added ${row.godName} to ${row.pantheonFile}`);
  }
  return added;
}

function bootstrapMissingGods(pantheonFiles) {
  bootstrapFromFile(pantheonFiles);
  const builds = loadBuildsJson();
  const exported = buildPantheonExport(builds);
  let added = 0;

  for (const [godName, fileName] of Object.entries(PANTHEON_BY_GOD)) {
    const fileBase = fileName.replace('.json', '');
    const pantheonHit = exported.find(
      (p) => normalizeKey(p.pantheon) === normalizeKey(fileBase) || p.pantheon === fileBase
    );

    if (!pantheonHit) continue;

    const expGod = pantheonHit.gods.find((g) => g.godName === godName);
    if (!expGod) continue;

    const fullPath = path.join(SKINS_DIR, fileName);
    if (!pantheonFiles[fullPath]) {
      pantheonFiles[fullPath] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
    const data = pantheonFiles[fullPath];
    if (!data.gods.find((g) => g.godName === godName)) {
      data.gods.push(expGod);
      data.gods.sort((a, b) => a.godName.localeCompare(b.godName, undefined, { sensitivity: 'base' }));
      added += 1;
      log(`BOOTSTRAP added ${godName} to ${fileName}`);
    }
  }
  return added;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const mappingsPath = fs.existsSync(MAP_PATH)
    ? MAP_PATH
    : path.join(PROJECT_ROOT, 'scripts', 'god-renders', 'vision-tag-batch-c-mappings.json');

  if (!fs.existsSync(mappingsPath)) {
    console.error(`Missing mappings: ${mappingsPath}`);
    process.exit(1);
  }

  const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
  fs.writeFileSync(LOG_PATH, `vision-tag-batch-c started ${new Date().toISOString()}\n`, 'utf8');

  /** @type {Record<string, object>} */
  const pantheonFiles = {};
  bootstrapMissingGods(pantheonFiles);

  let applied = 0;
  let failed = 0;

  for (const row of mappings) {
    const fileName = PANTHEON_BY_GOD[row.godName];
    if (!fileName) {
      log(`FAIL ${row.godName} ${row.fileName}: unknown god pantheon`);
      failed += 1;
      continue;
    }

    const fullPath = path.join(SKINS_DIR, fileName);
    if (!pantheonFiles[fullPath]) {
      pantheonFiles[fullPath] = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }
    const data = pantheonFiles[fullPath];
    const god = data.gods.find((g) => g.godName === row.godName);
    if (!god) {
      log(`FAIL ${row.godName} ${row.fileName}: god not in ${fileName}`);
      failed += 1;
      continue;
    }

    promoteMasteryShadowInGodSkinsArray(god);
    removeMasteryLightInGodSkinsArray(god);

    const skin = findSkin(god, row.skinKey, row.skinName);
    if (!skin) {
      log(`FAIL ${row.godName} ${row.fileName}: skin ${row.skinKey || row.skinName}`);
      failed += 1;
      continue;
    }

    let entry = skin;
    if (row.variantName) {
      const variant = findVariant(skin, row.variantName);
      if (!variant) {
        log(`FAIL ${row.godName} ${row.fileName}: variant ${row.variantName}`);
        failed += 1;
        continue;
      }
      entry = variant;
    }

    applyTag(entry, row);
    applied += 1;
    log(`OK ${row.godName} ${row.fileName} → ${row.displayName} (${row.variantName || row.skinName})`);
  }

  if (!dryRun) {
    for (const [fullPath, data] of Object.entries(pantheonFiles)) {
      for (const god of data.gods || []) {
        promoteMasteryShadowInGodSkinsArray(god);
        removeMasteryLightInGodSkinsArray(god);
      }
      fs.writeFileSync(fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      log(`WROTE ${path.basename(fullPath)}`);
    }
  }

  log(`DONE applied=${applied} failed=${failed} dryRun=${dryRun}`);
}

main();
