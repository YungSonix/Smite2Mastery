/**
 * OB38 penetration pass — fix flat vs % pen on item stats in builds.json only.
 * Does not touch Skins/ or god data.
 *
 * Usage: node scripts/fix-ob38-penetration-stats.js [--write]
 */
const fs = require('fs');
const path = require('path');

const BUILDS_PATH = path.join(__dirname, '../app/data/God Information/Builds/builds.json');
const WRITE = process.argv.includes('--write');

/** @type {Record<string, { flat?: number, magPct?: number, physPct?: number, clearPen?: boolean }>} */
const OB38_BY_INTERNAL = {
  AvatarsParashu: { clearPen: true, physPct: 10 },
  BalorsEye: { clearPen: true, magPct: 20 },
  DreamersIdol: { clearPen: true, magPct: 10 },
  GluttonousGrimoire: { clearPen: true, magPct: 10 },
  Heartseeker: { clearPen: true, physPct: 10 },
  PendulumBlade: { clearPen: true, physPct: 10 },
  Riptalon: { clearPen: true, physPct: 10 },
  EldritchOrb: { clearPen: true, magPct: 5 },
  SpearOfTheMagus: { clearPen: true, magPct: 10 },
  SerpentSpear: { clearPen: true, physPct: 20 },
  EvolvedBookOfThoth: { flat: 5 },
  StaffOfCosmicHorror: { flat: 15 },
  SoulGem: { flat: 10 },
  SpearOfDesolation: { flat: 15 },
  DoomOrb: { flat: 10 },
  JotunnsRevenge: { flat: 5 },
  EvolvedTranscendence: { flat: 10 },
  TekkoKagi: { flat: 10 },
  TheCrusher: { flat: 10 },
  TheReaper: { flat: 10 },
  TheWorldStone: { flat: 10 },
  // VoidShard — component flat pen unchanged (10 flat)
};

function applyPenFix(stats, fix) {
  if (!stats || !fix) return false;
  let changed = false;

  if (fix.clearPen) {
    if ('Penetration' in stats) {
      delete stats.Penetration;
      changed = true;
    }
  }

  if (fix.flat != null) {
    if (stats['Flat Penetration'] !== fix.flat) {
      stats['Flat Penetration'] = fix.flat;
      changed = true;
    }
    if ('Penetration' in stats) {
      delete stats.Penetration;
      changed = true;
    }
  }

  if (fix.magPct != null) {
    if (stats.PercentMagicalPenetration !== fix.magPct) {
      stats.PercentMagicalPenetration = fix.magPct;
      changed = true;
    }
  }

  if (fix.physPct != null) {
    if (stats.PercentPhysicalPenetration !== fix.physPct) {
      stats.PercentPhysicalPenetration = fix.physPct;
      changed = true;
    }
  }

  return changed;
}

function walkItems(items, changes) {
  if (!Array.isArray(items)) return;
  for (const col of items) {
    if (!Array.isArray(col)) continue;
    for (const item of col) {
      if (!item?.internalName || !item.stats) continue;
      const fix = OB38_BY_INTERNAL[item.internalName];
      if (!fix) continue;
      if (applyPenFix(item.stats, fix)) {
        changes.push(`${item.name} (${item.internalName})`);
      }
    }
  }
}

const raw = fs.readFileSync(BUILDS_PATH, 'utf8');
const builds = JSON.parse(raw);
const changes = [];

walkItems(builds.items, changes);

console.log(`Penetration fixes: ${changes.length} item(s)`);
changes.forEach((c) => console.log(`  - ${c}`));

if (!WRITE) {
  console.log('\nDry run — pass --write to apply.');
  process.exit(0);
}

fs.writeFileSync(BUILDS_PATH, `${JSON.stringify(builds, null, 4)}\n`, 'utf8');
console.log('\nWrote', BUILDS_PATH);
