import { ICON_PATHS, REMOTE_BASE_URLS } from '../config';
import { ROLE_ICONS, PANTHEON_ICON_FILES, PANTHEON_BACKDROP_FILES } from '../lib/imageGrabber';
import { SKIN_LOADOUT_LOCAL_BUNDLES } from '../lib/skinLoadoutLocalBundles';
import {
  ITEM_ICON_FILE_ALIASES,
  ITEM_ICON_SPACED_FILES,
  camelCaseToSpacedLabel,
  normalizeItemIconKey,
} from '../lib/itemIconAliases';

const ITEM_ICONS_PATH = ICON_PATHS.ITEM_ICONS;
const ITEM_ICONS_FILLED_PATH = ICON_PATHS.ITEM_ICONS_FILLED;
const GOD_ICONS_PATH = ICON_PATHS.GOD_ICONS;
const ASPECT_ICONS_PATH = ICON_PATHS.ASPECT_ICONS;
const SKINS_PATH = ICON_PATHS.SKINS;

/** Repo-relative paths under `app/data/NewGodSkins/` (PNG) — resolved to GitHub raw URLs. */
const NEW_GOD_SKINS_PREFIX = 'app/data/NewGodSkins/';

/** Repo-relative paths under `app/data/AspectIcons/` (webp) — same as `ICON_PATHS.ASPECT_ICONS`. */
const ASPECT_ICONS_PREFIX = 'app/data/AspectIcons/';

/**
 * Shared aspect slot art on `master` under `app/data/AspectIcons/`
 * ([repo tree](https://github.com/YungSonix/Smite2Mastery/tree/master/app/data/AspectIcons)).
 * Only these basenames are loaded from that folder; per-god `apolloAspect.webp`-style files stay on `GOD_ICONS`.
 */
const ASPECT_POOL_FILENAMES = new Set(
  [
    'arrowAspect.webp',
    'eyeAspect.webp',
    'fatArrowAspect.webp',
    'fatHeartAspect.webp',
    'fistAspect.webp',
    'handAspect.webp',
    'heartAspect.webp',
    'radarAspect.webp',
    'shieldAspect.webp',
    'stickyFootAspect.webp',
    'stunAspect.webp',
    'swirlAspect.webp',
    'swordAspect.webp',
    'swordsAspect.webp',
  ].map((s) => s.toLowerCase())
);

// Stable `{ uri }` instances so expo-image does not treat every render as a new source (avoids refetch/flash).
const uriSourceCache = new Map();

function createFullUriSource(uri) {
  let cached = uriSourceCache.get(uri);
  if (!cached) {
    cached = { uri, cacheKey: uri };
    uriSourceCache.set(uri, cached);
  }
  return cached;
}

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

function splitIconBasename(base) {
  const trimmed = String(base || '').trim();
  if (!trimmed) return { name: '', ext: '.webp' };
  const dot = trimmed.lastIndexOf('.');
  if (dot > 0 && dot >= trimmed.length - 5) {
    return { name: trimmed.slice(0, dot), ext: trimmed.slice(dot) };
  }
  return { name: trimmed, ext: '.webp' };
}

/**
 * Filename variants for one icon stem (PascalCase, lowerCamelCase, all-lowercase).
 */
function buildStemFilenameVariants(name, ext) {
  if (!name) return [];
  const out = [];
  const seen = new Set();
  const push = (filename) => {
    const key = filename.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(filename);
  };

  push(name + ext);

  if (/^[A-Z]/.test(name) && name.length > 1) {
    push(name.charAt(0).toLowerCase() + name.slice(1) + ext);
  }

  push(name.toLowerCase() + ext);

  if (/^[a-z]/.test(name) && /[A-Z]/.test(name.slice(1))) {
    push(name.charAt(0).toUpperCase() + name.slice(1) + ext);
  }

  return out;
}

/**
 * Ordered filename candidates for GitHub Item Icons.
 * Priority: JSON icon basename variants → aliases → internalName variants → spaced PNG fallbacks.
 */
