#!/usr/bin/env node
/**
 * Bench Scroll Trivia host responses payload + client-side sort/slice (400+ rows).
 *
 * Usage:
 *   node scripts/trivia-host-responses-bench.mjs
 *   TRIVIA_BENCH_N=400 TRIVIA_BENCH_Q=25 node scripts/trivia-host-responses-bench.mjs
 */
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const N = Math.max(1, Number(process.env.TRIVIA_BENCH_N || 400));
const Q = Math.max(1, Number(process.env.TRIVIA_BENCH_Q || 20));

function mockResponse(i) {
  const per_question = {};
  const answers = {};
  for (let q = 0; q < Q; q += 1) {
    const qid = `q${q}`;
    per_question[qid] = Math.random() > 0.5 ? 1 : 0;
    answers[qid] = `answer ${i} for question ${q}`;
  }
  return {
    id: `resp-${i}`,
    quiz_id: 'quiz-1',
    discord_username: `discord_user_${i}`,
    ingame_name: `Player${i}`,
    score: Math.floor(Q / 2),
    max_score: Q,
    per_question,
    submitted_at: new Date(Date.now() - i * 60_000).toISOString(),
    ip_address: '127.0.0.1',
    answers,
  };
}

function responsePercent(r) {
  const max = Number(r?.max_score) || 0;
  if (max <= 0) return 0;
  return Math.round((Number(r?.score) / max) * 100);
}

function sortResponses(responses, sortId = 'submitted_desc') {
  const list = [...responses];
  return list.sort((a, b) => {
    const ta = new Date(a.submitted_at).getTime();
    const tb = new Date(b.submitted_at).getTime();
    return tb - ta;
  });
}

const full = Array.from({ length: N }, (_, i) => mockResponse(i));
const lite = full.map(({ answers, user_agent, ...rest }) => rest);

const liteJson = JSON.stringify({ responses: lite, sessions: [], watermark: 'x' });
const fullJson = JSON.stringify({ responses: full, sessions: [], watermark: 'x' });

const unchangedJson = JSON.stringify({ unchanged: true, watermark: 'x' });

console.log('Scroll Trivia host responses bench');
console.log(`  responses: ${N} · questions per row: ${Q}`);
console.log(`  lite JSON:     ${liteJson.length.toLocaleString()} bytes (${(liteJson.length / 1024).toFixed(1)} KB)`);
console.log(`  full JSON:     ${fullJson.length.toLocaleString()} bytes (${(fullJson.length / 1024).toFixed(1)} KB)`);
console.log(
  `  unchanged poll: ${unchangedJson.length} bytes · savings vs full: ${(
    (1 - unchangedJson.length / fullJson.length) *
    100
  ).toFixed(1)}%`
);
console.log(
  `  answers overhead: ${((fullJson.length - liteJson.length) / 1024).toFixed(1)} KB (${(
    ((fullJson.length - liteJson.length) / liteJson.length) *
    100
  ).toFixed(0)}% of lite)`
);

const PAGE = 50;
const iterations = 200;

let sortMs = 0;
let sliceMs = 0;
for (let i = 0; i < iterations; i += 1) {
  const t0 = performance.now();
  const sorted = sortResponses(full);
  sortMs += performance.now() - t0;
  const t1 = performance.now();
  sorted.slice(0, PAGE);
  sliceMs += performance.now() - t1;
}

console.log(`  sort avg (${iterations}× ${N} rows): ${(sortMs / iterations).toFixed(2)} ms`);
console.log(`  slice 50 avg: ${(sliceMs / iterations).toFixed(3)} ms`);
console.log(`  est DOM rows per page: ${PAGE} (not ${N})`);

const out = {
  n: N,
  questionsPerRow: Q,
  liteBytes: liteJson.length,
  fullBytes: fullJson.length,
  unchangedBytes: unchangedJson.length,
  sortAvgMs: sortMs / iterations,
  sliceAvgMs: sliceMs / iterations,
  pageSize: PAGE,
};

const outDir = path.join(ROOT, 'artifacts', 'trivia-host-bench');
try {
  const fs = await import('node:fs');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(out, null, 2));
  console.log(`  wrote ${path.join('artifacts', 'trivia-host-bench', 'report.json')}`);
} catch (e) {
  console.warn('  (could not write report.json)', e.message);
}
