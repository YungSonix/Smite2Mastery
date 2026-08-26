/**
 * Skin preview VOX — random VGS / ability lines from GitHub `VoiceAudio/<god>/<skin>/…`.
 * Manifest: `lib/voxSkinManifest.generated.js` (run `npm run vox:manifest`).
 */
import { createAudioPlayer } from 'expo-audio';
import { ICON_PATHS, NETWORK_TIMINGS_MS } from '../config';
import { VOX_SKIN_MANIFEST } from './voxSkinManifest.generated';
import { resetVoxForNavigation } from './prophecyAudio';

const PLAYBACK_STATUS_UPDATE = 'playbackStatusUpdate';
const VOX_GITHUB_BASE = ICON_PATHS.VOICE_AUDIO;

/** VGS emotes + ability/passive cast lines in VOX (excludes grunts, death, kill streaks). */
const SKIN_VOX_PREVIEW_RE =
  /^(Ability_[0-9]+[a-z]|Passive_[0-9]+[a-z]|Joke_|Laugh_|Taunt_|Intro_|Select|Ward_Placed_|Purchase_)/i;

const lastSkinVoxKey = { current: '' };
const lastSkinVoxEntryKey = { current: '' };

function normalizeSkinToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function stripGodKey(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  return k.startsWith('God.') ? k.slice(4) : k;
}

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

const GOD_KEY_SUFFIX_TO_FOLDER = {
  NeZha: 'Ne Zha',
  DaJi: 'Da_Ji',
};

export function resolveGodVoiceFolder(displayName, opts = {}) {
  const name = String(displayName || '').trim();
  const suffix = stripGodKey(opts.godKey);
  if (suffix && GOD_KEY_SUFFIX_TO_FOLDER[suffix]) {
    return GOD_KEY_SUFFIX_TO_FOLDER[suffix];
  }
  if (name && GOD_FOLDER_MAP[name]) {
    return GOD_FOLDER_MAP[name];
  }
  if (suffix && /^[A-Za-z][A-Za-z0-9]*$/.test(suffix)) {
    if (VOX_SKIN_MANIFEST[suffix]) return suffix;
    const underscored = suffix.replace(/([a-z])([A-Z])/g, '$1_$2');
    if (VOX_SKIN_MANIFEST[underscored]) return underscored;
  }
  if (name) {
    const underscored = name.replace(/\s+/g, '_');
    if (VOX_SKIN_MANIFEST[underscored]) return underscored;
  }
  return name ? name.replace(/\s+/g, '_') : '';
}

