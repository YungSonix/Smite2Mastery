---
tags: [cursor-agent, open-design, design-system, smite2app]
vault-zone: cursor-agent
source_repo: nexu-io/open-design
source_url: https://github.com/nexu-io/open-design
license: MIT
last_reviewed: 2026-06-06
---

# Open Design — token layers & component contracts

Distilled from [nexu-io/open-design](https://github.com/nexu-io/open-design) `design-systems/` schema. Smite 2 uses **inline StyleSheet tokens** in shared patterns (especially `kitAbilityTooltipCard`), not `tokens.css`, but the **layer discipline** is the same.

## Upstream summary

- Design system = **tokens + components + prose** — agents read all three
- Token layers are strict: identity → structure → essentials → semantic slots → brand extensions
- Components map to token groups — no hardcoded colors in component bodies
- `DESIGN.md` + compiled tokens are the two agent-consumable artifacts
- New visual patterns need a token or component entry first
- Accessibility: real contrast pairs; semantic names over raw hex in UI code

## Token layer mapping (Open Design → Smite 2)

| Layer | Open Design | Smite 2 |
|-------|-------------|---------|
| **A1-identity** | `--bg`, `--fg`, `--accent` | `#0b1220` shell, `#7dd3fc` accent |
| **A1-structure** | type scale, section spacing | padding in modal/tooltip styles |
| **A2** | fallback essentials | `#1e3a5f` borders, `rgba(8, 12, 22, 0.98)` cards |
| **B-slot** | semantic surfaces | panel `#0b1220`, muted text grays |
| **C-extension** | brand-specific optional | Prophecy card frames, shop rarities |

**Rule:** C-extension tokens stay in **domain UI** (Prophecy, shop rarities) — not generic chrome.

## Component contract

Before styling inline:

1. Grep `kitAbilityTooltipCard`, existing modals, and nav chrome in `app/`
2. If new shared pattern → third use triggers extract (agent-workflow §4)
3. Reference named values from `docs/SMITE2_DESIGN.md` / `GOALS.md` — avoid stray hex for chrome

## Smite 2 application

- Agent design spec: `docs/SMITE2_DESIGN.md`
- UX principles: `GOALS.md` → UI consistency
- Reference implementation: `kitAbilityTooltipCard` in `app/data.jsx`
- Propagate nav/sub-nav token changes in `app/index.jsx`

## Do not

- Invent unrelated palettes for Database/Builds/More chrome
- Copy another brand’s palette from Open Design catalog into Smite shell
- Mix Prophecy card art colors into generic modals

## Related

- [[smite2-design]]
- [[voltagent-design-md]]
- [[tailwind-thinking-for-rn]]
