/** Client helpers for question variants + take-page progress. */

import { listImageUrls } from './questionMedia';

export const MAX_QUESTION_VARIANTS = 10;

export function variantLetter(index) {
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

export function listVariants(q) {
  if (!q) return [];
  const base = {
    prompt: q.prompt || '',
    options: cloneJson(q.options != null ? q.options : []),
    correct: cloneJson(q.correct != null ? q.correct : {}),
    image_url: q.image_url || null,
    image_urls: listImageUrls(q),
  };
  const out = [base];
  const extras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
  for (const raw of extras) {
    if (!raw || typeof raw !== 'object') continue;
    if (raw.enabled === false) continue;
    if (out.length >= MAX_QUESTION_VARIANTS) break;
    const urls = listImageUrls(raw);
    const hasOwnMedia = variantHasOwnMedia(raw);
    const options =
      raw.options != null ? cloneJson(raw.options) : cloneJson(base.options);
    const correctSourceOptions =
      raw.correct != null
        ? raw.options != null
          ? cloneJson(raw.options)
          : cloneJson(base.options)
        : cloneJson(base.options);
    const correctRaw =
      raw.correct != null ? cloneJson(raw.correct) : cloneJson(base.correct);
    out.push({
      prompt: raw.prompt != null ? String(raw.prompt) : base.prompt,
      options,
      correct: remapCorrectForOptions(correctRaw, correctSourceOptions, options),
      image_url: hasOwnMedia ? urls[0] || null : base.image_url,
      image_urls: hasOwnMedia ? urls : base.image_urls,
    });
  }
  return out;
}

export function variantCount(q) {
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

export function pickVariantIndex(slug, discord, questionId, count, previousIndex, salt) {
  const n = Math.max(1, Number(count) || 1);
  if (n <= 1) return 0;
  if (previousIndex != null && previousIndex !== '' && Number.isFinite(Number(previousIndex))) {
    const prev = ((Math.trunc(Number(previousIndex)) % n) + n) % n;
    return (prev + 1) % n;
  }
  return hashSeed([slug, discord, questionId, salt || '']) % n;
}

export function applyVariant(q, index) {
  const variants = listVariants(q);
  if (!variants.length) return q;
  const i = Math.max(0, Math.min(variants.length - 1, Number(index) || 0));
  const v = variants[i];
  const meta = { ...(q.meta || {}) };
  delete meta.variants;
  const mediaUrls = v.image_urls || listImageUrls(v);
  return {
    ...q,
    prompt: v.prompt,
    options: v.options,
    correct: v.correct,
    image_url: v.image_url,
    image_urls: mediaUrls,
    meta: {
      ...meta,
      ...(v.meta || {}),
      variant_index: i,
      image_urls: mediaUrls,
    },
  };
}

export function extractVariantMap(answersOrMap) {
  if (!answersOrMap || typeof answersOrMap !== 'object') return null;
  const nested = answersOrMap.__variant_map;
  const map = nested && typeof nested === 'object' ? nested : answersOrMap;
  const keys = Object.keys(map).filter((k) => k !== '__variant_map');
  if (!keys.length) return null;
  return map;
}

export function buildVariantMap(questions, slug, discord, previousMap, salt) {
  const prev = extractVariantMap(previousMap) || {};
  const map = {};
  for (const q of questions || []) {
    map[q.id] = pickVariantIndex(slug, discord, q.id, variantCount(q), prev[q.id], salt);
  }
  return map;
}

export function resolveQuestionsForStudent(questions, slug, discord, existingMap) {
  const map =
    existingMap && typeof existingMap === 'object' && Object.keys(existingMap).length
      ? existingMap
      : buildVariantMap(questions, slug, discord || 'guest');
  return {
    variantMap: map,
    questions: (questions || []).map((q) => applyVariant(q, map[q.id] ?? 0)),
  };
}

const progressKey = (slug) => `scroll_trivia_progress:${String(slug || '').trim()}`;

export function loadTriviaProgress(slug) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(progressKey(slug));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveTriviaProgress(slug, payload) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      progressKey(slug),
      JSON.stringify({
        ...payload,
        updatedAt: Date.now(),
      })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearTriviaProgress(slug) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(progressKey(slug));
  } catch {
    /* ignore */
  }
}
