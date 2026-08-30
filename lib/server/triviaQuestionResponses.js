const SKIP_TYPES = new Set([
  'image',
  'content',
  'audio',
  'video',
  'embed',
  'file_response',
  'audio_response',
  'drawing',
]);

function isScoredQuestion(q) {
  if (!q?.id) return false;
  if (SKIP_TYPES.has(q.type)) return false;
  if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate) return false;
  return Number(q.points) > 0;
}

function compactAnswerValue(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > 500) return '[media]';
    if (value.length > 2000) return `${value.slice(0, 2000)}…`;
    return value;
  }
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value);
      if (s.length > 2000) return { truncated: true };
      return value;
    } catch {
      return null;
    }
  }
  return value;
}

function questionCategory(q) {
  const meta = q.meta && typeof q.meta === 'object' ? q.meta : {};
  return String(meta.remix_style || meta.category || meta.topic || q.type || '').trim() || null;
}

/** Build rows for trivia_question_responses from a graded submission. */
function buildQuestionResponseRows({
  responseId,
  quizId,
  discord,
  questions,
  answers,
  perQuestion,
  variantMap,
}) {
  if (!responseId || !quizId || !discord) return [];
  const timings =
    answers?.__timings && typeof answers.__timings === 'object' ? answers.__timings : {};
  const map = variantMap && typeof variantMap === 'object' ? variantMap : {};
  const rows = [];

  for (const q of questions || []) {
    if (!isScoredQuestion(q)) continue;
    const frac = perQuestion?.[q.id];
    if (frac == null) continue;
    const maxPoints = Number(q.points) || 0;
    const earnedFrac = Number(frac) || 0;
    const rawMs = Number(timings[q.id]);
    const responseTimeMs = Number.isFinite(rawMs) && rawMs >= 0 ? Math.round(rawMs) : null;
    const variantIndex = Math.max(0, Number(map[q.id]) || 0);

    rows.push({
      response_id: responseId,
      quiz_id: quizId,
      question_id: q.id,
      discord_username: discord,
      variant_index: variantIndex,
      is_correct: earnedFrac > 0,
      earned: maxPoints > 0 ? earnedFrac * maxPoints : earnedFrac,
      max_points: maxPoints,
      response_time_ms: responseTimeMs,
      category: questionCategory(q),
      answer_json: compactAnswerValue(answers[q.id]),
    });
  }

  return rows;
}

/** Fire-and-forget insert; logs on failure, never throws to caller. */
async function insertQuestionResponses(sb, payload) {
  const rows = buildQuestionResponseRows(payload);
  if (!rows.length) return { inserted: 0 };
  const { error } = await sb.from('trivia_question_responses').insert(rows);
  if (error) {
    console.warn('trivia_question_responses insert', error.message);
    return { inserted: 0, error: error.message };
  }
  return { inserted: rows.length };
}

function queueQuestionResponses(sb, payload) {
  void insertQuestionResponses(sb, payload).catch((err) => {
    console.warn('trivia question_responses', err?.message || err);
  });
}

module.exports = {
  buildQuestionResponseRows,
  insertQuestionResponses,
  queueQuestionResponses,
  isScoredQuestion,
};
