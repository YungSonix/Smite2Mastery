/**
 * Import Conquest NPC curve-table stats from Hemingway exports into app data.
 *
 * Source (local): C:/Users/Carri/Downloads/Output/Exports/Hemingway/Content/Characters/NPC
 * Blueprint refs: app/data/Gamemodes/Conquest/conquestBlueprintRefs.js
 * Usage: node scripts/import-conquest-npc-stats.js [npcSourceDir]
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_SRC =
  process.env.CONQUEST_NPC_EXPORT ||
  'C:/Users/Carri/Downloads/Output/Exports/Hemingway/Content/Characters/NPC';
const SRC = process.argv[2] || DEFAULT_SRC;
const OUT = path.join(__dirname, '../app/data/Gamemodes/Conquest/conquestNpcStats.js');

const STAT_ROWS = [
  'Character.Stat.MaxHealth',
  'Character.Stat.PhysicalPower',
  'Character.Stat.MagicalPower',
  'Character.Stat.PhysicalProtection',
  'Character.Stat.MagicalProtection',
  'Character.Stat.KillerXPReward',
  'Character.Stat.KillerGoldReward',
  'Character.Stat.TeamXPReward',
  'Character.Stat.TeamGoldReward',
];

function walkCtFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCtFiles(full, out);
    else if (entry.name.startsWith('CT_') && entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

function simplifyCurve(keys) {
  if (!keys?.length) return null;
  return keys.map((k) => [k.Time, k.Value]);
}

function loadCt(filePath) {
  const doc = JSON.parse(fs.readFileSync(filePath, 'utf8'))[0];
  const curves = {};
  for (const row of STAT_ROWS) {
    const c = simplifyCurve(doc.Rows?.[row]?.Keys);
    if (c) curves[row.replace('Character.Stat.', '')] = c;
  }
  const level1 = (row) => curves[row]?.find(([t]) => t === 1)?.[1] ?? curves[row]?.[0]?.[1] ?? 0;
  return {
    file: path.basename(filePath),
    curves,
    base: {
      hp: level1('MaxHealth'),
      power: level1('PhysicalPower'),
      magicalPower: level1('MagicalPower'),
      prot: level1('PhysicalProtection'),
      magicalProt: level1('MagicalProtection'),
      xp: level1('KillerXPReward'),
      gold: level1('KillerGoldReward'),
      teamXp: level1('TeamXPReward'),
      teamGold: level1('TeamGoldReward'),
    },
  };
}

/** POI id (or prefix) → stats profile key */
const POI_STATS_KEY = {
  Order_Tower: 'tower_t1',
  'Order_Tower-2': 'tower_t2',
  'Order_Tower-3': 'tower_t1',
  'Order_Tower-4': 'tower_t2',
  'Order_Tower-5': 'tower_t1',
  'Order_Tower-6': 'tower_t2',
  Chaos_Tower: 'tower_t1',
  'Chaos_Tower-2': 'tower_t2',
  'Chaos_Tower-3': 'tower_t1',
  'Chaos_Tower-4': 'tower_t2',
  'Chaos_Tower-5': 'tower_t1',
  'Chaos_Tower-6': 'tower_t2',
  Order_Phoenix: 'phoenix',
  'Order_Phoenix-2': 'phoenix',
  'Order_Phoenix-3': 'phoenix',
  Chaos_Phoenix: 'phoenix',
  'Chaos_Phoenix-2': 'phoenix',
  'Chaos_Phoenix-3': 'phoenix',
  Order_Titan: 'titan',
  Chaos_Titan: 'titan',
  Blue: 'camp_blue',
  'Blue-2': 'camp_blue',
  Red: 'camp_red',
  'Red-2': 'camp_red',
  Purple: 'camp_purple',
  'Purple-2': 'camp_purple',
  Speed: 'camp_speed',
  'Speed-2': 'camp_speed',
  Trinket: 'camp_trinket',
  'Trinket-2': 'camp_trinket',
  'Trinket-3': 'camp_trinket',
  'Trinket-4': 'camp_trinket',
  'Trinket-5': 'camp_trinket',
  'Trinket-6': 'camp_trinket',
  Cyclops: 'camp_cyclops',
  'Cyclops-2': 'camp_cyclops',
  'Cyclops-3': 'camp_cyclops',
  'Cyclops-4': 'camp_cyclops',
  Scorpion: 'camp_scorpion',
  'Scorpion-2': 'camp_scorpion',
  Rogues: 'camp_rogues',
  'Rogues-2': 'camp_rogues',
  Oracles: 'oracle',
  Random: 'camp_random',
  Gold: 'camp_gold',
  Pyromancer: 'pyromancer',
  Gold_Fury: 'gold_fury',
  Fire_Giant: 'fire_giant',
  Totem: 'totem',
  Moonlight_Queen: 'moonlight_queen',
  Ritual_Site: 'ritual_site',
  Crystal: 'crystal',
  'Crystal-2': 'crystal',
  'Crystal-3': 'crystal',
  'Crystal-4': 'crystal',
  'Crystal-5': 'crystal',
  'Crystal-6': 'crystal',
  'Crystal-7': 'crystal',
  'Crystal-8': 'crystal',
};

