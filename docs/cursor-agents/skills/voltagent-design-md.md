---
tags: [cursor-agent, voltagent, design-system, workout-app]
vault-zone: cursor-agent
source_repo: VoltAgent/awesome-design-md
source_url: https://github.com/VoltAgent/awesome-design-md
license: MIT
last_reviewed: 2026-06-06
---

# Voltagent DESIGN.md — spec structure for agents

Distilled from [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) and [google-labs-code/design.md](https://github.com/google-labs-code/design.md). Willow’s instance is **`docs/WILLOW_DESIGN.md`** — do not copy Stripe/Linear/other brand files.

## Upstream summary

- **DESIGN.md** = machine-readable tokens (YAML front matter) + human prose (markdown sections)
- Agents read DESIGN.md **before** generating UI — prevents generic-looking output
- Canonical **9 sections** (order matters for agent parsing):
  1. Visual Theme & Atmosphere
  2. Color Palette & Roles
  3. Typography
  4. Component Stylings
  5. Layout Principles
  6. Depth & Elevation
  7. Do's and Don'ts
  8. Responsive Behavior
  9. Agent Prompt Guide
- Section 7 (Do/Don't) is as important as tokens — negative constraints reduce drift
- Awesome-design-md collection = reference patterns; **Willow file is authoritative** for this app

## Willow application

| Artifact | Path |
|----------|------|
| Canonical DESIGN.md | `docs/WILLOW_DESIGN.md` |
| Vault mirror | `Vault/3-Resources/Cursor agents/skills/willow-design.md` |
| Detailed UX | `docs/UI_UX.md` |
| Live tokens | `src/shared/theme/tokens.ts` |

**When adding a new component style:**

1. Update `WILLOW_DESIGN.md` §4 if it becomes a shared pattern
2. Add token in `tokens.ts` if new color/spacing role
3. Implement in `@shared/components/ui` when reused 3×

## Writing agent-ready specs

Use this skeleton for **feature-specific** design notes in `Vault/Code/Features/`:

```markdown
## Overview
## States (default, pressed, disabled, empty)
## Props / API
## Accessibility
## Examples (link to screen files)
## Do not
```

## Do not

- Drop a foreign DESIGN.md (Vercel, Stripe, etc.) into the repo as Willow’s system
- Grow one DESIGN.md forever without syncing YAML tokens back to `tokens.ts`
- Skip §7 Do/Don't when documenting new flows

## Related

- [[willow-design]]
- [[open-design]]
- [[sources]]
