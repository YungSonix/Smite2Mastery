import { normalizeExternalMediaUrl } from './mediaUrl';

/** Suggested quiz cover from the assets branch (not embedded — link only). */
export const ASSETS_BRANCH_BANNER_EXAMPLE =
  'https://github.com/YungSonix/Smite2Mastery/blob/assets/assets/IMG_3538.jpeg';

/** Read an image file as a data URL for storing on questions/banners. */
export function readImageAsDataUrl(file, { maxBytes = 1.5 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }
    if (!String(file.type || '').startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error('Image too large (max ~1.5MB). Compress or use a smaller file.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

/**
 * Prefer linked banners over Upload for assignable quizzes.
 * Rejects data: URLs (they fail trivia:payload-check) and normalizes GitHub blob links.
 */
export function parseBannerLink(raw) {
  const s = String(raw || '').trim();
  if (!s) return { ok: false, error: 'Paste an image URL' };
  if (s.toLowerCase().startsWith('data:')) {
    return {
      ok: false,
      error: 'Inline data: URLs are blocked on assign. Host the image and paste a link instead.',
    };
  }
  const normalized = normalizeExternalMediaUrl(s);
  if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('/media/')) {
    return {
      ok: false,
      error: 'Use an https:// image URL, a GitHub file link, or a /media/... path',
    };
  }
  return { ok: true, url: normalized };
}
