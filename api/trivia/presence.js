const {
  supabaseAdmin,
  send,
  readBody,
  readIp,
  rateLimit,
  isValidQuizSlug,
  sanitizePlayerName,
} = require('../../lib/server/triviaApi');
const { compactDraftAnswers, flushSessionIfDue, sessionDraftDue } = require('../../lib/server/triviaCommit');
const {
  readTakeSessionToken,
  findQuizSession,
  discordSessionTaken,
  tokenColumnMissing,
} = require('../../lib/server/triviaSessions');
const { quizWindowState, shouldPurgeLiveSessions, purgeLiveSessions } = require('../../lib/server/triviaWindow');

function tableMissing(err) {
  const msg = String(err?.message || err?.code || '');
  return err?.code === '42P01' || err?.code === 'PGRST205' || /trivia_sessions/i.test(msg);
}

function draftUnsupported(err) {
  const msg = String(err?.message || err?.code || '');
  return err?.code === '42703' || /draft_answers|variant_map|client_started_at|schema cache/i.test(msg);
}

/** Skip redundant DB writes when clients ping faster than this (visibility + interval). */
const MIN_PRESENCE_WRITE_MS = Number(process.env.TRIVIA_PRESENCE_MIN_WRITE_MS) || 12000;

function shouldThrottlePresenceWrite(existing, body, extra, answered) {
  if (!existing?.last_seen_at) return false;
  if (body.left_page || leftPageTruthy(body)) return false;
  if (Math.min(1, Math.max(0, Number(body.hidden_inc) || 0)) > 0) return false;
  if (Object.keys(extra).length > 0) return false;
  if (answered !== Number(existing.answered_count || 0)) return false;

  const last = Date.parse(existing.last_seen_at);
  if (!Number.isFinite(last)) return false;
  return Date.now() - last < MIN_PRESENCE_WRITE_MS;
}

function leftPageTruthy(body) {
  return Boolean(body.left_page);
}

