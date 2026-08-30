/** Practice / host test take link helpers (shared by API + commit). */

function responseIsTestRow(row) {
  const v = row?.answers?.__test_take;
  return v === true || v === 'true' || v === 1 || v === '1';
}

function isValidTestTakeToken(settings, token) {
  const expected = String(settings?.test_take_token || '').trim();
  const got = String(token || '').trim();
  return Boolean(expected && got && expected === got);
}

function resolveTestTakeMode(settings, token) {
  const got = String(token || '').trim();
  if (!got) return { isTestTake: false, valid: true };
  const valid = isValidTestTakeToken(settings, got);
  return { isTestTake: valid, valid };
}

module.exports = {
  responseIsTestRow,
  isValidTestTakeToken,
  resolveTestTakeMode,
};
