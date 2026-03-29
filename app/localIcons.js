import { ICON_PATHS } from '../config';
import { ROLE_ICONS, PANTHEON_ICON_FILES } from '../lib/imageGrabber';

const ITEM_ICONS_PATH = ICON_PATHS.ITEM_ICONS;
const ITEM_ICONS_FILLED_PATH = ICON_PATHS.ITEM_ICONS_FILLED;
const GOD_ICONS_PATH = ICON_PATHS.GOD_ICONS;
const SKINS_PATH = ICON_PATHS.SKINS;

// Stable `{ uri }` instances so expo-image does not treat every render as a new source (avoids refetch/flash).
const uriSourceCache = new Map();

function createImageUri(basePath, filename) {
  const encodedFilename = encodeURIComponent(filename);
  const uri = `${basePath}/${encodedFilename}`;
  let cached = uriSourceCache.get(uri);
  if (!cached) {
    cached = { uri, cacheKey: uri };
    uriSourceCache.set(uri, cached);
  }
  return cached;
}

// Item icon lookup - returns object with both lowercase and original case options
// Tries lowercase first, then falls back to original case
// options.filled: use Item Icons Filled folder when true
const itemIconResultCache = new Map();

export function getLocalItemIcon(iconPath, options = {}) {
  if (!iconPath) return null;
  const base = iconPath.split('/').pop() || '';
  if (!base) return null;

  const basePath = options.filled ? ITEM_ICONS_FILLED_PATH : ITEM_ICONS_PATH;

  const lowercaseBase = base.toLowerCase();
  const originalBase = base;
  const resultCacheKey = `${basePath}|${lowercaseBase}|${originalBase}`;
  const cachedResult = itemIconResultCache.get(resultCacheKey);
  if (cachedResult) return cachedResult;

  let result;
  if (lowercaseBase === originalBase) {
    result = createImageUri(basePath, lowercaseBase);
  } else {
    result = {
      primary: createImageUri(basePath, lowercaseBase),
      fallback: createImageUri(basePath, originalBase),
    };
  }
  itemIconResultCache.set(resultCacheKey, result);
  return result;
}

// Optional overrides for god icon base names when GitHub uses a shortened name.
// Keys and values are all lowercase, with spaces removed.
// Example: "Jormungandr" icons on GitHub might be "jormImage.webp", etc.
const GOD_ICON_BASE_OVERRIDES = {
 jormungandr: 'jorm',
 yemoja: 'yem',
 jingwei: 'jing',
 princessbari: 'bari',
 nemesis: 'nem',
 aphrodite:'aphro',
houyi:'houYi',
 amaterasu:'ama',
baronsamedi: 'baron',
 daji: 'daJi',
 bellona:'bell',
 mercury:'merc',
 izanami: 'iza',
 sunwukong:'wukong',
 thanatos:'thana',
 danzaburou:'danza',
 themorrigan:'morri',
 huamulan:'mulan',
 hercules:'herc',
 kukulkan:'kuku',
 xbalanque:'xbal',
 poseidon: 'pos',
 cernunnos: 'cern',
 tsukuyomi: 'tsuku',
 bellona: 'bell',
 hunbatz: 'batz',
 guanyu: 'guan',
 nuwa:'nuWa',
 cabrakan: 'cab',
 cerberus: 'cerb',
 artio: 'artioDruid',
 ullr: 'ullrAxe',
 merlin: 'merlinFire',
};

// Gods that have multiple forms/stances with different ability icons
// Example: Artio has Bear and Druid forms, so abilities are like "artioBearOne.webp" and "artioDruidOne.webp"
const GOD_VARIANTS = {
  artio: ['Bear', 'Druid'],
  ullr: ['Axe', 'Bow'],
  merlin: ['Fire', 'Ice', 'Arcane'],
  // Add more multi-form gods here as needed (e.g., Hel, Tyr, King Arthur, Cu Chulainn)
};

// Some exported icon files use exact names without the "Image" suffix.
const GOD_ICON_FILENAME_OVERRIDES = {
  houyi: 'HouYi.webp',
  thanatos: 'Thana.webp',
};

function getGodIconBaseName(godName) {
  if (!godName) return null;
  const normalized = String(godName)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (GOD_ICON_BASE_OVERRIDES[normalized]) {
    return GOD_ICON_BASE_OVERRIDES[normalized];
  }

  return normalized;
}

// Helper function to get all variants for a god
export function getGodVariants(godName) {
  return GOD_VARIANTS[godName] || null;
}

