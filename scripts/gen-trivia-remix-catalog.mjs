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
const ASPECT_ICON_BASE = '/media/AspectIcons';
const PASSIVE_ICON_DIRS = [
  path.join(ROOT, 'app/data/Icons/God Info'),
  path.join(ROOT, 'app/data/Icons/God Info/jacob_s icons'),
];

/** Short stems used when builds basenames diverge (e.g. bellonaPassive → bellPassive). */
const GOD_PASSIVE_ALIASES = {
  bellona: 'bell',
  ahpuch: 'puch',
  hunbatz: 'batz',
  huamulan: 'mulan',
  themorrigan: 'morri',
  baronsamedi: 'baron',
  sunwukong: 'wukong',
  princessbari: 'bari',
  danzaburou: 'danza',
  cernunnos: 'cern',
  cerberus: 'cerb',
  cabrakan: 'cab',
  hercules: 'herc',
  mercury: 'merc',
  nemesis: 'nem',
  poseidon: 'pos',
  thanatos: 'thana',
  xbalanque: 'xbal',
  yemoja: 'yem',
  amaterasu: 'ama',
  izanami: 'iza',
  jingwei: 'jing',
  jormungandr: 'jorm',
  khepri: 'khep',
  kukulkan: 'kuku',
  tsukuyomi: 'tsuku',
  susano: 'sus',
  aphrodite: 'aphro',
  cuchulainn: 'cuchu',
  ixchel: 'ixchel',
  nezha: 'nezha',
  morganlefay: 'morganlefay',
};

function listPassiveIconFiles() {
  const byLower = new Map();
  const byStem = new Map();
  for (const dir of PASSIVE_ICON_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!/passive/i.test(name) || !/\.(webp|png|jpe?g)$/i.test(name)) continue;
      const lower = name.toLowerCase();
      if (!byLower.has(lower)) byLower.set(lower, name);
      const stem = lower.replace(/\.[^.]+$/, '').replace(/passive$/, '');
      if (stem && !byStem.has(stem)) byStem.set(stem, name);
    }
  }
  return { byLower, byStem };
}

const PASSIVE_ICON_FILES = listPassiveIconFiles();

function passiveStemCandidates(iconPath, godName) {
  const out = [];
  const push = (s) => {
    const t = String(s || '')
      .toLowerCase()
      .replace(/['']/g, '')
      .replace(/[^a-z0-9]+/g, '');
    if (t && !out.includes(t)) out.push(t);
  };
  const file = String(iconPath || '')
    .split(/[/\\]/)
    .pop();
  if (file) {
    push(file.replace(/\.[^.]+$/, '').replace(/passive$/i, ''));
  }
  const god = String(godName || '').trim();
  if (god) {
    push(god);
    push(god.replace(/\s+/g, ''));
    const parts = god.split(/\s+/).filter(Boolean);
    if (parts[0]) push(parts[0]);
    if (parts.length > 1) push(parts[parts.length - 1]);
    const alias = GOD_PASSIVE_ALIASES[norm(god)];
    if (alias) push(alias);
  }
  return out;
}

/**
 * Resolve passive art that exists on disk (CDN mirrors God Info basenames).
 * Prefer builds basename; else fuzzy stem / god aliases. Omit if no file.
 */
function passiveImage(iconPath, godName) {
  const file = String(iconPath || '')
    .split(/[/\\]/)
    .pop();
  if (file && /\.(webp|png|jpe?g)$/i.test(file)) {
    const exact = PASSIVE_ICON_FILES.byLower.get(file.toLowerCase());
    if (exact) return mediaFileUrl(GOD_ICON_BASE, exact);
  }

  const candidates = passiveStemCandidates(iconPath, godName);
  for (const stem of candidates) {
    const hit = PASSIVE_ICON_FILES.byStem.get(stem);
    if (hit) return mediaFileUrl(GOD_ICON_BASE, hit);
  }

  // Prefix fuzzy: bellona → bellPassive (longest stem that prefixes a candidate).
  let best = null;
  for (const stem of candidates) {
    if (stem.length < 3) continue;
    for (const [diskStem, fname] of PASSIVE_ICON_FILES.byStem) {
      if (diskStem.length < 3) continue;
      if (stem === diskStem || stem.startsWith(diskStem) || diskStem.startsWith(stem)) {
        const score = Math.min(stem.length, diskStem.length);
        if (!best || score > best.score || (score === best.score && diskStem.length > best.diskLen)) {
          best = { fname, score, diskLen: diskStem.length };
        }
      }
    }
  }
  if (best) return mediaFileUrl(GOD_ICON_BASE, best.fname);
  return null;
}
/** Shared aspect slot art under `app/data/AspectIcons/` (assets branch). */
const ASPECT_POOL_FILENAMES = new Set(
  [
    'arrowAspect.webp',
    'eyeAspect.webp',
    'fatArrowAspect.webp',
    'fatHeartAspect.webp',
    'fistAspect.webp',
    'handAspect.webp',
    'heartAspect.webp',
    'radarAspect.webp',
    'shieldAspect.webp',
    'stickyFootAspect.webp',
    'stunAspect.webp',
    'swirlAspect.webp',
    'swordAspect.webp',
    'swordsAspect.webp',
  ].map((s) => s.toLowerCase())
);