function extractSkinPathSegment(skin) {
  const p = skin?.cardArt || skin?.card_art || skin?.skin || skin?.icon || '';
  const m = String(p).match(/\/Skins\/([^/]+)\//i);
  return m ? m[1] : '';
}

function isBaseSkinRow(skinKey, skin, godDisplayName) {
  const type = String(skin?.type || '').toLowerCase();
  const name = String(skin?.name || '').toLowerCase();
  const godNorm = normalizeSkinToken(godDisplayName);
  const keyNorm = normalizeSkinToken(skinKey);
  if (type.includes('base')) return true;
  if (name.startsWith('base ')) return true;
  if (godNorm && keyNorm && (keyNorm === godNorm || keyNorm.includes(godNorm) || godNorm.includes(keyNorm))) {
    return true;
  }
  const segment = extractSkinPathSegment(skin);
  if (!segment || /default/i.test(segment)) return true;
  return false;
}

function skinHasAudio(manifestEntry) {
  const subfolders = manifestEntry?.subfolders;
  return subfolders && Object.keys(subfolders).some((k) => subfolders[k]?.files?.length);
}

function isAbilitySubfolder(name) {
  return /^Ability/i.test(String(name || '')) || /^Fox/i.test(String(name || ''));
}

function isPreviewSubfolder(subfolder) {
  const key = String(subfolder || '');
  if (key === 'VGS' || key === 'VOX') return true;
  return isAbilitySubfolder(key);
}

function shouldIncludeFile(subfolder, filename) {
  if (subfolder === 'VGS' || isAbilitySubfolder(subfolder)) return true;
  if (subfolder === 'VOX') return SKIN_VOX_PREVIEW_RE.test(String(filename || ''));
  return false;
}

function entryKey(subfolder, filename) {
  return `${subfolder}/${filename}`;
}

function collectPreviewEntries(subfolders) {
  const entries = [];
  if (!subfolders || typeof subfolders !== 'object') return entries;
  for (const subfolder of Object.keys(subfolders)) {
    if (!isPreviewSubfolder(subfolder)) continue;
    for (const name of subfolders[subfolder]?.files || []) {
      if (!name || !shouldIncludeFile(subfolder, name)) continue;
      entries.push({ subfolder, name });
    }
  }
  return entries;
}

/** Map a builds.json skin row to a `VoiceAudio/<god>/<SkinFolder>/…` folder name. */
export function resolveSkinVoiceFolder(godVoiceFolder, skinKey, skin, godDisplayName = '') {
  const manifestEntry = VOX_SKIN_MANIFEST[godVoiceFolder];
  if (!manifestEntry || typeof manifestEntry !== 'object') return null;

  const folders = Object.keys(manifestEntry).filter((f) => skinHasAudio(manifestEntry[f]));
  if (!folders.length) return null;

  const explicit =
    skin?.voiceSkinFolder ||
    skin?.voice_skin_folder ||
    skin?.voxSkinFolder ||
    skin?.vox_skin_folder;
  if (explicit) {
    const hit = folders.find((f) => f.toLowerCase() === String(explicit).toLowerCase());
    if (hit) return hit;
  }

  if (isBaseSkinRow(skinKey, skin, godDisplayName)) {
    const base =
      folders.find((f) => /^skin00_/i.test(f)) ||
      folders.find((f) => /base/i.test(f));
    if (base) return base;
  }

  const segment = extractSkinPathSegment(skin);
  const tokens = [segment, skinKey, skin?.name]
    .map(normalizeSkinToken)
    .filter(Boolean);

  let best = null;
  let bestScore = 0;
  for (const folder of folders) {
    if (/^skin00_/i.test(folder)) continue;
    const folderToken = normalizeSkinToken(folder.replace(/^skin\d+[a-z]?_/i, ''));
    if (!folderToken) continue;
    for (const t of tokens) {
      if (!t) continue;
      if (folderToken === t) {
        return folder;
      }
      if (folderToken.includes(t) || t.includes(folderToken)) {
        const score = Math.min(folderToken.length, t.length);
        if (score > bestScore) {
          bestScore = score;
          best = folder;
        }
      }
    }
  }
  if (best) return best;

  return folders.find((f) => /^skin00_/i.test(f)) || folders[0] || null;
}

function pickRandomPreviewEntry(entries, avoidKey) {
  if (!entries.length) return null;
  const last = lastSkinVoxKey.current === avoidKey ? lastSkinVoxEntryKey.current : '';
  const candidates = entries.filter((e) => entryKey(e.subfolder, e.name) !== last);
  const pickFrom = candidates.length ? candidates : entries;
  const idx = Math.floor(Math.random() * pickFrom.length);
  return pickFrom[idx];
}

function buildSkinVoiceUrl(godFolder, skinFolder, subfolder, filename) {
  const encodedGod = encodeURIComponent(godFolder).replace(/%2F/g, '/');
  const encodedSkin = encodeURIComponent(skinFolder).replace(/%2F/g, '/');
  const encodedSub = encodeURIComponent(subfolder).replace(/%2F/g, '/');
  return `${VOX_GITHUB_BASE}/${encodedGod}/${encodedSkin}/${encodedSub}/${encodeURIComponent(filename)}`;
}

export function getSkinVoxPreviewPool(godDisplayName, godKey, skinKey, skin) {
  const godFolder = resolveGodVoiceFolder(godDisplayName, { godKey });
  if (!godFolder) return [];
  const skinFolder = resolveSkinVoiceFolder(godFolder, skinKey, skin, godDisplayName);
  if (!skinFolder) return [];
  const subfolders = VOX_SKIN_MANIFEST[godFolder]?.[skinFolder]?.subfolders || {};
  return collectPreviewEntries(subfolders).map((e) => entryKey(e.subfolder, e.name));
}

export function hasSkinVoxPreview(godDisplayName, godKey, skinKey, skin) {
  return getSkinVoxPreviewPool(godDisplayName, godKey, skinKey, skin).length > 0;
}

/** Human-readable label from a VoiceAudio filename (e.g. `VOX_VGS_Attack_1.WAV` → `Attack 1`). */
export function formatSkinVoxLineLabel(filename) {
  let label = String(filename || '').replace(/\.(wav|WAV)$/i, '');
  label = label.replace(/^VOX_VGS_/i, '').replace(/^VOX_/i, '');
  label = label.replace(/_/g, ' ').trim();
  if (!label) return String(filename || '').replace(/\.(wav|WAV)$/i, '');
  return label.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function buildLineEntry(godFolder, skinFolder, subfolder, filename) {
  return {
    subfolder,
    filename,
    label: formatSkinVoxLineLabel(filename),
    url: buildSkinVoiceUrl(godFolder, skinFolder, subfolder, filename),
    key: entryKey(subfolder, filename),
  };
}

function sortLines(lines) {
  return [...lines].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

/**
 * Per-skin voiceline groups for UI lists (VGS, filtered VOX, ability subfolders).
 * @returns {{ godFolder: string, skinFolder: string, groups: Array<{ id: string, lines: object[] }> }}
 */
export function getSkinVoxLineGroups(godDisplayName, godKey, skinKey, skin) {
  const godFolder = resolveGodVoiceFolder(godDisplayName, { godKey });
  if (!godFolder) return { godFolder: '', skinFolder: '', groups: [] };
  const skinFolder = resolveSkinVoiceFolder(godFolder, skinKey, skin, godDisplayName);
  if (!skinFolder) return { godFolder, skinFolder: '', groups: [] };

  const subfolders = VOX_SKIN_MANIFEST[godFolder]?.[skinFolder]?.subfolders || {};
  const groups = [];

  const vgsFiles = subfolders.VGS?.files || [];
  if (vgsFiles.length) {
    groups.push({
      id: 'VGS',
      lines: sortLines(vgsFiles.map((f) => buildLineEntry(godFolder, skinFolder, 'VGS', f))),
    });
  }

  const voxFiles = (subfolders.VOX?.files || []).filter((f) => SKIN_VOX_PREVIEW_RE.test(String(f || '')));
  if (voxFiles.length) {
    groups.push({
      id: 'VOX',
      lines: sortLines(voxFiles.map((f) => buildLineEntry(godFolder, skinFolder, 'VOX', f))),
    });
  }

  for (const subfolder of Object.keys(subfolders).sort()) {
    if (subfolder === 'VGS' || subfolder === 'VOX' || !isAbilitySubfolder(subfolder)) continue;
    const files = subfolders[subfolder]?.files || [];
    if (!files.length) continue;
    groups.push({
      id: subfolder,
      lines: sortLines(files.map((f) => buildLineEntry(godFolder, skinFolder, subfolder, f))),
    });
  }

  return { godFolder, skinFolder, groups };
}

async function playSkinVoiceUri(uri, avoidKey, lineKey) {
  resetVoxForNavigation();
  try {
    const player = createAudioPlayer({ uri }, { updateInterval: NETWORK_TIMINGS_MS.VOX_UPDATE_INTERVAL });
    player.volume = 0.92;
    await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try {
          player.remove();
        } catch (_) {
          /* ignore */
        }
        resolve();
      };
      const sub = player.addListener(PLAYBACK_STATUS_UPDATE, (status) => {
        if (status?.didJustFinish) finish();
      });
      player.play();
      setTimeout(finish, NETWORK_TIMINGS_MS.VOX_CLEANUP_TIMEOUT);
      setTimeout(() => {
        try {
          sub?.remove?.();
        } catch (_) {
          /* ignore */
        }
      }, NETWORK_TIMINGS_MS.VOX_CLEANUP_TIMEOUT + 100);
    });
    if (avoidKey) lastSkinVoxKey.current = avoidKey;
    if (lineKey) lastSkinVoxEntryKey.current = lineKey;
    return true;
  } catch {
    return false;
  }
}