// Helper function to check if a god has variants
export function godHasVariants(godName) {
  return godName in GOD_VARIANTS;
}

// God asset lookup that resolves a direct icon filename.
export function getLocalGodAsset(iconPath) {
  if (!iconPath) return null;
  const base = iconPath.split('/').pop() || '';
  if (!base) return null;
  
  return createImageUri(GOD_ICONS_PATH, base);
}

// God icon lookup by god name only – matches GitHub naming like "achillesImage.webp"
// We build the filename from the lowercase, spaceless god name + "Image.webp".
// Example: "Achilles" -> "achillesImage.webp"
export function getRemoteGodIconByName(godName) {
  if (!godName) return null;
  const normalized = String(godName).trim().toLowerCase().replace(/\s+/g, '');
  const filenameOverride = GOD_ICON_FILENAME_OVERRIDES[normalized];
  if (filenameOverride) {
    return createImageUri(GOD_ICONS_PATH, filenameOverride);
  }
  const baseName = getGodIconBaseName(godName);
  if (!baseName) return null;
  const filename = `${baseName}Image.webp`;
  return createImageUri(GOD_ICONS_PATH, filename);
}

// Ability icon lookup for a god, using suffixes like One/Two/Three/Four/Passive/Aspect
// Example: ("Achilles", "1")   -> "achillesOne.webp"
//          ("Achilles", "2")   -> "achillesTwo.webp"
//          ("Achilles", "3")   -> "achillesThree.webp"
//          ("Achilles", "4")   -> "achillesFour.webp"
//          ("Achilles", "P")   -> "achillesPassive.webp"
//          ("Achilles", "A")   -> "achillesAspect.webp"
// For gods with variants (like Artio):
//          ("Artio", "1", "Druid") -> "artioDruidOne.webp"
//          ("Artio", "1", "Bear")  -> "artioBearOne.webp"
const ABILITY_SUFFIXES = {
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  P: 'Passive',
  p: 'Passive',
  passive: 'Passive',
  A: 'Aspect',
  a: 'Aspect',
  aspect: 'Aspect',
};

export function getGodAbilityIcon(godName, abilityKey, variant) {
  if (!godName || !abilityKey) return null;

  const baseName = getGodIconBaseName(godName);
  if (!baseName) return null;

  const suffixKey = String(abilityKey).trim();
  const suffix = ABILITY_SUFFIXES[suffixKey];
  if (!suffix) return null;

  // For gods like Ullr, Artio, Merlin that have multiple forms (e.g., Axe/Bow, Bear/Druid),
  // we can pass a variant string that sits between the base name and suffix:
  // e.g. "artio" + "Druid" + "One" -> "artioDruidOne.webp"
  //      "ullr" + "Axe" + "One" -> "ullrAxeOne.webp"
  const variantPart = variant ? String(variant).trim() : '';

  const filename = `${baseName}${variantPart}${suffix}.webp`;
  return createImageUri(GOD_ICONS_PATH, filename);
}

// Card art / wallpaper by god name - for Prophecy TCG etc.
// Wallpapers: https://github.com/YungSonix/Smite2Mastery/tree/master/app/data/Icons/Wallpapers
// Filenames are Title_Case.webp (e.g. Athena.webp, Baron_Samedi.webp)
const WALLPAPER_NAME_OVERRIDES = {
  baronsamedi: 'Baron_Samedi',
  sunwukong: 'Sun_Wukong',
  // add others if repo uses different spelling
};

export function getWallpaperByGodName(godName) {
  if (!godName) return null;
  const normalized = String(godName).trim().toLowerCase().replace(/\s+/g, '');
  const override = WALLPAPER_NAME_OVERRIDES[normalized];
  if (override) {
    return createImageUri(SKINS_PATH, override + '.webp');
  }
  const titleCase = String(godName)
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
  const filename = titleCase + '.webp';
  return createImageUri(SKINS_PATH, filename);
}

