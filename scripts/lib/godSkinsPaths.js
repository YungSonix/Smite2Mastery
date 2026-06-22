/**
 * Shared helpers for god skin JSON export / merge scripts.
 */
const fs = require('fs');
const path = require('path');
const { BUILDS_JSON, SKINS_DIR } = require('../../config/dataPaths');

function flattenGods(godsRoot) {
  if (!godsRoot) return [];
  if (!Array.isArray(godsRoot)) return [godsRoot].filter(Boolean);
  return godsRoot.flat(Infinity).filter(Boolean);
}

function getGodDisplayName(god) {
  if (!god || typeof god !== 'object') return 'Unknown';
  return (
    god.name ||
    god.baseInformation?.name ||
    String(god.internalName || '')
      .replace(/_Item$/i, '')
      .trim() ||
    'Unknown'
  );
}

function getGodFolderName(god) {
  const internal = String(god.internalName || '').replace(/_Item$/i, '').trim();
  if (internal) return internal;
  return getGodDisplayName(god).replace(/[^\w]/g, '');
}

function getGodPantheon(god) {
  if (!god || typeof god !== 'object') return 'Unknown';
  const flat = god.pantheon || god.Pantheon;
  if (flat) return String(flat).trim();
  const info = god.baseInformation;
  if (info && typeof info === 'object') {
    const nested = info.pantheon || info.Pantheon;
    if (nested) return String(nested).trim();
  }
  return 'Unknown';
}

function pantheonToFileName(pantheon) {
  return sanitizeFileName(String(pantheon || 'Unknown').trim() || 'Unknown');
}

function isBaseSkinRow(skinKey, skin, godName) {
  if (!skin || typeof skin !== 'object') return false;
  if (String(skin.type || '').toLowerCase() === 'base skin') return true;
  if (/^base\b/i.test(String(skin.name || ''))) return true;
  const godCompact = String(godName || '')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (godCompact && String(skinKey).replace(/\s+/g, '').toLowerCase() === godCompact) {
    return true;
  }
  return false;
}

function sortSkinRows(rows) {
  return [...rows].sort((a, b) => {
    const rank = (row) => {
      if (row.isBaseSkin) return 0;
      if (row.isMasteryShadowSkin || normalizeSkinKey(row.skinKey) === 'shadow') return 1;
      if (row.isMastery) return 2;
      return 3;
    };
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return String(a.skinName || a.skinKey).localeCompare(
      String(b.skinName || b.skinKey),
      undefined,
      { sensitivity: 'base' }
    );
  });
}

function normalizeSkinKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function isMasteryShadowVariantName(name) {
  return /^Mastery Shadow$/i.test(String(name || '').trim()) || normalizeSkinKey(name) === 'masteryshadow';
}

function isMasteryLightVariantName(name) {
  return /^Mastery Light$/i.test(String(name || '').trim());
}

function isMasteryAngelicVariantName(name) {
  return /^Mastery Angelic$/i.test(String(name || '').trim());
}

function isMasteryDemonicVariantName(name) {
  return /^Mastery Demonic$/i.test(String(name || '').trim());
}

/**
 * Disk-sync artifact — not an in-game mastery tier row.
 * @returns {boolean} whether a change was made
 */
function removeMasteryDemonicFromVariants(variants) {
  if (!Array.isArray(variants) || !variants.length) return false;
  const before = variants.length;
  for (let i = variants.length - 1; i >= 0; i -= 1) {
    if (isMasteryDemonicVariantName(variants[i]?.name)) {
      variants.splice(i, 1);
    }
  }
  return variants.length !== before;
}

/**
 * In-game Angelic mastery tier is Radiant — merge icon onto Mastery Radiant and drop the Angelic row.
 * @returns {boolean} whether a change was made
 */
