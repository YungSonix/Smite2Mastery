import { applyVariant, extractVariantMap, variantCount, variantLetter } from './triviaVariants';
import { correctChoiceIndexes } from './correctAnswer';
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
  if (ms == null || !Number.isFinite(Number(ms)) || Number(ms) < 0) return 'n/a';
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

function responsePctForRow(r) {
  const max = Number(r.max_score) || 0;
  const score = Number(r.score) || 0;
  return max > 0 ? (score / max) * 100 : 0;
}

/** Top 27% vs bottom 27% correct rate gap (percentage points). */
export function questionDiscrimination(rows, qId) {
  const graded = (rows || [])
    .filter((r) => r.per_question?.[qId] != null)
    .map((r) => ({
      pct: responsePctForRow(r),
      correct: Number(r.per_question[qId]) > 0,
    }));
  if (graded.length < 6) return null;
  const sorted = [...graded].sort((a, b) => b.pct - a.pct);
  const slice = Math.max(1, Math.ceil(sorted.length * 0.27));
  const top = sorted.slice(0, slice);
  const bottom = sorted.slice(-slice);
  const rate = (group) => (group.length ? group.filter((x) => x.correct).length / group.length : 0);
  return Math.round((rate(top) - rate(bottom)) * 1000) / 10;
}

export function questionDifficultyVerdict(pct, discrimination) {
  if (discrimination != null && discrimination < 10) return 'ambiguous';
  if (pct >= 80) return 'too_easy';
  if (pct <= 25) return 'too_hard';
  if (pct >= 40 && pct <= 60) return 'middle';
  return 'mixed';
}

export function verdictLabel(verdict) {
  switch (verdict) {
    case 'middle':
      return 'Middle band (best signal)';
    case 'too_easy':
      return 'Most got it right';
    case 'too_hard':
      return 'Most missed it';
    case 'ambiguous':
      return 'Top and bottom scorers split oddly';
    default:
      return 'Mixed';
  }
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

/** Minimum takes on a single version before we trust its % correct. */
export const MIN_VARIANT_N = 5;
/** Gap (percentage points) between versions that counts as a real skew. */
export const SKEW_THRESHOLD_PP = 20;
/** Below this many submissions every percentage is noise, so we soften the UI. */
export const LOW_SAMPLE_SUBMISSIONS = 10;
const HARD_THRESHOLD_PCT = 40;
const EASY_THRESHOLD_PCT = 90;
const PASS_THRESHOLD_PCT = 70;

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
  const medianPct = median(pcts);

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
      slot.lowSample = slot.n > 0 && slot.n < MIN_VARIANT_N;
      slot.avgMs = slot.times.length
        ? Math.round(slot.times.reduce((a, b) => a + b, 0) / slot.times.length)
        : null;
      delete slot.times;
    }

    const reliableSlots = byVariant.filter((slot) => slot.n >= MIN_VARIANT_N);
    const variantSkew =
      reliableSlots.length >= 2
        ? Math.max(...reliableSlots.map((s) => s.pct)) - Math.min(...reliableSlots.map((s) => s.pct))
        : null;

    const avgMs = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
    const medianMs = times.length ? median(times) : null;
    const discrimination = questionDiscrimination(rows, q.id);
    const verdict = seen ? questionDifficultyVerdict(Math.round((ok / seen) * 100), discrimination) : 'mixed';
    return {
      id: q.id,
      i,
      label: `Q${i + 1}`,
      prompt: q.prompt || 'Question',
      pct: seen ? Math.round((ok / seen) * 100) : 0,
      ok,
      n: seen,
      avgMs,
      medianMs,
      discrimination,
      verdict,
      variantCount: vCount,
      hasVariants,
      variantSkew,
      reliableVariantCount: reliableSlots.length,
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
          title: `${promptPlain(q.prompt) || 'Question'} · Version ${slot.letter}`,
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

  const passCount = pcts.filter((p) => p >= PASS_THRESHOLD_PCT).length;
  const failCount = Math.max(0, pcts.length - passCount);

  const uniqueDiscord = new Set(rows.map(r => String(r.discord_username || '').toLowerCase().trim()).filter(Boolean)).size;

  return {
    n,
    avg,
    medianPct,
    uniqueDiscord,
    passCount,
    passPct: pcts.length ? Math.round((passCount / pcts.length) * 100) : 0,
    scoredCount: scored.length,
    variantQuestionCount,
    correctCount: correct,
    wrongCount: wrong,
    lowSample: n > 0 && n < LOW_SAMPLE_SUBMISSIONS,
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
    nextEvent: buildNextEventInsights(perQuestion, n),
  };
}