export function buildItemIconFilenameCandidates(base, internalName = '') {
  const iconBasename = base && base.includes('/') ? base.split('/').pop() : base;
  const { name: iconStem, ext: iconExt } = splitIconBasename(iconBasename || '');

  const stems = new Set();
  if (iconStem) stems.add(iconStem);
  for (const raw of [internalName]) {
    if (!raw) continue;
    const trimmed = raw.includes('/') ? raw.split('/').pop() : raw;
    const { name } = splitIconBasename(trimmed);
    if (name) stems.add(name);
  }
  if (!stems.size) return [];

  const candidates = [];
  const seen = new Set();
  const push = (filename) => {
    if (!filename) return;
    const key = filename.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(filename);
  };

  const pushStemVariants = (stem, exts = ['.webp', '.png', '.PNG']) => {
    if (!stem) return;
    const cleanStem = stem.replace(/\.[^.]+$/, '');
    for (const ext of exts) {
      buildStemFilenameVariants(cleanStem, ext).forEach(push);
    }
  };

  // 1) Alias (when GitHub uses a different filename) then JSON icon path variants
  if (iconStem) {
    const aliasFromIcon = ITEM_ICON_FILE_ALIASES[normalizeItemIconKey(iconStem)];
    if (aliasFromIcon) push(aliasFromIcon);
    pushStemVariants(iconStem, iconExt ? [iconExt, '.webp', '.png', '.PNG'] : undefined);
  }

  // 2) internalName + aliases + spaced files (when icon path differs or is missing)
  for (const stem of stems) {
    if (stem === iconStem) continue;

    const norm = normalizeItemIconKey(stem);
    const alias = ITEM_ICON_FILE_ALIASES[norm];
    if (alias) push(alias);

    pushStemVariants(stem);
  }

  // 3) Spaced / hyphenated PNG uploads on GitHub (last resort)
  for (const stem of stems) {
    const norm = normalizeItemIconKey(stem);
    const spacedFile = ITEM_ICON_SPACED_FILES[norm];
    if (spacedFile) push(spacedFile);

    const spaced = camelCaseToSpacedLabel(stem);
    if (spaced !== stem) {
      push(`${spaced}.png`);
      push(`${spaced}.webp`);
    }
  }

  return candidates;
}

/** @returns {{ uri: string, cacheKey: string }[]} */
export function getItemIconUriChain(localIcon) {
  if (!localIcon) return [];
  if (localIcon.chain?.length) return localIcon.chain;
  if (typeof localIcon === 'object' && localIcon.uri && !localIcon.primary) return [localIcon];
  const chain = [];
  if (localIcon.primary) chain.push(localIcon.primary);
  else if (localIcon.uri) chain.push(localIcon);
  if (localIcon.fallback) chain.push(localIcon.fallback);
  if (localIcon.fallbacks?.length) chain.push(...localIcon.fallbacks);
  return chain;
}

export function getItemIconSource(localIcon, attemptIndex = 0) {
  const chain = getItemIconUriChain(localIcon);
  return chain[attemptIndex] || chain[0] || null;
}

export function readItemIconAttempt(failedMap, key) {
  const v = failedMap?.[key];
  return typeof v === 'number' ? v : v ? 1 : 0;
}

export function bumpItemIconAttempt(setFailedMap, key, localIcon, currentAttempt) {
  const chain = getItemIconUriChain(localIcon);
  if (currentAttempt + 1 < chain.length && setFailedMap) {
    setFailedMap((prev) => ({ ...prev, [key]: currentAttempt + 1 }));
  }
}

// Item icon lookup — tries original path, lowerCamelCase, then all-lowercase (GitHub Item Icons naming).
// options.filled: use Item Icons Filled folder when true
const itemIconResultCache = new Map();
const ITEM_ICON_CACHE_VERSION = 'v2';

