/**
 * Build Smite Wars alternative-card entries from builds.json god skins (+ prism variants).
 * Art paths prefer cardArt (NewGodSkins) via getSkinCardArtPath.
 */
import { flattenBuildsGods } from './normalizeBuildsGod';
import { getSkinCardArtPath, parseSkinVariants } from './skinShowcaseHelpers';

const BLOCKED_SKIN_FILENAMES = new Set(['mercury_010.webp']);

export function isBlockedProphecySkinPath(skinPath) {
  const filename = String(skinPath || '').split('/').pop() || '';
  return BLOCKED_SKIN_FILENAMES.has(filename.toLowerCase());
}

function toTitleWords(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getCleanSkinTitle(raw) {
  let base = String(raw || '').trim();
  if (!base) return '';
  base = base.replace(/\.(png|jpg|jpeg|webp|json)$/i, '');
  base = base.replace(/^t_(godcard|skincard|teamroster|godfull|godmini|godportrait)_/i, '');
  const parts = base.split('_').filter(Boolean);
  const kept = parts
    .filter((p) => !/^(skin|god|card|default|base|prism|mystic|p\d+)$/i.test(p))
    .join(' ')
    .trim();
  return toTitleWords(kept || base);
}

/** Match Database / screenshot-map style: "Skin Name God" or skin title alone if it includes god. */
export function buildProphecyVariantName(godName, skinName, skinPath, skinKey) {
  const god = String(godName || '').trim();
  if (!god) return 'Unknown Skin';
  const fromFilename = String(skinPath || '').split('/').pop() || '';
  const candidateRaw =
    String(skinName || '').trim() ||
    String(skinKey || '').trim() ||
    fromFilename;
  let skinTitle = getCleanSkinTitle(candidateRaw);
  if (!skinTitle || /^base$/i.test(skinTitle)) {
    skinTitle = getCleanSkinTitle(fromFilename);
  }
  if (!skinTitle || /^base$/i.test(skinTitle)) return god;
  if (skinTitle.toLowerCase().includes(god.toLowerCase())) return skinTitle;
  return `${skinTitle} ${god}`;
}

/** Prism / mastery overlay label — e.g. "Mystic Guardian - Prism P2" (screenshot map style). */
export function buildProphecyPrismVariantName(parentSkinName, variantName) {
  const parent = String(parentSkinName || '').trim();
  const variant = String(variantName || '').trim();
  if (parent && variant) return `${parent} - ${variant}`;
  return variant || parent || 'Prism';
}

function entryPath(skinRow, variantRow) {
  const row = variantRow || skinRow;
  const p =
    getSkinCardArtPath(row) ||
    getSkinCardArtPath(skinRow) ||
    row?.skin ||
    skinRow?.skin ||
    null;
  return p ? String(p).trim() : null;
}

function isBaseSkinRow(skinName, skinKey) {
  const n = String(skinName || skinKey || '').toLowerCase();
  return !n || n.includes('base') || n === 'default';
}

/**
 * @returns {Array<{ key, path, displayName, skinKey, variantName?, isPrism?, parentSkinName? }>}
 */
export function collectGodSkinEntries(god) {
  const godName = String(god?.name || '').trim();
  const skinsObj = god?.skins;
  if (!godName || !skinsObj || typeof skinsObj !== 'object') return [];

  const out = [];
  const seenPaths = new Set();

  const push = (entry) => {
    if (!entry?.path || isBlockedProphecySkinPath(entry.path)) return;
    if (seenPaths.has(entry.path)) return;
    seenPaths.add(entry.path);
    out.push(entry);
  };

  Object.entries(skinsObj).forEach(([skinKey, skinRow]) => {
    if (!skinRow || typeof skinRow !== 'object') return;
    if (skinRow.hideFromSkinList || skinRow.hide_from_skin_list) return;

    const skinName = String(skinRow.name || skinKey || '').trim();
    if (isBaseSkinRow(skinName, skinKey)) return;

    const basePath = entryPath(skinRow, null);
    if (basePath) {
      push({
        key: `${skinKey}`,
        path: basePath,
        displayName: buildProphecyVariantName(godName, skinName, basePath, skinKey),
        skinKey: String(skinKey),
        variantName: null,
        isPrism: false,
        parentSkinName: skinName,
      });
    }

    parseSkinVariants(skinRow).forEach((variant, idx) => {
      const vPath = entryPath(skinRow, variant);
      if (!vPath) return;
      const vName = String(variant?.name || variant?.displayName || `Prism ${idx + 1}`).trim();
      push({
        key: `${skinKey}_v_${idx}`,
        path: vPath,
        displayName: buildProphecyPrismVariantName(skinName, vName),
        skinKey: String(skinKey),
        variantName: vName,
        isPrism: /prism/i.test(vName) || /prism/i.test(String(variant?.tier || '')),
        parentSkinName: skinName,
      });
    });
  });

  return out;
}

/** Map god display name → skin pool entries (pack cosmetic rolls). */
export function buildSkinPoolByGod(gods) {
  const out = {};
  flattenBuildsGods(gods).forEach((god) => {
    const godName = String(god?.name || '').trim();
    if (!godName) return;
    const list = collectGodSkinEntries(god).map((e) => ({
      key: e.key,
      name: e.displayName,
      path: e.path,
      isPrism: e.isPrism,
      variantName: e.variantName,
      parentSkinName: e.parentSkinName,
    }));
    if (list.length) out[godName] = list;
  });
  return out;
}

/** Alternative god cards — one card per non-base skin + each prism variant. */
export function buildAlternativeGodCards(baseGodCards, gods) {
  const godDataByName = {};
  flattenBuildsGods(gods).forEach((god) => {
    const name = String(god?.name || '').trim().toLowerCase();
    if (name) godDataByName[name] = god;
  });

  const altCards = [];
  baseGodCards.forEach((baseCard) => {
    const godName = String(baseCard?.name || '').trim();
    if (!godName) return;
    const godData = godDataByName[godName.toLowerCase()] || null;
    if (!godData) return;

    const entries = collectGodSkinEntries(godData);
    entries.forEach((entry) => {
      const slug = String(entry.key).replace(/[^a-zA-Z0-9]+/g, '_');
      altCards.push({
        ...baseCard,
        id: `alt_${baseCard.id}_${slug}`,
        name: entry.displayName,
        baseGodId: baseCard.id,
        baseGodName: godName,
        isAlternativeCard: true,
        altSkinPath: entry.path,
        altVariantName: entry.displayName,
        altSkinKey: entry.skinKey,
        altPrismName: entry.variantName,
        isPrismVariant: !!entry.isPrism,
      });
    });
  });
  return altCards;
}