const BLUEPRINT_NOTES = {
  camp_blue: 'Blueprints: Primal Camp (Blue) · Centaur · Solo lane (NPE role Solo).',
  camp_red: 'Blueprints: Blight camp · Chimera family.',
  camp_purple: 'Blueprints: Inspiration Camp (Purple) · Manticore — values assumed same as Blue camp (Alpha Centaur CT).',
  camp_speed: 'Blueprints: Pathfinder Camp (Yellow) · Satyr — values assumed same as Blue camp (Alpha Centaur CT).',
  camp_trinket: 'Blueprints: Trinket camp · Harpy family.',
  camp_scorpion: 'Blueprints: Scorpion camp · CT_Jungle_Scorpion_Stats.',
  camp_random: 'Blueprints: rotating buff — Alpha Chimera stats as placeholder.',
  camp_gold: 'Blueprints: The Heliokrater pickup (GoldPickupV2) — not a combat jungle camp.',
  ritual_site: 'Blueprints: Moonlight capture point — not a combat jungle camp.',
  crystal: 'Blueprints: Moonlight shard pickup — not a combat jungle camp.',
};

const PROFILE_SOURCES = {
  tower_t1: 'Towers/CT_Lane_Tower_T1_Stats.json',
  tower_t2: 'Towers/CT_Lane_Tower_T2_Stats.json',
  phoenix: 'Phoenix/CT_Lane_Phoenix_Stats.json',
  titan: 'GRKConq_Titan_Order/CT_Lane_Titan_Stats.json',
  camp_blue: 'GRKConq_Centaur/CT_Jungle_Alpha_Centaur_F2P_Stats.json',
  camp_red: 'GRKConq_Chimera/CT_Jungle_Alpha_Chimera_F2P_Stats.json',
  camp_purple: 'GRKConq_Centaur/CT_Jungle_Alpha_Centaur_F2P_Stats.json',
  camp_speed: 'GRKConq_Centaur/CT_Jungle_Alpha_Centaur_F2P_Stats.json',
  camp_trinket: 'GRKConq_Harpy/CT_Jungle_Harpy_Big_F2P_Stats.json',
  camp_cyclops: 'Cyclops_Warrior/CT_Jungle_Cyclops_Warrior_Big_Stats.json',
  camp_scorpion: 'GRKConq_Scorpion/CT_Jungle_Scorpion_Stats.json',
  camp_rogues: 'NPC_Cyclops_Rogue/CT_Jungle_Cyclops_Big_F2P_Stats.json',
  camp_random: 'GRKConq_Chimera/CT_Jungle_Alpha_Chimera_F2P_Stats.json',
  oracle: 'GRKConq_Oracle/CT_Jungle_Oracle_Stats.json',
  pyromancer: 'GRKConq_Pyromancer/CT_Jungle_Pyromancer_Stats.json',
  gold_fury: 'GRKConq_GoldFury/CT_Jungle_GoldFury_Stats.json',
  fire_giant: 'FireGiant/CT_Jungle_FireGiant_Stats.json',
  totem: 'Totem/CT_Totem.json',
  moonlight_queen: 'NPC_HINConq_Naga/CT_Jungle_Naga_Moonlight_Stats.json',
};

const OBJECTIVE_ONLY = ['camp_gold', 'ritual_site', 'crystal'];

const EMPTY_BASE = {
  hp: 0,
  power: 0,
  magicalPower: 0,
  prot: 0,
  magicalProt: 0,
  xp: 0,
  gold: 0,
  teamXp: 0,
  teamGold: 0,
};

function scalingFor(key) {
  if (key === 'gold_fury' || key === 'fire_giant') return 'boss_curve';
  if (OBJECTIVE_ONLY.includes(key)) return 'objective';
  if (key === 'totem' || key === 'titan' || key === 'phoenix') return 'static';
  return 'camp_reward';
}

const profiles = {};
for (const [key, rel] of Object.entries(PROFILE_SOURCES)) {
  const full = path.join(SRC, rel);
  if (!fs.existsSync(full)) {
    console.warn('Missing', rel);
    continue;
  }
  const loaded = loadCt(full);
  profiles[key] = {
    ...loaded,
    scaling: scalingFor(key),
    blueprintRef: key,
    uncertain: BLUEPRINT_NOTES[key] ? [BLUEPRINT_NOTES[key]] : [],
  };
}

for (const key of OBJECTIVE_ONLY) {
  profiles[key] = {
    file: `Blueprint:${key}`,
    curves: {},
    base: { ...EMPTY_BASE },
    scaling: 'objective',
    blueprintRef: key,
    uncertain: BLUEPRINT_NOTES[key] ? [BLUEPRINT_NOTES[key]] : [],
  };
}

const file = `/**
 * Conquest NPC stats distilled from Hemingway CT exports.
 * Regenerate: node scripts/import-conquest-npc-stats.js
 */
export const CONQUEST_POI_STATS_KEY = ${JSON.stringify(POI_STATS_KEY, null, 2)};

/** @typedef {'camp_reward'|'boss_curve'|'static'|'objective'} ConquestScalingMode */

/**
 * @typedef {Object} ConquestNpcProfile
 * @property {string} file
 * @property {ConquestScalingMode} scaling
 * @property {{ hp:number, power:number, magicalPower:number, prot:number, magicalProt:number, xp:number, gold:number, teamXp:number, teamGold:number }} base
 * @property {Record<string, [number, number][]>} curves
 * @property {string[]} [uncertain]
 */

/** @type {Record<string, ConquestNpcProfile>} */
export const CONQUEST_NPC_PROFILES = ${JSON.stringify(profiles, null, 2)};

export function getConquestStatsKeyForPoi(poiId) {
  return CONQUEST_POI_STATS_KEY[poiId] || null;
}

export function getConquestNpcProfile(poiId) {
  const key = getConquestStatsKeyForPoi(poiId);
  return key ? CONQUEST_NPC_PROFILES[key] : null;
}
`;

fs.writeFileSync(OUT, file, 'utf8');
console.log('Wrote', OUT, '—', Object.keys(profiles).length, 'profiles');
