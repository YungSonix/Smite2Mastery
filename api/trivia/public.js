const {
  supabaseAdmin,
  send,
  sanitizeQuestionForPublic,
  buildVariantMap,
  applyVariant,
  rateLimit,
  isValidQuizSlug,
} = require('../../lib/server/triviaApi');
const { responseIsTestRow, resolveTestTakeMode } = require('../../lib/server/triviaTestTake');

async function loadSubmissionStatus(sb, quiz, discord, { isTestTake = false } = {}) {
  if (!discord || discord.length < 2) return null;
  if (Boolean(quiz.settings?.allow_retake)) return null;
  const { data: rows } = await sb
    .from('trivia_responses')
    .select('id, score, max_score, submitted_at, answers')
    .eq('quiz_id', quiz.id)
    .ilike('discord_username', discord);
  const prior = (rows || []).find((r) => responseIsTestRow(r) === Boolean(isTestTake));
  if (!prior) return null;
  const out = {
    already_submitted: true,
    response_id: prior.id,
    submitted_at: prior.submitted_at,
  };
  if (Boolean(quiz.settings?.show_scores)) {
    const max = Number(prior.max_score) || 0;
    const score = Number(prior.score) || 0;
    out.score = score;
    out.max_score = max;
    out.percent = max > 0 ? Math.round((score / max) * 100) : 0;
  }
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  try {
    rateLimit(req, 'public', { max: 240 });
    const url = new URL(req.url, 'http://localhost');
    const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase();
    const discord = String(url.searchParams.get('discord') || '').trim();
    const testToken = String(url.searchParams.get('token') || '').trim();
    const takeMode = String(url.searchParams.get('take') || '').toLowerCase();
    const sb = supabaseAdmin();

    // Latest assigned quiz for More → Scroll Trivia card (no slug).
    if (!slug) {
      const { data, error } = await sb
        .from('trivia_quizzes')
        .select('id, slug, title, banner_url, updated_at')
        .eq('is_assigned', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return send(res, 500, { error: error.message });
      return send(res, 200, { quiz: data || null });
    }

    if (!isValidQuizSlug(slug)) return send(res, 400, { error: 'Invalid quiz slug' });

    const { data: quiz, error } = await sb
      .from('trivia_quizzes')
      .select('id, slug, title, banner_url, join_code, is_assigned, settings')
      .eq('slug', slug)
      .eq('is_assigned', true)
      .maybeSingle();
    if (error) return send(res, 500, { error: error.message });
    if (!quiz) return send(res, 404, { error: 'Quiz not found or not assigned' });

    const { data: questions, error: qErr } = await sb
      .from('trivia_questions')
      .select('id, sort_order, type, prompt, points, required, options, image_url, meta')
      .eq('quiz_id', quiz.id)
      .order('sort_order', { ascending: true });
    if (qErr) return send(res, 500, { error: qErr.message });

    const rows = questions || [];
    // With Discord: resolve one variant per question (anti-share). Without: send sanitized pools.
    if (discord) {
      const assign = url.searchParams.get('assign') === '1';
      let sessionMap = null;
      let previousMap = null;
      const { data: session } = await sb
        .from('trivia_sessions')
        .select('variant_map')
        .eq('quiz_id', quiz.id)
        .ilike('discord_username', discord)
        .maybeSingle();
      if (session?.variant_map && typeof session.variant_map === 'object' && Object.keys(session.variant_map).length) {
        sessionMap = session.variant_map;
      }
      const isTestTake =
        takeMode === 'test' && resolveTestTakeMode(quiz.settings, testToken).isTestTake;
      const { data: lastRows } = await sb
        .from('trivia_responses')
        .select('answers')
        .eq('quiz_id', quiz.id)
        .ilike('discord_username', discord);
      const last = (lastRows || []).find((r) => responseIsTestRow(r) === isTestTake);
      const nested = last?.answers?.__variant_map;
      if (nested && typeof nested === 'object') previousMap = nested;

      let map;
      if (assign) {
        map = buildVariantMap(rows, slug, discord, sessionMap || previousMap, String(Date.now()));
      } else {
        map = sessionMap || buildVariantMap(rows, slug, discord, previousMap, '');
      }
      const resolved = rows.map((q) => {
        const applied = applyVariant(q, map[q.id] ?? 0);
        return sanitizeQuestionForPublic(applied);
      });
      const submission = await loadSubmissionStatus(sb, quiz, discord, {
        isTestTake:
          takeMode === 'test' && resolveTestTakeMode(quiz.settings, testToken).isTestTake,
      });
      const testTake =
        takeMode === 'test' && testToken
          ? resolveTestTakeMode(quiz.settings, testToken)
          : { isTestTake: false, valid: true };
      return send(res, 200, {
        quiz,
        questions: resolved,
        variant_map: map,
        submission,
        test_take: testTake.isTestTake,
        test_take_valid: testTake.valid,
      });
    }

    return send(res, 200, {
      quiz,
      questions: rows.map((q) => sanitizeQuestionForPublic(q)),
    });
  } catch (e) {
    return send(res, 500, { error: e.message || 'Failed to load quiz' });
  }
};
