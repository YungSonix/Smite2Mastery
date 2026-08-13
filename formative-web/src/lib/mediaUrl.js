/** Detect whether a trivia media URL should render as audio vs image. */

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|#|$)/i;

export function isAudioMediaUrl(url, { type, meta } = {}) {
  if (type === 'audio' || meta?.media === 'audio' || meta?.attached_from === 'audio') {
    return true;
  }
  const s = String(url || '');
  if (!s) return false;
  if (s.startsWith('data:audio')) return true;
  if (AUDIO_EXT.test(s)) return true;
  return false;
}
