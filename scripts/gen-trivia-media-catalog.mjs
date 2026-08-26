#!/usr/bin/env node
/**
 * Voice/skin/ability-sound identify catalog for Scroll Trivia remix.
 * Voice lines: Intro / Select / Taunt / Joke under every skin’s VOX folder
 * (Skin00_Base + alt skins). Remix/random prefer non-base skins at pick time.
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

function voiceUrl(godFolder, skinFolder, filename) {
  const folder = encodeURIComponent(godFolder).replace(/%2F/g, '/');
  const skin = encodeURIComponent(skinFolder).replace(/%2F/g, '/');
  return `${ASSETS}/VoiceAudio/${folder}/${skin}/VOX/${encodeURIComponent(filename)}`;
}

function isBaseSkinFolder(name) {
  return /^Skin00_Base$/i.test(String(name || '').trim());
}

/** Human label for hint_context: Base, SoulPiercer, CosmicWitch, … */
function skinDisplayName(skinFolder) {
  const raw = String(skinFolder || '').trim();
  if (isBaseSkinFolder(raw)) return 'Base';
  const m = raw.match(/^Skin\d+_(.+)$/i);
  if (m) return m[1].replace(/_/g, ' ');
  return raw.replace(/_/g, ' ');
}

function findVoxDir(skinPath) {
  if (!fs.existsSync(skinPath)) return null;
  const hit = fs
    .readdirSync(skinPath, { withFileTypes: true })
    .find((e) => e.isDirectory() && /^vox$/i.test(e.name));
  return hit ? path.join(skinPath, hit.name) : null;
}

