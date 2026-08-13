/**
 * Extract embedded PNG sprites from Conquest SVG maps and generate sprite registry.
 * Usage: node scripts/extract-conquest-svg-sprites.js
 */
const fs = require('fs');
const path = require('path');

const DAY = path.join(__dirname, '../app/data/Gamemodes/Conquest/DayConquest Map.svg');
const NIGHT = path.join(__dirname, '../app/data/Gamemodes/Conquest/NightConquest Map.svg');
const SPRITES_DIR = path.join(__dirname, '../app/data/Gamemodes/Conquest/MapSprites');
const OUT = path.join(__dirname, '../app/data/Gamemodes/Conquest/conquestMapSvgSprites.js');

function parseAttrs(tag) {
  const attrs = {};
  const re = /(\w[\w:-]*)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tag))) attrs[m[1]] = m[2];
  return attrs;
}

function extractEmbeddedImages(svgText) {
  const images = {};
  const tagRe = /<image\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(svgText))) {
    const tag = m[0];
    const attrs = parseAttrs(tag);
    const id = attrs.id;
    const href = attrs['xlink:href'] || attrs.href;
    if (!id || !href || !href.startsWith('data:img/png;base64,')) continue;
    images[id] = {
      w: Number(attrs.width || 0),
      h: Number(attrs.height || 0),
      b64: href.replace('data:img/png;base64,', ''),
    };
  }
  return images;
}

function extractPoiSprites(svgText, imageDefs) {
  const pois = {};
  const tagRe = /<(use|image)\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(svgText))) {
    const tag = m[0];
    const attrs = parseAttrs(tag);
    const id = attrs.id;
    if (!id || id === 'Map' || id === 'Order_Structures') continue;
    if (id.startsWith('image')) continue;

    const href = attrs['xlink:href'] || attrs.href;
    if (tag.startsWith('<use')) {
      const ref = (href || '').replace('#', '');
      const def = imageDefs[ref];
      if (!def) continue;
      pois[id] = { spriteKey: ref, w: def.w, h: def.h };
    } else {
      pois[id] = { spriteKey: id, w: Number(attrs.width || 0), h: Number(attrs.height || 0) };
    }
  }
  return pois;
}

function safeFilename(key) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_') + '.png';
}

function main() {
  const dayText = fs.readFileSync(DAY, 'utf8');
  const nightText = fs.readFileSync(NIGHT, 'utf8');

  const dayImages = extractEmbeddedImages(dayText);
  const nightImages = extractEmbeddedImages(nightText);

  const allKeys = new Set([...Object.keys(dayImages), ...Object.keys(nightImages)]);
  fs.mkdirSync(SPRITES_DIR, { recursive: true });

  const written = {};
  for (const key of [...allKeys].sort()) {
    const src = dayImages[key] || nightImages[key];
    const fileName = safeFilename(key);
    const outPath = path.join(SPRITES_DIR, fileName);
    fs.writeFileSync(outPath, Buffer.from(src.b64, 'base64'));
    written[key] = { fileName, w: src.w, h: src.h };
  }

  const dayPois = extractPoiSprites(dayText, dayImages);
  const nightPois = extractPoiSprites(nightText, nightImages);
  const poiIds = new Set([...Object.keys(dayPois), ...Object.keys(nightPois)]);

  const poiMap = {};
  for (const id of [...poiIds].sort()) {
    const entry = dayPois[id] || nightPois[id];
    poiMap[id] = entry;
  }

  const requireLines = Object.entries(written)
    .map(([key, { fileName }]) => `  '${key}': require('./MapSprites/${fileName}'),`)
    .join('\n');

  const file = `/**
 * Conquest map POI sprites — extracted from Day/Night SVG embedded PNGs.
 * Regenerate: node scripts/extract-conquest-svg-sprites.js
 */

/** @type {Record<string, number>} */
export const CONQUEST_SPRITE_SIZES = ${JSON.stringify(
    Object.fromEntries(Object.entries(written).map(([k, v]) => [k, { w: v.w, h: v.h }])),
    null,
    2
  )};

/** @type {Record<string, import('react-native').ImageSourcePropType>} */
export const CONQUEST_SVG_SPRITES = {
${requireLines}
};

/** POI id → sprite def key from SVG \`<use>\` / inline \`<image>\` */
export const CONQUEST_POI_SPRITE_KEYS = ${JSON.stringify(poiMap, null, 2)};

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
`;

  fs.writeFileSync(OUT, file, 'utf8');
  console.log('Wrote', Object.keys(written).length, 'sprites to', SPRITES_DIR);
  console.log('Wrote', OUT, '—', Object.keys(poiMap).length, 'POI sprite mappings');
}

main();
