import { hostHeaders } from './auth';

async function parseJson(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function hostApi(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...hostHeaders(),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return parseJson(res);
}

export async function requestTriviaHint(payload) {
  const res = await fetch('/api/trivia/hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function submitTrivia(payload, { keepalive = false } = {}) {
  const res = await fetch('/api/trivia/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive,
  });
  if (keepalive) {
    try {
      return await parseJson(res);
    } catch {
      return { ok: true };
    }
  }
  return parseJson(res);
}

export function scoreAnswers(questions, answers) {
  let score = 0;
  let max = 0;
  const perQuestion = {};
  for (const q of questions || []) {
    if (q.type === 'image' || q.type === 'content') continue;
    const pts = Number.isFinite(Number(q.points)) ? Number(q.points) : 1;
    if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate || pts <= 0) {
      perQuestion[q.id] = null;
      continue;
    }
    max += pts;
    const raw = answers?.[q.id];
    const ok = gradeOne(q, raw);
    perQuestion[q.id] = ok ? 1 : 0;
    if (ok) score += pts;
  }
  return { score, maxScore: max, perQuestion };
}

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function gradeOne(q, raw) {
  if (!q) return false;
  const correct = q.correct;
  if (q.type === 'short_answer' || q.meta?.kind === 'fill_blank') {
    const accepted = Array.isArray(correct?.answers)
      ? correct.answers
      : correct?.answer
        ? [correct.answer]
        : [];
    const given = normalize(raw);
    return accepted.some((a) => normalize(a) === given);
  }
  if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown') {
    const idx = typeof correct?.index === 'number' ? correct.index : correct?.value;
    if (typeof idx === 'number') return Number(raw) === idx;
    return normalize(raw) === normalize(correct?.answer ?? correct);
  }
  if (q.type === 'multiple_selection') {
    const want = new Set((correct?.indices || []).map(Number).filter((n) => Number.isFinite(n)));
    const got = new Set(
      (Array.isArray(raw) ? raw : String(raw ?? '').split(','))
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n))
    );
    if (!want.size) return false;
    if (want.size !== got.size) return false;
    for (const i of want) if (!got.has(i)) return false;
    return true;
  }
  return false;
}

export function activityHref(quiz) {
  const key = quiz?.slug || quiz?.id;
  return `/activity/${encodeURIComponent(key || '')}`;
}

/** Host-only preview of all questions + answers (not a student take). */
export function previewHref(quiz) {
  return `${activityHref(quiz)}/preview`;
}

export function previewUrl(quiz) {
  if (typeof window === 'undefined') return `/trivia${previewHref(quiz)}`;
  return `${window.location.origin}/trivia${previewHref(quiz)}`;
}

export function slugify() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 7; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function joinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function takeUrl(slug) {
  if (typeof window === 'undefined') return `/trivia/take/${slug}`;
  return `${window.location.origin}/trivia/take/${slug}`;
}
