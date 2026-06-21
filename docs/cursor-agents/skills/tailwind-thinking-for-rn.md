---
tags: [cursor-agent, tailwind, design-system, workout-app]
vault-zone: cursor-agent
source_repo: tailwindlabs/tailwindcss
source_url: https://github.com/tailwindlabs/tailwindcss
license: MIT
last_reviewed: 2026-06-06
---

# Tailwind thinking for React Native

**We do not use Tailwind in Willow.** Mental models from [tailwindlabs/tailwindcss](https://github.com/tailwindlabs/tailwindcss) mapped to React Native + `tokens.ts`.

## Upstream summary

- **Utility-first** — compose small style primitives at call site instead of one-off CSS files
- **Theme as config** — colors, spacing, radii live in one source (`tailwind.config` → our `tokens.ts`)
- **No arbitrary values by default** — extend theme before using one-off magic numbers
- **JIT / purge** — only generate what you use → only add tokens/components you actually need
- **Plugins** — repeated utility groups become shared abstractions (`@layer components` → `@shared/components/ui`)
- **Dark mode** — single coherent palette (Willow: dark green shell, not `media` vs `class` split)

## RN mapping

| Tailwind concept | Willow pattern |
|------------------|------------------|
| `theme.extend.colors` | Add key to `colors` in `tokens.ts` |
| `p-4`, `gap-2` | `spacing.md`, `spacing.xs` |
| `rounded-lg` | `radius.md` |
| `class="flex gap-2 ..."` | `StyleSheet.create` + `[styles.row, { gap: spacing.sm }]` |
| `@apply` / component class | `PrimaryButton`, `Card`, shared styles |
| Arbitrary `[#abc]` | **Forbidden** for chrome — named token only |
| Plugin | New export in `@shared/components/ui` |

## Composition example

```tsx
// Utility-style composition (preferred for one-off layout)
<View style={[styles.card, { padding: spacing.md, gap: spacing.sm }]}>

// Repeated 3+ times → extract to shared component or styles module
```

## Willow application

- Grep existing `StyleSheet` patterns in the feature folder before inventing layout
- Use `spacing.*` / `radius.*` — not raw `8`, `12`, `16` unless matching an existing local convention
- Tab bar / header chrome: search `tabBar`, `headerStyle` and unify

## Do not

- Add `nativewind` or Tailwind without explicit user approval
- Scatter inline hex colors “just once”
- Create a 200-line StyleSheet when `Card` + `spacing` suffices

## Related

- [[open-design]]
- [[willow-design]]
- `docs/UI_UX.md` principle 14 (consistent grid gaps)
