/**
 * Merge vision-tagged pantheon skin rows (loadout, costs, unlock, information)
 * onto builds.json `skins` records for the Database skin showcase.
 *
 * Primary source at runtime: GitHub raw JSON under
 * app/data/God Information/Skins/{Pantheon}.json (Smite2Mastery master).
 * Bundled pantheon files are the offline / first-paint fallback.
 */
import { REMOTE_BASE_URLS } from '../config';

const SKINS_JSON_BASE = `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/app/data/God%20Information/Skins`;

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
  'price',
  'rarity',
  'tierBadge',
  'unlock',
  'information',
  'type',
  'isBaseSkin',
  'isMasteryShadowSkin',
  'isPrism',
  'isCrossGen',
  'isMastery',
  'isRecolor',
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

function normalizePantheonKey(pantheonName) {
  return String(pantheonName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function buildBundledPantheonMap() {
  const map = new Map();
  for (const payload of PANTHEON_PAYLOADS) {
    const label = payload?.pantheon;
    if (label) map.set(normalizePantheonKey(label), payload);
  }
  return map;
}

const BUNDLED_BY_PANTHEON = buildBundledPantheonMap();

/** @type {Map<string, object>} */
const runtimePayloadByPantheon = new Map();
/** @type {Map<string, Promise<object|null>>} */
const fetchInFlight = new Map();

function buildGodIndexFromPayloads(payloads) {
  const index = new Map();
  for (const payload of payloads) {
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

const GOD_INDEX = buildGodIndexFromPayloads(PANTHEON_PAYLOADS);

function getPantheonPayload(pantheonName) {
  const key = normalizePantheonKey(pantheonName);
  if (!key) return null;
  return runtimePayloadByPantheon.get(key) || BUNDLED_BY_PANTHEON.get(key) || null;
}

function findGodInPayload(payload, godDisplayName, godKey) {
  if (!payload?.gods?.length) return null;
  const name = String(godDisplayName || '').trim();
  const internal = String(godKey || '')
    .trim()
    .replace(/_Item$/i, '');
  const lookupKey = normalizeGodLookupKey(name, internal);
  const byNameOnly = normalizeGodLookupKey(name, '');
  return (
    payload.gods.find((g) => normalizeGodLookupKey(g.godName, g.internalName) === lookupKey) ||
    payload.gods.find((g) => normalizeGodLookupKey(g.godName, '') === byNameOnly) ||
    payload.gods.find((g) => String(g.godName || '').toLowerCase() === name.toLowerCase()) ||
    null
  );
}

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

function findPantheonGod(godDisplayName, godKey, pantheonName) {
  if (pantheonName) {
    const payload = getPantheonPayload(pantheonName);
    const god = findGodInPayload(payload, godDisplayName, godKey);
    if (god) return god;
  }
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
 * Fetch latest pantheon skin JSON from GitHub (cached per session).
 * @param {string} pantheonName e.g. "Roman"
 * @returns {Promise<object|null>}
 */
export async function refreshPantheonSkinsFromGitHub(pantheonName) {
  const key = normalizePantheonKey(pantheonName);
  if (!key) return null;
  if (runtimePayloadByPantheon.has(key)) {
    return runtimePayloadByPantheon.get(key);
  }
  if (fetchInFlight.has(key)) {
    return fetchInFlight.get(key);
  }

  const bundled = BUNDLED_BY_PANTHEON.get(key) || null;
  const url = `${SKINS_JSON_BASE}/${encodeURIComponent(String(pantheonName).trim())}.json`;

  const promise = fetch(url, { cache: 'no-cache' })
    .then((res) => (res.ok ? res.json() : bundled))
    .catch(() => bundled)
    .then((data) => {
      if (data && typeof data === 'object') {
        runtimePayloadByPantheon.set(key, data);
      }
      fetchInFlight.delete(key);
      return data || bundled;
    });

  fetchInFlight.set(key, promise);
  return promise;
}

/**
 * @param {string} godDisplayName
 * @param {string|null} godKey internalName or builds key
 * @param {Record<string, object>|null} skinsRecord
 * @param {string|null} [pantheonName]
 * @returns {Record<string, object>|null}
 */
export function enrichGodSkinsRecord(godDisplayName, godKey, skinsRecord, pantheonName = null) {
  if (!skinsRecord || typeof skinsRecord !== 'object') return skinsRecord;
  const pantheonGod = findPantheonGod(godDisplayName, godKey, pantheonName);
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
