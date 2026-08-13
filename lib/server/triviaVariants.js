/**
 * Question variants (A/B/C) for Scroll Trivia.
 * Variant A = the question's own prompt/options/correct/image_url.
 * Variants B/C live in meta.variants[0] / meta.variants[1].
 */

function cloneJson(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function asVariantSlice(q) {
  return {
    prompt: q.prompt || '',
    options: cloneJson(q.options != null ? q.options : []),
    correct: cloneJson(q.correct != null ? q.correct : {}),
    image_url: q.image_url || null,
    type: q.type,
    points: q.points,
    required: q.required,
    meta: cloneJson(q.meta || {}),
  };
}

/** Returns up to 3 variant payloads: A, then B/C from meta.variants. */
function listVariants(q) {
  if (!q) return [];
  const out = [asVariantSlice(q)];
  const extras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
  for (const raw of extras) {
    if (!raw || typeof raw !== 'object') continue;
    if (out.length >= 3) break;
    out.push({
      prompt: raw.prompt != null ? String(raw.prompt) : out[0].prompt,
      options: raw.options != null ? cloneJson(raw.options) : cloneJson(out[0].options),
      correct: raw.correct != null ? cloneJson(raw.correct) : cloneJson(out[0].correct),
      image_url: raw.image_url !== undefined ? raw.image_url : out[0].image_url,
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

/** Deterministic variant index for a student + question. */
function pickVariantIndex(slug, discord, questionId, count) {
  const n = Math.max(1, Number(count) || 1);
  if (n <= 1) return 0;
  return hashSeed([slug, discord, questionId]) % n;
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
    meta: { ...meta, ...(v.meta || {}), variant_index: i },
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
  return {
    id: q.id,
    sort_order: q.sort_order,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    required: q.required,
    options: q.options,
    image_url: q.image_url,
    meta,
  };
}

function buildVariantMap(questions, slug, discord) {
  const map = {};
  for (const q of questions || []) {
    map[q.id] = pickVariantIndex(slug, discord, q.id, variantCount(q));
  }
  return map;
}

function scoreAnswersWithVariants(scoreAnswersFn, questions, answers, variantMap) {
  const map = variantMap && typeof variantMap === 'object' ? variantMap : {};
  const resolved = (questions || []).map((q) => applyVariant(q, map[q.id] ?? 0));
  return scoreAnswersFn(resolved, answers);
}

module.exports = {
  listVariants,
  variantCount,
  pickVariantIndex,
  applyVariant,
  sanitizeQuestionForPublic,
  buildVariantMap,
  scoreAnswersWithVariants,
  asVariantSlice,
};
