/** Detect whether a trivia media URL should render as audio vs image vs video. */

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;

const GITHUB_MASTER =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data';
const GITHUB_ASSETS =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data';
const GITHUB_MAIN_IMG = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img';

/** Legacy catalog filenames → builds.json / assets branch basenames. */
const GOD_INFO_FILENAME_ALIASES = {
  'cuChulainnImage.webp': 'cuchuImage.webp',
  'xingTianImage.webp': 'xingImage.webp',
};

/** God Info files on `assets` only (not yet mirrored to `main/img/God Info`). */
const GOD_INFO_ASSETS_ONLY = new Set([
  'atlasPassive.webp',
  'charonPassive.webp',
  'chironPassive.webp',
  'cuchuImage.webp',
  'cuchuPassive.webp',
  'discoPassive.webp',
  'gilgaPassive.webp',
  'ishtarPassive.webp',
  'ixchelImage.webp',
  'ixchelPassive.webp',
  'morganLeFayPassive.webp',
  'neZhaPassive.webp',
  'puchPassive.webp',
  'ratPassive.webp',
  'ravImage.webp',
  'ravPassive.webp',
  'ullrPassive.webp',
  'xingImage.webp',
  'xingPassive.webp',
]);

/** Prefer local `/media` proxy (trivia:api) even for gitignored assets. Default is false. */
function preferLocalMediaProxy() {
  try {
    return String(import.meta.env?.VITE_TRIVIA_LOCAL_MEDIA || '').toLowerCase() === '1'
      || String(import.meta.env?.VITE_TRIVIA_LOCAL_MEDIA || '').toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/** Local `/media/...` is proxied by the trivia API. Large/gitignored trees load from remote branches. */
export function resolveMediaUrl(url) {
  const s = String(url || '');
  if (!s.startsWith('/media/')) return s;
  const relRaw = s.slice('/media/'.length);
  let rel = relRaw;
  try {
    rel = decodeURIComponent(relRaw);
  } catch {
    /* keep encoded */
  }
  const toAssets = () =>
    `${GITHUB_ASSETS}/${rel.split('/').map(encodeURIComponent).join('/')}`;
  const toMainImg = (subPath) =>
    `${GITHUB_MAIN_IMG}/${String(subPath || '')
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;

  // God Info: most portraits/passives on `main/img/God Info`; newer gods may be assets-only.
  if (
    rel.startsWith('Icons/God Info/') ||
    relRaw.startsWith('Icons/God%20Info/') ||
    relRaw.startsWith('Icons/God Info/')
  ) {
    if (preferLocalMediaProxy()) return s;
    const rawFile = rel.slice('Icons/God Info/'.length);
    const file = GOD_INFO_FILENAME_ALIASES[rawFile] || rawFile;
    if (GOD_INFO_ASSETS_ONLY.has(file)) {
      const resolvedRel = `Icons/God Info/${file}`;
      return `${GITHUB_ASSETS}/${resolvedRel.split('/').map(encodeURIComponent).join('/')}`;
    }
    return toMainImg(`God Info/${file}`);
  }

  // These live on the `assets` branch (often missing/404 on master). Always use assets
  // unless VITE_TRIVIA_LOCAL_MEDIA=1 forces the local /media proxy.
  const assetsPrefixes = [
    ['VoiceAudio/', 'VoiceAudio/'],
    ['God Renders/', 'God%20Renders/'],
    ['NewGodSkins/', 'NewGodSkins/'],
    ['AspectIcons/', 'AspectIcons/'],
    ['Icons/Item Icons/', 'Icons/Item%20Icons/'],
    ['Icons/Item Icons/', 'Icons/Item Icons/'],
  ];
  for (const [decoded, encoded] of assetsPrefixes) {
    if (rel.startsWith(decoded) || relRaw.startsWith(encoded) || relRaw.startsWith(decoded)) {
      if (preferLocalMediaProxy()) return s;
      return toAssets();
    }
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return s;
  return `${GITHUB_MASTER}/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

/** Per-URL kind. Does not use question type — mixed lists are allowed. */
export function classifyMediaUrl(url) {
  const s = String(url || '').trim();
  if (!s) return 'empty';
  if (s.startsWith('data:audio') || AUDIO_EXT.test(s)) return 'audio';
  if (s.startsWith('data:video') || VIDEO_EXT.test(s)) return 'video';
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(s)) return 'embed';
  if (s.startsWith('data:image') || IMAGE_EXT.test(s)) return 'image';
  return 'image';
}

export function isAudioMediaUrl(url, { type, meta } = {}) {
  if (classifyMediaUrl(url) === 'audio') return true;
  if (!url && (type === 'audio' || meta?.media === 'audio' || meta?.attached_from === 'audio')) {
    return true;
  }
  return false;
}
