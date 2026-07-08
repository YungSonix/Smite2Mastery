#!/usr/bin/env node
/**
 * Repair prism loadouts across all gods:
 * 1. Restore parent premium skins corrupted by prism patches (from git HEAD)
 * 2. Re-apply vision-review batches with correct variant targeting + loadout.screenshot
 *
 *   node scripts/god-renders/repair-prism-loadouts-all.js
 *   node scripts/god-renders/repair-prism-loadouts-all.js --write
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PROJECT_ROOT, SKINS_DIR } = require('../../config/dataPaths');

const PARENT_FIELDS = ['loadout', 'loadoutMeta', 'tierBadge', 'information', 'unlock', 'rarity', 'cost', 'price'];

function parseArgs(argv) {
  return { write: argv.includes('--write') };
}

function normalizeKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function loadGitPantheon(fileName) {
  try {
    const raw = execFileSync('git', ['show', `HEAD:app/data/God Information/Skins/${fileName}`], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parentCorrupted(skin) {
  if (!skin || skin.isBaseSkin) return false;
  const dn = String(skin.loadoutMeta?.displayName || skin.skinName || '');
  const hasVariants = (skin.variants || []).length > 0;
  if (!hasVariants) return false;
  if (skin.name && !skin.skinKey) return true;
  if (skin.loadoutMeta?.rarity === 'Prisms' && / - /.test(dn)) return true;
  if (/ - /.test(dn) && skin.loadoutMeta?.gridBadge?.type === 'prism') return true;
  return false;
}

function restoreParentsFromGit(pantheon, gitPantheon, log) {
  if (!gitPantheon) return 0;
  let n = 0;
  for (const god of pantheon.gods || []) {
    const gitGod = (gitPantheon.gods || []).find((g) => normalizeKey(g.godName) === normalizeKey(god.godName));
    if (!gitGod) continue;
    for (const skin of god.skins || []) {
      if (!parentCorrupted(skin)) continue;
      const gitSkin = (gitGod.skins || []).find((s) => normalizeKey(s.skinKey) === normalizeKey(skin.skinKey));
      if (!gitSkin) continue;
      for (const k of PARENT_FIELDS) {
        if (gitSkin[k] !== undefined) skin[k] = JSON.parse(JSON.stringify(gitSkin[k]));
      }
      delete skin.name;
      n++;
      log.push(`restored parent ${god.godName}/${skin.skinKey} from git`);
    }
  }
  return n;
}

function main() {
  const args = parseArgs(process.argv);
  const log = [];
  let restored = 0;

  const files = fs.readdirSync(SKINS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  for (const file of files) {
    const pantheonPath = path.join(SKINS_DIR, file);
    const pantheon = JSON.parse(fs.readFileSync(pantheonPath, 'utf8'));
    const gitPantheon = loadGitPantheon(file);
    restored += restoreParentsFromGit(pantheon, gitPantheon, log);
    if (args.write) {
      fs.writeFileSync(pantheonPath, JSON.stringify(pantheon, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`Restored ${restored} corrupted parent skin(s) from git HEAD`);
  for (const line of log) console.log(' ', line);

  const applyScript = path.join(__dirname, 'apply-vision-review-batch.js');
  const applyArgs = ['node', applyScript];
  if (args.write) applyArgs.push('--write');

  console.log('\nRe-applying vision-review batches...');
  execFileSync(applyArgs[0], applyArgs.slice(1), { cwd: PROJECT_ROOT, stdio: 'inherit' });

  if (args.write) {
    console.log('\nRebuilding audit...');
    execFileSync('node', [path.join(__dirname, 'rebuild-god-render-audit.js')], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    });
  } else {
    console.log('\nDry run — pass --write to save');
  }
}

main();
