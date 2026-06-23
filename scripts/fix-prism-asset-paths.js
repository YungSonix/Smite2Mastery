#!/usr/bin/env node
/**
 * Point variant asset paths at flattened Skins/Prisms (or Prisims) folders when files moved on disk.
 *
 *   node scripts/fix-prism-asset-paths.js
 *   node scripts/fix-prism-asset-paths.js --write
 */
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, SKINS_DIR } = require('../config/dataPaths');

const write = process.argv.includes('--write');
const ASSET_KEYS = ['skin', 'cardArt', 'card_art', 'icon', 'inGame', 'in_game'];

function fileExists(repoPath) {
  const normalized = String(repoPath).replace(/\\/g, '/').replace(/^\/+/, '');
  const full = path.join(PROJECT_ROOT, normalized);
  if (fs.existsSync(full)) return true;
  if (/\.png$/i.test(normalized)) {
    return fs.existsSync(path.join(PROJECT_ROOT, normalized.replace(/\.png$/i, '.json')));
  }
  return false;
}

function tryResolvePath(repoPath) {
  if (!repoPath) return repoPath;
  const normalized = String(repoPath).replace(/\\/g, '/').replace(/^\/+/, '');
  if (fileExists(normalized)) return normalized;

  const flat = normalized.match(
    /^(app\/data\/NewGodSkins\/([^/]+)\/)Skins\/[^/]+\/(?:Prisms|Prisims)\/(.+)$/i
  );
  if (flat) {
    for (const folder of ['Prisms', 'Prisims']) {
      const candidate = `${flat[1]}Skins/${folder}/${flat[3]}`;
      if (fileExists(candidate)) return candidate;
    }
  }
  return normalized;
}

function patchObject(obj, stats) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach((item) => patchObject(item, stats));
    return;
  }
  for (const key of ASSET_KEYS) {
    if (typeof obj[key] === 'string') {
      const next = tryResolvePath(obj[key]);
      if (next !== obj[key]) {
        stats.changes.push({ from: obj[key], to: next });
        if (write) obj[key] = next;
      }
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') patchObject(value, stats);
  }
}

const files = fs.readdirSync(SKINS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
let total = 0;
for (const file of files) {
  const filePath = path.join(SKINS_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const stats = { changes: [] };
  patchObject(data, stats);
  if (stats.changes.length) {
    console.log(`\n${file}: ${stats.changes.length} path(s)`);
    for (const c of stats.changes.slice(0, 6)) {
      console.log(`  ${c.from}\n  → ${c.to}`);
    }
    if (stats.changes.length > 6) console.log(`  … +${stats.changes.length - 6} more`);
    total += stats.changes.length;
    if (write) fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
}

console.log(`\n${write ? 'Updated' : 'Would update'} ${total} path(s).${write ? '' : ' Pass --write to save.'}`);
