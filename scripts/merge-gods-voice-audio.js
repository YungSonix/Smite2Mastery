/**
 * Merge exported GODS WAV tree into app/data/VoiceAudio (missing files only by default).
 *
 * Usage (repo root):
 *   node scripts/merge-gods-voice-audio.js [--dry-run] [--overwrite] [sourceDir]
 *
 * Default source: %USERPROFILE%/Downloads/Output/WAV/GODS
 * Env override: VOICE_GODS_SOURCE
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const destRoot = path.join(root, 'app', 'data', 'VoiceAudio');

const defaultSource = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Downloads',
  'Output',
  'WAV',
  'GODS'
);

const flagArgs = process.argv.slice(2).filter((a) => a.startsWith('-'));
const pathArgs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const isDryRun = flagArgs.includes('--dry-run');
const overwrite = flagArgs.includes('--overwrite');

const sourceRoot = path.resolve(
  pathArgs[0] || process.env.VOICE_GODS_SOURCE || defaultSource
);

/** Export folder name -> existing VoiceAudio folder name (when they differ). */
const SOURCE_TO_DEST_FOLDER = {
  NeZha: 'Ne Zha',
  Daji: 'Da_Ji',
};

/** Top-level export folders that are not god voice packs. */
const SKIP_TOP_LEVEL = new Set(['_Universal', 'Generic']);

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function resolveDestGodFolder(sourceName) {
  const mapped = SOURCE_TO_DEST_FOLDER[sourceName];
  if (mapped) {
    if (fs.existsSync(path.join(destRoot, mapped))) return mapped;
    if (fs.existsSync(path.join(destRoot, sourceName))) return sourceName;
    return mapped;
  }
  return sourceName;
}

function robocopyMerge(src, dst) {
  const args = [
    src,
    dst,
    '/E',
    '/R:1',
    '/W:1',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NC',
    '/NS',
  ];
  if (!overwrite) {
    args.push('/XC', '/XN', '/XO');
  }
  if (isDryRun) {
    args.push('/L');
  }
  const result = spawnSync('robocopy', args, { encoding: 'utf8', windowsHide: true });
  const code = result.status ?? 0;
  const copied = code >= 1 && code <= 7;
  return { code, copied, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function main() {
  if (!fs.existsSync(sourceRoot)) {
    console.error('Source not found:', sourceRoot);
    console.error('Pass a path or set VOICE_GODS_SOURCE.');
    process.exit(1);
  }
  if (!fs.existsSync(destRoot)) {
    if (isDryRun) {
      console.log('[dry-run] Would create', path.relative(root, destRoot));
    } else {
      fs.mkdirSync(destRoot, { recursive: true });
    }
  }

  const sourceGods = listDirs(sourceRoot).filter((n) => !SKIP_TOP_LEVEL.has(n));
  let merged = 0;
  let skipped = 0;
  const renames = [];

  console.log('=== Merge GODS → VoiceAudio ===');
  console.log('Source:', sourceRoot);
  console.log('Dest:  ', destRoot);
  console.log('Mode:  ', isDryRun ? 'dry-run' : overwrite ? 'overwrite allowed' : 'missing files only');
  console.log('Gods:  ', sourceGods.length);
  console.log('');

  for (const sourceGod of sourceGods) {
    const destGod = resolveDestGodFolder(sourceGod);
    const src = path.join(sourceRoot, sourceGod);
    const dst = path.join(destRoot, destGod);
    if (sourceGod !== destGod) {
      renames.push(`${sourceGod} → ${destGod}`);
    }
    const { code, copied } = robocopyMerge(src, dst);
    if (copied || code === 0) {
      merged += 1;
    } else if (code >= 8) {
      console.error(`robocopy failed for ${sourceGod} (exit ${code})`);
      skipped += 1;
    } else {
      merged += 1;
    }
  }

  if (renames.length) {
    console.log('Folder mapping:');
    for (const line of renames) console.log(' ', line);
    console.log('');
  }

  console.log(`Processed ${merged} god folder(s); ${skipped} error(s).`);
  if (isDryRun) {
    console.log('Re-run without --dry-run to copy files.');
  } else {
    console.log('Done. Optional: node scripts/generate-vox-manifest.js');
    console.log('         npm run check-voice-audio');
  }
}

main();