function aspectImage(iconPath) {
  const file = String(iconPath || '')
    .split(/[/\\]/)
    .pop();
  if (!file || !ASPECT_POOL_FILENAMES.has(file.toLowerCase())) return null;
  return mediaFileUrl(ASPECT_ICON_BASE, file);
}

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

let smite2GodsMeta = {};
try {
  const rows = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'app/data/Smite2Gods.json'), 'utf8')
  );
  for (const row of Array.isArray(rows) ? rows : []) {
    const n = String(row?.godName || row?.name || row?.Name || '').trim();
    if (!n) continue;
    smite2GodsMeta[norm(n)] = {
      pantheon: String(row.pantheon || row.Pantheon || '').trim(),
      role: String(row.Role || row.role || row.primaryRole || '').trim(),
      powerType: String(row['Power Type'] || row.powerType || '').trim(),
      attackType: String(row['Attack Type'] || row.attackType || '').trim(),
    };
  }
} catch {
  smite2GodsMeta = {};
}

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

/** Enemy-applied crowd control tags (excludes self-/immunity). */
const CC_APPLY = new Set([
  'stun',
  'root',
  'slow',
  'knockup',
  'knockback',
  'silence',
  'cripple',
  'disarm',
  'fear',
  'taunt',
  'mesmerize',
  'polymorph',
  'banish',
  'pull',
  'grab',
]);

const CC_TEXT_PATTERNS = [
  [/knock[\s-]?ups?/i, 'knockup'],
  [/knock[\s-]?backs?/i, 'knockback'],
  [/\bstuns?\b/i, 'stun'],
  [/\broots?\b/i, 'root'],
  [/\bslows?\b/i, 'slow'],
  [/\bsilences?\b/i, 'silence'],
  [/\bcripples?\b/i, 'cripple'],
  [/\bdisarms?\b/i, 'disarm'],
  [/\bfears?\b/i, 'fear'],
  [/\btaunts?\b/i, 'taunt'],
  [/\bmesmeriz(?:e|es|ed)\b/i, 'mesmerize'],
  [/\bpolymorph(?:s|ed)?\b/i, 'polymorph'],
  [/\bbanish(?:es|ed)?\b/i, 'banish'],
  [/\bpulls?\b/i, 'pull'],
  [/\bgrabs?\b/i, 'grab'],
];

function extractCcTags(ability) {
  const found = new Set();
  for (const t of ability?.tags || []) {
    const key = String(t || '')
      .toLowerCase()
      .trim();
    if (CC_APPLY.has(key)) found.add(key);
  }
  const blob = `${ability?.shortDesc || ''} ${ability?.description || ''}`;
  for (const [re, key] of CC_TEXT_PATTERNS) {
    if (re.test(blob)) found.add(key);
  }
  return [...found];
}

function abilitySlotMeta(key, ability, indexFallback) {
  const raw = String(key || '').toUpperCase();
  let slot = null;
  let slotLabel = null;
  if (/^PASSIVE|^PSV/i.test(raw) || ability?.key?.includes?.('.PSV.')) {
    return { slot: 'passive', slotLabel: 'passive' };
  }
  // Smite 2 stance kits (Cu Chulainn) can expose A05 as a form swap.
  const m =
    raw.match(/^A0?([1-5])$/i) || String(ability?.key || '').match(/\.A0?([1-5])\./i);
  if (m) {
    slot = Number(m[1]);
  } else if (Number.isFinite(indexFallback) && indexFallback >= 0 && indexFallback < 5) {
    slot = indexFallback + 1;
  }
  if (!slot) return null;
  slotLabel = slot === 4 ? 'ultimate' : String(slot);
  return { slot: String(slot), slotLabel };
}

