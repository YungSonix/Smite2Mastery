#!/usr/bin/env node
/**
 * Validate Minigames god-emoji-guess clue engine.
 * Fails on undefined tokens, missing icon files, and easy≈hard permutations within a set.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLUES = path.join(ROOT, 'app/data/Minigames/god-emoji-guess/emoji-clues.json');
const ASSETS = path.join(ROOT, 'app/data/Minigames/god-emoji-guess/clue-assets.json');
const ICONS = path.join(ROOT, 'app/data/Minigames/god-emoji-guess/icons');

const clues = JSON.parse(fs.readFileSync(CLUES, 'utf8'));
const assets = JSON.parse(fs.readFileSync(ASSETS, 'utf8'));

const errors = [];
const warnings = [];

function sortedKey(arr) {
  return [...arr].map(String).sort().join('|');
}

function resolveGlyph(token) {
  const a = assets[token];
  if (!a) return null;
  if (a.kind === 'emoji') return a.glyph;
  if (a.kind === 'icon') return `icon:${a.file || token}`;
  return `${a.kind}:${token}`;
}

const glyphOwners = new Map();
for (const [token, a] of Object.entries(assets)) {
  const g = resolveGlyph(token);
  if (!g) continue;
  if (!glyphOwners.has(g)) glyphOwners.set(g, []);
  glyphOwners.get(g).push(token);
}
for (const [g, tokens] of glyphOwners) {
  if (tokens.length > 1 && String(g).startsWith('icon:') === false) {
    // emoji glyph collisions are real problems; icon files are unique by path
    if (!String(g).startsWith('icon:')) {
      warnings.push(`Duplicate glyph ${g} shared by tokens: ${tokens.join(', ')}`);
    }
  }
}

for (const [god, row] of Object.entries(clues)) {
  if (!Array.isArray(row.sets) || row.sets.length < 1) {
    errors.push(`${god}: missing sets[]`);
    continue;
  }
  if (row.sets.length !== 1) {
    warnings.push(`${god}: gamemode expects 1 set (A easy/hard); got ${row.sets.length}`);
  }
  row.sets.forEach((set, i) => {
    for (const tier of ['easy', 'hard']) {
      const list = set[tier];
      if (!Array.isArray(list) || list.length !== 3) {
        errors.push(`${god} set${i}.${tier}: need exactly 3 tokens`);
        continue;
      }
      for (const t of list) {
        const a = assets[t];
        if (!a) {
          errors.push(`${god} set${i}.${tier}: undefined token "${t}"`);
          continue;
        }
        if (a.kind === 'icon' && a.file) {
          const abs = path.join(ICONS, a.file);
          if (!fs.existsSync(abs)) {
            errors.push(`${god}: missing icon file icons/${a.file} for token ${t}`);
          }
        }
      }
    }
    if (set.easy && set.hard && sortedKey(set.easy) === sortedKey(set.hard)) {
      errors.push(`${god} set${i}: hard is a permutation of easy`);
    }
  });
}

if (warnings.length) {
  console.warn('Warnings:\n' + warnings.map((w) => `  - ${w}`).join('\n'));
}
if (errors.length) {
  console.error('Errors:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`OK: ${Object.keys(clues).length} gods, ${Object.keys(assets).length} assets`);
