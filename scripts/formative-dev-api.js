/**
 * Local formative trivia API (in-memory) for Vite proxy on :3000.
 * Mirrors /api/trivia/host|public|submit without Supabase.
 *
 *   node scripts/formative-dev-api.js
 *   TRIVIA_HOST_SECRET=devsecret npm run formative:dev
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const {
  scoreAnswers,
  playerFacingScore,
  defaultQuestion,
  isContentType,
  isManualType,
} = require('../lib/server/triviaQuestionTypes');
const {
  sanitizeQuestionForPublic,
  buildVariantMap,
  applyVariant,
  scoreAnswersWithVariants,
} = require('../lib/server/triviaVariants');

const DATA_ROOT = path.resolve(__dirname, '../app/data');
const MEDIA_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.svg': 'image/svg+xml',
};

function serveMedia(req, res, urlPath) {
  const rel = decodeURIComponent(urlPath.replace(/^\/media\/?/, ''));
  if (!rel || rel.includes('\0') || path.isAbsolute(rel)) {
    return json(res, 400, { error: 'Bad media path' });
  }
  const abs = path.resolve(DATA_ROOT, rel);
  if (abs !== DATA_ROOT && !abs.startsWith(DATA_ROOT + path.sep)) {
    return json(res, 403, { error: 'Forbidden' });
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return json(res, 404, { error: 'Media not found' });
  }
  const ext = path.extname(abs).toLowerCase();
  const type = MEDIA_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(abs).pipe(res);
}

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
    const frac = n > 1 ? Math.min(1, n / pts) : Math.max(0, Math.min(1, n));
    score += frac * pts;
  }
  return { score, maxScore };
}

const PORT = Number(process.env.FORMATIVE_API_PORT || 3000);
const HOST_SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';
const ALLOWLIST = (process.env.TRIVIA_HOST_ALLOWLIST || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const db = {
  quizzes: new Map(),
  questions: new Map(),
  responses: new Map(),
};

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-host-username, x-host-secret',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function assertHost(req) {
  const username = String(req.headers['x-host-username'] || '').trim();
  const secret = req.headers['x-host-secret'];
  if (!username || secret !== HOST_SECRET) {
    const err = new Error('Host auth failed');
    err.status = 401;
    throw err;
  }
  if (ALLOWLIST.length && !ALLOWLIST.includes(username.toLowerCase())) {
    const err = new Error('Username not allowlisted');
    err.status = 403;
    throw err;
  }
  return username;
}

function slugify(title) {
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

function questionsForQuiz(quizId) {
  return [...db.questions.values()]
    .filter((q) => q.quiz_id === quizId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function readIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

async function handleHost(req, res, url) {
  let body = null;
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    body = await readBody(req);
  }

  if (req.method === 'POST' && body?.action === 'login') {
    const username = String(body.username || '').trim();
    if (!username) return json(res, 400, { error: 'Username required' });
    if (body.secret !== HOST_SECRET) return json(res, 401, { error: 'Invalid host secret' });
    if (ALLOWLIST.length && !ALLOWLIST.includes(username.toLowerCase())) {
      return json(res, 403, { error: 'Username not allowlisted' });
    }
    return json(res, 200, { ok: true, username });
  }

  const username = assertHost(req);
  const action = url.searchParams.get('action') || '';
  const quizId = url.searchParams.get('quizId') || '';
  const id = url.searchParams.get('id') || '';

  if (req.method === 'GET' && (action === 'list' || !action)) {
    const quizzes = [...db.quizzes.values()]
      .filter((q) => q.owner_username === username)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    return json(res, 200, { quizzes });
  }

  if (req.method === 'GET' && action === 'quiz') {
    const quiz = db.quizzes.get(quizId);
    if (!quiz || quiz.owner_username !== username) return json(res, 404, { error: 'Quiz not found' });
    return json(res, 200, { quiz, questions: questionsForQuiz(quiz.id) });
  }

  if (req.method === 'GET' && action === 'responses') {
    const quiz = db.quizzes.get(quizId);
    if (!quiz || quiz.owner_username !== username) return json(res, 404, { error: 'Quiz not found' });
    const questions = questionsForQuiz(quiz.id).map((q) => ({
      id: q.id,
      sort_order: q.sort_order,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
    }));
    const responses = [...db.responses.values()]
      .filter((r) => r.quiz_id === quiz.id)
      .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
    return json(res, 200, { quiz, questions, responses });
  }

  if (req.method === 'GET' && action === 'analytics') {
    const quizzes = [...db.quizzes.values()].filter((q) => q.owner_username === username);
    const quizIds = new Set(quizzes.map((q) => q.id));
    const questions = [...db.questions.values()].filter((q) => quizIds.has(q.quiz_id));
    const responses = [...db.responses.values()]
      .filter((r) => quizIds.has(r.quiz_id))
      .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
    return json(res, 200, { quizzes, questions, responses });
  }

  if (req.method === 'POST') {
    if (body.action === 'create') {
      const title = String(body.title || 'Untitled Scroll Trivia').trim() || 'Untitled Scroll Trivia';
      const now = new Date().toISOString();
      const quiz = {
        id: randomUUID(),
        title,
        slug: slugify(title),
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
          ...(body.settings || {}),
        },
        created_at: now,
        updated_at: now,
      };
      db.quizzes.set(quiz.id, quiz);
      const gates = [
        {
          id: randomUUID(),
          quiz_id: quiz.id,
          sort_order: 0,
          type: 'short_answer',
          prompt: 'Discord Username',
          points: 0,
          required: true,
          options: [],
          correct: { answers: [] },
          image_url: null,
          meta: { is_discord_gate: true },
          created_at: now,
          updated_at: now,
        },
        {
          id: randomUUID(),
          quiz_id: quiz.id,
          sort_order: 1,
          type: 'short_answer',
          prompt: 'In-Game Name',
          points: 0,
          required: true,
          options: [],
          correct: { answers: [] },
          image_url: null,
          meta: { is_ingame_gate: true },
          created_at: now,
          updated_at: now,
        },
      ];
      for (const gate of gates) db.questions.set(gate.id, gate);
      return json(res, 200, { quiz });
    }
    if (body.action === 'duplicate') {
      const quiz = db.quizzes.get(body.quizId);
      if (!quiz || quiz.owner_username !== username) return json(res, 404, { error: 'Quiz not found' });
      const now = new Date().toISOString();
      const copy = {
        ...quiz,
        id: randomUUID(),
        title: `${quiz.title} (copy)`,
        slug: slugify(quiz.title),
        join_code: joinCode(),
        is_assigned: false,
        created_at: now,
        updated_at: now,
      };
      db.quizzes.set(copy.id, copy);
      for (const q of questionsForQuiz(quiz.id)) {
        const nq = { ...q, id: randomUUID(), quiz_id: copy.id, created_at: now, updated_at: now };
        db.questions.set(nq.id, nq);
      }
      return json(res, 200, { quiz: copy });
    }
    if (body.action === 'add_question') {
      const quiz = db.quizzes.get(body.quizId);
      if (!quiz || quiz.owner_username !== username) return json(res, 404, { error: 'Quiz not found' });
      const count = questionsForQuiz(quiz.id).length;
      const now = new Date().toISOString();
      const q = {
        id: randomUUID(),
        quiz_id: quiz.id,
        ...defaultQuestion(body.type || 'multiple_choice', count),
        ...(body.patch || {}),
        created_at: now,
        updated_at: now,
      };
      db.questions.set(q.id, q);
      quiz.updated_at = now;
      return json(res, 200, { question: q });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (body.action === 'update_quiz') {
      const quiz = db.quizzes.get(body.quizId);
      if (!quiz || quiz.owner_username !== username) return json(res, 404, { error: 'Quiz not found' });
      Object.assign(quiz, body.patch || {}, { updated_at: new Date().toISOString() });
      delete quiz.id;
      quiz.id = body.quizId;
      quiz.owner_username = username;
      db.quizzes.set(quiz.id, quiz);
      return json(res, 200, { quiz });
    }
    if (body.action === 'update_question') {
      const q = db.questions.get(body.questionId);
      if (!q) return json(res, 404, { error: 'Question not found' });
      const quiz = db.quizzes.get(q.quiz_id);
      if (!quiz || quiz.owner_username !== username) return json(res, 403, { error: 'Forbidden' });
      Object.assign(q, body.patch || {}, { updated_at: new Date().toISOString() });
      q.id = body.questionId;
      q.quiz_id = quiz.id;
      db.questions.set(q.id, q);
      quiz.updated_at = new Date().toISOString();
      return json(res, 200, { question: q });
    }
    if (body.action === 'update_response') {
      const row = db.responses.get(body.responseId);
      if (!row) return json(res, 404, { error: 'Response not found' });
      const quiz = db.quizzes.get(row.quiz_id);
      if (!quiz || quiz.owner_username !== username) return json(res, 403, { error: 'Forbidden' });
      const questions = questionsForQuiz(row.quiz_id);
      const perQuestion = { ...(row.per_question || {}) };
      if (body.perQuestionPatch && typeof body.perQuestionPatch === 'object') {
        for (const [qid, val] of Object.entries(body.perQuestionPatch)) {
          if (val == null) delete perQuestion[qid];
          else perQuestion[qid] = Number(val);
        }
      } else if (body.questionId) {
        const q = questions.find((x) => x.id === body.questionId);
        const maxPts = Number(q?.points) || 0;
        const earned = Number(body.earned);
        if (!q || maxPts <= 0 || !Number.isFinite(earned)) {
          return json(res, 400, { error: 'Invalid grade' });
        }
        const clamped = Math.max(0, Math.min(maxPts, earned));
        perQuestion[body.questionId] = maxPts > 0 ? clamped / maxPts : 0;
      } else {
        return json(res, 400, { error: 'Missing grade patch' });
      }
      const { score, maxScore } = recomputeScore(questions, perQuestion);
      Object.assign(row, { per_question: perQuestion, score, max_score: maxScore });
      db.responses.set(row.id, row);
      return json(res, 200, { response: row });
    }
  }

  if (req.method === 'DELETE') {
    if (action === 'response' && id) {
      const row = db.responses.get(id);
      if (!row) return json(res, 404, { error: 'Not found' });
      const quiz = db.quizzes.get(row.quiz_id);
      if (!quiz || quiz.owner_username !== username) return json(res, 403, { error: 'Forbidden' });
      db.responses.delete(id);
      return json(res, 200, { ok: true });
    }
    if (action === 'question' && id) {
      const q = db.questions.get(id);
      if (!q) return json(res, 404, { error: 'Not found' });
      const quiz = db.quizzes.get(q.quiz_id);
      if (!quiz || quiz.owner_username !== username) return json(res, 403, { error: 'Forbidden' });
      db.questions.delete(id);
      quiz.updated_at = new Date().toISOString();
      return json(res, 200, { ok: true });
    }
    if (action === 'quiz' && (quizId || id)) {
      const qid = quizId || id;
      const quiz = db.quizzes.get(qid);
      if (!quiz || quiz.owner_username !== username) return json(res, 404, { error: 'Not found' });
      for (const q of questionsForQuiz(qid)) db.questions.delete(q.id);
      for (const [rid, r] of db.responses) {
        if (r.quiz_id === qid) db.responses.delete(rid);
      }
      db.quizzes.delete(qid);
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 400, { error: 'Unknown host action' });
}

async function handlePublic(req, res, url) {
  const slug = String(url.searchParams.get('slug') || '').trim();
  const discord = String(url.searchParams.get('discord') || '').trim();
  if (!slug) return json(res, 400, { error: 'Missing slug' });
  const quiz = [...db.quizzes.values()].find((q) => q.slug === slug && q.is_assigned);
  if (!quiz) return json(res, 404, { error: 'Quiz not found or not assigned' });
  const questions = questionsForQuiz(quiz.id);
  const quizOut = {
    id: quiz.id,
    slug: quiz.slug,
    title: quiz.title,
    banner_url: quiz.banner_url,
    join_code: quiz.join_code,
    is_assigned: quiz.is_assigned,
    settings: quiz.settings,
  };
  if (discord) {
    const map = buildVariantMap(questions, slug, discord);
    return json(res, 200, {
      quiz: quizOut,
      questions: questions.map((q) => sanitizeQuestionForPublic(applyVariant(q, map[q.id] ?? 0))),
      variant_map: map,
    });
  }
  return json(res, 200, {
    quiz: quizOut,
    questions: questions.map((q) => sanitizeQuestionForPublic(q)),
  });
}

async function handleSubmit(req, res) {
  const body = await readBody(req);
  const slug = String(body.slug || '').trim();
  const discord = String(body.discord_username || body.discordUsername || '').trim();
  const ingame = String(body.ingame_name || body.ingameName || '').trim();
  const answersRaw = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const variantMap =
    body.variant_map && typeof body.variant_map === 'object'
      ? body.variant_map
      : answersRaw.__variant_map && typeof answersRaw.__variant_map === 'object'
        ? answersRaw.__variant_map
        : {};
  const answers = { ...answersRaw };
  delete answers.__variant_map;
  if (!slug) return json(res, 400, { error: 'Missing quiz slug' });
  if (!discord) return json(res, 400, { error: 'Discord Username is required' });
  if (!ingame) return json(res, 400, { error: 'In-Game Name is required' });

  const quiz = [...db.quizzes.values()].find((q) => q.slug === slug && q.is_assigned);
  if (!quiz) return json(res, 404, { error: 'Quiz not found or not assigned' });

  const questions = questionsForQuiz(quiz.id);
  const allowRetake = Boolean(quiz.settings?.allow_retake);
  const existing = [...db.responses.values()].find(
    (r) => r.quiz_id === quiz.id && r.discord_username.toLowerCase() === discord.toLowerCase()
  );
  if (existing && !allowRetake) {
    return json(res, 409, { error: 'You already submitted with this Discord Username' });
  }
  if (existing && allowRetake) db.responses.delete(existing.id);

  const graded = scoreAnswersWithVariants(scoreAnswers, questions, answers, variantMap);
  const resolved = questions.map((q) => applyVariant(q, variantMap[q.id] ?? 0));
  const row = {
    id: randomUUID(),
    quiz_id: quiz.id,
    discord_username: discord,
    ingame_name: ingame,
    answers: { ...answers, __variant_map: variantMap },
    score: graded.score,
    max_score: graded.maxScore,
    per_question: graded.perQuestion,
    ip_address: readIp(req),
    user_agent: req.headers['user-agent'] || null,
    submitted_at: new Date().toISOString(),
  };
  db.responses.set(row.id, row);
  const showScores = Boolean(quiz.settings?.show_scores);
  const payload = { ok: true, responseId: row.id };
  if (showScores) {
    const visible = playerFacingScore(resolved, graded);
    payload.score = visible.score;
    payload.maxScore = visible.maxScore;
    payload.percent = visible.percent;
  }
  return json(res, 200, payload);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/api/trivia/host') return await handleHost(req, res, url);
    if (url.pathname === '/api/trivia/public') return await handlePublic(req, res, url);
    if (url.pathname === '/api/trivia/submit') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      return await handleSubmit(req, res);
    }
    if (url.pathname === '/api/trivia/health') {
      return json(res, 200, {
        ok: true,
        mode: 'memory',
        quizzes: db.quizzes.size,
        responses: db.responses.size,
      });
    }
    if (url.pathname === '/media' || url.pathname.startsWith('/media/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return json(res, 405, { error: 'Method not allowed' });
      }
      return serveMedia(req, res, url.pathname);
    }
    return json(res, 404, { error: 'Not found', path: url.pathname });
  } catch (e) {
    console.error(e);
    return json(res, e.status || 500, { error: e.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`[formative-dev-api] http://localhost:${PORT}`);
  console.log(`[formative-dev-api] TRIVIA_HOST_SECRET=${HOST_SECRET}`);
});
