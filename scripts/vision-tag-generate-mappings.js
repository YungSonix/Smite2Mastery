#!/usr/bin/env node
/**
 * Generate vision-tag-batch-c mappings by pairing sorted screenshots with
 * standard capture order (validated via vision on Da Ji, Achilles, Ne Zha, etc.)
 *
 * Order: Base default → premium skins (+ prism variants) → Shadow → Onyx → Opal → Radiant
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, SKINS_DIR } = require('../config/dataPaths');

const OUT = path.join(PROJECT_ROOT, 'scripts', 'vision-tag-batch-c-mappings.json');

const PANTHEON_BY_GOD = {
  'Da Ji': 'Chinese.json',
  'Guan Yu': 'Chinese.json',
  'Hou Yi': 'Chinese.json',
  'Hua Mulan': 'Chinese.json',
  'Jing Wei': 'Chinese.json',
  'Ne Zha': 'Chinese.json',
  'Nu Wa': 'Chinese.json',
  'Sun Wukong': 'Chinese.json',
  Amaterasu: 'Japanese.json',
  Danzaburou: 'Japanese.json',
  Izanami: 'Japanese.json',
  Susano: 'Japanese.json',
  Tsukuyomi: 'Japanese.json',
  Agni: 'Hindu.json',
  Ganesha: 'Hindu.json',
  Kali: 'Hindu.json',
  Rama: 'Hindu.json',
  Artio: 'Celtic.json',
  Cernunnos: 'Celtic.json',
  Gilgamesh: 'Babylonian.json',
  Ishtar: 'Babylonian.json',
  Merlin: 'Arthurian.json',
  Mordred: 'Arthurian.json',
  'Morgan Le Fay': 'Arthurian.json',
  Aladdin: 'Tales of Arabia.json',
  'Baron Samedi': 'Voodoo.json',
  Pele: 'Polynesian.json',
  'Princess Bari': 'Korean.json',
  Yemoja: 'Yoruba.json',
};

const FOLDER_ALIASES = { Cernunnos: 'cernennos', 'Sun Wukong': 'sun wokong' };

function folderFor(godName) {
  return FOLDER_ALIASES[godName] || godName.toLowerCase();
}

function masteryDisplay(name) {
  const m = String(name).match(/Mastery\s+(\w+)/i);
  if (!m) return name;
  const k = m[1].toLowerCase();
  if (k === 'light') return 'Radiant';
  return m[1];
}

function buildTargets(god) {
  const targets = [];
  const base = (god.skins || []).find((s) => s.isBaseSkin) || god.skins?.[0];
  if (!base) return targets;

  targets.push({
    skinKey: base.skinKey,
    skinName: base.skinName,
    displayName: 'Base',
  });

  for (const skin of god.skins || []) {
    if (skin.isBaseSkin) continue;
    if (skin.isMasteryShadowSkin || /^shadow$/i.test(skin.skinName || '')) continue;
    targets.push({
      skinKey: skin.skinKey,
      skinName: skin.skinName,
      displayName: skin.skinName,
    });
    for (const v of skin.variants || []) {
      targets.push({
        skinKey: skin.skinKey,
        skinName: skin.skinName,
        variantName: v.name,
        displayName: `${skin.skinName} - ${v.name.replace(/^Prism\s*/i, '')}`.replace(/ - $/, ''),
      });
    }
  }

  const shadow = (god.skins || []).find(
    (s) => s.isMasteryShadowSkin || /^shadow$/i.test(s.skinName || '')
  );
  if (shadow) {
    targets.push({
      skinKey: shadow.skinKey,
      skinName: shadow.skinName,
      displayName: 'Shadow',
      tier: shadow.rarity === 'Classic' ? 'Classic' : shadow.rarity || 'Heroic',
      cost: shadow.cost?.amount
        ? { currency: 'diamonds', amount: String(shadow.cost.amount), owned: false }
        : { currency: 'diamonds', amount: '900', owned: false },
    });
  }

  for (const v of base.variants || []) {
    if (/mastery/i.test(v.name)) {
      targets.push({
        skinKey: base.skinKey,
        skinName: base.skinName,
        variantName: v.name,
        displayName: masteryDisplay(v.name),
        tier: 'Heroic',
        gridBadge: {
          type: 'masteryRank',
          rank: /radiant|light/i.test(v.name) ? 10 : 5,
          label: /radiant|light/i.test(v.name) ? 'X' : 'V',
          emblemPath: /radiant|light/i.test(v.name)
            ? 'app/data/Tiers/T_MasteryEmblem_Perfect_256.png'
            : 'app/data/Tiers/T_MasteryEmblem_Lvl5_256.png',
        },
      });
    }
  }

  return targets;
}

function listShots(folder) {
  const dir = path.join(PROJECT_ROOT, 'app/data/God Renders', folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function loadGod(pantheonFile, godName) {
  const data = JSON.parse(fs.readFileSync(path.join(SKINS_DIR, pantheonFile), 'utf8'));
  return data.gods.find((g) => g.godName === godName);
}

const mappings = [];
const issues = [];

for (const [godName, pantheonFile] of Object.entries(PANTHEON_BY_GOD)) {
  const god = loadGod(pantheonFile, godName);
  if (!god) {
    issues.push({ god: godName, error: 'god missing from pantheon JSON' });
    continue;
  }
  const folder = folderFor(godName);
  const shots = listShots(folder);
  const targets = buildTargets(god);
  if (shots.length !== targets.length) {
    issues.push({
      god: godName,
      shots: shots.length,
      targets: targets.length,
      targetNames: targets.map((t) => t.variantName ? `${t.skinName}→${t.variantName}` : t.displayName),
    });
  }
  const n = Math.min(shots.length, targets.length);
  for (let i = 0; i < n; i++) {
    const t = targets[i];
    mappings.push({
      godName,
      folder,
      fileName: shots[i],
      skinKey: t.skinKey,
      skinName: t.skinName,
      variantName: t.variantName || undefined,
      displayName: t.displayName,
      tier: t.tier || undefined,
      cost: t.cost || undefined,
      gridBadge: t.gridBadge || undefined,
      rarity: t.tier || undefined,
    });
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(mappings, null, 2)}\n`, 'utf8');
console.log(`Wrote ${mappings.length} mappings, ${issues.length} issues`);
if (issues.length) console.log(JSON.stringify(issues, null, 2));
