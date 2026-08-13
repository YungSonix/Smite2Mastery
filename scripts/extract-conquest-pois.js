/**
 * One-off: extract POI positions from Day/Night Conquest SVG maps.
 * Usage: node scripts/extract-conquest-pois.js
 */
const fs = require('fs');
const path = require('path');

const DAY = path.join(__dirname, '../app/data/Gamemodes/Conquest/DayConquest Map.svg');
const NIGHT = path.join(__dirname, '../app/data/Gamemodes/Conquest/NightConquest Map.svg');

function extractPois(svgText) {
  const pois = [];
  const tagRe = /<(use|image)\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(svgText))) {
    const tag = m[0];
    const id = /id="([^"]+)"/.exec(tag)?.[1];
    if (!id || id.startsWith('image') || id === 'Map' || id === 'Order_Structures') continue;
    const x = Number(/x="(\d+)"/.exec(tag)?.[1] || 0);
    const y = Number(/y="(\d+)"/.exec(tag)?.[1] || 0);
    const w = Number(/width="(\d+)"/.exec(tag)?.[1] || 0);
    const h = Number(/height="(\d+)"/.exec(tag)?.[1] || 0);
    pois.push({ id, x, y, w, h });
  }
  return pois;
}

const day = extractPois(fs.readFileSync(DAY, 'utf8'));
const night = extractPois(fs.readFileSync(NIGHT, 'utf8'));
const nightIds = new Set(night.map((p) => p.id));
const dayIds = new Set(day.map((p) => p.id));

console.log('Day POIs:', day.length);
console.log('Night POIs:', night.length);
console.log('Night-only:', [...nightIds].filter((id) => !dayIds.has(id)));
console.log(JSON.stringify({ day, nightOnly: night.filter((p) => !dayIds.has(p.id)) }, null, 2));
