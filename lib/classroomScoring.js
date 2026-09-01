/**
 * Discord Classroom auto-points — shared by host API sync and formative-web UI.
 *
 * Total class points = classroom_points (auto, recomputed on sync) + classroom_bonus (manual).
 */

/** Pass threshold (%). */
const CLASSROOM_PASS_THRESHOLD = 70;

/** Points per unique trivia entered (one best attempt per quiz). */
const CLASSROOM_BASE_PER_TRIVIA = 5;

/** Bonus when best attempt meets or exceeds pass threshold. */
const CLASSROOM_PASS_BONUS = 15;

/** Bonus for submitting on the quiz's first open day. */
const CLASSROOM_FIRST_DAY_BONUS = 10;

/** Placement bonuses — one best tier per quiz (within production submissions). */
const CLASSROOM_PLACEMENT_FIRST = 35;
const CLASSROOM_PLACEMENT_TOP3 = 20;
const CLASSROOM_PLACEMENT_TOP5 = 10;
const CLASSROOM_PLACEMENT_TOP10 = 5;

/** Bonus for a perfect score (100%) on a quiz. */
const CLASSROOM_PERFECT_BONUS = 10;

/** Bonus for each pass in a streak of 2+ consecutive trivias (chronological). */
const CLASSROOM_STREAK_PASS_BONUS = 8;

function normDiscordKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/#\d{4}$/, '')
    .replace(/[._\s-]+/g, '');
}

function responseIsTest(r) {
  return Boolean(r?.answers?.__test_take);
}

const {
  cmpBestAttempt,
  responsePercentRounded,
  submittedMsFromResponse,
} = require('./triviaRankTiebreak');

function pctForResponse(r) {
  const max = Number(r?.max_score) || 0;
  if (max <= 0) return null;
  return (Number(r.score) / max) * 100;
}

function submittedMs(r) {
  return submittedMsFromResponse(r);
}

function pctForPlacement(r) {
  const max = Number(r?.max_score) || 0;
  if (max <= 0) return null;
  return responsePercentRounded(r);
}

