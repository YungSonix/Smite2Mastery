/** Detect whether a trivia media URL should render as audio vs image vs video. */

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;

const GITHUB_MASTER =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data';
const GITHUB_ASSETS =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data';

/** Local `/media/...` is proxied by the trivia API. VoiceAudio is gitignored — load from the assets branch. */
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
  // VoiceAudio is gitignored on master — always load from the assets branch.
  if (rel.startsWith('VoiceAudio/') || relRaw.startsWith('VoiceAudio/')) {
    return `${GITHUB_ASSETS}/${rel.split('/').map(encodeURIComponent).join('/')}`;
  }
  // God Renders are gitignored. Dev: keep /media for trivia:api proxy. Prod: assets branch if uploaded.
  if (rel.startsWith('God Renders/') || relRaw.startsWith('God%20Renders/')) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return s;
    return `${GITHUB_ASSETS}/${rel.split('/').map(encodeURIComponent).join('/')}`;
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
