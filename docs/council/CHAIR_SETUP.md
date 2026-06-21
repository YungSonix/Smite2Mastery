# Council Chair + chat panel (option 2)

The **chat panel** lives in your repo at `docs/council/ui/`. It looks like a messenger app. Cursor agent chat still runs the council — the panel queues topics and shows replies.
## One-time setup

### 1. Start the panel

```powershell
npm run council:ui
```

Open **http://localhost:3939** (bookmark it).  
In Cursor: `Ctrl+Shift+P` → **Simple Browser: Show** → paste URL.

### 2. Pin a Chair chat

New agent chat → pin tab → send **once**:

```text
@council.mdc You are my Council Chair.

When I send go (or >>go), check docs/council/ui/pending-convene.json.
If status is "new", run: npm run council:go — then convene **one member at a time** (nala → london → fasa, R1 then R2). Same live typing as chat-demo. When finished: npm run council:status -- pending

When I send >> <topic>, run council on that topic directly.

When I send ?nala / ?london / ?fasa + question, solo member mode.

Confirm ready in one sentence.
```

Optional: rename tab **Council**.

---

## Daily use (2 steps)

| Step | Where | Action |
|------|--------|--------|
| 1 | **Browser panel** | Type topic → **Send** (auto-opens Cursor with **`go`** — confirm if prompted) |
| 2 | **Browser panel** | Bubbles appear one at a time (NALA → LONDON → FASA) — live feed while typing |

**Manual fallback:** if auto-wake fails, type **`go`** in pinned Chair chat. Disable auto-wake: `panelAutoWakeChair: false` in `council.config.json`.

**Models:** click **Models** in the panel top-right → pick pills (auto-saves).

---

## What the panel does

| Feature | Behavior |
|---------|----------|
| Chat input | Queues topic + opens Cursor deeplink with `@council.mdc go` |
| Bubbles | Reads `docs/council/sessions/latest.json` after agent runs |
| Model pills | Saves to `state.json` + `council.config.json` |
| Polling | Updates transcript every 3 seconds |
| Auto-wake | `panelAutoWakeChair` in `council.config.json` (default **true**) |

The panel **does not** call AI itself. **Auto-wake** opens Chair with `go`; you may need **one Confirm** in Cursor. Chair agent then runs the council.

---

## Without the panel

In Chair chat only:

```text
>> Should we OTA skeleton loading to preview?
```

---

## Layout

```
┌─────────────────────────┬──────────────────┐
│  Browser: localhost:3939 │  Cursor: Chair   │
│  (topic + bubbles)       │  (type: go)      │
└─────────────────────────┴──────────────────┘
```

---

## Files

| File | Role |
|------|------|
| `docs/council/ui/index.html` | Chat UI |
| `docs/council/ui/pending-convene.json` | Queued topic for `go` |
| `docs/council/sessions/latest.json` | Transcript source for bubbles |

---

## Test verdict → TASKS extraction

Dry-run (no file writes — checks parsers only):

```powershell
npm run council:test-extract
```

Write extracted tasks (skips duplicates already in **Pending**):

```powershell
npm run council:test-extract -- --apply
npm run council:extract-verdict -- "Next convene: ship one Patch Hub fix."
```

After **`npm run council:decide`**, tasks auto-append when `autoExtractVerdictTasks` is true in `council.config.json`. Check **MOD LOG** bubbles in the panel and **TASKS.md** → **Pending**, then **`npm run vault:sync`** for Kanban.

Disable auto-extract for one decide: `npm run council:decide -- --no-extract`