/** Play one specific voiceline for the skin. Returns false when playback fails. */
export async function playSkinVoxLine(godDisplayName, godKey, skinKey, skin, subfolder, filename) {
  const godFolder = resolveGodVoiceFolder(godDisplayName, { godKey });
  if (!godFolder) return false;
  const skinFolder = resolveSkinVoiceFolder(godFolder, skinKey, skin, godDisplayName);
  if (!skinFolder) return false;

  const uri = buildSkinVoiceUrl(godFolder, skinFolder, subfolder, filename);
  const avoidKey = `${godFolder}::${skinFolder}`;
  return playSkinVoiceUri(uri, avoidKey, entryKey(subfolder, filename));
}

/**
 * Play one random VGS or ability voiceline for the current skin. Returns false when nothing to play.
 */
export async function playRandomSkinVox(godDisplayName, godKey, skinKey, skin) {
  const godFolder = resolveGodVoiceFolder(godDisplayName, { godKey });
  if (!godFolder) return false;
  const skinFolder = resolveSkinVoiceFolder(godFolder, skinKey, skin, godDisplayName);
  if (!skinFolder) return false;

  const subfolders = VOX_SKIN_MANIFEST[godFolder]?.[skinFolder]?.subfolders || {};
  const entries = collectPreviewEntries(subfolders);
  const avoidKey = `${godFolder}::${skinFolder}`;
  const pick = pickRandomPreviewEntry(entries, avoidKey);
  if (!pick) return false;

  const uri = buildSkinVoiceUrl(godFolder, skinFolder, pick.subfolder, pick.name);
  return playSkinVoiceUri(uri, avoidKey, entryKey(pick.subfolder, pick.name));
}

