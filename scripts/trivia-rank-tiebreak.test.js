/**
 * Unit checks for trivia score tie-break (earlier submit ranks higher).
 * Run: node scripts/trivia-rank-tiebreak.test.js
 */
const assert = require('assert');
const {
  cmpResponsesByScore,
  cmpBestAttempt,
  cmpEarlierIsoDate,
  responsePercentRounded,
} = require('../lib/triviaRankTiebreak');

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    return true;
  } catch (e) {
    console.error(`[FAIL] ${name} — ${e.message}`);
    return false;
  }
}

const r = (discord, score, max, submitted_at) => ({
  discord_username: discord,
  score,
  max_score: max,
  submitted_at,
});

let passed = 0;
let failed = 0;

function run(name, fn) {
  if (test(name, fn)) passed += 1;
  else failed += 1;
}

run('higher score ranks first', () => {
  const a = r('high', 9, 10, '2026-01-02T12:00:00Z');
  const b = r('low', 7, 10, '2026-01-01T12:00:00Z');
  assert.ok(cmpResponsesByScore(a, b, true) < 0);
  assert.ok(cmpResponsesByScore(b, a, true) > 0);
});

run('same rounded % → earlier submit wins', () => {
  const earlier = r('mytharria', 18, 20, '2026-01-01T18:00:00Z');
  const later = r('wunderprojectv.2', 9, 10, '2026-01-01T19:30:00Z');
  assert.equal(responsePercentRounded(earlier), 90);
  assert.equal(responsePercentRounded(later), 90);
  assert.ok(cmpResponsesByScore(earlier, later, true) < 0, 'earlier should rank above later');
  const sorted = [later, earlier].sort((a, b) => cmpResponsesByScore(a, b, true));
  assert.equal(sorted[0].discord_username, 'mytharria');
});

run('cmpBestAttempt matches cmpResponsesByScore', () => {
  const a = r('a', 18, 20, '2026-01-01T10:00:00Z');
  const b = r('b', 18, 20, '2026-01-01T11:00:00Z');
  assert.equal(cmpBestAttempt(a, b), cmpResponsesByScore(a, b, true));
});

run('cmpEarlierIsoDate orders ISO strings', () => {
  assert.ok(cmpEarlierIsoDate('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z') < 0);
});

run('score lo puts lower % first, same tie-break', () => {
  const low = r('low', 5, 10, '2026-01-01T12:00:00Z');
  const high = r('high', 9, 10, '2026-01-01T10:00:00Z');
  assert.ok(cmpResponsesByScore(low, high, false) < 0);
  const tieA = r('a', 6, 10, '2026-01-01T09:00:00Z');
  const tieB = r('b', 3, 5, '2026-01-01T10:00:00Z');
  assert.equal(responsePercentRounded(tieA), 60);
  assert.equal(responsePercentRounded(tieB), 60);
  assert.ok(cmpResponsesByScore(tieA, tieB, false) < 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
