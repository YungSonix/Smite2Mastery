const {
  supabaseAdmin,
  assertHost,
  send,
  readBody,
  getEnv,
  defaultQuestion,
} = require('../../lib/server/triviaApi');
const { isContentType, isManualType } = require('../../lib/server/triviaQuestionTypes');
const { responsesToCsv } = require('../../lib/server/triviaExport');

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

function randomSlug(title) {
  const base = String(title || 'quiz')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${base || 'quiz'}-${Math.random().toString(36).slice(2, 7)}`;
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
      const allow = getEnv('TRIVIA_HOST_ALLOWLIST', 'VITE_TRIVIA_HOST_ALLOWLIST');
      if (allow) {
        const set = new Set(
          allow
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        );
        if (!set.has(username.toLowerCase())) {
          return send(res, 403, { error: 'Username not allowlisted' });
        }
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
        .select('*')
        .eq('owner_username', username)
        .order('updated_at', { ascending: false });
      if (error) return send(res, 500, { error: error.message });
      return send(res, 200, { quizzes: data || [] });
    }

    if (req.method === 'GET' && action === 'quiz') {
      const { data: quiz, error } = await sb
        .from('trivia_quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('owner_username', username)
        .maybeSingle();
      if (error) return send(res, 500, { error: error.message });
      if (!quiz) return send(res, 404, { error: 'Quiz not found' });
      const { data: questions, error: qErr } = await sb
        .from('trivia_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('sort_order', { ascending: true });
      if (qErr) return send(res, 500, { error: qErr.message });
      return send(res, 200, { quiz, questions: questions || [] });
    }

    if (req.method === 'GET' && action === 'responses') {
      const { data: quiz, error } = await sb
        .from('trivia_quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('owner_username', username)
        .maybeSingle();
      if (error) return send(res, 500, { error: error.message });
      if (!quiz) return send(res, 404, { error: 'Quiz not found' });
      const [{ data: questions }, { data: responses, error: rErr }] = await Promise.all([
        sb
          .from('trivia_questions')
          .select('id, sort_order, type, prompt, points, meta')
          .eq('quiz_id', quiz.id)
          .order('sort_order', { ascending: true }),
        sb
          .from('trivia_responses')
          .select('*')
          .eq('quiz_id', quiz.id)
          .order('submitted_at', { ascending: false }),
      ]);
      if (rErr) return send(res, 500, { error: rErr.message });
      const format = String(url.searchParams.get('format') || '').toLowerCase();
      if (format === 'csv' || format === 'excel') {
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
      return send(res, 200, { quiz, questions: questions || [], responses: responses || [] });
    }

    if (req.method === 'GET' && action === 'analytics') {
      const { data: quizzes, error } = await sb
        .from('trivia_quizzes')
        .select('*')
        .eq('owner_username', username)
        .order('updated_at', { ascending: false });
      if (error) return send(res, 500, { error: error.message });
      const quizIds = (quizzes || []).map((q) => q.id);
      if (!quizIds.length) {
        return send(res, 200, { quizzes: [], questions: [], responses: [] });
      }
      const [{ data: questions }, { data: responses, error: rErr }] = await Promise.all([
        sb.from('trivia_questions').select('*').in('quiz_id', quizIds),
        sb
          .from('trivia_responses')
          .select('*')
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
          slug: randomSlug(title),
          banner_url: body.banner_url || null,
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
        const { data, error } = await sb.from('trivia_quizzes').insert(row).select('*').single();
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
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('*')
          .eq('id', body.quizId)
          .eq('owner_username', username)
          .maybeSingle();
        if (!quiz) return send(res, 404, { error: 'Quiz not found' });
        const { data: questions } = await sb
          .from('trivia_questions')
          .select('*')
          .eq('quiz_id', quiz.id)
          .order('sort_order', { ascending: true });
        const copy = {
          title: `${quiz.title} (copy)`,
          slug: randomSlug(quiz.title),
          banner_url: quiz.banner_url,
          owner_username: username,
          join_code: joinCode(),
          is_assigned: false,
          settings: quiz.settings || {},
        };
        const { data: newQuiz, error } = await sb.from('trivia_quizzes').insert(copy).select('*').single();
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
        const { data: quiz } = await sb
          .from('trivia_quizzes')
          .select('id')
          .eq('id', body.quizId)
          .eq('owner_username', username)
          .maybeSingle();
        if (!quiz) return send(res, 404, { error: 'Quiz not found' });
        const { count } = await sb
          .from('trivia_questions')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id);
        const type = body.type || 'multiple_choice';
        const defaults = defaultQuestion(type, count || 0);
        const { data, error } = await sb
          .from('trivia_questions')
          .insert({ ...defaults, quiz_id: quiz.id, ...(body.patch || {}) })
          .select('*')
          .single();
        if (error) return send(res, 500, { error: error.message });
        await touchQuiz(sb, quiz.id);
        return send(res, 200, { question: data });
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (body.action === 'update_quiz') {
        const patch = { ...body.patch, updated_at: new Date().toISOString() };
        delete patch.id;
        delete patch.owner_username;
        const { data, error } = await sb
          .from('trivia_quizzes')
          .update(patch)
          .eq('id', body.quizId)
          .eq('owner_username', username)
          .select('*')
          .single();
        if (error) return send(res, 500, { error: error.message });
        return send(res, 200, { quiz: data });
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
        const { data, error } = await sb
          .from('trivia_questions')
          .update(patch)
          .eq('id', body.questionId)
          .select('*')
          .single();
        if (error) return send(res, 500, { error: error.message });
        await touchQuiz(sb, qq.quiz_id);
        return send(res, 200, { question: data });
      }
      if (body.action === 'reorder') {
        const orders = Array.isArray(body.orders) ? body.orders : [];
        for (const row of orders) {
          await sb
            .from('trivia_questions')
            .update({ sort_order: row.sort_order, updated_at: new Date().toISOString() })
            .eq('id', row.id);
        }
        if (body.quizId) await touchQuiz(sb, body.quizId);
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
        const { error } = await sb
          .from('trivia_quizzes')
          .delete()
          .eq('id', qid)
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
