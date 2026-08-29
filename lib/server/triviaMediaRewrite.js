/**
 * Replace inlined data:image / data:audio (and GitHub app/data URLs) with /media
 * paths so quiz JSON stays small. VoiceAudio files live on the assets branch.
 * Also normalize github.com/.../blob/... page links to raw.githubusercontent.com.
 */
const crypto = require('crypto');
const DATA_MEDIA_MAP = require('./triviaDataMediaMap.json');

const GH_MASTER = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/';
const GH_ASSETS = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data/';
const GITHUB_BLOB_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+?)(?:\?|#|$)/i;
const GITHUB_RAW_HOST = 'https://raw.githubusercontent.com';

function hashUrl(url) {
  return crypto.createHash('sha256').update(String(url)).digest('hex');
}

function normalizeGithubBlobUrl(url) {
  const s = String(url || '').trim();
  const m = s.match(GITHUB_BLOB_RE);
  if (!m) return s;
  const [, owner, repo, ref, filePath] = m;
  const encoded = String(filePath)
    .split('/')
    .map((seg) => {
      try {
        return encodeURIComponent(decodeURIComponent(seg));
      } catch {
        return encodeURIComponent(seg);
      }
    })
    .join('/');
  return `${GITHUB_RAW_HOST}/${owner}/${repo}/${ref}/${encoded}`;
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
  const s = normalizeGithubBlobUrl(url);
  if (!s) return s;
  if (s.startsWith('data:')) {
    const mapped = DATA_MEDIA_MAP[hashUrl(s)];
    if (mapped) return mapped;
    return s;
  }
  return githubDataToMedia(s) || s;
}

/** Quiz cover banner — keep short https /media URLs; convert GitHub blob pages to raw. */
function rewriteQuizBannerUrl(url) {
  if (url == null || url === '') return null;
  const next = rewriteMediaUrl(url);
  return next || null;
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
  rewriteQuizBannerUrl,
  rewriteQuestionMedia,
  normalizeGithubBlobUrl,
};
