/**
 * Generates app/data/Gamemodes/Conquest/conquestMapPoints.js from SVG POI coords.
 * Usage: node scripts/generate-conquest-map-points.js
 */
const fs = require('fs');
const path = require('path');

const DAY = path.join(__dirname, '../app/data/Gamemodes/Conquest/DayConquest Map.svg');
const OUT = path.join(__dirname, '../app/data/Gamemodes/Conquest/conquestMapPoints.js');

function extractPois(svgText) {
  const pois = [];
  const tagRe = /<(use|image)\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(svgText))) {
    const tag = m[0];
    const id = /id="([^"]+)"/.exec(tag)?.[1];
    if (!id || id.startsWith('image') || id === 'Map' || id === 'Order_Structures') continue;
    pois.push({
      id,
      x: Number(/x="(\d+)"/.exec(tag)?.[1] || 0),
      y: Number(/y="(\d+)"/.exec(tag)?.[1] || 0),
      w: Number(/width="(\d+)"/.exec(tag)?.[1] || 0),
      h: Number(/height="(\d+)"/.exec(tag)?.[1] || 0),
    });
  }
  return pois;
}

const day = extractPois(fs.readFileSync(DAY, 'utf8'));
const dayIds = new Set(day.map((p) => p.id));

const TOWER = {
  Order_Tower: { title: 'Order Duo Tower', subtitle: 'Outer · Duo lane', side: 'Order' },
  'Order_Tower-2': { title: 'Order Duo Tower', subtitle: 'Inner · Duo lane', side: 'Order' },
  'Order_Tower-3': { title: 'Order Mid Tower', subtitle: 'Outer · Mid lane', side: 'Order' },
  'Order_Tower-4': { title: 'Order Mid Tower', subtitle: 'Inner · Mid lane', side: 'Order' },
  'Order_Tower-5': { title: 'Order Solo Tower', subtitle: 'Outer · Solo lane', side: 'Order' },
  'Order_Tower-6': { title: 'Order Solo Tower', subtitle: 'Inner · Solo lane', side: 'Order' },
  Chaos_Tower: { title: 'Chaos Duo Tower', subtitle: 'Outer · Duo lane', side: 'Chaos' },
  'Chaos_Tower-2': { title: 'Chaos Duo Tower', subtitle: 'Inner · Duo lane', side: 'Chaos' },
  'Chaos_Tower-3': { title: 'Chaos Mid Tower', subtitle: 'Outer · Mid lane', side: 'Chaos' },
  'Chaos_Tower-4': { title: 'Chaos Mid Tower', subtitle: 'Inner · Mid lane', side: 'Chaos' },
  'Chaos_Tower-5': { title: 'Chaos Solo Tower', subtitle: 'Outer · Solo lane', side: 'Chaos' },
  'Chaos_Tower-6': { title: 'Chaos Solo Tower', subtitle: 'Inner · Solo lane', side: 'Chaos' },
};

const PHOENIX = {
  Order_Phoenix: { title: 'Order Duo Phoenix', subtitle: 'Duo lane · Order base', side: 'Order' },
  'Order_Phoenix-2': { title: 'Order Mid Phoenix', subtitle: 'Mid lane · Order base', side: 'Order' },
  'Order_Phoenix-3': { title: 'Order Solo Phoenix', subtitle: 'Solo lane · Order base', side: 'Order' },
  Chaos_Phoenix: { title: 'Chaos Duo Phoenix', subtitle: 'Duo lane · Chaos base', side: 'Chaos' },
  'Chaos_Phoenix-2': { title: 'Chaos Mid Phoenix', subtitle: 'Mid lane · Chaos base', side: 'Chaos' },
  'Chaos_Phoenix-3': { title: 'Chaos Solo Phoenix', subtitle: 'Solo lane · Chaos base', side: 'Chaos' },
};

