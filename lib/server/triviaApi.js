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
  const key = getEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'EXPO_PUBLIC_SUPABASE_KEY',
    'VITE_SUPABASE_ANON_KEY'
  );
  if (!url || !key) {
    const err = new Error('Supabase is not configured on the server');
    err.status = 500;
    throw err;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
  const allow = getEnv('TRIVIA_HOST_ALLOWLIST', 'VITE_TRIVIA_HOST_ALLOWLIST');
  if (allow) {
    const set = new Set(
      allow
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    if (!set.has(username.toLowerCase())) {
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

module.exports = {
  supabaseAdmin,
  readIp,
  scoreAnswers,
  playerFacingScore,
  gradeOne,
  defaultQuestion,
  isContentType,
  isManualType,
  sanitizeQuestionForPublic,
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
};
