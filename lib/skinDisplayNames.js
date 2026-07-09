// Resolves human-facing skin display names from the God Render screenshot map
// (app/data/God Information/Skins/_godRenderScreenshotMap.json) rather than the
// internal variant names ("Prism B", "Prism D", ...) stored in builds.json.
//
// The map is keyed per god by screenshot file; each entry carries:
//   godName, skinKey/parentSkinKey, skinName/parentSkinName, variantName, displayName
// We index displayName under (god|skinKey|variant) and (god|skinName|variant) for
// variants, and (god|k|skinKey) / (god|n|skinName) for base skins.

const norm = (s) => (s || '').toString().trim().toLowerCase();

let LOOKUP = null;

function buildLookup() {
  if (LOOKUP) return LOOKUP;
  const map = new Map();
  let data = null;
  try {
    // eslint-disable-next-line global-require
    data = require('../app/data/God Information/Skins/_godRenderScreenshotMap.json');
  } catch (_) {
    LOOKUP = map;
    return map;
  }
  const gods = data && data.gods ? data.gods : {};
  Object.values(gods).forEach((shots) => {
    if (!shots || typeof shots !== 'object') return;
    Object.values(shots).forEach((shot) => {
      if (!shot || typeof shot !== 'object') return;
      const display = String(shot.displayName || '').trim();
      if (!display) return;
      const g = norm(shot.godName);
      if (!g) return;
      const variant = norm(shot.variantName);
      const skinKey = norm(shot.skinKey || shot.parentSkinKey);
      const skinName = norm(shot.skinName || shot.parentSkinName);
      const put = (k) => {
        if (k && !map.has(k)) map.set(k, display);
      };
      if (variant) {
        put(`${g}|${skinKey}|${variant}`);
        put(`${g}|${skinName}|${variant}`);
      } else {
        put(`${g}|k|${skinKey}`);
        put(`${g}|n|${skinName}`);
      }
    });
  });
  LOOKUP = map;
  return map;
}

/**
 * @param {{ godName?: string, skinKey?: string, skinName?: string, variantName?: string, fallback?: string }} args
 * @returns {string} display name from the screenshot map, else `fallback`.
 */
export function resolveSkinDisplayName({ godName, skinKey, skinName, variantName, fallback } = {}) {
  const map = buildLookup();
  const g = norm(godName);
  const kk = norm(skinKey);
  const nk = norm(skinName);
  const vk = norm(variantName);
  const fb = fallback != null ? fallback : (variantName || skinName || '');
  if (!g) return fb;
  if (vk) {
    return map.get(`${g}|${kk}|${vk}`) || map.get(`${g}|${nk}|${vk}`) || fb;
  }
  return map.get(`${g}|k|${kk}`) || map.get(`${g}|n|${nk}`) || fb;
}
