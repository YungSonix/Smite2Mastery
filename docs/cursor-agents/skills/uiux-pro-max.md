---
tags: [cursor-agent, smite2app, design]
vault-zone: cursor-agent
last_reviewed: 2026-06-10
upstream: https://github.com/yuanfu8899/uiuxskillProMax
---

# UI/UX Pro Max (reference library)

Distilled from [yuanfu8899/uiuxskillProMax](https://github.com/yuanfu8899/uiuxskillProMax) — static reference generated from [UI/UX Pro Max Skill](https://ui-ux-pro-max-skill.nextlevelbuilder.io/). **Not** a replacement for [[smite2-design]] / `docs/SMITE2_DESIGN.md`.

## Local mirror (imported)

Refresh: `npm run skills:import`

| File | Content |
|------|---------|
| [[uiux-pro-max/styles-index]] | 58 styles — category, best for, avoid |
| [[uiux-pro-max/palettes-index]] | 96 palettes — hex by product type |

Live previews: [styles](https://yuanfu8899.github.io/uiuxskillProMax/uiuxpro_styles.html) · [colors](https://yuanfu8899.github.io/uiuxskillProMax/uiuxpro_colors.html) · [icons](https://yuanfu8899.github.io/uiuxskillProMax/uiuxpro_icons.html)

## When to use in smite2app

1. **Exploring** a new surface the user explicitly wants to look different (e.g. Prophecy card frame, shop hero).
2. **Picking a palette direction** before proposing tokens — then map into RN (`rgba`, `#7dd3fc` family) per `kitAbilityTooltipCard`.
3. **Stress-testing** a UI idea — pair with [[stress-test]]; "glassmorphism" is not automatically better for a data-dense builds browser.

## When NOT to use

- Routine modals, tooltips, database pages — use `app/data.jsx` tokens and [[open-design]].
- Replacing the cyan dark shell without user request.

## Workflow

1. User names product type + screen (e.g. "shop paywall", "tier list").
2. Skim 2–3 relevant styles from the style library; note **anti-patterns** for that context.
3. If proposing new colors, pick one palette and translate hex → RN theme; document in `GOALS.md` UI section if diverging.
4. Implement with existing patterns (`grep` modals in `app/` first).

## Local clone (optional)

```bash
git clone https://github.com/yuanfu8899/uiuxskillProMax.git
# open uiuxpro_styles.html in browser or Live Server
```
