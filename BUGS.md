# Smite 2 Companion — Known Bugs

Check before new features. Fix open bugs first.

## Open

- [ ] _Add bugs here_

## Investigating

## Fixed

- **Builds ability tooltip pantheon color** (2026-06-16): Wrong border (default cyan) on sorted/filtered build cards — `godIndex` pointed at the wrong `pairs` row; tooltip now stores the `god` reference and uses `getGodPantheon()` for border color (matches Database god page, e.g. Ah Puch Mayan green).
