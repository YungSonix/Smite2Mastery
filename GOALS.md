# Project goals and progress

Track goals and progress **in this file** (not in the app). The agent should read this before working and update it when tasks are done or in progress.

---

## How to use

- **You (human)**: Add or edit goals under "Current goals" below. Use `- [ ]` for todo, `- [x]` for done.
- **Agent**: When you start a task, **always read `.cursor/rules/smite2app-project.mdc` first, then this file (`GOALS.md`)**. When you finish (or make progress), update the checkboxes and the "Recent progress" section so nothing is forgotten. The agent may also **add or refine goals/subgoals** based on new work you request. **Recent progress**: Log only **major** releases/features (e.g. new screens, big refactors, new systems). For minor bugs or small tweaks, add one short line at most; don’t go into depth.

---

## Current goals

- [x] Update Shop UI
- [ ] Update overall Cleanliness
- [ ] Work on Conquest Map
- [ ] Work on a Guide System
- [x] Add Prophecy card battle minigame (More → Minigames)
- [ ] Improve Currency system
- [ ] Work on Build Improvements
- [ ] Reorganize Files
  - [x] Move conquest map HTML from `data/` into `lib/`
  - [x] Move Supabase SQL files into `supabase/` folder
  - [ ] Normalize patch notes folder naming and references
  - [ ] Review remaining root-level files and scripts for structure
- [ ] Clean up Code
---

## Suggested / generated goals

*(These are ideas the agent can turn into concrete tasks when you ask, or you can edit them directly.)*

- **Quality & stability**
  - [ ] Add basic automated checks (e.g. `npm run verify-icons`, `scripts/validate-builds.js`) to a CONTRIBUTING.md checklist.
  - [ ] Add simple in-app “changelog / what’s new” section driven by patch notes data.
- **UX & navigation**
  - [ ] Improve mobile navigation for small screens (tune spacing, font sizes using `useScreenDimensions`).
  - [ ] Add a quick “Jump to God” search on the Builds and Data pages.
- **Guides & learning**
  - [ ] Create a simple in-app “New player guide” page that links gods, items, and roles.
  - [ ] Surface recommended starter builds per role on the Home page.
- **Data & tooling**
  - [ ] Add a script to validate that every god in `Smite2Gods.json` has at least one entry in `app/data/builds.json`.
  - [ ] Add a script or check to ensure all local icon paths used in `app/` exist in the repo (items, pantheons, roles, wallpapers).

## Recent progress

*(Agent: log only **major** features/releases here; for minor bugs or small tweaks, one short line at most.)*

