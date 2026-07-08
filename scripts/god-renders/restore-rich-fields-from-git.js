#!/usr/bin/env node
/**
 * Restore god-render rich fields stripped from pantheon JSON.
 * Merges from last committed git version by godName + skinKey (+ variant name).
 *
 * Restores: information, unlock, type, isCrossGen, loadoutMeta extras.
 * Keeps current assets/cost/loadout from the working tree unless missing.
 *
 *   node scripts/god-renders/restore-rich-fields-from-git.js
 *   node scripts/god-renders/restore-rich-fields-from-git.js --write
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { SKINS_DIR } = require('../../config/dataPaths');

const WRITE = process.argv.includes('--write');

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function pantheonFiles() {
  return fs
    .readdirSync(SKINS_DIR)
    .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
    .sort((a, b) => a.localeCompare(b));
}

function readHeadPantheon(file) {
  const rel = path.join('app', 'data', 'God Information', 'Skins', file).replace(/\\/g, '/');
  try {
    const raw = execFileSync('git', ['show', `HEAD:${rel}`], { encoding: 'utf8' });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findGod(data, godName) {
  const key = normalizeKey(godName);
  return (data?.gods || []).find((god) => normalizeKey(god.godName) === key) || null;
}

function findSkin(god, skinKey, skinName) {
  const skins = god?.skins || [];
  const key = normalizeKey(skinKey);
  if (key) {
    const byKey = skins.find((skin) => normalizeKey(skin.skinKey) === key);
    if (byKey) return byKey;
  }
  const name = normalizeKey(skinName);
  if (name) {
    return skins.find((skin) => normalizeKey(skin.skinName) === name) || null;
  }
  return null;
}

function findVariant(skin, variantName) {
  const key = normalizeKey(variantName);
  return (skin?.variants || []).find((variant) => normalizeKey(variant.name) === key) || null;
}

function mergeLoadoutMeta(current, head) {
  if (!head?.loadoutMeta) return current?.loadoutMeta;
  const out = { ...(current?.loadoutMeta || {}), ...head.loadoutMeta };
  if (current?.loadoutMeta?.screenshot) out.screenshot = current.loadoutMeta.screenshot;
  if (current?.loadoutMeta?.screenshotTag) out.screenshotTag = current.loadoutMeta.screenshotTag;
  if (head.information?.length) out.information = head.information;
  return out;
}

function mergeEntry(current, head) {
  if (!current || !head) return false;
  let changed = false;

  if (head.information?.length) {
    current.information = head.information.map((row) => ({ ...row }));
    changed = true;
  }
  if (head.unlock) {
    current.unlock = { ...head.unlock };
    changed = true;
  }
  if (head.type && (!current.type || current.type === '—')) {
    current.type = head.type;
    changed = true;
  }
  if (head.isCrossGen) {
    current.isCrossGen = true;
    changed = true;
  }
  if (head.loadout && !current.loadout) {
    current.loadout = { ...head.loadout };
    changed = true;
  }

  const mergedMeta = mergeLoadoutMeta(current, head);
  if (mergedMeta && JSON.stringify(mergedMeta) !== JSON.stringify(current.loadoutMeta || null)) {
    current.loadoutMeta = mergedMeta;
    changed = true;
  }

  if (head.tierBadge && !current.tierBadge) {
    current.tierBadge = head.tierBadge;
    changed = true;
  }
  if (head.rarity && !current.rarity) {
    current.rarity = head.rarity;
    changed = true;
  }
  if (head.cost && !current.cost) {
    current.cost = { ...head.cost };
    changed = true;
  }

  return changed;
}

function mergeGod(currentGod, headGod, stats) {
  let changed = false;
  for (const skin of currentGod.skins || []) {
    const headSkin = findSkin(headGod, skin.skinKey, skin.skinName);
    if (mergeEntry(skin, headSkin)) {
      stats.skinRows += 1;
      changed = true;
    }
    for (const variant of skin.variants || []) {
      const headVariant = findVariant(headSkin, variant.name);
      if (mergeEntry(variant, headVariant)) {
        stats.variantRows += 1;
        changed = true;
      }
    }
  }
  return changed;
}

function main() {
  const stats = { files: 0, gods: 0, skinRows: 0, variantRows: 0, missingHead: 0 };
  const touched = [];

  for (const file of pantheonFiles()) {
    const filePath = path.join(SKINS_DIR, file);
    const current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const head = readHeadPantheon(file);
    if (!head) {
      stats.missingHead += 1;
      continue;
    }

    let fileChanged = false;
    for (const god of current.gods || []) {
      const headGod = findGod(head, god.godName);
      if (!headGod) continue;
      if (mergeGod(god, headGod, stats)) {
        stats.gods += 1;
        fileChanged = true;
      }
    }

    if (fileChanged) {
      stats.files += 1;
      touched.push(file);
      if (WRITE) fs.writeFileSync(filePath, JSON.stringify(current, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`${WRITE ? 'Restored' : 'Would restore'} rich god-render fields from git HEAD`);
  console.log(`  Files:           ${stats.files}`);
  console.log(`  Gods touched:    ${stats.gods}`);
  console.log(`  Skin rows:       ${stats.skinRows}`);
  console.log(`  Variant rows:    ${stats.variantRows}`);
  console.log(`  Missing HEAD:    ${stats.missingHead}`);
  if (touched.length) console.log(`  Pantheons:       ${touched.join(', ')}`);
  if (!WRITE) console.log('Dry run only — pass --write to apply.');
}

main();
