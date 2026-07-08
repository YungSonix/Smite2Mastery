const highlightsRegistry = require('./patchHighlightsRegistry');
const { LATEST_OPEN_BETA_PATCH } = require('./patchNotesConfig');

/**
 * Curated Simple Summary source — you edit one JSON per patch.
 * patchnotesobN.json is used for full detail / Archive / tooltips.
 */
function loadPatchHighlights(patchNumber) {
  return highlightsRegistry[patchNumber] ?? null;
}

function loadLatestPatchHighlights() {
  return loadPatchHighlights(LATEST_OPEN_BETA_PATCH);
}

function hasPatchHighlights(patchNumber) {
  return Boolean(highlightsRegistry[patchNumber]);
}

/** Normalize highlights into display buckets for Simple Summary / Catch Me Up */
function getHighlightBuckets(highlights) {
  if (!highlights) return null;

  const g = highlights.gods ?? {};
  const i = highlights.items ?? {};
  const n = highlights.new ?? {};

  return {
    patchNumber: highlights.patchNumber,
    patchLabel: highlights.patchLabel,
    summaryLine: highlights.summaryLine ?? '',
    newGods: n.gods ?? [],
    newAspects: n.aspects ?? [],
    newSkins: n.skins ?? [],
    wanderingMarket: n.wanderingMarket ?? [],
    newEvents: n.events ?? [],
    newItems: n.items ?? [],
    godsBuffed: g.buffed ?? [],
    godsNerfed: g.nerfed ?? [],
    godsAdjusted: g.adjusted ?? [],
    itemsBuffed: i.buffed ?? [],
    itemsNerfed: i.nerfed ?? [],
    itemsNew: i.new ?? [],
    itemsAdjusted: i.adjusted ?? [],
    systems: highlights.systems ?? [],
  };
}

module.exports = {
  loadPatchHighlights,
  loadLatestPatchHighlights,
  hasPatchHighlights,
  getHighlightBuckets,
};
