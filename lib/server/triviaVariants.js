/**
 * Question variants (A + extras) for Scroll Trivia.
 * Variant A = the question's own prompt/options/correct/image_url.
 * Extra versions live in meta.variants[0…] (up to 9 extras, 10 total).
 */

const MAX_QUESTION_VARIANTS = 10;

function variantLetter(index) {
  const i = Math.max(0, Math.min(25, Number(index) || 0));
  return String.fromCharCode(65 + i);
}

function cloneJson(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function listImageUrls(obj) {
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

function asVariantSlice(q) {
  const urls = listImageUrls(q);
  return {
    prompt: q.prompt || '',
    options: cloneJson(q.options != null ? q.options : []),
    correct: cloneJson(q.correct != null ? q.correct : {}),
    image_url: urls[0] || q.image_url || null,
    image_urls: urls,
    type: q.type,
    points: q.points,
    required: q.required,
    meta: cloneJson(q.meta || {}),
  };
}

/** Returns up to 10 variant payloads: A, then extras from meta.variants. */
function listVariants(q) {
  if (!q) return [];
  const out = [asVariantSlice(q)];
  const extras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
  for (const raw of extras) {
    if (!raw || typeof raw !== 'object') continue;
    if (raw.enabled === false) continue;
    if (out.length >= MAX_QUESTION_VARIANTS) break;
    const urls = listImageUrls(raw);
    const hasOwnMedia =
      raw.image_url !== undefined || Array.isArray(raw.image_urls);
    out.push({
      prompt: raw.prompt != null ? String(raw.prompt) : out[0].prompt,
      options: raw.options != null ? cloneJson(raw.options) : cloneJson(out[0].options),
      correct: raw.correct != null ? cloneJson(raw.correct) : cloneJson(out[0].correct),
      image_url: hasOwnMedia ? urls[0] || null : out[0].image_url,
      image_urls: hasOwnMedia ? urls : out[0].image_urls,
      type: raw.type || out[0].type,
      points: raw.points != null ? raw.points : out[0].points,
      required: raw.required != null ? raw.required : out[0].required,
      meta: { ...(out[0].meta || {}), ...(raw.meta || {}), variants: undefined },
    });
  }
  return out;
}

function variantCount(q) {
  return listVariants(q).length;
}

function hashSeed(parts) {
  let h = 2166136261;
  const s = parts.map((p) => String(p ?? '')).join('|').toLowerCase();
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Pick a variant index for one question.
 * If this Discord already had an index, round-robin to the next one.
 * Otherwise hash (optional salt) so first takes still spread across versions.
 */
function pickVariantIndex(slug, discord, questionId, count, previousIndex, salt) {
  const n = Math.max(1, Number(count) || 1);
  if (n <= 1) return 0;
  if (previousIndex != null && previousIndex !== '' && Number.isFinite(Number(previousIndex))) {
    const prev = ((Math.trunc(Number(previousIndex)) % n) + n) % n;
    return (prev + 1) % n;
  }
  return hashSeed([slug, discord, questionId, salt || '']) % n;
}

function applyVariant(q, index) {
  const variants = listVariants(q);
  if (!variants.length) return q;
  const i = Math.max(0, Math.min(variants.length - 1, Number(index) || 0));
  const v = variants[i];
  const meta = { ...(q.meta || {}) };
  delete meta.variants;
  return {
    ...q,
    prompt: v.prompt,
    options: v.options,
    correct: v.correct,
    image_url: v.image_url,
    type: v.type || q.type,
    points: v.points != null ? v.points : q.points,
    required: v.required != null ? v.required : q.required,
    meta: {
      ...meta,
      ...(v.meta || {}),
      variant_index: i,
      image_urls: v.image_urls || listImageUrls(v),
    },
  };
}

function stripCorrect(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const next = { ...obj };
  delete next.correct;
  return next;
}

/** Public payload: keep variant prompts/options, never correct keys. */
function sanitizeQuestionForPublic(q) {
  const meta = { ...(q.meta || {}) };
  if (Array.isArray(meta.variants)) {
    meta.variants = meta.variants.map((v) => {
      if (!v || typeof v !== 'object') return v;
      const { correct, ...rest } = v;
      return rest;
    });
  }
  const urls = listImageUrls(q);
  return {
    id: q.id,
    sort_order: q.sort_order,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    required: q.required,
    options: q.options,
    image_url: urls[0] || q.image_url || null,
    meta,
  };
}

function extractVariantMap(answersOrMap) {
  if (!answersOrMap || typeof answersOrMap !== 'object') return null;
  const nested = answersOrMap.__variant_map;
  const map = nested && typeof nested === 'object' ? nested : answersOrMap;
  const keys = Object.keys(map).filter((k) => k !== '__variant_map');
  if (!keys.length) return null;
  return map;
}

function buildVariantMap(questions, slug, discord, previousMap, salt) {
  const prev = extractVariantMap(previousMap) || {};
  const map = {};
  for (const q of questions || []) {
    map[q.id] = pickVariantIndex(slug, discord, q.id, variantCount(q), prev[q.id], salt);
  }
  return map;
}

function scoreAnswersWithVariants(scoreAnswersFn, questions, answers, variantMap) {
  const map = variantMap && typeof variantMap === 'object' ? variantMap : {};
  const resolved = (questions || []).map((q) => applyVariant(q, map[q.id] ?? 0));
  return scoreAnswersFn(resolved, answers);
}

module.exports = {
  MAX_QUESTION_VARIANTS,
  variantLetter,
  listVariants,
  variantCount,
  pickVariantIndex,
  applyVariant,
  sanitizeQuestionForPublic,
  extractVariantMap,
  buildVariantMap,
  scoreAnswersWithVariants,
  asVariantSlice,
};
