#!/usr/bin/env node
/**
 * Guard quiz JSON size before large-audience assigns (400+ takers).
 *
 * Usage:
 *   npm run trivia:payload-check -- path/to/quiz.json
 *   TRIVIA_SLUG=smite-2-trivia npm run trivia:payload-check
 *   TRIVIA_QUIZ_ID=<uuid|slug> TRIVIA_HOST_USER=... TRIVIA_HOST_SECRET=... npm run trivia:payload-check
 *
 * Env:
 *   FORMATIVE_API_BASE   default http://localhost:3000, else https://smitescroll.com
 *   TRIVIA_SLUG          public GET /api/trivia/public?slug=
 *   TRIVIA_QUIZ_ID       host GET /api/trivia/host?action=quiz&quizId=
 *   TRIVIA_HOST_USER     x-host-username
 *   TRIVIA_HOST_SECRET   x-host-secret (default devsecret for local)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { checkTriviaPayload, formatPayloadCheckReport, THRESHOLDS } = require('../lib/server/triviaPayloadCheck.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const LOCAL_API = 'http://localhost:3000';
const PROD_API = 'https://smitescroll.com';
const DEFAULT_SLUG = 'smite-2-trivia';

function formatThresholds() {
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  const mb = (n) => `${Math.round(n / (1024 * 1024))} MB`;
  return {
    warnTotal: kb(THRESHOLDS.WARN_TOTAL_BYTES),
    failTotal: mb(THRESHOLDS.FAIL_TOTAL_BYTES),
    maxField: kb(THRESHOLDS.MAX_FIELD_BYTES),
  };
}

async function probeApi(base) {
  try {
    const res = await fetch(`${base}/api/trivia/public`, { method: 'GET' });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function resolveApiBase() {
  if (process.env.FORMATIVE_API_BASE) return process.env.FORMATIVE_API_BASE.replace(/\/$/, '');
  if (await probeApi(LOCAL_API)) return LOCAL_API;
  return PROD_API;
}

function loadLocal(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (raw.quiz && Array.isArray(raw.questions)) return { source: abs, ...raw };
  if (Array.isArray(raw.questions)) return { source: abs, quiz: raw.quiz || {}, questions: raw.questions };
  throw new Error('JSON must include { quiz, questions }');
}

async function fetchPublic(apiBase, slug) {
  const url = `${apiBase}/api/trivia/public?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `public fetch failed (${res.status}) ${url}`);
  return { source: url, quiz: data.quiz, questions: data.questions || [] };
}

async function fetchHost(apiBase, quizId, user, secret) {
  const url = `${apiBase}/api/trivia/host?action=quiz&quizId=${encodeURIComponent(quizId)}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'x-host-username': user,
      'x-host-secret': secret,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `host fetch failed (${res.status}) ${url}`);
  return { source: url, quiz: data.quiz, questions: data.questions || [] };
}

async function loadPayload() {
  const fileArg = process.argv[2];
  if (fileArg && !fileArg.startsWith('-')) {
    return loadLocal(fileArg);
  }

  const apiBase = await resolveApiBase();
  const quizId = String(process.env.TRIVIA_QUIZ_ID || '').trim();
  const slug = String(process.env.TRIVIA_SLUG || (quizId ? '' : DEFAULT_SLUG)).trim();
  const hostUser = String(process.env.TRIVIA_HOST_USER || process.env.TRIVIA_HOST_USERNAME || '').trim();
  const hostSecret = String(process.env.TRIVIA_HOST_SECRET || process.env.FORMATIVE_HOST_SECRET || 'devsecret').trim();

  if (quizId) {
    if (!hostUser) throw new Error('TRIVIA_QUIZ_ID set — also set TRIVIA_HOST_USER');
    return fetchHost(apiBase, quizId, hostUser, hostSecret);
  }
  if (slug) return fetchPublic(apiBase, slug);
  throw new Error('Pass a quiz JSON path, or set TRIVIA_SLUG / TRIVIA_QUIZ_ID');
}

async function main() {
  const thresholds = formatThresholds();
  console.log(
    `Thresholds: warn total >${thresholds.warnTotal}, fail total >${thresholds.failTotal}, fail field >${thresholds.maxField}; block data: media URLs`
  );

  const payload = await loadPayload();
  const report = checkTriviaPayload(payload, { publicPayload: true });
  console.log(`Source: ${payload.source}`);
  console.log(formatPayloadCheckReport(report));

  if (report.level === 'warn') process.exitCode = 0;
  else if (!report.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
