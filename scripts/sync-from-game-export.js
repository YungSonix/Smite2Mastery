/**
 * Sync FModel export tree → app data (selective — copies only what exists in export).
 *
 * Export root (FModel → JSON + PNG):
 *   %USERPROFILE%/Downloads/Output/Exports/Hemingway/Content
 * Override: SMITE2_EXPORT_ROOT
 *
 * Per patch in FModel, export:
 *   UI/StringTables/God/
 *   UI/StringTables/Items/ST_HW_Items_ItemDescriptions_Short.json
 *   UI/Textures/ArtAssets/Gods/{God}/              (PNG — whole god or Skins/{Skin}/ only)
 *   UI/.../WanderingMarket/Market0/Hub_Images/      (PNG — Featured subfolder; latest OB##)
 *   Audio/GODS/{God}/                               (WAV under Exports/.../Content/Audio/GODS)
 *
 * Usage:
 *   npm run sync:game-export
 *   node scripts/sync-from-game-export.js [--dry-run] [--patch OB38]
 *     [--gods Chronos,Yemoja] [--discover-skins] [--with-skins]
 *
 * Default WM patch: OB38 (override with --patch or SMITE2_WM_PATCH).
 * Merge-only: copies into the app; never deletes existing NewGodSkins or WM images.
 *
 * Skins: only folders you export in FModel are copied (no full-game scan).
 *   --discover-skins  stub new skin rows in builds.json + refresh God Information/Skins/*.json
 *   --with-skins      same as --discover-skins (alias)
 * Prices/renders in builds.json stay manual unless you edit them.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

/** Default Wandering Market patch when --patch omitted. Env: SMITE2_WM_PATCH=38 */
const DEFAULT_WM_PATCH = (() => {
  const raw = process.env.SMITE2_WM_PATCH || '38';
  const m = String(raw).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 38;
})();

const DEFAULT_EXPORT_ROOT = path.join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Downloads',
  'Output',
  'Exports',
  'Hemingway',
  'Content'
);

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const WITH_SKINS = argv.includes('--with-skins') || argv.includes('--discover-skins');
const patchFlagIdx = argv.findIndex((a) => a === '--patch');
const PATCH_OVERRIDE = patchFlagIdx >= 0 ? String(argv[patchFlagIdx + 1] || '').trim() : '';
const godsFlagIdx = argv.findIndex((a) => a === '--gods');
const GODS_FILTER = godsFlagIdx >= 0
  ? String(argv[godsFlagIdx + 1] || '')
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

const EXPORT_ROOT = path.resolve(process.env.SMITE2_EXPORT_ROOT || DEFAULT_EXPORT_ROOT);

const PATHS = {
  godStringTablesSrc: path.join(EXPORT_ROOT, 'UI', 'StringTables', 'God'),
  itemStringTableSrc: path.join(
    EXPORT_ROOT,
    'UI',
    'StringTables',
    'Items',
    'ST_HW_Items_ItemDescriptions_Short.json'
  ),
  godsTexturesSrc: path.join(EXPORT_ROOT, 'UI', 'Textures', 'ArtAssets', 'Gods'),
  wmHubImagesSrc: path.join(
    EXPORT_ROOT,
    'UI',
    'Textures',
    'ArtAssets',
    'Client',
    'Store',
    'WanderingMarket',
    'Market0',
    'Hub_Images'
  ),
  audioGodsSrc: path.join(EXPORT_ROOT, 'Audio', 'GODS'),
  wavGodsSrc: path.join(EXPORT_ROOT, '..', '..', '..', 'WAV', 'GODS'),

  godStringTablesDest: path.join(ROOT, 'app', 'data', 'StringTables', 'God'),
  itemStringTableDest: path.join(
    ROOT,
    'app',
    'data',
    'StringTables',
    'Items',
    'ST_HW_Items_ItemDescriptions_Short.json'
  ),
  newGodSkinsDest: path.join(ROOT, 'app', 'data', 'NewGodSkins'),
  newGodImageDest: path.join(ROOT, 'app', 'data', 'Patch Notes', 'New God Image'),
  wmImageDest: path.join(ROOT, 'app', 'data', 'Patch Notes', 'Wandering Market Images'),
};

