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

function normOpt(s) {
  return String(s ?? '').trim().toLowerCase();
}

function optionsEqual(a, b) {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function correctLabels(correct, options) {
  const opts = Array.isArray(options) ? options : [];
  if (!correct || typeof correct !== 'object') return [];
  if (Array.isArray(correct.indices)) {
    return correct.indices
      .map((i) => opts[Number(i)])
      .filter((l) => l != null && String(l).trim());
  }
  if (Number.isFinite(Number(correct.index))) {
    const label = opts[Number(correct.index)];
    return label != null && String(label).trim() ? [String(label)] : [];
  }
  if (Array.isArray(correct.answers)) return correct.answers.map(String).filter(Boolean);
  if (correct.answer != null && String(correct.answer).trim()) return [String(correct.answer)];
  return [];
}

function indexForLabel(options, label) {
  const n = normOpt(label);
  if (!n) return -1;
  return (Array.isArray(options) ? options : []).findIndex((o) => normOpt(o) === n);
}

/** Map correct.index/indices from source option list onto target option list by label. */
function remapCorrectForOptions(correct, sourceOptions, targetOptions) {
  if (!correct || typeof correct !== 'object') return correct;
  if (optionsEqual(sourceOptions, targetOptions)) return cloneJson(correct);

  const labels = correctLabels(correct, sourceOptions);
  if (!labels.length) return cloneJson(correct);

  if (Array.isArray(correct.indices)) {
    const indices = labels.map((l) => indexForLabel(targetOptions, l)).filter((i) => i >= 0);
    if (!indices.length) return cloneJson(correct);
    return { indices, index: indices[0] };
  }

  const idx = indexForLabel(targetOptions, labels[0]);
  if (idx < 0) return cloneJson(correct);
  return { index: idx };
}

function variantHasOwnMedia(raw) {
  if (!raw || typeof raw !== 'object') return false;
  return (
    raw.image_url !== undefined ||
    Array.isArray(raw.image_urls) ||
    (Array.isArray(raw.meta?.image_urls) && raw.meta.image_urls.length > 0)
  );
}

const VARIANT_SLOT_MEDIA_KEYS = [
  'media',
  'media_crop',
  'media_seed',
  'remix_kind',
  'emoji_set',
  'hint_context',
];
const CROP_META_KEYS = new Set(['media_crop', 'media_seed']);

function slotOwnsCropField(slot, key) {
  if (!slot || typeof slot !== 'object') return false;
  if (slot[key] !== undefined && slot[key] !== null) return true;
  return slot.meta?.[key] !== undefined && slot.meta?.[key] !== null;
}

/** Mirror QuestionCard variant-tab media meta (crop/seed do not inherit from Version A). */
function mediaMetaFromSlot(slot, baseMeta = {}, { inheritCrop = true } = {}) {
  const src = slot && typeof slot === 'object' ? slot : {};
  const meta = baseMeta && typeof baseMeta === 'object' ? baseMeta : {};
  const nested = src.meta && typeof src.meta === 'object' ? src.meta : {};
  const out = {};
  for (const key of VARIANT_SLOT_MEDIA_KEYS) {
    if (src[key] !== undefined && src[key] !== null) out[key] = src[key];
    else if (src[key] === null) continue;
    else if (nested[key] !== undefined && nested[key] !== null) out[key] = nested[key];
    else if (!inheritCrop && CROP_META_KEYS.has(key)) continue;
    else if (meta[key] !== undefined && meta[key] !== null) out[key] = meta[key];
  }
  return out;
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
    const hasOwnMedia = variantHasOwnMedia(raw);
    const options =
      raw.options != null ? cloneJson(raw.options) : cloneJson(out[0].options);
    const correctSourceOptions =
      raw.correct != null
        ? raw.options != null
          ? cloneJson(raw.options)
          : cloneJson(out[0].options)
        : cloneJson(out[0].options);
    const correctRaw =
      raw.correct != null ? cloneJson(raw.correct) : cloneJson(out[0].correct);
    const slotMedia = mediaMetaFromSlot(raw, out[0].meta || {}, { inheritCrop: false });
    const variantMeta = { ...(out[0].meta || {}), ...slotMedia, ...(raw.meta || {}), variants: undefined };
    if (!slotOwnsCropField(raw, 'media_crop')) {
      delete variantMeta.media_crop;
      delete variantMeta.media_seed;
    }
    out.push({
      prompt: raw.prompt != null ? String(raw.prompt) : out[0].prompt,
      options,
      correct: remapCorrectForOptions(correctRaw, correctSourceOptions, options),
      image_url: hasOwnMedia ? urls[0] || null : out[0].image_url,
      image_urls: hasOwnMedia ? urls : out[0].image_urls,
      type: raw.type || out[0].type,
      points: raw.points != null ? raw.points : out[0].points,
      required: raw.required != null ? raw.required : out[0].required,
      meta: variantMeta,
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
  const baseMeta = { ...(q.meta || {}) };
  delete baseMeta.variants;
  const mediaUrls = v.image_urls || listImageUrls(v);
  let mergedMeta = baseMeta;
  if (i > 0) {
    const extras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
    const slot = extras[i - 1] || {};
    mergedMeta = {
      ...baseMeta,
      ...mediaMetaFromSlot(slot, baseMeta, { inheritCrop: false }),
    };
    if (!slotOwnsCropField(slot, 'media_crop')) delete mergedMeta.media_crop;
    if (!slotOwnsCropField(slot, 'media_seed')) delete mergedMeta.media_seed;
  }
  return {
    ...q,
    prompt: v.prompt,
    options: v.options,
    correct: v.correct,
    image_url: v.image_url,
    image_urls: mediaUrls,
    type: v.type || q.type,
    points: v.points != null ? v.points : q.points,
    required: v.required != null ? v.required : q.required,
    meta: {
      ...mergedMeta,
      ...(v.meta || {}),
      variant_index: i,
      image_urls: mediaUrls,
    },
  };
}

function stripCorrect(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const next = { ...obj };
  delete next.correct;
  return next;
}

const { rewriteQuestionMedia } = require('./triviaMediaRewrite');

/** Public payload: keep variant prompts/options, never correct keys. */
function sanitizeQuestionForPublic(q) {
  q = rewriteQuestionMedia(q);
  const meta = { ...(q.meta || {}) };
  if (Array.isArray(meta.variants)) {
    meta.variants = meta.variants.map((v) => {
      if (!v || typeof v !== 'object') return v;
      const { correct, hints, hint_context, ...rest } = v;
      return rest;
    });
  }
  const hintsOn = Boolean(meta.hints_enabled) && Array.isArray(meta.hints) && meta.hints.some((s) => String(s || '').trim());
  delete meta.hints;
  delete meta.hint_context;
  meta.hints_enabled = hintsOn;
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

function mergeVariantSources(...sources) {
  const out = {};
  for (const src of sources) {
    const map = extractVariantMap(src);
    if (!map) continue;
    for (const [k, v] of Object.entries(map)) {
      if (v != null && v !== '') out[k] = Number(v);
    }
  }
  return out;
}

function variantMapIsUsable(map, questions) {
  const multi = (questions || []).filter((q) => variantCount(q) > 1);
  if (!multi.length) return true;
  if (!map || !Object.keys(map).length) return false;
  return multi.every((q) => map[q.id] != null || map[String(q.id)] != null);
}

/** Prefer client/session maps; rebuild deterministically from Discord when missing. */
function resolveVariantMap({ questions, slug, discord, clientMap, sessionMap, previousMap }) {
  const merged = mergeVariantSources(previousMap, sessionMap, clientMap);
  if (variantMapIsUsable(merged, questions)) return merged;
  const rebuilt = buildVariantMap(questions, slug, discord, merged, '');
  return { ...rebuilt, ...merged };
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
  resolveVariantMap,
  scoreAnswersWithVariants,
  asVariantSlice,
};
