# Scroll Trivia

Contest host for Smite Scroll. Served at `/trivia` on the same Vercel project as the companion app.

Players only get a take link. Hosts and helpers get the editor, Responses, Insights, Analytics, and Assign settings. The editor **eye** button opens a **host preview** (`/activity/:id/preview`) with every question and correct answers — not a timed student take.

## What is stored where

**In the GitHub repo (static)**  
Question text, options, answer keys, and media files under `app/data/` (god portraits, icons, audio). Quizzes store `/media/...` paths. Locally most files are served by `npm run trivia:api`. On Vercel, most files load from GitHub `master/app/data`. **VoiceAudio**, **God Renders**, **NewGodSkins**, **AspectIcons**, and **Icons/Item Icons** resolve to the `assets` branch (dev and prod). **Icons/God Info** (choice-tile portraits) usually resolve to `main/img/God Info`; newer gods not yet mirrored there (e.g. Ix Chel, Cu Chulainn) resolve to `assets/app/data/Icons/God Info` via `GOD_INFO_ASSETS_ONLY` in `mediaUrl.js`. Optional override: `VITE_TRIVIA_LOCAL_MEDIA=1` to keep those on the local `/media` proxy. Do not embed `data:image` or `data:audio` in question rows.

**In Supabase (live contest data only)**  
Each submission is one row: Discord name, in-game name, answers JSON, score, per-question grades, IP, user-agent, timestamp.

In-progress players (after **Next**) are rows in `trivia_sessions`: last seen, answers filled, and how many times the quiz tab went to the background. That count is not the other site they opened. Host Responses shows them live. Run `supabase/formative_trivia_sessions.sql` if the table is missing.

Keep Supabase as the live store. Use **Export Excel/CSV** when you want a spreadsheet. Do not replace the database with Excel.

A few thousand submissions are still small (kilobytes to a few megabytes). Large cost is **egress** (bytes leaving Postgres), not disk: host Responses used to re-download full question `meta` and every live `draft_answers` every 5 seconds. Polls are now 20s with thin columns; take presence is 15s and only auto-submits **that** session when time is up or they leave. After deploy, run `supabase/formative_trivia_rls_tighten.sql` so the anon key cannot `select` question rows (answers + fat `meta`) via PostgREST. Take pages use `/api/trivia/public`.

**Security:** see [`docs/trivia-security.md`](../docs/trivia-security.md) for RLS checklist, env vars, and pre-contest verification.

## Local

Two **separate** terminals. Do not paste both commands on one line.

The API already defaults to secret `devsecret`. You do **not** need `TRIVIA_HOST_SECRET=...` on Windows PowerShell (that `VAR=value` form is bash-only and will error).

**PowerShell (this machine)**

```powershell
npm run trivia:api
```

```powershell
npm run trivia:dev
```

**bash / mac / Git Bash** (optional explicit secret)

```bash
TRIVIA_HOST_SECRET=devsecret npm run trivia:api
TRIVIA_HOST_SECRET=devsecret npm run trivia:dev
```

Open http://localhost:5174/trivia/  
Host login: any username + password `devsecret`.

API: http://localhost:3000 (`/api/trivia/*` and `/media/*` from `app/data/`).

To set the secret in PowerShell if you ever need a different one:

```powershell
$env:TRIVIA_HOST_SECRET="devsecret"
npm run trivia:api
```

## Generate a Smite 2 quiz from repo data

With the API running:

```bash
npm run trivia:community
```

Creates an assigned quiz with mixed types (multiple choice, true/false, short answer, image, audio, fill-in-the-blank) seeded from `app/data/Smite2Gods.json` plus portraits/audio already in the repo. Prints the take URL and an answer key.

Host emoji sheet: `app/data/Trivia/god-emojis/index.html`. Gallery PNG: `app/data/Trivia/god-emojis/gallery-all-gods.png`. Trivia images: `/media/Trivia/god-emojis/{slug}-a|b|c-unnamed.svg` (random set on remix) plus legacy `{slug}-unnamed.svg` (= set a).

**Trivia vs Minigame maps** (same source, separate files):
- Author: `app/data/Minigames/god-emoji-guess/emoji-clues.json`
- Trivia flat Set A: `app/data/Trivia/god-emojis/god-emoji-map.json`
- Minigame flat Set A: `app/data/Minigames/god-emoji-guess/god-emoji-map.json`
- Minigame full A/B/C: `app/data/Minigames/god-emoji-guess/god-emoji-sets.json`
- Regen: `npm run trivia:god-emojis` · validate: `npm run trivia:god-emojis:validate` · gallery: `npm run trivia:god-emojis:gallery`

## Device checks

```bash
npm run formative:trivia:sims
npm run formative:trivia:gallery
```

Sims cover desktop plus older-to-newer iOS/Android web widths. Gallery screenshots go to `artifacts/trivia-sims/` (gitignored).

