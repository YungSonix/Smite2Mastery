/**
 * Conquest map POI sprites — extracted from Day/Night SVG embedded PNGs.
 * Regenerate: node scripts/extract-conquest-svg-sprites.js
 */

/** @type {Record<string, number>} */
export const CONQUEST_SPRITE_SIZES = {
  "Chaos_Titan": {
    "w": 89,
    "h": 75
  },
  "Fire_Giant": {
    "w": 81,
    "h": 73
  },
  "Gold": {
    "w": 53,
    "h": 58
  },
  "Gold_Fury": {
    "w": 60,
    "h": 79
  },
  "Map": {
    "w": 1024,
    "h": 1013
  },
  "Moonlight_Queen": {
    "w": 60,
    "h": 60
  },
  "Oracles": {
    "w": 60,
    "h": 65
  },
  "Order_Titan": {
    "w": 72,
    "h": 88
  },
  "Pyromancer": {
    "w": 70,
    "h": 62
  },
  "Random": {
    "w": 66,
    "h": 65
  },
  "Ritual_Site": {
    "w": 65,
    "h": 60
  },
  "Totem": {
    "w": 68,
    "h": 71
  },
  "image": {
    "w": 62,
    "h": 88
  },
  "image-10": {
    "w": 75,
    "h": 69
  },
  "image-11": {
    "w": 68,
    "h": 73
  },
  "image-12": {
    "w": 63,
    "h": 71
  },
  "image-13": {
    "w": 40,
    "h": 49
  },
  "image-2": {
    "w": 66,
    "h": 91
  },
  "image-3": {
    "w": 62,
    "h": 88
  },
  "image-4": {
    "w": 66,
    "h": 91
  },
  "image-5": {
    "w": 58,
    "h": 62
  },
  "image-6": {
    "w": 49,
    "h": 60
  },
  "image-7": {
    "w": 56,
    "h": 69
  },
  "image-8": {
    "w": 67,
    "h": 73
  },
  "image-9": {
    "w": 68,
    "h": 66
  }
};

/** @type {Record<string, import('react-native').ImageSourcePropType>} */
export const CONQUEST_SVG_SPRITES = {
  'Chaos_Titan': require('./MapSprites/Chaos_Titan.png'),
  'Fire_Giant': require('./MapSprites/Fire_Giant.png'),
  'Gold': require('./MapSprites/Gold.png'),
  'Gold_Fury': require('./MapSprites/Gold_Fury.png'),
  'Map': require('./MapSprites/Map.png'),
  'Moonlight_Queen': require('./MapSprites/Moonlight_Queen.png'),
  'Oracles': require('./MapSprites/Oracles.png'),
  'Order_Titan': require('./MapSprites/Order_Titan.png'),
  'Pyromancer': require('./MapSprites/Pyromancer.png'),
  'Random': require('./MapSprites/Random.png'),
  'Ritual_Site': require('./MapSprites/Ritual_Site.png'),
  'Totem': require('./MapSprites/Totem.png'),
  'image': require('./MapSprites/image.png'),
  'image-10': require('./MapSprites/image-10.png'),
  'image-11': require('./MapSprites/image-11.png'),
  'image-12': require('./MapSprites/image-12.png'),
  'image-13': require('./MapSprites/image-13.png'),
  'image-2': require('./MapSprites/image-2.png'),
  'image-3': require('./MapSprites/image-3.png'),
  'image-4': require('./MapSprites/image-4.png'),
  'image-5': require('./MapSprites/image-5.png'),
  'image-6': require('./MapSprites/image-6.png'),
  'image-7': require('./MapSprites/image-7.png'),
  'image-8': require('./MapSprites/image-8.png'),
  'image-9': require('./MapSprites/image-9.png'),
};

