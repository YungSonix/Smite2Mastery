/** Public take link (share with players). */
export function publicTakeUrl(slug) {
  if (typeof window === 'undefined') return `/trivia/take/${slug}`;
  return `${window.location.origin}/trivia/take/${slug}`;
}

/** Host-only practice link — submissions tagged as test takes. */
export function hostTestTakeUrl(slug, token) {
  const base = publicTakeUrl(slug);
  if (!token) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}take=test&token=${encodeURIComponent(token)}`;
}

export function ensureTestTakeToken(existing) {
  const cur = String(existing || '').trim();
  if (cur) return cur;
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `tt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseTakeLinkMode(searchParams) {
  const mode = String(searchParams?.get?.('take') || '').toLowerCase();
  const token = String(searchParams?.get?.('token') || '').trim();
  if (mode === 'test' && token) return { mode: 'test', token };
  return { mode: 'public', token: '' };
}

export function isValidTestTake(settings, token) {
  const expected = String(settings?.test_take_token || '').trim();
  const got = String(token || '').trim();
  return Boolean(expected && got && expected === got);
}
