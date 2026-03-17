const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dataDir = path.join(root, 'app', 'data');
const voiceRoot = fs.existsSync(path.join(dataDir, 'VoiceAudio'))
  ? path.join(dataDir, 'VoiceAudio')
  : path.join(dataDir, 'Voice Audio');

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

  const missingSkinBase = [];
  const missingVox = [];
  const missingBaselineFiles = [];

  for (const god of gods) {
    const skinDir = path.join(voiceRoot, god, 'Skin00_Base');
    const voxDir = path.join(skinDir, 'VOX');
    if (!fs.existsSync(skinDir)) {
      missingSkinBase.push(god);
      continue;
    }
    if (!fs.existsSync(voxDir)) {
      missingVox.push(god);
      continue;
    }

    const missingFiles = REQUIRED.filter((f) => !hasCaseInsensitiveFile(voxDir, f));
    if (missingFiles.length) {
      missingBaselineFiles.push({ god, files: missingFiles });
    }
  }

  const totalMissingFolders = missingSkinBase.length + missingVox.length;
  const totalMissingAnything = totalMissingFolders + missingBaselineFiles.length;

  console.log('=== Voice Audio Audit ===');
  console.log(`God folders scanned: ${gods.length}`);
  console.log(`Folders missing Skin00_Base: ${missingSkinBase.length}`);
  console.log(`Folders missing Skin00_Base/VOX: ${missingVox.length}`);
  console.log(`Folders missing baseline VOX files: ${missingBaselineFiles.length}`);

  if (!totalMissingAnything) {
    console.log('All checked folders contain Skin00_Base/VOX and baseline files.');
    return;
  }

  if (missingSkinBase.length) {
    console.log('\n-- Missing Skin00_Base --');
    for (const god of missingSkinBase) console.log(`- ${god}`);
  }

  if (missingVox.length) {
    console.log('\n-- Missing Skin00_Base/VOX --');
    for (const god of missingVox) console.log(`- ${god}`);
  }

  if (missingBaselineFiles.length) {
    console.log('\n-- Missing baseline VOX files --');
    for (const row of missingBaselineFiles) {
      console.log(`- ${row.god}: ${row.files.join(', ')}`);
    }
  }
}

main();
