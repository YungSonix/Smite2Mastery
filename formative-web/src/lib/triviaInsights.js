import { extractVariantMap, variantCount, variantLetter } from './triviaVariants';
import { promptPlain } from './promptPlain';

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
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function durationFromTimestamps(submittedAt, startedAt) {
  const end = Date.parse(submittedAt);
  let start = Number(startedAt);
  if (!Number.isFinite(start)) start = Date.parse(startedAt);
  if (!Number.isFinite(end) || !Number.isFinite(start)) return null;
  const d = end - start;
  return d >= 0 ? d : null;
}

/** Normalize stored duration (seconds-as-ms, timestamps, stale starts). */
export function normalizeDurationMs(rawMs, submittedAt, startedAt) {
  let ms = rawMs != null && rawMs !== '' ? Number(rawMs) : null;
  const fromTs = durationFromTimestamps(submittedAt, startedAt);

  if (!Number.isFinite(ms) || ms < 0) ms = null;
  if (ms != null && ms > 1e12) ms = null;
  if (ms != null && ms > 0 && ms < 100000 && fromTs != null && fromTs > ms * 50) {
    ms = ms * 1000;
  }

  const maxReasonable = 7 * 24 * 3600 * 1000;
  if (ms != null && ms > maxReasonable) {
    if (fromTs != null && fromTs <= maxReasonable) ms = fromTs;
    else if (fromTs != null && fromTs < ms) ms = fromTs;
  }

  if (ms == null) ms = fromTs;
  return ms != null && Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : null;
}

/** Total take time from host lite fields or answers.__duration_ms. */
export function responseDurationMs(response) {
  if (response?.duration_ms != null && Number.isFinite(Number(response.duration_ms))) {
    return normalizeDurationMs(
      response.duration_ms,
      response?.submitted_at,
      response?.answers?.__started_at
    );
  }
  return normalizeDurationMs(
    response?.answers?.__duration_ms,
    response?.submitted_at,
    response?.answers?.__started_at
  );
}

export function responseTabAwayCount(response) {
  if (response?.tab_away_count != null && Number.isFinite(Number(response.tab_away_count))) {
    return Math.max(0, Number(response.tab_away_count));
  }
  const pres = response?.answers?.__presence;
  if (pres && typeof pres === 'object') {
    return Math.max(0, Number(pres.hidden_count) || 0);
  }
  return null;
}

export function responseLeftPage(response) {
  if (response?.left_page != null) return Boolean(response.left_page);
  const pres = response?.answers?.__presence;
  if (pres && typeof pres === 'object') return Boolean(pres.left_page);
  return null;
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
  const variantPalette = ['#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb923c'];
  const variantUsage = {};
  let variantQuestionCount = 0;

  const perQuestion = scored.map((q, i) => {
    const vCount = variantCount(q);
    const hasVariants = vCount > 1;
    if (hasVariants) variantQuestionCount += 1;

    const byVariant = Array.from({ length: vCount }, (_, vi) => ({
      index: vi,
      letter: variantLetter(vi),
      n: 0,
      ok: 0,
      pct: 0,
      avgMs: null,
      times: [],
      color: variantPalette[vi % variantPalette.length],
    }));

    let seen = 0;
    let ok = 0;
    const times = [];
    for (const r of rows) {
      const v = r.per_question?.[q.id];
      if (v == null) continue;
      seen += 1;
      const variantMap = extractVariantMap(r.answers) || {};
      const vi = Math.max(0, Math.min(vCount - 1, Number(variantMap[q.id]) || 0));
      const slot = byVariant[vi];
      slot.n += 1;
      if (Number(v)) {
        ok += 1;
        slot.ok += 1;
        correct += 1;
      } else {
        wrong += 1;
      }
      const ms = Number(r.answers?.__timings?.[q.id]);
      if (Number.isFinite(ms) && ms >= 0) {
        times.push(ms);
        slot.times.push(ms);
      }
      if (hasVariants) {
        const key = variantLetter(vi);
        variantUsage[key] = (variantUsage[key] || 0) + 1;
      }
    }

    for (const slot of byVariant) {
      slot.pct = slot.n ? Math.round((slot.ok / slot.n) * 100) : 0;
      slot.avgMs = slot.times.length
        ? Math.round(slot.times.reduce((a, b) => a + b, 0) / slot.times.length)
        : null;
      delete slot.times;
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
      variantCount: vCount,
      hasVariants,
      variants: byVariant.filter((slot) => slot.n > 0 || hasVariants),
    };
  });

  const variantUsageParts = Object.entries(variantUsage)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, value], idx) => ({
      label: `Version ${letter}`,
      value,
      color: variantPalette[idx % variantPalette.length],
    }));

  const variantCompareRows = perQuestion
    .filter((q) => q.hasVariants)
    .flatMap((q) =>
      q.variants
        .filter((slot) => slot.n > 0)
        .map((slot) => ({
          id: `${q.id}-v${slot.index}`,
          label: `${q.label} · ${slot.letter}`,
          title: `${promptPlain(q.prompt) || 'Question'} — Version ${slot.letter}`,
          value: slot.pct,
          display: `${slot.pct}%`,
          n: slot.n,
          variantLetter: slot.letter,
          color: slot.color,
        }))
    )
    .sort((a, b) => a.value - b.value);

  const hardestVariants = [...variantCompareRows].sort((a, b) => a.value - b.value).slice(0, 8);

  const durations = rows.map((r) => responseDurationMs(r)).filter((ms) => ms != null);
  const buckets = timeBuckets(timeLimitSeconds).map((b) => ({
    label: b.label,
    value: durations.filter((ms) => {
      const sec = ms / 1000;
      return sec >= b.lo && sec < b.hi;
    }).length,
  }));

  const passCount = pcts.filter((p) => p >= 70).length;
  const failCount = Math.max(0, pcts.length - passCount);

  return {
    n,
    avg,
    scoredCount: scored.length,
    variantQuestionCount,
    bands,
    passFail: [
      { label: 'Pass (≥70%)', value: passCount, color: '#2dd4bf' },
      { label: 'Below 70%', value: failCount, color: '#f87171' },
    ],
    answerMix: [
      { label: 'Correct', value: correct, color: '#2dd4bf' },
      { label: 'Wrong', value: wrong, color: '#f87171' },
    ],
    variantUsageParts,
    variantCompareRows,
    hardestVariants,
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
