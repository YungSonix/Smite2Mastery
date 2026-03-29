# Smite Wars — full tutorial & voice-over script

Use this document for **talent direction** and for **keeping UI copy in sync**. In-app sources:

- **Full Tutorial Guide** modal: Play home → **Full Tutorial Guide** (`FULL_TUTORIAL_SECTIONS` in `app/prophecy.jsx`).
- **Battle banners**: tutorial steps 1–4 (`TUTORIAL_BATTLE_HINTS` in `app/prophecy.jsx`).

Reward on first tutorial win: **+500 gold** and a **Tutorial Reward Pack** (shown on the victory screen).

---

## Direction (for the hire)

- **Tone**: warm narrator / minor oracle—mythic, slightly self-aware, never mean-spirited. Think “Hermes explaining the rulebook over ambrosia,” not a corporate tutorial bot.
- **Pacing**: clear pauses at each **[CUE — …]** so an editor can align audio to UI, or the actor can stop between blocks for one long file + post split.
- **One-pass option**: record **HUB** as a single continuous read (~2–3 min), then **BATTLE** as one take that leaves natural gaps after each cue (player needs time to tap). **OUTRO** can be stitched after the tutorial win screen appears.
- **Pronunciation**: “Smite Wars”; leaders **Athena**, **Hades**; game name **Smite Scroll** if you mention the parent app account.

---

## Part A — Hub & big picture (before or during first visit to Play home)

**[CUE — Player on Smite Wars hub, Play tab visible]**

Welcome, mortal. You’ve opened **Smite Wars**—where gods disagree loudly and hit points do the math.

Across the top you’ve got tabs: **Play**, **Story**, **Collection**, **Profile**, and **Store**. Think of them as temples: each one does something different, and yes, you’ll eventually visit all of them. No offering required—just attention span.

**[CUE — Optional: highlight Begin Battle]**

**Begin Battle** is your sandbox: pick any Leader and throw down in a real match. Fair warning—the other side also wants to win. Rude, I know.

**[CUE — How to Play]**

**How to Play** is the lightning-round rule sheet—phases, keywords, timers. If you’re the type who reads the back of a spell scroll, you’ll love it.

**[CUE — Full Tutorial Guide]**

**Full Tutorial Guide** is the long myth—the same story you’re hearing now, but you can scroll it at your own pace. I’m the audiobook edition.

**[CUE — Deck Builder]**

**Deck Builder** is where destiny gets deck-techy: **thirty cards**, six save slots, share codes so you can steal—uh, *borrow*—decks from friends. If your deck is illegal, the builder complains. Listen to it; it’s wiser than pride.

**[CUE — Tutorial button]**

Hit **Tutorial** when you’re ready to spar for real. You’ll play as **Athena**, because wisdom pairs nicely with “first day on the job.” Your opponent is **Hades**, because someone has to be dramatic about it.

Complete the tutorial once and the fates toss you **bonus gold** plus a **Tutorial Reward Pack**. Skip if you must—the underworld won’t judge… much.

---

## Part B — Battle tutorial (sync to on-screen steps 1–4)

**[CUE — Fade from intro; hand and board visible; banner shows Step 1]**

**Step one—put a god on the board.**  
Tap a unit from your hand. Mana pays the bill. If nothing happens, check the battle log: either you’re broke on mana, or the game is asking for a legal play. Even immortals can’t cheat the cost—trust me, I’ve asked.

**[CUE — Banner advances to Step 2 after you deploy]**

**Step two—leave Main phase like a responsible adult.**  
Press **End Phase** to enter **Battle**. Then tap one of *your* gods, then tap a **highlighted** enemy. Highlights aren’t decoration—they’re the “yes, you may hit this” list. Front row usually babysits the back row… unless someone brought **Backstab** or **Ranged** energy to the party.

**[CUE — Banner shows Step 3 after your first attack registers]**

**Step three—wisdom, then paperwork.**  
Back in **Main phase**, use your **class ability** on a friendly unit—Athena didn’t sharpen tactics for you to skip the free value. Then **End Phase**, then **End Turn**. One ability per god per turn, and there’s a timer, because eternity still hates slow play.

**[CUE — Banner shows Step 4 / finale text]**

**Step four—close the underworld branch office.**  
Win by dropping **Hades’ Leader health to zero**. Keep developing the board, swing in **Battle**, respect **Taunt** when it shows up, and remember: burn and poison tick at the end of rounds—if numbers move and nobody attacked, it’s probably status effects being petty.

**[CUE — Victory screen; tutorial reward line visible]**

Victory! You’ve earned **extra gold** and a **Tutorial Reward Pack**—open it in the flow the game gives you, then go haunt the **Store** for more packs, the **Collection** to admire your haul, and **Story** if you want chapters with fixed rewards.

And if you forget anything? **Full Tutorial Guide** on Play home, or run **Tutorial** again. Even oracles repeat themselves—it builds character.

---

## Part C — Optional pickup lines (short UI stingers)

Use only if you want modular VO clips (menu tips, not required for the main pass).

| Tag | Line |
|-----|------|
| `keyword_taunt` | “Taunt: the loud friend who insists everyone look at them first.” |
| `keyword_brawler` | “Brawler: extra hurt for people who deserved it anyway.” |
| `keyword_backstab` | “Backstab: for gods who think the back row is ‘invisible.’ It isn’t.” |
| `keyword_ranged` | “Ranged: sometimes you don’t need to shove past the bouncer.” |
| `timer` | “Thirty seconds a turn—Chaos has a schedule.” |
| `skip_tutorial` | “Skipping’s fine. Hades will still talk smack in a real match.” |

---

## Revision note for developers

When tutorial steps or rewards change, update:

1. `TUTORIAL_BATTLE_HINTS` and `FULL_TUTORIAL_SECTIONS` in `app/prophecy.jsx`
2. This file’s **Part B** cues and any numbers (gold, pack name)
