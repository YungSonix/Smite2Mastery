/** Client helpers for question variants + take-page progress. */

import { listImageUrls } from './questionMedia';

function cloneJson(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
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
    if (out.length >= 3) break;
    const urls = listImageUrls(raw);
    const hasOwnMedia =
      raw.image_url !== undefined || Array.isArray(raw.image_urls);
    out.push({
      prompt: raw.prompt != null ? String(raw.prompt) : base.prompt,
      options: raw.options != null ? cloneJson(raw.options) : cloneJson(base.options),
      correct: raw.correct != null ? cloneJson(raw.correct) : cloneJson(base.correct),
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

export function pickVariantIndex(slug, discord, questionId, count) {
  const n = Math.max(1, Number(count) || 1);
  if (n <= 1) return 0;
  return hashSeed([slug, discord, questionId]) % n;
}

export function applyVariant(q, index) {
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
    image_url: v.image_url,
    meta: { ...meta, variant_index: i, image_urls: v.image_urls || listImageUrls(v) },
  };
}

export function buildVariantMap(questions, slug, discord) {
  const map = {};
  for (const q of questions || []) {
    map[q.id] = pickVariantIndex(slug, discord, q.id, variantCount(q));
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
