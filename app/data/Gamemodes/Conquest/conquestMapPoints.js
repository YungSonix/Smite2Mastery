/**
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
export const CONQUEST_MAP_POINTS_DAY = [
  {
    "id": "Order_Tower",
    "x": 878,
    "y": 635,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Order Duo Tower",
    "subtitle": "Outer · Duo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Tower-2",
    "x": 726,
    "y": 767,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Order Duo Tower",
    "subtitle": "Inner · Duo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Tower-3",
    "x": 505,
    "y": 601,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Order Mid Tower",
    "subtitle": "Outer · Mid lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Tower-4",
    "x": 531,
    "y": 715,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Order Mid Tower",
    "subtitle": "Inner · Mid lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Tower-5",
    "x": 174,
    "y": 670,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Order Solo Tower",
    "subtitle": "Outer · Solo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Tower-6",
    "x": 339,
    "y": 753,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Order Solo Tower",
    "subtitle": "Inner · Solo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Phoenix",
    "x": 635,
    "y": 875,
    "w": 56,
    "h": 56,
    "category": "phoenix",
    "icon": "phoenix",
    "title": "Order Duo Phoenix",
    "subtitle": "Duo lane · Order base",
    "helpTipKeys": [
      "Phoenix.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Phoenix-2",
    "x": 521,
    "y": 829,
    "w": 56,
    "h": 56,
    "category": "phoenix",
    "icon": "phoenix",
    "title": "Order Mid Phoenix",
    "subtitle": "Mid lane · Order base",
    "helpTipKeys": [
      "Phoenix.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Phoenix-3",
    "x": 409,
    "y": 875,
    "w": 56,
    "h": 56,
    "category": "phoenix",
    "icon": "phoenix",
    "title": "Order Solo Phoenix",
    "subtitle": "Solo lane · Order base",
    "helpTipKeys": [
      "Phoenix.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Order_Titan",
    "x": 518,
    "y": 962,
    "w": 72,
    "h": 88,
    "category": "titan",
    "icon": "titan",
    "title": "Order Titan",
    "subtitle": "Order base · Win condition",
    "helpTipKeys": [
      "Conquest.Role.Generic.Description"
    ],
    "descriptionExtra": "Destroy all enemy Towers and Phoenixes, then slay the Chaos Titan to win. Protect your Titan at all costs.",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Tower",
    "x": 878,
    "y": 377,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Chaos Duo Tower",
    "subtitle": "Outer · Duo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Tower-2",
    "x": 728,
    "y": 247,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Chaos Duo Tower",
    "subtitle": "Inner · Duo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Tower-3",
    "x": 504,
    "y": 413,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Chaos Mid Tower",
    "subtitle": "Outer · Mid lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Tower-4",
    "x": 532,
    "y": 302,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Chaos Mid Tower",
    "subtitle": "Inner · Mid lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Tower-5",
    "x": 174,
    "y": 351,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Chaos Solo Tower",
    "subtitle": "Outer · Solo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Tower-6",
    "x": 334,
    "y": 258,
    "w": 52,
    "h": 52,
    "category": "tower",
    "icon": "tower",
    "title": "Chaos Solo Tower",
    "subtitle": "Inner · Solo lane",
    "helpTipKeys": [
      "Conquest.Tower.TargetedByEnemyTower.Description",
      "TowerBounty.Reward.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Phoenix",
    "x": 635,
    "y": 142,
    "w": 56,
    "h": 56,
    "category": "phoenix",
    "icon": "phoenix",
    "title": "Chaos Duo Phoenix",
    "subtitle": "Duo lane · Chaos base",
    "helpTipKeys": [
      "Phoenix.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Phoenix-2",
    "x": 521,
    "y": 191,
    "w": 56,
    "h": 56,
    "category": "phoenix",
    "icon": "phoenix",
    "title": "Chaos Mid Phoenix",
    "subtitle": "Mid lane · Chaos base",
    "helpTipKeys": [
      "Phoenix.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Phoenix-3",
    "x": 410,
    "y": 143,
    "w": 56,
    "h": 56,
    "category": "phoenix",
    "icon": "phoenix",
    "title": "Chaos Solo Phoenix",
    "subtitle": "Solo lane · Chaos base",
    "helpTipKeys": [
      "Phoenix.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Chaos_Titan",
    "x": 510,
    "y": 64,
    "w": 89,
    "h": 75,
    "category": "titan",
    "icon": "titan",
    "title": "Chaos Titan",
    "subtitle": "Chaos base · Win condition",
    "helpTipKeys": [
      "Conquest.Role.Generic.Description"
    ],
    "descriptionExtra": "Destroy all enemy Towers and Phoenixes, then slay the Order Titan to win. Protect your Titan at all costs.",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Rogues",
    "x": 998,
    "y": 524,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Rogues Camp",
    "subtitle": "Order jungle · East",
    "helpTipKeys": [
      "Infamy.1.Description"
    ],
    "descriptionExtra": "Small harpies camp for early gold and experience.",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Rogues-2",
    "x": 58,
    "y": 524,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Rogues Camp",
    "subtitle": "Chaos jungle · West",
    "helpTipKeys": [
      "Infamy.1.Description"
    ],
    "descriptionExtra": "Small harpies camp for early gold and experience.",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Oracles",
    "x": 414,
    "y": 518,
    "w": 60,
    "h": 65,
    "category": "camp",
    "icon": "camp",
    "title": "Oracles Camp",
    "subtitle": "Center jungle · Vision reward",
    "helpTipKeys": [
      "EyesOfTheJungle.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Random",
    "x": 228,
    "y": 523,
    "w": 66,
    "h": 65,
    "category": "camp",
    "icon": "camp",
    "title": "Random Buff Camp",
    "subtitle": "Center-west · Rotating buff",
    "helpTipKeys": [
      "Infamy.1.Description"
    ],
    "descriptionExtra": "Camp Infamy increases the power of the jungle buff it drops.",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Totem",
    "x": 861,
    "y": 520,
    "w": 68,
    "h": 71,
    "category": "objective",
    "icon": "objective",
    "title": "Totem",
    "subtitle": "Mid · Cooldown objective",
    "helpTipKeys": [
      "Totem.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Gold",
    "x": 475,
    "y": 538,
    "w": 53,
    "h": 58,
    "category": "objective",
    "icon": "objective",
    "title": "The Heliokrater",
    "subtitle": "Center · Day pickup objective",
    "helpTipKeys": [],
    "descriptionExtra": "See blueprint tooltip for charge mechanics and Moonlight Oracle delivery.",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Fire_Giant",
    "x": 739,
    "y": 532,
    "w": 81,
    "h": 73,
    "category": "boss",
    "icon": "fireGiant",
    "title": "Fire Giant",
    "subtitle": "Late-game jungle boss",
    "helpTipKeys": [
      "FireGiant.1.Description",
      "FireGiant.2.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Gold_Fury",
    "x": 336,
    "y": 515,
    "w": 60,
    "h": 79,
    "category": "boss",
    "icon": "goldFury",
    "title": "Gold Fury",
    "subtitle": "Ancient Fury · Duo jungle",
    "helpTipKeys": [
      "GoldFury.Reward.Description",
      "GoldFury.Reward.StatBuff.NoFormatting",
      "GoldFury.1.Description",
      "GoldFury.2.Description",
      "GoldFury.3.Description",
      "GoldFury.4.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Pyromancer",
    "x": 620,
    "y": 523,
    "w": 70,
    "h": 62,
    "category": "boss",
    "icon": "boss",
    "title": "Pyromancer",
    "subtitle": "Mid jungle boss",
    "helpTipKeys": [],
    "descriptionExtra": "Mid-map boss that grants gold and experience. Contest early to accelerate your team’s power spike.",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Trinket",
    "x": 682,
    "y": 750,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Trinket Camp",
    "subtitle": "Order side · Trinket camp",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Trinkets.1.Description",
      "Trinkets.2.Description",
      "Trinkets.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Trinket-2",
    "x": 686,
    "y": 307,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Trinket Camp",
    "subtitle": "Chaos side · Trinket camp",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Trinkets.1.Description",
      "Trinkets.2.Description",
      "Trinkets.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Trinket-3",
    "x": 472,
    "y": 739,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Trinket Camp",
    "subtitle": "Order side · Mid jungle",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Trinkets.1.Description",
      "Trinkets.2.Description",
      "Trinkets.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Trinket-4",
    "x": 474,
    "y": 315,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Trinket Camp",
    "subtitle": "Chaos side · Mid jungle",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Trinkets.1.Description",
      "Trinkets.2.Description",
      "Trinkets.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Trinket-5",
    "x": 329,
    "y": 674,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Trinket Camp",
    "subtitle": "Order side · Solo jungle",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Trinkets.1.Description",
      "Trinkets.2.Description",
      "Trinkets.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Trinket-6",
    "x": 331,
    "y": 379,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Trinket Camp",
    "subtitle": "Chaos side · Solo jungle",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Trinkets.1.Description",
      "Trinkets.2.Description",
      "Trinkets.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Cyclops",
    "x": 571,
    "y": 636,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Cyclops Camp",
    "subtitle": "Order side · Cyclops camp",
    "helpTipKeys": [
      "Infamy.1.Description",
      "CyclopsEye.Description",
      "CyclopsWard.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Cyclops-2",
    "x": 571,
    "y": 409,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Cyclops Camp",
    "subtitle": "Chaos side · Cyclops camp",
    "helpTipKeys": [
      "Infamy.1.Description",
      "CyclopsEye.Description",
      "CyclopsWard.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Cyclops-3",
    "x": 407,
    "y": 618,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Cyclops Camp",
    "subtitle": "Order side · Duo jungle",
    "helpTipKeys": [
      "Infamy.1.Description",
      "CyclopsEye.Description",
      "CyclopsWard.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Cyclops-4",
    "x": 407,
    "y": 343,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Cyclops Camp",
    "subtitle": "Chaos side · Duo jungle",
    "helpTipKeys": [
      "Infamy.1.Description",
      "CyclopsEye.Description",
      "CyclopsWard.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Scorpion",
    "x": 584,
    "y": 715,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Scorpion Camp",
    "subtitle": "Order side · Scorpion camp",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Essence.1.Description",
      "Naga.0.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Scorpion-2",
    "x": 588,
    "y": 306,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "camp",
    "title": "Scorpion Camp",
    "subtitle": "Chaos side · Scorpion camp",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Essence.1.Description",
      "Naga.0.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Blue",
    "x": 809,
    "y": 637,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "primal",
    "title": "Blue Buff Camp",
    "subtitle": "Order side · Blue buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Primal.1.Description",
      "Primal.2.Description",
      "Primal.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Blue-2",
    "x": 809,
    "y": 410,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "primal",
    "title": "Blue Buff Camp",
    "subtitle": "Chaos side · Blue buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Primal.1.Description",
      "Primal.2.Description",
      "Primal.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Speed",
    "x": 402,
    "y": 701,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "pathfinder",
    "title": "Speed Buff Camp",
    "subtitle": "Order side · Speed buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Pathfinder.1.Description",
      "Pathfinder.2.Description",
      "Pathfinder.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Speed-2",
    "x": 396,
    "y": 424,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "pathfinder",
    "title": "Speed Buff Camp",
    "subtitle": "Chaos side · Speed buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Pathfinder.1.Description",
      "Pathfinder.2.Description",
      "Pathfinder.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Purple",
    "x": 236,
    "y": 637,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "inspiration",
    "title": "Purple Buff Camp",
    "subtitle": "Order side · Purple buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "InspirationV2.1.Description",
      "InspirationV2.2.Description",
      "InspirationV2.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Purple-2",
    "x": 237,
    "y": 409,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "inspiration",
    "title": "Purple Buff Camp",
    "subtitle": "Chaos side · Purple buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "InspirationV2.1.Description",
      "InspirationV2.2.Description",
      "InspirationV2.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Red",
    "x": 658,
    "y": 628,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "blight",
    "title": "Red Buff Camp",
    "subtitle": "Order side · Red buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Blight.1.Description",
      "Blight.2.Description",
      "Blight.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  },
  {
    "id": "Red-2",
    "x": 663,
    "y": 417,
    "w": 48,
    "h": 48,
    "category": "camp",
    "icon": "blight",
    "title": "Red Buff Camp",
    "subtitle": "Chaos side · Red buff",
    "helpTipKeys": [
      "Infamy.1.Description",
      "Blight.1.Description",
      "Blight.2.Description",
      "Blight.3.Description"
    ],
    "descriptionExtra": "",
    "nightOnly": false,
    "variants": [
      "day",
      "night"
    ]
  }
];

/** @type {ConquestMapPoint[]} */
export const CONQUEST_MAP_POINTS_NIGHT_ONLY = [
  {
    "id": "Crystal",
    "x": 964,
    "y": 535,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "East jungle",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Crystal-2",
    "x": 709,
    "y": 535,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "Order red buff side",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Crystal-3",
    "x": 614,
    "y": 601,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "Order mid jungle",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Crystal-4",
    "x": 627,
    "y": 417,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "Chaos mid jungle",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Crystal-5",
    "x": 482,
    "y": 514,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "Center · Ritual approach",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Crystal-6",
    "x": 344,
    "y": 617,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "Order solo side",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Crystal-7",
    "x": 345,
    "y": 449,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "Chaos solo side",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Crystal-8",
    "x": 108,
    "y": 532,
    "w": 48,
    "h": 48,
    "category": "objective",
    "icon": "objective",
    "title": "Moonlight Crystal",
    "subtitle": "West jungle",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Ritual_Site",
    "x": 549,
    "y": 520,
    "w": 65,
    "h": 60,
    "category": "objective",
    "icon": "objective",
    "title": "Ritual Site",
    "subtitle": "Night · Moonlight capture point",
    "helpTipKeys": [],
    "descriptionExtra": "",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  },
  {
    "id": "Moonlight_Queen",
    "x": 750,
    "y": 491,
    "w": 60,
    "h": 60,
    "category": "boss",
    "icon": "boss",
    "title": "Moonlight Queen",
    "subtitle": "Night phase · Naga boss",
    "helpTipKeys": [],
    "descriptionExtra": "Spawns during Moonlight phases. Defeating her drops Moonlight Shards for your team. Shard totals decide phase winners and lane pusher rewards.",
    "nightOnly": true,
    "variants": [
      "night"
    ]
  }
];

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
