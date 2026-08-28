const { supabaseAdmin, send, assertCronSecret } = require('../../lib/server/triviaApi');
const { flushQuizDrafts } = require('../../lib/server/triviaCommit');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return send(res, 405, { error: 'Method not allowed' });
  }
  try {
    assertCronSecret(req);
    const sb = supabaseAdmin();
    const { data: quizzes, error } = await sb
      .from('trivia_quizzes')
      .select('id, settings')
      .eq('is_assigned', true);
    if (error) return send(res, 500, { error: error.message });
    let flushed = 0;
    for (const quiz of quizzes || []) {
      const result = await flushQuizDrafts(sb, quiz);
      flushed += result.flushed || 0;
    }
    return send(res, 200, { ok: true, flushed });
  } catch (e) {
    console.error('trivia flush-drafts', e);
    return send(res, e.status || 500, { error: e.message || 'Flush failed' });
  }
};
