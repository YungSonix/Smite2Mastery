/**
 * Shared trivia ranking tie-break: same score % → earlier submit ranks higher.
 * Used by formative Responses sort, Analytics leaderboard, and classroom placement.
 */

function responsePercentRounded(r) {
  const max = Number(r?.max_score) || 0;
  if (max <= 0) return 0;
  return Math.round((Number(r.score) / max) * 100);
}

function submittedMsFromResponse(r) {
  const raw = r?.submitted_at ?? r?.submittedAt;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Null / missing numeric values sort last (not as 0). */
function cmpNumNullLast(a, b, dir = 1) {
  const aNull = a == null || !Number.isFinite(a);
  const bNull = b == null || !Number.isFinite(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return (a - b) * dir;
}

/** Earlier timestamp (smaller ms) ranks first; missing dates last. */
function cmpEarlierSubmitMs(msA, msB) {
  return cmpNumNullLast(msA, msB, 1);
}

/** Earlier ISO timestamp ranks first (missing dates last). */
function cmpEarlierIsoDate(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa && !sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sa.localeCompare(sb);
}

/**
 * Compare two response rows by score %; ties → earlier submit wins.
 * @param {boolean} descending — true = higher % first (leaderboard default)
 */
function cmpResponsesByScore(a, b, descending = true) {
  const pctA = responsePercentRounded(a);
  const pctB = responsePercentRounded(b);
  if (pctA !== pctB) return descending ? pctB - pctA : pctA - pctB;
  return cmpEarlierSubmitMs(submittedMsFromResponse(a), submittedMsFromResponse(b));
}

/**
 * Best-attempt comparison for classroom placement (same rules as Responses score sort).
 * Returns negative when `a` is the better attempt.
 */
function cmpBestAttempt(a, b) {
  return cmpResponsesByScore(a, b, true);
}

module.exports = {
  responsePercentRounded,
  submittedMsFromResponse,
  cmpNumNullLast,
  cmpEarlierSubmitMs,
  cmpEarlierIsoDate,
  cmpResponsesByScore,
  cmpBestAttempt,
};
