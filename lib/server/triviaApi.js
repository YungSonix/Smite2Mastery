const { createClient } = require('@supabase/supabase-js');

function getEnv(name, ...fallbacks) {
  for (const key of [name, ...fallbacks]) {
    const v = process.env[key];
    if (v && String(v).trim()) return String(v).trim();
  }
  return null;
}

function supabaseAdmin() {
  const url = getEnv('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');
  if (!url || !key) {
    const err = new Error(
      'Supabase admin is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)'
    );
    err.status = 500;
    throw err;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const RATE_BUCKETS = new Map();

function rateLimit(req, routeKey, { windowMs, max } = {}) {
  const win = Number(windowMs || process.env.TRIVIA_RATE_LIMIT_WINDOW_MS) || 60_000;
  const cap = Number(max || process.env.TRIVIA_RATE_LIMIT_MAX) || 120;
  const ip = readIp(req) || 'unknown';
  const key = `${routeKey}:${ip}`;
  const now = Date.now();
  let bucket = RATE_BUCKETS.get(key);
  if (!bucket || now - bucket.start > win) {
    bucket = { start: now, count: 0 };
    RATE_BUCKETS.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > cap) {
    const err = new Error('Too many requests');
    err.status = 429;
    throw err;
  }
}

function parseHostAllowlist(raw) {
  if (!raw) return null;
  const set = new Set();
  for (const part of String(raw).split(',')) {
    const name = part.trim().toLowerCase();
    if (!name || name.length > 64) continue;
    if (!/^[a-z0-9_.-]+$/.test(name)) continue;
    set.add(name);
  }
  return set.size ? set : null;
}

const QUIZ_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]{1,7}$/;

function isValidQuizSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!s || s.length > 64) return false;
  return QUIZ_SLUG_RE.test(s);
}

function sanitizePlayerName(value, label = 'Name') {
  const s = String(value ?? '').trim();
  if (!s) return { ok: false, error: `${label} is required` };
  if (s.length > 64) return { ok: false, error: `${label} is too long` };
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)) return { ok: false, error: `${label} is invalid` };
  return { ok: true, value: s };
}

function assertCronSecret(req) {
  const secret = getEnv('TRIVIA_CRON_SECRET', 'CRON_SECRET');
  if (!secret) {
    const err = new Error('Scheduled flush is not configured');
    err.status = 503;
    throw err;
  }
  const header = req.headers['x-cron-secret'];
  const auth = req.headers['authorization'];
  const bearer = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const provided = String(header || bearer || '').trim();
  if (!provided || provided !== secret) {
    const err = new Error('Cron auth failed');
    err.status = 401;
    throw err;
  }
}

function readIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0].trim();
  }
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(',')[0].trim();
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  return req.socket?.remoteAddress || null;
}

const { scoreAnswers, playerFacingScore, gradeOne, defaultQuestion, isContentType, isManualType } = require('./triviaQuestionTypes');
const {
  listVariants,
  variantCount,
  pickVariantIndex,
  applyVariant,
  sanitizeQuestionForPublic,
  buildVariantMap,
  scoreAnswersWithVariants,
} = require('./triviaVariants');
const { rewriteQuestionMedia } = require('./triviaMediaRewrite');

function scoreWithVariants(questions, answers, variantMap) {
  return scoreAnswersWithVariants(scoreAnswers, questions, answers, variantMap);
}

function assertHost(req) {
  const secret = getEnv('TRIVIA_HOST_SECRET', 'FORMATIVE_HOST_SECRET');
  if (!secret) {
    const err = new Error('TRIVIA_HOST_SECRET is not set on the server');
    err.status = 500;
    throw err;
  }
  const provided = req.headers['x-host-secret'];
  const username = String(req.headers['x-host-username'] || '').trim();
  if (!username || provided !== secret) {
    const err = new Error('Host auth failed');
    err.status = 401;
    throw err;
  }
  const allowSet = parseHostAllowlist(getEnv('TRIVIA_HOST_ALLOWLIST', 'VITE_TRIVIA_HOST_ALLOWLIST'));
  if (allowSet) {
    if (!allowSet.has(username.toLowerCase())) {
      const err = new Error('Username is not allowlisted for trivia host');
      err.status = 403;
      throw err;
    }
  }
  return username;
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-host-username, x-host-secret');
  res.end(JSON.stringify(body));
}

function readBody(req, { maxBytes = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (maxBytes > 0 && size > maxBytes) {
        req.destroy();
        const err = new Error('Payload too large');
        err.code = 'PAYLOAD_TOO_LARGE';
        err.status = 413;
        reject(err);
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        const err = new Error('Invalid JSON body');
        err.code = 'INVALID_JSON';
        err.status = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function isQuizKeyUuid(key) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(key || '')
  );
}

const SHORT_SLUG_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

function shortQuizSlug(len = 7) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += SHORT_SLUG_CHARS[Math.floor(Math.random() * SHORT_SLUG_CHARS.length)];
  }
  return out;
}

module.exports = {
  supabaseAdmin,
  readIp,
  rateLimit,
  parseHostAllowlist,
  isValidQuizSlug,
  sanitizePlayerName,
  assertCronSecret,
  scoreAnswers,
  playerFacingScore,
  gradeOne,
  defaultQuestion,
  isContentType,
  isManualType,
  sanitizeQuestionForPublic,
  rewriteQuestionMedia,
  buildVariantMap,
  scoreAnswersWithVariants: scoreWithVariants,
  applyVariant,
  listVariants,
  variantCount,
  pickVariantIndex,
  assertHost,
  send,
  readBody,
  getEnv,
  isQuizKeyUuid,
  shortQuizSlug,
};