const CAMP_SIDE = {
  Rogues: 'Order jungle · East',
  'Rogues-2': 'Chaos jungle · West',
  'Blue-2': 'Chaos side · Blue buff',
  Blue: 'Order side · Blue buff',
  'Speed-2': 'Chaos side · Speed buff',
  Speed: 'Order side · Speed buff',
  'Purple-2': 'Chaos side · Purple buff',
  Purple: 'Order side · Purple buff',
  'Red-2': 'Chaos side · Red buff',
  Red: 'Order side · Red buff',
  'Cyclops-2': 'Chaos side · Cyclops camp',
  Cyclops: 'Order side · Cyclops camp',
  'Cyclops-3': 'Order side · Duo jungle',
  'Cyclops-4': 'Chaos side · Duo jungle',
  'Scorpion-2': 'Chaos side · Scorpion camp',
  Scorpion: 'Order side · Scorpion camp',
  'Trinket-2': 'Chaos side · Trinket camp',
  Trinket: 'Order side · Trinket camp',
  'Trinket-3': 'Order side · Mid jungle',
  'Trinket-4': 'Chaos side · Mid jungle',
  'Trinket-5': 'Order side · Solo jungle',
  'Trinket-6': 'Chaos side · Solo jungle',
};

const CRYSTAL_SIDE = {
  Crystal: 'East jungle',
  'Crystal-2': 'Order red buff side',
  'Crystal-3': 'Order mid jungle',
  'Crystal-4': 'Chaos mid jungle',
  'Crystal-5': 'Center · Ritual approach',
  'Crystal-6': 'Order solo side',
  'Crystal-7': 'Chaos solo side',
  'Crystal-8': 'West jungle',
};

