import { buildSubmissionIntegrity } from './submissionIntegrity';
import { filterProductionResponses } from './responseFilters';
import { formatDuration, responseDurationMs, scoredInsightQuestions } from './triviaInsights';
import { promptPlain } from './promptPlain';

function normDiscord(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/#\d{4}$/, '')
    .replace(/[._\s-]+/g, '');
}

function pctForResponse(r) {
  const max = Number(r.max_score) || 0;
  if (max <= 0) return null;
  return (Number(r.score) / max) * 100;
}

function shortLabel(text, max = 48) {
  const t = String(text || '').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Earlier ISO timestamp ranks first (missing dates last). */
function cmpEarlierDate(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa && !sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sa.localeCompare(sb);
}

/** Aggregate per-question performance for one player across attempts. */
function buildQuestionPatterns(responses, questionById) {
  const byPrompt = new Map();

  for (const r of responses) {
    for (const [qid, fracRaw] of Object.entries(r.per_question || {})) {
      if (fracRaw == null) continue;
      const q = questionById.get(qid);
      if (!q) continue;
      const frac = Number(fracRaw);
      if (!Number.isFinite(frac)) continue;
      const key = promptPlain(q.prompt) || qid;
      let row = byPrompt.get(key);
      if (!row) {
        row = { label: shortLabel(key, 56), attempts: 0, sumFrac: 0, earned: 0, possible: 0 };
        byPrompt.set(key, row);
      }
      row.attempts += 1;
      row.sumFrac += frac;
      const pts = Number(q.points) || 0;
      row.earned += frac * pts;
      row.possible += pts;
    }
  }

  const rows = [...byPrompt.values()]
    .filter((r) => r.attempts > 0)
    .map((r) => ({
      ...r,
      avgFrac: r.sumFrac / r.attempts,
      avgPct: Math.round((r.sumFrac / r.attempts) * 100),
    }));

  const minAttempts = 2;
  const strong = rows
    .filter((r) => r.attempts >= minAttempts && r.avgFrac >= 0.75)
    .sort((a, b) => b.avgFrac - a.avgFrac || b.attempts - a.attempts)
    .slice(0, 6);
  const weak = rows
    .filter((r) => r.attempts >= minAttempts && r.avgFrac < 0.5)
    .sort((a, b) => a.avgFrac - b.avgFrac || b.attempts - a.attempts)
    .slice(0, 6);

  return { strong, weak, all: rows };
}

/** One row per Discord identity across production submissions. */
export function buildPlayerLeaderboard(responses, { quizzes = [], questions = [], integrityIndex = null } = {}) {
  const quizMap = Object.fromEntries((quizzes || []).map((q) => [q.id, q]));
  const scoredIds = new Set(scoredInsightQuestions(questions).map((q) => q.id));
  const questionById = new Map(
    (questions || [])
      .filter((q) => scoredIds.has(q.id))
      .map((q) => [q.id, { ...q, plain: promptPlain(q.prompt) }])
  );
  const integrity = integrityIndex || buildSubmissionIntegrity(responses);
  const byKey = new Map();

  for (const r of filterProductionResponses(responses)) {
    const key = normDiscord(r.discord_username);
    if (!key) continue;
    const pct = pctForResponse(r);
    const durationMs = responseDurationMs(r);
    const entry = integrity.get(r.id);
    const flagLevel = entry?.level && entry.level !== 'none' ? entry.level : 'none';

    let row = byKey.get(key);
    if (!row) {
      row = {
        discordKey: key,
        discord: String(r.discord_username || '').trim(),
        ingameNames: new Set(),
        rawResponses: [],
        quizIds: new Set(),
        flaggedLevels: new Set(),
      };
      byKey.set(key, row);
    }

    if (r.ingame_name) row.ingameNames.add(String(r.ingame_name).trim());
    row.quizIds.add(r.quiz_id);
    if (flagLevel !== 'none') row.flaggedLevels.add(flagLevel);
    row.rawResponses.push(r);
  }

  const players = [...byKey.values()].map((row) => {
    const attempts = row.rawResponses
      .map((r) => {
        const pct = pctForResponse(r);
        const durationMs = responseDurationMs(r);
        return {
          id: r.id,
          quizId: r.quiz_id,
          quizTitle: quizMap[r.quiz_id]?.title || r.quiz_id,
          discord: r.discord_username,
          ingame: r.ingame_name,
          score: Number(r.score) || 0,
          maxScore: Number(r.max_score) || 0,
          pct: pct != null ? Math.round(pct) : null,
          durationMs,
          durationLabel: durationMs != null ? formatDuration(durationMs) : '—',
          submittedAt: r.submitted_at,
          perQuestion: r.per_question || {},
          variantMap: r.answers?.__variant_map || {},
        };
      })
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

    const pcts = attempts.map((a) => a.pct).filter((p) => p != null);
    const durations = attempts.map((a) => a.durationMs).filter((d) => d != null);
    const totalScore = attempts.reduce((s, a) => s + a.score, 0);
    const totalMax = attempts.reduce((s, a) => s + a.maxScore, 0);
    const avgPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    const bestPct = pcts.length ? Math.max(...pcts) : null;
    const passCount = pcts.filter((p) => p >= 70).length;
    const avgDurationMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
    const patterns = buildQuestionPatterns(row.rawResponses, questionById);
    const last = attempts[0];
    const first = attempts.length ? attempts[attempts.length - 1] : null;
    const flagged = row.flaggedLevels.size > 0;

    return {
      discordKey: row.discordKey,
      discord: last?.discord || row.discord,
      ingame: last?.ingame || [...row.ingameNames][0] || '—',
      ingameNames: [...row.ingameNames],
      triviasDone: row.quizIds.size,
      eventsEntered: attempts.length,
      totalScore,
      totalMax,
      totalPct: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null,
      avgScore: attempts.length ? Math.round(totalScore / attempts.length) : 0,
      avgMax: attempts.length ? Math.round(totalMax / attempts.length) : 0,
      avgPct,
      bestPct,
      passCount,
      passRate: pcts.length ? Math.round((passCount / pcts.length) * 100) : null,
      avgDurationMs,
      avgDurationLabel: avgDurationMs != null ? formatDuration(avgDurationMs) : '—',
      lastSubmittedAt: last?.submittedAt || null,
      firstSubmittedAt: first?.submittedAt || null,
      attempts,
      strongQuestions: patterns.strong,
      weakQuestions: patterns.weak,
      flagged,
      flagLevel: flagged
        ? row.flaggedLevels.has('high')
          ? 'high'
          : row.flaggedLevels.has('strong')
            ? 'strong'
            : 'soft'
        : 'none',
      loyaltyScore:
        row.quizIds.size * 10 +
        (avgPct != null ? Math.round(avgPct / 10) : 0) +
        passCount * 2,
    };
  });

  return players.sort((a, b) => {
    if (b.triviasDone !== a.triviasDone) return b.triviasDone - a.triviasDone;
    if (b.eventsEntered !== a.eventsEntered) return b.eventsEntered - a.eventsEntered;
    const avgDiff = (b.avgPct || 0) - (a.avgPct || 0);
    if (avgDiff !== 0) return avgDiff;
    const totalPctDiff = (b.totalPct || 0) - (a.totalPct || 0);
    if (totalPctDiff !== 0) return totalPctDiff;
    const scoreDiff = b.totalScore - a.totalScore;
    if (scoreDiff !== 0) return scoreDiff;
    return cmpEarlierDate(a.firstSubmittedAt, b.firstSubmittedAt);
  });
}

export function filterGiveawayCandidates(
  players,
  { minTrivias = 2, minAvgPct = 0, excludeFlagged = true } = {}
) {
  return (players || []).filter((p) => {
    if (p.triviasDone < minTrivias) return false;
    if (minAvgPct > 0 && (p.avgPct == null || p.avgPct < minAvgPct)) return false;
    if (excludeFlagged && p.flagged) return false;
    return true;
  });
}

export function playersToCsv(players) {
  const header = [
    'discord',
    'ingame_name',
    'trivias_done',
    'events_entered',
    'total_points',
    'total_possible',
    'total_pct',
    'avg_points',
    'avg_possible',
    'avg_pct',
    'avg_time',
    'last_seen',
    'flagged',
    'strong_topics',
    'weak_topics',
  ];
  const lines = [header.join(',')];
  for (const p of players || []) {
    lines.push(
      [
        csvCell(p.discord),
        csvCell(p.ingame),
        p.triviasDone,
        p.eventsEntered,
        p.totalScore,
        p.totalMax,
        p.totalPct ?? '',
        p.avgScore,
        p.avgMax,
        p.avgPct ?? '',
        csvCell(p.avgDurationLabel),
        csvCell(String(p.lastSubmittedAt || '').slice(0, 19)),
        p.flagged ? p.flagLevel : '',
        csvCell(p.strongQuestions.map((q) => q.label).join('; ')),
        csvCell(p.weakQuestions.map((q) => q.label).join('; ')),
      ].join(',')
    );
  }
  return lines.join('\n');
}

function csvCell(s) {
  const v = String(s ?? '');
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Preferred wheel / export label: in-game name, else Discord. */
export function playerDisplayName(player) {
  const ingame = String(player?.ingame || '').trim();
  if (ingame && ingame !== '—') return ingame;
  return String(player?.discord || '').trim();
}

/** Build deduped wheel entries from giveaway filter + manual names. */
export function buildSpinWheelNames({
  filteredStudents = [],
  manualNames = [],
  includeFiltered = true,
} = {}) {
  const seen = new Set();
  const list = [];

  const push = (player, source) => {
    const label = playerDisplayName(player);
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push({
      id: player.discordKey || `${source}-${key}`,
      label,
      source,
      discordKey: player.discordKey || null,
    });
  };

  if (includeFiltered) {
    for (const student of filteredStudents) push(student, 'giveaway');
  }
  for (const raw of manualNames) {
    const label = String(raw || '').trim();
    const key = label.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push({ id: `manual-${key}`, label, source: 'manual', discordKey: null });
  }
  return list;
}

export function wheelPoolToCsv(entries) {
  const header = ['display_name', 'source', 'discord', 'ingame_name'];
  const lines = [header.join(',')];
  for (const entry of entries || []) {
    lines.push(
      [csvCell(entry.label), csvCell(entry.source), '', ''].join(',')
    );
  }
  return lines.join('\n');
}
