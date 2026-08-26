#!/usr/bin/env node
/**
 * Compact catalog for Scroll Trivia "Change question/answer".
 * Display names from builds.json — never internalName as the label.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ITEM_ICON_ALIASES = {
  axe: 'axe.webp',
  sunderingaxe: 'sunderingaxe.webp',
  warriorsaxe: 'sunderingaxe.webp',
  moteofchaos: 'moteOfChaos.webp',
  bloodboundbook: 'Blood-BoundBook.webp',
  wishgrantingpearl: 'Wish-GrantingPearl.webp',
};

function iconKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ITEM_ICON_BASE = '/media/Icons/Item Icons';
const GOD_ICON_BASE = '/media/Icons/God Info';

function flatten(arr) {
  if (!arr) return [];
  if (!Array.isArray(arr)) return [arr];
  return arr.flat(Infinity).filter(Boolean);
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function stripMd(s) {
  return String(s || '')
    .replace(/\*+/g, '')
    .replace(/_/g, '')
    .trim();
}

function mediaFileUrl(base, file) {
  const name = String(file || '').split(/[/\\]/).pop();
  if (!name) return null;
  return `${base}/${encodeURIComponent(name)}`;
}

function itemImage(item) {
  const iconBase = String(item.icon || '').split('/').pop() || '';
  const stem = iconBase.replace(/\.[^.]+$/, '');
  const alias = ITEM_ICON_ALIASES[iconKey(stem)]
    || ITEM_ICON_ALIASES[iconKey(item.name)]
    || ITEM_ICON_ALIASES[iconKey(item.internalName)];
  const file = alias || iconBase || `${item.name}.webp`;
  const disk = path.join(ROOT, 'app/data/Icons/Item Icons', file);
  if (!fs.existsSync(disk)) return null;
  return mediaFileUrl(ITEM_ICON_BASE, file);
}

function itemStats(item) {
  const out = {};
  const stats = item.stats && typeof item.stats === 'object' ? item.stats : {};
  for (const [key, val] of Object.entries(stats)) {
    const n = Number(val);
    if (!Number.isFinite(n) || n === 0) continue;
    const raw = String(key).toLowerCase();
    const mapped = raw === 'maxhealth' || raw === 'max health' ? 'health' : raw === 'maxmana' ? 'mana' : raw;
    out[mapped] = n;
  }
  if (Number(item.totalCost) > 0) out.cost = Number(item.totalCost);
  if (Number(item.stepCost) > 0) out['step cost'] = Number(item.stepCost);
  return out;
}

function itemTags(item) {
  const tags = new Set();
  if (item.starter) tags.add('starter');
  if (item.consumable) tags.add('consumable');
  if (item.tier) tags.add(`tier${item.tier}`);
  for (const key of Object.keys(itemStats(item))) tags.add(key);
  const blob = `${item.passive || ''} ${item.name || ''}`;
  if (/anti-?heal|healing reduction/i.test(blob)) tags.add('antiheal');
  return [...tags];
}

function normalizeGod(god) {
  if (!god || typeof god !== 'object') return god;
  if (!god.baseKit) return god;
  const info = god.baseInformation && typeof god.baseInformation === 'object' ? god.baseInformation : {};
  const kit = god.baseKit;
  const { baseKit, baseInformation, ...rest } = god;
  const { builds: _b, ...kitRest } = kit;
  return { ...kitRest, ...info, ...rest };
}

const builds = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'app/data/God Information/Builds/builds.json'), 'utf8')
);

const rawItems = flatten(builds.items).filter((item) => String(item?.name || '').trim());
const byInternal = new Map();
const byName = new Map();
for (const item of rawItems) {
  const name = String(item.name || '').trim();
  if (name) byName.set(norm(name), item);
  const inn = String(item.internalName || '').trim();
  if (inn) byInternal.set(norm(inn), item);
}

function resolveItemName(raw) {
  const s = String(raw || '').trim();
  if (!s || /^none$/i.test(s)) return null;
  const hit = byName.get(norm(s)) || byInternal.get(norm(s));
  const name = String(hit?.name || s).trim();
  return name || null;
}

function lowerTierNames(item) {
  const refs = Array.isArray(item.components) ? item.components : [];
  const out = [];
  const seen = new Set();
  for (const ref of refs) {
    const name = resolveItemName(ref);
    if (!name || norm(name) === norm(item.name) || seen.has(norm(name))) continue;
    seen.add(norm(name));
    out.push(name);
  }
  return out;
}

const items = [];
const seenItem = new Set();
for (const item of rawItems) {
  const name = String(item?.name || '').trim();
  if (!name || seenItem.has(norm(name))) continue;
  seenItem.add(norm(name));
  items.push({
    name,
    tags: itemTags(item),
    stats: itemStats(item),
    tier: item.tier || null,
    starter: Boolean(item.starter),
    from: lowerTierNames(item),
    image: itemImage(item),
  });
}

const gods = [];
const aspects = [];
const abilities = [];
const seenGod = new Set();

for (const raw of flatten(builds.gods)) {
  const god = normalizeGod(raw);
  const name = String(god?.name || '').trim();
  if (!name || seenGod.has(norm(name))) continue;
  seenGod.add(norm(name));
  const icon = god.icon || god.baseInformation?.icon;
  gods.push({
    name,
    image: mediaFileUrl(GOD_ICON_BASE, String(icon || '').split('/').pop()),
  });

  const aspectName = stripMd(god.aspect?.name);
  if (/^aspect of/i.test(aspectName)) {
    const usesThe = /^aspect of the /i.test(aspectName);
    const blank = aspectName.replace(/^aspect of(?: the)?\s+/i, '').trim();
    aspects.push({ god: name, aspect: aspectName, blank, usesThe });
  }

  const kit = [god.passive, ...Object.values(god.abilities || {})];
  for (const ab of kit) {
    const an = String(ab?.name || '').trim();
    if (!an || an.length < 4) continue;
    abilities.push({ god: name, name: an });
  }
}

aspects.push(
  { god: 'Xing Tian', aspect: 'Aspect of Relentless Spite', blank: 'Relentless Spite', usesThe: false },
  { god: 'Cu Chulainn', aspect: 'Aspect of the Warped', blank: 'Warped', usesThe: true }
);

const notesDir = path.join(ROOT, 'app/data/Patch Notes');
const releases = [];
function walkSections(sections, out) {
  for (const sec of sections || []) {
    const title = String(sec.title || '');
    if (/^new (classic )?gods?$/i.test(title.trim())) {
      for (const sub of sec.subsections || []) {
        const god = String(sub.title || '').split(/\s+-\s+/)[0].replace(/\s*\(.*\)$/, '').trim();
        if (god) out.push(god);
      }
    }
    walkSections(sec.subsections, out);
  }
}
for (const file of fs.readdirSync(notesDir).filter((f) => /^patchnotesob\d+\.json$/i.test(f))) {
  const data = JSON.parse(fs.readFileSync(path.join(notesDir, file), 'utf8'));
  const num = Number(data.meta?.number);
  if (!Number.isFinite(num)) continue;
  const names = [];
  walkSections(data.sections, names);
  for (const raw of names) {
    if (!raw || /skin|traveler|item/i.test(raw)) continue;
    releases.push({ patch: num, god: raw.split(/\s+-\s+/)[0].trim() });
  }
}
releases.push({ patch: 39, god: 'Xing Tian' }, { patch: 40, god: 'Cu Chulainn' });

if (!gods.some((g) => norm(g.name) === 'xingtian')) {
  gods.push({ name: 'Xing Tian', image: mediaFileUrl(GOD_ICON_BASE, 'xingTianImage.webp') });
}
if (!gods.some((g) => norm(g.name) === 'cuchulainn')) {
  gods.push({ name: 'Cu Chulainn', image: mediaFileUrl(GOD_ICON_BASE, 'cuChulainnImage.webp') });
}

const seenRel = new Set();
const releasesDedup = releases.filter((r) => {
  const k = `${r.patch}|${norm(r.god)}`;
  if (seenRel.has(k)) return false;
  seenRel.add(k);
  return true;
});

const seenAspect = new Set();
const aspectsDedup = aspects.filter((a) => {
  const k = `${norm(a.god)}|${norm(a.blank)}`;
  if (seenAspect.has(k)) return false;
  seenAspect.add(k);
  return true;
});

const out = {
  gods: gods.sort((a, b) => a.name.localeCompare(b.name)),
  items: items.sort((a, b) => a.name.localeCompare(b.name)),
  aspects: aspectsDedup.sort((a, b) => a.god.localeCompare(b.god)),
  abilities: abilities.sort((a, b) => a.name.localeCompare(b.name)),
  releases: releasesDedup.sort((a, b) => a.patch - b.patch || a.god.localeCompare(b.god)),
};

const dest = path.join(ROOT, 'formative-web/src/lib/triviaRemixCatalog.json');
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
const ls = items.filter((i) => i.stats.lifesteal != null).length;
const statKeys = [...new Set(items.flatMap((i) => Object.keys(i.stats)))].sort();
console.log(
  `Wrote ${dest} (${items.length} items, ${statKeys.length} stat types, ${ls} with lifesteal, ${gods.length} gods, ${aspectsDedup.length} aspects, ${abilities.length} abilities, ${releasesDedup.length} OB releases)`
);
console.log(`Stats: ${statKeys.join(', ')}`);
