#!/usr/bin/env node
/**
 * Voice/skin/ability-sound identify catalog for Scroll Trivia remix.
 * Prefers Skin00_Base Intro / Select / Taunt / Joke for voice lines.
 * Ability cast SFX: Skin00_Base/Ability1–4 files whose names contain Activate or Start.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { flattenBuildsGods } = require('../lib/normalizeBuildsGod.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = '/media';
const VOICE_ROOT = path.join(ROOT, 'app/data/VoiceAudio');

const GOD_FOLDER_MAP = {
  'Guan Yu': 'Guan_Yu',
  'Jing Wei': 'JingWei',
  'Sun Wukong': 'SunWukong',
  'Ne Zha': 'Ne Zha',
  'Da Ji': 'Da_Ji',
  'The Morrigan': 'The_Morrigan',
  'Nu Wa': 'NuWa',
  'Hou Yi': 'HouYi',
  'Baron Samedi': 'BaronSamedi',
  'Hun Batz': 'HunBatz',
  'Ah Puch': 'AhPuch',
  'Hua Mulan': 'HuaMulan',
  'Morgan Le Fay': 'MorganLeFay',
  'Princess Bari': 'PrincessBari',
};

const CLIP_FILES = [
  { kind: 'intro', file: 'Intro_1.WAV' },
  { kind: 'select', file: 'Select.WAV' },
  { kind: 'taunt', file: 'Taunt_1.WAV' },
  { kind: 'joke', file: 'Joke_1.WAV' },
];

const ABILITY_SLOTS = [
  { dir: 'Ability1', key: 'A01', slot: 1 },
  { dir: 'Ability2', key: 'A02', slot: 2 },
  { dir: 'Ability3', key: 'A03', slot: 3 },
  { dir: 'Ability4', key: 'A04', slot: 4 },
];

function folderName(godName) {
  const n = String(godName || '').trim();
  if (GOD_FOLDER_MAP[n]) return GOD_FOLDER_MAP[n];
  return n.replace(/\s+/g, '_');
}

function voiceUrl(godName, filename) {
  const folder = encodeURIComponent(folderName(godName)).replace(/%2F/g, '/');
  return `${ASSETS}/VoiceAudio/${folder}/Skin00_Base/VOX/${encodeURIComponent(filename)}`;
}

function abilitySoundUrl(godFolder, abilityDir, filename) {
  const folder = encodeURIComponent(godFolder).replace(/%2F/g, '/');
  return `${ASSETS}/VoiceAudio/${folder}/Skin00_Base/${abilityDir}/${encodeURIComponent(filename)}`;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function pickActivateOrStart(files) {
  const wavs = (files || []).filter((f) => /\.wav$/i.test(f));
  const scored = wavs
    .map((file) => {
      const n = file.toLowerCase();
      const isAspect = /aspect/.test(n);
      let score = 0;
      if (/activate/.test(n)) score = 30;
      else if (/start/.test(n)) score = 20;
      if (!score) return null;
      if (isAspect) score -= 10;
      // Prefer bare Activate / Activate_01 over _02+
      const num = n.match(/_0*(\d+)\.wav$/);
      if (num) score -= Math.min(5, Number(num[1]) || 0);
      return { file, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
  return scored[0]?.file || null;
}

const smiteGods = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'app/data/Smite2Gods.json'), 'utf8')
);
const godNames = smiteGods.map((g) => String(g.godName || '').trim()).filter(Boolean);

const meta = {};
for (const g of smiteGods) {
  const name = String(g.godName || '').trim();
  if (!name) continue;
  meta[name] = {
    pantheon: String(g.pantheon || '').trim(),
    role: String(g.Role || '').trim(),
    gender: String(g.Gender || '').trim(),
    emojis: [],
  };
}

const emojiMapPath = path.join(ROOT, 'app/data/Trivia/god-emojis/god-emoji-map.json');
if (fs.existsSync(emojiMapPath)) {
  try {
    const emojiMap = JSON.parse(fs.readFileSync(emojiMapPath, 'utf8'));
    for (const [name, emojis] of Object.entries(emojiMap || {})) {
      if (!meta[name]) {
        meta[name] = { pantheon: '', role: '', gender: '', emojis: [] };
      }
      meta[name].emojis = Array.isArray(emojis) ? emojis.map(String) : [];
    }
  } catch {
    /* keep empty emoji lists */
  }
}

