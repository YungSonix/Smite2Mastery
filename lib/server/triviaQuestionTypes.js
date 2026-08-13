/** Shared trivia question type helpers (Node). */

const CONTENT_TYPES = new Set(['image', 'content', 'audio', 'video', 'text', 'embed']);
const MANUAL_TYPES = new Set(['file_response', 'audio_response', 'drawing']);
const AUTO_TYPES = new Set([
  'short_answer',
  'multiple_choice',
  'true_false',
  'multiple_selection',
  'dropdown',
  'matching',
  'categorize',
  'hot_spot',
]);

const ALL_TYPES = [
  ...CONTENT_TYPES,
  ...MANUAL_TYPES,
  ...AUTO_TYPES,
  'drag_drop', // alias of categorize
  'fill_blank', // alias of short_answer
  'free_response', // alias of short_answer unscored
  'graphing', // numeric short_answer
  'hot_text', // short_answer with passage
  'match_table', // alias of matching
];

function normalizeType(type) {
  const t = String(type || 'multiple_choice');
  if (t === 'fill_blank' || t === 'free_response' || t === 'graphing' || t === 'hot_text') {
    return 'short_answer';
  }
  if (t === 'drag_drop') return 'categorize';
  if (t === 'match_table') return 'matching';
  return t;
}

function isContentType(type) {
  return CONTENT_TYPES.has(normalizeType(type)) || CONTENT_TYPES.has(type);
}

function isManualType(type) {
  return MANUAL_TYPES.has(normalizeType(type)) || MANUAL_TYPES.has(type);
}

function isAutoScoredType(type) {
  const t = normalizeType(type);
  return AUTO_TYPES.has(t) && !isContentType(t) && !isManualType(t);
}

function normalize(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function gradeOne(q, raw) {
  if (!q || isContentType(q.type) || isManualType(q.type)) return null;
  const type = normalizeType(q.type);
  const correct = q.correct || {};

  if (type === 'short_answer') {
    const accepted = Array.isArray(correct.answers)
      ? correct.answers
      : correct.answer
        ? [correct.answer]
        : [];
    if (!accepted.filter(Boolean).length) return null;
    const given = normalize(raw);
    if (correct.numeric) {
      const n = Number(raw);
      const target = Number(correct.answer ?? correct.answers?.[0]);
      const tol = Number(correct.tolerance ?? 0);
      if (!Number.isFinite(n) || !Number.isFinite(target)) return false;
      return Math.abs(n - target) <= tol;
    }
    return accepted.some((a) => normalize(a) === given);
  }

  if (type === 'multiple_choice' || type === 'true_false' || type === 'dropdown') {
    if (typeof correct.index === 'number') return Number(raw) === correct.index;
    return normalize(raw) === normalize(correct.answer ?? correct);
  }

  if (type === 'multiple_selection') {
    const want = new Set((correct.indices || []).map(Number));
    const got = new Set(
      (Array.isArray(raw) ? raw : String(raw || '').split(','))
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n))
    );
    if (!want.size) return null;
    if (want.size !== got.size) return false;
    for (const i of want) if (!got.has(i)) return false;
    return true;
  }

  if (type === 'matching' || type === 'categorize') {
    const map = correct.map && typeof correct.map === 'object' ? correct.map : {};
    const keys = Object.keys(map);
    if (!keys.length) return null;
    const given = raw && typeof raw === 'object' ? raw : {};
    return keys.every((k) => normalize(given[k]) === normalize(map[k]));
  }

  if (type === 'hot_spot') {
    const cx = Number(correct.x);
    const cy = Number(correct.y);
    const r = Number(correct.r ?? 8);
    const x = Number(raw?.x);
    const y = Number(raw?.y);
    if (![cx, cy, r, x, y].every(Number.isFinite)) return false;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  return false;
}

function scoreAnswers(questions, answers) {
  let score = 0;
  let maxScore = 0;
  const perQuestion = {};
  for (const q of questions || []) {
    if (isContentType(q.type) || isManualType(q.type)) continue;
    const pts = Number.isFinite(Number(q.points)) ? Number(q.points) : 1;
    if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate || pts <= 0) {
      perQuestion[q.id] = null;
      continue;
    }
    const ok = gradeOne(q, answers?.[q.id]);
    if (ok == null) {
      perQuestion[q.id] = null;
      continue;
    }
    maxScore += pts;
    perQuestion[q.id] = ok ? 1 : 0;
    if (ok) score += pts;
  }
  return { score, maxScore, perQuestion };
}

