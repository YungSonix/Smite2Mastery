#!/usr/bin/env node
/**
 * Concurrent submit burst against the local trivia API.
 *   node scripts/formative-load-test.mjs
 *
 * Env: TRIVIA_LOAD_N (default 50), FORMATIVE_API_BASE, TRIVIA_QUIZ_JSON
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const N = Math.max(1, Number(process.env.TRIVIA_LOAD_N || 50));
const QUIZ_PATH = process.env.TRIVIA_QUIZ_JSON || path.join(ROOT, 'artifacts', 'trivia-sims', 'quiz.json');

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function main() {
  if (!fs.existsSync(QUIZ_PATH)) {
    throw new Error(`Missing ${QUIZ_PATH}. Run formative:trivia:quiz first.`);
  }
  const payload = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
  const slug = payload?.quiz?.slug;
  if (!slug) throw new Error('quiz.slug missing');

  const pub = await fetch(`${API_BASE}/api/trivia/public?slug=${encodeURIComponent(slug)}`);
  const pubData = await pub.json();
  if (!pub.ok) throw new Error(pubData.error || `public ${pub.status}`);

  const answers = {};
  for (const q of payload.answerKey || []) {
    if (q.type === 'short_answer') answers[q.id] = q.correct?.answers?.[0] || 'x';
    else if (typeof q.correct?.index === 'number') answers[q.id] = q.correct.index;
  }

  console.log(`Load test: ${N} concurrent submits → ${slug}`);
  const started = Date.now();
  const jobs = Array.from({ length: N }, async (_, i) => {
    const t0 = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/trivia/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          discord_username: `LoadBot${i}_${started}`,
          ingame_name: `IG_Load_${i}`,
          answers,
          variant_map: {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, ms: Date.now() - t0, error: data.error || null };
    } catch (err) {
      return { ok: false, status: 0, ms: Date.now() - t0, error: err.message || String(err) };
    }
  });

  const rows = await Promise.all(jobs);
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const passed = rows.filter((r) => r.ok).length;
  const failed = rows.filter((r) => !r.ok);
  const summary = {
    n: N,
    passed,
    failed: failed.length,
    wallMs: Date.now() - started,
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
    max: ms[ms.length - 1],
    errors: failed.slice(0, 8).map((f) => `${f.status} ${f.error || ''}`.trim()),
  };
  const outDir = path.join(ROOT, 'artifacts', 'trivia-sims');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'load-test.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
