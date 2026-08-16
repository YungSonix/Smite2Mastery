const { scoreAnswersWithVariants, playerFacingScore, applyVariant } = require('./triviaApi');
const { quizWindowState } = require('./triviaWindow');
const { extractLifelines, mergeLifelineCounts } = require('./triviaHints');

function compactDraftAnswers(answers) {
  const out = {};
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return out;
  for (const [key, value] of Object.entries(answers)) {
    if (key === '__variant_map') continue;
    if (typeof value === 'string' && value.startsWith('data:') && value.length > 8000) continue;
    out[key] = value;
  }
  return out;
}

function sessionDeadlineMs(session, settings) {
  const start = Date.parse(session.client_started_at || session.started_at);
  if (!Number.isFinite(start)) return null;
  const limit = Math.max(0, Number(settings?.time_limit_seconds) || 0);
  if (limit > 0) return start + limit * 1000;
  return session.left_page ? start : null;
}

function sessionDraftDue(session, settings, nowMs = Date.now()) {
  if (!session) return false;
  const limit = Math.max(0, Number(settings?.time_limit_seconds) || 0);
  if (limit > 0) {
    const due = sessionDeadlineMs(session, settings);
    return due != null && nowMs >= due;
  }
  return Boolean(session.left_page);
}

async function commitGuestAttempt(sb, {
  quiz,
  questions,
  discord,
  ingame,
  answers,
  variantMap,
  ip,
  ua,
  allowClosedWindow = false,
}) {
  const win = quizWindowState(quiz.settings);
  if (win.status === 'not_open') {
    const err = new Error(`This quiz opens ${win.opensAt}`);
    err.status = 403;
    throw err;
  }
  if (win.status === 'closed' && !allowClosedWindow) {
    const err = new Error('This quiz is closed');
    err.status = 403;
    throw err;
  }

  const allowRetake = Boolean(quiz.settings?.allow_retake);
  if (!allowRetake) {
    const { data: existing } = await sb
      .from('trivia_responses')
      .select('id')
      .eq('quiz_id', quiz.id)
      .ilike('discord_username', discord)
      .maybeSingle();
    if (existing) {
      const err = new Error(
        'You already submitted with this Discord Username on this quiz. Open the new Assign take link, or set Total attempts to Unlimited.'
      );
      err.status = 409;
      throw err;
    }
  }

  const cleanAnswers = compactDraftAnswers(answers);
  const map = variantMap && typeof variantMap === 'object' ? variantMap : {};
  let sessionLifelines = {};
  try {
    const { data: live } = await sb
      .from('trivia_sessions')
      .select('draft_answers')
      .eq('quiz_id', quiz.id)
      .ilike('discord_username', discord)
      .maybeSingle();
    sessionLifelines = extractLifelines(live?.draft_answers);
  } catch {
    sessionLifelines = {};
  }
  cleanAnswers.__lifelines = mergeLifelineCounts(sessionLifelines, extractLifelines(cleanAnswers));
  const graded = scoreAnswersWithVariants(questions || [], cleanAnswers, map);
  const resolvedForFacing = (questions || []).map((q) => applyVariant(q, map[q.id] ?? 0));

  const row = {
    quiz_id: quiz.id,
    discord_username: discord,
    ingame_name: ingame,
    answers: { ...cleanAnswers, __variant_map: map },
    score: graded.score,
    max_score: graded.maxScore,
    per_question: graded.perQuestion,
    ip_address: ip || null,
    user_agent: ua || null,
    submitted_at: new Date().toISOString(),
  };

  if (allowRetake) {
    await sb.from('trivia_responses').delete().eq('quiz_id', quiz.id).ilike('discord_username', discord);
  }

  const { data: inserted, error: insErr } = await sb.from('trivia_responses').insert(row).select('*').single();
  if (insErr) {
    const err = new Error(insErr.message);
    err.status = 500;
    throw err;
  }

  await sb.from('trivia_sessions').delete().eq('quiz_id', quiz.id).ilike('discord_username', discord);

  const payload = { ok: true, responseId: inserted.id };
  if (Boolean(quiz.settings?.show_scores)) {
    const visible = playerFacingScore(resolvedForFacing, graded);
    payload.score = visible.score;
    payload.maxScore = visible.maxScore;
    payload.percent = visible.percent;
  }
  return payload;
}

async function flushQuizDrafts(sb, quiz) {
  if (!quiz?.id) return { flushed: 0 };
  const { data: sessions, error } = await sb.from('trivia_sessions').select('*').eq('quiz_id', quiz.id);
  if (error) {
    if (/draft_answers|client_started_at|schema cache|42703/i.test(error.message || '')) return { flushed: 0 };
    console.warn('trivia flush sessions', error.message);
    return { flushed: 0 };
  }
  const due = (sessions || []).filter((s) => sessionDraftDue(s, quiz.settings));
  if (!due.length) return { flushed: 0 };

  const { data: questions } = await sb.from('trivia_questions').select('*').eq('quiz_id', quiz.id).order('sort_order');
  let flushed = 0;
  for (const session of due) {
    const discord = String(session.discord_username || '').trim();
    const ingame = String(session.ingame_name || '').trim();
    if (!discord || !ingame) continue;
    try {
      await commitGuestAttempt(sb, {
        quiz,
        questions: questions || [],
        discord,
        ingame,
        answers: session.draft_answers || {},
        variantMap: session.variant_map || {},
        ip: session.ip_address,
        ua: session.user_agent,
        allowClosedWindow: true,
      });
      flushed += 1;
    } catch (err) {
      if (err.status === 409) {
        await sb.from('trivia_sessions').delete().eq('id', session.id);
        flushed += 1;
        continue;
      }
      console.warn('trivia flush draft', discord, err.message);
    }
  }
  return { flushed };
}

module.exports = {
  compactDraftAnswers,
  sessionDraftDue,
  commitGuestAttempt,
  flushQuizDrafts,
};
