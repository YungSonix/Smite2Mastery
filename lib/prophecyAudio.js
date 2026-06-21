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
  'Baron Samedi': 'BaronSamedi',
  'Hun Batz': 'HunBatz',
};

/** `God.*` key suffix (after `God.`) -> VoiceAudio folder when it is not plain PascalCase */
const GOD_KEY_SUFFIX_TO_FOLDER = {
  NeZha: 'Ne Zha',
};

function stripGodKey(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  return k.startsWith('God.') ? k.slice(4) : k;
}

/**
 * Resolves the `VoiceAudio/<folder>/Skin00_Base/VOX` folder segment.
 * Prefers `God.*` key when present (matches repo layout), then display-name map, then spaced→underscore fallback.
 */
function resolveVoiceFolder(displayName, opts = {}) {
  const name = String(displayName || '').trim();
  const suffix = stripGodKey(opts.godKey);
  if (suffix && GOD_KEY_SUFFIX_TO_FOLDER[suffix]) {
    return GOD_KEY_SUFFIX_TO_FOLDER[suffix];
  }
  if (name && GOD_FOLDER_MAP[name]) {
    return GOD_FOLDER_MAP[name];
  }
  if (suffix && /^[A-Za-z][A-Za-z0-9]*$/.test(suffix)) {
    return suffix;
  }
  return getFolderName(name);
}

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

/** God lobby lines: default `Select.WAV`, then letter picks (`Select_a.WAV`…), then numbered (`Select_2`…). */
function buildSelectVoiceFilenames() {
  const out = [];
  const push = (name) => {
    if (name && !out.includes(name)) out.push(name);
  };
  push('Select.WAV');
  push('Select.wav');
  for (let i = 0; i < 26; i += 1) {
    const lo = String.fromCharCode(97 + i);
    const hi = String.fromCharCode(65 + i);
    push(`Select_${lo}.WAV`);
    push(`Select_${lo}.wav`);
    push(`Select_${hi}.WAV`);
    push(`Select_${hi}.wav`);
  }
  for (let n = 1; n <= 16; n += 1) {
    push(`Select_${n}.WAV`);
    push(`Select_${n}.wav`);
  }
  push('Selection.WAV');
  push('Selection.wav');
  return out;
}

function categoryToFilenames(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'select') {
    return buildSelectVoiceFilenames();
  }
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

function buildVoiceUrl(folderName, filename) {
  const folder = String(folderName || '').trim();
  const encoded = encodeURIComponent(folder).replace(/%2F/g, '/');
  return `${VOX_GITHUB_BASE}/${encoded}/Skin00_Base/VOX/${encodeURIComponent(filename)}`;
}

/** Call when leaving a god / VOX screen so the next line is not blocked or racing the previous player. */
export function resetVoxForNavigation() {
  lastTriggerKey = '';
  lastTriggerAt = 0;
  clearActiveVoice();
}

export async function playVOX(godName, category, opts = {}) {
  try {
    const categoryKey = String(category || '').toLowerCase();
    const bypassCooldownCategory = categoryKey === 'select' || categoryKey === 'intro';
    const folder = resolveVoiceFolder(godName, opts);
    const key = `${String(folder || '').toLowerCase()}::${categoryKey}`;
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

    /** Some gods ship an empty or invalid `Select.WAV` while `Select_a`… work — wait for real duration. */
    if (categoryKey === 'select') {
      for (const filename of toTry) {
        const uri = buildVoiceUrl(folder, filename);
        let player = null;
        let loadSub = null;
        try {
          player = createAudioPlayer({ uri }, { updateInterval: NETWORK_TIMINGS_MS.VOX_UPDATE_INTERVAL });
          player.volume = 0.9;
          const loadOk = await new Promise((resolve) => {
            let settled = false;
            const settle = (v) => {
              if (settled) return;
              settled = true;
              clearTimeout(tid);
              try {
                loadSub?.remove?.();
              } catch (_) {
                /* ignore */
              }
              resolve(v);
            };
            const tid = setTimeout(() => settle(false), 1400);
            loadSub = player.addListener(PLAYBACK_STATUS_UPDATE, (status) => {
              if (status?.isLoaded && Number(status.duration) > 0.03) settle(true);
            });
            player.play();
          });
          if (!loadOk) {
            try {
              player.remove();
            } catch (_) {
              /* ignore */
            }
            continue;
          }
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
          lastPlayedAtByKey[key] = Date.now();
          lastPlayedFilenameByKey[key] = filename;
          return true;
        } catch {
          try {
            player?.remove?.();
          } catch (_) {
            /* ignore */
          }
        }
      }
      return false;
    }

    for (const filename of toTry) {
      const uri = buildVoiceUrl(folder, filename);
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
