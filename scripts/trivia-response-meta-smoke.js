/** Smoke checks for host response duration/presence mapping. */
const {
  mapResponseForHost,
  normalizeDurationMs,
} = require('../lib/server/triviaResponseMeta');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const submitted = '2026-08-28T20:00:30.000Z';
const started = Date.parse('2026-08-28T20:00:00.000Z');

const row = {
  id: 'r1',
  submitted_at: submitted,
  answers: {
    q1: 'a',
    __duration_ms: 25000,
    __started_at: started,
    __presence: { hidden_count: 2, left_page: true },
  },
};

const lite = mapResponseForHost(row, { includeAnswers: false });
assert(lite.duration_ms === 25000, `expected 25000ms, got ${lite.duration_ms}`);
assert(lite.tab_away_count === 2, `expected tab away 2, got ${lite.tab_away_count}`);
assert(lite.left_page === true, 'expected left_page true');
assert(lite.answers.__duration_ms === 25000, 'lite answers should keep duration');
assert(lite.answers.q1 === undefined, 'lite answers should strip question keys');

const noAnswersRow = { id: 'r2', submitted_at: submitted };
const empty = mapResponseForHost(noAnswersRow, { includeAnswers: false });
assert(empty.duration_ms == null, `missing answers should not yield 0, got ${empty.duration_ms}`);
assert(empty.tab_away_count == null, 'missing presence should be null not 0');

const fromTs = normalizeDurationMs(null, submitted, started);
assert(fromTs === 30000, `timestamp fallback expected 30000, got ${fromTs}`);

console.log('trivia-response-meta-smoke: ok');
