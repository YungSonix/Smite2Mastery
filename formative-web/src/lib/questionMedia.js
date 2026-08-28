/** Extra media lives on meta.image_urls (version A) or variant.image_urls (B/C). image_url stays the first. */

export const MAX_VERSION_IMAGES = 8;
export const MAX_VERSION_MEDIA = MAX_VERSION_IMAGES;

export function listImageUrls(obj) {
  if (!obj || typeof obj !== 'object') return [];
  const out = [];
  const push = (u) => {
    const s = String(u || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };
  push(obj.image_url);
  const extra = Array.isArray(obj.image_urls)
    ? obj.image_urls
    : Array.isArray(obj.meta?.image_urls)
      ? obj.meta.image_urls
      : [];
  extra.forEach(push);
  return out;
}

export const listMediaUrls = listImageUrls;

function clipUrls(urls) {
  return (urls || [])
    .map((u) => String(u || '').trim())
    .filter(Boolean)
    .slice(0, MAX_VERSION_MEDIA);
}

export function withImageUrlsOnQuestion(q, urls) {
  const list = clipUrls(urls);
  const meta = { ...(q.meta || {}) };
  if (list.length) meta.image_urls = list;
  else delete meta.image_urls;
  return { ...q, image_url: list[0] || null, meta };
}

export const withMediaUrlsOnQuestion = withImageUrlsOnQuestion;

export function withImageUrlsOnVariant(variant, urls) {
  const list = clipUrls(urls);
  return {
    ...(variant || {}),
    image_url: list[0] || null,
    image_urls: list,
  };
}

export const withMediaUrlsOnVariant = withImageUrlsOnVariant;

/** Prompt/question media crop — skin_guess implies skin_zoom_center when media_crop omitted. */
export function questionMediaCrop(meta) {
  if (!meta || typeof meta !== 'object') return '';
  return meta.media_crop || (meta.remix_kind === 'skin_guess' ? 'skin_zoom_center' : '');
}

export function questionMediaCropSeed(meta, fallbackUrl) {
  if (!meta || typeof meta !== 'object') return String(fallbackUrl || '').trim();
  return meta.media_seed || String(fallbackUrl || '').trim();
}
