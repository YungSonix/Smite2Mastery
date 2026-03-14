# Project goals and progress

Track goals and progress **in this file** (not in the app). The agent should read this before working and update it when tasks are done or in progress.

---

## How to use

- **You (human)**: Add or edit goals under "Current goals" below. Use `- [ ]` for todo, `- [x]` for done.
- **Agent**: When you start a task, **always read `.cursor/rules/smite2app-project.mdc` first, then this file (`GOALS.md`)**. When you finish (or make progress), update the checkboxes and the "Recent progress" section so nothing is forgotten. The agent may also **add or refine goals/subgoals** based on new work you request.

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

*(Agent: append short notes here when you complete or partially complete something.)*

- Moved `data/_conquestMapHtml.js` → `lib/conquestMapHtml.js`; removed empty `data/` folder.
- Moved root SQL files into `supabase/` (add_profile_color_gradient, shop_gold_leaderboard, tracker_profile_url, update_contributor_build_rpc).
- Centralized role icons in `app/localIcons.js` (`ROLE_ICONS`, `getRoleIcon`); removed duplicate definitions from `index.jsx` and `data.jsx`.
- Fixed duplicate keys in `localIcons.js` GOD_ICON_BASE_OVERRIDES (ullr, merlin).
- Updated project rules: scripts folder, supabase/, lib/conquestMapHtml, localIcons role exports.
- Refreshed Shop UI in `app/shop.jsx` with a myth-themed header, cosmetic stats, and richer card styling.
- Added Prophecy card battle minigame: `lib/prophecyData.js` (leaders + units from Smite 2 gods), `app/prophecy.jsx` (start, leader select, battle, shop, game over), wired in More → Minigames with god icons via `getRemoteGodIconByName`.
- Refined `app/prophecy.jsx` for mobile: compact in-battle layout to avoid forced scrolling, Hearthstone-style quick rules structure, updated Smite 2 Prophecy branding, and cleaner mana-cost chips in hand cards.
- Expanded Prophecy gameplay rules in `app/prophecy.jsx`: added item/trap card types in hand/deck flow, graveyard tracking (`pGrave`/`eGrave`) with dead cards removed from board, leader-protection rule while defenders remain, and trap-triggered response to direct attacks.
- Tuned Prophecy battle UI for phone screens (`app/prophecy.jsx`): responsive card sizing/spacing based on screen size, simplified leader HP display (heart + numbers), and replaced item/trap emoji faces with real item icon assets from Smite2Mastery Item Icons.
- Added Prophecy VOX groundwork: installed `expo-av`, generated `lib/voxManifest.generated.js` from `app/data/Voice Audio`, added `lib/prophecyAudio.js` `playVOX(godName, category)`, wired attack/hit/intro/low-health/game-over triggers, and added `scripts/check-voice-audio.js` + `scripts/generate-vox-manifest.js` diagnostics/tooling.
- Fixed VOX bundling path generation: `scripts/generate-vox-manifest.js` now builds `source` paths directly from each file name (`./VoiceAudio/{God}/Skin00_Base/VOX/{File}`), regenerated `app/data/voxManifest.generated.js`, and resolved the `Ability_1.WAV` bad-path mismatch.