const GOD_STRING_TABLE_FILES = [
  'ST_HW_God_AbilityCompactDescriptions.json',
  'ST_HW_God_AbilityDescriptions.json',
  'ST_HW_God_AbilityShortDescriptions.json',
  'ST_HW_God_GodSummary.json',
  'ST_HW_God_Talents.json',
];

const IMAGE_EXT = /\.(png|webp|jpg|jpeg)$/i;
const AUDIO_EXT = /\.(wav|WAV)$/;

const log = {
  info: (msg) => console.log(msg),
  section: (msg) => console.log(`\n=== ${msg} ===`),
  warn: (msg) => console.warn(`⚠ ${msg}`),
};

function ensureDir(dir) {
  if (DRY_RUN) return;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  if (DRY_RUN) {
    log.info(`[dry-run] copy ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
    return true;
  }
  fs.copyFileSync(src, dest);
  log.info(`copied ${path.basename(dest)}`);
  return true;
}

function godNameMatchesFilter(name) {
  if (!GODS_FILTER?.length) return true;
  const norm = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  return GODS_FILTER.some((g) => {
    const want = String(g).toLowerCase().replace(/[^a-z0-9]/g, '');
    return norm === want || norm.includes(want) || want.includes(norm);
  });
}

function listSkinFoldersInExport() {
  const found = [];
  if (!fs.existsSync(PATHS.godsTexturesSrc)) return found;
  for (const god of fs.readdirSync(PATHS.godsTexturesSrc, { withFileTypes: true })) {
    if (!god.isDirectory() || !godNameMatchesFilter(god.name)) continue;
    const skinsDir = path.join(PATHS.godsTexturesSrc, god.name, 'Skins');
    if (!fs.existsSync(skinsDir)) continue;
    for (const skin of fs.readdirSync(skinsDir, { withFileTypes: true })) {
      if (!skin.isDirectory()) continue;
      if (/^mastery$/i.test(skin.name)) continue;
      found.push(`${god.name}/Skins/${skin.name}`);
    }
  }
  return found;
}

function reportExportedContent() {
  const skinFolders = listSkinFoldersInExport();
  if (skinFolders.length) {
    log.info('Skin folders in export: ' + skinFolders.join(', '));
  }
}

function listFilesRecursive(dir, filterFn) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!filterFn || filterFn(full, entry.name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function syncGodStringTables() {
  log.section('God string tables');
  if (!fs.existsSync(PATHS.godStringTablesSrc)) {
    log.warn(`Missing ${PATHS.godStringTablesSrc}`);
    return 0;
  }
  let n = 0;
  for (const file of GOD_STRING_TABLE_FILES) {
    const src = path.join(PATHS.godStringTablesSrc, file);
    const dest = path.join(PATHS.godStringTablesDest, file);
    if (copyFile(src, dest)) n += 1;
  }
  return n;
}

function syncItemStringTable() {
  log.section('Item descriptions (short)');
  if (!fs.existsSync(PATHS.itemStringTableSrc)) {
    log.warn(`Missing ${PATHS.itemStringTableSrc}`);
    return 0;
  }
  return copyFile(PATHS.itemStringTableSrc, PATHS.itemStringTableDest) ? 1 : 0;
}

function syncGodTextures() {
  log.section('God textures → NewGodSkins (merge — other gods untouched)');
  if (!fs.existsSync(PATHS.godsTexturesSrc)) {
    log.warn(`Missing ${PATHS.godsTexturesSrc}`);
    return { pngCount: 0, scorecards: [] };
  }

  let pngCount = 0;
  const scorecards = [];
  const godDirs = fs
    .readdirSync(PATHS.godsTexturesSrc, { withFileTypes: true })
    .filter((d) => d.isDirectory() && godNameMatchesFilter(d.name))
    .map((d) => d.name);

  for (const god of godDirs) {
    const srcGod = path.join(PATHS.godsTexturesSrc, god);
    const destGod = path.join(PATHS.newGodSkinsDest, god);
    const pngs = listFilesRecursive(srcGod, (_, name) => IMAGE_EXT.test(name));

    for (const src of pngs) {
      const rel = path.relative(srcGod, src);
      const dest = path.join(destGod, rel);
      if (copyFile(src, dest)) pngCount += 1;

      if (/[/\\]Default[/\\]t_Scorecard_/i.test(src) || /[/\\]Default[/\\].*Scorecard/i.test(src)) {
        scorecards.push({ god, src, fileName: path.basename(src) });
      }
    }
  }

  log.info(`Gods in export: ${godDirs.join(', ') || '(none)'}`);
  return { pngCount, scorecards };
}

function syncScorecards(scorecards) {
  log.section('New god scorecards → Patch Notes/New God Image');
  if (!scorecards.length) {
    log.info('No scorecard PNGs in exported god folders.');
    return 0;
  }
  let n = 0;
  for (const { src, fileName } of scorecards) {
    if (copyFile(src, path.join(PATHS.newGodImageDest, fileName))) n += 1;
  }
  return n;
}

function parseObNumber(fileName) {
  const m = String(fileName).match(/OB(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function resolveWmPatchNumber(files) {
  if (PATCH_OVERRIDE) {
    const m = PATCH_OVERRIDE.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }
  if (DEFAULT_WM_PATCH) return DEFAULT_WM_PATCH;
  let max = 0;
  for (const f of files) {
    const ob = parseObNumber(path.basename(f));
    if (ob && ob > max) max = ob;
  }
  return max || null;
}

function syncWanderingMarketFeatured() {
  log.section('Wandering Market Featured (add OB patch — keep existing)');
  if (!fs.existsSync(PATHS.wmHubImagesSrc)) {
    log.warn(`Missing ${PATHS.wmHubImagesSrc}`);
    return { copied: 0, patch: null, suggestions: [] };
  }

  const pngs = listFilesRecursive(
    PATHS.wmHubImagesSrc,
    (_, name) => IMAGE_EXT.test(name) && /featured/i.test(name)
  );
  if (!pngs.length) {
    log.info('No Featured PNGs in export.');
    return { copied: 0, patch: null, suggestions: [] };
  }

  const patchNum = resolveWmPatchNumber(pngs);
  if (!patchNum) {
    log.warn('Could not resolve OB##; pass --patch OB38 or set SMITE2_WM_PATCH');
    return { copied: 0, patch: null, suggestions: [] };
  }

  const obToken = `OB${patchNum}`;
  const matching = pngs.filter((f) => new RegExp(obToken, 'i').test(path.basename(f)));
  log.info(`Adding ${obToken} Featured (${matching.length} file(s)); older OB PNGs in app folder are kept`);

  let copied = 0;
  const suggestions = [];
  for (const src of matching) {
    const fileName = path.basename(src);
    const dest = path.join(PATHS.wmImageDest, fileName);
    if (copyFile(src, dest)) copied += 1;

    const keyMatch = fileName.match(/OB\d+_([^._]+)/i);
    if (keyMatch) {
      const short = keyMatch[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      suggestions.push(`'ob${patchNum}-${short}': require('../app/data/Patch Notes/Wandering Market Images/${fileName}')`);
    }
  }

  return { copied, patch: patchNum, suggestions };
}

function resolveVoiceSource() {
  const candidates = [
    process.env.VOICE_GODS_SOURCE,
    PATHS.audioGodsSrc,
    PATHS.wavGodsSrc,
  ].filter(Boolean);

  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (!fs.existsSync(resolved)) continue;
    const hasAudio = listFilesRecursive(resolved, (_, name) => AUDIO_EXT.test(name)).length > 0;
    if (hasAudio) return resolved;
  }
  return null;
}

function syncVoiceAudio() {
  log.section('Voice audio (GODS → VoiceAudio)');
  const source = resolveVoiceSource();
  if (!source) {
    log.warn(
      'No WAV tree found. Export Hemingway/Content/Audio/GODS/{God} as WAV in FModel, or set VOICE_GODS_SOURCE.'
    );
    return false;
  }

  log.info(`Source: ${source}`);
  const args = [path.join(__dirname, 'merge-gods-voice-audio.js')];
  if (DRY_RUN) args.push('--dry-run');
  args.push(source);

  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' });
  return (result.status ?? 1) === 0;
}

function runPostStep(label, scriptRel, extraArgs = []) {
  if (DRY_RUN) {
    log.info(`[dry-run] would run: node ${scriptRel} ${extraArgs.join(' ')}`.trim());
    return true;
  }
  log.info(`→ ${label}`);
  const result = spawnSync(process.execPath, [path.join(__dirname, scriptRel), ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  return (result.status ?? 1) === 0;
}

function printManualFollowUps(wmResult, scorecards) {
  log.section('Manual follow-ups (not automated)');
  console.log('- builds.json item/god rows: node .scripts/update-builds.js');
  console.log('- After builds.json edits: npm run builds:split');
  console.log('- Skin prices, types, renders: edit builds.json / God Renders (you said later)');
  console.log('- Patch highlights JSON: wire image keys in lib/newGodPatchImages.js');

  if (scorecards.length) {
    console.log('- New god scorecards copied — add to lib/newGodPatchImages.js if new god patch:');
    for (const { god, fileName } of scorecards) {
      console.log(`    ob??-${god.toLowerCase()} → ${fileName}`);
    }
  }

  if (wmResult.suggestions?.length) {
    console.log('- Wandering Market — add to lib/wanderingMarketImages.js:');
    for (const line of wmResult.suggestions) {
      console.log(`    ${line}`);
    }
  }

  if (!WITH_SKINS) {
    console.log('- Refresh God Information/Skins/*.json: npm run sync:game-export -- --discover-skins');
  }
}

function main() {
  console.log('SMITE 2 game export sync');
  console.log('Export root:', EXPORT_ROOT);
  console.log('Mode:', DRY_RUN ? 'dry-run' : 'write');
  console.log('WM patch:', PATCH_OVERRIDE || `OB${DEFAULT_WM_PATCH} (default)`);
  console.log('Policy: merge-only — never deletes existing NewGodSkins or WM images');
  if (GODS_FILTER?.length) console.log('God filter:', GODS_FILTER.join(', '));
  console.log('');

  if (!fs.existsSync(EXPORT_ROOT)) {
    console.error('Export root not found. Set SMITE2_EXPORT_ROOT or export from FModel first.');
    process.exit(1);
  }

  const stGod = syncGodStringTables();
  const stItem = syncItemStringTable();
  reportExportedContent();
  const { pngCount, scorecards } = syncGodTextures();
  const scorecardCount = syncScorecards(scorecards);
  const wmResult = syncWanderingMarketFeatured();
  const voiceOk = syncVoiceAudio();

  if (!DRY_RUN) {
    log.section('Post-process');
    runPostStep('godAbilityTalentLineups', 'generate-god-talent-lineups.js', ['--write']);
    runPostStep('compile string tables', 'compile-string-tables.js');
    runPostStep('vox manifest', 'generate-vox-manifest.js');

    if (WITH_SKINS) {
      runPostStep('sync newgodskins → builds', 'sync-newgodskins-to-builds.js', ['--write']);
      runPostStep('export pantheon skins JSON', 'export-god-skins.js');
    }
  } else {
    log.section('Post-process (skipped in dry-run)');
    log.info('Would run: generate-god-talent-lineups --write, compile-string-tables, vox:manifest');
    if (WITH_SKINS) log.info('Would run: sync-newgodskins --write, export-god-skins');
  }

  log.section('Summary');
  console.log(`God string tables:     ${stGod}/${GOD_STRING_TABLE_FILES.length}`);
  console.log(`Item descriptions:     ${stItem ? 'yes' : 'skipped'}`);
  console.log(`God PNGs:              ${pngCount}`);
  console.log(`Scorecards:            ${scorecardCount}`);
  console.log(`WM Featured (OB${wmResult.patch || '?' }): ${wmResult.copied}`);
  console.log(`Voice merge:           ${voiceOk ? 'ok' : 'skipped/failed'}`);

  printManualFollowUps(wmResult, scorecards);

  if (!DRY_RUN) {
    console.log('\nDone.');
  } else {
    console.log('\nDry run complete — re-run without --dry-run to apply.');
  }
}

main();
