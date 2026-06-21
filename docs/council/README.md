# AI Council (Cursor-native)

**Nala**, **London**, and **Fasa** — three models, three personalities, one **Final Verdict**. Willow's outsider instinct is woven into all three (no fourth seat).

Full system prompt: **`COUNCIL_SYSTEM.md`**

## Billing: Cursor only (default)

| Mode | API keys | Who pays |
|------|----------|----------|
| **In Cursor chat** | None | **Cursor subscription** — Task subagents with per-member `model` |
| Standalone Node + OpenAI/Anthropic | Your keys | Those providers |
| Cursor Agent SDK | Cursor API token | Cloud agent usage |

## Quick start (chat panel + Chair)

1. **`npm run council:ui`** → open **http://localhost:3939**
2. One-time **Chair** setup → **`CHAIR_SETUP.md`**
3. Type topic in panel → **Send** → in Chair chat type **`go`**
4. Bubbles appear in the panel (NALA / LONDON / FASA / FINAL VERDICT)

## Members

| Member | Role | Default model |
|--------|------|---------------|
| **Nala** | Contrarian — highest authority in Final Verdict | auto |
| **London** | First principles — defines terms, rebuilds logic | Claude Sonnet |
| **Fasa** | Expansionist — systems, futures, scale | GPT Codex |

Each reply includes a Willow-style outsider question (jargon cut, "dumb" question, obvious truth).

## Change a member's model

```bash
npm run council:config -- nala model claude-4.6-sonnet-medium-thinking
npm run council:config -- fasa model auto
npm run council:config -- show
```

## Output format

Chair posts:

```
---
NALA …
LONDON …
FASA …
---
FINAL VERDICT …
---
```

See `COUNCIL_SYSTEM.md` for a sample round.

## Files

| Path | Role |
|------|------|
| `COUNCIL_SYSTEM.md` | Personalities + format + sample |
| `council.config.json` | Members, models |
| `identities/*.md` | Per-member voice + `_shared-smite-lens.md` + `_shared-stress-test.md` |
| `sessions/*.json` | Transcripts |
| `.cursor/rules/council.mdc` | Agent orchestration |