const FOLDER_TO_GOD_NAME = Object.fromEntries(
  Object.entries(GOD_FOLDER_MAP).map(([name, folder]) => [folder, name])
);

export function godFolderToDisplayName(godFolder) {
  if (FOLDER_TO_GOD_NAME[godFolder]) return FOLDER_TO_GOD_NAME[godFolder];
  return String(godFolder || '').replace(/_/g, ' ');
}

function matchVgsFilename(files, wanted) {
  const w = String(wanted || '').toLowerCase();
  return (files || []).find((f) => String(f).toLowerCase() === w) || null;
}

export function findSkinFolderWithVgsFile(godFolder, filename) {
  const skins = VOX_SKIN_MANIFEST[godFolder];
  if (!skins || typeof skins !== 'object') return { skinFolder: null, actualFile: null };
  const names = Object.keys(skins);
  const ordered = [
    ...names.filter((n) => /^skin00_/i.test(n)),
    ...names.filter((n) => !/^skin00_/i.test(n)),
  ];
  for (const skinFolder of ordered) {
    const files = skins[skinFolder]?.subfolders?.VGS?.files || [];
    const actualFile = matchVgsFilename(files, filename);
    if (actualFile) return { skinFolder, actualFile };
  }
  return { skinFolder: null, actualFile: null };
}

export function listGodFoldersWithVgsFile(filename) {
  return Object.keys(VOX_SKIN_MANIFEST).filter((godFolder) =>
    Boolean(findSkinFolderWithVgsFile(godFolder, filename).skinFolder)
  );
}

export function pickRandomGodForVgsFile(filename) {
  const gods = listGodFoldersWithVgsFile(filename);
  if (!gods.length) return null;
  const godFolder = gods[Math.floor(Math.random() * gods.length)];
  return { godFolder, displayName: godFolderToDisplayName(godFolder) };
}

/** Play a VGS WAV from the GitHub assets VoiceAudio tree. */
export async function playVgsFile(godFolder, filename) {
  const { skinFolder, actualFile } = findSkinFolderWithVgsFile(godFolder, filename);
  if (!skinFolder || !actualFile) return false;
  const uri = buildSkinVoiceUrl(godFolder, skinFolder, 'VGS', actualFile);
  const avoidKey = `${godFolder}::${skinFolder}`;
  return playSkinVoiceUri(uri, avoidKey, entryKey('VGS', actualFile));
}
