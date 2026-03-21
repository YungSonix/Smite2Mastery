import { createAudioPlayer } from 'expo-audio';
import { ICON_PATHS, NETWORK_TIMINGS_MS } from '../config';

const PLAYBACK_STATUS_UPDATE = 'playbackStatusUpdate';

// Load voice from your GitHub repo (no bundled assets = no Metro/push issues)
const VOX_GITHUB_BASE = ICON_PATHS.VOICE_AUDIO;

let activeVoicePlayer = null;
let activeVoiceSub = null;
let activeVoiceCleanupTimer = null;
let lastTriggerKey = '';
let lastTriggerAt = 0;
const VOX_DOUBLE_TAP_GUARD_MS = NETWORK_TIMINGS_MS.VOX_DOUBLE_TAP_GUARD;
const VOX_SAME_GOD_CATEGORY_COOLDOWN_MS = NETWORK_TIMINGS_MS.VOX_SAME_CATEGORY_COOLDOWN;
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

function shuffleList(values) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getNumberedVariants(baseName, maxVariant = 4, fallbackFirst = false) {
  const fallBack = `${baseName}_1.WAV`;
  const variants = [];
  for (let i = 2; i <= maxVariant; i += 1) {
    variants.push(`${baseName}_${i}.WAV`);
  }
  const randomPool = shuffleList(variants);
  return fallbackFirst ? [fallBack, ...randomPool] : [...randomPool, fallBack];
}

function categoryToFilenames(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'select') return ['Select.WAV', 'Select_1.WAV', 'Selection.WAV'];
  if (c === 'intro') return getNumberedVariants('Intro', 4, true);
  if (c === 'gruntattack' || c === 'attack') return getNumberedVariants('GruntAttack', 4);
  if (c === 'grunthit' || c === 'hit') return getNumberedVariants('GruntHit', 4);
  if (c === 'health_low' || c === 'healthlow' || c === 'low') return getNumberedVariants('Health_Low', 4);
  if (c === 'kill') return [...getNumberedVariants('Kill_Streak', 4), ...getNumberedVariants('Death', 4)];
  if (c === 'death' || c === 'die') return getNumberedVariants('Death', 4);
  if (c === 'purchase' || c === 'item' || c === 'equip') {
    return [...getNumberedVariants('Purchase_Recommended', 4), ...getNumberedVariants('Purchase_Consumable', 4)];
  }
  if (c === 'taunt') return getNumberedVariants('Taunt', 4);
  if (c === 'victory' || c === 'win') return [...getNumberedVariants('Victory', 4), ...getNumberedVariants('Joke', 4)];
  if (c === 'defeat' || c === 'lose') return [...getNumberedVariants('Defeat', 4), ...getNumberedVariants('Death', 4)];
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
    const bypassCooldownCategory = categoryKey === 'select' || categoryKey === 'intro';
    const key = `${String(godName || '').toLowerCase()}::${categoryKey}`;
    const now = Date.now();
    if (key === lastTriggerKey && now - lastTriggerAt < VOX_DOUBLE_TAP_GUARD_MS) {
      return false;
    }
    const lastPlayedAt = Number(lastPlayedAtByKey[key] || 0);
    if (!bypassCooldownCategory && now - lastPlayedAt < VOX_SAME_GOD_CATEGORY_COOLDOWN_MS) {
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
    const toTry = preferred.length ? preferred : unique;
    for (const filename of toTry) {
      const uri = buildVoiceUrl(godName, filename);
      try {
        const player = createAudioPlayer({ uri }, { updateInterval: NETWORK_TIMINGS_MS.VOX_UPDATE_INTERVAL });
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
        }, NETWORK_TIMINGS_MS.VOX_CLEANUP_TIMEOUT);
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
