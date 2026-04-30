/**
 * Lists gods that are missing lore text in app/data/builds.json.
 * Run: node scripts/list-missing-god-lore.js
 */

const fs = require('fs');
const path = require('path');

const buildsPath = path.join(process.cwd(), 'app', 'data', 'builds.json');

function flattenGods(input) {
  if (!input) return [];
  if (!Array.isArray(input)) return [input];
  return input.flat(Infinity).filter(Boolean);
}

function getDisplayName(god) {
  if (!god || typeof god !== 'object') return '';
  return String(
    god.name ||
      god.GodName ||
      god.godName ||
      (god.baseInformation && (god.baseInformation.name || god.baseInformation.GodName || god.baseInformation.godName)) ||
      ''
  ).trim();
}

function getLoreText(god) {
  if (!god || typeof god !== 'object') return '';

  const directLore = String(god.loreShort || god.lore || '').trim();
  if (directLore) return directLore;

  const info = god.baseInformation && typeof god.baseInformation === 'object' ? god.baseInformation : {};
  return String(info.loreShort || info.lore || '').trim();
}

function main() {
  if (!fs.existsSync(buildsPath)) {
    console.error(`builds.json not found at: ${buildsPath}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(buildsPath, 'utf8'));
  } catch (error) {
    console.error('Failed to parse builds.json:', error.message);
    process.exit(1);
  }

  const godsRoot = data && typeof data === 'object' && data.gods ? data.gods : data;
  const gods = flattenGods(godsRoot).filter((entry) => entry && typeof entry === 'object');

  const missingLore = [];
  for (const god of gods) {
    const name = getDisplayName(god);
    if (!name) continue;
    if (!getLoreText(god)) {
      missingLore.push(name);
    }
  }

  const uniqueMissing = Array.from(new Set(missingLore)).sort((a, b) => a.localeCompare(b));

  console.log('=== Gods missing lore ===');
  console.log(`Gods checked: ${gods.length}`);
  console.log(`Missing lore: ${uniqueMissing.length}`);
  console.log('');

  if (uniqueMissing.length === 0) {
    console.log('All gods have lore.');
    return;
  }

  for (const name of uniqueMissing) {
    console.log(`- ${name}`);
  }
}

main();
