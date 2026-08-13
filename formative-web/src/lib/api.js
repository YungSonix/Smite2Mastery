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
    headers: {
      'Content-Type': 'application/json',
      ...hostHeaders(),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return parseJson(res);
}

export async function submitTrivia(payload) {
  const res = await fetch('/api/trivia/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
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
  if (q.type === 'short_answer') {
    const accepted = Array.isArray(correct?.answers)
      ? correct.answers
      : correct?.answer
        ? [correct.answer]
        : [];
    const given = normalize(raw);
    return accepted.some((a) => normalize(a) === given);
  }
  if (q.type === 'multiple_choice' || q.type === 'true_false') {
    const idx = typeof correct?.index === 'number' ? correct.index : correct?.value;
    if (typeof idx === 'number') return Number(raw) === idx;
    return normalize(raw) === normalize(correct?.answer ?? correct);
  }
  return false;
}

export function slugify(title) {
  const base = String(title || 'quiz')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'quiz'}-${suffix}`;
}

export function joinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function takeUrl(slug) {
  if (typeof window === 'undefined') return `/formative/take/${slug}`;
  return `${window.location.origin}/formative/take/${slug}`;
}
