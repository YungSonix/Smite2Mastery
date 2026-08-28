const {
  supabaseAdmin,
  send,
  readBody,
  applyVariant,
  rateLimit,
  isValidQuizSlug,
  sanitizePlayerName,
} = require('../../lib/server/triviaApi');
const { compactDraftAnswers } = require('../../lib/server/triviaCommit');
const {
  storedHintList,
  questionHintsEnabled,
  mergeLifelineCounts,
  totalLifelinesUsed,
  extractLifelines,
  lifelineMultiplier,
  LIFELINES_PER_ATTEMPT,
  HINTS_PER_QUESTION,
} = require('../../lib/server/triviaHints');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return send(res, 204, {});
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    rateLimit(req, 'hint', { max: 90 });
    const body = await readBody(req, { maxBytes: 64 * 1024 });
    const slug = String(body.slug || '').trim().toLowerCase();
    const discordCheck = sanitizePlayerName(body.discord_username || body.discordUsername, 'Discord Username');
    const questionId = String(body.questionId || body.question_id || '').trim();
    const variantMap = body.variant_map && typeof body.variant_map === 'object' ? body.variant_map : {};
    if (!slug) return send(res, 400, { error: 'Missing quiz slug' });
    if (!isValidQuizSlug(slug)) return send(res, 400, { error: 'Invalid quiz slug' });
    if (!discordCheck.ok || discordCheck.value.length < 2) {
      return send(res, 400, { error: 'Discord Username required' });
    }
    if (!questionId || !/^[0-9a-f-]{36}$/i.test(questionId)) {
      return send(res, 400, { error: 'Missing question' });
    }
    const discord = discordCheck.value;

    const sb = supabaseAdmin();
    const { data: quiz, error: quizErr } = await sb
      .from('trivia_quizzes')
      .select('id, settings')
      .eq('slug', slug)
      .eq('is_assigned', true)
      .maybeSingle();
    if (quizErr) return send(res, 500, { error: quizErr.message });
    if (!quiz) return send(res, 404, { error: 'Quiz not found or not assigned' });
    if (!quiz.settings?.lifelines_enabled) {
      return send(res, 403, { error: 'Hints are off for this quiz' });
    }

    const { data: question, error: qErr } = await sb
      .from('trivia_questions')
      .select('*')
      .eq('id', questionId)
      .eq('quiz_id', quiz.id)
      .maybeSingle();
    if (qErr) return send(res, 500, { error: qErr.message });
    if (!question) return send(res, 404, { error: 'Question not found' });

    const applied = applyVariant(question, variantMap[question.id] ?? 0);
    if (!questionHintsEnabled(applied)) {
      return send(res, 400, { error: 'This question has no hints' });
    }
    const list = storedHintList(applied);

    const { data: session } = await sb
      .from('trivia_sessions')
      .select('id, draft_answers')
      .eq('quiz_id', quiz.id)
      .ilike('discord_username', discord)
      .maybeSingle();

    const draft = session?.draft_answers && typeof session.draft_answers === 'object' ? session.draft_answers : {};
    const counts = extractLifelines(draft);
    const usedOnQ = Number(counts[questionId]) || 0;
    if (usedOnQ >= HINTS_PER_QUESTION) {
      return send(res, 400, { error: 'No more hints on this question' });
    }
    if (totalLifelinesUsed(counts) >= LIFELINES_PER_ATTEMPT) {
      return send(res, 400, { error: 'No lifelines left' });
    }
    const text = list[usedOnQ];
    if (!text) return send(res, 400, { error: 'No hint text for this tier' });

    const nextCounts = mergeLifelineCounts(counts, { [questionId]: usedOnQ + 1 });
    const nextDraft = compactDraftAnswers({ ...draft, __lifelines: nextCounts });
    if (session?.id) {
      await sb.from('trivia_sessions').update({ draft_answers: nextDraft }).eq('id', session.id);
    }

    const total = totalLifelinesUsed(nextCounts);
    return send(res, 200, {
      text,
      tier: usedOnQ + 1,
      usedOnQuestion: nextCounts[questionId],
      remaining: Math.max(0, LIFELINES_PER_ATTEMPT - total),
      multiplier: lifelineMultiplier(nextCounts[questionId]),
    });
  } catch (e) {
    console.error('trivia hint error', e);
    return send(res, e.status || 500, { error: e.message || 'Hint failed' });
  }
};