function metaFor(id) {
  if (TOWER[id]) {
    return {
      category: 'tower',
      icon: 'tower',
      title: TOWER[id].title,
      subtitle: TOWER[id].subtitle,
      helpTipKeys: ['Conquest.Tower.TargetedByEnemyTower.Description', 'TowerBounty.Reward.Description'],
    };
  }
  if (PHOENIX[id]) {
    return {
      category: 'phoenix',
      icon: 'phoenix',
      title: PHOENIX[id].title,
      subtitle: PHOENIX[id].subtitle,
      helpTipKeys: ['Phoenix.Description'],
    };
  }
  if (id === 'Order_Titan') {
    return {
      category: 'titan',
      icon: 'titan',
      title: 'Order Titan',
      subtitle: 'Order base · Win condition',
      helpTipKeys: ['Conquest.Role.Generic.Description'],
      descriptionExtra:
        'Destroy all enemy Towers and Phoenixes, then slay the Chaos Titan to win. Protect your Titan at all costs.',
    };
  }
  if (id === 'Chaos_Titan') {
    return {
      category: 'titan',
      icon: 'titan',
      title: 'Chaos Titan',
      subtitle: 'Chaos base · Win condition',
      helpTipKeys: ['Conquest.Role.Generic.Description'],
      descriptionExtra:
        'Destroy all enemy Towers and Phoenixes, then slay the Order Titan to win. Protect your Titan at all costs.',
    };
  }
  if (id === 'Gold_Fury') {
    return {
      category: 'boss',
      icon: 'goldFury',
      title: 'Gold Fury',
      subtitle: 'Ancient Fury · Duo jungle',
      helpTipKeys: [
        'GoldFury.Reward.Description',
        'GoldFury.Reward.StatBuff.NoFormatting',
        'GoldFury.1.Description',
        'GoldFury.2.Description',
        'GoldFury.3.Description',
        'GoldFury.4.Description',
      ],
    };
  }
  if (id === 'Fire_Giant') {
    return {
      category: 'boss',
      icon: 'fireGiant',
      title: 'Fire Giant',
      subtitle: 'Late-game jungle boss',
      helpTipKeys: ['FireGiant.1.Description', 'FireGiant.2.Description'],
    };
  }
  if (id === 'Pyromancer') {
    return {
      category: 'boss',
      icon: 'boss',
      title: 'Pyromancer',
      subtitle: 'Mid jungle boss',
      descriptionExtra:
        'Mid-map boss that grants gold and experience. Contest early to accelerate your team’s power spike.',
    };
  }
  if (id === 'Moonlight_Queen') {
    return {
      category: 'boss',
      icon: 'boss',
      title: 'Moonlight Queen',
      subtitle: 'Night phase · Naga boss',
      nightOnly: true,
      descriptionExtra:
        'Spawns during Moonlight phases. Defeating her drops Moonlight Shards for your team. Shard totals decide phase winners and lane pusher rewards.',
    };
  }
  if (id.startsWith('Blue')) {
    return {
      category: 'camp',
      icon: 'primal',
      title: 'Blue Buff Camp',
      subtitle: CAMP_SIDE[id] || 'Primal buff',
      helpTipKeys: ['Infamy.1.Description', 'Primal.1.Description', 'Primal.2.Description', 'Primal.3.Description'],
    };
  }
  if (id.startsWith('Red')) {
    return {
      category: 'camp',
      icon: 'blight',
      title: 'Red Buff Camp',
      subtitle: CAMP_SIDE[id] || 'Blight buff',
      helpTipKeys: ['Infamy.1.Description', 'Blight.1.Description', 'Blight.2.Description', 'Blight.3.Description'],
    };
  }
  if (id.startsWith('Purple')) {
    return {
      category: 'camp',
      icon: 'inspiration',
      title: 'Purple Buff Camp',
      subtitle: CAMP_SIDE[id] || 'Inspiration buff',
      helpTipKeys: [
        'Infamy.1.Description',
        'InspirationV2.1.Description',
        'InspirationV2.2.Description',
        'InspirationV2.3.Description',
      ],
    };
  }
  if (id.startsWith('Speed')) {
    return {
      category: 'camp',
      icon: 'pathfinder',
      title: 'Speed Buff Camp',
      subtitle: CAMP_SIDE[id] || 'Pathfinder buff',
      helpTipKeys: ['Infamy.1.Description', 'Pathfinder.1.Description', 'Pathfinder.2.Description', 'Pathfinder.3.Description'],
    };
  }
  if (id.startsWith('Trinket')) {
    return {
      category: 'camp',
      icon: 'camp',
      title: 'Trinket Camp',
      subtitle: CAMP_SIDE[id] || 'Shield trinkets',
      helpTipKeys: ['Infamy.1.Description', 'Trinkets.1.Description', 'Trinkets.2.Description', 'Trinkets.3.Description'],
    };
  }
  if (id.startsWith('Cyclops')) {
    return {
      category: 'camp',
      icon: 'camp',
      title: 'Cyclops Camp',
      subtitle: CAMP_SIDE[id] || 'Cyclops jungle camp',
      helpTipKeys: ['Infamy.1.Description', 'CyclopsEye.Description', 'CyclopsWard.Description'],
    };
  }
  if (id.startsWith('Scorpion')) {
    return {
      category: 'camp',
      icon: 'camp',
      title: 'Scorpion Camp',
      subtitle: CAMP_SIDE[id] || 'Scorpion jungle camp',
      helpTipKeys: ['Infamy.1.Description', 'Essence.1.Description', 'Naga.0.Description'],
    };
  }
  if (id.startsWith('Rogues')) {
    return {
      category: 'camp',
      icon: 'camp',
      title: 'Rogues Camp',
      subtitle: CAMP_SIDE[id] || 'Rogue harpies',
      helpTipKeys: ['Infamy.1.Description'],
      descriptionExtra: 'Small harpies camp for early gold and experience.',
    };
  }
  if (id === 'Oracles') {
    return {
      category: 'camp',
      icon: 'camp',
      title: 'Oracles Camp',
      subtitle: 'Center jungle · Vision reward',
      helpTipKeys: ['EyesOfTheJungle.Description'],
    };
  }
  if (id === 'Random') {
    return {
      category: 'camp',
      icon: 'camp',
      title: 'Random Buff Camp',
      subtitle: 'Center-west · Rotating buff',
      helpTipKeys: ['Infamy.1.Description'],
      descriptionExtra: 'Camp Infamy increases the power of the jungle buff it drops.',
    };
  }
  if (id === 'Gold') {
    return {
      category: 'objective',
      icon: 'objective',
      title: 'The Heliokrater',
      subtitle: 'Center · Day pickup objective',
      descriptionExtra: 'See blueprint tooltip for charge mechanics and Moonlight Oracle delivery.',
    };
  }
  if (id === 'Totem') {
    return {
      category: 'objective',
      icon: 'objective',
      title: 'Totem',
      subtitle: 'Mid · Cooldown objective',
      helpTipKeys: ['Totem.Description'],
    };
  }
  if (id === 'Ritual_Site') {
    return {
      category: 'objective',
      icon: 'objective',
      title: 'Ritual Site',
      subtitle: 'Night · Moonlight capture point',
      nightOnly: true,
    };
  }
  if (id.startsWith('Crystal')) {
    return {
      category: 'objective',
      icon: 'objective',
      title: 'Moonlight Crystal',
      subtitle: CRYSTAL_SIDE[id] || 'Shard pickup',
      nightOnly: true,
    };
  }
  return {
    category: 'camp',
    icon: 'camp',
    title: id.replace(/_/g, ' '),
    subtitle: 'Conquest objective',
  };
}

