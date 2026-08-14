const {
  supabaseAdmin,
  readIp,
  scoreAnswersWithVariants,
  playerFacingScore,
  send,
  readBody,
  applyVariant,
} = require('../../lib/server/triviaApi');
const { quizWindowState } = require('../../lib/server/triviaWindow');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return send(res, 204, {});
  }
  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = await readBody(req);
    const slug = String(body.slug || '').trim();
    const discord = String(body.discord_username || body.discordUsername || '').trim();
    const ingame = String(body.ingame_name || body.ingameName || '').trim();
    const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
    const variantMap =
      body.variant_map && typeof body.variant_map === 'object'
        ? body.variant_map
        : answers.__variant_map && typeof answers.__variant_map === 'object'
          ? answers.__variant_map
          : {};
    const cleanAnswers = { ...answers };
    delete cleanAnswers.__variant_map;

    if (!slug) return send(res, 400, { error: 'Missing quiz slug' });
    if (!discord) return send(res, 400, { error: 'Discord Username is required' });
    if (discord.length > 64) return send(res, 400, { error: 'Discord Username too long' });
    if (!ingame) return send(res, 400, { error: 'In-Game Name is required' });
    if (ingame.length > 64) return send(res, 400, { error: 'In-Game Name too long' });

    const sb = supabaseAdmin();
    const { data: quiz, error: quizErr } = await sb
      .from('trivia_quizzes')
      .select('*')
      .eq('slug', slug)
      .eq('is_assigned', true)
      .maybeSingle();

    if (quizErr) return send(res, 500, { error: quizErr.message });
    if (!quiz) return send(res, 404, { error: 'Quiz not found or not assigned' });

    const win = quizWindowState(quiz.settings);
    if (win.status === 'not_open') {
      return send(res, 403, { error: `This quiz opens ${win.opensAt}` });
    }
    if (win.status === 'closed') {
      return send(res, 403, { error: 'This quiz is closed' });
    }

    const { data: questions, error: qErr } = await sb
      .from('trivia_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('sort_order', { ascending: true });

    if (qErr) return send(res, 500, { error: qErr.message });

    const allowRetake = Boolean(quiz.settings?.allow_retake);
    if (!allowRetake) {
      const { data: existing } = await sb
        .from('trivia_responses')
        .select('id')
        .eq('quiz_id', quiz.id)
        .ilike('discord_username', discord)
        .maybeSingle();
      if (existing) {
        return send(res, 409, { error: 'You already submitted with this Discord Username' });
      }
    }

    const graded = scoreAnswersWithVariants(questions || [], cleanAnswers, variantMap);
    const resolvedForFacing = (questions || []).map((q) =>
      applyVariant(q, variantMap[q.id] ?? 0)
    );
    const ip = readIp(req);
    const ua = req.headers['user-agent'] || null;

    const row = {
      quiz_id: quiz.id,
      discord_username: discord,
      ingame_name: ingame,
      answers: { ...cleanAnswers, __variant_map: variantMap },
      score: graded.score,
      max_score: graded.maxScore,
      per_question: graded.perQuestion,
      ip_address: ip,
      user_agent: ua,
      submitted_at: new Date().toISOString(),
    };

    if (allowRetake) {
      await sb
        .from('trivia_responses')
        .delete()
        .eq('quiz_id', quiz.id)
        .ilike('discord_username', discord);
    }

    const { data: inserted, error: insErr } = await sb
      .from('trivia_responses')
      .insert(row)
      .select('*')
      .single();

    if (insErr) return send(res, 500, { error: insErr.message });

    const showScores = Boolean(quiz.settings?.show_scores);
    const payload = {
      ok: true,
      responseId: inserted.id,
    };
    if (showScores) {
      const visible = playerFacingScore(resolvedForFacing, graded);
      payload.score = visible.score;
      payload.maxScore = visible.maxScore;
      payload.percent = visible.percent;
    }
    return send(res, 200, payload);
  } catch (e) {
    console.error('trivia submit error', e);
    return send(res, e.status || 500, { error: e.message || 'Submit failed' });
  }
};
