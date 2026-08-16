const SKIP_TYPES = new Set([
  'image',
  'content',
  'audio',
  'video',
  'embed',
  'file_response',
  'audio_response',
  'drawing',
]);

export function scoredInsightQuestions(questions) {
  return (questions || []).filter(
    (q) =>
      !SKIP_TYPES.has(q.type) &&
      !q.meta?.is_discord_gate &&
      !q.meta?.is_ingame_gate &&
      Number(q.points) > 0
  );
}

export function formatDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms)) || Number(ms) < 0) return '—';
  const s = Math.round(Number(ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function timeBuckets(limitSec) {
  const cap = Math.max(0, Number(limitSec) || 0);
  if (cap >= 120) {
    const step = Math.max(60, Math.round(cap / 4));
    return [
      { lo: 0, hi: step, label: `<${Math.round(step / 60)}m` },
      { lo: step, hi: step * 2, label: `${Math.round(step / 60)}–${Math.round((step * 2) / 60)}m` },
      { lo: step * 2, hi: step * 3, label: `${Math.round((step * 2) / 60)}–${Math.round((step * 3) / 60)}m` },
      { lo: step * 3, hi: cap, label: `${Math.round((step * 3) / 60)}–${Math.round(cap / 60)}m` },
      { lo: cap, hi: Infinity, label: `>${Math.round(cap / 60)}m` },
    ];
  }
  return [
    { lo: 0, hi: 60, label: '<1m' },
    { lo: 60, hi: 180, label: '1–3m' },
    { lo: 180, hi: 300, label: '3–5m' },
    { lo: 300, hi: 480, label: '5–8m' },
    { lo: 480, hi: Infinity, label: '>8m' },
  ];
}

export function buildQuizInsights({ questions, responses, timeLimitSeconds } = {}) {
  const scored = scoredInsightQuestions(questions);
  const rows = responses || [];
  const n = rows.length;

  const pcts = rows
    .map((r) => {
      const max = Number(r.max_score) || 0;
      return max > 0 ? Math.round((Number(r.score) / max) * 100) : null;
    })
    .filter((x) => x != null);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;

  const bands = [
    { label: '0–20%', value: 0, color: '#f87171' },
    { label: '21–40%', value: 0, color: '#fb923c' },
    { label: '41–60%', value: 0, color: '#fbbf24' },
    { label: '61–80%', value: 0, color: '#38bdf8' },
    { label: '81–100%', value: 0, color: '#2dd4bf' },
  ];
  for (const p of pcts) {
    if (p <= 20) bands[0].value += 1;
    else if (p <= 40) bands[1].value += 1;
    else if (p <= 60) bands[2].value += 1;
    else if (p <= 80) bands[3].value += 1;
    else bands[4].value += 1;
  }

  let correct = 0;
  let wrong = 0;
  const perQuestion = scored.map((q, i) => {
    let seen = 0;
    let ok = 0;
    const times = [];
    for (const r of rows) {
      const v = r.per_question?.[q.id];
      if (v == null) continue;
      seen += 1;
      if (Number(v)) {
        ok += 1;
        correct += 1;
      } else {
        wrong += 1;
      }
      const ms = Number(r.answers?.__timings?.[q.id]);
      if (Number.isFinite(ms) && ms >= 0) times.push(ms);
    }
    const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    return {
      id: q.id,
      i,
      label: `Q${i + 1}`,
      prompt: q.prompt || 'Question',
      pct: seen ? Math.round((ok / seen) * 100) : 0,
      n: seen,
      avgMs,
    };
  });

  const durations = rows
    .map((r) => Number(r.answers?.__duration_ms))
    .filter((ms) => Number.isFinite(ms) && ms >= 0);
  const buckets = timeBuckets(timeLimitSeconds).map((b) => ({
    label: b.label,
    value: durations.filter((ms) => {
      const sec = ms / 1000;
      return sec >= b.lo && sec < b.hi;
    }).length,
  }));

  return {
    n,
    avg,
    scoredCount: scored.length,
    bands,
    answerMix: [
      { label: 'Correct', value: correct, color: '#2dd4bf' },
      { label: 'Wrong', value: wrong, color: '#f87171' },
    ],
    perQuestion,
    durations,
    avgDurationMs: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null,
    medianDurationMs: median(durations),
    timeRows: durations.length ? buckets : [],
    hasTimings: perQuestion.some((q) => q.avgMs != null),
  };
}
