#!/usr/bin/env node
/**
 * Scan app/data/Icons/Wallpapers and merge missing skin entries into app/data/builds.json.
 *
 * Usage:
 *   node scripts/import-wallpapers-to-builds.js              # dry-run (report only)
 *   node scripts/import-wallpapers-to-builds.js --write      # apply + backup
 *   node scripts/import-wallpapers-to-builds.js --verbose  # log each add
 *   node scripts/import-wallpapers-to-builds.js --audit      # disk vs builds.json (no import)
 *   node scripts/import-wallpapers-to-builds.js --help
 *
 * Skips files already referenced on any god (skins.*.skin path). If everything shows "Skipped",
 * that usually means builds.json already lists those files — not a failure. Use --audit to compare.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const buildsPath = path.join(projectRoot, 'app', 'data', 'builds.json');
const wallpapersDir = path.join(projectRoot, 'app', 'data', 'Icons', 'Wallpapers');

const IMAGE_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif']);

/** @typedef {{ name: string, skins: Record<string, unknown> }} God */

function flattenGods(buildsData) {
  const raw = buildsData.gods || [];
  if (!Array.isArray(raw)) return [];
  return raw.flat(Infinity).filter(Boolean);
}

function normalizeCompact(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function titleCaseWordsFromUnderscores(slug) {
  const words = String(slug)
    .split(/_+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return titleCaseNatural(words);
}

const TITLE_PARTICLES = new Set([
  'of',
  'the',
  'and',
  'for',
  'in',
  'on',
  'at',
  'to',
  'a',
  'an',
  'or',
  'with',
  'from',
]);

function titleCaseNatural(words) {
  return words
    .map((w, i) => {
      const low = w.toLowerCase();
      if (i > 0 && TITLE_PARTICLES.has(low)) return low;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function prettyFromMixedSlug(slug) {
  const withSpaces = String(slug).replace(/_+/g, ' ').replace(/-+/g, ' ').trim();
  const camelSplit = withSpaces.replace(/([a-z])([A-Z])/g, '$1 $2');
  const words = camelSplit.split(/\s+/).filter(Boolean);
  return titleCaseNatural(words);
}

function toPascalKey(base) {
  const parts = String(base)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Skin';
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function stripLeadingSizePrefix(stem) {
  return stem.replace(/^\d+px-/i, '');
}

/** Tokens that may appear at the start of a wallpaper filename for this god */
function godTokens(godName) {
  const words = godName.split(/\s+/).filter(Boolean);
  const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const compact = title.join('');
  const underscored = title.join('_');
  const set = new Set([compact, underscored, godName.replace(/\s+/g, '_')]);
  if (godName === 'Hua Mulan') {
    set.add('Mulan');
    set.add('HuaMulan');
    set.add('Hua_Mulan');
  }
  if (godName === 'The Morrigan') {
    set.add('Morrigan');
    set.add('TheMorrigan');
  }
  if (godName === 'Nu Wa') {
    set.add('NuWa');
    set.add('Nu_Wa');
  }
  if (godName === 'Da Ji') {
    set.add('DaJi');
    set.add('Da_Ji');
  }
  if (godName === 'Ne Zha') {
    set.add('NeZha');
    set.add('Ne_Zha');
  }
  if (godName === 'Guan Yu') {
    set.add('GuanYu');
    set.add('Guan_Yu');
  }
  if (godName === 'Jing Wei') {
    set.add('JingWei');
    set.add('Jing_Wei');
  }
  if (godName === 'Hou Yi') {
    set.add('HouYi');
    set.add('Hou_Yi');
  }
  if (godName === 'Baron Samedi') {
    set.add('BaronSamedi');
    set.add('Baron_Samedi');
    set.add('Baronsamedi');
  }
  if (godName === 'Morgan Le Fay') {
    set.add('MorganLeFay');
    set.add('Morgan_Le_Fay');
  }
  if (godName === 'Princess Bari') {
    set.add('PrincessBari');
    set.add('Princess_Bari');
  }
  if (godName === 'Sun Wukong') {
    set.add('SunWukong');
    set.add('Sun_Wukong');
  }
  if (godName === 'Hun Batz') {
    set.add('HunBatz');
    set.add('Hun_Batz');
  }
  if (godName === 'Jormungandr') {
    set.add('Jorm');
    set.add('JORM');
  }
  if (godName === 'Mercury') {
    set.add('Mecury'); // common filename typo
  }
  if (godName === 'Yemoja') {
    set.add('Yempja'); // common filename typo
  }
  return [...set];
}

function buildGodRows(gods) {
  const rows = [];
  for (const g of gods) {
    const name = g.name;
    if (!name) continue;
    const tokens = godTokens(name);
    const maxLen = Math.max(...tokens.map((t) => t.length));
    rows.push({ god: g, name, tokens, maxLen });
  }
  rows.sort((a, b) => b.maxLen - a.maxLen);
  return rows;
}

/**
 * @param {string} stem filename without extension, after size prefix strip
 * @param {ReturnType<typeof buildGodRows>} godRows
 */
function matchLeadingGod(stem, godRows) {
  const s = stem;
  for (const { god, name, tokens } of godRows) {
    for (const tok of tokens) {
      if (s.length === tok.length && s.toLowerCase() === tok.toLowerCase()) {
        return { god, godName: name, skinSlug: '', match: 'leading-exact' };
      }
      const re = new RegExp(`^${escapeRe(tok)}S2_`, 'i');
      if (re.test(s)) {
        const rest = s.slice(tok.length + 3); // S2_
        return { god, godName: name, skinSlug: rest, match: 'leading-s2' };
      }
      const re2 = new RegExp(`^${escapeRe(tok)}_`, 'i');
      if (re2.test(s)) {
        const rest = s.slice(tok.length + 1);
        return { god, godName: name, skinSlug: rest, match: 'leading' };
      }
    }
  }
  return null;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} stem
 * @param {ReturnType<typeof buildGodRows>} godRows
 */
function matchTrailingGod(stem, godRows) {
  let parts = stem.split('_').filter((p) => p.length > 0);
  while (parts.length && /^\d+$/.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }
  if (parts.length < 2) return null;
  for (let n = Math.min(3, parts.length - 1); n >= 1; n--) {
    const tail = parts.slice(-n).join('_');
    const head = parts.slice(0, -n).join('_');
    const nt = normalizeCompact(tail);
    for (const { god, name, tokens } of godRows) {
      for (const tok of tokens) {
        if (normalizeCompact(tok) === nt) {
          return { god, godName: name, skinSlug: head, match: 'trailing' };
        }
      }
    }
  }
  return null;
}

/**
 * God name appears inside the stem (e.g. Stumble_Blade_Susano_with_Prisms).
 * @param {string} stem
 * @param {ReturnType<typeof buildGodRows>} godRows
 */
function matchEmbeddedGod(stem, godRows) {
  for (const { god, name, tokens } of godRows) {
    for (const tok of tokens) {
      const re = new RegExp(`(^|_)${escapeRe(tok)}(_|$)`, 'i');
      const m = stem.match(re);
      if (!m || m.index === undefined) continue;
      let skinSlug = (stem.slice(0, m.index) + stem.slice(m.index + m[0].length))
        .replace(/^_+|_+$/g, '')
        .replace(/__+/g, '_');
      if (!skinSlug || skinSlug === stem) continue;
      return { god, godName: name, skinSlug, match: 'embedded' };
    }
  }
  return null;
}

/**
 * @param {string} rest after "SkinArt_"
 * @param {ReturnType<typeof buildGodRows>} godRows
 */
function matchSkinArt(rest, godRows) {
  const m = matchLeadingGod(rest, godRows);
  if (m) return { ...m, match: 'skinart-leading' };
  return null;
}

/**
 * @param {string} filename
 * @param {ReturnType<typeof buildGodRows>} godRows
 */
function resolveWallpaper(filename, godRows) {
  const ext = path.extname(filename);
  if (!IMAGE_EXT.has(ext.toLowerCase())) return null;
  if (filename === 'All God wallpapers') return { skip: true, reason: 'placeholder' };

  let stem = path.basename(filename, ext);
  stem = stripLeadingSizePrefix(stem);
  stem = stem.replace(/\s+/g, '_');
  stem = stem.replace(/^PSD_/i, '');

  if (/^skinart_/i.test(stem)) {
    const rest = stem.replace(/^skinart_/i, '');
    const hit = matchSkinArt(rest, godRows);
    if (hit) return { ...hit, filename, ext };
  }

  let lead = matchLeadingGod(stem, godRows);
  if (!lead && /^t_SkinCard_/i.test(stem)) {
    const rest = stem.replace(/^t_SkinCard_/i, '');
    lead = matchLeadingGod(rest, godRows);
    if (lead) lead = { ...lead, match: 't-skincard' };
  }
  if (lead) return { ...lead, filename, ext };

  const trail = matchTrailingGod(stem, godRows);
  if (trail) return { ...trail, filename, ext };

  const embed = matchEmbeddedGod(stem, godRows);
  if (embed) return { ...embed, filename, ext };

  const tDefault = stem.match(/^T_(.+?)\(S2\)_Default$/i);
  if (tDefault) {
    const inner = tDefault[1].replace(/\s+/g, '_');
    const innerCompact = normalizeCompact(inner);
    for (const { god, name, tokens } of godRows) {
      for (const tok of tokens) {
        if (normalizeCompact(tok) === innerCompact) {
          return {
            god,
            godName: name,
            skinSlug: 'Default',
            match: 't-default',
            filename,
            ext,
          };
        }
      }
    }
  }

  const nstem = normalizeCompact(stem);
  for (const { god, name, tokens } of godRows) {
    for (const tok of tokens) {
      if (normalizeCompact(tok + 'Image') === nstem || normalizeCompact(tok + 'image') === nstem) {
        return {
          god,
          godName: name,
          skinSlug: '',
          match: 'image-suffix',
          filename,
          ext,
        };
      }
    }
  }

  if (/baronsamedi/i.test(stem) || /gingersnapbaron/i.test(stem)) {
    const row = godRows.find((r) => r.name === 'Baron Samedi');
    if (row) {
      return {
        god: row.god,
        godName: row.name,
        skinSlug: stem,
        match: 'heuristic-baron',
        filename,
        ext,
      };
    }
  }

  return { unresolved: true, filename, stem };
}

function skinDisplayName(skinSlug, godName, match) {
  if (!skinSlug) {
    if (match === 'leading-exact' || match === 'image-suffix') return `Base ${godName}`;
    return godName;
  }
  let slug = skinSlug.replace(/_+$/g, '');
  slug = slug.replace(/_-_/g, '__');
  const pieces = slug.split('__').map((p) => prettyFromMixedSlug(p.replace(/_/g, ' ')));
  const skinPretty = pieces.filter(Boolean).join(' — ') || prettyFromMixedSlug(slug);
  const lower = skinPretty.toLowerCase();
  const gn = godName.toLowerCase();
  if (lower.endsWith(gn) || lower.includes(gn)) {
    return titleCaseNatural(skinPretty.split(/\s+/));
  }
  return titleCaseNatural(`${skinPretty} ${godName}`.split(/\s+/));
}

function collectExistingSkinPaths(gods) {
  const set = new Set();
  for (const g of gods) {
    const skins = g.skins || {};
    for (const entry of Object.values(skins)) {
      if (entry && typeof entry === 'object' && entry.skin) {
        set.add(String(entry.skin));
      }
    }
  }
  return set;
}

/** Lowercase basename -> first seen full skin path (for audit) */
function collectWallpaperPathsFromBuilds(gods) {
  const byLower = new Map();
  for (const g of gods) {
    const skins = g.skins || {};
    for (const entry of Object.values(skins)) {
      const s = entry && typeof entry === 'object' ? entry.skin : null;
      if (typeof s !== 'string' || !s.includes('/Wallpapers/')) continue;
      const base = s.split('/').pop() || '';
      const low = base.toLowerCase();
      if (!byLower.has(low)) byLower.set(low, s);
    }
  }
  return byLower;
}

function summarizeSkipReasons(skipped) {
  const m = new Map();
  for (const { reason } of skipped) {
    m.set(reason, (m.get(reason) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function runAudit(gods, imageFiles) {
  const fromJson = collectWallpaperPathsFromBuilds(gods);
  const diskLower = new Set(imageFiles.map((f) => f.toLowerCase()));

  const onDiskNotInJson = imageFiles.filter((f) => !fromJson.has(f.toLowerCase())).sort();
  const inJsonNotOnDisk = [];
  for (const [low, fullPath] of fromJson) {
    if (!diskLower.has(low)) inJsonNotOnDisk.push(fullPath);
  }
  inJsonNotOnDisk.sort();

  console.log('='.repeat(72));
  console.log('Wallpaper audit (disk vs builds.json)');
  console.log('='.repeat(72));
  console.log('Image files on disk:', imageFiles.length);
  console.log('Unique /icons/Wallpapers/* paths in builds.json:', fromJson.size);
  console.log('On disk but NOT referenced in builds.json:', onDiskNotInJson.length);
  console.log('Referenced in builds.json but file missing on disk:', inJsonNotOnDisk.length);
  if (onDiskNotInJson.length) {
    console.log('\n--- Add these by running without them already in JSON (or delete stale skin rows) ---');
    for (const f of onDiskNotInJson) console.log('  ', f);
  }
  if (inJsonNotOnDisk.length) {
    console.log('\n--- Broken references (rename file or fix path in builds.json) ---');
    for (const p of inJsonNotOnDisk.slice(0, 80)) console.log('  ', p);
    if (inJsonNotOnDisk.length > 80) console.log(`  ... and ${inJsonNotOnDisk.length - 80} more`);
  }
  console.log('='.repeat(72));
}

function uniqueSkinKey(god, baseKey, used) {
  let k = baseKey;
  let i = 2;
  while (used.has(k) || (god.skins && god.skins[k])) {
    k = `${baseKey}${i}`;
    i += 1;
  }
  used.add(k);
  return k;
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Wallpaper → builds.json importer

  npm run import-wallpapers              Dry-run: only adds rows for files not yet in builds.json
  npm run import-wallpapers -- --write   Write merges + backup

  npm run import-wallpapers -- --audit   Compare disk vs JSON (why "skipped"?)

If every file is "skipped" as already in builds.json, the import already ran (or paths were added
some other way). New files in Wallpapers/ will show up as "Would add" until you run --write.
`);
    process.exit(0);
  }

  const write = process.argv.includes('--write');
  const verbose = process.argv.includes('--verbose');
  const audit = process.argv.includes('--audit');

  if (!fs.existsSync(wallpapersDir)) {
    console.error('Wallpapers folder missing:', wallpapersDir);
    process.exit(1);
  }

  const raw = fs.readFileSync(buildsPath, 'utf8');
  const buildsData = JSON.parse(raw);
  const gods = flattenGods(buildsData);
  const godRows = buildGodRows(gods);
  const existingPaths = collectExistingSkinPaths(gods);

  const files = fs.readdirSync(wallpapersDir).filter((f) => {
    const st = fs.statSync(path.join(wallpapersDir, f));
    return st.isFile();
  });

  const imageFiles = files.filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));

  if (audit) {
    runAudit(gods, imageFiles);
    return;
  }

  const skipped = [];
  const unresolved = [];
  const wouldAdd = [];

  const usedKeysGlobal = new Map(); // godName -> Set of keys we're adding this run

  for (const god of gods) {
    if (!god.name) continue;
    usedKeysGlobal.set(god.name, new Set());
  }

  for (const filename of files) {
    const ext = path.extname(filename);
    if (!IMAGE_EXT.has(ext.toLowerCase())) {
      skipped.push({ filename, reason: 'not an image' });
      continue;
    }

    const relPath = `/icons/Wallpapers/${filename}`;
    if (existingPaths.has(relPath)) {
      skipped.push({ filename, reason: 'already in builds.json' });
      continue;
    }

    const res = resolveWallpaper(filename, godRows);
    if (!res || res.skip) {
      skipped.push({ filename, reason: res?.reason || 'unknown' });
      continue;
    }
    if (res.unresolved) {
      unresolved.push(filename);
      continue;
    }

    const { god, godName, skinSlug, match } = res;
    const displayName = skinDisplayName(skinSlug, godName, match);
    const keyBase =
      match === 'leading-exact' || (match === 'image-suffix' && !skinSlug)
        ? toPascalKey(godName.replace(/\s+/g, ''))
        : toPascalKey(
            stripLeadingSizePrefix(path.basename(filename, ext))
              .replace(/^skinart_/i, '')
              .replace(/[^a-zA-Z0-9]+/g, ' ')
          );

    const used = usedKeysGlobal.get(godName) || new Set();
    const objectKey = uniqueSkinKey(god, keyBase || 'Skin', used);
    usedKeysGlobal.set(godName, used);

    const entry = {
      name: displayName,
      skin: relPath,
      type:
        match === 'leading-exact' || (match === 'image-suffix' && !skinSlug) ? 'Base Skin' : '',
      price:
        match === 'leading-exact' || (match === 'image-suffix' && !skinSlug)
          ? { diamonds: '0' }
          : { gems: '', diamonds: '', gemsdia: '' },
    };

    wouldAdd.push({ godName, objectKey, entry, filename, match });

    if (verbose) {
      console.log('+', filename, '->', godName, '/', objectKey, '/', displayName);
    }
  }

  /** @type {Map<string, typeof wouldAdd>} */
  const byGod = new Map();
  for (const row of wouldAdd) {
    if (!byGod.has(row.godName)) byGod.set(row.godName, []);
    byGod.get(row.godName).push(row);
  }

  console.log('='.repeat(72));
  console.log('Wallpaper import', write ? '(WRITE)' : '(dry-run)');
  console.log('Files scanned:', files.length);
  console.log('Would add (new paths not in builds.json):', wouldAdd.length);
  console.log('Skipped:', skipped.length);
  console.log('Unresolved (need manual god mapping):', unresolved.length);
  console.log('='.repeat(72));

  const reasonRows = summarizeSkipReasons(skipped);
  if (reasonRows.length) {
    console.log('\nSkip reasons:');
    for (const [reason, n] of reasonRows) console.log(`  ${n}\t${reason}`);
  }

  if (wouldAdd.length === 0 && imageFiles.length > 0) {
    console.log(
      '\nNote: No new files to import. Every image in Wallpapers/ already has a matching skins.*.skin path in builds.json.'
    );
    console.log('  • Drop new images into Wallpapers/ → they will show as "Would add".');
    console.log('  • Run with --audit to list disk vs JSON mismatches (missing files, orphans).');
  }

  if (wouldAdd.length) {
    console.log(write ? '\nSkins added (this run):' : '\nSkins that would be added:');
    const godNames = [...byGod.keys()].sort((a, b) => a.localeCompare(b));
    for (const gn of godNames) {
      const rows = [...byGod.get(gn)].sort(
        (a, b) =>
          String(a.entry.name).localeCompare(String(b.entry.name)) || a.filename.localeCompare(b.filename)
      );
      console.log(`\n  ${gn} (${rows.length})`);
      for (const r of rows) {
        console.log(`    - ${r.entry.name}  [${r.objectKey}]  ← ${r.filename}`);
      }
    }
  }

  if (unresolved.length) {
    console.log('\nUnresolved files (add these manually or extend the script):');
    for (const f of unresolved.sort()) console.log('  -', f);
  }

  if (write && wouldAdd.length) {
    const backupPath = `${buildsPath}.pre-wallpaper-import-${Date.now()}`;
    fs.copyFileSync(buildsPath, backupPath);
    console.log('\nBackup written:', path.relative(projectRoot, backupPath));

    for (const god of gods) {
      const rows = byGod.get(god.name);
      if (!rows || !rows.length) continue;
      if (!god.skins || typeof god.skins !== 'object') god.skins = {};
      for (const { objectKey, entry } of rows) {
        if (god.skins[objectKey]) continue;
        god.skins[objectKey] = entry;
        existingPaths.add(entry.skin);
      }
    }

    fs.writeFileSync(buildsPath, JSON.stringify(buildsData, null, 4) + '\n', 'utf8');
    console.log('Updated', path.relative(projectRoot, buildsPath));
  } else if (write && !wouldAdd.length) {
    console.log('\nNothing to add; builds.json unchanged.');
  } else if (!write && wouldAdd.length) {
    console.log('\nRun with --write to apply changes (after reviewing the list above).');
  }

  if (unresolved.length && !write) {
    process.exitCode = 2;
  }
}

main();