function removeMasteryAngelicFromVariants(variants) {
  if (!Array.isArray(variants) || !variants.length) return false;
  const angelicIdx = variants.findIndex((v) => isMasteryAngelicVariantName(v?.name));
  if (angelicIdx < 0) return false;

  const angelic = variants[angelicIdx];
  variants.splice(angelicIdx, 1);

  if (angelic?.icon) {
    let radiant = variants.find((v) => /^Mastery Radiant$/i.test(v?.name));
    if (radiant) {
      radiant.icon = angelic.icon;
    } else {
      variants.push({
        name: 'Mastery Radiant',
        icon: angelic.icon,
        masteryFromDisk: angelic.masteryFromDisk ?? true,
        ...(angelic.cardArt
          ? { cardArt: angelic.cardArt, skin: angelic.skin || angelic.cardArt }
          : {}),
      });
    }
  }
  return true;
}

function normalizeMasteryAngelicDemonicFromVariants(variants) {
  const demonic = removeMasteryDemonicFromVariants(variants);
  const angelic = removeMasteryAngelicFromVariants(variants);
  return demonic || angelic;
}

/**
 * In-game, the Light mastery tier is Radiant — merge icon onto Mastery Radiant and drop the Light row.
 * @returns {boolean} whether a change was made
 */
function removeMasteryLightFromVariants(variants) {
  if (!Array.isArray(variants) || !variants.length) return false;
  const lightIdx = variants.findIndex((v) => isMasteryLightVariantName(v?.name));
  if (lightIdx < 0) return false;

  const light = variants[lightIdx];
  variants.splice(lightIdx, 1);

  if (light?.icon) {
    let radiant = variants.find((v) => /^Mastery Radiant$/i.test(v?.name));
    if (radiant) {
      radiant.icon = light.icon;
    } else {
      variants.push({
        name: 'Mastery Radiant',
        icon: light.icon,
        masteryFromDisk: light.masteryFromDisk ?? true,
        ...(light.cardArt
          ? { cardArt: light.cardArt, skin: light.skin || light.cardArt }
          : {}),
      });
    }
  }
  return true;
}

function removeMasteryLightInGodSkinsArray(godEntry) {
  let changed = false;
  for (const skin of godEntry?.skins || []) {
    if (skin.variants?.length && removeMasteryLightFromVariants(skin.variants)) {
      changed = true;
    }
  }
  return changed;
}

function removeMasteryLightInSkinsRecord(skins, godName) {
  if (!skins || typeof skins !== 'object') return false;
  const baseKey = Object.keys(skins).find((k) => isBaseSkinRow(k, skins[k], godName));
  if (!baseKey || !skins[baseKey]?.variants) return false;
  return removeMasteryLightFromVariants(skins[baseKey].variants);
}

function normalizeMasteryAngelicDemonicInGodSkinsArray(godEntry) {
  let changed = false;
  for (const skin of godEntry?.skins || []) {
    if (skin.variants?.length && normalizeMasteryAngelicDemonicFromVariants(skin.variants)) {
      changed = true;
    }
  }
  return changed;
}

function normalizeMasteryAngelicDemonicInSkinsRecord(skins, godName) {
  if (!skins || typeof skins !== 'object') return false;
  const baseKey = Object.keys(skins).find((k) => isBaseSkinRow(k, skins[k], godName));
  if (!baseKey || !skins[baseKey]?.variants) return false;
  return normalizeMasteryAngelicDemonicFromVariants(skins[baseKey].variants);
}