// Skin/wallpaper lookup - loads from GitHub repo
// Skins are in app/data/Icons/Wallpapers folder
export function getSkinImage(skinPath) {
  if (!skinPath) return null;
  
  // Skin paths are like: /icons/Wallpapers/Achilles.webp
  // Extract just the filename (e.g., "Achilles.webp")
  const filename = skinPath.split('/').pop() || '';
  if (!filename) return null;
  
  // Try both lowercase and original case for GitHub URLs
  const lowercaseFilename = filename.toLowerCase();
  const originalFilename = filename;
  
  // If they're the same, just return single URI
  if (lowercaseFilename === originalFilename) {
    const uri = createImageUri(SKINS_PATH, lowercaseFilename);
    if (__DEV__) {
      console.log('Loading skin image:', filename, 'from:', uri.uri);
    }
    return uri;
  }
  
  // Return both options: try lowercase first, then original case
  const primary = createImageUri(SKINS_PATH, lowercaseFilename);
  const fallback = createImageUri(SKINS_PATH, originalFilename);
  
  if (__DEV__) {
    console.log('Loading skin image:', filename, '-> trying lowercase:', primary.uri, 'or original:', fallback.uri);
  }
  
  return {
    primary: primary,
    fallback: fallback
  };
}

// Role / pantheon bundled icons: `lib/imageGrabber.js`
export { ROLE_ICONS };

export function getRoleIcon(role) {
  return ROLE_ICONS[role] || null;
}

/** Smite god pantheons + Prophecy/display aliases (Olympian → Greek, etc.) */
export const PANTHEON_ICONS = {
  ...PANTHEON_ICON_FILES,
  Mayan: PANTHEON_ICON_FILES.Maya,
  Olympian: PANTHEON_ICON_FILES.Greek,
  Asgardian: PANTHEON_ICON_FILES.Norse,
  Eastern: PANTHEON_ICON_FILES.Chinese,
  Underworld: PANTHEON_ICON_FILES.Greek,
};

// Border / portrait accents (build cards, Data, etc.) — canonical palette
const PANTHEON_BORDER_HEX = {
  Arthurian: '#931725',
  Babylonian: '#5939DD',
  Celtic: '#32A92C',
  Chinese: '#FF2100',
  Egyptian: '#DE981E',
  'Great Old Ones': '#0C0A0E',
  Greek: '#0FA7F5',
  Hindu: '#CC2380',
  Japanese: '#FFABCD',
  Korean: '#0047A0',
  Maya: '#739A32',
  Norse: '#6DB8E4',
  Polynesian: '#00FFFC',
  Roman: '#EAD650',
  Slavic: '#E7EFF0',
  'Tales of Arabia': '#46287C',
  Voodoo: '#742BA0',
  Yoruba: '#FF8625',
  Mayan: '#739A32',
  Olympian: '#0FA7F5',
  Asgardian: '#6DB8E4',
  Eastern: '#FF2100',
  Underworld: '#0FA7F5',
};

function normalizePantheonKey(pantheon) {
  if (!pantheon) return null;
  const raw = String(pantheon).trim();
  if (!raw) return null;
  const exact = Object.keys(PANTHEON_ICONS).find((k) => k === raw);
  if (exact) return exact;
  const lower = raw.toLowerCase();
  return Object.keys(PANTHEON_ICONS).find((k) => k.toLowerCase() === lower) || null;
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return { r: 100, g: 116, b: 139 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${c(r).toString(16).padStart(2, '0')}${c(g).toString(16).padStart(2, '0')}${c(b).toString(16).padStart(2, '0')}`;
}

function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/**
 * Portrait ring color: lifted from the icon's canonical hue so it reads clearly on dark cards
 * and doesn't blend into the pantheon glyph. Light colors get a slight edge-darken instead.
 */
function pantheonAccentBorderHex(canonicalHex) {
  const rgb = hexToRgb(canonicalHex);
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const white = { r: 255, g: 255, b: 255 };
  /** Slate rim — separates very light accents from pastel icons */
  const rim = { r: 56, g: 78, b: 112 };

  if (lum > 0.72) {
    const m = mixRgb(rgb, rim, 0.22);
    return rgbToHex(m.r, m.g, m.b);
  }
  if (lum < 0.12) {
    const m = mixRgb(rgb, white, 0.42);
    return rgbToHex(m.r, m.g, m.b);
  }
  const m = mixRgb(rgb, white, 0.26);
  return rgbToHex(m.r, m.g, m.b);
}

export function getPantheonIcon(pantheon) {
  const key = normalizePantheonKey(pantheon);
  return key ? PANTHEON_ICONS[key] : null;
}

export function getPantheonBorderColor(pantheon) {
  const key = normalizePantheonKey(pantheon);
  if (key && PANTHEON_BORDER_HEX[key]) {
    return pantheonAccentBorderHex(PANTHEON_BORDER_HEX[key]);
  }
  return '#64748b';
}

// Dummy default export so Expo Router / navigation stops treating this as a missing-route component.
export default function LocalIconsConfig() {
  return null;
}