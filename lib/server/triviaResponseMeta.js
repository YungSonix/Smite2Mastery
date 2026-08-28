/** Host list fields derived from trivia_responses.answers meta. */

function durationFromTimestamps(submittedAt, startedAt) {
  const end = Date.parse(submittedAt);
  let start = Number(startedAt);
  if (!Number.isFinite(start)) start = Date.parse(startedAt);
  if (!Number.isFinite(end) || !Number.isFinite(start)) return null;
  const d = end - start;
  return d >= 0 ? d : null;
}

/** Normalize __duration_ms (fix seconds-as-ms, timestamps, stale session starts). */
function normalizeDurationMs(rawMs, submittedAt, startedAt) {
  let ms = Number(rawMs);
  const fromTs = durationFromTimestamps(submittedAt, startedAt);

  if (!Number.isFinite(ms) || ms < 0) ms = null;

  // Timestamp stored where duration belongs (epoch ms).
  if (ms != null && ms > 1e12) ms = null;

  // Seconds mislabeled as ms when timestamp diff is much larger.
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

function extractResponseMeta(answers, submittedAt) {
  const ans = answers && typeof answers === 'object' ? answers : {};
  const pres = ans.__presence && typeof ans.__presence === 'object' ? ans.__presence : {};
  return {
    duration_ms: normalizeDurationMs(ans.__duration_ms, submittedAt, ans.__started_at),
    tab_away_count: Number(pres.hidden_count) || 0,
    left_page: Boolean(pres.left_page),
  };
}

function mapResponseForHost(row, { includeAnswers = false } = {}) {
  if (!row) return row;
  const meta = extractResponseMeta(row.answers, row.submitted_at);
  const out = { ...row, ...meta };
  if (includeAnswers) {
    out.answers = row.answers;
  } else {
    out.answers = {
      __duration_ms: meta.duration_ms,
      __started_at: row.answers?.__started_at,
      __presence: row.answers?.__presence,
    };
  }
  return out;
}

module.exports = {
  normalizeDurationMs,
  extractResponseMeta,
  mapResponseForHost,
  durationFromTimestamps,
};