### Device/browser matrix (500-session harness)

Scale checks across 12 viewports × 6 browser profiles (Chrome, Edge, Opera GX, Firefox, Safari macOS, Safari iOS):

```bash
# Local (API + Vite must be running)
npm run trivia:device-sims

# 100-run smoke
TRIVIA_DEVICE_SIMS_N=100 npm run trivia:device-sims

# Production (safe — requires explicit flag, concurrency capped at 5)
TRIVIA_DEVICE_SIMS_PROD=1 TRIVIA_DEVICE_SIMS_N=100 FORMATIVE_UI_BASE=https://smitescroll.com npm run trivia:device-sims
```

Env: `TRIVIA_DEVICE_SIMS_N` (default 500), `TRIVIA_DEVICE_SIMS_CONCURRENCY` (default 8 local / 5 prod), `TRIVIA_DEVICE_SIMS_PROD=1`, `FORMATIVE_UI_BASE`, `FORMATIVE_API_BASE`, `TRIVIA_SLUG` or `artifacts/trivia-sims/quiz.json`. Reports: `artifacts/trivia-device-sims/report.json`.

## API load test (400+ takers)

Pure Node fetch — no browser. Exercises `GET /api/trivia/public` (with discord variant path), `POST /api/trivia/presence`, and `POST /api/trivia/submit` with realistic payloads (`variant_map`, `__timings`, unique `loadtest-user-{n}` Discord names).

**Local** (API must be running):

```bash
npm run trivia:api
node scripts/formative-random-quiz.mjs
npm run trivia:load-test
```

Smoke (20 users):

```bash
TRIVIA_LOAD_N=20 npm run trivia:load-test
```

Full burst (default 400 users, concurrency 30):

```bash
TRIVIA_LOAD_N=400 TRIVIA_LOAD_CONCURRENCY=30 npm run trivia:load-test
```

Use `TRIVIA_SLUG=your-slug` if you already have an assigned quiz. Report: `artifacts/trivia-load/report.json` (p50/p95 latency, status codes, 409 duplicate handling).

**Production** (throttled — max concurrency 10, script prints a warning):

```bash
TRIVIA_LOAD_PROD=1 FORMATIVE_API_BASE=https://smitescroll.com TRIVIA_SLUG=your-slug TRIVIA_LOAD_N=50 npm run trivia:load-test
```

## Host features

- Pencil rename on the top bar and quiz cover
- **Save** in the top bar (Ctrl/Cmd+S). Instructions, questions, images, and cover wait for Save. Assign settings still write when you change them.
- Instructions and prompts: chat-style toolbar (bold, italic, underline, strike, link, code, spoiler, heading, quote, lists). Players see formatted text on the take page.
- Take page shows cover + instructions + name fields until **Start**. Question images load as blob URLs so hover does not show filenames.
- Responses **Live now**: who started, on-quiz vs tab-in-background vs left the page, answered count, left-tab count (host-only).
- Image/Audio blocks: **+** to pick question type (keeps the media)
- Up to **8 media files per version** (A/B/C): images, audio, and video/embed URLs in one list. Extra URLs live on `meta.image_urls` / `variant.image_urls`.
- **Random question** opens a style menu (item ID, voice line, zoomed skin, emoji, **ability cast sound**, etc.) instead of rolling a blind template. Ability sounds use `Skin00_Base/Ability1–4` Activate/Start WAVs (`npm run trivia:media-catalog`).
- Fill in the blank: sentence + blank + correct answer
- Question **Version A / B / C** — each Discord name gets one version
- Assign settings: hide scores from players by default
- Guest tab close: same browser restores progress until submit
- Responses: Discord, In-Game Name, scores, IP (host only)
- **Export Excel/CSV** on Responses, or  
  `GET /api/trivia/host?action=responses&quizId=…&format=csv`

## Deploy

1. Run SQL in `supabase/` (in order):  
   `formative_trivia.sql`  
   `formative_trivia_types_expand.sql`  
   `formative_trivia_ingame_name.sql`  
   Notes: `formative_trivia_notes.sql`  
   Contest: `trivia_smite2_community_seed.sql` (SMITE 2 TRIVIA)
2. Vercel env (server only, never `VITE_` / `EXPO_PUBLIC_`):  
   `SUPABASE_URL`  
   `SUPABASE_SERVICE_ROLE_KEY`  
   `TRIVIA_HOST_SECRET`  
   optional `TRIVIA_HOST_ALLOWLIST`  
   optional `TRIVIA_CRON_SECRET` (if using `/api/trivia/flush-drafts` on a schedule)
3. Redeploy. Open `https://YOUR-DOMAIN/trivia/`

Dual build: `scripts/build-web-with-formative.js` → Expo in `dist/`, trivia in `dist/trivia/`.