export function getLocalItemIcon(iconPath, options = {}) {
  if (!iconPath && !options.internalName) return null;
  const base = (iconPath && iconPath.split('/').pop()) || options.internalName || '';
  if (!base) return null;

  const basePath = options.filled ? ITEM_ICONS_FILLED_PATH : ITEM_ICONS_PATH;

  const candidates = buildItemIconFilenameCandidates(base, options.internalName || '');
  const resultCacheKey = `${ITEM_ICON_CACHE_VERSION}|${basePath}|${options.internalName || ''}|${candidates.join('|')}`;
  const cachedResult = itemIconResultCache.get(resultCacheKey);
  if (cachedResult) return cachedResult;

  if (!candidates.length) return null;

  const chain = candidates.map((f) => createImageUri(basePath, f));
  const result = chain.length === 1
    ? chain[0]
    : {
        primary: chain[0],
        fallback: chain[1] || null,
        fallbacks: chain.slice(2),
        chain,
      };
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
  const raw = String(iconPath).trim().replace(/\\/g, '/');
  if (/^https?:\/\//i.test(raw)) {
    return createFullUriSource(raw);
  }

  const normalized = raw.replace(/^\/+/, '');
  if (normalized.toLowerCase().startsWith(ASPECT_ICONS_PREFIX.toLowerCase())) {
    const uri =
      `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/` +
      normalized
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
    return createFullUriSource(uri);
  }

  const base = raw.split('/').pop() || '';
  if (!base) return null;

  if (/\.webp$/i.test(base) && ASPECT_POOL_FILENAMES.has(base.toLowerCase())) {
    return createImageUri(ASPECT_ICONS_PATH, base);
  }

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
// Skins are in app/data/Icons/Wallpapers folder, or `app/data/NewGodSkins/...` PNGs on master.
export function getSkinImage(skinPath) {
  if (!skinPath) return null;

  const raw = String(skinPath).trim().replace(/\\/g, '/');
  if (/^https?:\/\//i.test(raw)) {
    return createFullUriSource(raw);
  }

  const normalized = raw.replace(/^\/+/, '');
  const localBundle = SKIN_LOADOUT_LOCAL_BUNDLES[normalized];
  if (localBundle) {
    return localBundle;
  }
  if (normalized.toLowerCase().startsWith('app/data/')) {
    let rasterPath = normalized;
    if (/\.json$/i.test(rasterPath)) {
      rasterPath = rasterPath.replace(/\.json$/i, '.png');
    }
    const uri =
      `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/` +
      rasterPath
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
    return createFullUriSource(uri);
  }
  if (normalized.toLowerCase().startsWith(NEW_GOD_SKINS_PREFIX.toLowerCase())) {
    // Data may still reference UE `.json` exports; prefer raster sibling on GitHub when present.
    let rasterPath = normalized;
    if (/\.json$/i.test(rasterPath)) {
      rasterPath = rasterPath.replace(/\.json$/i, '.png');
    }
    const uri =
      `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/` +
      rasterPath
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
    return createFullUriSource(uri);
  }

  // Skin paths are like: /icons/Wallpapers/Achilles.webp
  // Extract just the filename (e.g., "Achilles.webp")
  const filename = raw.split('/').pop() || '';
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

/** Bundled pantheon header images (subset of pantheons have `Backdrop/` art). */
export const PANTHEON_BACKDROPS = {
  ...PANTHEON_BACKDROP_FILES,
  Mayan: PANTHEON_BACKDROP_FILES.Maya,
  Olympian: PANTHEON_BACKDROP_FILES.Greek,
  Asgardian: PANTHEON_BACKDROP_FILES.Norse,
  Eastern: PANTHEON_BACKDROP_FILES.Chinese,
  Underworld: PANTHEON_BACKDROP_FILES.Greek,
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

/**
 * God page header backdrop for a pantheon string (matches `PANTHEON_ICONS` normalization).
 * Returns null when no bundled backdrop exists (e.g. Celtic, Korean, Polynesian, Slavic).
 */
/** God detail header: pantheon backdrop (full wide art), not god portrait/card art. */
export function getGodPageBackdrop(_god, _godDisplayName, pantheon) {
  return getPantheonBackdrop(pantheon);
}

export function getPantheonBackdrop(pantheon) {
  let p = pantheon;
  if (String(p || '').trim().toLowerCase() === 'babalonian') {
    p = 'Babylonian';
  }
  const key = normalizePantheonKey(p);
  if (!key) return null;
  return PANTHEON_BACKDROPS[key] ?? null;
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