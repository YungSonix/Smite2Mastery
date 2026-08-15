/** Contest open/close window from quiz.settings.opens_at / closes_at (ISO). */

function quizWindowState(settings, nowMs = Date.now()) {
  const opensRaw = settings?.opens_at;
  const closesRaw = settings?.closes_at;
  const opens = opensRaw ? Date.parse(opensRaw) : NaN;
  const closes = closesRaw ? Date.parse(closesRaw) : NaN;
  if (Number.isFinite(opens) && nowMs < opens) {
    return { status: 'not_open', opensAt: opensRaw, closesAt: closesRaw || null };
  }
  if (Number.isFinite(closes) && nowMs > closes) {
    return { status: 'closed', opensAt: opensRaw || null, closesAt: closesRaw };
  }
  return { status: 'open', opensAt: opensRaw || null, closesAt: closesRaw || null };
}

function shouldPurgeLiveSessions(quiz) {
  if (!quiz) return false;
  if (quiz.is_assigned === false) return true;
  return quizWindowState(quiz.settings || {}).status === 'closed';
}

async function purgeLiveSessions(sb, quizId) {
  if (!sb || !quizId) return;
  const { error } = await sb.from('trivia_sessions').delete().eq('quiz_id', quizId);
  if (!error) return;
  const msg = String(error.message || error.code || '');
  if (error.code === '42P01' || error.code === 'PGRST205' || /trivia_sessions/i.test(msg)) return;
  console.warn('purgeLiveSessions', error.message);
}

module.exports = { quizWindowState, shouldPurgeLiveSessions, purgeLiveSessions };
