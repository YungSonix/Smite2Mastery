'use strict';

const path = require('path');

/**
 * Persistent tag for a God Renders screenshot → skin/variant target.
 * Written to loadoutMeta.screenshotTag and `_godRenderScreenshotMap.json`.
 */
function buildScreenshotTag(extracted, match, godEntry) {
  const screenshot = extracted?.screenshot || null;
  const fileName = screenshot ? path.basename(screenshot) : null;
  const tag = {
    screenshot,
    fileName,
    godName: godEntry?.godName || extracted?.godName || null,
    displayName: extracted?.displayName || null,
    target: match?.target || 'unmatched',
    appliedTo: null,
  };

  if (match?.skin) {
    tag.skinKey = match.skin.skinKey || null;
    tag.skinName = match.skin.skinName || null;
  }
  if (match?.variant?.name) {
    tag.variantName = match.variant.name;
    tag.parentSkinKey = match.skin?.skinKey || null;
    tag.parentSkinName = match.skin?.skinName || null;
  } else if (match?.variantName) {
    tag.variantName = match.variantName;
    tag.parentSkinKey = match.skin?.skinKey || null;
    tag.parentSkinName = match.skin?.skinName || null;
  }

  if (extracted?.cost && extracted.cost.amount != null && !extracted.cost.navigateOnly) {
    tag.cost = { ...extracted.cost };
  }
  if (extracted?.tier) tag.tier = extracted.tier;

  if (match?.skin) {
    if (match.variant) {
      tag.appliedTo = `${match.skin.skinName} → ${match.variant.name}`;
    } else {
      tag.appliedTo = match.skin.skinName;
    }
  }

  return tag;
}

function attachScreenshotTag(loadoutMeta, tag) {
  if (!loadoutMeta || !tag) return loadoutMeta;
  return { ...loadoutMeta, screenshotTag: tag };
}

/** Merge per-god tags keyed by screenshot basename. */
function mergeGodScreenshotMap(map, godFolder, tags) {
  if (!godFolder || !tags?.length) return map;
  const key = String(godFolder).toLowerCase();
  if (!map[key]) map[key] = {};
  for (const tag of tags) {
    if (!tag?.fileName) continue;
    map[key][tag.fileName] = tag;
  }
  return map;
}

module.exports = {
  buildScreenshotTag,
  attachScreenshotTag,
  mergeGodScreenshotMap,
};