/** Copy variant fields onto a standalone Shadow skin row (pantheon JSON shape). */
function shadowSkinRowFromVariant(godName, variant) {
  const assets = {};
  if (variant.skin || variant.cardArt) {
    assets.skin = variant.skin || variant.cardArt;
    assets.cardArt = variant.cardArt || variant.skin;
  }
  if (variant.icon) assets.icon = variant.icon;
  if (variant.inGame) assets.inGame = variant.inGame;

  const row = {
    skinKey: 'Shadow',
    skinName: 'Shadow',
    cost: variant.cost ?? null,
    rarity: variant.rarity ?? null,
    isBaseSkin: false,
    isPrism: false,
    isRecolor: false,
    isMastery: true,
    isMasteryShadowSkin: true,
    isCrossGen: false,
    type: 'Mastery Shadow',
  };

  if (Object.keys(assets).length) row.assets = assets;
  if (variant.cardArt) row.cardArt = variant.cardArt;
  if (variant.skin) row.skin = variant.skin;
  if (variant.icon) row.icon = variant.icon;
  if (variant.price) row.price = variant.price;
  if (variant.tierBadge) row.tierBadge = variant.tierBadge;
  if (variant.unlock) row.unlock = { ...variant.unlock };
  if (variant.loadout) row.loadout = { ...variant.loadout, frame: variant.loadout.frame ? { ...variant.loadout.frame } : undefined };
  if (variant.loadoutMeta) row.loadoutMeta = { ...variant.loadoutMeta };
  if (variant.masteryFromDisk) row.masteryFromDisk = true;
  return row;
}

function mergeShadowSkinRow(existing, variant) {
  const built = shadowSkinRowFromVariant('', variant);
  for (const key of Object.keys(built)) {
    if (built[key] != null && existing[key] == null) existing[key] = built[key];
  }
  if (variant.loadout && !existing.loadout) existing.loadout = variant.loadout;
  if (variant.loadoutMeta && !existing.loadoutMeta) existing.loadoutMeta = variant.loadoutMeta;
  if (variant.unlock && !existing.unlock) existing.unlock = variant.unlock;
  if (variant.tierBadge && !existing.tierBadge) existing.tierBadge = variant.tierBadge;
  if (variant.cost && !existing.cost) existing.cost = variant.cost;
  if (variant.price && !existing.price) existing.price = variant.price;
}

/**
 * Mastery Shadow is its own skin in-game — promote off base `variants[]` to a top-level skin row.
 * @returns {boolean} whether a change was made
 */
function promoteMasteryShadowInGodSkinsArray(godEntry) {
  const skins = godEntry?.skins;
  if (!Array.isArray(skins) || !skins.length) return false;

  const base = skins.find((s) => s.isBaseSkin);
  if (!base?.variants?.length) return false;

  const idx = base.variants.findIndex((v) => isMasteryShadowVariantName(v?.name));
  if (idx < 0) return false;

  const [shadowVar] = base.variants.splice(idx, 1);
  let shadowSkin = skins.find(
    (s) =>
      !s.isBaseSkin &&
      (s.isMasteryShadowSkin ||
        normalizeSkinKey(s.skinKey) === 'shadow' ||
        /^shadow$/i.test(String(s.skinName || '').trim()))
  );

  if (!shadowSkin) {
    shadowSkin = shadowSkinRowFromVariant(godEntry.godName, shadowVar);
    skins.push(shadowSkin);
  } else {
    mergeShadowSkinRow(shadowSkin, shadowVar);
    shadowSkin.isMasteryShadowSkin = true;
    shadowSkin.isMastery = true;
    if (!shadowSkin.type) shadowSkin.type = 'Mastery Shadow';
  }

  godEntry.skins = sortSkinRows(skins);
  return true;
}

