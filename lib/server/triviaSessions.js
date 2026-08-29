const SESSION_LOOKUP_COLS =
  'id, hidden_count, ingame_name, user_agent, client_started_at, started_at, left_page, discord_username, last_seen_at, answered_count, client_session_token';

function tokenColumnMissing(err) {
  const msg = String(err?.message || err?.code || '');
  return err?.code === '42703' || /client_session_token|schema cache/i.test(msg);
}

function readTakeSessionToken(body) {
  const t = String(body?.take_session_token || body?.takeSessionToken || '').trim();
  if (!t || t.length > 64) return '';
  return t;
}

async function findQuizSession(sb, quizId, { discord, sessionToken }) {
  if (sessionToken) {
    const byToken = await sb
      .from('trivia_sessions')
      .select(SESSION_LOOKUP_COLS)
      .eq('quiz_id', quizId)
      .eq('client_session_token', sessionToken)
      .maybeSingle();
    if (byToken.error) {
      if (!tokenColumnMissing(byToken.error)) throw byToken.error;
    } else if (byToken.data) {
      return { session: byToken.data, via: 'token' };
    }
  }

  const byDiscord = await sb
    .from('trivia_sessions')
    .select(SESSION_LOOKUP_COLS)
    .eq('quiz_id', quizId)
    .ilike('discord_username', discord)
    .maybeSingle();
  if (byDiscord.error) throw byDiscord.error;
  if (!byDiscord.data) return { session: null, via: null };

  if (
    sessionToken &&
    byDiscord.data.client_session_token &&
    byDiscord.data.client_session_token !== sessionToken
  ) {
    return { session: null, via: null, conflict: 'discord_taken' };
  }

  return { session: byDiscord.data, via: 'discord' };
}

async function discordSessionTaken(sb, quizId, discord, excludeId) {
  const { data, error } = await sb
    .from('trivia_sessions')
    .select('id')
    .eq('quiz_id', quizId)
    .ilike('discord_username', discord)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  if (excludeId && data.id === excludeId) return false;
  return true;
}

async function deleteQuizSession(sb, quizId, { discord, sessionToken }) {
  if (sessionToken) {
    const { error } = await sb
      .from('trivia_sessions')
      .delete()
      .eq('quiz_id', quizId)
      .eq('client_session_token', sessionToken);
    if (!error) return;
    if (!tokenColumnMissing(error)) throw error;
  }
  await sb.from('trivia_sessions').delete().eq('quiz_id', quizId).ilike('discord_username', discord);
}

module.exports = {
  SESSION_LOOKUP_COLS,
  readTakeSessionToken,
  findQuizSession,
  discordSessionTaken,
  deleteQuizSession,
  tokenColumnMissing,
};
