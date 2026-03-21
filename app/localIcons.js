import { ICON_PATHS } from '../config';

const ITEM_ICONS_PATH = ICON_PATHS.ITEM_ICONS;
const ITEM_ICONS_FILLED_PATH = ICON_PATHS.ITEM_ICONS_FILLED;
const GOD_ICONS_PATH = ICON_PATHS.GOD_ICONS;
const SKINS_PATH = ICON_PATHS.SKINS;

// Helper to create URI object for React Native Image
function createImageUri(basePath, filename) {
  // URL encode the filename (spaces become %20, etc.)
  const encodedFilename = encodeURIComponent(filename);
  return { uri: `${basePath}/${encodedFilename}` };
}

// Item icon lookup - returns object with both lowercase and original case options
// Tries lowercase first, then falls back to original case
// options.filled: use Item Icons Filled folder when true
export function getLocalItemIcon(iconPath, options = {}) {
  if (!iconPath) return null;
  const base = iconPath.split('/').pop() || '';
  if (!base) return null;

  const basePath = options.filled ? ITEM_ICONS_FILLED_PATH : ITEM_ICONS_PATH;

  const lowercaseBase = base.toLowerCase();
  const originalBase = base;

  // If they're the same, just return single URI
  if (lowercaseBase === originalBase) {
    const uri = createImageUri(basePath, lowercaseBase);
    if (__DEV__) {
      console.log('Loading item icon:', base, 'from:', uri.uri);
    }
    return uri;
  }

  // Return both options: try lowercase first, then original case
  const primary = createImageUri(basePath, lowercaseBase);
  const fallback = createImageUri(basePath, originalBase);

  if (__DEV__) {
    console.log('Loading item icon:', base, '-> trying lowercase:', primary.uri, 'or original:', fallback.uri);
  }

  return {
    primary: primary,
    fallback: fallback
  };
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
  
  const uri = createImageUri(GOD_ICONS_PATH, base);
  
  if (__DEV__) {
    console.log('Loading god asset (by path):', base, 'from:', uri.uri);
  }
  
  return uri;
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
  const uri = createImageUri(GOD_ICONS_PATH, filename);
  return uri;
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
  const uri = createImageUri(GOD_ICONS_PATH, filename);

  if (__DEV__) {
    console.log('Loading ability icon:', godName, abilityKey, variant ? `(${variant})` : '', '->', uri.uri);
  }

  return uri;
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

// Role icons (local requires) - shared by index.jsx and data.jsx
export const ROLE_ICONS = {
  ADC: require('./data/Icons/Role Icons/T_GodRole_Carry_Small.png'),
  Solo: require('./data/Icons/Role Icons/T_GodRole_Solo_Small.png'),
  Support: require('./data/Icons/Role Icons/T_GodRole_Support.png'),
  Mid: require('./data/Icons/Role Icons/T_GodRole_Mid_Small.png'),
  Jungle: require('./data/Icons/Role Icons/T_GodRole_Jungle.png'),
};

export function getRoleIcon(role) {
  return ROLE_ICONS[role] || null;
}

// Dummy default export so Expo Router / navigation stops treating this as a missing-route component.
export default function LocalIconsConfig() {
  return null;
}