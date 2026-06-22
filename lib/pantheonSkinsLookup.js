/**
 * Runtime merge of vision-tagged pantheon skin rows (loadout, costs, info)
 * onto builds.json `skins` records for the Database god detail panel.
 */
const PANTHEON_PAYLOADS = [
  require('../app/data/God Information/Skins/Arthurian.json'),
  require('../app/data/God Information/Skins/Babylonian.json'),
  require('../app/data/God Information/Skins/Celtic.json'),
  require('../app/data/God Information/Skins/Chinese.json'),
  require('../app/data/God Information/Skins/Egyptian.json'),
  require('../app/data/God Information/Skins/Greek.json'),
  require('../app/data/God Information/Skins/Hindu.json'),
  require('../app/data/God Information/Skins/Japanese.json'),
  require('../app/data/God Information/Skins/Korean.json'),
  require('../app/data/God Information/Skins/Mayan.json'),
  require('../app/data/God Information/Skins/Norse.json'),
  require('../app/data/God Information/Skins/Polynesian.json'),
  require('../app/data/God Information/Skins/Roman.json'),
  require('../app/data/God Information/Skins/Tales of Arabia.json'),
  require('../app/data/God Information/Skins/Voodoo.json'),
  require('../app/data/God Information/Skins/Yoruba.json'),
];

const LOADOUT_FIELDS = [
  'loadout',
  'loadoutMeta',
  'cost',
  'rarity',
  'tierBadge',
  'unlock',
  'information',
  'type',
  'isBaseSkin',
  'isMasteryShadowSkin',
  'isPrism',
  'isCrossGen',
];

function normalizeGodLookupKey(godName, internalName) {
  const name = String(godName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  const internal = String(internalName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return `${name}|${internal}`;
}

function buildGodIndex() {
  const index = new Map();
  for (const payload of PANTHEON_PAYLOADS) {
    for (const god of payload?.gods || []) {
      const key = normalizeGodLookupKey(god.godName, god.internalName);
      index.set(key, god);
      if (god.godName) {
        index.set(normalizeGodLookupKey(god.godName, ''), god);
      }
    }
  }
  return index;
}

const GOD_INDEX = buildGodIndex();

function copyLoadoutFields(source) {
  if (!source || typeof source !== 'object') return {};
  const out = {};
  for (const key of LOADOUT_FIELDS) {
    if (source[key] != null) out[key] = source[key];
  }
  return out;
}

function mergeVariantRows(buildsVariants, pantheonVariants) {
  if (!Array.isArray(pantheonVariants) || !pantheonVariants.length) {
    return buildsVariants;
  }
  if (!Array.isArray(buildsVariants) || !buildsVariants.length) {
    return pantheonVariants.map((v) => ({ ...v }));
  }
  return buildsVariants.map((variant) => {
    const name = String(variant?.name || '').trim();
    const match =
      pantheonVariants.find((v) => String(v?.name || '').trim() === name) ||
      pantheonVariants.find((v) =>
        name && String(v?.name || '').toLowerCase().includes(name.toLowerCase())
      );
    if (!match) return variant;
    return { ...variant, ...copyLoadoutFields(match) };
  });
}

function mergeSkinFromPantheon(buildsSkin, pantheonRow) {
  if (!buildsSkin || !pantheonRow) return buildsSkin;
  const merged = { ...buildsSkin, ...copyLoadoutFields(pantheonRow) };
  if (pantheonRow.assets && typeof pantheonRow.assets === 'object') {
    merged.assets = { ...(buildsSkin.assets || {}), ...pantheonRow.assets };
    for (const [k, v] of Object.entries(pantheonRow.assets)) {
      if (v && !merged[k]) merged[k] = v;
    }
  }
  if (pantheonRow.skinName && !merged.name) merged.name = pantheonRow.skinName;
  merged.variants = mergeVariantRows(buildsSkin.variants, pantheonRow.variants);
  return merged;
}

function findPantheonGod(godDisplayName, godKey) {
  const name = String(godDisplayName || '').trim();
  const internal = String(godKey || '')
    .trim()
    .replace(/_Item$/i, '');
  return (
    GOD_INDEX.get(normalizeGodLookupKey(name, internal)) ||
    GOD_INDEX.get(normalizeGodLookupKey(name, '')) ||
    null
  );
}

/**
 * @param {string} godDisplayName
 * @param {string|null} godKey internalName or builds key
 * @param {Record<string, object>|null} skinsRecord
 * @returns {Record<string, object>|null}
 */
export function enrichGodSkinsRecord(godDisplayName, godKey, skinsRecord) {
  if (!skinsRecord || typeof skinsRecord !== 'object') return skinsRecord;
  const pantheonGod = findPantheonGod(godDisplayName, godKey);
  if (!pantheonGod?.skins?.length) return skinsRecord;

  const pantheonByKey = new Map(
    pantheonGod.skins.filter((row) => row?.skinKey).map((row) => [row.skinKey, row])
  );

  const out = {};
  for (const [skinKey, skin] of Object.entries(skinsRecord)) {
    out[skinKey] = mergeSkinFromPantheon(skin, pantheonByKey.get(skinKey));
  }
  return out;
}
