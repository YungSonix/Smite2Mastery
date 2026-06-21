---
id: 2026-06-16-how-can-i-make-the-viewing-better-for-the-skins-preview-i-wa
topic: "how can i make the viewing better for the skins preview i was thinking of making it like a dropdown view instead of all the skin names under the card art - the first one being shown is base skin and you click that container and itll show all other skin options - i still want to show off the splash art - icon and ingame previww"
status: complete
created: 2026-06-16T18:31:15.340Z
completed: 2026-06-17T15:13:47.043Z
tags: [council, session]
---
# Council — how can i make the viewing better for the skins preview i was thinking of making it like a dropdown view instead of all the skin names under the card art - the first one being shown is base skin and you click that container and itll show all other skin options - i still want to show off the splash art - icon and ingame previww
**Session:** `2026-06-16-how-can-i-make-the-viewing-better-for-the-skins-preview-i-wa` · **Status:** complete
## Round 1

### NALA · R1

You're assuming the horizontal strip is the clutter — but a dropdown hides skins behind a tap, which is worse for discovery.

### LONDON · R1

Define better viewing: maximum splash height, skin switch still one tap. A collapsible row — base skin + chevron, expands to icon grid — keeps Splash/Loadout untouched.

### FASA · R1

A compact skin selector chip unlocks the same pattern on Builds cards and Shop cosmetics later — collapsed shows base + count, expanded is thumb grid with prism variants inline.

## Round 2

### NALA · R2

@London's collapsible row beats a blind dropdown — but collapsed state must show skin count or @Fasa's reuse pattern dies on first tap. I'll accept tucking the picker if splash art stays the tallest thing on screen.

### LONDON · R2

@Nala's discovery worry is valid — collapsed row shows thumb, name, and +N badge, not a bare chevron. @Fasa's reuse only works if we extract one SkinSelectorRow component inside SkinShowcasePanel now.

### FASA · R2

@London nailed the component boundary: SkinSelectorRow collapsed/expanded, hero untouched. @Nala — badge solves discovery; ship collapsed on mobile, expanded on web at 640px where height is cheap.

## FINAL VERDICT

Ship collapsible SkinSelectorRow, not a blind dropdown. Collapsed: base thumb, name, +N badge. Expanded: icon grid with prism chips. Hero stays tallest. Extract in SkinShowcasePanel. Risk: weak badge kills discovery. TASK: Collapsible skin picker on Data god cards #ux #data

---
*Exported from Council Chamber — used for RAG memory.*
