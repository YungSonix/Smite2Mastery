---
spec: design-md/v1
project: smite2-companion
category: Mobile Game Companion
source:
  principles: GOALS.md
  reference: app/data.jsx
colors:
  accent: "#7dd3fc"
  accentSecondary: "#93c5fd"
  card: "rgba(8, 12, 22, 0.98)"
  cardBorder: "rgba(125, 211, 252, 0.42)"
  panel: "#0b1220"
  panelBorder: "#1e3a5f"
  textTitle: "#f1f5f9"
  textBody: "#cbd5e1"
  textMuted: "#94a3b8"
  scrim: "rgba(3, 7, 18, 0.72)"
spacing:
  cardRadius: 10
---

# Smite 2 Companion — agent design system

> Category: Mobile game companion · Expo Router · Cyan dark shell

Normative tokens above. Prose explains application in React Native (`app/`, `lib/`).

---

## 1. Visual Theme & Atmosphere

Cross-platform Smite 2 companion: builds, database, Patch Hub, shop, Prophecy minigame. **Cool dark cyan** shell — not warm gold frames unless user asks. Readable on phone and web (`Platform.OS === 'web'` max-width layout).

---

## 2. Color Palette & Roles

| Token | Value | Role |
|-------|-------|------|
| Accent | `#7dd3fc` | Links, active nav, key CTAs |
| Accent soft | `#93c5fd` | Secondary highlights |
| Card | `rgba(8, 12, 22, 0.98)` | Modals, tooltips, sheets |
| Card border | `rgba(125, 211, 252, 0.42)` | Floating chrome stroke |
| Panel | `#0b1220` | Inner panels |
| Panel border | `#1e3a5f` | Nested borders, close btn fill |
| Title | `#f1f5f9` | Headings |
| Body | `#cbd5e1` | Copy |
| Muted | `#94a3b8` | Hints, meta |
| Scrim | `rgba(3, 7, 18, 0.72)` | Full-screen overlays |

Reference: **`lib/uiTheme.js`** (canonical) · **`lib/KitAbilityTooltipModal.jsx`** (Builds).

---

## 3. Typography

System / platform fonts. Web: stack in `app/index.jsx` when `IS_WEB`. Match existing nav and page title sizes — do not shrink mobile nav without `useScreenDimensions`.

---

## 4. Component Stylings

| Pattern | Location |
|---------|----------|
| Main nav + sub-nav | `app/index.jsx` |
| Tooltips / modals | **`lib/uiTheme.js`** (`kitAbilityTooltipModalStyles`) · **`lib/KitAbilityTooltipModal.jsx`** (Builds + Database god kit) |
| Dropdown / inline select | **`lib/uiDropdownStyles.js`** (tokens from `uiTheme`) — filter menus `app/data.jsx`, skin picker `lib/SkinShowcasePanel.jsx` |
| Builds cards | `BuildsPage` in `app/index.jsx` |
| Shop / profile chrome | `app/shop.jsx`, `app/profile.jsx` |
| God pantheon (border/color) | `getGodPantheon` (`lib/normalizeBuildsGod.js`), `getPantheonBorderColor` (`app/localIcons.js`) |

**Before new UI chrome:** grep the repo + read `docs/cursor-agents/skills/reuse-ui-patterns.md`.

Close control: `#1e3a5f` fill, `#e6eef8` text, cyan border — on card corner when possible.

---

## 5. Layout Principles

- Top nav: Database, Builds, Home, Patch Hub, More
- Sub-bars per section (see `smite2app-project.mdc`)
- Mobile: respect `useScreenDimensions`; tune spacing before new breakpoints

---

## 6. Depth & Elevation

Card elevation via shadow on tooltip card pattern; borders over heavy drop shadows. Nested panels use `#0b1220` on `#0b1220` parent with `#1e3a5f` border.

---

## 7. Do's and Don'ts

**Do:** Match `GOALS.md` UI consistency; Supabase try/catch fallbacks; keep non-routes in `lib/`.

**Don't:** Warm gold modal frames by default; emoji app chrome; new API routes without user ask; underline-only inputs for primary forms.

---

## 8. Responsive Behavior

iOS, Android, web via Expo. `SafeAreaView` on native. Web: centered max-width where existing.

---

## 9. Agent Prompt Guide

Read: this file → `GOALS.md` → `.cursor/rules/smite2app-project.mdc` → `app/data.jsx` tooltip styles before modal work.

Upstream: Voltagent DESIGN.md pattern · Open Design token layers · Karpathy surgical changes (`docs/cursor-agents/skills/`).