- **File reorg**: Conquest map → `lib/conquestMapHtml.js`; SQL → `supabase/`. Role icons centralized in `localIcons.js`.
- **Shop**: Refreshed UI (myth-themed header, cosmetic stats, card styling).
- **Smite Wars (Prophecy)**: Full minigame added (More → Minigames): leaders, gods, items, traps, deck builder (30 cards, 6 slots, share codes), collection + pack shop, Tutorial/Story Mode, class-keyword combat, per-unit abilities, status effects, VOX/audio. Promoted to full-screen mode; background music via GitHub MP3; Collection Leaders tab; item names/icons aligned with `builds.json`. Minor fixes: icon fallback, exit buttons when browsing.
- **Smite Wars account system**: Added Supabase-backed auth/session flow (sign in/sign up), profile tab, starter-pack RPC integration, DB-backed collection/decks/purchases sync, and SQL migration tied to `user_data` plus `user_cards`, `decks`, `pack_purchases` with RLS and secure `is_dev` handling.
- **Smite Wars account system update**: Removed email auth flow from Prophecy; now links directly to existing Profile username accounts and `user_data`.
- Minor Prophecy UX: top nav condensed to single-line pills (`Play`, `Story`, `Collection`, `Profile`, `Store`, `Exit`) and Tutorial moved to Home button.
- Minor Prophecy UX: slightly increased top nav pill button size for improved tap readability.
- Minor Prophecy UX: leader selection details now use a cleaner tap modal instead of inline tooltip boxes under cards.
- Minor Prophecy performance/UX: collection now renders with virtualized lists (batch loading), and leader icon tooltip opens as a centered modal card.
- Minor Prophecy UX: leader details popup now includes the selected leader icon in the header.
- Minor Prophecy UX: added interactive card inspect viewer (drag-to-tilt/rotate) for collection and pack cards.
- Minor Prophecy web fix: resolved `startTutorialBattle` initialization crash and tuned inspect drag + card width in viewer.
- Minor Prophecy web fix: resolved `unlockMusic` initialization-order crash by moving effect below callback definition.
- Minor Prophecy UX: inspect viewer now supports full horizontal 360 spin with persistent yaw between drags.
- Minor Prophecy UX: inspect spin now snaps back to stable front/back face states and supports a two-sided card (blank back).
- Minor Prophecy web UX: inspect front/back visibility now uses explicit angle-based face switching for reliable back-side rendering.
- Minor Prophecy UX: styled card back with Smite-themed framing and project logo for inspect mode.
- Minor Prophecy UX: fixed mirrored back text and added pantheon-based themed card-back variants (Olympian/Underworld/Asgardian accents).
- Minor Prophecy collectibles: added pantheon visual profiles + rarity-based foil/style rolls (Divine Foil through Prismatic) with pack reveal cues and cosmetic card metadata.
- Minor Prophecy collectibles: retuned Smite-themed foil naming/effects, added Collection foil filter, removed Mythic rarity from active card pools/UI, and fixed Legendary card borders.
- Minor Prophecy collectibles/UX: simplified card finish text, fixed foil display/fallback rendering, added multi-layer finish handling, and enabled skin-variant pulls (GitHub wallpaper/skin sources) for extra cosmetic variety.
- Minor Prophecy collectibles/inspect: generated true Alternative Cards from god skins (including dev full ownership), fixed inspect close overlap, and normalized full-art/legendary borders for cleaner display.
- Minor Prophecy inspect fix: while dragging/rotating, force front-face render and only resolve face flip on release to stop moving-time overlay/flicker artifacts.
- Minor Prophecy collection/inspect polish: added explicit Alternative Cards filter (Alternative/Base), and removed inspect-time finish/variant text block to eliminate moving overlay artifacts.
- Minor Prophecy variety expansion: renamed Foil filter to Variant (including card-class variants), generated one Alternative Card per god, and added foil-card counterparts for all cards to greatly expand pull/collection variety.
- Minor Prophecy tooling: added a generator script to build `lib/godAbilities.ts` from `app/data/builds.json` with trap-vs-ability card mapping.
- Minor Prophecy alternatives: improved skin variant naming to use clean "Skin + God" labels (from skin metadata/path), and only generate dedicated alternative cards when a real non-base skin exists.
- Minor Prophecy alternatives fix: flattened nested `builds.json` god data for skin lookup so alternative cards generate again (52 gods with non-base skins), and added base-god art fallback so alt cards still resolve correct wallpaper/icon.
- Minor Prophecy skin curation: blocked glitched `Mercury_010.webp` from alternative-card and skin-roll pools.
- Minor Prophecy visuals: upgraded foil card treatment with stronger tier-based glow/tint/reflective overlays so foil variants are visibly distinct from base cards.
- Minor Prophecy system: added class-based ability pools, per-god `keyword`/`abilityId`/`ultimateId` assignment metadata, and pooled ability text rendering in card showcase/ability action UI.
- Minor Prophecy card pools: added centralized `TRAP_CARDS` + `SPELL_CARDS` pools and wired `PROPHECY_TRAP_CARDS`/`PROPHECY_SPELL_CARDS` to reference pool IDs as single-source card definitions.
- Minor Prophecy icons: spell/trap cards now resolve God Info ability icons from `iconSource` (`God_AbilityToken`) with slot mapping to One/Two/Three/Four/Passive and item-icon fallback.
- Minor Prophecy schema cleanup: standardized pool text to `description` (replacing `effect`) and explicitly mapped trap/spell card `description` fields in `prophecyData` for consistent renderer lookups.
- Minor Prophecy collection filter: added `Spell` to card Type filter options so spells can be isolated in Collection view.
- Minor Prophecy visibility fix: included `PROPHECY_SPELL_CARDS` in in-app starter pool and shop rotation so spells (e.g. Detonate) appear in Collection/store flows.
- Minor Prophecy renderer binding: non-god showcase text now prioritizes `card.description`, and flavor text now falls back to `description`, aligning UI with the new pool schema.
- Minor Prophecy audio fix: restored reliable leader/god select VOX by adding select-category filename fallbacks and intro fallback when a select clip is unavailable.
- Minor Prophecy audio replay fix: VOX now force-restarts on each click (clears active voice player/subscription before play), so repeated taps replay consistently.
- Minor Prophecy leader-select audio polish: leader pick now uses select-only VOX pre-confirm, confirmation avoids duplicate intro trigger, and a short anti-doubletap guard prevents accidental stacked playback.
- Minor Prophecy VOX throttle polish: added per-god/category cooldown + non-repeating filename selection so repeated same-god clicks feel less spammy while switching gods still plays instantly.
- Minor Prophecy art fix: normalized foil card names during art lookup (strip `[Foil]`) so god wallpaper/icon resolution works again.
- Minor Prophecy foil polish: moved foil effects above card art and boosted outer glow/shimmer intensity so foil cards read as clearly distinct.
- Minor Prophecy foil/inspect polish: added animated shimmer + pulse halo for foil cards and upgraded inspect modal lighting/background for stronger click-through impact.
- Minor Prophecy foil tuning: switched to a more obvious diagonal sweep line and rebalanced foil palette toward Smite-themed gold + divine blue accents.
- Minor Prophecy foil refinement: simplified effects to one slower diagonal "/" sheen with reduced extra animation noise and cleaner Smite-themed color balance.
- Minor Prophecy foil reset: removed foil shimmer animation system to keep effects static for now (clean baseline to revisit later).
- Minor Prophecy VOX responsiveness: removed select-category cooldown/randomization delays so first god-tap plays `Select` audio immediately.
- Minor Prophecy account/ownership update: added in-screen sign in/out flow (Profile-compatible credentials) and updated dev ownership mapping to include duplicate card counts instead of flattening to single copies.
- Minor Prophecy account preview: added account-type badge plus dev-only "Dev View / Standard View" ownership toggle to preview normal-account card counts directly in Prophecy.
- Minor Prophecy account UX: made ownership-view controls always visible in Profile with explicit dev/standard note and disabled-state messaging when not marked dev.
- Minor Prophecy tooling: improved `scripts/check-voice-audio.js` to report missing `Skin00_Base`, missing `Skin00_Base/VOX`, and missing baseline VOX files as separate audit sections.
- Minor Prophecy nav polish: swapped leader-select actions so top-right `Exit Game` fully exits, while the lower button returns to Prophecy home as `Back to Home`.
- Minor Prophecy UI polish: styled leader-select top-right `Exit Game` as a colored warning button for clearer exit intent.
- Minor Prophecy VOX tooling: added `scripts/sync-alt-skin-voice.js` and bulk-copied base VOX lines into alternative skin VOX folders (with missing-VOX folder auto-create).
- Minor Prophecy animation cleanup: removed battle card pop scaling and disabled inspect-card drag/tilt spin so card previews remain static.
- Minor Prophecy visual tweak: restored card inspect/attack motion behavior and removed the diagonal foil sweep slash overlay from card art/inspect highlights.
- Minor Prophecy cleanup: removed now-unused foil sweep style definitions from `app/prophecy.jsx`.
- Minor Prophecy battle UX: improved small-screen hand fit/layout and added combat feedback (attack lunge, deploy pop-in, hit flash, floating damage/defeat text).
- Minor Prophecy battle update: added front/back row placement flow, in-battle card inspect affordances, played-card mini preview, clearer item/god/trap/spell rules, and HP/layout alignment polish.
- Minor Prophecy board pass: switched to fixed dashed slot zones with 4 god front-row slots + 4 spell/trap back-row slots and auto placement by card type.
- Minor Prophecy board polish: reduced board card size, centered play reveal, removed flaky inspect icon taps, and made hold-to-inspect show a slot-aware tooltip + card view.
- Minor Prophecy board polish: unified enemy/allied row labels, compressed spell/trap row slots for better full-board visibility, and made hold-inspect trigger full-card center preview + tooltip.
- Minor Prophecy trap UX: set traps now render face-down in Spell/Trap row and reveal with a center preview only when activated.
- Minor Prophecy battle polish: added tapable info buttons, widened cards, matched ally/enemy leader bars, compacted center info with class dots + log icon, and improved mana/deck readability.
- Minor builds tooling: `.scripts/update-builds.js` now normalizes API `build`/`builds` payloads and maps new relic/ability-order fields into `builds.json`.
- Minor Prophecy mobile tuning: shrank board mapping/row footprint, restored compact leader icon+HP badge look, and added item-card target selection on allied gods.