function calendarDay(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function quizFirstOpenDay(quiz, prodResponsesForQuiz) {
  const opens = quiz?.settings?.opens_at;
  if (opens) {
    const day = calendarDay(opens);
    if (day) return day;
  }
  let earliest = null;
  for (const r of prodResponsesForQuiz || []) {
    if (!r?.submitted_at) continue;
    if (!earliest || String(r.submitted_at).localeCompare(String(earliest)) < 0) {
      earliest = r.submitted_at;
    }
  }
  return calendarDay(earliest);
}

function placementForRank(rank) {
  if (rank === 1) return { tier: 'first', points: CLASSROOM_PLACEMENT_FIRST };
  if (rank <= 3) return { tier: 'top3', points: CLASSROOM_PLACEMENT_TOP3 };
  if (rank <= 5) return { tier: 'top5', points: CLASSROOM_PLACEMENT_TOP5 };
  if (rank <= 10) return { tier: 'top10', points: CLASSROOM_PLACEMENT_TOP10 };
  return { tier: null, points: 0 };
}

function emptyBreakdown() {
  return {
    total: 0,
    base: { count: 0, points: 0 },
    pass: { count: 0, points: 0 },
    firstDay: { count: 0, points: 0 },
    placement: { first: 0, top3: 0, top5: 0, top10: 0, points: 0 },
    perfect: { count: 0, points: 0 },
    streak: { count: 0, points: 0 },
    byQuiz: [],
  };
}

/** Best production attempt per Discord key, per quiz. */
function buildBestAttemptsByQuiz(allProdResponses, quizIds) {
  const byQuiz = new Map();
  for (const quizId of quizIds) {
    byQuiz.set(quizId, new Map());
  }
  for (const r of allProdResponses || []) {
    if (!byQuiz.has(r.quiz_id)) continue;
    const key = normDiscordKey(r.discord_username);
    if (!key) continue;
    const map = byQuiz.get(r.quiz_id);
    const prev = map.get(key);
    if (!prev || cmpBestAttempt(r, prev) < 0) map.set(key, r);
  }
  return byQuiz;
}

/** Rank map: quizId → discordKey → rank (1 = best). */
function buildQuizRankings(allProdResponses, quizIds) {
  const bestByQuiz = buildBestAttemptsByQuiz(allProdResponses, quizIds);
  const ranksByQuiz = new Map();
  for (const [quizId, playerMap] of bestByQuiz) {
    const sorted = [...playerMap.entries()].sort((a, b) => cmpBestAttempt(a[1], b[1]));
    const rankMap = new Map();
    sorted.forEach(([key], idx) => rankMap.set(key, idx + 1));
    ranksByQuiz.set(quizId, rankMap);
  }
  return ranksByQuiz;
}

function prodResponsesForPlayer(allProdResponses, discordKey) {
  const key = normDiscordKey(discordKey);
  return (allProdResponses || []).filter(
    (r) => !responseIsTest(r) && normDiscordKey(r.discord_username) === key
  );
}

/**
 * Full auto-points breakdown for one student.
 * @param {string} discordKey
 * @param {object[]} allProdResponses — all production responses (for placement ranks)
 * @param {object[]} quizzes — quiz rows with id, title, settings.opens_at
 */
function computeClassroomAutoPointsBreakdown(discordKey, allProdResponses, quizzes = []) {
  const key = normDiscordKey(discordKey);
  if (!key) return emptyBreakdown();

  const playerProd = prodResponsesForPlayer(allProdResponses, key);
  if (!playerProd.length) return emptyBreakdown();

  const quizMap = Object.fromEntries((quizzes || []).map((q) => [q.id, q]));
  const quizIds = [...new Set(playerProd.map((r) => r.quiz_id))];
  const globalProd = (allProdResponses || []).filter((r) => !responseIsTest(r));
  const responsesByQuiz = new Map();
  for (const r of globalProd) {
    if (!quizIds.includes(r.quiz_id)) continue;
    let list = responsesByQuiz.get(r.quiz_id);
    if (!list) {
      list = [];
      responsesByQuiz.set(r.quiz_id, list);
    }
    list.push(r);
  }

  const ranksByQuiz = buildQuizRankings(globalProd, quizIds);
  const bestByQuiz = new Map();
  for (const r of playerProd) {
    const prev = bestByQuiz.get(r.quiz_id);
    if (!prev || cmpBestAttempt(r, prev) < 0) bestByQuiz.set(r.quiz_id, r);
  }

  const breakdown = emptyBreakdown();
  const chronology = [];

  for (const [quizId, best] of bestByQuiz) {
    const pct = pctForResponse(best);
    const roundedPct = pctForPlacement(best);
    const passed = pct != null && pct >= CLASSROOM_PASS_THRESHOLD;
    const perfect = pct != null && pct >= 100;

    breakdown.base.count += 1;
    breakdown.base.points += CLASSROOM_BASE_PER_TRIVIA;

    if (passed) {
      breakdown.pass.count += 1;
      breakdown.pass.points += CLASSROOM_PASS_BONUS;
    }

    const firstDay = quizFirstOpenDay(quizMap[quizId], responsesByQuiz.get(quizId) || []);
    const submitDay = calendarDay(best.submitted_at);
    if (firstDay && submitDay && submitDay === firstDay) {
      breakdown.firstDay.count += 1;
      breakdown.firstDay.points += CLASSROOM_FIRST_DAY_BONUS;
    }

    if (perfect) {
      breakdown.perfect.count += 1;
      breakdown.perfect.points += CLASSROOM_PERFECT_BONUS;
    }

    const rank = ranksByQuiz.get(quizId)?.get(key) ?? null;
    const placement = rank != null ? placementForRank(rank) : { tier: null, points: 0 };
    if (placement.tier === 'first') breakdown.placement.first += 1;
    else if (placement.tier === 'top3') breakdown.placement.top3 += 1;
    else if (placement.tier === 'top5') breakdown.placement.top5 += 1;
    else if (placement.tier === 'top10') breakdown.placement.top10 += 1;
    breakdown.placement.points += placement.points;

    chronology.push({
      quizId,
      quizTitle: quizMap[quizId]?.title || quizId,
      submittedAt: best.submitted_at,
      pct: roundedPct,
      passed,
      rank,
      placementTier: placement.tier,
      placementPoints: placement.points,
      quizPoints:
        CLASSROOM_BASE_PER_TRIVIA +
        (passed ? CLASSROOM_PASS_BONUS : 0) +
        (firstDay && submitDay === firstDay ? CLASSROOM_FIRST_DAY_BONUS : 0) +
        (perfect ? CLASSROOM_PERFECT_BONUS : 0) +
        placement.points,
    });
  }

  chronology.sort((a, b) => {
    const msA = submittedMs({ submitted_at: a.submittedAt });
    const msB = submittedMs({ submitted_at: b.submittedAt });
    if (msA == null && msB == null) return 0;
    if (msA == null) return 1;
    if (msB == null) return -1;
    return msA - msB;
  });

  let streak = 0;
  for (const entry of chronology) {
    if (entry.passed) {
      streak += 1;
      if (streak >= 2) {
        breakdown.streak.count += 1;
        breakdown.streak.points += CLASSROOM_STREAK_PASS_BONUS;
      }
    } else {
      streak = 0;
    }
  }

  breakdown.byQuiz = chronology;
  breakdown.total =
    breakdown.base.points +
    breakdown.pass.points +
    breakdown.firstDay.points +
    breakdown.placement.points +
    breakdown.perfect.points +
    breakdown.streak.points;

  return breakdown;
}

function classroomAutoPointsTotal(discordKey, allProdResponses, quizzes = []) {
  return computeClassroomAutoPointsBreakdown(discordKey, allProdResponses, quizzes).total;
}

/** Legacy fallback when only aggregate stats exist (no raw responses). */
function classroomPointsFromStats({ triviasDone = 0, passCount = 0 } = {}) {
  return (
    (Number(triviasDone) || 0) * CLASSROOM_BASE_PER_TRIVIA +
    (Number(passCount) || 0) * CLASSROOM_PASS_BONUS
  );
}

module.exports = {
  CLASSROOM_PASS_THRESHOLD,
  CLASSROOM_BASE_PER_TRIVIA,
  CLASSROOM_PASS_BONUS,
  CLASSROOM_FIRST_DAY_BONUS,
  CLASSROOM_PLACEMENT_FIRST,
  CLASSROOM_PLACEMENT_TOP3,
  CLASSROOM_PLACEMENT_TOP5,
  CLASSROOM_PLACEMENT_TOP10,
  CLASSROOM_PERFECT_BONUS,
  CLASSROOM_STREAK_PASS_BONUS,
  normDiscordKey,
  cmpBestAttempt,
  buildQuizRankings,
  computeClassroomAutoPointsBreakdown,
  classroomAutoPointsTotal,
  classroomPointsFromStats,
};
