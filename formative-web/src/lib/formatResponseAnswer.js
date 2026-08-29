import { gradeOne } from './api';
import { formatCorrectAnswer } from './correctAnswer';

const CONTENT_TYPES = new Set(['image', 'content', 'audio', 'video', 'embed']);

export function isGateQuestion(q) {
  return Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);
}

export function isContentQuestion(q) {
  return CONTENT_TYPES.has(q?.type);
}

export function isScoredQuestion(q) {
  if (!q || isContentQuestion(q) || isGateQuestion(q)) return false;
  return Number(q.points) > 0;
}

const MANUAL_GRADE_TYPES = new Set(['file_response', 'audio_response', 'drawing']);

export function isManualGradeQuestion(q) {
  return MANUAL_GRADE_TYPES.has(String(q?.type || ''));
}

export function isBlankAnswer(raw) {
  if (raw == null || raw === '') return true;
  if (typeof raw === 'string' && !raw.trim()) return true;
  if (Array.isArray(raw)) return raw.length === 0;
  if (typeof raw === 'object') return Object.keys(raw).length === 0;
  return false;
}

/** True when answers JSON includes at least one question answer (not just __meta keys). */
export function hasResponseAnswers(answers) {
  if (!answers || typeof answers !== 'object') return false;
  return Object.keys(answers).some((k) => !k.startsWith('__'));
}

/** Earned points for display; blank unanswered with no stored grade counts as 0. */
export function effectiveEarned(q, response, maxPts) {
  const stored = response?.per_question?.[q?.id];
  const earned = earnedFromStored(stored, maxPts);
  if (earned != null) return earned;
  if (isBlankAnswer(response?.answers?.[q?.id])) return 0;
  return null;
}

/** True when host must assign points (answered but not auto-graded). */
export function needsManualGrade(q, response) {
  if (!isScoredQuestion(q)) return false;
  if (response?.per_question?.[q?.id] != null) return false;
  return !isBlankAnswer(response?.answers?.[q?.id]);
}

/** Human-readable answer text for host review (MC/TF/multi/matching/etc.). */
export function formatResponseAnswer(q, raw, response) {
  if (q?.meta?.is_discord_gate) {
    return response?.discord_username || (typeof raw === 'string' && raw.trim() ? raw : null);
  }
  if (q?.meta?.is_ingame_gate) {
    return response?.ingame_name || (typeof raw === 'string' && raw.trim() ? raw : null);
  }
  if (raw == null || raw === '') return null;

  const optLabel = (opt) => {
    if (opt == null) return null;
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    if (typeof opt === 'object') {
      return String(opt.text ?? opt.label ?? opt.value ?? opt.name ?? '').trim() || null;
    }
    return String(opt);
  };

  const type = q?.type;
  if (type === 'multiple_choice' || type === 'true_false' || type === 'dropdown') {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
      const idx = Number(raw);
      return optLabel(opts[idx]) ?? String(raw);
    }
    return String(raw);
  }
  if (type === 'multiple_selection') {
    const opts = Array.isArray(q.options) ? q.options : [];
    const idxs = Array.isArray(raw)
      ? raw.map(Number)
      : String(raw)
          .split(',')
          .map((x) => Number(x.trim()))
          .filter((n) => Number.isFinite(n));
    if (!idxs.length) return String(raw);
    return idxs.map((i) => optLabel(opts[i]) ?? `#${i}`).join(', ');
  }
  if (type === 'matching' || type === 'categorize') {
    if (raw && typeof raw === 'object') {
      return Object.entries(raw)
        .map(([k, v]) => `${k} → ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
    }
    return String(raw);
  }
  if (type === 'ordering' || type === 'drag_drop') {
    if (Array.isArray(raw)) return raw.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return String(raw);
  }
  if (type === 'hot_spot' && raw && typeof raw === 'object') {
    return `x: ${raw.x}, y: ${raw.y}`;
  }
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

/** Convert stored per_question value (0/1 fraction or points) to earned points. */
export function earnedFromStored(stored, maxPts) {
  if (stored == null || stored === '') return null;
  const n = Number(stored);
  if (!Number.isFinite(n)) return null;
  if (maxPts > 0 && n >= 0 && n <= 1) return n * maxPts;
  return n;
}

export function replayQuestionVerdict(q, response) {
  const raw = response?.answers?.[q?.id];
  if (isBlankAnswer(raw)) {
    return { status: 'empty', label: 'No answer', showCorrect: false };
  }
  if (needsManualGrade(q, response)) {
    return { status: 'ungraded', label: 'Needs grading', showCorrect: false };
  }
  const maxPts = Number(q?.points) || 0;
  const stored = response?.per_question?.[q?.id];
  const earned = earnedFromStored(stored, maxPts);
  let correct = false;
  if (earned != null) correct = earned > 0;
  else correct = Boolean(gradeOne(q, raw));
  if (correct) {
    return { status: 'correct', label: 'Correct', showCorrect: false };
  }
  return {
    status: 'incorrect',
    label: 'Incorrect',
    showCorrect: true,
    correctText: formatCorrectAnswer(q),
  };
}
