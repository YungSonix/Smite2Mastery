const fs = require('fs');
const path = require('path');

const root = process.cwd();
const voiceRoot = path.join(root, 'app', 'data', 'Voice Audio');

const REQUIRED = [
  'GruntAttack_1.WAV',
  'GruntHit_1.WAV',
  'Intro_1.WAV',
  'Health_Low_1.WAV',
];

function hasCaseInsensitiveFile(dir, filename) {
  if (!fs.existsSync(dir)) return false;
  const set = new Set(
    fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name.toLowerCase())
  );
  return set.has(filename.toLowerCase());
}

function main() {
  if (!fs.existsSync(voiceRoot)) {
    console.log('Voice root not found:', path.relative(root, voiceRoot));
    process.exit(0);
  }

  const gods = fs
    .readdirSync(voiceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  const missing = [];

  for (const god of gods) {
    const skinDir = path.join(voiceRoot, god, 'Skin00_Base');
    const voxDir = path.join(skinDir, 'VOX');
    if (!fs.existsSync(skinDir)) {
      missing.push(`${god}: missing Skin00_Base`);
      continue;
    }
    if (!fs.existsSync(voxDir)) {
      missing.push(`${god}: missing Skin00_Base/VOX`);
      continue;
    }

    const missingFiles = REQUIRED.filter((f) => !hasCaseInsensitiveFile(voxDir, f));
    if (missingFiles.length) {
      missing.push(`${god}: missing ${missingFiles.join(', ')}`);
    }
  }

  console.log('=== Voice Audio Audit ===');
  console.log(`God folders scanned: ${gods.length}`);
  console.log(`Folders with missing baseline assets: ${missing.length}`);
  if (!missing.length) {
    console.log('All checked folders contain Skin00_Base/VOX and baseline files.');
    return;
  }
  console.log('');
  for (const row of missing) console.log(`- ${row}`);
}

main();
