---
tags: [cursor-agent, karpathy, smite2app]
vault-zone: cursor-agent
source_repo: multica-ai/andrej-karpathy-skills
source_url: https://github.com/multica-ai/andrej-karpathy-skills
license: MIT
last_reviewed: 2026-06-06
---

# Karpathy guidelines — agent coding discipline

Distilled from [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills). Behavioral rules to reduce common LLM coding mistakes.

## Upstream summary

- **Think before coding** — restate goal, constraints, and success criteria; do not jump to files
- **Simplicity first** — smallest change that works; resist drive-by refactors
- **Surgical changes** — touch only what the task requires; match surrounding style
- **Goal-driven execution** — every edit traces to the user’s request
- **Surface assumptions** — if intent is unclear, state your interpretation before coding
- **Verifiable success** — know how you will check (tsc, manual flow, existing patterns)
- **No magic** — understand what a library call does before using it
- **Build to understand** — minimal working version before abstractions (third use → extract)

## Smite 2 application

| Principle | In this repo |
|-----------|--------------|
| Surgical | One feature per task; no folder restructures without approval |
| Minimal | Prefer 5-line fix over 100-line refactor |
| Match conventions | Routes in `app/`; shared code in `lib/`; read surrounding file first |
| Verify | Manual flow on affected tab; grep before new modals |
| Nav changes | Update `app/index.jsx` nav + sub-nav together |
| Dead code | Grep old routes/exports after renames |

## Quick checklist (before every edit)

1. What is the user actually asking for?
2. What files are involved — have I read them?
3. Is there an existing pattern to reuse? (grep `kitAbilityTooltipCard`, modals in `app/`)
4. Can I do this in fewer lines?
5. What must not break? (Supabase fallbacks, builds.json shape)

## Do not

- Refactor unrelated code “while you’re here”
- Install npm packages without user approval
- Trust abstractions you have not traced in this codebase
- Guess on ambiguous requirements — ask one clarifying question

## Related

- [[00 Read first]]
- [[smite2app-architecture]]
- Repo: `.cursor/rules/agent-knowledge.mdc`