function findClipFile(voxDir, logicalName) {
  if (!voxDir || !fs.existsSync(voxDir)) return null;
  const want = String(logicalName).toLowerCase();
  const files = fs.readdirSync(voxDir);
  return files.find((f) => f.toLowerCase() === want) || null;
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

const folderToGod = new Map();
for (const name of godNames) {
  folderToGod.set(folderName(name), name);
  folderToGod.set(norm(folderName(name)), name);
}
for (const [god, folder] of Object.entries(GOD_FOLDER_MAP)) {
  folderToGod.set(folder, god);
  folderToGod.set(norm(folder), god);
}

function resolveGodFromFolder(godFolder) {
  return (
    folderToGod.get(godFolder) ||
    folderToGod.get(norm(godFolder)) ||
    folderToGod.get(godFolder.replace(/_/g, ' ')) ||
    godNames.find((n) => norm(n) === norm(godFolder)) ||
    null
  );
}

/** Scan VoiceAudio/{god}/{skin}/VOX for Intro/Select/Taunt/Joke (any casing). */
const voiceClips = [];
if (fs.existsSync(VOICE_ROOT)) {
  for (const ent of fs.readdirSync(VOICE_ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const godFolder = ent.name;
    const god = resolveGodFromFolder(godFolder);
    if (!god) continue;
    const godPath = path.join(VOICE_ROOT, godFolder);
    for (const skinEnt of fs.readdirSync(godPath, { withFileTypes: true })) {
      if (!skinEnt.isDirectory()) continue;
      const skinFolder = skinEnt.name;
      const voxDir = findVoxDir(path.join(godPath, skinFolder));
      if (!voxDir) continue;
      const skinLabel = skinDisplayName(skinFolder);
      for (const clip of CLIP_FILES) {
        const file = findClipFile(voxDir, clip.file);
        if (!file) continue;
        voiceClips.push({
          god,
          skin: skinLabel,
          skinFolder,
          kind: clip.kind,
          url: voiceUrl(godFolder, skinFolder, file),
        });
      }
    }
  }
}
voiceClips.sort(
  (a, b) =>
    a.god.localeCompare(b.god) ||
    String(a.skinFolder || '').localeCompare(String(b.skinFolder || '')) ||
    a.kind.localeCompare(b.kind)
);

if (!voiceClips.length) {
  // Fallback: synthetic Skin00_Base URLs if VoiceAudio tree is missing locally
  godNames.forEach((god, i) => {
    const clip = CLIP_FILES[i % CLIP_FILES.length];
    voiceClips.push({
      god,
      skin: 'Base',
      skinFolder: 'Skin00_Base',
      kind: clip.kind,
      url: voiceUrl(folderName(god), 'Skin00_Base', clip.file),
    });
  });
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
let prevAbilitySounds = [];
if (fs.existsSync(destMedia)) {
  try {
    const prev = JSON.parse(fs.readFileSync(destMedia, 'utf8'));
    if (Array.isArray(prev.abilitySounds)) prevAbilitySounds = prev.abilitySounds;
  } catch {
    /* keep empty */
  }
}

/** Prefer screenshot map names, then OCR extract; always key media by screenshot filename. */
function loadExtractedSkinNames() {
  const byKey = new Map();
  const mapPath = path.join(ROOT, 'app/data/God Information/Skins/_godRenderScreenshotMap.json');
  if (fs.existsSync(mapPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      for (const [folder, files] of Object.entries(data.gods || {})) {
        for (const [fileName, row] of Object.entries(files || {})) {
          const file = String(row.fileName || fileName || '').trim();
          if (!file) continue;
          const skinName = String(
            row.variantName || row.displayName || row.skinName || row.appliedTo || ''
          ).trim();
          if (!skinName || skinName === '. SKIN') continue;
          byKey.set(`${norm(folder)}|${norm(file)}`, {
            god: String(row.godName || '').trim(),
            skinName,
            file,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
  const extractedPath = path.join(ROOT, 'app/data/God Information/Skins/_godRendersExtracted.json');
  if (!fs.existsSync(extractedPath)) return byKey;
  try {
    const data = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
    for (const row of data.results || []) {
      const god = String(row.godName || '').trim();
      for (const ex of row.extractions || []) {
        const shot = String(ex.screenshot || ex.loadout?.screenshot || '').replace(/\\/g, '/');
        if (!shot) continue;
        const file = path.basename(shot);
        const folder = path.basename(path.dirname(shot));
        const key = `${norm(folder)}|${norm(file)}`;
        if (byKey.has(key)) continue;
        const skinName = String(ex.displayName || ex.parentSkinName || '').trim();
        if (!skinName || skinName === '. SKIN') continue;
        byKey.set(key, {
          god: String(ex.godName || god || '').trim(),
          skinName,
          file,
        });
      }
    }
  } catch {
    /* ignore bad extract file */
  }
  return byKey;
}

function godFromRenderFolder(folder) {
  const raw = String(folder || '').trim();
  if (!raw) return null;
  return (
    folderToGod.get(raw) ||
    folderToGod.get(norm(raw)) ||
    folderToGod.get(raw.replace(/\s+/g, '_')) ||
    folderToGod.get(norm(raw.replace(/\s+/g, ''))) ||
    godNames.find((n) => norm(n) === norm(raw)) ||
    null
  );
}

/** NewGodSkins folder aliases that don't norm-match Smite2Gods names. */
const NEWGODSKINS_FOLDER_ALIASES = {
  Bari: 'Princess Bari',
  Mulan: 'Hua Mulan',
  Isis: 'Eset',
};

function godFromNewGodSkinsFolder(folder) {
  const raw = String(folder || '').trim();
  if (!raw || raw.startsWith('_')) return null;
  if (NEWGODSKINS_FOLDER_ALIASES[raw]) return NEWGODSKINS_FOLDER_ALIASES[raw];
  return godFromRenderFolder(raw);
}

function newGodSkinMediaUrl(godFolder, ...parts) {
  const segs = ['NewGodSkins', godFolder, ...parts].map((p) => encodeURIComponent(p));
  return `${ASSETS}/${segs.join('/')}`;
}

function pickPrimarySkinCardFile(files) {
  const pngs = (files || []).filter((f) => /\.png$/i.test(f));
  // Prefer full SkinCard (not prism / icon / portrait)
  const cards = pngs.filter(
    (f) => /SkinCard/i.test(f) && !/Prism|_P[1-4]\b|_T\d_/i.test(f)
  );
  if (cards.length) {
    cards.sort((a, b) => a.length - b.length || a.localeCompare(b));
    return cards[0];
  }
  const portrait = pngs.find((f) => /GodPortrait/i.test(f) && !/Prism/i.test(f));
  return portrait || null;
}

function skinDisplayFromFolder(skinFolder) {
  return String(skinFolder || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

/**
 * Prefer NewGodSkins/{God}/Skins/{Skin}/t_SkinCard_*.png (non-Mastery).
 * Include Default GodCard only as fallback when a god has no alt skins.
 * Falls back to God Renders if NewGodSkins yields nothing.
 */
function buildSkinCardsFromNewGodSkins() {
  const root = path.join(ROOT, 'app/data/NewGodSkins');
  const cards = [];
  if (!fs.existsSync(root)) return cards;

  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('_')) continue;
    const godFolder = ent.name;
    const god = godFromNewGodSkinsFolder(godFolder);
    if (!god) continue;
    const godPath = path.join(root, godFolder);
    const skinsRoot = path.join(godPath, 'Skins');
    let addedSkinned = 0;

    if (fs.existsSync(skinsRoot)) {
      for (const skinEnt of fs.readdirSync(skinsRoot, { withFileTypes: true })) {
        if (!skinEnt.isDirectory()) continue;
        const skinFolder = skinEnt.name;
        if (/^mastery/i.test(skinFolder) || /^prisms?$/i.test(skinFolder)) continue;
        const skinPath = path.join(skinsRoot, skinFolder);
        let files = [];
        try {
          files = fs.readdirSync(skinPath);
        } catch {
          continue;
        }
        const file = pickPrimarySkinCardFile(files);
        if (!file) continue;
        cards.push({
          god,
          skinName: skinDisplayFromFolder(skinFolder),
          skinFolder,
          file,
          source: 'NewGodSkins',
          isDefault: false,
          url: newGodSkinMediaUrl(godFolder, 'Skins', skinFolder, file),
        });
        addedSkinned += 1;
      }
    }

    // Default card only when this god has no alt skin cards (still need variety)
    if (addedSkinned === 0) {
      const defDir = path.join(godPath, 'Default');
      if (fs.existsSync(defDir)) {
        const files = fs.readdirSync(defDir);
        const file =
          files.find((f) => /GodCard/i.test(f) && /\.png$/i.test(f)) ||
          files.find((f) => /GodPortrait/i.test(f) && /\.png$/i.test(f));
        if (file) {
          cards.push({
            god,
            skinName: 'Default',
            skinFolder: 'Default',
            file,
            source: 'NewGodSkins',
            isDefault: true,
            url: newGodSkinMediaUrl(godFolder, 'Default', file),
          });
        }
      }
    }
  }
  return cards;
}

function godRenderMediaUrl(folder, file) {
  const parts = ['God Renders', folder, file].map((p) => encodeURIComponent(p));
  return `${ASSETS}/${parts.join('/')}`;
}

function buildSkinCardsFromGodRenders() {
  const rendersRoot = path.join(ROOT, 'app/data/God Renders');
  const extracted = loadExtractedSkinNames();
  const cards = [];
  if (!fs.existsSync(rendersRoot)) return cards;
  for (const ent of fs.readdirSync(rendersRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const folder = ent.name;
    const god = godFromRenderFolder(folder);
    if (!god) continue;
    const dir = path.join(rendersRoot, folder);
    for (const file of fs.readdirSync(dir)) {
      if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
      const hit = extracted.get(`${norm(folder)}|${norm(file)}`);
      cards.push({
        god: hit?.god || god,
        skinName: hit?.skinName || path.parse(file).name,
        file,
        source: 'GodRenders',
        isDefault: false,
        url: godRenderMediaUrl(folder, file),
      });
    }
  }
  return cards;
}

const skinCardsFromNew = buildSkinCardsFromNewGodSkins();
const skinCards = skinCardsFromNew.length ? skinCardsFromNew : buildSkinCardsFromGodRenders();
const finalAbilitySounds = abilitySounds.length ? abilitySounds : prevAbilitySounds;

fs.writeFileSync(
  destMedia,
  `${JSON.stringify({ voiceClips, skinCards, abilitySounds: finalAbilitySounds }, null, 2)}\n`
);

const destMeta = path.join(ROOT, 'formative-web/src/lib/triviaGodMeta.json');
fs.writeFileSync(destMeta, `${JSON.stringify(meta, null, 2)}\n`);

const skinnedVoice = voiceClips.filter((c) => !isBaseSkinFolder(c.skinFolder)).length;
const skinnedSkinCards = skinCards.filter((c) => !c.isDefault && !/\/Default\//i.test(c.url)).length;
console.log(
  `Wrote ${voiceClips.length} voice clips (${skinnedVoice} non-base), ${finalAbilitySounds.length} ability sounds (Activate/Start under Skin00_Base Ability1–4), ${skinCards.length} skin cards (${skinnedSkinCards} non-default; source=${skinCards[0]?.source || 'none'}), ${Object.keys(meta).length} god meta rows`
);
