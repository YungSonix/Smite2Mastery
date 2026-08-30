/**
 * Sanity checks for trivia submit idempotency (requires local API: npm run trivia:api).
 * Run: node scripts/trivia-submit-sanity.mjs
 */
const BASE = process.env.TRIVIA_API_BASE || 'http://127.0.0.1:3938';

async function json(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { res, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const list = await json('/api/trivia/public');
  assert(list.res.ok, `API not reachable at ${BASE} — run npm run trivia:api`);
  const slug = list.data?.quiz?.slug;
  assert(slug, 'No assigned quiz found — assign one locally first');

  const discord = `sanity-${Date.now()}`;
  const body = {
    slug,
    discord_username: discord,
    ingame_name: 'SanityBot',
    answers: { __duration_ms: 12000 },
    variant_map: {},
  };

  const first = await json('/api/trivia/submit', { method: 'POST', body: JSON.stringify(body) });
  assert(first.res.ok, `First submit failed: ${first.data?.error || first.res.status}`);

  const second = await json('/api/trivia/submit', { method: 'POST', body: JSON.stringify(body) });
  assert(second.res.ok, `Second submit should be idempotent: ${second.data?.error}`);
  assert(
    second.data?.alreadySubmitted || second.data?.already_submitted,
    'Second submit should flag alreadySubmitted'
  );

  const pub = await json(
    `/api/trivia/public?slug=${encodeURIComponent(slug)}&discord=${encodeURIComponent(discord)}`
  );
  assert(pub.res.ok, 'public status fetch failed');
  assert(pub.data?.submission?.already_submitted, 'public should report already_submitted');

  console.log('trivia-submit-sanity: OK', { slug, discord });
}

main().catch((e) => {
  console.error('trivia-submit-sanity: FAIL', e.message);
  process.exit(1);
});
