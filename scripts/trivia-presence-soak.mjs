#!/usr/bin/env node
/**
 * Presence write soak — concurrent heartbeat loops (local by default).
 *
 *   npm run trivia:presence-soak
 *   TRIVIA_PRESENCE_SOAK_N=50 TRIVIA_PRESENCE_SOAK_MS=120000 npm run trivia:presence-soak
 *
 * Env:
 *   FORMATIVE_API_BASE     default http://localhost:3000
 *   TRIVIA_SLUG            default smite-2-trivia (must exist + be assigned locally)
 *   TRIVIA_PRESENCE_SOAK_N concurrent loops (default 50)
 *   TRIVIA_PRESENCE_SOAK_MS duration ms (default 120000 = 2 min)
 *   TRIVIA_PRESENCE_POLL_MS client interval per loop (default 15000, matches TakeQuiz)
 */
const API_BASE = (process.env.FORMATIVE_API_BASE || 'http://localhost:3000').replace(/\/$/, '');
const SLUG = String(process.env.TRIVIA_SLUG || 'smite-2-trivia').trim();
const N = Math.max(1, Number(process.env.TRIVIA_PRESENCE_SOAK_N || 50));
const DURATION_MS = Math.max(10_000, Number(process.env.TRIVIA_PRESENCE_SOAK_MS || 120_000));
const POLL_MS = Math.max(3000, Number(process.env.TRIVIA_PRESENCE_POLL_MS || 15_000));
const UA = 'smite2app-trivia-presence-soak/1.0';

if (process.env.TRIVIA_PRESENCE_SOAK_PROD === '1') {
  console.warn('WARNING: TRIVIA_PRESENCE_SOAK_PROD=1 — hitting production presence endpoint.');
}

const stats = { attempts: 0, ok: 0, throttled: 0, failed: 0, latencies: [] };

async function ping(userId) {
  const t0 = Date.now();
  stats.attempts += 1;
  try {
    const res = await fetch(`${API_BASE}/api/trivia/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        slug: SLUG,
        discord_username: `soak_${userId}`,
        ingame_name: `Soak${userId}`,
        answered_count: Math.floor(Math.random() * 5),
        question_count: 20,
        currently_hidden: false,
        hidden_inc: 0,
        left_page: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ms = Date.now() - t0;
    stats.latencies.push(ms);
    if (res.ok && (data.ok || data.skipped)) {
      stats.ok += 1;
      if (data.throttled) stats.throttled += 1;
    } else {
      stats.failed += 1;
    }
  } catch {
    stats.failed += 1;
    stats.latencies.push(Date.now() - t0);
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function loop(userId, until) {
  while (Date.now() < until) {
    await ping(userId);
    const wait = Math.min(POLL_MS, until - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
}

async function main() {
  console.log(`\n=== Presence soak @ ${new Date().toISOString()} ===`);
  console.log(`base=${API_BASE} slug=${SLUG} users=${N} duration=${DURATION_MS}ms poll=${POLL_MS}ms`);

  const until = Date.now() + DURATION_MS;
  const started = Date.now();
  await Promise.all(Array.from({ length: N }, (_, i) => loop(i + 1, until)));

  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const successRate = stats.attempts ? ((stats.ok / stats.attempts) * 100).toFixed(1) : '0.0';
  const writeRate = stats.attempts ? (((stats.ok - stats.throttled) / stats.attempts) * 100).toFixed(1) : '0.0';

  const report = {
    slug: SLUG,
    apiBase: API_BASE,
    concurrent: N,
    durationMs: Date.now() - started,
    pollMs: POLL_MS,
    attempts: stats.attempts,
    ok: stats.ok,
    throttled: stats.throttled,
    failed: stats.failed,
    successRatePct: Number(successRate),
    dbWriteRatePct: Number(writeRate),
    latencyMs: {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      max: sorted[sorted.length - 1] ?? null,
    },
  };

  console.log(JSON.stringify(report, null, 2));
  console.log(
    `\nWrite success: ${stats.ok}/${stats.attempts} (${successRate}%), DB writes: ${stats.ok - stats.throttled} (${writeRate}%), throttled: ${stats.throttled}, failed: ${stats.failed}`
  );

  process.exit(stats.failed > stats.attempts * 0.05 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