const MAX_ACTIONS = 8;

/** `62% (18/29)` with the raw counts behind it. */
export function pctWithCounts(pct, ok, n) {
  if (pct == null) return 'n/a';
  if (ok == null || n == null || !n) return `${pct}%`;
  return `${pct}% (${ok}/${n})`;
}

function skewSlots(q) {
  return (q.variants || []).filter((s) => s.n >= MIN_VARIANT_N);
}

/**
 * One ranked to-do list for the next event instead of four parallel columns.
 * Each question appears at most once, tagged REWRITE / REBALANCE / SWAP.
 */
export function buildNextEventInsights(perQuestion, submissionCount) {
  const timed = (perQuestion || []).filter((q) => q.avgMs != null);
  const medianQMs = timed.length
    ? timed.map((q) => q.avgMs).sort((a, b) => a - b)[Math.floor(timed.length / 2)]
    : null;

  const actions = [];

  for (const q of perQuestion || []) {
    if (q.n < MIN_VARIANT_N) continue;
    const base = { id: q.id, label: q.label, prompt: q.prompt, pct: q.pct, ok: q.ok, n: q.n };
    const candidates = [];

    if (q.pct < HARD_THRESHOLD_PCT) {
      candidates.push({
        ...base,
        tag: 'REWRITE',
        tone: 'high',
        rank: 200 + (HARD_THRESHOLD_PCT - q.pct),
        reason: `Only ${pctWithCounts(q.pct, q.ok, q.n)} got it. Clarify the wording or ease the difficulty.`,
      });
    } else if (
      q.pct <= 55 &&
      medianQMs != null &&
      q.avgMs != null &&
      q.avgMs > medianQMs * 1.5
    ) {
      candidates.push({
        ...base,
        tag: 'REWRITE',
        tone: 'medium',
        rank: 100 + (55 - q.pct),
        reason: `Slow (${formatDuration(q.avgMs)}) and only ${pctWithCounts(
          q.pct,
          q.ok,
          q.n
        )} correct. Likely confusing, not hard.`,
      });
    }

    if (q.hasVariants) {
      const slots = skewSlots(q);
      if (slots.length >= 2) {
        const sorted = [...slots].sort((a, b) => b.pct - a.pct);
        const easiest = sorted[0];
        const hardest = sorted[sorted.length - 1];
        const delta = easiest.pct - hardest.pct;
        if (delta >= SKEW_THRESHOLD_PP) {
          candidates.push({
            ...base,
            tag: 'REBALANCE',
            tone: 'high',
            delta,
            rank: 150 + delta,
            reason: `Version ${easiest.letter} (${easiest.pct}%) is ${delta}pp easier than version ${hardest.letter} (${hardest.pct}%). Even them out or retire one.`,
          });
        }
      }
    }

    if (q.pct > EASY_THRESHOLD_PCT) {
      candidates.push({
        ...base,
        tag: 'SWAP',
        tone: 'low',
        rank: 40 + (q.pct - EASY_THRESHOLD_PCT),
        reason: `${pctWithCounts(q.pct, q.ok, q.n)} correct. This is a giveaway. Swap in harder content.`,
      });
    }

    if (candidates.length) {
      candidates.sort((a, b) => b.rank - a.rank);
      actions.push(candidates[0]);
    }
  }

  actions.sort((a, b) => b.rank - a.rank);
  const items = actions.slice(0, MAX_ACTIONS);

  const counts = { REWRITE: 0, REBALANCE: 0, SWAP: 0 };
  for (const a of actions) counts[a.tag] += 1;

  return {
    items,
    totalActions: actions.length,
    hidden: Math.max(0, actions.length - items.length),
    summary: {
      rewrite: counts.REWRITE,
      rebalance: counts.REBALANCE,
      swap: counts.SWAP,
      submissions: submissionCount,
      minSampleN: MIN_VARIANT_N,
    },
  };
}

