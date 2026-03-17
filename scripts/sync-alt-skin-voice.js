const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dataDir = path.join(root, 'app', 'data');
const voiceRoot = fs.existsSync(path.join(dataDir, 'VoiceAudio'))
  ? path.join(dataDir, 'VoiceAudio')
  : path.join(dataDir, 'Voice Audio');

const isDryRun = process.argv.includes('--dry-run');

function getSubdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function main() {
  if (!fs.existsSync(voiceRoot)) {
    console.log('Voice root not found:', path.relative(root, voiceRoot));
    process.exit(0);
  }

  const gods = getSubdirs(voiceRoot);
  let godsWithBase = 0;
  let altSkinFoldersScanned = 0;
  let voxDirsCreated = 0;
  let filesCopied = 0;
  const skippedNoBase = [];

  for (const god of gods) {
    const godDir = path.join(voiceRoot, god);
    const baseVoxDir = path.join(godDir, 'Skin00_Base', 'VOX');
    const baseFiles = getFiles(baseVoxDir);
    if (!baseFiles.length) {
      skippedNoBase.push(god);
      continue;
    }
    godsWithBase += 1;

    const skinDirs = getSubdirs(godDir).filter((name) => name !== 'Skin00_Base');
    for (const skinDirName of skinDirs) {
      altSkinFoldersScanned += 1;
      const skinDir = path.join(godDir, skinDirName);

      let voxDirNames = getSubdirs(skinDir).filter((name) => /^vox/i.test(name));
      if (!voxDirNames.length) {
        const newVoxName = 'VOX';
        const newVoxDir = path.join(skinDir, newVoxName);
        if (!isDryRun) fs.mkdirSync(newVoxDir, { recursive: true });
        voxDirsCreated += 1;
        voxDirNames = [newVoxName];
      }

      for (const voxDirName of voxDirNames) {
        const voxDir = path.join(skinDir, voxDirName);
        for (const filename of baseFiles) {
          const src = path.join(baseVoxDir, filename);
          const dst = path.join(voxDir, filename);
          if (fs.existsSync(dst)) continue;
          if (!isDryRun) fs.copyFileSync(src, dst);
          filesCopied += 1;
        }
      }
    }
  }

  console.log('=== Alt Skin VOX Sync ===');
  console.log(`Mode: ${isDryRun ? 'dry-run' : 'write'}`);
  console.log(`Voice root: ${path.relative(root, voiceRoot)}`);
  console.log(`God folders scanned: ${gods.length}`);
  console.log(`Gods with base VOX source: ${godsWithBase}`);
  console.log(`Alt skin folders scanned: ${altSkinFoldersScanned}`);
  console.log(`VOX folders created: ${voxDirsCreated}`);
  console.log(`Voice files copied: ${filesCopied}`);

  if (skippedNoBase.length) {
    console.log('\n-- Skipped (missing base Skin00_Base/VOX files) --');
    for (const god of skippedNoBase) {
      console.log(`- ${god}`);
    }
  }
}

main();
