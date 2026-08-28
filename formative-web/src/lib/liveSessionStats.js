import { formatDuration } from './triviaInsights';

const CONTENT_TYPES = new Set(['image', 'content', 'audio', 'video', 'embed']);

export function isGateQuestion(q) {
  return Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);
}

export function isScoredLiveQuestion(q) {
  if (!q || CONTENT_TYPES.has(q.type) || isGateQuestion(q)) return false;
  return Number(q.points) > 0;
}

export function isLiveAnswered(q, answers) {
  const v = answers?.[q.id];
  if (v == null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') {
    if (v.x != null || v.y != null) return true;
    if (v.data || v.url) return true;
    return Object.values(v).some((x) => (Array.isArray(x) ? x.length > 0 : String(x || '').trim()));
  }
  return true;
}

/** First unanswered visible question (1-based), or null if every visible question has a draft answer. */
export function currentLiveQuestion(questions, answers) {
  for (let i = 0; i < (questions || []).length; i += 1) {
    const q = questions[i];
    if (isGateQuestion(q)) continue;
    if (CONTENT_TYPES.has(q.type) && Number(q.points) === 0) continue;
    if (!isLiveAnswered(q, answers)) {
      return { num: i + 1, preview: null };
    }
  }
  return null;
}

export function sessionElapsedMs(session, now = Date.now()) {
  const start = Date.parse(session?.client_started_at || session?.started_at);
  if (!Number.isFinite(start)) return null;
  return Math.max(0, now - start);
}

/**
 * Host-facing one-liner for live takers, e.g. "On Q 5 · 3m 12s" or "Reviewing · 8m 02s".
 * Uses draft_answers when present; falls back to answered_count for list polls.
 */
export function liveSessionSummary(session, { questions, now = Date.now() } = {}) {
  if (!session) return { text: '—', onQuestion: null, elapsedMs: null, elapsedLabel: '—' };

  const elapsedMs = sessionElapsedMs(session, now);
  const elapsedLabel = elapsedMs != null ? formatDuration(elapsedMs) : '—';
  const answers = session?.draft_answers || {};
  const answered = Number(session.answered_count) || 0;
  const total = Number(session.question_count) || 0;

  let onQuestion = null;
  let reviewing = false;

  if (questions?.length) {
    const current = currentLiveQuestion(questions, answers);
    if (current) onQuestion = current.num;
    else reviewing = answered > 0 || Object.keys(answers).some((k) => !k.startsWith('__'));
  } else if (total > 0) {
    if (answered >= total) reviewing = true;
    else onQuestion = Math.min(answered + 1, total);
  }

  const parts = [];
  if (onQuestion != null) parts.push(`On Q ${onQuestion}`);
  else if (reviewing) parts.push('Reviewing');
  else if (total > 0) parts.push(`${answered}/${total} answered`);

  if (elapsedLabel !== '—') parts.push(elapsedLabel);

  return {
    text: parts.length ? parts.join(' · ') : '—',
    onQuestion,
    reviewing,
    elapsedMs,
    elapsedLabel,
  };
}
