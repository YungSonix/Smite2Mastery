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

/** Assets-branch NewGodSkins folders that do not match simple space-stripping. */
const GOD_PORTRAIT_SPECIAL = {
  'Guan Yu': 'NewGodSkins/Guan_Yu/Default/t_GodPortrait_Guan_Yu.png',
  'Hou Yi': 'NewGodSkins/Hou_Yi/Default/t_GodPortrait_Hou_Yi.png',
  'Hun Batz': 'NewGodSkins/Hun_Batz/Default/t_GodPortrait_Hun_Batz.png',
  'Ne Zha': 'NewGodSkins/Ne_Zha/Default/t_GodPortrait_Ne_Zha.png',
  'Sun Wukong': 'NewGodSkins/Sun_Wukong/Default/t_GodPortrait_Sun_Wukong.png',
  'Da Ji': 'NewGodSkins/DaJi/Default/t_GodPortrait_Daji.png',
  'Hua Mulan': 'NewGodSkins/Mulan/Default/t_GodPortrait_Mulan.png',
  'Princess Bari': 'NewGodSkins/Bari/Default/t_GodPortrait_Bari.png',
  Chronos: null, // no NewGodSkins folder — use God Info webp fallback
};

function godSkinFolderCandidates(godName) {
  const raw = String(godName || '').trim();
  const noSpace = raw.replace(/\s+/g, '');
  const alnum = raw.replace(/[^a-zA-Z0-9]/g, '');
  const unders = raw.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return [...new Set([noSpace, alnum, unders].filter(Boolean))];
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

function normToken(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^60px-/i, '')
    .replace(/\.png$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function localBadgeLabel(filename, relPath) {
  let base = String(filename || '')
    .replace(/\.png$/i, '')
    .replace(/_256$|_512$/i, '')
    .replace(/^t_Badge_/i, 'Badge ')
    .replace(/^t_/i, '')
    .replace(/_MasteryBadge$/i, '')
    .replace(/_Badge$/i, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^Badge /i.test(base)) base = base.slice(6);
  const folder = relPath.split('/').slice(-2, -1)[0];
  if (folder && !base.toLowerCase().includes(folder.toLowerCase().replace(/_/g, ' '))) {
    base = `${folder.replace(/_/g, ' ')} ${base}`.trim();
  }
  const words = base.split(' ').filter(Boolean);
  return words.slice(0, 4).join(' ') || 'Badge';
}

function isBadgeDisplayAsset(relPath, filename) {
  if (
    /Textures|Flipbook|texturearray|_LAYER\d|_msk|_MSK|Frame-\d|rainbow_mask|eyeball|eyelids|lowereyelid|uppereyelid|\/spec\.png|\/ring\.png|t_body|t_hair|t_eyes|t_mouth|t_background|t_gummyhead|t_rainbow|CutesyCupcake__Frame|seagull_texturearray_|^TA_OB\d/i.test(
      relPath
    )
  ) {
    return false;
  }
  if (/^t_frame/i.test(filename)) return false;
  if (
    /MasteryBadge|_Badge|Badge_|Commendation|Season\d|RankedPlayer|SWC|Founders|OpenBeta|ClosedBeta|Smite1|T5|Cutesy|Pantheon|Events|Reaping|Valentines|Pride|LOTR|Plushie|Kraken|Prime|Ranked|PlatBadge|Numeral|Year\d|LaunchTournament|UltimateFounders|WanderingMarket|MarketingDrops|FiendHunter|SacredArrow|LunarFox|Fabulous|Peep|EasterEgg|AmericanFlag|AphroFlower|Morrigan|Yulefest|EsetCrimson|GummyBear|Cupcake|KukuSaga|NeithSaga|Xbox|AllMine|Foreveralone|SweetHoney|Fantasy|Traveler|SWCVegas/i.test(
      relPath
    )
  ) {
    return true;
  }
  if (/Pantheon\/[^/]+\.png$/i.test(relPath)) return true;
  return false;
}

function walkBadgePngs(dir, base = '', acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkBadgePngs(full, rel, acc);
    else if (/\.png$/i.test(ent.name) && isBadgeDisplayAsset(rel, ent.name)) {
      acc.push({ rel, filename: ent.name });
    }
  }
  return acc;
}

/** True when a local Icons/Badges png is already represented by a GitHub 60px manifest entry. */
function localBadgeCoveredByManifest(localFile, relPath, manifestTokens, index) {
  const localTokens = [normToken(localFile), normToken(path.basename(localFile, '.png'))];
  for (const t of localTokens) {
    if (manifestTokens.has(t)) return true;
  }

  for (const file of badges) {
    const mastery = file.match(/^60px-(.+?)-MasteryBadge\.png$/i);
    if (mastery) {
      const god = mastery[1];
      for (const key of [
        normToken(`t_${god}_MasteryBadge_256`),
        normToken(`t_${god.replace(/-/g, '')}_MasteryBadge_256`),
      ]) {
        if (localTokens.includes(key) || index.get(key) === path.join(badgesIconsRoot, relPath)) {
          return true;
        }
      }
    }
  }

  for (const t of localTokens) {
    for (const m of manifestTokens) {
      if (t.length >= 8 && m.length >= 8 && (t.includes(m.slice(0, 10)) || m.includes(t.slice(0, 10)))) {
        return true;
      }
    }
  }
  return false;
}

const badgesIconsRoot = path.join(root, 'app/data/Icons/Badges');
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

if (fs.existsSync(badgesIconsRoot)) {
  const manifestTokens = new Set(badges.flatMap((f) => [normToken(f), normToken(path.basename(f, '.png'))]));
  const localIndex = new Map();
  const stack = [badgesIconsRoot];
  while (stack.length) {
    const dir = stack.pop();
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (/\.png$/i.test(ent.name)) {
        localIndex.set(normToken(ent.name), full);
      }
    }
  }

  let localAdded = 0;
  for (const { rel, filename } of walkBadgePngs(badgesIconsRoot)) {
    if (localBadgeCoveredByManifest(filename, rel, manifestTokens, localIndex)) continue;
    const ref = `app/data/Icons/Badges/${rel.replace(/\\/g, '/')}`;
    const label = localBadgeLabel(filename, rel);
    push({
      id: `badge:${ref}`,
      kind: 'badge',
      label,
      search: normSearch(filename, rel, label, 'badge'),
      url: assetsUrl(ref),
      ref,
      source: 'local-icons',
    });
    localAdded += 1;
  }
  if (localAdded) console.log(`Added ${localAdded} local Icons/Badges entries not in profile manifest`);
}

for (const god of gods) {
  const godName = god.godName;
  if (!godName) continue;
  // Prefer NewGodSkins Default portraits — `God Icons/` is not on the assets branch (404).
  const folderHints = godSkinFolderCandidates(godName);
  let url = null;
  for (const folder of folderHints) {
    url = assetsUrl(`NewGodSkins/${folder}/Default/t_GodPortrait_${folder}.png`);
    // Keep first candidate; runtime/regenerator can verify. Special cases below.
    break;
  }
  const special = GOD_PORTRAIT_SPECIAL[godName];
  if (special) url = assetsUrl(special);
  if (!url) url = godFallbackUrl(godName);
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
      const iconPath = skin.icon || skin.assets?.icon;
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
