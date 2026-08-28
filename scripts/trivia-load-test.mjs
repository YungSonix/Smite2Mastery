#!/usr/bin/env node
/**
 * Scroll Trivia API load test — simulates 400+ virtual takers (public + presence + submit).
 *
 * Prerequisites (local):
 *   npm run trivia:api
 *   node scripts/formative-random-quiz.mjs   # seeds quiz → artifacts/trivia-sims/quiz.json
 *   # or: TRIVIA_SLUG=your-slug
 *
 * Usage:
 *   npm run trivia:load-test
 *   TRIVIA_LOAD_N=400 TRIVIA_LOAD_CONCURRENCY=30 npm run trivia:load-test
 *   TRIVIA_LOAD_N=20 npm run trivia:load-test   # smoke
 *
 * Prod (throttled — max concurrency 10):
 *   TRIVIA_LOAD_PROD=1 FORMATIVE_API_BASE=https://smitescroll.com TRIVIA_SLUG=... TRIVIA_LOAD_N=50 npm run trivia:load-test
 *
 * Env:
 *   TRIVIA_LOAD_N              virtual users (default 400)
 *   TRIVIA_LOAD_CONCURRENCY    pool size (default 30 local, capped 50; prod max 10)
 *   TRIVIA_LOAD_PROD=1         production mode + warning
 *   FORMATIVE_API_BASE         default http://localhost:3000
 *   TRIVIA_SLUG                quiz slug (else quiz.json or first assigned quiz)
 *   TRIVIA_QUIZ_JSON           path to seeded quiz.json (answer key + slug)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'artifacts', 'trivia-load');
const QUIZ_PATH = process.env.TRIVIA_QUIZ_JSON || path.join(ROOT, 'artifacts', 'trivia-sims', 'quiz.json');

const IS_PROD = process.env.TRIVIA_LOAD_PROD === '1';
const API_BASE = process.env.FORMATIVE_API_BASE || (IS_PROD ? 'https://smitescroll.com' : 'http://localhost:3000');
const N = Math.max(1, Number(process.env.TRIVIA_LOAD_N || 400));
const CONCURRENCY = (() => {
  const requested = Number(process.env.TRIVIA_LOAD_CONCURRENCY || (IS_PROD ? 10 : 30));
  const cap = IS_PROD ? 10 : 50;
  return Math.max(1, Math.min(requested, cap));
})();

const USER_AGENT = 'smite2app-trivia-load-test/1.0';

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function statsForLatencies(msList) {
  const sorted = [...msList].sort((a, b) => a - b);
  return {
    count: sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted.length ? sorted[sorted.length - 1] : null,
    min: sorted.length ? sorted[0] : null,
    avg: sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null,
  };
}

function initEndpointStats() {
  return {
    requests: 0,
    ok: 0,
    errors: 0,
    duplicate409: 0,
    statusCodes: {},
    latenciesMs: [],
    errorSamples: [],
  };
}

function recordEndpoint(stats, { ok, status, ms, error, duplicate409 = false }) {
  stats.requests += 1;
  stats.latenciesMs.push(ms);
  const code = String(status || 0);
  stats.statusCodes[code] = (stats.statusCodes[code] || 0) + 1;
  if (duplicate409) {
    stats.duplicate409 += 1;
    stats.ok += 1;
    return;
  }
  if (ok) stats.ok += 1;
  else {
    stats.errors += 1;
    if (stats.errorSamples.length < 12) {
      stats.errorSamples.push(`${status} ${error || ''}`.trim());
    }
  }
}

async function fetchJson(url, options = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': USER_AGENT,
        ...(options.headers || {}),
      },
    });
    const ms = Date.now() - t0;
    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text?.slice(0, 200) };
    }
    return { res, data, ms };
  } catch (err) {
    return { res: null, data: null, ms: Date.now() - t0, networkError: err.message || String(err) };
  }
}

async function resolveSlug() {
  const envSlug = String(process.env.TRIVIA_SLUG || '').trim();
  if (envSlug) return envSlug;

  if (fs.existsSync(QUIZ_PATH)) {
    const payload = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
    const slug = payload?.quiz?.slug;
    if (slug) return slug;
  }

  const { res, data, ms, networkError } = await fetchJson(`${API_BASE}/api/trivia/public`);
  if (networkError) throw new Error(`Cannot reach API at ${API_BASE}: ${networkError}`);
  if (!res?.ok) throw new Error(data?.error || `public bootstrap ${res?.status} (${ms}ms)`);
  const slug = data?.quiz?.slug;
  if (!slug) {
    throw new Error(
      'No assigned quiz found. Seed one: node scripts/formative-random-quiz.mjs — or set TRIVIA_SLUG.'
    );
  }
  return slug;
}

function loadAnswerKey() {
  if (!fs.existsSync(QUIZ_PATH)) return null;
  try {
    const payload = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
    return payload.answerKey || null;
  } catch {
    return null;
  }
}

function isGateQuestion(q) {
  return Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);
}

function buildAnswersFromKey(answerKey) {
  const answers = { __timings: {} };
  let t = 1200;
  for (const q of answerKey || []) {
    if (!q?.id) continue;
    if (q.type === 'short_answer' || q.meta?.kind === 'fill_blank') {
      answers[q.id] = q.correct?.answers?.[0] || q.correct?.answer || 'Smite';
    } else if (q.type === 'multiple_selection') {
      answers[q.id] = q.correct?.indices || [0];
    } else if (typeof q.correct?.index === 'number') {
      answers[q.id] = q.correct.index;
    } else {
      answers[q.id] = 0;
    }
    answers.__timings[q.id] = t;
    t += 800 + (q.id.charCodeAt(0) % 400);
  }
  return answers;
}

function buildAnswersFromQuestions(questions) {
  const answers = { __timings: {} };
  let t = 1500;
  for (const q of questions || []) {
    if (!q?.id || isGateQuestion(q)) continue;
    if (q.type === 'image' || q.type === 'content') continue;
    if (q.type === 'short_answer' || q.meta?.kind === 'fill_blank') {
      answers[q.id] = 'LoadTest';
    } else if (q.type === 'multiple_selection') {
      answers[q.id] = [0];
    } else if (q.type === 'true_false' || q.type === 'multiple_choice' || q.type === 'dropdown') {
      answers[q.id] = 0;
    } else {
      answers[q.id] = 'LoadTest';
    }
    answers.__timings[q.id] = t;
    t += 700;
  }
  return answers;
}

function compactDraftAnswers(answers) {
  const out = {};
  for (const [key, value] of Object.entries(answers || {})) {
    if (key === '__variant_map') continue;
    out[key] = value;
  }
  return out;
}

async function runPool(total, concurrency, worker) {
  const results = new Array(total);
  let next = 0;
  async function runner() {
    while (true) {
      const i = next;
      next += 1;
      if (i >= total) break;
      results[i] = await worker(i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => runner()));
  return results;
}

async function simulateUser(i, slug, templateAnswers, endpointStats) {
  const discord = `loadtest-user-${i}`;
  const ingame = `LoadTest_${i}`;
  const startedAt = Date.now() - 45_000 - (i % 20) * 1000;
  const userResult = { index: i, discord, public: null, presence: null, submit: null };

  // GET public with discord (variant path)
  {
    const url = `${API_BASE}/api/trivia/public?slug=${encodeURIComponent(slug)}&discord=${encodeURIComponent(discord)}`;
    const { res, data, ms, networkError } = await fetchJson(url);
    const ok = Boolean(res?.ok);
    recordEndpoint(endpointStats.public, {
      ok,
      status: res?.status || 0,
      ms,
      error: networkError || data?.error,
    });
    userResult.public = { ok, status: res?.status || 0, ms };

    if (!ok) {
      return userResult;
    }

    const questions = data?.questions || [];
    const variantMap = data?.variant_map && typeof data.variant_map === 'object' ? data.variant_map : {};
    const answers =
      templateAnswers && Object.keys(templateAnswers).length > 1
        ? { ...templateAnswers, __timings: { ...(templateAnswers.__timings || {}) } }
        : buildAnswersFromQuestions(questions);

    answers.__duration_ms = Math.max(0, Date.now() - startedAt);
    answers.__lifelines = {};

    const questionCount = questions.filter((q) => !isGateQuestion(q) && q.type !== 'image' && q.type !== 'content').length;
    const answeredCount = Object.keys(compactDraftAnswers(answers)).filter((k) => !k.startsWith('__')).length;

    // POST presence heartbeat
    {
      const body = {
        slug,
        discord_username: discord,
        ingame_name: ingame,
        answered_count: answeredCount,
        question_count: questionCount,
        currently_hidden: false,
        hidden_inc: 0,
        left_page: false,
        answers: compactDraftAnswers(answers),
        variant_map: variantMap,
        started_at: startedAt,
      };
      const { res: pRes, data: pData, ms: pMs, networkError: pErr } = await fetchJson(`${API_BASE}/api/trivia/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const pOk = Boolean(pRes?.ok);
      recordEndpoint(endpointStats.presence, {
        ok: pOk,
        status: pRes?.status || 0,
        ms: pMs,
        error: pErr || pData?.error,
      });
      userResult.presence = { ok: pOk, status: pRes?.status || 0, ms: pMs };
    }

    // POST submit
    {
      const body = {
        slug,
        discord_username: discord,
        ingame_name: ingame,
        answers,
        variant_map: variantMap,
      };
      const { res: sRes, data: sData, ms: sMs, networkError: sErr } = await fetchJson(`${API_BASE}/api/trivia/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const is409 = sRes?.status === 409;
      const sOk = Boolean(sRes?.ok) || is409;
      recordEndpoint(endpointStats.submit, {
        ok: sOk,
        status: sRes?.status || 0,
        ms: sMs,
        error: sErr || sData?.error,
        duplicate409: is409,
      });
      userResult.submit = { ok: sOk, status: sRes?.status || 0, ms: sMs, duplicate409: is409 };
    }
  }

  return userResult;
}

function summarizeEndpoint(name, stats) {
  const latency = statsForLatencies(stats.latenciesMs);
  return {
    endpoint: name,
    ...latency,
    ok: stats.ok,
    errors: stats.errors,
    duplicate409: stats.duplicate409,
    statusCodes: stats.statusCodes,
    errorSamples: stats.errorSamples,
  };
}

async function main() {
  if (IS_PROD) {
    console.warn(
      '\n⚠️  TRIVIA_LOAD_PROD=1 — hitting production. Concurrency capped at 10. Use sparingly.\n'
    );
  }

  const health = await fetchJson(`${API_BASE}/api/trivia/health`);
  if (health.networkError) {
    throw new Error(
      `API unreachable at ${API_BASE}. Start local: npm run trivia:api — ${health.networkError}`
    );
  }

  const slug = await resolveSlug();
  const answerKey = loadAnswerKey();
  const templateAnswers = answerKey ? buildAnswersFromKey(answerKey) : null;

  console.log(`Trivia load test → ${API_BASE}`);
  console.log(`  slug=${slug}  users=${N}  concurrency=${CONCURRENCY}${IS_PROD ? '  (PROD)' : ''}`);

  const endpointStats = {
    public: initEndpointStats(),
    presence: initEndpointStats(),
    submit: initEndpointStats(),
  };

  const wallStart = Date.now();
  const userRows = await runPool(N, CONCURRENCY, (i) => simulateUser(i, slug, templateAnswers, endpointStats));
  const wallMs = Date.now() - wallStart;

  const endpoints = {
    public: summarizeEndpoint('GET /api/trivia/public', endpointStats.public),
    presence: summarizeEndpoint('POST /api/trivia/presence', endpointStats.presence),
    submit: summarizeEndpoint('POST /api/trivia/submit', endpointStats.submit),
  };

  const submitOk = userRows.filter((r) => r.submit?.ok).length;
  const submit409 = userRows.filter((r) => r.submit?.duplicate409).length;
  const fullFlowOk = userRows.filter((r) => r.public?.ok && r.presence?.ok && r.submit?.ok).length;

  const report = {
    generatedAt: new Date().toISOString(),
    mode: IS_PROD ? 'production' : 'local',
    apiBase: API_BASE,
    slug,
    virtualUsers: N,
    concurrency: CONCURRENCY,
    wallMs,
    summary: {
      fullFlowOk,
      submitOk,
      submitDuplicate409: submit409,
      submitFailed: N - submitOk,
    },
    endpoints,
    config: {
      TRIVIA_LOAD_N: N,
      TRIVIA_LOAD_CONCURRENCY: CONCURRENCY,
      TRIVIA_LOAD_PROD: IS_PROD,
      TRIVIA_SLUG: process.env.TRIVIA_SLUG || null,
      TRIVIA_QUIZ_JSON: fs.existsSync(QUIZ_PATH) ? QUIZ_PATH : null,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, 'report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('\n--- Summary ---');
  console.log(`  wall=${wallMs}ms  fullFlowOk=${fullFlowOk}/${N}  submitOk=${submitOk}  409=${submit409}`);
  for (const ep of Object.values(endpoints)) {
    console.log(
      `  ${ep.endpoint}: ok=${ep.ok} err=${ep.errors} p50=${ep.p50}ms p95=${ep.p95}ms codes=${JSON.stringify(ep.statusCodes)}`
    );
  }
  console.log(`\nReport: ${outPath}`);

  const hardFailures = endpoints.public.errors + endpoints.presence.errors + (endpoints.submit.errors - endpoints.submit.duplicate409);
  if (hardFailures > 0 && submitOk < N * 0.95) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
