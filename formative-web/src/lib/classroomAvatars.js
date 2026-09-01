import catalog from '@repo-lib/classroomAvatars.generated.json';
import {
  badgeUrl,
  badgeLabelFromFile,
  pickBadgeFileForDiscordKey,
} from './classroomBadges';
import { resolveMediaUrl } from './mediaUrl';

export const AVATAR_ENTRIES = catalog.entries || [];

/** localStorage — default ON (resolve skin icons from Skins JSON `icon` paths). */
export const SKIN_JSON_ICONS_STORAGE_KEY = 'classroom_avatar_use_skin_json_icons';

const KIND_LABELS = {
  all: 'All',
  badge: 'Badges',
  god: 'Gods',
  skin: 'Skins',
};

const GOD_PORTRAIT_SPECIAL = {
  'Guan Yu': 'Guan_Yu',
  'Hou Yi': 'Hou_Yi',
  'Hun Batz': 'Hun_Batz',
  'Ne Zha': 'Ne_Zha',
  'Sun Wukong': 'Sun_Wukong',
  'Da Ji': 'DaJi',
  'Hua Mulan': 'Mulan',
  'Princess Bari': 'Bari',
};

export { KIND_LABELS };

export function normAvatarSearch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getUseSkinJsonIcons() {
  try {
    const v = localStorage.getItem(SKIN_JSON_ICONS_STORAGE_KEY);
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

export function setUseSkinJsonIcons(on) {
  try {
    localStorage.setItem(SKIN_JSON_ICONS_STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** `app/data/NewGodSkins/...` → `/media/NewGodSkins/...` for trivia media resolver. */
export function appDataRefToMediaPath(ref) {
  const raw = String(ref || '').trim().replace(/\\/g, '/');
  if (!raw) return '';
  const rel = raw.replace(/^\/+/, '').replace(/^app\/data\//i, '');
  if (!rel) return '';
  return `/media/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

export function godPortraitUrlFromName(godName) {
  const name = String(godName || '').trim();
  if (!name) return null;
  if (name === 'Chronos') {
    return 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Info/chronosImage.webp';
  }
  const hit = AVATAR_ENTRIES.find((e) => e.kind === 'god' && e.ref === name);
  if (hit?.url) return hit.url;
  const special = GOD_PORTRAIT_SPECIAL[name];
  const folder = special || name.replace(/[^a-zA-Z0-9]/g, '');
  if (!folder) return null;
  const portraitFile =
    name === 'Da Ji' ? 't_GodPortrait_Daji.png' : `t_GodPortrait_${folder}.png`;
  const godFolder = special || folder;
  return resolveMediaUrl(`/media/NewGodSkins/${godFolder}/Default/${portraitFile}`);
}

/**
 * Resolve a skin avatar ref (Skins pantheon JSON `icon` path) to a loadable URL.
 * ON: `/media/…` + resolveMediaUrl (local proxy in dev; assets branch in prod).
 * OFF: pre-baked manifest GitHub URL (legacy catalog URLs).
 */
export function resolveSkinIconFromRef(ref, { useSkinJsonIcons = getUseSkinJsonIcons() } = {}) {
  const r = String(ref || '').trim();
  if (!r) return null;

  if (!useSkinJsonIcons) {
    const hit = AVATAR_ENTRIES.find((e) => e.kind === 'skin' && e.ref === r);
    if (hit?.url) return hit.url;
    const mediaPath = appDataRefToMediaPath(r);
    return mediaPath ? resolveMediaUrl(mediaPath) : null;
  }

  const mediaPath = appDataRefToMediaPath(r);
  if (!mediaPath) return null;

  // Dev: serve gitignored NewGodSkins from trivia:api `/media` proxy.
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return mediaPath;
  }
  return resolveMediaUrl(mediaPath);
}

export function resolveAvatarEntryUrl(entry, { useSkinJsonIcons = getUseSkinJsonIcons() } = {}) {
  if (!entry) return null;
  if (entry.kind === 'skin') {
    return resolveSkinIconFromRef(entry.ref, { useSkinJsonIcons });
  }
  if (entry.kind === 'god') {
    return entry.url || godPortraitUrlFromName(entry.ref);
  }
  if (entry.kind === 'badge') {
    if (entry.url) return entry.url;
    const ref = String(entry.ref || '');
    if (ref.startsWith('app/data/')) {
      const mediaPath = appDataRefToMediaPath(ref);
      return mediaPath ? resolveMediaUrl(mediaPath) : null;
    }
    return badgeUrl(ref);
  }
  return entry.url;
}

export function resolveGodPortraitUrl(godName) {
  return godPortraitUrlFromName(godName);
}

function filterAvatarEntries({ query = '', kind = 'all' } = {}) {
  const q = normAvatarSearch(query);
  const tokens = q ? q.split(' ').filter(Boolean) : [];

  let list = AVATAR_ENTRIES;
  if (kind && kind !== 'all') {
    list = list.filter((e) => e.kind === kind);
  }

  if (tokens.length) {
    list = list.filter((e) => {
      const hay = e.search || normAvatarSearch(e.label);
      return tokens.every((t) => hay.includes(t));
    });
    list = [...list].sort((a, b) => a.label.localeCompare(b.label));
  }

  return { list, tokens };
}

function mapAvatarSearchResult(entry, { useSkinJsonIcons = getUseSkinJsonIcons() } = {}) {
  return {
    ...entry,
    url: resolveAvatarEntryUrl(entry, { useSkinJsonIcons }),
    fallbackUrl:
      entry.kind === 'skin' && entry.godName ? godPortraitUrlFromName(entry.godName) : null,
  };
}

export function searchAvatarCatalog({
  query = '',
  kind = 'all',
  limit = 72,
  useSkinJsonIcons = getUseSkinJsonIcons(),
} = {}) {
  const { list, tokens } = filterAvatarEntries({ query, kind });
  if (!tokens.length) return [];

  return list.slice(0, limit).map((entry) => mapAvatarSearchResult(entry, { useSkinJsonIcons }));
}

/** Pick a random catalog entry (respects kind tab: all | badge | god | skin). */
export function pickRandomAvatarEntry({
  kind = 'all',
  useSkinJsonIcons = getUseSkinJsonIcons(),
} = {}) {
  let list = AVATAR_ENTRIES;
  if (kind && kind !== 'all') {
    list = list.filter((e) => e.kind === kind);
  }
  if (!list.length) return null;
  const entry = list[Math.floor(Math.random() * list.length)];
  return mapAvatarSearchResult(entry, { useSkinJsonIcons });
}

export function getAvatarCatalogCounts() {
  const counts = { badge: 0, god: 0, skin: 0, total: 0 };
  for (const entry of AVATAR_ENTRIES) {
    if (entry.kind && counts[entry.kind] != null) counts[entry.kind] += 1;
    counts.total += 1;
  }
  return counts;
}

export function resolveAvatarFromProfile(profile, discordKey) {
  const kind = profile?.avatar_kind || (profile?.avatar_badge ? 'badge' : 'badge');
  const ref = profile?.avatar_ref || profile?.avatar_badge || '';
  if (ref) {
    const hit = AVATAR_ENTRIES.find((e) => e.kind === kind && e.ref === ref);
    let url = null;
    if (kind === 'skin') {
      url = resolveSkinIconFromRef(ref);
    } else if (kind === 'badge') {
      url =
        hit?.url ||
        (String(ref).startsWith('app/data/')
          ? resolveMediaUrl(appDataRefToMediaPath(ref))
          : badgeUrl(ref));
    } else if (kind === 'god') {
      url = hit?.url || godPortraitUrlFromName(ref);
    } else {
      url = hit?.url || null;
    }
    return {
      kind,
      ref,
      url,
      label: hit?.label || (kind === 'badge' ? badgeLabelFromFile(ref) : ref),
      fallbackUrl: kind === 'skin' && hit?.godName ? godPortraitUrlFromName(hit.godName) : null,
    };
  }
  const file = pickBadgeFileForDiscordKey(discordKey);
  return {
    kind: 'badge',
    ref: file,
    url: badgeUrl(file),
    label: badgeLabelFromFile(file),
    fallbackUrl: null,
  };
}
