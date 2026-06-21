---
tags: [cursor-agent, ui, smite2app]
vault-zone: cursor-agent
---

# Reuse UI patterns (mandatory before new chrome)

When the user asks for a **dropdown, modal, tooltip, sheet, chip grid, collapsible section, or similar UI**, do **not** invent styles from scratch. The app should feel like one product, not unrelated one-offs per screen.

## Workflow (every time)

1. **Name the pattern** — e.g. "dropdown", "ability tooltip", "filter menu", "collapsible section".
2. **Search the whole repo** — grep/semantic search for existing implementations:
   - `dropdown`, `pantheonDropdown`, `KitAbilityTooltip`, `modalSection`, `kitAbilityTooltipCard`, `selectShell`, etc.
3. **Check the registry** — `docs/SMITE2_DESIGN.md` § Pattern registry + `GOALS.md` → UI consistency.
4. **Reuse or extend** — import shared styles/helpers from `lib/` when they exist; otherwise copy tokens from the closest reference screen and **extract** to `lib/` if the pattern will appear again.
5. **Wire cross-page behavior** — if the same feature exists on two pages (e.g. ability tooltips on Database vs Builds), use the **same component** and the **same data helpers** (`getGodPantheon`, `getPantheonBorderColor`, shared modal).

## Shared modules (prefer these)

| Pattern | Shared module | Reference screen |
|---------|---------------|------------------|
| Dropdown / inline select | `lib/uiDropdownStyles.js` | `app/data.jsx` filter menus, `lib/SkinShowcasePanel.jsx` |
| Ability tooltip | `lib/KitAbilityTooltipModal.jsx` + `lib/kitAbilityTooltip.js` | Database kit (`app/data.jsx`), Builds (`app/index.jsx`) |
| Tooltip / modal tokens | `kitAbilityTooltipCard` styles in `app/data.jsx` | All floating chrome |
| God pantheon (border/color) | `getGodPantheon` in `lib/normalizeBuildsGod.js`, `getPantheonBorderColor` in `app/localIcons.js` | Database god header, Builds cards + tooltips |
| Collapsible section | `modalSection` + `skinsHeader` in `app/data.jsx` | Database god detail sections |

## Anti-patterns

- New dropdown with its own hex palette when `uiDropdownStyles` or `pantheonDropdown` already exists.
- Duplicate tooltip markup on a second page instead of extending the shared modal.
- Resolving pantheon only from `god.pantheon` when API rows nest it under `baseInformation.pantheon`.
- Storing list indices from **filtered/sorted copies** of arrays and using them to look up the **original** array (Builds ability tooltip bug).

## When extracting is worth it

Extract to `lib/` when:

- The user is adding the **second** instance of a pattern, or
- You are touching an existing duplicate and can consolidate in the same pass.

After extracting, add one line to `docs/SMITE2_DESIGN.md` pattern registry.

## Agent checklist (short)

- [ ] Grep project for existing pattern
- [ ] Read reference implementation styles
- [ ] Reuse shared `lib/` module or match its tokens exactly
- [ ] Same component on both pages when behavior should match
- [ ] Update registry if you add a new shared module
