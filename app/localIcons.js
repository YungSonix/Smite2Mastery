
// Remote image URLs from GitHub
// Base URL for all icons - updated to match actual repo structure
const GITHUB_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img';

// Item icons - returns { uri: '...' } format for React Native Image
const ITEM_ICONS_PATH = `${GITHUB_BASE}/Item%20Icons`;

// God assets path - try directly in God Info folder first
// If images are in a subfolder, update this path accordingly
const GOD_ICONS_PATH = `${GITHUB_BASE}/God%20Info`;

// Skin/wallpaper path - wallpapers are in Wallpapers subfolder
const SKINS_PATH = `${GITHUB_BASE}/Wallpapers`;

// Base URL for smitecalculator.pro (for skin fallback)
const SMITECALCULATOR_BASE = 'https://www.smitecalculator.pro';

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

// God asset lookup - images are directly in God Info folder (no subfolder)
export function getLocalGodAsset(iconPath) {
  if (!iconPath) return null;
  const base = iconPath.split('/').pop() || '';
  if (!base) return null;
  
  // Images are directly in God Info folder (e.g., achillesImage.webp)
  // Path: https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Info/[filename]
  const uri = createImageUri(GOD_ICONS_PATH, base);
  
  // Debug: log the URL in development
  if (__DEV__) {
    console.log('Loading god asset:', base, 'from:', uri.uri);
  }
  
  return uri;
}

// Skin/wallpaper lookup - lazy loads from smitecalculator.pro only when user clicks on a skin
// Skins are NOT loaded until user expands skins section AND selects a specific skin
export function getSkinImage(skinPath) {
  if (!skinPath) return null;
  
  // Skin paths are like: /icons/Wallpapers/Achilles.webp
  // Extract just the filename (e.g., "Achilles.webp")
  const filename = skinPath.split('/').pop() || '';
  if (!filename) return null;
  
  // First try local GitHub (in case skins are added to repo later)
  // Convert to lowercase for case-sensitive GitHub URLs
  const lowercaseFilename = filename.toLowerCase();
  const localUri = createImageUri(SKINS_PATH, lowercaseFilename);
  
  // Return object with both options - component can try local first, then fallback to smitecalculator
  return {
    local: localUri, // Try GitHub first
    remote: { uri: `${SMITECALCULATOR_BASE}${skinPath}` } // Fallback to smitecalculator.pro
  };
}

// Dummy default export so Expo Router / navigation stops treating this as a missing-route component.
export default function LocalIconsConfig() {
  return null;
}