/** Same promotion for builds.json `skins` record (object keyed by skinKey). */
function promoteMasteryShadowInSkinsRecord(skins, godName) {
  if (!skins || typeof skins !== 'object') return false;
  const baseKey = Object.keys(skins).find((k) => isBaseSkinRow(k, skins[k], godName));
  if (!baseKey) return false;
  const base = skins[baseKey];
  if (!Array.isArray(base.variants) || !base.variants.length) return false;

  const idx = base.variants.findIndex((v) => isMasteryShadowVariantName(v?.name));
  if (idx < 0) return false;

  const [shadowVar] = base.variants.splice(idx, 1);
  const shadowKey = 'Shadow';
  if (!skins[shadowKey]) {
    skins[shadowKey] = {
      name: 'Shadow',
      type: 'Mastery Shadow',
      isMasteryShadowSkin: true,
      masteryFromDisk: shadowVar.masteryFromDisk ?? true,
      skin: shadowVar.skin || shadowVar.cardArt || '',
      cardArt: shadowVar.cardArt || shadowVar.skin || '',
      icon: shadowVar.icon || '',
      price: shadowVar.price || { gems: '', diamonds: '', gemsdia: '' },
    };
  }
  const entry = skins[shadowKey];
  if (shadowVar.icon && !entry.icon) entry.icon = shadowVar.icon;
  if (shadowVar.cardArt && !entry.cardArt) entry.cardArt = shadowVar.cardArt;
  if (shadowVar.skin && !entry.skin) entry.skin = shadowVar.skin;
  if (shadowVar.loadout && !entry.loadout) entry.loadout = shadowVar.loadout;
  if (shadowVar.loadoutMeta && !entry.loadoutMeta) entry.loadoutMeta = shadowVar.loadoutMeta;
  if (shadowVar.unlock && !entry.unlock) entry.unlock = shadowVar.unlock;
  if (shadowVar.rarity && !entry.rarity) entry.rarity = shadowVar.rarity;
  if (shadowVar.tierBadge && !entry.tierBadge) entry.tierBadge = shadowVar.tierBadge;
  return true;
}

function skinsRecordToRows(godName, skinsRecord) {
  if (!skinsRecord || typeof skinsRecord !== 'object') return [];
  const rows = [];
  for (const [skinKey, skin] of Object.entries(skinsRecord)) {
    if (!skin || typeof skin !== 'object') continue;
    if (/^master(y|ies)$/i.test(String(skinKey))) continue;
    if (/^master(y|ies)$/i.test(String(skin?.name || '').trim())) continue;
    rows.push(skinRowToJson(godName, skinKey, skin));
  }
  return sortSkinRows(rows);
}

function getGodSkinsRecord(god) {
  if (!god || typeof god !== 'object') return null;
  if (god.skins && typeof god.skins === 'object') return god.skins;
  if (god.baseInformation?.skins && typeof god.baseInformation.skins === 'object') {
    return god.baseInformation.skins;
  }
  return null;
}

function parseCost(skin) {
  if (skin == null) return null;
  if (skin.cost != null && skin.cost !== '') return skin.cost;
  const price = skin.price;
  if (!price || typeof price !== 'object') return null;
  const diamonds = String(price.diamonds ?? '').trim();
  const gems = String(price.gems ?? '').trim();
  const gemsdia = String(price.gemsdia ?? '').trim();
  if (diamonds) return { currency: 'diamonds', amount: diamonds };
  if (gems) return { currency: 'gems', amount: gems };
  if (gemsdia) return { currency: 'gemsdia', amount: gemsdia };
  return null;
}