/** Player-facing totals: skip questions marked hide_score. Host still stores full score. */
function playerFacingScore(questions, graded) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions || []) {
    if (q?.meta?.hide_score) continue;
    const pts = Number.isFinite(Number(q.points)) ? Number(q.points) : 1;
    if (pts <= 0) continue;
    if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate) continue;
    const v = graded?.perQuestion?.[q.id];
    if (v == null) continue;
    maxScore += pts;
    if (Number(v)) score += pts;
  }
  return {
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
  };
}

function defaultQuestion(type, sortOrder) {
  const requested = String(type || 'multiple_choice');
  const stored = normalizeType(requested);
  const base = {
    sort_order: sortOrder,
    type: stored,
    prompt: '',
    points: 1,
    required: false,
    options: [],
    correct: {},
    image_url: null,
    meta: {},
  };

  if (requested === 'free_response') {
    return {
      ...base,
      type: 'short_answer',
      prompt: 'Free response',
      points: 0,
      correct: { answers: [] },
      meta: { kind: 'free_response' },
    };
  }
  if (requested === 'fill_blank') {
    return {
      ...base,
      type: 'short_answer',
      prompt: '{{blank}}',
      correct: { answers: [''] },
      meta: { kind: 'fill_blank' },
    };
  }
  if (requested === 'graphing') {
    return {
      ...base,
      type: 'short_answer',
      prompt: 'Read the graph and enter the value',
      correct: { answers: [''], numeric: true, tolerance: 0 },
      meta: { kind: 'graphing' },
    };
  }
  if (requested === 'hot_text') {
    return {
      ...base,
      type: 'short_answer',
      prompt: 'Select / enter the key word from the passage',
      correct: { answers: [''] },
      meta: { kind: 'hot_text', passage: 'Paste passage text here…' },
    };
  }
  if (stored === 'short_answer') {
    return { ...base, prompt: 'Short answer question', correct: { answers: [''] } };
  }
  if (stored === 'true_false') {
    return {
      ...base,
      prompt: 'True or false?',
      options: ['True', 'False'],
      correct: { index: 0 },
    };
  }
  if (stored === 'multiple_choice' || stored === 'dropdown') {
    return {
      ...base,
      type: stored,
      prompt: stored === 'dropdown' ? 'Choose one' : 'Multiple choice question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: { index: 0 },
    };
  }
  if (stored === 'multiple_selection') {
    return {
      ...base,
      prompt: 'Select all that apply',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: { indices: [0] },
    };
  }
  if (stored === 'matching' || stored === 'categorize') {
    return {
      ...base,
      type: stored,
      prompt: stored === 'categorize' ? 'Sort each item into a category' : 'Match each item',
      options:
        stored === 'categorize'
          ? {
              categories: ['Category A', 'Category B'],
              items: ['Item 1', 'Item 2', 'Item 3'],
            }
          : [
              { left: 'Left 1', right: 'Right 1' },
              { left: 'Left 2', right: 'Right 2' },
            ],
      correct:
        stored === 'categorize'
          ? { map: { 'Item 1': 'Category A', 'Item 2': 'Category B', 'Item 3': 'Category A' } }
          : { map: { 'Left 1': 'Right 1', 'Left 2': 'Right 2' } },
      meta: requested === 'drag_drop' ? { kind: 'drag_drop' } : {},
    };
  }
  if (stored === 'hot_spot') {
    return {
      ...base,
      prompt: 'Click the correct spot on the image',
      image_url: '',
      correct: { x: 50, y: 50, r: 10 },
    };
  }
  if (stored === 'image' || stored === 'audio' || stored === 'video' || stored === 'text' || stored === 'embed') {
    return {
      ...base,
      type: stored === 'text' ? 'content' : stored,
      prompt: stored === 'text' || stored === 'content' ? 'Content block' : '',
      points: 0,
      meta: stored === 'text' ? { kind: 'text' } : {},
    };
  }
  if (stored === 'file_response' || stored === 'audio_response' || stored === 'drawing') {
    return {
      ...base,
      type: stored,
      prompt:
        stored === 'drawing'
          ? 'Draw your answer'
          : stored === 'audio_response'
            ? 'Record / upload an audio answer'
            : 'Upload a file',
      points: 0,
      correct: {},
      meta: { manual: true },
    };
  }
  return {
    ...base,
    type: 'multiple_choice',
    prompt: 'Multiple choice question',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct: { index: 0 },
  };
}

module.exports = {
  ALL_TYPES,
  CONTENT_TYPES,
  MANUAL_TYPES,
  normalizeType,
  isContentType,
  isManualType,
  isAutoScoredType,
  gradeOne,
  scoreAnswers,
  playerFacingScore,
  defaultQuestion,
};
