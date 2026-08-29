/** Option index(es) marked correct for MC / multi / TF. */
export function correctChoiceIndexes(q) {
  if (q?.type === 'multiple_selection' || Array.isArray(q?.correct?.indices)) {
    return (q.correct?.indices || []).map(Number).filter((n) => Number.isFinite(n));
  }
  if (Number.isFinite(Number(q?.correct?.index))) return [Number(q.correct.index)];
  return [];
}

/** Human-readable correct answer for host replay / preview. */
export function formatCorrectAnswer(q) {
  if (!q) return null;
  if (q.meta?.kind === 'fill_blank' || q.type === 'short_answer') {
    const answers = q.correct?.answers || (q.correct?.answer ? [q.correct.answer] : []);
    const text = answers.filter(Boolean).join(' / ');
    return text || null;
  }
  const opts = Array.isArray(q?.options) ? q.options : [];
  const idxs = correctChoiceIndexes(q);
  if (idxs.length) {
    return idxs.map((i) => opts[i] ?? `#${i}`).join(', ');
  }
  if (Array.isArray(q?.correct?.answers) && q.correct.answers.length) {
    return q.correct.answers.join(' / ');
  }
  if (q.correct?.answer != null && String(q.correct.answer).trim()) {
    return String(q.correct.answer);
  }
  return null;
}
