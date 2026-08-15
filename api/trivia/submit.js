const { supabaseAdmin, readIp, send, readBody } = require('../../lib/server/triviaApi');
const { commitGuestAttempt } = require('../../lib/server/triviaCommit');

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

    const { data: questions, error: qErr } = await sb
      .from('trivia_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('sort_order', { ascending: true });

    if (qErr) return send(res, 500, { error: qErr.message });

    const payload = await commitGuestAttempt(sb, {
      quiz,
      questions: questions || [],
      discord,
      ingame,
      answers: cleanAnswers,
      variantMap,
      ip: readIp(req),
      ua: req.headers['user-agent'] || null,
      allowClosedWindow: Boolean(body.force_timeout),
    });
    return send(res, 200, payload);
  } catch (e) {
    console.error('trivia submit error', e);
    return send(res, e.status || 500, { error: e.message || 'Submit failed' });
  }
};
