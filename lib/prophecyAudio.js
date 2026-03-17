import { createAudioPlayer } from 'expo-audio';

const PLAYBACK_STATUS_UPDATE = 'playbackStatusUpdate';

// Load voice from your GitHub repo (no bundled assets = no Metro/push issues)
const VOX_GITHUB_BASE =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/VoiceAudio';

let activeVoicePlayer = null;
let activeVoiceSub = null;
let activeVoiceCleanupTimer = null;
let lastTriggerKey = '';
let lastTriggerAt = 0;
const VOX_DOUBLE_TAP_GUARD_MS = 90;
const VOX_SAME_GOD_CATEGORY_COOLDOWN_MS = 2500;
const lastPlayedAtByKey = Object.create(null);
const lastPlayedFilenameByKey = Object.create(null);

function clearActiveVoice() {
  if (activeVoiceCleanupTimer) {
    clearTimeout(activeVoiceCleanupTimer);
    activeVoiceCleanupTimer = null;
  }
  if (activeVoiceSub?.remove) {
    try { activeVoiceSub.remove(); } catch (_) {}
  }
  activeVoiceSub = null;
  if (activeVoicePlayer) {
    try { activeVoicePlayer.pause(); } catch (_) {}
    try { activeVoicePlayer.remove(); } catch (_) {}
  }
  activeVoicePlayer = null;
}

// App display name -> GitHub folder name (when they differ)
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

function categoryToFilenames(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'select') return ['Select.WAV', 'Select_1.WAV', 'Selection.WAV'];
  if (c === 'intro') return ['Intro_1.WAV', 'Intro_2.WAV'];
  if (c === 'gruntattack' || c === 'attack') return ['GruntAttack_1.WAV', 'GruntAttack_2.WAV', 'GruntAttack_3.WAV'];
  if (c === 'grunthit' || c === 'hit') return ['GruntHit_1.WAV', 'GruntHit_2.WAV', 'GruntHit_3.WAV'];
  if (c === 'health_low' || c === 'healthlow' || c === 'low') return ['Health_Low_1.WAV', 'Health_Low_2.WAV'];
  if (c === 'kill') return ['Kill_Streak_1.WAV', 'Kill_Streak_2.WAV', 'Death_1.WAV'];
  if (c === 'taunt') return ['Taunt_1.WAV', 'Taunt_2.WAV', 'Taunt_3.WAV'];
  if (c === 'victory' || c === 'win') return ['Victory_1.WAV', 'Joke_1.WAV'];
  if (c === 'defeat' || c === 'lose') return ['Defeat_1.WAV', 'Death_1.WAV'];
  return [];
}

function buildVoiceUrl(godName, filename) {
  const folder = getFolderName(godName);
  const encoded = encodeURIComponent(folder).replace(/%2F/g, '/');
  return `${VOX_GITHUB_BASE}/${encoded}/Skin00_Base/VOX/${encodeURIComponent(filename)}`;
}

export async function playVOX(godName, category) {
  try {
    const categoryKey = String(category || '').toLowerCase();
    const isSelectCategory = categoryKey === 'select';
    const key = `${String(godName || '').toLowerCase()}::${categoryKey}`;
    const now = Date.now();
    if (key === lastTriggerKey && now - lastTriggerAt < VOX_DOUBLE_TAP_GUARD_MS) {
      return false;
    }
    const lastPlayedAt = Number(lastPlayedAtByKey[key] || 0);
    if (!isSelectCategory && now - lastPlayedAt < VOX_SAME_GOD_CATEGORY_COOLDOWN_MS) {
      return false;
    }
    lastTriggerKey = key;
    lastTriggerAt = now;

    // Always restart voice playback so repeated clicks replay immediately.
    clearActiveVoice();
    const filenames = categoryToFilenames(category);
    if (!filenames.length) return false;

    const lastFilename = String(lastPlayedFilenameByKey[key] || '');
    const unique = Array.from(new Set(filenames));
    const preferred = unique.filter((name) => name !== lastFilename);
    const toTry = isSelectCategory
      ? (preferred.length ? preferred : unique)
      : (preferred.length ? preferred : unique).sort(() => Math.random() - 0.5);
    for (const filename of toTry) {
      const uri = buildVoiceUrl(godName, filename);
      try {
        const player = createAudioPlayer({ uri }, { updateInterval: 100 });
        player.volume = 0.9;
        const sub = player.addListener(PLAYBACK_STATUS_UPDATE, (status) => {
          if (status?.didJustFinish) {
            clearActiveVoice();
          }
        });
        activeVoicePlayer = player;
        activeVoiceSub = sub;
        activeVoiceCleanupTimer = setTimeout(() => {
          clearActiveVoice();
        }, 12000);
        player.play();
        lastPlayedAtByKey[key] = Date.now();
        lastPlayedFilenameByKey[key] = filename;
        return true;
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export default playVOX;
