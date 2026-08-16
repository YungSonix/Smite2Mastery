/**
 * Replace inlined data:image / data:audio (and GitHub app/data URLs) with /media
 * paths so quiz JSON stays small. VoiceAudio files live on the assets branch.
 */
const crypto = require('crypto');
const DATA_MEDIA_MAP = require('./triviaDataMediaMap.json');

const GH_MASTER = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/';
const GH_ASSETS = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data/';

function hashUrl(url) {
  return crypto.createHash('sha256').update(String(url)).digest('hex');
}

function githubDataToMedia(url) {
  const s = String(url || '').trim();
  const lower = s.toLowerCase();
  let prefix = '';
  if (lower.startsWith(GH_ASSETS.toLowerCase())) prefix = GH_ASSETS;
  else if (lower.startsWith(GH_MASTER.toLowerCase())) prefix = GH_MASTER;
  if (!prefix) return null;
  const rel = s.slice(prefix.length).split(/[?#]/)[0];
  if (!rel) return null;
  return `/media/${rel}`;
}

function rewriteMediaUrl(url) {
  const s = String(url || '').trim();
  if (!s) return s;
  if (s.startsWith('data:')) {
    const mapped = DATA_MEDIA_MAP[hashUrl(s)];
    if (mapped) return mapped;
    return s;
  }
  return githubDataToMedia(s) || s;
}

function rewriteUrlList(list) {
  if (!Array.isArray(list)) return list;
  const out = [];
  for (const u of list) {
    const next = rewriteMediaUrl(u);
    if (next && !out.includes(next)) out.push(next);
  }
  return out;
}

function rewriteQuestionMedia(q) {
  if (!q || typeof q !== 'object') return q;
  const next = { ...q };
  if (next.image_url) next.image_url = rewriteMediaUrl(next.image_url) || null;
  const meta = next.meta && typeof next.meta === 'object' ? { ...next.meta } : next.meta;
  if (meta && typeof meta === 'object') {
    if (Array.isArray(meta.image_urls)) meta.image_urls = rewriteUrlList(meta.image_urls);
    if (Array.isArray(meta.variants)) {
      meta.variants = meta.variants.map((v) => {
        if (!v || typeof v !== 'object') return v;
        const nv = { ...v };
        if (nv.image_url) nv.image_url = rewriteMediaUrl(nv.image_url) || null;
        if (Array.isArray(nv.image_urls)) nv.image_urls = rewriteUrlList(nv.image_urls);
        return nv;
      });
    }
    next.meta = meta;
  }
  return next;
}

module.exports = {
  rewriteMediaUrl,
  rewriteQuestionMedia,
};
