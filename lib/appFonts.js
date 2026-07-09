// Cross-platform display fonts.
//
// The shop lets players equip a display-name font. To keep it FAIR, every
// platform (web + iOS + Android) must render the exact same typeface — no
// OS-specific fallbacks. We do that by loading a curated set of Google Fonts
// at runtime via expo-font from the google/fonts CDN (jsDelivr). expo-font
// registers the family on native (downloaded + cached) and injects an
// @font-face on web, so `fontFamily: 'BebasNeue'` looks identical everywhere.
import { useFonts } from 'expo-font';
import { CURATED_FONTS, FONT_FAMILY_BY_KEY } from './shopData';

const CDN = 'https://cdn.jsdelivr.net/gh/google/fonts@main/';

// { [fontFamily]: remoteTtfUrl } for expo-font
export const APP_FONT_SOURCES = CURATED_FONTS.reduce((acc, f) => {
  acc[f.family] = CDN + f.file;
  return acc;
}, {});

export { FONT_FAMILY_BY_KEY };

// Resolve a stored font key (from profile / shop) to a loaded fontFamily.
// Returns undefined for 'default'/unknown so the system font is used.
export function resolveFontFamily(fontKey) {
  if (!fontKey || fontKey === 'default') return undefined;
  return FONT_FAMILY_BY_KEY[fontKey];
}

// Hook: load all curated fonts. Non-blocking — text shows the system font until
// each family finishes loading, then swaps in. Safe to call from multiple
// screens (expo-font de-dupes).
export function useAppFonts() {
  const [loaded] = useFonts(APP_FONT_SOURCES);
  return loaded;
}
