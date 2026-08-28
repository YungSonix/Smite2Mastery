#!/usr/bin/env node
/**
 * Lightweight prod/local smoke for Scroll Trivia — suitable for cron every 5 min.
 *
 *   npm run trivia:smoke
 *   TRIVIA_SMOKE_PROD=1 npm run trivia:smoke
 *   FORMATIVE_API_BASE=https://smitescroll.com TRIVIA_SLUG=smite-2-trivia npm run trivia:smoke
 *
 * Env:
 *   FORMATIVE_API_BASE   default localhost:3000 (prod: https://smitescroll.com when TRIVIA_SMOKE_PROD=1)
 *   TRIVIA_SLUG          default smite-2-trivia
 *   TRIVIA_SMOKE_MAX_BYTES  max public JSON body (default 2_500_000)
 *   TRIVIA_SMOKE_MEDIA_URL passive icon URL (default GitHub apolloPassive.webp)
 */
const IS_PROD = process.env.TRIVIA_SMOKE_PROD === '1';
const API_BASE = (process.env.FORMATIVE_API_BASE || (IS_PROD ? 'https://smitescroll.com' : 'http://localhost:3000')).replace(
  /\/$/,
  ''
);
const SLUG = String(process.env.TRIVIA_SLUG || 'smite-2-trivia').trim();
const MAX_BYTES = Math.max(50_000, Number(process.env.TRIVIA_SMOKE_MAX_BYTES || 2_500_000));
const MEDIA_URL =
  process.env.TRIVIA_SMOKE_MEDIA_URL ||
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img/God%20Info/apolloPassive.webp';
const UA = 'smite2app-trivia-smoke/1.0';

const checks = [];

function pass(name, detail = '') {
  checks.push({ ok: true, name, detail });
  console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  checks.push({ ok: false, name, detail });
  console.error(`[FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`\n=== Trivia smoke @ ${new Date().toISOString()} ===`);
  console.log(`base=${API_BASE} slug=${SLUG}`);

  // Public quiz
  const pubUrl = `${API_BASE}/api/trivia/public?slug=${encodeURIComponent(SLUG)}`;
  let pubText = '';
  try {
    const res = await fetch(pubUrl, { headers: { 'User-Agent': UA } });
    pubText = await res.text();
    const size = Buffer.byteLength(pubText, 'utf8');

    if (!res.ok) {
      fail('GET public quiz', `HTTP ${res.status}`);
    } else if (size > MAX_BYTES) {
      fail('GET public quiz', `body ${size} bytes > budget ${MAX_BYTES}`);
    } else if (/data:\s*image|data:\s*audio/i.test(pubText)) {
      fail('GET public quiz', 'response contains data: URI (should use /media paths)');
    } else {
      let data;
      try {
        data = JSON.parse(pubText);
      } catch (e) {
        fail('GET public quiz', `invalid JSON: ${e.message}`);
        data = null;
      }
      if (data) {
        const qs = Array.isArray(data.questions) ? data.questions.length : 0;
        if (!data.quiz?.slug) fail('GET public quiz', 'missing quiz.slug');
        else if (qs < 1) fail('GET public quiz', 'no questions');
        else pass('GET public quiz', `${qs} questions, ${size} bytes`);
      }
    }
  } catch (err) {
    fail('GET public quiz', err.message || String(err));
  }

  // Passive icon media
  try {
    const res = await fetch(MEDIA_URL, {
      method: 'GET',
      headers: { 'User-Agent': UA },
    });
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    const ctype = res.headers.get('content-type') || '';
    if (!res.ok) {
      fail('GET media (passive icon)', `HTTP ${res.status}`);
    } else if (size < 200) {
      fail('GET media (passive icon)', `suspiciously small (${size} bytes)`);
    } else if (!/image|octet-stream/i.test(ctype) && !/\.webp/i.test(MEDIA_URL)) {
      fail('GET media (passive icon)', `unexpected content-type ${ctype}`);
    } else {
      pass('GET media (passive icon)', `${size} bytes, ${ctype || 'unknown type'}`);
    }
  } catch (err) {
    fail('GET media (passive icon)', err.message || String(err));
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
