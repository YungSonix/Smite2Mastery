# Scroll Trivia

Contest host for Smite Scroll. Served at `/trivia` on the same Vercel project as the companion app.

Players only get a take link. Hosts and helpers get the editor, Responses, Insights, Analytics, and Assign settings.

## What is stored where

**In the GitHub repo (static)**  
Question text, options, answer keys, and media files under `app/data/` (god portraits, icons, audio). Quizzes store `/media/...` paths. Locally those files are served by `npm run trivia:api`. On Vercel, most files load from GitHub `master/app/data`. **VoiceAudio** is gitignored on master — `/media/VoiceAudio/...` loads from the `assets` branch. Do not embed `data:image` or `data:audio` in question rows.

**In Supabase (live contest data only)**  
Each submission is one row: Discord name, in-game name, answers JSON, score, per-question grades, IP, user-agent, timestamp.

In-progress players (after **Next**) are rows in `trivia_sessions`: last seen, answers filled, and how many times the quiz tab went to the background. That count is not the other site they opened. Host Responses shows them live. Run `supabase/formative_trivia_sessions.sql` if the table is missing.

Keep Supabase as the live store. Use **Export Excel/CSV** when you want a spreadsheet. Do not replace the database with Excel.

A few thousand submissions are still small (kilobytes to a few megabytes). Large cost only happens if you embed huge image/audio data URLs in question rows instead of repo `/media` paths.

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

## Device checks

```bash
npm run formative:trivia:sims
npm run formative:trivia:gallery
```

Sims cover desktop plus older-to-newer iOS/Android web widths. Gallery screenshots go to `artifacts/trivia-sims/` (gitignored).

## Host features

- Pencil rename on the top bar and quiz cover
- **Save** in the top bar (Ctrl/Cmd+S). Instructions, questions, images, and cover wait for Save. Assign settings still write when you change them.
- Instructions and prompts: chat-style toolbar (bold, italic, underline, strike, link, code, spoiler, heading, quote, lists). Players see formatted text on the take page.
- Take page shows cover + instructions + name fields until **Start**. Question images load as blob URLs so hover does not show filenames.
- Responses **Live now**: who started, on-quiz vs tab-in-background vs left the page, answered count, left-tab count (host-only).
- Image/Audio blocks: **+** to pick question type (keeps the media)
- Up to **8 media files per version** (A/B/C): images, audio, and video/embed URLs in one list. Extra URLs live on `meta.image_urls` / `variant.image_urls`.
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
3. Redeploy. Open `https://YOUR-DOMAIN/trivia/`

Dual build: `scripts/build-web-with-formative.js` → Expo in `dist/`, trivia in `dist/trivia/`.
