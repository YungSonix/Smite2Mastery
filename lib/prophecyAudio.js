import { Audio } from 'expo-av';
import VOX_MANIFEST from './voxManifest.generated';

function normalizeKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function categoryPrefix(category) {
  const c = String(category || '').toLowerCase();
  if (c === 'intro') return 'Intro_';
  if (c === 'gruntattack' || c === 'attack') return 'GruntAttack_';
  if (c === 'grunthit' || c === 'hit') return 'GruntHit_';
  if (c === 'health_low' || c === 'healthlow' || c === 'low') return 'Health_Low_';
  if (c === 'kill') return 'Kill_';
  if (c === 'taunt') return 'Taunt_';
  if (c === 'victory' || c === 'win') return 'Victory_';
  if (c === 'defeat' || c === 'lose') return 'Defeat_';
  return null;
}

function pickRandom(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function getEntryForGod(godName) {
  const key = normalizeKey(godName);
  if (VOX_MANIFEST[key]) return VOX_MANIFEST[key];
  const noSpace = key.replace(/\s+/g, '');
  if (VOX_MANIFEST[noSpace]) return VOX_MANIFEST[noSpace];
  return null;
}

export async function playVOX(godName, category) {
  try {
    const entry = getEntryForGod(godName);
    if (!entry) return false;
    const prefix = categoryPrefix(category);
    if (!prefix) return false;

    const candidates = entry.files.filter((f) => {
      const lower = f.name.toLowerCase();
      return lower.startsWith(prefix.toLowerCase()) && /\.(wav|mp3|m4a)$/i.test(f.name);
    });

    const picked = pickRandom(candidates);
    if (!picked) return false;

    const { sound } = await Audio.Sound.createAsync(picked.source, {
      shouldPlay: true,
      volume: 0.9,
      isLooping: false,
    });

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status?.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });

    return true;
  } catch {
    // Silent fallback by design for missing/unsupported files.
    return false;
  }
}

export default playVOX;
