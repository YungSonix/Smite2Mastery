#!/usr/bin/env node
/**
 * Build searchable avatar catalog: badges, god portraits, skin icons.
 * Output: lib/classroomAvatars.generated.json
 *
 *   node scripts/gen-classroom-avatars-manifest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { badgeLabelFromFile } = require('../lib/classroomBadges.js');

const ASSETS_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets';
const BADGE_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/Badges';
const GOD_INFO_BASE = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Info';

function assetsUrl(repoPath) {
  const raw = String(repoPath || '').trim().replace(/^\/+/, '');
  const full = raw.startsWith('app/data/') ? raw : `app/data/${raw}`;
  return `${ASSETS_BASE}/${full.split('/').map(encodeURIComponent).join('/')}`;
}

function badgeUrl(file) {
  return `${BADGE_BASE}/${encodeURIComponent(file)}`;
}

function godFallbackUrl(godName) {
  const base = String(godName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!base) return null;
  return `${GOD_INFO_BASE}/${encodeURIComponent(`${base}Image.webp`)}`;
}

function normSearch(...parts) {
  return parts
    .flat()
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function skinDisplayName(skinName, variantName) {
  const base = String(skinName || '')
    .replace(/^Base\s+/i, '')
    .trim();
  if (variantName) return `${base} — ${variantName}`;
  return base || 'Skin';
}

const badges = JSON.parse(
  fs.readFileSync(path.join(root, 'lib/classroomBadges.generated.json'), 'utf8')
);
const gods = JSON.parse(fs.readFileSync(path.join(root, 'app/data/Smite2Gods.json'), 'utf8'));
const skinsDir = path.join(root, 'app/data/God Information/Skins');

const entries = [];
const seenIds = new Set();

function push(entry) {
  if (!entry?.id || !entry?.url || seenIds.has(entry.id)) return;
  seenIds.add(entry.id);
  entries.push(entry);
}

for (const file of badges) {
  push({
    id: `badge:${file}`,
    kind: 'badge',
    label: badgeLabelFromFile(file),
    search: normSearch(file, badgeLabelFromFile(file), 'badge'),
    url: badgeUrl(file),
    ref: file,
  });
}

for (const god of gods) {
  const godName = god.godName;
  if (!godName) continue;
  const iconPath = String(god.icon || '').trim();
  const url = iconPath ? assetsUrl(iconPath) : godFallbackUrl(godName);
  if (!url) continue;
  push({
    id: `god:${godName}`,
    kind: 'god',
    label: godName,
    search: normSearch(godName, god.pantheon, 'god portrait'),
    url,
    ref: godName,
    pantheon: god.pantheon || null,
  });
}

const skinFiles = fs
  .readdirSync(skinsDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'));

const seenSkinIcons = new Set();

for (const file of skinFiles) {
  const pantheon = file.replace(/\.json$/, '');
  const data = JSON.parse(fs.readFileSync(path.join(skinsDir, file), 'utf8'));
  for (const godBlock of data.gods || []) {
    const godName = godBlock.godName;
    if (!godName) continue;
    for (const skin of godBlock.skins || []) {
      const skinName = skin.skinName || skin.skinKey || '';
      const iconPath = skin.assets?.icon;
      if (iconPath && !seenSkinIcons.has(iconPath)) {
        seenSkinIcons.add(iconPath);
        const label = `${godName} — ${skinDisplayName(skinName)}`;
        push({
          id: `skin:${iconPath}`,
          kind: 'skin',
          label,
          search: normSearch(godName, skinName, skin.skinKey, pantheon, 'skin'),
          url: assetsUrl(iconPath),
          ref: iconPath,
          godName,
          pantheon,
        });
      }
      for (const variant of skin.variants || []) {
        const vIcon = variant.icon;
        if (!vIcon || seenSkinIcons.has(vIcon)) continue;
        seenSkinIcons.add(vIcon);
        const vLabel = `${godName} — ${skinDisplayName(skinName, variant.name)}`;
        push({
          id: `skin:${vIcon}`,
          kind: 'skin',
          label: vLabel,
          search: normSearch(godName, skinName, variant.name, pantheon, 'skin variant'),
          url: assetsUrl(vIcon),
          ref: vIcon,
          godName,
          pantheon,
        });
      }
    }
  }
}

entries.sort((a, b) => a.label.localeCompare(b.label));

const out = {
  generatedAt: new Date().toISOString(),
  counts: {
    badge: entries.filter((e) => e.kind === 'badge').length,
    god: entries.filter((e) => e.kind === 'god').length,
    skin: entries.filter((e) => e.kind === 'skin').length,
    total: entries.length,
  },
  entries,
};

const outPath = path.join(root, 'lib/classroomAvatars.generated.json');
fs.writeFileSync(outPath, `${JSON.stringify(out)}\n`);
console.log(
  `Wrote ${out.counts.total} avatars (${out.counts.badge} badges, ${out.counts.god} gods, ${out.counts.skin} skins) → lib/classroomAvatars.generated.json`
);