/**
 * Flatten stance-nested abilities (Merlin/Ullr/Artio/Cu Chulainn):
 * `{ A01: { ice: {...}, fire: {...} } }` → leaf ability rows.
 */
function expandAbilityLeaves(abilities) {
  const out = [];
  const entries = Object.entries(abilities || {});
  entries.forEach(([key, ab], idx) => {
    if (!ab || typeof ab !== 'object') return;
    if (String(ab.name || '').trim()) {
      out.push({ key, ability: ab, indexFallback: idx, stance: null });
      return;
    }
    for (const [stance, leaf] of Object.entries(ab)) {
      if (!leaf || typeof leaf !== 'object') continue;
      if (!String(leaf.name || '').trim()) continue;
      out.push({ key, ability: leaf, indexFallback: idx, stance: String(stance) });
    }
  });
  return out;
}

function mapPrimaryRole(roles, shortRole, metaRole) {
  const fromMeta = String(metaRole || '').trim();
  if (fromMeta) return fromMeta;
  const list = Array.isArray(roles) ? roles.map((r) => String(r || '').trim()).filter(Boolean) : [];
  const map = {
    middle: 'Mid',
    mid: 'Mid',
    solo: 'Solo',
    jungle: 'Jungle',
    carry: 'ADC',
    adc: 'ADC',
    hunter: 'ADC',
    support: 'Support',
    guardian: 'Support',
  };
  for (const r of list) {
    const hit = map[r.toLowerCase()];
    if (hit) return hit;
  }
  const blob = String(shortRole || '').toLowerCase();
  if (/mid|mage|wizard/.test(blob)) return 'Mid';
  if (/solo|warrior/.test(blob)) return 'Solo';
  if (/jungle|assassin/.test(blob)) return 'Jungle';
  if (/carry|hunter|adc/.test(blob)) return 'ADC';
  if (/support|guardian/.test(blob)) return 'Support';
  return list[0] || '';
}

