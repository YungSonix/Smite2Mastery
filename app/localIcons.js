
// Remote image URLs from GitHub
// Base URL for all icons
const GITHUB_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/app/data/Icons';

// Item icons - returns { uri: '...' } format for React Native Image
const ITEM_ICONS_PATH = `${GITHUB_BASE}/Item%20Icons`;

// God assets path
const GOD_ICONS_PATH = `${GITHUB_BASE}/God%20Info/jacob_s%20icons`;

// Helper to create URI object for React Native Image
function createImageUri(basePath, filename) {
  // URL encode the filename (spaces become %20, etc.)
  const encodedFilename = encodeURIComponent(filename);
  return { uri: `${basePath}/${encodedFilename}` };
}

// Item icon lookup - returns { uri: '...' } for remote loading
export function getLocalItemIcon(iconPath) {
  if (!iconPath) return null;
  const base = iconPath.split('/').pop() || '';
  if (!base) return null;
  return createImageUri(ITEM_ICONS_PATH, base);
}

// God asset lookup - returns { uri: '...' } for remote loading
export function getLocalGodAsset(iconPath) {
  if (!iconPath) return null;
  const base = iconPath.split('/').pop() || '';
  if (!base) return null;
  return createImageUri(GOD_ICONS_PATH, base);
}

// Dummy default export so Expo Router / navigation stops treating this as a missing-route component.
export default function LocalIconsConfig() {
  return null;
}
