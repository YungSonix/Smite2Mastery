export const LIVE_MS = 90000;
export const KEEP_MS = 15 * 60 * 1000;

/**
 * Take-page presence heartbeat interval.
 * 15s keeps ~27 writes/s at 400 concurrent takers (vs ~80/s at 5s).
 * Host "Live now" still feels fresh: LIVE_MS is 90s; server throttles duplicate pings <12s.
 * Tradeoff: slower away/left detection on host grid (worst case +15s lag vs 5s).
 */
export const PRESENCE_POLL_MS = 15000;

export function compactDraftAnswers(answers) {
  const out = {};
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return out;
  for (const [key, value] of Object.entries(answers)) {
    if (key === '__variant_map') continue;
    if (typeof value === 'string' && value.startsWith('data:') && value.length > 8000) continue;
    out[key] = value;
  }
  return out;
}

export function presenceStatus(session, now = Date.now()) {
  if (!session) return 'gone';
  const last = Date.parse(session.last_seen_at);
  const age = Number.isFinite(last) ? now - last : Infinity;
  if (age > KEEP_MS) return 'gone';
  if (session.left_page || age > LIVE_MS) return 'left';
  if (session.currently_hidden) return 'away';
  return 'live';
}

export function presenceLabel(status) {
  if (status === 'live') return 'On quiz';
  if (status === 'away') return 'Tab in background';
  if (status === 'left') return 'Left this page';
  return '';
}

export function pingTriviaPresence(payload, { keepalive = false } = {}) {
  return fetch('/api/trivia/presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive,
  }).catch(() => null);
}
