/** Contest open/close window from quiz.settings.opens_at / closes_at (ISO). */

function quizWindowState(settings, nowMs = Date.now()) {
  const opensRaw = settings?.opens_at;
  const closesRaw = settings?.closes_at;
  const opens = opensRaw ? Date.parse(opensRaw) : NaN;
  const closes = closesRaw ? Date.parse(closesRaw) : NaN;
  if (Number.isFinite(opens) && nowMs < opens) {
    return { status: 'not_open', opensAt: opensRaw, closesAt: closesRaw || null };
  }
  if (Number.isFinite(closes) && nowMs > closes) {
    return { status: 'closed', opensAt: opensRaw || null, closesAt: closesRaw };
  }
  return { status: 'open', opensAt: opensRaw || null, closesAt: closesRaw || null };
}

module.exports = { quizWindowState };
