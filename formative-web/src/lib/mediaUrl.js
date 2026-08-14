/** Detect whether a trivia media URL should render as audio vs image vs video. */

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i;

const GITHUB_DATA =
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data';

/** Local `/media/...` is proxied by the trivia API. On Vercel, load the same files from GitHub. */
export function resolveMediaUrl(url) {
  const s = String(url || '');
  if (!s.startsWith('/media/')) return s;
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return s;
  return `${GITHUB_DATA}/${s.slice('/media/'.length)}`;
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