function defaultHit(w, h, category) {
  if (w > 0 && h > 0) return { w: Math.max(w, 44), h: Math.max(h, 44) };
  const sizes = { tower: 52, phoenix: 56, titan: 72, boss: 64, camp: 48, objective: 48 };
  const side = sizes[category] || 48;
  return { w: side, h: side };
}

function buildPoint(coord, variant) {
  const meta = metaFor(coord.id);
  const hit = defaultHit(coord.w, coord.h, meta.category);
  return {
    id: coord.id,
    x: coord.x,
    y: coord.y,
    w: hit.w,
    h: hit.h,
    category: meta.category,
    icon: meta.icon,
    title: meta.title,
    subtitle: meta.subtitle || '',
    helpTipKeys: meta.helpTipKeys || [],
    descriptionExtra: meta.descriptionExtra || '',
    nightOnly: Boolean(meta.nightOnly),
    variants: meta.nightOnly ? ['night'] : ['day', 'night'],
  };
}

const allDay = day.map((c) => buildPoint(c, 'day'));

// Night-only coords from Night SVG not in day
const nightSvg = fs.readFileSync(path.join(__dirname, '../app/data/Gamemodes/Conquest/NightConquest Map.svg'), 'utf8');
const nightAll = extractPois(nightSvg);
const nightOnly = nightAll.filter((p) => !dayIds.has(p.id)).map((c) => buildPoint(c, 'night'));

const file = `/**
 * Conquest map POIs — coords from Day/Night SVG maps under app/data/Gamemodes/Conquest/.
 * Regenerate coords: node scripts/generate-conquest-map-points.js
 */
export const CONQUEST_MAP_VIEWBOX = 1111;

export const CONQUEST_MAP_ASSETS = {
  day: require('./DayConquest Map.svg'),
  night: require('./NightConquest Map.svg'),
};

/** @typedef {'tower'|'phoenix'|'titan'|'boss'|'camp'|'objective'} ConquestPoiCategory */

/**
 * @typedef {Object} ConquestMapPoint
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {ConquestPoiCategory} category
 * @property {string} icon
 * @property {string} title
 * @property {string} subtitle
 * @property {string[]} helpTipKeys
 * @property {string} descriptionExtra
 * @property {boolean} [nightOnly]
 * @property {('day'|'night')[]} variants
 */

/** @type {ConquestMapPoint[]} */
export const CONQUEST_MAP_POINTS_DAY = ${JSON.stringify(allDay, null, 2)};

/** @type {ConquestMapPoint[]} */
export const CONQUEST_MAP_POINTS_NIGHT_ONLY = ${JSON.stringify(nightOnly, null, 2)};

/**
 * @param {'day'|'night'} variant
 * @returns {ConquestMapPoint[]}
 */
export function getConquestMapPoints(variant) {
  if (variant === 'night') {
    return [...CONQUEST_MAP_POINTS_DAY, ...CONQUEST_MAP_POINTS_NIGHT_ONLY];
  }
  return CONQUEST_MAP_POINTS_DAY;
}

export const CONQUEST_POI_CATEGORIES = [
  { key: 'tower', label: 'Towers' },
  { key: 'phoenix', label: 'Phoenixes' },
  { key: 'titan', label: 'Titans' },
  { key: 'boss', label: 'Bosses' },
  { key: 'camp', label: 'Camps' },
  { key: 'objective', label: 'Objectives' },
];
`;

fs.writeFileSync(OUT, file, 'utf8');
console.log('Wrote', OUT, '—', allDay.length, 'day POIs,', nightOnly.length, 'night-only');
