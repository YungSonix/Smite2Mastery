const patchIndex = require('../app/data/Patch Notes/patchnotes-index.json');

const openBetaCategory = patchIndex.categories.find((c) => c.id === 'open_beta');
const openBetaPatches = openBetaCategory?.patches ?? [];

/** Highest Open Beta patch number from patchnotes-index.json */
const LATEST_OPEN_BETA_PATCH = openBetaPatches[0]?.number ?? 38;

/** Catch Me Up picker default — one patch behind latest */
const CATCH_UP_DEFAULT_PATCH = Math.max(1, LATEST_OPEN_BETA_PATCH - 1);

/** How many OB patches appear in the Catch Me Up picker */
const CATCH_UP_PICKER_DEPTH = 12;

const CATCH_UP_PICKER_MIN = Math.max(1, LATEST_OPEN_BETA_PATCH - CATCH_UP_PICKER_DEPTH + 1);

function getCatchUpPickerPatches() {
  const patches = [];
  for (let n = LATEST_OPEN_BETA_PATCH; n >= CATCH_UP_PICKER_MIN; n -= 1) {
    patches.push(n);
  }
  return patches;
}

function getPatchMeta(patchNumber) {
  return openBetaPatches.find((p) => p.number === patchNumber) ?? null;
}

module.exports = {
  LATEST_OPEN_BETA_PATCH,
  CATCH_UP_DEFAULT_PATCH,
  CATCH_UP_PICKER_DEPTH,
  CATCH_UP_PICKER_MIN,
  getCatchUpPickerPatches,
  getPatchMeta,
  openBetaPatches,
};
