#!/usr/bin/env node
/**
 * Voice/skin identify catalog for Scroll Trivia remix.
 * Prefers Skin00_Base Intro / Select / Taunt / Joke over 1s VGS Attack macros.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data';

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
};

const CLIP_FILES = [
  { kind: 'intro', file: 'Intro_1.WAV' },
  { kind: 'select', file: 'Select.WAV' },
  { kind: 'taunt', file: 'Taunt_1.WAV' },
  { kind: 'joke', file: 'Joke_1.WAV' },
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
  };
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

const destMedia = path.join(ROOT, 'formative-web/src/lib/triviaMediaCatalog.json');
let skinCards = [];
if (fs.existsSync(destMedia)) {
  try {
    const prev = JSON.parse(fs.readFileSync(destMedia, 'utf8'));
    if (Array.isArray(prev.skinCards)) skinCards = prev.skinCards;
  } catch {
    /* keep empty */
  }
}

fs.writeFileSync(destMedia, `${JSON.stringify({ voiceClips, skinCards }, null, 2)}\n`);

const destMeta = path.join(ROOT, 'formative-web/src/lib/triviaGodMeta.json');
fs.writeFileSync(destMeta, `${JSON.stringify(meta, null, 2)}\n`);

console.log(
  `Wrote ${voiceClips.length} voice clips (${CLIP_FILES.map((c) => c.kind).join('/')}) and ${Object.keys(meta).length} god meta rows`
);
