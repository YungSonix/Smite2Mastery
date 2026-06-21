# Cursor agents — repo source

Git-tracked knowledge for Cursor agents. **Vault mirror:** `Vault/3-Resources/Cursor agents/` (local Obsidian, gitignored).

## Port to another project (Smite 2, Unity, etc.)

See **[PORT-NEW-PROJECT-MASTER-PROMPT.md](./PORT-NEW-PROJECT-MASTER-PROMPT.md)** — copy-paste agent prompt + bootstrap commands.

Quick bootstrap from WorkOutApp:

```bash
npm run bootstrap:project -- --target "C:\Users\Carri\Documents\smite2app" --name "Smite 2 Companion" --fresh-council
```

Then paste the master prompt in smite2app Cursor for merge/adapt (GOALS + package.json must be merged, not overwritten).

## Sync

```bash
npm run vault:sync
```

Copies skills, index, `SMITE2_DESIGN.md` → vault, scaffolds `research/` and `sessions/`, installs Obsidian color snippet.

## Edit workflow

1. Change files here or `docs/SMITE2_DESIGN.md`
2. Run `npm run vault:sync`
3. Vault updates; `context-snapshot.md` and user notes in `research/` / `sessions/` are preserved

## Obsidian colors

Enable snippet: **Settings → Appearance → CSS snippets → cursor-agents-vault** (written by sync to `Vault/.obsidian/snippets/`).

## Vault START_HERE

Add to layout table if missing:

`| [[3-Resources/Cursor agents/Cursor agents Index]] | Agent knowledge — Karpathy, design tokens, DESIGN.md |`