const voiceClips = [];
godNames.forEach((god, i) => {
  const clip = CLIP_FILES[i % CLIP_FILES.length];
  voiceClips.push({
    god,
    skin: 'Base',
    kind: clip.kind,
    url: voiceUrl(god, clip.file),
  });
});

const folderToGod = new Map();
for (const name of godNames) {
  folderToGod.set(folderName(name), name);
  folderToGod.set(norm(folderName(name)), name);
}
for (const [god, folder] of Object.entries(GOD_FOLDER_MAP)) {
  folderToGod.set(folder, god);
  folderToGod.set(norm(folder), god);
}

const builds = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'app/data/God Information/Builds/builds.json'), 'utf8')
);
const buildsGods = flattenBuildsGods(builds.gods || []);
const abilityByGodSlot = new Map();
for (const g of buildsGods) {
  const name = String(g?.name || '').trim();
  if (!name) continue;
  const abs = g.abilities || {};
  for (const slot of ABILITY_SLOTS) {
    const abName = String(abs[slot.key]?.name || '').trim();
    if (abName) abilityByGodSlot.set(`${norm(name)}|${slot.slot}`, abName);
  }
}

const abilitySounds = [];
if (fs.existsSync(VOICE_ROOT)) {
  for (const ent of fs.readdirSync(VOICE_ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const godFolder = ent.name;
    const god =
      folderToGod.get(godFolder) ||
      folderToGod.get(norm(godFolder)) ||
      folderToGod.get(godFolder.replace(/_/g, ' ')) ||
      null;
    if (!god) continue;
    for (const slot of ABILITY_SLOTS) {
      const dir = path.join(VOICE_ROOT, godFolder, 'Skin00_Base', slot.dir);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      const file = pickActivateOrStart(files);
      if (!file) continue;
      const ability =
        abilityByGodSlot.get(`${norm(god)}|${slot.slot}`) || `Ability ${slot.slot}`;
      abilitySounds.push({
        god,
        ability,
        slot: slot.slot,
        file,
        url: abilitySoundUrl(godFolder, slot.dir, file),
      });
    }
  }
}

const destMedia = path.join(ROOT, 'formative-web/src/lib/triviaMediaCatalog.json');
let skinCards = [];
let prevAbilitySounds = [];
if (fs.existsSync(destMedia)) {
  try {
    const prev = JSON.parse(fs.readFileSync(destMedia, 'utf8'));
    if (Array.isArray(prev.skinCards)) skinCards = prev.skinCards;
    if (Array.isArray(prev.abilitySounds)) prevAbilitySounds = prev.abilitySounds;
  } catch {
    /* keep empty */
  }
}

const finalAbilitySounds = abilitySounds.length ? abilitySounds : prevAbilitySounds;

fs.writeFileSync(
  destMedia,
  `${JSON.stringify({ voiceClips, skinCards, abilitySounds: finalAbilitySounds }, null, 2)}\n`
);

const destMeta = path.join(ROOT, 'formative-web/src/lib/triviaGodMeta.json');
fs.writeFileSync(destMeta, `${JSON.stringify(meta, null, 2)}\n`);

console.log(
  `Wrote ${voiceClips.length} voice clips, ${finalAbilitySounds.length} ability sounds (Activate/Start under Skin00_Base Ability1–4), ${skinCards.length} skin cards, ${Object.keys(meta).length} god meta rows`
);
