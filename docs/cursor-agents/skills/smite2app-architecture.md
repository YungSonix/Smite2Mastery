---
tags: [cursor-agent, smite2app]
vault-zone: cursor-agent
last_reviewed: 2026-06-06
---

# Smite 2 Companion — architecture

Quick reference for agents. Full context: `GOALS.md`, `Vault/decisions-log.md`, `.cursor/rules/smite2app-project.mdc`.

## Stack

Expo SDK 54 · React Native 0.81 · React 19 · Expo Router · Supabase (optional) · Vercel (web)

## Layout

| Path | Role |
|------|------|
| `app/` | Routes only — screens that export default components |
| `lib/` | Shared modules, shop, Prophecy, guides, helpers |
| `hooks/` | Reusable hooks |
| `config/` | Supabase and env |
| `scripts/` | npm scripts, data import |

**Rule:** Non-route modules belong in `lib/` or project root — not `app/`.

## Data

- **Builds/gods/items:** `app/data/God Information/Builds/builds.json` (`lib/buildsData.js`)
- **God skins (per pantheon JSON):** `app/data/God Information/Skins/{Pantheon}.json`
- **Wordle god list:** `Smite2Gods.json` (root)
- **Supabase:** try/catch — app runs without config

## Major surfaces

- **Nav shell:** `app/index.jsx` — Database, Builds, Home, Patch Hub, More + sub-tabs
- **Database:** `app/data.jsx`
- **Builds:** browse, tierlist, custom builder, my builds, guides
- **Patch Hub:** `app/patchhub.jsx`
- **More:** shop, profile, minigames, Prophecy TCG (`app/prophecy.jsx`)

## Council

Same panel as WorkOutApp — `npm run council:ui` (port 3939). Lens: `_shared-smite-lens.md`. Panel Send auto-wakes Chair.

## Scope

- Read `GOALS.md` before implementing
- Update `GOALS.md` after major work (not every tiny fix)
- No API routes unless user asks

## Related

- [[smite2-design]]
- [[council-and-chair]]
- [[karpathy]]
