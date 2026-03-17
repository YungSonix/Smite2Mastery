/**
 * Lists gods that don't have default (Skin00_Base) voice audio so you can add them to GitHub.
 * Run from repo root: node scripts/list-missing-voice-gods.js
 *
 * Uses: Prophecy leaders + units, and optionally all gods from app/data/builds.json.
 * Checks: app/data/VoiceAudio/{GodFolder}/Skin00_Base/VOX (or app/data/Voice Audio/).
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dataDir = path.join(root, 'app', 'data');
const voiceRoot =
  fs.existsSync(path.join(dataDir, 'VoiceAudio'))
    ? path.join(dataDir, 'VoiceAudio')
    : path.join(dataDir, 'Voice Audio');

// App display name -> folder name on disk/GitHub (when they differ)
const GOD_FOLDER_MAP = {
  'Guan Yu': 'Guan_Yu',
  'Jing Wei': 'JingWei',
  'Sun Wukong': 'SunWukong',
  'Ne Zha': 'Ne Zha',
  'Da Ji': 'Da_Ji',
  'The Morrigan': 'The_Morrigan',
  'Nu Wa': 'NuWa',
  'Hou Yi': 'HouYi',
};

function getFolderName(godName) {
  const n = String(godName || '').trim();
  if (GOD_FOLDER_MAP[n]) return GOD_FOLDER_MAP[n];
  return n.replace(/\s+/g, '_');
}

function getProphecyGodNames() {
  const leaders = [
    'Zeus', 'Thor', 'Athena', 'Loki', 'Poseidon', 'Odin', 'Susano', 'Thanatos',
    'Bellona', 'Merlin',
  ];
  const units = [
    'Anhur', 'Chaac', 'Hades', 'Neith', 'Ymir', 'Apollo', 'Artio', 'Jing Wei', 'Kali', 'Sobek', 'Sun Wukong',
    'Da Ji', 'Izanami', 'Medusa', 'Sol', 'Achilles', 'Amaterasu', 'Artemis', 'Merlin', 'Agni', 'Cerberus', 'Guan Yu', 'Kukulkan',
  ];
  const set = new Set([...leaders, ...units]);
  return Array.from(set);
}

function getBuildsJsonGodNames() {
  const buildsPath = path.join(dataDir, 'builds.json');
  if (!fs.existsSync(buildsPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(buildsPath, 'utf8'));
    const gods = data.gods || data;
    if (!Array.isArray(gods)) return [];
    return gods.map((g) => (typeof g === 'string' ? g : (g.name || g.id || g.godName || ''))).filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const fromProphecy = getProphecyGodNames();
  const fromBuilds = getBuildsJsonGodNames();
  const allNames = Array.from(new Set([...fromProphecy, ...fromBuilds])).sort((a, b) => a.localeCompare(b));

  if (!fs.existsSync(voiceRoot)) {
    console.log('Voice root not found:', voiceRoot);
    console.log('All app gods are missing default voice (no local VoiceAudio folder).');
    console.log('\nGods to add to GitHub (Prophecy + builds):');
    allNames.forEach((n) => console.log('  -', n));
    return;
  }

  const missing = [];
  const hasVoice = [];

  for (const name of allNames) {
    const folder = getFolderName(name);
    const skinDir = path.join(voiceRoot, folder, 'Skin00_Base');
    const voxDir = path.join(skinDir, 'VOX');
    const hasBase = fs.existsSync(skinDir) && fs.existsSync(voxDir);
    if (hasBase) {
      hasVoice.push({ name, folder });
    } else {
      missing.push({ name, folder });
    }
  }

  console.log('=== Gods missing default (Skin00_Base) voice ===');
  console.log('Voice root:', voiceRoot);
  console.log('Gods checked (Prophecy + builds.json):', allNames.length);
  console.log('Have Skin00_Base/VOX:', hasVoice.length);
  console.log('Missing (add these to GitHub):', missing.length);
  console.log('');

  if (missing.length) {
    console.log('Missing default voice — add to GitHub:');
    missing.forEach(({ name, folder }) => console.log(`  ${name}  (folder: ${folder})`));
    console.log('');
    console.log('GitHub path pattern: app/data/VoiceAudio/{folder}/Skin00_Base/VOX/*.WAV');
  } else {
    console.log('All checked gods have Skin00_Base voice.');
  }

  if (hasVoice.length && process.argv.includes('--list-has')) {
    console.log('\nHas default voice:');
    hasVoice.forEach(({ name, folder }) => console.log(`  ${name}  (${folder})`));
  }
}

main();
