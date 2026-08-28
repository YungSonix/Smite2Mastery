# Scroll Trivia — security checklist

Contest data (answers, IPs, live sessions) must never be readable or writable with the Supabase **anon** key. Guests and hosts talk to **`/api/trivia/*`** on Vercel; the API uses the **service role** server-side only.

## Keys and env vars

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Vite client (optional) | Anon client URL — **not used for trivia writes** |
| `VITE_SUPABASE_ANON_KEY` | Vite client (optional) | Anon key only — never service role |
| `SUPABASE_URL` | Vercel / server | API admin client |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel / server **only** | Bypasses RLS for host + guest API routes |
| `TRIVIA_HOST_SECRET` | Vercel / server **only** | Host login + `x-host-secret` on `/api/trivia/host` |
| `TRIVIA_HOST_ALLOWLIST` | Vercel / server (optional) | Comma-separated usernames allowed to host |
| `TRIVIA_CRON_SECRET` | Vercel / server (optional) | Protects `/api/trivia/flush-drafts` if you wire a cron job |

**Never** set `SUPABASE_SERVICE_ROLE_KEY`, `TRIVIA_HOST_SECRET`, or `TRIVIA_CRON_SECRET` with a `VITE_` or `EXPO_PUBLIC_` prefix.

Host browsers store `username` + secret in `localStorage` after login — acceptable for trusted hosts; players never use host login.

## Supabase SQL (run before each contest season)

In the Supabase SQL editor, in order:

1. `supabase/formative_trivia.sql` (new projects)
2. `supabase/formative_trivia_types_expand.sql`
3. `supabase/formative_trivia_ingame_name.sql`
4. `supabase/formative_trivia_session_drafts.sql` (or `formative_trivia_sessions.sql`)
5. **`supabase/formative_trivia_rls_tighten.sql`** — required on existing DBs

After step 5, verify policies:

```sql
select tablename, policyname, roles, cmd
from pg_policies
where tablename like 'trivia_%'
order by tablename, policyname;
```

Expected: **one** policy — `trivia_quizzes_public_read_assigned` (`SELECT`, `anon` + `authenticated`, `is_assigned = true`). No policies on `trivia_questions`, `trivia_responses`, or `trivia_sessions`.

### What anon can still do

- `SELECT` rows from `trivia_quizzes` where `is_assigned = true` (includes `settings`, `owner_username`). Take payloads and questions go through `/api/trivia/public` (sanitized, no `correct`).

### What anon cannot do

- Read or write `trivia_questions`, `trivia_responses`, or `trivia_sessions` (RLS deny-all without service role).

## API surface

| Route | Auth | Notes |
|-------|------|--------|
| `GET /api/trivia/public` | Public | Sanitized questions; no IPs |
| `POST /api/trivia/submit` | Public | Body ≤ ~1 MB; slug + name validation |
| `POST /api/trivia/presence` | Public | Live session pings via service role |
| `POST /api/trivia/hint` | Public | Lifelines only when enabled |
| `GET/POST /api/trivia/host` | `x-host-secret` + `x-host-username` | Responses/sessions include IP for host only |
| `GET/POST /api/trivia/flush-drafts` | `TRIVIA_CRON_SECRET` header | Disabled until secret is set |

Public routes do **not** return `SUPABASE_SERVICE_ROLE_KEY` or full `trivia_responses` rows.

## Rate limiting (Vercel)

The API applies a **best-effort in-memory** limit per IP per route (resets on cold start / new instance). It slows casual abuse but is **not** a substitute for WAF or Supabase network rules. Tune with `TRIVIA_RATE_LIMIT_WINDOW_MS` and `TRIVIA_RATE_LIMIT_MAX`.

## Pre-contest checklist

- [ ] Ran `formative_trivia_rls_tighten.sql` and verified policy list above
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set on Vercel (not in client env)
- [ ] Strong `TRIVIA_HOST_SECRET` (not `devsecret`) in production
- [ ] Optional `TRIVIA_HOST_ALLOWLIST` for known host usernames
- [ ] Spot-check: anon PostgREST `select * from trivia_responses` → empty / permission denied
- [ ] Spot-check: unauthenticated `GET /api/trivia/host?action=responses` → 401
