const { supabaseAdmin, send, sanitizeQuestionForPublic, buildVariantMap, applyVariant } = require('../../lib/server/triviaApi');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  try {
    const url = new URL(req.url, 'http://localhost');
    const slug = String(url.searchParams.get('slug') || '').trim();
    const discord = String(url.searchParams.get('discord') || '').trim();
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
      const { data: last } = await sb
        .from('trivia_responses')
        .select('answers')
        .eq('quiz_id', quiz.id)
        .ilike('discord_username', discord)
        .maybeSingle();
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
      return send(res, 200, { quiz, questions: resolved, variant_map: map });
    }

    return send(res, 200, {
      quiz,
      questions: rows.map((q) => sanitizeQuestionForPublic(q)),
    });
  } catch (e) {
    return send(res, 500, { error: e.message || 'Failed to load quiz' });
  }
};
