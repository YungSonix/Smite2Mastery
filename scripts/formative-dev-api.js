/**
 * Local formative trivia API (in-memory) for Vite proxy on :3000.
 * Mirrors /api/trivia/host|public|submit without Supabase.
 *
 * When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (.env / .env.local),
 * analytics + classroom routes use real Supabase (same as production).
 *
 *   node scripts/formative-dev-api.js
 *   npm run trivia:api
 *   npm run trivia:dev
 *   (optional) $env:TRIVIA_HOST_SECRET="devsecret"  # PowerShell
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

function loadDotEnv() {
  const root = path.resolve(__dirname, '..');
  for (const name of ['.env.local', '.env']) {
    const envPath = path.join(root, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadDotEnv();

const CLASSROOM_ACTIONS = new Set(['classroom-points', 'set-classroom-avatar', 'sync-player-profiles']);

function trySupabase() {
  try {
    const { supabaseAdmin } = require('../lib/server/triviaApi');
    return supabaseAdmin();
  } catch {
    return null;
  }
}
const {
  scoreAnswers,
  playerFacingScore,
  defaultQuestion,
  isContentType,
  isManualType,
} = require('../lib/server/triviaQuestionTypes');
const { isQuizKeyUuid, shortQuizSlug } = require('../lib/server/triviaApi');
const {
  sanitizeQuestionForPublic,
  buildVariantMap,
  applyVariant,
  scoreAnswersWithVariants,
} = require('../lib/server/triviaVariants');
const { rewriteQuestionMedia, rewriteQuizBannerUrl } = require('../lib/server/triviaMediaRewrite');
const { applyQuizPartialCreditToQuestions } = require('../lib/server/quizGradingSettings');
const { responsesToCsv } = require('../lib/server/triviaExport');
const { quizWindowState, shouldPurgeLiveSessions } = require('../lib/server/triviaWindow');
const { compactDraftAnswers, sessionDraftDue } = require('../lib/server/triviaCommit');
const {
  storedHintList,
  questionHintsEnabled,
  mergeLifelineCounts,
  totalLifelinesUsed,
  extractLifelines,
  lifelineMultiplier,
  LIFELINES_PER_ATTEMPT,
  HINTS_PER_QUESTION,
} = require('../lib/server/triviaHints');
const { answerKeyChanged, regradeOneResponse } = require('../lib/server/triviaRegrade');

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

function responsesForQuiz(quizId) {
  return [...db.responses.values()].filter((r) => r.quiz_id === quizId);
}

function regradeMemoryQuiz(quiz, questions, questionIds) {
  const list = responsesForQuiz(quiz.id);
  let updated = 0;
  let unchanged = 0;
  for (const row of list) {
    const result = regradeOneResponse({
      questions,
      quizSettings: quiz.settings,
      response: row,
      questionIds,
    });
    if (!result.changed) {
      unchanged += 1;
      continue;
    }
    Object.assign(row, {
      per_question: result.perQuestion,
      score: result.score,
      max_score: result.maxScore,
    });
    db.responses.set(row.id, row);
    updated += 1;
  }
  return { total: list.length, updated, unchanged, errors: 0 };
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
  sessions: new Map(),
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

function uniqueShortSlug() {
  for (let i = 0; i < 12; i += 1) {
    const slug = shortQuizSlug(7);
    const taken = [...db.quizzes.values()].some((q) => q.slug === slug);
    if (!taken) return slug;
  }
  return shortQuizSlug(10);
}

function findOwnedQuiz(username, key) {
  const k = String(key || '').trim();
  if (!k) return null;
  if (isQuizKeyUuid(k)) {
    const quiz = db.quizzes.get(k);
    if (quiz && quiz.owner_username === username) return quiz;
    return null;
  }
  return [...db.quizzes.values()].find((q) => q.slug === k && q.owner_username === username) || null;
}

function joinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function questionsForQuiz(quizId) {
  return [...db.questions.values()]
    .filter((q) => q.quiz_id === quizId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function sessionKey(quizId, discord) {
  return `${quizId}|${String(discord || '').toLowerCase()}`;
}

function readTakeSessionToken(body) {
  const t = String(body?.take_session_token || body?.takeSessionToken || '').trim();
  return t || '';
}

function findMemorySession(quizId, { discord, sessionToken }) {
  if (sessionToken) {
    for (const s of db.sessions.values()) {
      if (s.quiz_id === quizId && s.client_session_token === sessionToken) return s;
    }
  }
  if (discord) return db.sessions.get(sessionKey(quizId, discord)) || null;
  return null;
}

function dropMemorySession(session) {
  if (!session?.id) return;
  for (const [key, s] of db.sessions.entries()) {
    if (s.id === session.id) db.sessions.delete(key);
  }
}

function purgeMemorySessions(quizId) {
  for (const [key, s] of db.sessions) {
    if (s.quiz_id === quizId) db.sessions.delete(key);
  }
}

function liveSessionsForQuiz(quiz, responses) {
  if (shouldPurgeLiveSessions(quiz)) {
    purgeMemorySessions(quiz.id);
    return [];
  }
  const cutoff = Date.now() - 15 * 60 * 1000;
  return [...db.sessions.values()]
    .filter((s) => {
      if (s.quiz_id !== quiz.id) return false;
      const last = Date.parse(s.last_seen_at);
      return Number.isFinite(last) && last >= cutoff;
    })
    .map((s) => {
      const { draft_answers: _d, variant_map: _v, ...rest } = s;
      return rest;
    })
    .sort((a, b) => String(b.last_seen_at).localeCompare(String(a.last_seen_at)));
}

function flushMemoryDrafts(quiz) {
  if (!quiz) return;
  const questions = questionsForQuiz(quiz.id);
  const allowRetake = Boolean(quiz.settings?.allow_retake);
  for (const [key, session] of [...db.sessions.entries()]) {
    if (session.quiz_id !== quiz.id || !sessionDraftDue(session, quiz.settings)) continue;
    const discord = String(session.discord_username || '').trim();
    const ingame = String(session.ingame_name || '').trim();
    if (!discord || !ingame) continue;
    const existing = [...db.responses.values()].find(
      (r) => r.quiz_id === quiz.id && r.discord_username.toLowerCase() === discord.toLowerCase()
    );
    if (existing && !allowRetake) {
      db.sessions.delete(key);
      continue;
    }
    if (existing && allowRetake) db.responses.delete(existing.id);
    const answers = compactDraftAnswers(session.draft_answers || {});
    const variantMap = session.variant_map && typeof session.variant_map === 'object' ? session.variant_map : {};
    const graded = scoreAnswersWithVariants(
      scoreAnswers,
      applyQuizPartialCreditToQuestions(questions, quiz.settings),
      answers,
      variantMap
    );
    const row = {
      id: randomUUID(),
      quiz_id: quiz.id,
      discord_username: discord,
      ingame_name: ingame,
      answers: { ...answers, __variant_map: variantMap },
      score: graded.score,
      max_score: graded.maxScore,
      per_question: graded.perQuestion,
      ip_address: session.ip_address || null,
      user_agent: session.user_agent || null,
      submitted_at: new Date().toISOString(),
    };
    db.responses.set(row.id, row);
    db.sessions.delete(key);
  }
}

async function handlePresence(req, res) {
  const body = await readBody(req);
  const slug = String(body.slug || '').trim();
  const discord = String(body.discord_username || body.discordUsername || '').trim();
  const ingame = String(body.ingame_name || body.ingameName || '').trim();
  if (!slug) return json(res, 400, { error: 'Missing quiz slug' });
  if (!discord || discord.length < 2) return json(res, 400, { error: 'Discord Username required' });
  const quiz = [...db.quizzes.values()].find((q) => q.slug === slug && q.is_assigned);
  if (!quiz) return json(res, 404, { error: 'Quiz not found or not assigned' });
  if (shouldPurgeLiveSessions(quiz) || quizWindowState(quiz.settings).status !== 'open') {
    purgeMemorySessions(quiz.id);
    return json(res, 403, { error: 'This quiz is closed' });
  }
  const sessionToken = readTakeSessionToken(body);
  let existing = findMemorySession(quiz.id, { discord, sessionToken });
  if (
    existing &&
    sessionToken &&
    String(existing.discord_username || '').toLowerCase() !== discord.toLowerCase()
  ) {
    const taken = [...db.sessions.values()].some(
      (s) =>
        s.quiz_id === quiz.id &&
        s.id !== existing.id &&
        String(s.discord_username || '').toLowerCase() === discord.toLowerCase()
    );
    if (taken) {
      return json(res, 409, {
        error: 'That Discord Username is already in use on this quiz by another taker.',
      });
    }
    dropMemorySession(existing);
  }
  const hiddenInc = Math.min(1, Math.max(0, Number(body.hidden_inc) || 0));
  const now = new Date().toISOString();
  const leftPage = Boolean(body.left_page);
  const started = Number(body.started_at);
  const record = {
    id: existing?.id || randomUUID(),
    quiz_id: quiz.id,
    discord_username: discord,
    ingame_name: ingame || existing?.ingame_name || null,
    started_at: existing?.started_at || now,
    last_seen_at: now,
    answered_count: Math.max(0, Number(body.answered_count) || 0),
    question_count: Math.max(0, Number(body.question_count) || 0),
    hidden_count: Number(existing?.hidden_count || 0) + hiddenInc,
    currently_hidden: leftPage ? true : Boolean(body.currently_hidden),
    left_page: leftPage,
    draft_answers: body.answers ? compactDraftAnswers(body.answers) : existing?.draft_answers || null,
    variant_map: body.variant_map && typeof body.variant_map === 'object' ? body.variant_map : existing?.variant_map || null,
    client_started_at:
      existing?.client_started_at ||
      (Number.isFinite(started) && started > 0 ? new Date(started).toISOString() : null),
    client_session_token: sessionToken || existing?.client_session_token || null,
    ip_address: readIp(req) || existing?.ip_address || null,
    user_agent: req.headers['user-agent'] || existing?.user_agent || null,
  };
  dropMemorySession(record);
  db.sessions.set(sessionKey(quiz.id, discord), record);
  flushMemoryDrafts(quiz);
  return json(res, 200, { ok: true });
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
    const quiz = findOwnedQuiz(username, quizId);
    if (!quiz) return json(res, 404, { error: 'Quiz not found' });
    return json(res, 200, {
      quiz,
      questions: questionsForQuiz(quiz.id).map((q) => rewriteQuestionMedia(q)),
    });
  }

  if (req.method === 'GET' && action === 'responses') {
    const quiz = findOwnedQuiz(username, quizId);
    if (!quiz) return json(res, 404, { error: 'Quiz not found' });
    flushMemoryDrafts(quiz);
    const questions = questionsForQuiz(quiz.id);
    const responses = [...db.responses.values()]
      .filter((r) => r.quiz_id === quiz.id)
      .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
    const format = String(url.searchParams.get('format') || '').toLowerCase();
    if (format === 'csv' || format === 'excel') {
      const csv = responsesToCsv(quiz, responses, questions);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${String(quiz.slug || 'trivia')}-responses.csv"`,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(csv);
      return;
    }
    return json(res, 200, { quiz, questions, responses, sessions: liveSessionsForQuiz(quiz, responses) });
  }

  if (req.method === 'GET' && action === 'analytics') {
    const sb = trySupabase();
    if (sb) {
      try {
        const { fetchHostAnalytics } = require('../lib/server/triviaHostClassroom');
        const syncFlag = String(url.searchParams.get('syncProfiles') || '').toLowerCase();
        const shouldSync = syncFlag === '1' || syncFlag === 'true';
        const payload = await fetchHostAnalytics(sb, username, { syncProfiles: shouldSync });
        return json(res, 200, { ...payload, devMode: 'supabase' });
      } catch (e) {
        return json(res, e.status || 500, { error: e.message });
      }
    }
    const quizzes = [...db.quizzes.values()].filter((q) => q.owner_username === username);
    const quizIds = new Set(quizzes.map((q) => q.id));
    const questions = [...db.questions.values()].filter((q) => quizIds.has(q.quiz_id));
    const responses = [...db.responses.values()]
      .filter((r) => quizIds.has(r.quiz_id))
      .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
    return json(res, 200, { quizzes, questions, responses, playerProfiles: [] });
  }

  if (
    req.method === 'POST' &&
    body?.action &&
    CLASSROOM_ACTIONS.has(String(body.action))
  ) {
    const sb = trySupabase();
    if (sb) {
      try {
        const { handleHostClassroomPost } = require('../lib/server/triviaHostClassroom');
        const result = await handleHostClassroomPost(sb, username, body);
        if (result) return json(res, result.status, result.body);
      } catch (e) {
        return json(res, e.status || 500, { error: e.message });
      }
    }
    return json(res, 503, {
      error:
        'Classroom actions need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env for local dev',
    });
  }

  if (req.method === 'POST') {
    if (body.action === 'create') {
      const title = String(body.title || 'Untitled Scroll Trivia').trim() || 'Untitled Scroll Trivia';
      const now = new Date().toISOString();
      const quiz = {
        id: randomUUID(),
        title,
        slug: uniqueShortSlug(),
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
      const quiz = findOwnedQuiz(username, body.quizId);
      if (!quiz) return json(res, 404, { error: 'Quiz not found' });
      const now = new Date().toISOString();
      const copy = {
        ...quiz,
        id: randomUUID(),
        title: `${quiz.title} (copy)`,
        slug: uniqueShortSlug(),
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
      const quiz = findOwnedQuiz(username, body.quizId);
      if (!quiz) return json(res, 404, { error: 'Quiz not found' });
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
      const quiz = findOwnedQuiz(username, body.quizId);
      if (!quiz) return json(res, 404, { error: 'Quiz not found' });
      const patch = { ...(body.patch || {}) };
      if (Object.prototype.hasOwnProperty.call(patch, 'banner_url')) {
        patch.banner_url = rewriteQuizBannerUrl(patch.banner_url);
      }
      Object.assign(quiz, patch, { updated_at: new Date().toISOString() });
      delete quiz.owner_username;
      quiz.owner_username = username;
      db.quizzes.set(quiz.id, quiz);
      if (patch.is_assigned === true) {
        for (const other of db.quizzes.values()) {
          if (other.owner_username === username && other.id !== quiz.id) other.is_assigned = false;
        }
      }
      if (shouldPurgeLiveSessions(quiz)) purgeMemorySessions(quiz.id);
      return json(res, 200, { quiz });
    }
    if (body.action === 'update_questions') {
      const items = Array.isArray(body.questions) ? body.questions : [];
      if (!items.length) return json(res, 200, { ok: true });
      const now = new Date().toISOString();
      let quizIdForTouch = null;
      const keyChangedIds = [];
      for (const item of items) {
        const q = db.questions.get(item.id);
        if (!q) return json(res, 404, { error: 'Question not found' });
        const quiz = db.quizzes.get(q.quiz_id);
        if (!quiz || quiz.owner_username !== username) return json(res, 403, { error: 'Forbidden' });
        if (quizIdForTouch && quizIdForTouch !== quiz.id) {
          return json(res, 400, { error: 'Questions must belong to one quiz' });
        }
        quizIdForTouch = quiz.id;
        const patch = { ...(item.patch || {}) };
        if (answerKeyChanged(q, patch)) keyChangedIds.push(String(item.id));
        Object.assign(q, rewriteQuestionMedia({ ...q, ...patch }), { updated_at: now });
        q.id = item.id;
        q.quiz_id = quiz.id;
        db.questions.set(q.id, q);
      }
      const quiz = db.quizzes.get(quizIdForTouch);
      if (quiz) quiz.updated_at = now;
      let regrade = null;
      if (quiz && keyChangedIds.length) {
        regrade = regradeMemoryQuiz(quiz, questionsForQuiz(quiz.id), keyChangedIds);
      }
      return json(res, 200, { ok: true, regrade: regrade || undefined });
    }
    if (body.action === 'update_question') {
      const q = db.questions.get(body.questionId);
      if (!q) return json(res, 404, { error: 'Question not found' });
      const quiz = db.quizzes.get(q.quiz_id);
      if (!quiz || quiz.owner_username !== username) return json(res, 403, { error: 'Forbidden' });
      const patch = { ...(body.patch || {}) };
      const keyChanged = answerKeyChanged(q, patch);
      Object.assign(q, rewriteQuestionMedia({ ...q, ...patch }), {
        updated_at: new Date().toISOString(),
      });
      q.id = body.questionId;
      q.quiz_id = quiz.id;
      db.questions.set(q.id, q);
      quiz.updated_at = new Date().toISOString();
      let regrade = null;
      if (keyChanged) {
        regrade = regradeMemoryQuiz(quiz, questionsForQuiz(quiz.id), [String(body.questionId)]);
      }
      return json(res, 200, { question: q, regrade: regrade || undefined });
    }
    if (body.action === 'regrade_responses') {
      const key = body.quizId || body.id;
      const quiz = findOwnedQuiz(username, key);
      if (!quiz) return json(res, 404, { error: 'Quiz not found' });
      const questionIds = Array.isArray(body.questionIds)
        ? body.questionIds.map(String).filter(Boolean)
        : undefined;
      const regrade = regradeMemoryQuiz(quiz, questionsForQuiz(quiz.id), questionIds);
      return json(res, 200, { ok: true, regrade });
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
      const quiz = findOwnedQuiz(username, qid);
      if (!quiz) return json(res, 404, { error: 'Not found' });
      for (const q of questionsForQuiz(quiz.id)) db.questions.delete(q.id);
      for (const [rid, r] of db.responses) {
        if (r.quiz_id === quiz.id) db.responses.delete(rid);
      }
      db.quizzes.delete(quiz.id);
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 400, { error: 'Unknown host action' });
}

async function handlePublic(req, res, url) {
  const slug = String(url.searchParams.get('slug') || '').trim();
  const discord = String(url.searchParams.get('discord') || '').trim();
  if (!slug) {
    const assigned = [...db.quizzes.values()]
      .filter((q) => q.is_assigned)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    const q = assigned[0];
    return json(res, 200, {
      quiz: q
        ? { id: q.id, slug: q.slug, title: q.title, banner_url: q.banner_url, updated_at: q.updated_at }
        : null,
    });
  }
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
    const assign = url.searchParams.get('assign') === '1';
    const existingSession = db.sessions.get(sessionKey(quiz.id, discord));
    const sessionMap =
      existingSession?.variant_map &&
      typeof existingSession.variant_map === 'object' &&
      Object.keys(existingSession.variant_map).length
        ? existingSession.variant_map
        : null;
    const last = [...db.responses.values()].find(
      (r) => r.quiz_id === quiz.id && String(r.discord_username || '').toLowerCase() === discord.toLowerCase()
    );
    const previous = last?.answers?.__variant_map;
    const map = assign
      ? buildVariantMap(questions, slug, discord, sessionMap || previous, String(Date.now()))
      : sessionMap || buildVariantMap(questions, slug, discord, previous, '');
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
  const win = quizWindowState(quiz.settings);
  if (win.status === 'not_open') {
    return json(res, 403, { error: `This quiz opens ${win.opensAt}` });
  }
  if (win.status === 'closed') {
    return json(res, 403, { error: 'This quiz is closed' });
  }

  const questions = questionsForQuiz(quiz.id);
  const allowRetake = Boolean(quiz.settings?.allow_retake);
  const existing = [...db.responses.values()].find(
    (r) => r.quiz_id === quiz.id && r.discord_username.toLowerCase() === discord.toLowerCase()
  );
  if (existing && !allowRetake) {
    return json(res, 409, { error: 'You already submitted with this Discord Username' });
  }
  if (existing && allowRetake) db.responses.delete(existing.id);

  const sessionToken = readTakeSessionToken(body);
  const live =
    findMemorySession(quiz.id, { discord, sessionToken }) || db.sessions.get(sessionKey(quiz.id, discord));
  answers.__lifelines = mergeLifelineCounts(
    extractLifelines(live?.draft_answers),
    extractLifelines(answers)
  );
  const start = Date.parse(live?.client_started_at || live?.started_at);
  if (Number.isFinite(start)) {
    answers.__duration_ms = Math.max(0, Date.now() - start);
    answers.__started_at = start;
  } else if (!Number.isFinite(Number(answers.__duration_ms))) delete answers.__duration_ms;
  const clientPresence =
    answers.__presence && typeof answers.__presence === 'object' ? answers.__presence : {};
  answers.__presence = {
    hidden_count: Number(clientPresence.hidden_count ?? live?.hidden_count) || 0,
    left_page: Boolean(clientPresence.left_page ?? live?.left_page),
    currently_hidden: Boolean(clientPresence.currently_hidden ?? live?.currently_hidden),
  };
  const graded = scoreAnswersWithVariants(
    scoreAnswers,
    applyQuizPartialCreditToQuestions(questions, quiz.settings),
    answers,
    variantMap
  );
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
    ip_address: readIp(req) || null,
    user_agent: req.headers['user-agent'] || null,
    submitted_at: new Date().toISOString(),
  };
  db.responses.set(row.id, row);
  if (live) dropMemorySession(live);
  else db.sessions.delete(sessionKey(quiz.id, discord));
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

async function handleHint(req, res) {
  const body = await readBody(req);
  const slug = String(body.slug || '').trim();
  const discord = String(body.discord_username || body.discordUsername || '').trim();
  const questionId = String(body.questionId || body.question_id || '').trim();
  const variantMap = body.variant_map && typeof body.variant_map === 'object' ? body.variant_map : {};
  if (!slug) return json(res, 400, { error: 'Missing quiz slug' });
  if (!discord || discord.length < 2) return json(res, 400, { error: 'Discord Username required' });
  if (!questionId) return json(res, 400, { error: 'Missing question' });
  const quiz = [...db.quizzes.values()].find((q) => q.slug === slug && q.is_assigned);
  if (!quiz) return json(res, 404, { error: 'Quiz not found or not assigned' });
  if (!quiz.settings?.lifelines_enabled) return json(res, 403, { error: 'Hints are off for this quiz' });
  const question = questionsForQuiz(quiz.id).find((q) => q.id === questionId);
  if (!question) return json(res, 404, { error: 'Question not found' });
  const applied = applyVariant(question, variantMap[question.id] ?? 0);
  if (!questionHintsEnabled(applied)) return json(res, 400, { error: 'This question has no hints' });
  const list = storedHintList(applied);
  const key = sessionKey(quiz.id, discord);
  const session = db.sessions.get(key);
  const draft = session?.draft_answers && typeof session.draft_answers === 'object' ? session.draft_answers : {};
  const counts = extractLifelines(draft);
  const usedOnQ = Number(counts[questionId]) || 0;
  if (usedOnQ >= HINTS_PER_QUESTION) return json(res, 400, { error: 'No more hints on this question' });
  if (totalLifelinesUsed(counts) >= LIFELINES_PER_ATTEMPT) return json(res, 400, { error: 'No lifelines left' });
  const text = list[usedOnQ];
  if (!text) return json(res, 400, { error: 'No hint text for this tier' });
  const nextCounts = mergeLifelineCounts(counts, { [questionId]: usedOnQ + 1 });
  const nextDraft = compactDraftAnswers({ ...draft, __lifelines: nextCounts });
  if (session) {
    session.draft_answers = nextDraft;
    db.sessions.set(key, session);
  }
  const total = totalLifelinesUsed(nextCounts);
  return json(res, 200, {
    text,
    tier: usedOnQ + 1,
    usedOnQuestion: nextCounts[questionId],
    remaining: Math.max(0, LIFELINES_PER_ATTEMPT - total),
    multiplier: lifelineMultiplier(nextCounts[questionId]),
  });
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
    if (url.pathname === '/api/trivia/hint') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      return await handleHint(req, res);
    }
    if (url.pathname === '/api/trivia/presence') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
      return await handlePresence(req, res);
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