function ordinalList(labels) {
  const list = labels.filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
}

/**
 * 2–4 plain-English sentences describing what the numbers say.
 * Reads only from the object returned by buildQuizInsights().
 */
export function buildInsightsTakeaway(stats) {
  if (!stats || !stats.n) return [];
  const out = [];
  const takers = `${stats.n} ${stats.n === 1 ? 'person' : 'people'}`;
  const center =
    stats.medianPct != null
      ? `The median score was ${stats.medianPct}% (average ${stats.avg}%)`
      : `The average score was ${stats.avg}%`;
  out.push(
    `${takers} took this quiz. ${center}. ${stats.passPct}% hit the ${PASS_THRESHOLD_PCT}% pass line.`
  );

  const scoredQs = (stats.perQuestion || []).filter((q) => q.n >= MIN_VARIANT_N);
  const hardest = [...scoredQs].sort((a, b) => a.pct - b.pct).slice(0, 2);
  if (hardest.length && hardest[0].pct < 60) {
    const worst = hardest.filter((q) => q.pct < 60);
    const parts = worst.map((q) => `${q.label} at ${pctWithCounts(q.pct, q.ok, q.n)}`);
    out.push(`Toughest spot${worst.length === 1 ? '' : 's'}: ${ordinalList(parts)}. Worth a reword before the next run.`);
  } else if (hardest.length) {
    const weakest = hardest[0];
    out.push(
      `Difficulty looked even across the board. The softest question was ${weakest.label} at ${pctWithCounts(
        weakest.pct,
        weakest.ok,
        weakest.n
      )}.`
    );
  }

  const skewed = scoredQs
    .filter((q) => q.variantSkew != null && q.variantSkew >= SKEW_THRESHOLD_PP)
    .sort((a, b) => b.variantSkew - a.variantSkew);
  if (skewed.length) {
    const worst = skewed[0];
    const rest = skewed.length - 1;
    out.push(
      `${worst.label} plays differently by version. Easiest and hardest versions are ${worst.variantSkew} percentage points apart${
        rest > 0 ? `, plus ${rest} other question${rest === 1 ? '' : 's'} with the same problem` : ''
      }.`
    );
  }

  if (stats.lowSample) {
    out.push(
      `Only ${stats.n} submission${
        stats.n === 1 ? '' : 's'
      } so far. Percentages will jump around until you have a bigger sample.`
    );
  } else if (stats.medianDurationMs != null) {
    out.push(`Half of everyone finished within ${formatDuration(stats.medianDurationMs)}.`);
  }

  return out.slice(0, 4);
}

const CHOICE_TYPES = new Set(['multiple_choice', 'true_false', 'dropdown', 'multiple_selection']);

/**
 * Per-choice pick rate for one question version, from raw responses.
 * Answers store original option indexes, so this needs no re-grading.
 */
export function buildChoiceDistribution({ question, variantIndex = 0, responses } = {}) {
  if (!question || !CHOICE_TYPES.has(question.type)) return null;
  const resolved = applyVariant(question, variantIndex);
  const options = Array.isArray(resolved.options) ? resolved.options.map(String) : [];
  if (!options.length) return null;

  const counts = new Array(options.length).fill(0);
  let answered = 0;

  for (const r of responses || []) {
    const variantMap = extractVariantMap(r?.answers) || {};
    const vi = Number(variantMap[question.id]) || 0;
    if (vi !== Number(variantIndex)) continue;
    const raw = r?.answers?.[question.id];
    if (raw == null || raw === '') continue;
    const picks = Array.isArray(raw) ? raw : [raw];
    let counted = false;
    for (const pick of picks) {
      const idx = Number(pick);
      if (Number.isInteger(idx) && idx >= 0 && idx < counts.length) {
        counts[idx] += 1;
        counted = true;
      }
    }
    if (counted) answered += 1;
  }

  if (!answered) return null;
  const correct = new Set(correctChoiceIndexes(resolved));
  return {
    n: answered,
    rows: options.map((label, i) => ({
      label,
      index: i,
      count: counts[i],
      pct: Math.round((counts[i] / answered) * 100),
      correct: correct.has(i),
    })),
  };
}
