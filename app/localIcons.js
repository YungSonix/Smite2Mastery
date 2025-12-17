// Remote image URLs from GitHub
// Base URL for all icons - updated to match actual repo structure
const GITHUB_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img';

// Item icons - returns { uri: '...' } format for React Native Image
const ITEM_ICONS_PATH = `${GITHUB_BASE}/Item%20Icons`;

// God assets path - try directly in God Info folder first
// If images are in a subfolder, update this path accordingly
const GOD_ICONS_PATH = `${GITHUB_BASE}/God%20Info`;

// Skin/wallpaper path - wallpapers are in app/data/Icons/Wallpapers folder
// Note: Wallpapers must be in the GitHub repo for this to work in production
const SKINS_PATH = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Icons/Wallpapers';

// Helper to create URI object for React Native Image
function createImageUri(basePath, filename) {
  // URL encode the filename (spaces become %20, etc.)
  const encodedFilename = encodeURIComponent(filename);
  return { uri: `${basePath}/${encodedFilename}` };
}

// Item icon lookup - returns object with both lowercase and original case options
// Tries lowercase first, then falls back to original case
export function getLocalItemIcon(iconPath) {
  if (!iconPath) return null;
  const base = iconPath.split('/').pop() || '';
  if (!base) return null;
  
  const lowercaseBase = base.toLowerCase();
  const originalBase = base;
  
  // If they're the same, just return single URI
  if (lowercaseBase === originalBase) {
    const uri = createImageUri(ITEM_ICONS_PATH, lowercaseBase);
    if (__DEV__) {
      console.log('Loading item icon:', base, 'from:', uri.uri);
    }
    return uri;
  }
  
  // Return both options: try lowercase first, then original case
  const primary = createImageUri(ITEM_ICONS_PATH, lowercaseBase);
  const fallback = createImageUri(ITEM_ICONS_PATH, originalBase);
  
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
 Aphrodite:'aphro',
 Amaterasu:'ama',
baronsamedi: 'baron',
 daji: 'daJi',
 bellona:'bell',
 Mercury:'merc',
 Poseidon:'pos',
 izanami: 'iza',
 SunWukong:'wukong',
 thanatos:'thana',
 Danzaburou:'danza',
 TheMorrigan:'morri',
 HuaMulan:'mulan',
 Hercules:'herc',
 Kukulkan:'kuku',
 Xbalanque:'xbal',
 poseidon: 'pos',
 cernunnos: 'cern',
 tsukuyomi: 'tsuku',
 bellona: 'bell',
 hunbatz: 'batz',
 guanyu: 'guan',
 cabrakan: 'cab',
 cerberus: 'cerb',
 
};

// Gods that have multiple forms/stances with different ability icons
// Example: Artio has Bear and Druid forms, so abilities are like "artioBearOne.webp" and "artioDruidOne.webp"
const GOD_VARIANTS = {
  Artio: ['Bear', 'Druid'],
  Ullr: ['Axe', 'Bow'],
  Merlin: ['Fire', 'Ice', 'Arcane'], // Adjust these based on your actual variants
  // Add more multi-form gods here as needed (e.g., Hel, Tyr, King Arthur, Cu Chulainn)
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

// God asset lookup - uses the filename that is passed in
// (kept for legacy callers that already know the exact filename)
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
  const baseName = getGodIconBaseName(godName);
  if (!baseName) return null;
  const filename = `${baseName}Image.webp`;
  const uri = createImageUri(GOD_ICONS_PATH, filename);

  if (__DEV__) {
    console.log('Loading god icon by name:', godName, '->', uri.uri);
  }

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

// Dummy default export so Expo Router / navigation stops treating this as a missing-route component.
export default function LocalIconsConfig() {
  return null;
}