function draftPatch(body, existing) {
  const extra = {};
  if (body.answers && typeof body.answers === 'object') {
    extra.draft_answers = compactDraftAnswers(body.answers);
  }
  if (body.variant_map && typeof body.variant_map === 'object') {
    extra.variant_map = body.variant_map;
  }
  const started = Number(body.started_at);
  if (Number.isFinite(started) && started > 0 && !existing?.client_started_at) {
    extra.client_started_at = new Date(started).toISOString();
  }
  return extra;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return send(res, 204, {});
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  try {
    rateLimit(req, 'presence', { max: 180 });
    const body = await readBody(req, { maxBytes: 256 * 1024 });
    const slug = String(body.slug || '').trim().toLowerCase();
    const discordCheck = sanitizePlayerName(body.discord_username || body.discordUsername, 'Discord Username');
    const ingameRaw = body.ingame_name || body.ingameName;
    const ingame = ingameRaw != null && String(ingameRaw).trim() ? String(ingameRaw).trim() : '';
    if (!slug) return send(res, 400, { error: 'Missing quiz slug' });
    if (!isValidQuizSlug(slug)) return send(res, 400, { error: 'Invalid quiz slug' });
    if (!discordCheck.ok || discordCheck.value.length < 2) {
      return send(res, 400, { error: 'Discord Username required' });
    }
    if (ingame.length > 64) return send(res, 400, { error: 'Name too long' });
    const discord = discordCheck.value;

    const sb = supabaseAdmin();
    const { data: quiz, error: quizErr } = await sb
      .from('trivia_quizzes')
      .select('id, slug, is_assigned, settings')
      .eq('slug', slug)
      .eq('is_assigned', true)
      .maybeSingle();
    if (quizErr) return send(res, 500, { error: quizErr.message });
    if (!quiz) return send(res, 404, { error: 'Quiz not found or not assigned' });
    if (shouldPurgeLiveSessions(quiz) || quizWindowState(quiz.settings).status !== 'open') {
      await purgeLiveSessions(sb, quiz.id);
      return send(res, 403, { error: 'This quiz is closed' });
    }

    const hiddenInc = Math.min(1, Math.max(0, Number(body.hidden_inc) || 0));
    const currentlyHidden = Boolean(body.currently_hidden);
    const leftPage = Boolean(body.left_page);
    const answered = Math.max(0, Math.min(200, Number(body.answered_count) || 0));
    const qCount = Math.max(0, Math.min(200, Number(body.question_count) || 0));
    const now = new Date().toISOString();
    const sessionToken = readTakeSessionToken(body);

    let existing = null;
    try {
      const found = await findQuizSession(sb, quiz.id, { discord, sessionToken });
      if (found.conflict === 'discord_taken') {
        return send(res, 409, {
          error: 'That Discord Username is already in use on this quiz by another taker.',
        });
      }
      existing = found.session;
    } catch (findErr) {
      if (tableMissing(findErr)) return send(res, 200, { ok: false, skipped: true });
      return send(res, 500, { error: findErr.message });
    }

    if (
      existing &&
      sessionToken &&
      String(existing.discord_username || '').toLowerCase() !== discord.toLowerCase()
    ) {
      const taken = await discordSessionTaken(sb, quiz.id, discord, existing.id);
      if (taken) {
        return send(res, 409, {
          error: 'That Discord Username is already in use on this quiz by another taker.',
        });
      }
    }

    const row = {
      quiz_id: quiz.id,
      discord_username: discord,
      ingame_name: ingame || existing?.ingame_name || null,
      last_seen_at: now,
      answered_count: answered,
      question_count: qCount,
      hidden_count: Number(existing?.hidden_count || 0) + hiddenInc,
      currently_hidden: leftPage ? true : currentlyHidden,
      left_page: leftPage,
      ip_address: readIp(req),
      user_agent: req.headers['user-agent'] || existing?.user_agent || null,
    };
    const extra = draftPatch(body, existing);
    const mergedForDue = existing
      ? {
          ...existing,
          ...row,
          client_started_at: extra.client_started_at || existing.client_started_at,
        }
      : null;

    if (shouldThrottlePresenceWrite(existing, body, extra, answered)) {
      if (mergedForDue && sessionDraftDue(mergedForDue, quiz.settings)) {
        await flushSessionIfDue(sb, quiz, mergedForDue).catch((err) =>
          console.warn('trivia flush after throttled presence', err.message)
        );
      }
      return send(res, 200, { ok: true, throttled: true });
    }

    const saveCols =
      'id, left_page, client_started_at, started_at, discord_username, ingame_name, ip_address, user_agent';
    const save = async (payload) => {
      if (existing) {
        return sb.from('trivia_sessions').update(payload).eq('id', existing.id).select(saveCols).maybeSingle();
      }
      const insertRow = { ...payload, started_at: now };
      if (sessionToken) insertRow.client_session_token = sessionToken;
      return sb.from('trivia_sessions').insert(insertRow).select(saveCols).maybeSingle();
    };

    const tokenPatch = sessionToken && !existing?.client_session_token ? { client_session_token: sessionToken } : {};
    let saved = await save({ ...row, ...extra, ...tokenPatch });
    if (saved.error && draftUnsupported(saved.error) && Object.keys(extra).length) {
      saved = await save(row);
    }
    if (saved.error) {
      if (tableMissing(saved.error)) return send(res, 200, { ok: false, skipped: true });
      if (saved.error.code === '23505') {
        if (tokenColumnMissing(saved.error)) return send(res, 200, { ok: true });
        return send(res, 409, {
          error: 'That Discord Username is already in use on this quiz by another taker.',
        });
      }
      return send(res, 500, { error: saved.error.message });
    }

    const lite = saved.data || existing;
    if (lite && (leftPage || sessionDraftDue({ ...existing, ...row, ...lite }, quiz.settings))) {
      await flushSessionIfDue(sb, quiz, lite).catch((err) =>
        console.warn('trivia flush after presence', err.message)
      );
    }
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('trivia presence error', e);
    return send(res, e.status || 500, { error: e.message || 'Presence failed' });
  }
};
