const {
  supabaseAdmin,
  readIp,
  send,
  readBody,
  rateLimit,
  isValidQuizSlug,
  sanitizePlayerName,
} = require('../../lib/server/triviaApi');
const { commitGuestAttempt } = require('../../lib/server/triviaCommit');

const SUBMIT_MAX_BYTES = Number(process.env.TRIVIA_SUBMIT_MAX_BYTES) || 1024 * 1024;

function submitErrorContext(body, req) {
  const slug = String(body?.slug || '').trim();
  const discord = String(body?.discord_username || body?.discordUsername || '').trim();
  const answerKeys = body?.answers && typeof body.answers === 'object' ? Object.keys(body.answers).length : 0;
  const cl = req.headers['content-length'];
  return {
    slug: slug || null,
    discord: discord ? `${discord.slice(0, 3)}…` : null,
    answerKeys,
    contentLength: cl != null ? Number(cl) : null,
  };
}

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

  let body = {};
  try {
    rateLimit(req, 'submit', { max: 40 });
    body = await readBody(req, { maxBytes: SUBMIT_MAX_BYTES });
    const slug = String(body.slug || '').trim().toLowerCase();
    const discordRaw = body.discord_username || body.discordUsername;
    const ingameRaw = body.ingame_name || body.ingameName;
    const discordCheck = sanitizePlayerName(discordRaw, 'Discord Username');
    const ingameCheck = sanitizePlayerName(ingameRaw, 'In-Game Name');
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
    if (!isValidQuizSlug(slug)) return send(res, 400, { error: 'Invalid quiz slug' });
    if (!discordCheck.ok) return send(res, 400, { error: discordCheck.error });
    if (!ingameCheck.ok) return send(res, 400, { error: ingameCheck.error });
    const discord = discordCheck.value;
    const ingame = ingameCheck.value;

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
    const ctx = submitErrorContext(body, req);
    if (e.code === 'PAYLOAD_TOO_LARGE' || e.status === 413) {
      console.error('trivia submit payload too large', { ...ctx, maxBytes: SUBMIT_MAX_BYTES });
      return send(res, 413, {
        error: 'Submission too large. Remove large drawings or attachments and try again.',
      });
    }
    if (e.code === 'INVALID_JSON') {
      console.error('trivia submit invalid json', ctx);
      return send(res, 400, { error: 'Invalid submission format.' });
    }
    console.error('trivia submit error', {
      ...ctx,
      message: e.message,
      status: e.status,
      code: e.code,
    });
    return send(res, e.status || 500, { error: e.message || 'Submit failed' });
  }
};