/** POI id → sprite def key from SVG `<use>` / inline `<image>` */
export const CONQUEST_POI_SPRITE_KEYS = {
  "Blue": {
    "spriteKey": "image-9",
    "w": 68,
    "h": 66
  },
  "Blue-2": {
    "spriteKey": "image-9",
    "w": 68,
    "h": 66
  },
  "Chaos_Phoenix": {
    "spriteKey": "image-4",
    "w": 66,
    "h": 91
  },
  "Chaos_Phoenix-2": {
    "spriteKey": "image-4",
    "w": 66,
    "h": 91
  },
  "Chaos_Phoenix-3": {
    "spriteKey": "image-4",
    "w": 66,
    "h": 91
  },
  "Chaos_Titan": {
    "spriteKey": "Chaos_Titan",
    "w": 89,
    "h": 75
  },
  "Chaos_Tower": {
    "spriteKey": "image-3",
    "w": 62,
    "h": 88
  },
  "Chaos_Tower-2": {
    "spriteKey": "image-3",
    "w": 62,
    "h": 88
  },
  "Chaos_Tower-3": {
    "spriteKey": "image-3",
    "w": 62,
    "h": 88
  },
  "Chaos_Tower-4": {
    "spriteKey": "image-3",
    "w": 62,
    "h": 88
  },
  "Chaos_Tower-5": {
    "spriteKey": "image-3",
    "w": 62,
    "h": 88
  },
  "Chaos_Tower-6": {
    "spriteKey": "image-3",
    "w": 62,
    "h": 88
  },
  "Crystal": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Crystal-2": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Crystal-3": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Crystal-4": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Crystal-5": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Crystal-6": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Crystal-7": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Crystal-8": {
    "spriteKey": "image-13",
    "w": 40,
    "h": 49
  },
  "Cyclops": {
    "spriteKey": "image-7",
    "w": 56,
    "h": 69
  },
  "Cyclops-2": {
    "spriteKey": "image-7",
    "w": 56,
    "h": 69
  },
  "Cyclops-3": {
    "spriteKey": "image-7",
    "w": 56,
    "h": 69
  },
  "Cyclops-4": {
    "spriteKey": "image-7",
    "w": 56,
    "h": 69
  },
  "Fire_Giant": {
    "spriteKey": "Fire_Giant",
    "w": 81,
    "h": 73
  },
  "Gold": {
    "spriteKey": "Gold",
    "w": 53,
    "h": 58
  },
  "Gold_Fury": {
    "spriteKey": "Gold_Fury",
    "w": 60,
    "h": 79
  },
  "Moonlight_Queen": {
    "spriteKey": "Moonlight_Queen",
    "w": 60,
    "h": 60
  },
  "Oracles": {
    "spriteKey": "Oracles",
    "w": 60,
    "h": 65
  },
  "Order_Phoenix": {
    "spriteKey": "image-2",
    "w": 66,
    "h": 91
  },
  "Order_Phoenix-2": {
    "spriteKey": "image-2",
    "w": 66,
    "h": 91
  },
  "Order_Phoenix-3": {
    "spriteKey": "image-2",
    "w": 66,
    "h": 91
  },
  "Order_Titan": {
    "spriteKey": "Order_Titan",
    "w": 72,
    "h": 88
  },
  "Order_Tower": {
    "spriteKey": "image",
    "w": 62,
    "h": 88
  },
  "Order_Tower-2": {
    "spriteKey": "image",
    "w": 62,
    "h": 88
  },
  "Order_Tower-3": {
    "spriteKey": "image",
    "w": 62,
    "h": 88
  },
  "Order_Tower-4": {
    "spriteKey": "image",
    "w": 62,
    "h": 88
  },
  "Order_Tower-5": {
    "spriteKey": "image",
    "w": 62,
    "h": 88
  },
  "Order_Tower-6": {
    "spriteKey": "image",
    "w": 62,
    "h": 88
  },
  "Purple": {
    "spriteKey": "image-11",
    "w": 68,
    "h": 73
  },
  "Purple-2": {
    "spriteKey": "image-11",
    "w": 68,
    "h": 73
  },
  "Pyromancer": {
    "spriteKey": "Pyromancer",
    "w": 70,
    "h": 62
  },
  "Random": {
    "spriteKey": "Random",
    "w": 66,
    "h": 65
  },
  "Red": {
    "spriteKey": "image-12",
    "w": 63,
    "h": 71
  },
  "Red-2": {
    "spriteKey": "image-12",
    "w": 63,
    "h": 71
  },
  "Ritual_Site": {
    "spriteKey": "Ritual_Site",
    "w": 65,
    "h": 60
  },
  "Rogues": {
    "spriteKey": "image-5",
    "w": 58,
    "h": 62
  },
  "Rogues-2": {
    "spriteKey": "image-5",
    "w": 58,
    "h": 62
  },
  "Scorpion": {
    "spriteKey": "image-8",
    "w": 67,
    "h": 73
  },
  "Scorpion-2": {
    "spriteKey": "image-8",
    "w": 67,
    "h": 73
  },
  "Speed": {
    "spriteKey": "image-10",
    "w": 75,
    "h": 69
  },
  "Speed-2": {
    "spriteKey": "image-10",
    "w": 75,
    "h": 69
  },
  "Totem": {
    "spriteKey": "Totem",
    "w": 68,
    "h": 71
  },
  "Trinket": {
    "spriteKey": "image-6",
    "w": 49,
    "h": 60
  },
  "Trinket-2": {
    "spriteKey": "image-6",
    "w": 49,
    "h": 60
  },
  "Trinket-3": {
    "spriteKey": "image-6",
    "w": 49,
    "h": 60
  },
  "Trinket-4": {
    "spriteKey": "image-6",
    "w": 49,
    "h": 60
  },
  "Trinket-5": {
    "spriteKey": "image-6",
    "w": 49,
    "h": 60
  },
  "Trinket-6": {
    "spriteKey": "image-6",
    "w": 49,
    "h": 60
  }
};

/**
 * @param {string} poiId
 * @returns {import('react-native').ImageSourcePropType | null}
 */
export function getConquestPoiSpriteSource(poiId) {
  const entry = CONQUEST_POI_SPRITE_KEYS[poiId];
  if (!entry?.spriteKey) return null;
  return CONQUEST_SVG_SPRITES[entry.spriteKey] || null;
}

/**
 * @param {string} poiId
 * @returns {{ w: number, h: number } | null}
 */
export function getConquestPoiSpriteSize(poiId) {
  const entry = CONQUEST_POI_SPRITE_KEYS[poiId];
  if (!entry?.spriteKey) return null;
  const size = CONQUEST_SPRITE_SIZES[entry.spriteKey];
  if (size?.w && size?.h) return size;
  if (entry.w && entry.h) return { w: entry.w, h: entry.h };
  return null;
}
