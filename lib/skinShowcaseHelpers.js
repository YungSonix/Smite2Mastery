/**
 * Skin showcase JSON — optional fields you can add later in builds.json per skin:
 *
 * - cardArt / card_art / splash — hero “card” image (defaults to skin loadout path `skin`)
 * - inGame / in_game / gameplay / gameplayScreenshot / modelPreview / model / screenshot — “View model” / gameplay image
 * - icon / thumb / thumbnail — top-strip portrait (defaults to `skin`)
 * - variants: [{ ...same optional keys as parent, merged over base skin }] — bottom-left variant dots
 */

export function getSkinCardArtPath(skin) {
  if (!skin || typeof skin !== 'object') return null;
  const p = skin.cardArt || skin.card_art || skin.splash || skin.skin || null;
  return p ? String(p).trim() || null : null;
}

export function getSkinModelViewPath(skin) {
  if (!skin || typeof skin !== 'object') return null;
  const p =
    skin.inGame ||
    skin.in_game ||
    skin.gameplay ||
    skin.gameplayScreenshot ||
    skin.gameplay_screenshot ||
    skin.modelPreview ||
    skin.model_preview ||
    skin.model ||
    skin.screenshot ||
    null;
  return p ? String(p).trim() || null : null;
}

export function getSkinThumbPath(skin) {
  if (!skin || typeof skin !== 'object') return null;
  const p = skin.icon || skin.thumb || skin.thumbnail || skin.skin || null;
  return p ? String(p).trim() || null : null;
}

export function parseSkinVariants(skin) {
  if (!skin?.variants || !Array.isArray(skin.variants)) return [];
  return skin.variants.filter((v) => v && typeof v === 'object');
}

export function mergeSkinVariant(baseSkin, variant) {
  if (!variant) return baseSkin || {};
  return { ...(baseSkin || {}), ...variant };
}
