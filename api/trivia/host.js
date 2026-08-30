const {
  supabaseAdmin,
  assertHost,
  send,
  readBody,
  getEnv,
  parseHostAllowlist,
  defaultQuestion,
  isQuizKeyUuid,
  shortQuizSlug,
  rewriteQuestionMedia,
  rewriteQuizBannerUrl,
} = require('../../lib/server/triviaApi');
const { isContentType, isManualType } = require('../../lib/server/triviaQuestionTypes');
const { responsesToCsv } = require('../../lib/server/triviaExport');
const { flushQuizDrafts } = require('../../lib/server/triviaCommit');
const { mapResponseForHost } = require('../../lib/server/triviaResponseMeta');
const { shouldPurgeLiveSessions, purgeLiveSessions } = require('../../lib/server/triviaWindow');
const { checkTriviaPayload, formatPayloadCheckReport } = require('../../lib/server/triviaPayloadCheck');

function recomputeScore(questions, perQuestion) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions || []) {
    if (isContentType(q.type) || isManualType(q.type)) continue;
    const pts = Number.isFinite(Number(q.points)) ? Number(q.points) : 1;
    if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate || pts <= 0) continue;
    maxScore += pts;
    const raw = perQuestion?.[q.id];
    if (raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    // Stored as 0/1 fraction (auto) or 0..1 fraction (manual)
    const frac = n > 1 ? Math.min(1, n / pts) : Math.max(0, Math.min(1, n));
    score += frac * pts;
  }
  return { score, maxScore };
}

async function insertQuizWithUniqueSlug(sb, row) {
  let lastError = null;
  for (let i = 0; i < 8; i += 1) {
    const { data, error } = await sb
      .from('trivia_quizzes')
      .insert({ ...row, slug: shortQuizSlug(7) })
      .select('*')
      .single();
    if (!error) return { data, error: null };
    lastError = error;
    if (error.code !== '23505' && !String(error.message || '').toLowerCase().includes('duplicate')) {
      return { data: null, error };
    }
  }
  return { data: null, error: lastError || { message: 'Could not allocate a short link' } };
}

async function findOwnedQuiz(sb, username, key, columns = '*') {
  const k = String(key || '').trim();
  if (!k) return { data: null, error: null };
  let q = sb.from('trivia_quizzes').select(columns).eq('owner_username', username);
  q = isQuizKeyUuid(k) ? q.eq('id', k) : q.eq('slug', k);
  return q.maybeSingle();
}

function joinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, x-host-username, x-host-secret'
    );
    return send(res, 204, {});
  }

  try {
    let body = null;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      body = await readBody(req);
    }

    // Login probe — validates secret without DB write
    if (req.method === 'POST' && body?.action === 'login') {
      const secret = getEnv('TRIVIA_HOST_SECRET', 'FORMATIVE_HOST_SECRET');
      const username = String(body.username || '').trim();
      if (!secret) return send(res, 500, { error: 'TRIVIA_HOST_SECRET is not set' });
      if (!username) return send(res, 400, { error: 'Username required' });
      if (body.secret !== secret) return send(res, 401, { error: 'Invalid host secret' });
      const allowSet = parseHostAllowlist(getEnv('TRIVIA_HOST_ALLOWLIST', 'VITE_TRIVIA_HOST_ALLOWLIST'));
      if (allowSet && !allowSet.has(username.toLowerCase())) {
        return send(res, 403, { error: 'Username not allowlisted' });
      }
      return send(res, 200, { ok: true, username });
    }

    const username = assertHost(req);
    const sb = supabaseAdmin();
    const url = new URL(req.url, 'http://localhost');
    const action = url.searchParams.get('action') || '';
    const quizId = url.searchParams.get('quizId') || '';
    const id = url.searchParams.get('id') || '';

    if (req.method === 'GET' && (action === 'list' || !action)) {
      const { data, error } = await sb
        .from('trivia_quizzes')
        .select('id, slug, title, banner_url, join_code, is_assigned, updated_at, created_at')
        .eq('owner_username', username)
        .order('updated_at', { ascending: false });
      if (error) return send(res, 500, { error: error.message });
      return send(res, 200, { quizzes: data || [] });
    }

    if (req.method === 'GET' && action === 'quiz') {
      const { data: quiz, error } = await findOwnedQuiz(sb, username, quizId);
      if (error) return send(res, 500, { error: error.message });
      if (!quiz) return send(res, 404, { error: 'Quiz not found' });
      const { data: questions, error: qErr } = await sb
        .from('trivia_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('sort_order', { ascending: true });
      if (qErr) return send(res, 500, { error: qErr.message });
      return send(res, 200, {
        quiz,
        questions: (questions || []).map((q) => rewriteQuestionMedia(q)),
      });
    }

    if (req.method === 'GET' && action === 'session') {
      const { data: quiz, error } = await findOwnedQuiz(sb, username, quizId, 'id');
      if (error) return send(res, 500, { error: error.message });
      if (!quiz) return send(res, 404, { error: 'Quiz not found' });
      const sessionId = String(url.searchParams.get('sessionId') || id || '').trim();
      if (!sessionId) return send(res, 400, { error: 'Missing sessionId' });
      const { data: session, error: sErr } = await sb
        .from('trivia_sessions')
        .select(
          'id, quiz_id, discord_username, ingame_name, last_seen_at, answered_count, question_count, hidden_count, currently_hidden, left_page, ip_address, started_at, client_started_at, draft_answers, variant_map'
        )
        .eq('quiz_id', quiz.id)
        .eq('id', sessionId)
        .maybeSingle();
      if (sErr) return send(res, 500, { error: sErr.message });
      if (!session) return send(res, 404, { error: 'Session not found' });
      return send(res, 200, { session });
    }

    if (req.method === 'GET' && action === 'response' && id) {
      const { data: row, error } = await sb
        .from('trivia_responses')
        .select(
          'id, quiz_id, discord_username, ingame_name, score, max_score, per_question, submitted_at, ip_address, answers, user_agent'
        )
        .eq('id', id)
        .maybeSingle();
      if (error) return send(res, 500, { error: error.message });
      if (!row) return send(res, 404, { error: 'Response not found' });
      const { data: quiz } = await sb
        .from('trivia_quizzes')
        .select('id, owner_username')
        .eq('id', row.quiz_id)
        .eq('owner_username', username)
        .maybeSingle();
      if (!quiz) return send(res, 403, { error: 'Forbidden' });
      return send(res, 200, { response: row });
    }

    if (req.method === 'GET' && action === 'responses') {
      const { data: quiz, error } = await findOwnedQuiz(sb, username, quizId);
      if (error) return send(res, 500, { error: error.message });
      if (!quiz) return send(res, 404, { error: 'Quiz not found' });
      const format = String(url.searchParams.get('format') || '').toLowerCase();
      const asCsv = format === 'csv' || format === 'excel';
      const includeAnswers =
        asCsv || String(url.searchParams.get('includeAnswers') || '').toLowerCase() === '1';
      const clientSince = String(url.searchParams.get('since') || '').trim();
      await flushQuizDrafts(sb, quiz).catch((err) => console.warn('trivia flush on responses', err.message));
      if (shouldPurgeLiveSessions(quiz)) {
        await purgeLiveSessions(sb, quiz.id);
      }

      const [{ count: responseCount }, { data: latestResp }] = await Promise.all([
        sb
          .from('trivia_responses')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id),
        sb
          .from('trivia_responses')
          .select('submitted_at')
          .eq('quiz_id', quiz.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      let latestSessionAt = '';
      if (!shouldPurgeLiveSessions(quiz)) {
        const { data: latestSession } = await sb
          .from('trivia_sessions')
          .select('last_seen_at')
          .eq('quiz_id', quiz.id)
          .order('last_seen_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        latestSessionAt = latestSession?.last_seen_at || '';
      }

      const watermark = `${responseCount || 0}|${latestResp?.submitted_at || ''}|${latestSessionAt}`;
      if (clientSince && clientSince === watermark) {
        return send(res, 200, { unchanged: true, watermark });
      }

      // answers required for duration/presence meta even on lite polls (stripped by mapResponseForHost)
      const responseColumns = includeAnswers
        ? 'id, quiz_id, discord_username, ingame_name, score, max_score, per_question, submitted_at, ip_address, answers, user_agent'
        : 'id, quiz_id, discord_username, ingame_name, score, max_score, per_question, submitted_at, ip_address, answers';

      const [{ data: questions }, { data: responses, error: rErr }] = await Promise.all([
        asCsv
          ? sb
              .from('trivia_questions')
              .select('id, sort_order, type, prompt, points, meta')
              .eq('quiz_id', quiz.id)
              .order('sort_order', { ascending: true })
          : Promise.resolve({ data: [] }),
        sb
          .from('trivia_responses')
          .select(responseColumns)
          .eq('quiz_id', quiz.id)
          .order('submitted_at', { ascending: false }),
      ]);
      if (rErr) return send(res, 500, { error: rErr.message });
      let sessions = [];
      let sessionsError = null;
      if (!shouldPurgeLiveSessions(quiz)) {
        const { data: sessionRows, error: sErr } = await sb
          .from('trivia_sessions')
          .select(
            'id, quiz_id, discord_username, ingame_name, last_seen_at, answered_count, question_count, hidden_count, currently_hidden, left_page, ip_address, started_at, client_started_at'
          )
          .eq('quiz_id', quiz.id)
          .order('last_seen_at', { ascending: false });
        if (sErr) {
          const msg = String(sErr.message || sErr.code || '');
          if (sErr.code === '42P01' || sErr.code === 'PGRST205' || /trivia_sessions/i.test(msg)) {
            sessionsError = 'Live takers need the trivia_sessions table. Run supabase/formative_trivia_sessions.sql.';
          } else {
            sessionsError = sErr.message;
          }
        } else {
          const cutoff = Date.now() - 15 * 60 * 1000;
          sessions = (sessionRows || []).filter((s) => {
            const last = Date.parse(s.last_seen_at);
            return Number.isFinite(last) && last >= cutoff;
          });
        }
      }
      if (asCsv) {
        const csv = responsesToCsv(quiz, responses || [], questions || []);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${String(quiz.slug || 'trivia')}-responses.csv"`
        );
        res.statusCode = 200;
        res.end(csv);
        return;
      }
      return send(res, 200, {
        responses: (responses || []).map((r) => mapResponseForHost(r, { includeAnswers })),
        sessions,
        sessionsError,
        watermark,
      });
    }

    if (req.method === 'GET' && action === 'analytics') {
      const { data: quizzes, error } = await sb
        .from('trivia_quizzes')
        .select('id, slug, title, updated_at')
        .eq('owner_username', username)
        .order('updated_at', { ascending: false });
      if (error) return send(res, 500, { error: error.message });
      const quizIds = (quizzes || []).map((q) => q.id);
      if (!quizIds.length) {
        return send(res, 200, { quizzes: [], questions: [], responses: [] });
      }
      const [{ data: questions }, { data: responses, error: rErr }] = await Promise.all([
        sb.from('trivia_questions').select('id, quiz_id, type, points, prompt').in('quiz_id', quizIds),
        sb
          .from('trivia_responses')
          .select('id, quiz_id, discord_username, score, max_score, per_question, submitted_at, ip_address')
          .in('quiz_id', quizIds)
          .order('submitted_at', { ascending: false }),
      ]);
      if (rErr) return send(res, 500, { error: rErr.message });
      return send(res, 200, {
        quizzes: quizzes || [],
        questions: questions || [],
        responses: responses || [],
      });
    }

    if (req.method === 'POST') {
      if (body.action === 'create') {
        const title = String(body.title || 'Untitled Scroll Trivia').trim() || 'Untitled Scroll Trivia';
        const row = {
          title,
          banner_url: rewriteQuizBannerUrl(body.banner_url),
          owner_username: username,
          join_code: joinCode(),
          is_assigned: false,
          settings: {
            instructions: '',
            allow_retake: false,
            after_submission: 'hidden',
            show_scores: false,
            show_answers: false,
            theme: 'scroll',
            ...(body.settings || {}),
          },
        };
        const { data, error } = await insertQuizWithUniqueSlug(sb, row);
        if (error) return send(res, 500, { error: error.message });

        // Default identity gates (not scored)
        await sb.from('trivia_questions').insert([
          {
            quiz_id: data.id,
            sort_order: 0,
            type: 'short_answer',
            prompt: 'Discord Username',
            points: 0,
            required: true,
            options: [],
            correct: { answers: [] },
            meta: { is_discord_gate: true },
          },
          {
            quiz_id: data.id,
            sort_order: 1,
            type: 'short_answer',
            prompt: 'In-Game Name',
            points: 0,
            required: true,
            options: [],
            correct: { answers: [] },
            meta: { is_ingame_gate: true },
          },
        ]);

        return send(res, 200, { quiz: data });
      }

      if (body.action === 'duplicate') {
        const { data: quiz } = await findOwnedQuiz(sb, username, body.quizId);
        if (!quiz) return send(res, 404, { error: 'Quiz not found' });
        const { data: questions } = await sb
          .from('trivia_questions')
          .select('*')
          .eq('quiz_id', quiz.id)
          .order('sort_order', { ascending: true });
        const copy = {
          title: `${quiz.title} (copy)`,
          banner_url: quiz.banner_url,
          owner_username: username,
          join_code: joinCode(),
          is_assigned: false,
          settings: quiz.settings || {},
        };
        const { data: newQuiz, error } = await insertQuizWithUniqueSlug(sb, copy);
        if (error) return send(res, 500, { error: error.message });
        if (questions?.length) {
          await sb.from('trivia_questions').insert(
            questions.map((q, i) => ({
              quiz_id: newQuiz.id,
              sort_order: i,
              type: q.type,
              prompt: q.prompt,
              points: q.points,
              required: q.required,
              options: q.options,
              correct: q.correct,
              image_url: q.image_url,
              meta: q.meta,
            }))
          );
        }
        return send(res, 200, { quiz: newQuiz });
      }

      if (body.action === 'add_question') {
        const { data: quiz } = await findOwnedQuiz(sb, username, body.quizId, 'id');
        if (!quiz) return send(res, 404, { error: 'Quiz not found' });
        const { count } = await sb
          .from('trivia_questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id);
        const type = body.type || 'multiple_choice';
        const defaults = defaultQuestion(type, count || 0);
        const patch = { ...(body.patch || {}) };
        delete patch.id;
        delete patch.quiz_id;
        const rewritten = rewriteQuestionMedia({ image_url: patch.image_url, meta: patch.meta });
        if (patch.image_url !== undefined) patch.image_url = rewritten.image_url;
        if (patch.meta !== undefined) patch.meta = rewritten.meta;
        const { data, error } = await sb
          .from('trivia_questions')
          .insert({ ...defaults, quiz_id: quiz.id, ...patch })
          .select('*')
          .single();
        if (error) return send(res, 500, { error: error.message });
        await touchQuiz(sb, quiz.id);
        return send(res, 200, { question: rewriteQuestionMedia(data) });
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (body.action === 'update_quiz') {
        const patch = { ...body.patch, updated_at: new Date().toISOString() };
        delete patch.id;
        delete patch.owner_username;
        if (Object.prototype.hasOwnProperty.call(patch, 'banner_url')) {
          patch.banner_url = rewriteQuizBannerUrl(patch.banner_url);
        }
        const { data: owned } = await findOwnedQuiz(sb, username, body.quizId, '*');
        if (!owned) return send(res, 404, { error: 'Quiz not found' });
        if (patch.is_assigned === true) {
          const { data: assignQuestions, error: aqErr } = await sb
            .from('trivia_questions')
            .select('*')
            .eq('quiz_id', owned.id)
            .order('sort_order', { ascending: true });
          if (aqErr) return send(res, 500, { error: aqErr.message });
          const payloadCheck = checkTriviaPayload({
            quiz: { ...owned, ...patch },
            questions: assignQuestions || [],
          });
          if (!payloadCheck.ok) {
            return send(res, 400, {
              error: 'Quiz payload too large or contains inline data: media — run npm run trivia:payload-check',
              payloadCheck,
            });
          }
          if (payloadCheck.level === 'warn') {
            console.warn('[trivia-payload-check] assign warning:\n' + formatPayloadCheckReport(payloadCheck));
          }
        }
        const { data, error } = await sb
          .from('trivia_quizzes')
          .update(patch)
          .eq('id', owned.id)
          .eq('owner_username', username)
          .select('*')
          .single();
        if (error) return send(res, 500, { error: error.message });
        if (patch.is_assigned === true) {
          await sb
            .from('trivia_quizzes')
            .update({ is_assigned: false, updated_at: new Date().toISOString() })
            .eq('owner_username', username)
            .neq('id', data.id);
        }
        if (shouldPurgeLiveSessions(data)) await purgeLiveSessions(sb, data.id);
        return send(res, 200, { quiz: data });
      }
      if (body.action === 'update_questions') {
        const items = Array.isArray(body.questions) ? body.questions : [];
        if (!items.length) return send(res, 200, { ok: true });
        const ids = items.map((item) => String(item.id || '')).filter(Boolean);
        const { data: rows } = await sb.from('trivia_questions').select('id, quiz_id').in('id', ids);
        const quizIds = [...new Set((rows || []).map((row) => row.quiz_id))];
        if (!rows?.length || quizIds.length !== 1 || rows.length !== ids.length) {
          return send(res, 400, { error: 'Questions must belong to one quiz' });
        }
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('id, owner_username')
          .eq('id', quizIds[0])
          .eq('owner_username', username)
          .maybeSingle();
        if (!quiz) return send(res, 403, { error: 'Not your quiz' });
        const now = new Date().toISOString();
        const updates = await Promise.all(
          items.map((item) => {
            const patch = { ...(item.patch || {}), updated_at: now };
            delete patch.id;
            delete patch.quiz_id;
            const rewritten = rewriteQuestionMedia({
              image_url: patch.image_url,
              meta: patch.meta,
            });
            if (patch.image_url !== undefined) patch.image_url = rewritten.image_url;
            if (patch.meta !== undefined) patch.meta = rewritten.meta;
            return sb.from('trivia_questions').update(patch).eq('id', item.id);
          }),
        );
        const failed = updates.find((result) => result.error);
        if (failed?.error) return send(res, 500, { error: failed.error.message });
        await touchQuiz(sb, quiz.id);
        const { data: allQuestions } = await sb
          .from('trivia_questions')
          .select('*')
          .eq('quiz_id', quiz.id)
          .order('sort_order', { ascending: true });
        const { data: quizRow } = await sb
          .from('trivia_quizzes')
          .select('*')
          .eq('id', quiz.id)
          .maybeSingle();
        const payloadCheck = checkTriviaPayload({
          quiz: quizRow || { id: quiz.id },
          questions: allQuestions || [],
        });
        if (payloadCheck.level !== 'ok') {
          console.warn('[trivia-payload-check] after save:\n' + formatPayloadCheckReport(payloadCheck));
        }
        return send(res, 200, { ok: true, payloadCheck: payloadCheck.level !== 'ok' ? payloadCheck : undefined });
      }
      if (body.action === 'update_question') {
        const { data: qq } = await sb
          .from('trivia_questions')
          .select('*')
          .eq('id', body.questionId)
          .maybeSingle();
        if (!qq) return send(res, 404, { error: 'Question not found' });
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('id, owner_username')
          .eq('id', qq.quiz_id)
          .maybeSingle();
        if (!quiz || quiz.owner_username !== username) {
          return send(res, 403, { error: 'Forbidden' });
        }
        const patch = { ...body.patch, updated_at: new Date().toISOString() };
        delete patch.id;
        delete patch.quiz_id;
        const rewritten = rewriteQuestionMedia({
          image_url: patch.image_url,
          meta: patch.meta,
        });
        if (patch.image_url !== undefined) patch.image_url = rewritten.image_url;
        if (patch.meta !== undefined) patch.meta = rewritten.meta;
        const { data, error } = await sb
          .from('trivia_questions')
          .update(patch)
          .eq('id', body.questionId)
          .select('*')
          .single();
        if (error) return send(res, 500, { error: error.message });
        await touchQuiz(sb, quiz.id);
        const { data: quizRow } = await sb
          .from('trivia_quizzes')
          .select('*')
          .eq('id', qq.quiz_id)
          .maybeSingle();
        const { data: allQuestions } = await sb
          .from('trivia_questions')
          .select('*')
          .eq('quiz_id', qq.quiz_id)
          .order('sort_order', { ascending: true });
        const payloadCheck = checkTriviaPayload({
          quiz: quizRow || { id: qq.quiz_id },
          questions: allQuestions || [],
        });
        if (payloadCheck.level !== 'ok') {
          console.warn('[trivia-payload-check] after save:\n' + formatPayloadCheckReport(payloadCheck));
        }
        return send(res, 200, {
          question: rewriteQuestionMedia(data),
          payloadCheck: payloadCheck.level !== 'ok' ? payloadCheck : undefined,
        });
      }
      if (body.action === 'reorder') {
        const orders = (Array.isArray(body.orders) ? body.orders : []).filter(
          (row) => row && row.id && Number.isFinite(Number(row.sort_order))
        );
        if (!orders.length) return send(res, 200, { ok: true });
        const ids = [...new Set(orders.map((row) => String(row.id)))];
        const { data: rows } = await sb.from('trivia_questions').select('id, quiz_id').in('id', ids);
        const quizIds = [...new Set((rows || []).map((row) => row.quiz_id))];
        if (!rows?.length || quizIds.length !== 1 || rows.length !== ids.length) {
          return send(res, 400, { error: 'Questions must belong to one quiz' });
        }
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('id, owner_username')
          .eq('id', quizIds[0])
          .eq('owner_username', username)
          .maybeSingle();
        if (!quiz) return send(res, 403, { error: 'Not your quiz' });
        const now = new Date().toISOString();
        const results = await Promise.all(
          orders.map((row) =>
            sb
              .from('trivia_questions')
              .update({ sort_order: Number(row.sort_order), updated_at: now })
              .eq('id', row.id)
              .eq('quiz_id', quiz.id)
          )
        );
        const failed = results.find((result) => result.error);
        if (failed?.error) return send(res, 500, { error: failed.error.message });
        await touchQuiz(sb, quiz.id);
        return send(res, 200, { ok: true });
      }
      if (body.action === 'update_response') {
        const { data: row } = await sb
          .from('trivia_responses')
          .select('*')
          .eq('id', body.responseId)
          .maybeSingle();
        if (!row) return send(res, 404, { error: 'Response not found' });
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('id, owner_username')
          .eq('id', row.quiz_id)
          .maybeSingle();
        if (!quiz || quiz.owner_username !== username) {
          return send(res, 403, { error: 'Forbidden' });
        }
        const { data: questions } = await sb
          .from('trivia_questions')
          .select('*')
          .eq('quiz_id', row.quiz_id)
          .order('sort_order', { ascending: true });

        const perQuestion = { ...(row.per_question || {}) };
        if (body.perQuestionPatch && typeof body.perQuestionPatch === 'object') {
          for (const [qid, val] of Object.entries(body.perQuestionPatch)) {
            if (val == null) delete perQuestion[qid];
            else perQuestion[qid] = Number(val);
          }
        } else if (body.questionId) {
          const q = (questions || []).find((x) => x.id === body.questionId);
          const maxPts = Number(q?.points) || 0;
          const earned = Number(body.earned);
          if (!q || maxPts <= 0 || !Number.isFinite(earned)) {
            return send(res, 400, { error: 'Invalid grade' });
          }
          const clamped = Math.max(0, Math.min(maxPts, earned));
          perQuestion[body.questionId] = maxPts > 0 ? clamped / maxPts : 0;
        } else {
          return send(res, 400, { error: 'Missing grade patch' });
        }

        const { score, maxScore } = recomputeScore(questions || [], perQuestion);
        const { data, error } = await sb
          .from('trivia_responses')
          .update({
            per_question: perQuestion,
            score,
            max_score: maxScore,
          })
          .eq('id', body.responseId)
          .select('*')
          .single();
        if (error) return send(res, 500, { error: error.message });
        return send(res, 200, { response: data });
      }
    }

    if (req.method === 'DELETE') {
      if (action === 'response' && id) {
        const { data: row } = await sb
          .from('trivia_responses')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!row) return send(res, 404, { error: 'Not found' });
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('id, owner_username')
          .eq('id', row.quiz_id)
          .eq('owner_username', username)
          .maybeSingle();
        if (!quiz) return send(res, 403, { error: 'Forbidden' });
        const { error } = await sb.from('trivia_responses').delete().eq('id', id);
        if (error) return send(res, 500, { error: error.message });
        return send(res, 200, { ok: true });
      }
      if (action === 'question' && id) {
        const { data: qq } = await sb.from('trivia_questions').select('*').eq('id', id).maybeSingle();
        if (!qq) return send(res, 404, { error: 'Not found' });
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('*')
          .eq('id', qq.quiz_id)
          .eq('owner_username', username)
          .maybeSingle();
        if (!quiz) return send(res, 403, { error: 'Forbidden' });
        const { error } = await sb.from('trivia_questions').delete().eq('id', id);
        if (error) return send(res, 500, { error: error.message });
        await touchQuiz(sb, quiz.id);
        return send(res, 200, { ok: true });
      }
      if (action === 'quiz' && (quizId || id)) {
        const qid = quizId || id;
        const { data: owned } = await findOwnedQuiz(sb, username, qid, 'id');
        if (!owned) return send(res, 404, { error: 'Quiz not found' });
        const { error } = await sb
          .from('trivia_quizzes')
          .delete()
          .eq('id', owned.id)
          .eq('owner_username', username);
        if (error) return send(res, 500, { error: error.message });
        return send(res, 200, { ok: true });
      }
    }

    return send(res, 400, { error: 'Unknown host action' });
  } catch (e) {
    console.error('trivia host error', e);
    return send(res, e.status || 500, { error: e.message || 'Host API failed' });
  }
};

async function touchQuiz(sb, quizId) {
  await sb
    .from('trivia_quizzes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', quizId);
}