function inferSkinFlags(skinKey, skin, godName) {
  const blob = [
    skinKey,
    skin?.name,
    skin?.type,
    skin?.skin,
    skin?.cardArt,
    skin?.icon,
    skin?.inGame,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isBase = isBaseSkinRow(skinKey, skin, godName);
  const isCrossGen = /crossgen|cross_gen|cross gen/.test(blob);
  const isMasteryShadowSkin =
    !isBase &&
    (Boolean(skin?.isMasteryShadowSkin) ||
      normalizeSkinKey(skinKey) === 'shadow' ||
      /^shadow$/i.test(String(skin?.name || skin?.skinName || '').trim()));
  const isMastery =
    !isBase &&
    !isMasteryShadowSkin &&
    (Boolean(skin?.masteryFromDisk) ||
      /^mastery$/i.test(String(skinKey)) ||
      /\/mastery\//i.test(blob) ||
      String(skin?.type || '')
        .toLowerCase()
        .includes('mastery'));
  const hasVariants = Array.isArray(skin?.variants) && skin.variants.length > 0;
  const hasPrismVariants =
    hasVariants &&
    skin.variants.some((v) => /prism/i.test(String(v?.name || '')));
  const isPrism =
    !isBase &&
    !isMastery &&
    !isCrossGen &&
    (hasPrismVariants || /prism/.test(blob) || /\/prisms\//i.test(blob));
  const isRecolor =
    !isPrism &&
    !isMastery &&
    !isCrossGen &&
    !isBase &&
    (/recolor|colour|color variant/.test(blob) ||
      skin?.hideFromSkinList === true);

  return { isPrism, isRecolor, isMastery, isCrossGen, isMasteryShadowSkin };
}

function skinRowToJson(godName, skinKey, skin) {
  const flags = inferSkinFlags(skinKey, skin, godName);
  const assets = {};
  for (const key of ['skin', 'cardArt', 'icon', 'inGame', 'card_art', 'in_game']) {
    if (skin[key]) assets[key] = skin[key];
  }

  const isBaseSkin = isBaseSkinRow(skinKey, skin, godName);

  const row = {
    skinKey,
    skinName: skin.name || skinKey,
    cost: parseCost(skin),
    rarity: skin.rarity ?? null,
    isBaseSkin,
    isPrism: flags.isPrism,
    isRecolor: flags.isRecolor,
    isMastery: flags.isMastery,
    isCrossGen: flags.isCrossGen,
  };

  if (flags.isMasteryShadowSkin) row.isMasteryShadowSkin = true;

  if (skin.type || isBaseSkin) row.type = skin.type || (isBaseSkin ? 'Base Skin' : '');
  if (skin.hideFromSkinList) row.hideFromSkinList = true;
  if (skin.voiceSkinFolder) row.voiceSkinFolder = skin.voiceSkinFolder;
  if (Object.keys(assets).length) row.assets = assets;
  if (skin.price && typeof skin.price === 'object') row.price = skin.price;
  if (Array.isArray(skin.variants) && skin.variants.length) {
    row.variants = skin.variants.map((v) => ({ ...v }));
  }
  for (const extra of [
    'gameplayScreenshot',
    'modelPreview',
    'screenshot',
    'masteryFromDisk',
  ]) {
    if (skin[extra] != null) row[extra] = skin[extra];
  }

  return row;
}

function jsonRowToBuildsSkin(row) {
  const skin = {
    name: row.skinName || row.skinKey,
    skin: row.assets?.skin || row.skin || '',
    type: row.isBaseSkin ? 'Base Skin' : row.type || '',
    price: row.price || { gems: '', diamonds: '', gemsdia: '' },
  };

  if (row.cost != null) skin.cost = row.cost;
  if (row.rarity != null) skin.rarity = row.rarity;
  if (row.isPrism) skin.isPrism = true;
  if (row.isRecolor) skin.isRecolor = true;
  if (row.isMastery) skin.isMastery = true;
  if (row.isCrossGen) skin.isCrossGen = true;
  if (row.hideFromSkinList) skin.hideFromSkinList = true;
  if (row.voiceSkinFolder) skin.voiceSkinFolder = row.voiceSkinFolder;
  if (row.assets) {
    for (const [k, v] of Object.entries(row.assets)) {
      if (v) skin[k] = v;
    }
  }
  if (row.variants) skin.variants = row.variants;
  for (const extra of [
    'gameplayScreenshot',
    'modelPreview',
    'screenshot',
    'masteryFromDisk',
    'cardArt',
    'icon',
    'inGame',
  ]) {
    if (row[extra] != null && skin[extra] == null) skin[extra] = row[extra];
  }
  if (!skin.cardArt && skin.assets?.cardArt) skin.cardArt = skin.assets.cardArt;
  if (!skin.icon && skin.assets?.icon) skin.icon = skin.assets.icon;
  if (!skin.inGame && skin.assets?.inGame) skin.inGame = skin.assets.inGame;
  if (!skin.skin && skin.cardArt) skin.skin = skin.cardArt;

  return skin;
}

function loadBuildsJson() {
  if (!fs.existsSync(BUILDS_JSON)) {
    throw new Error(`builds.json not found at ${BUILDS_JSON}`);
  }
  return JSON.parse(fs.readFileSync(BUILDS_JSON, 'utf8'));
}

function sanitizeFileName(name) {
  return String(name).replace(/[<>:"/\\|?*]/g, '_');
}

function buildPantheonExport(builds) {
  const gods = flattenGods(builds.gods);
  /** @type {Map<string, { pantheon: string, gods: object[] }>} */
  const byPantheon = new Map();

  for (const god of gods) {
    const skins = getGodSkinsRecord(god);
    if (!skins || !Object.keys(skins).length) continue;

    const pantheon = getGodPantheon(god);
    const godName = getGodDisplayName(god);
    const skinsRecord = { ...skins };
    promoteMasteryShadowInSkinsRecord(skinsRecord, godName);
    removeMasteryLightInSkinsRecord(skinsRecord, godName);
    normalizeMasteryAngelicDemonicInSkinsRecord(skinsRecord, godName);
    if (!byPantheon.has(pantheon)) {
      byPantheon.set(pantheon, { pantheon, gods: [] });
    }
    byPantheon.get(pantheon).gods.push({
      godName,
      internalName: god.internalName || null,
      skins: skinsRecordToRows(godName, skinsRecord),
    });
  }

  for (const entry of byPantheon.values()) {
    entry.gods.sort((a, b) =>
      a.godName.localeCompare(b.godName, undefined, { sensitivity: 'base' })
    );
  }

  return [...byPantheon.values()].sort((a, b) =>
    a.pantheon.localeCompare(b.pantheon, undefined, { sensitivity: 'base' })
  );
}

function readPantheonSkinFiles() {
  if (!fs.existsSync(SKINS_DIR)) return [];
  const files = fs
    .readdirSync(SKINS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const payloads = [];
  for (const file of files) {
    const full = path.join(SKINS_DIR, file);
    if (!fs.statSync(full).isFile()) continue;
    payloads.push(JSON.parse(fs.readFileSync(full, 'utf8')));
  }
  return payloads;
}

function removeLegacySkinSubdirs() {
  if (!fs.existsSync(SKINS_DIR)) return 0;
  let removed = 0;
  for (const entry of fs.readdirSync(SKINS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    fs.rmSync(path.join(SKINS_DIR, entry.name), { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

module.exports = {
  BUILDS_JSON,
  SKINS_DIR,
  flattenGods,
  getGodDisplayName,
  getGodFolderName,
  getGodPantheon,
  pantheonToFileName,
  getGodSkinsRecord,
  skinRowToJson,
  jsonRowToBuildsSkin,
  skinsRecordToRows,
  buildPantheonExport,
  readPantheonSkinFiles,
  removeLegacySkinSubdirs,
  loadBuildsJson,
  sanitizeFileName,
  normalizeSkinKey,
  isMasteryShadowVariantName,
  isMasteryLightVariantName,
  isMasteryAngelicVariantName,
  isMasteryDemonicVariantName,
  removeMasteryDemonicFromVariants,
  removeMasteryAngelicFromVariants,
  normalizeMasteryAngelicDemonicFromVariants,
  normalizeMasteryAngelicDemonicInGodSkinsArray,
  normalizeMasteryAngelicDemonicInSkinsRecord,
  removeMasteryLightFromVariants,
  removeMasteryLightInGodSkinsArray,
  removeMasteryLightInSkinsRecord,
  shadowSkinRowFromVariant,
  promoteMasteryShadowInGodSkinsArray,
  promoteMasteryShadowInSkinsRecord,
};
