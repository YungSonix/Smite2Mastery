# Master prompt — port WorkOutApp vault + Cursor agent stack to another project

Use this when bootstrapping **`C:\Users\Carri\Documents\smite2app`** (or any sibling repo) with the same Obsidian vault, Cursor rules, upstream GitHub knowledge, and AI Council as WorkOutApp.

**Source of truth:** `C:\Users\Carri\Documents\WorkOutApp`  
**Target example:** `C:\Users\Carri\Documents\smite2app`

---

## Copy-paste prompt (give this to Cursor in the **target** project)

```markdown
# Port WorkOutApp agent + vault stack to this repo

You are bootstrapping **this project** with the same agent infrastructure as **WorkOutApp** (`C:\Users\Carri\Documents\WorkOutApp`). Do not reinstall upstream GitHub repos — use distilled skills already in WorkOutApp.

## Goal

1. Obsidian **Vault/** (PARA, color-coded, Kanban, Cursor agents, Council mirror)
2. **Cursor rules** (agent-knowledge, agent-workflow, plan, vault-sync, council, project-specific)
3. **docs/cursor-agents/** skills (Karpathy, Open Design, Voltagent, Tailwind→RN) + **DESIGN.md** for this app
4. **AI Council** (panel, chair, auto-wake on Send) — optional but requested
5. **npm run vault:sync** + council scripts merged into existing package.json

## Phase 0 — Read target first

- Read `.cursor/rules/*` and **GOALS.md** (do not destroy existing content)
- Read **package.json** — merge scripts, do not replace the whole file
- Note stack: Expo Router, Supabase, builds.json, cyan UI (`GOALS.md` → UI consistency)

## Phase 1 — Automated bootstrap (from WorkOutApp terminal)

Run from WorkOutApp (backup target GOALS.md + package.json first):

```powershell
cd C:\Users\Carri\Documents\WorkOutApp

Copy-Item C:\Users\Carri\Documents\smite2app\GOALS.md C:\Users\Carri\Documents\smite2app\GOALS.md.bak
Copy-Item C:\Users\Carri\Documents\smite2app\package.json C:\Users\Carri\Documents\smite2app\package.json.bak

node templates/project-starter/bootstrap.mjs `
  --target "C:\Users\Carri\Documents\smite2app" `
  --name "Smite 2 Companion (smitescroll)" `
  --stack generic `
  --fresh-council
```

Then **restore and merge**:
- Merge `GOALS.md.bak` back into `GOALS.md` (keep human goals; add vault/council pointers if missing)
- Merge `package.json.bak` scripts with new `vault:*` and `council:*` scripts (keep all existing expo scripts)
- Replace `vault.config.json` with Expo layout — copy from WorkOutApp `templates/project-starter/vault.config.expo-smite2.template.json` and set `projectName` / paths

## Phase 2 — Cursor rules (`.cursor/rules/`)

| Rule | Action |
|------|--------|
| `agent-knowledge.mdc` | Copy from WorkOutApp; replace `WILLOW_DESIGN.md` → `docs/SMITE2_DESIGN.md`, `workout-app` → `smite2app` |
| `agent-workflow.mdc` | Copy + adapt: BUGS/TASKS/GOALS, Vault paths, skip changelog-auto if no in-app changelog |
| `plan.mdc` | Copy as-is |
| `vault-sync.mdc` | Copy as-is |
| `council.mdc` | Copied by bootstrap |
| `smite2app-project.mdc` | **Keep** — merge UI/DESIGN pointers into it; reference `agent-knowledge.mdc` at top |

Set `agent-knowledge.mdc` and `smite2app-project.mdc` both `alwaysApply: true` (project rule stays domain expert; agent-knowledge stays read order).

## Phase 3 — docs/cursor-agents/ (from bootstrap)

Adapt copied skills for **this app**:

| Skill | Change |
|-------|--------|
| `00 Read first.md` | Vault paths + `docs/SMITE2_DESIGN.md` |
| `karpathy.md` | Keep (upstream: andrej-karpathy-skills) |
| `open-design.md` | Map tokens to **GOALS.md UI consistency** + `kitAbilityTooltipCard` in `app/data.jsx` |
| `voltagent-design-md.md` | Point to `docs/SMITE2_DESIGN.md` |
| `tailwind-thinking-for-rn.md` | Keep (Expo RN) |
| `workout-app-architecture.md` | **Rename** → `smite2app-architecture.md` (Expo Router, builds.json, Supabase, Prophecy, shop) |
| `council-and-chair.md` | Keep; panel auto-wake via `panelAutoWakeChair` |
| `willow-design.md` | **Replace** with sync from `docs/SMITE2_DESIGN.md` |
| `sources.md` | Keep upstream GitHub links |

### Upstream GitHub (distilled only — do not clone)

| Repo | Skill |
|------|-------|
| https://github.com/multica-ai/andrej-karpathy-skills | karpathy.md |
| https://github.com/nexu-io/open-design | open-design.md |
| https://github.com/VoltAgent/awesome-design-md | voltagent-design-md.md |
| https://github.com/google-labs-code/design.md | DESIGN.md YAML spec |
| https://github.com/tailwindlabs/tailwindcss | tailwind-thinking-for-rn.md |

## Phase 4 — Create docs/SMITE2_DESIGN.md

Voltagent 9-section DESIGN.md for **Smite 2 companion** (not Willow):

- YAML tokens: cyan shell `#7dd3fc`, card `rgba(8,12,22,0.98)`, panels `#0b1220` / `#1e3a5f` (from GOALS.md)
- Components: nav in `app/index.jsx`, modals match `kitAbilityTooltipCard`
- Do's/Don'ts: no warm gold frames unless user asks; Supabase fallbacks
- Reference `GOALS.md` UI consistency section

## Phase 5 — Dev boards (create if missing)

- `BUGS.md` — open bugs (bootstrap may have created; merge)
- `TASKS.md` — Pending/Completed + `#dev` tags for Kanban
- `decisions-log.md` in Vault — ADRs (local)

## Phase 6 — Vault layout (after bootstrap)

```
Vault/
├── START_HERE.md, Dashboard.md, Color legend.md
├── Code/App, Code/Lib, Code/Data, Code/Hooks
├── Kanban/ (Dev tasks, Bugs — from TASKS/BUGS)
├── 3-Resources/Council/     ← council vault sync
├── 3-Resources/Cursor agents/  ← skills mirror
├── _repo/ → junctions to app/, lib/, scripts/, docs/
└── .obsidian/snippets/ vault-colors, vault-3d, cursor-agents-vault
```

Add to `.gitignore`:
```
Vault/
docs/council/council.paths.json
```

## Phase 7 — Sync scripts

Ensure target has (bootstrap copies most):
- `scripts/sync-vault-index.mjs` (template — customize codeAreas from vault.config.json)
- `scripts/cursor-agent-vault-sync.mjs`
- `scripts/council-vault-sync.mjs`
- `scripts/council*.mjs`, `council-chair-wake.mjs`

Run:
```powershell
cd C:\Users\Carri\Documents\smite2app
npm run vault:sync
```

## Phase 8 — Obsidian (user, one-time)

1. Open folder: `smite2app/Vault`
2. **Settings → Appearance → CSS snippets** → ON: `vault-colors`, `cursor-agents-vault`, `vault-3d` (optional)
3. Enable plugins per `Vault/PLUGINS.md` (Dataview off inline if node_modules linked)

## Phase 9 — Council (optional)

```powershell
npm run council:ui
```

Pin Chair chat (see `docs/council/CHAIR_SETUP.md`). Panel **Send** auto-opens Cursor with `@council.mdc go` when `panelAutoWakeChair: true`.

Adapt council RAG in `docs/council/council.config.json`:
```json
"ragPaths": ["../../GOALS.md", "../../BUGS.md", "../../TASKS.md", "../../docs/SMITE2_DESIGN.md", "identities", "COUNCIL_SYSTEM.md", "sessions"]
```

Replace `identities/_shared-willow-lens.md` with `_shared-smite-lens.md` (companion app, builds, Prophecy, patch hub — not fitness).

## Phase 10 — Verify

- [ ] `npm run vault:sync` → Cursor agents + Council in Vault
- [ ] Obsidian teal/purple/cyan folder dots
- [ ] New agent session reads `agent-knowledge.mdc` + `00 Read first`
- [ ] `npx tsc --noEmit` or `expo start` still works (no broken imports from bootstrap)
- [ ] GOALS.md and package.json retain all pre-bootstrap content

## Do not

- Clone Tailwind, Open Design daemon, or 73 Voltagent brand files
- Overwrite smite2app GOALS or expo scripts without merging
- Commit `Vault/` to git
```

---

## Quick command (Smite 2 only)

From **WorkOutApp** root:

```powershell
npm run bootstrap:project -- --target "C:\Users\Carri\Documents\smite2app" --name "Smite 2 Companion" --stack generic --fresh-council
```

Then open **smite2app** in Cursor and paste the prompt block above for the merge/adapt pass.

---

## What WorkOutApp already ships

| Asset | Path |
|-------|------|
| Bootstrap script | `templates/project-starter/bootstrap.mjs` |
| Manifest (copy list) | `templates/project-starter/manifest.json` |
| Expo vault config template | `templates/project-starter/vault.config.expo-smite2.template.json` |
| Full bootstrap docs | `docs/PROJECT_BOOTSTRAP.md` |
| Cursor skills (source) | `docs/cursor-agents/` |
| Council | `docs/council/` |
| Agent rules | `.cursor/rules/agent-knowledge.mdc`, `plan.mdc`, `agent-workflow.mdc`, … |

---

## Smite 2 ↔ WorkOutApp mapping

| WorkOutApp | Smite 2 companion |
|------------|-------------------|
| `docs/WILLOW_DESIGN.md` | `docs/SMITE2_DESIGN.md` |
| `src/shared/theme/tokens.ts` | `GOALS.md` UI tokens + `app/data.jsx` tooltip styles |
| `src/features/` | `app/` routes + `lib/` |
| Willow / Nala coach | Smite 2 builds, Patch Hub, Prophecy TCG |
| `#workout-app` tag | `#smite2app` tag in vault notes |
| `workout-app.mdc` | `smite2app-project.mdc` (keep + cross-link) |

---

## After porting both projects

Each repo has its **own** `Vault/` (gitignored). Obsidian can use **two vaults** or a parent folder — recommend **separate vault roots** (`WorkOutApp/Vault`, `smite2app/Vault`) to avoid Kanban/council cross-talk.

Council panels: use **different ports** if both run (change `3939` in one project's `council-ui-server.mjs` or run one at a time).
