/**
 * New god patch splash art — Metro requires static requires.
 * Key format: ob{patch}-{shortName} (e.g. ob37-bastet)
 *
 * `source` — hero splash for Patch Hub featured card (wide art stage).
 * `scorecard` — optional strip asset (title bar / compact uses).
 */
const NEW_GOD_PATCH_IMAGES = {
  'ob38-chronos': {
    // TODO: swap source to Patch Notes/New God Image/Chronos_Splash.png when exported
    source: require('../app/data/NewGodSkins/Chronos/Default/t_GodFull_Chronos.png'),
    scorecard: require('../app/data/Patch Notes/New God Image/t_Scorecard_Chronos.png'),
    aspectRatio: 16 / 9,
    scorecardAspectRatio: 180 / 52,
  },
  'ob37-bastet': {
    source: require('../app/data/Patch Notes/New God Image/Bastet_Splash.png'),
    scorecard: require('../app/data/Patch Notes/New God Image/t_Scorecard_Bastet.png'),
    aspectRatio: 16 / 9,
    scorecardAspectRatio: 180 / 52,
  },
};

function getNewGodPatchAsset(key) {
  if (!key) return null;
  return NEW_GOD_PATCH_IMAGES[key] ?? null;
}

function getNewGodPatchImage(key) {
  return getNewGodPatchAsset(key)?.source ?? null;
}

module.exports = {
  NEW_GOD_PATCH_IMAGES,
  getNewGodPatchAsset,
  getNewGodPatchImage,
};