function passiveSummary(passive) {
  return String(passive?.shortDesc || passive?.description || '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

const gods = [];
const aspects = [];
const abilities = [];
const abilityCc = [];
const passives = [];
const godCc = [];
const godProfiles = [];
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
  const hasAspect =
    god.hasAspect === true ||
    (/^aspect of/i.test(aspectName) && aspectName.length > 10);
  if (/^aspect of/i.test(aspectName)) {
    const usesThe = /^aspect of the /i.test(aspectName);
    const blank = aspectName.replace(/^aspect of(?: the)?\s+/i, '').trim();
    const iconFile = String(god.aspect?.icon || '')
      .split(/[/\\]/)
      .pop() || null;
    const image = aspectImage(god.aspect?.icon);
    aspects.push({
      god: name,
      aspect: aspectName,
      blank,
      usesThe,
      ...(iconFile ? { icon: iconFile } : {}),
      ...(image ? { image } : {}),
    });
  }

  const godCcSet = new Set();
  const abilityNameSet = new Set();
  const slotKeys = new Set();
  const leaves = expandAbilityLeaves(god.abilities);
  for (const leaf of leaves) {
    const ab = leaf.ability;
    const an = String(ab?.name || '').trim();
    if (!an || an.length < 3) continue;
    abilityNameSet.add(an);
    abilities.push({ god: name, name: an });
    const meta = abilitySlotMeta(leaf.key, ab, leaf.indexFallback);
    if (!meta || meta.slot === 'passive') continue;
    slotKeys.add(meta.slot);
    const ccs = extractCcTags(ab);
    if (!ccs.length) continue;
    for (const c of ccs) godCcSet.add(c);
    abilityCc.push({
      god: name,
      name: an,
      slot: meta.slot,
      slotLabel: meta.slotLabel,
      ccs,
      ...(leaf.stance ? { stance: leaf.stance } : {}),
    });
  }

  const psv = god.passive;
  const pName = String(psv?.name || '').trim();
  if (pName) {
    const summary = passiveSummary(psv);
    const image = passiveImage(psv?.icon, name);
    passives.push({
      god: name,
      name: pName,
      ...(summary ? { summary } : {}),
      ...(image ? { image } : {}),
    });
    abilities.push({ god: name, name: pName });
    abilityNameSet.add(pName);
  }

  if (godCcSet.size) {
    godCc.push({ god: name, ccs: [...godCcSet].sort() });
  }

  const metaRow = smite2GodsMeta[norm(name)] || {};
  const pantheon = String(god.pantheon || metaRow.pantheon || '').trim();
  const role = mapPrimaryRole(god.roles, god.shortRole, metaRow.role);
  const roleMap = {
    middle: 'Mid',
    mid: 'Mid',
    solo: 'Solo',
    jungle: 'Jungle',
    carry: 'ADC',
    adc: 'ADC',
    hunter: 'ADC',
    support: 'Support',
    guardian: 'Support',
  };
  const allRoles = [
    ...new Set(
      (Array.isArray(god.roles) ? god.roles : [])
        .map((r) => roleMap[String(r || '').toLowerCase()] || String(r || '').trim())
        .filter(Boolean)
        .concat(role ? [role] : [])
    ),
  ];
  const stances = Array.isArray(god.stances)
    ? god.stances.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const isStance = god.isStanceSwitcher === true || stances.length >= 2;
  const type = String(god.Type || god.type || metaRow.powerType || '').trim();
  const range = String(god.range || metaRow.attackType || '').trim();
  const activeSlotCount = slotKeys.size || Object.keys(god.abilities || {}).length;
  godProfiles.push({
    name,
    pantheon,
    role,
    roles: allRoles,
    type,
    range,
    hasAspect: !!hasAspect,
    isStanceSwitcher: !!isStance,
    stanceCount: isStance ? stances.length : 0,
    stances: isStance ? stances : [],
    abilityNames: [...abilityNameSet].sort((a, b) => a.localeCompare(b)),
    namedAbilityCount: abilityNameSet.size,
    activeSlotCount,
    kitAbilityCount: activeSlotCount + (pName ? 1 : 0),
    passive: pName || null,
    ccs: [...godCcSet].sort(),
    ccParsed: godCcSet.size > 0 || leaves.length > 0,
  });
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
  gods.push({ name: 'Xing Tian', image: mediaFileUrl(GOD_ICON_BASE, 'xingImage.webp') });
}
if (!gods.some((g) => norm(g.name) === 'cuchulainn')) {
  gods.push({ name: 'Cu Chulainn', image: mediaFileUrl(GOD_ICON_BASE, 'cuchuImage.webp') });
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
  abilityCc: abilityCc.sort((a, b) => a.god.localeCompare(b.god) || a.slot.localeCompare(b.slot)),
  passives: passives.sort((a, b) => a.god.localeCompare(b.god)),
  godCc: godCc.sort((a, b) => a.god.localeCompare(b.god)),
  godProfiles: godProfiles.sort((a, b) => a.name.localeCompare(b.name)),
  releases: releasesDedup.sort((a, b) => a.patch - b.patch || a.god.localeCompare(b.god)),
};

const dest = path.join(ROOT, 'formative-web/src/lib/triviaRemixCatalog.json');
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);

// Slim mirror for tooling / external sims
const ccDest = path.join(ROOT, 'formative-web/src/lib/triviaAbilityCc.json');
fs.writeFileSync(
  ccDest,
  `${JSON.stringify(
    {
      abilityCc: out.abilityCc,
      passives: out.passives,
      godCc: out.godCc,
    },
    null,
    2
  )}\n`
);

const ls = items.filter((i) => i.stats.lifesteal != null).length;
const statKeys = [...new Set(items.flatMap((i) => Object.keys(i.stats)))].sort();
console.log(
  `Wrote ${dest} (${items.length} items, ${statKeys.length} stat types, ${ls} with lifesteal, ${gods.length} gods, ${godProfiles.length} godProfiles, ${aspectsDedup.length} aspects, ${abilities.length} abilities, ${abilityCc.length} ability-CC, ${passives.length} passives, ${godCc.length} god-CC kits, ${releasesDedup.length} OB releases)`
);
console.log(`Also wrote ${ccDest}`);
console.log(`Stats: ${statKeys.join(', ')}`);
