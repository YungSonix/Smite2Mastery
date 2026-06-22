#!/usr/bin/env node
/**
 * Remove duplicate variant rows that share the same loadout screenshot.
 * Keeps the richer row (cardArt, non-generic prism label, newer extractedAt).
 *
 *   node scripts/dedupe-skin-variant-loadouts.js [--write] [--pantheon=Norse.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { SKINS_DIR, PROJECT_ROOT } = require('../config/dataPaths');

function variantShot(v) {
  return v?.loadout?.screenshot || v?.loadoutMeta?.screenshot || '';
}

function isGenericPrismName(name) {
  return /^prism\s*p?\d+$/i.test(String(name || '').trim());
}

function scoreVariant(v) {
  let s = 0;
  if (v.cardArt || v.assets?.cardArt) s += 8;
  if (v.icon || v.assets?.icon) s += 4;
  if (!isGenericPrismName(v.name)) s += 4;
  const at = v.loadoutMeta?.extractedAt || '';
  if (at >= '2026-06-22') s += 2;
  if (v.loadout?.screenshot) s += 1;
  return s;
}

function dedupeGod(god, log) {
  let removed = 0;
  for (const skin of god.skins || []) {
    const variants = skin.variants;
    if (!Array.isArray(variants) || variants.length < 2) continue;

    const groups = new Map();
    for (const v of variants) {
      const shot = variantShot(v);
      const key = shot || `__no_shot__:${String(v.name || '').toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(v);
    }

    const kept = [];
    for (const [key, group] of groups) {
      if (group.length === 1) {
        kept.push(group[0]);
        continue;
      }
      group.sort((a, b) => scoreVariant(b) - scoreVariant(a));
      kept.push(group[0]);
      for (let i = 1; i < group.length; i += 1) {
        removed += 1;
        log.push(
          `  - ${god.godName} / ${skin.skinName}: dropped duplicate "${group[i].name}" (${key.includes('__no_shot__') ? 'no shot' : path.basename(key)})`
        );
      }
    }

    if (removed) skin.variants = kept;
  }
  return removed;
}

function main() {
  const write = process.argv.includes('--write');
  const pantheonArg = process.argv.find((a) => a.startsWith('--pantheon='));
  const pantheonFile = pantheonArg ? pantheonArg.slice('--pantheon='.length) : 'Norse.json';
  const filePath = path.join(SKINS_DIR, pantheonFile);

  if (!fs.existsSync(filePath)) {
    console.error(`Missing ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const log = [];
  let total = 0;

  for (const god of data.gods || []) {
    total += dedupeGod(god, log);
  }

  console.log(`[dedupe] ${pantheonFile}: ${total} duplicate variant row(s) would remove`);
  for (const line of log) console.log(line);

  if (write && total > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${filePath}`);
  } else if (!write && total > 0) {
    console.log('Dry run — pass --write to apply');
  }
}

main();
