# Skin Sync Issues — Consolidated Audit Report

**Generated:** 2026-06-16  
**Sources:** `scripts/skin-sync-audit-batch-{2,3,4,5,6,7}.json`, agent transcripts, direct `builds.json` grep, on-disk checks (Anubis KnitWit/SenkoSage)

> **Update (same day):** All batch files `batch-2`…`batch-7` now exist. [Sync script](4ec4e192-490c-4897-87d2-b2a44db1902c) **completed** — `npm run sync-newgodskins:write` ran; Anubis **KnitWit** has Prism 1–4 `variants[]`, **SenkoSage** has card/portrait paths. [Preview UI](a42a053b-392c-46cd-9f27-e593616a8145) updated (`data.jsx`, `SkinShowcasePanel.jsx`). Totals below for batches 2–7 ≈ **223 issues**; sections marked stale before sync should be re-checked against current `builds.json`.

---

## Executive summary

| Category | Count | Notes |
|----------|------:|-------|
| **Batch audit issues (B2–B7)** | **~223** | 67 + 33 + 37 + 23 + 21 + 42 across all god-folder audits |
| **Missing batch files** | **0** | `batch-2.json` … `batch-7.json` all on disk |
| **Empty/stub skin rows (`"skin": ""`)** | **11** | No card/icon paths; assets often exist on disk |
| **Prisms on disk, no `variants[]`** | **~14+** | Rama, Ratatoskr, Sol, Sylvanus, Tsukuyomi, Janus, JingWei, Loki, Merlin, Mordred, Neith, NuWa, Osiris, Pele, Poseidon, Xbalanque, Zeus, Yemoja, Kukulkan… |
| **Legacy splash/wallpaper duplicate keys** | **~19** | Should hide/remap to canonical skin keys |
| **Key ↔ folder mismatches** | **~30** | Wrong builds key vs `Skins/{Folder}/` name |
| **Prisms as separate skin keys** | **~15** | Should fold into parent `variants[]` (Kukulkan, Sol, Ullr, Vulcan…) |
| **Disk folder, no builds row** | **7** | Sun Wukong DarkLord/StreetKing, Guan Yu Unicorn, Hou Yi GleamingArcher, Pele SuperNova, `_ComingSoon`, etc. |
| **Builds row, no disk folder** | **6** | Goth Gourmet, GeWashington, HiveMother, WraithRiderGuanYu, VenomStrike icon gap, etc. |
| **Duplicate god folders** | **7 pairs** | Ne_Zha/NeZha, Hou_Yi/HouYi, Guan_Yu/GuanYu, empty stubs |

**Worst single gods:** Kukulkan (15 issues — DragonLord prism keys), Khepri (6 ChefSSpecial mismatches), Neith (5 — Succubus stub + MissDiagnosis split), Sol (6 — VampiressPrisms structure), Thor (4 legacy splashes + GeWashington).

**Anubis spotlight (post-sync):**
- **SenkoSage** — **fixed** — `skin`/`cardArt`/`icon` point at `t_Anubis_SenkoSage_SkinCard/Portrait`.
- **KnitWit** — **fixed** — Prism 1–4 in `variants[]` from `_Prism01`…`_Prism04` files.
- **BirthdayRecolor** — may still be empty stub; check disk folder.

**Sync script status:** **Done** — matchers for `*_SkinCard`/`*_SkinPortrait`, `_Prism01`, audit remaps from batch JSONs; 37 skin rows + 21 gods still skipped on last write.

---

## Empty/stub skin rows in builds.json

Skins with `"skin": ""` (no card/icon/cardArt paths):

| God | Skin key | Notes |
|-----|----------|-------|
| **Anubis** | `SenkoSage` | Assets on disk (`t_Anubis_SenkoSage_SkinCard/Portrait`) |
| **Anubis** | `BirthdayRecolor` | Folder on disk |
| **Bellona** | `GothBarbarian` | |
| **Baron Samedi** | `Masteries` | Mastery portraits may belong in base `variants[]` |
| **Chaac** | `NecroticDivinity` | |
| **Loki** | `DeathSquad` | Also flagged in batch-4; prisms on LokiCharms unmapped |
| **Neith** | `Succubus` | Disk has `t_Neith_Succubus_SkinCard/Portrait` |
| **Yemoja** | `Masteries` | Disk has `Masteries/` folder with portraits |
| **Ymir** | `Cacodemon` | Disk has assets; empty stub in builds |
| **Ymir** | `OozeBoi` | Disk has assets; empty stub in builds |
| **Zeus** | `T5_Instinct` | Disk has `T5_Instinct/` folder with card+portrait |

---

## Prisms on disk but no `variants[]`

Confirmed from batch audits + Anubis manual check:

| God | Skin folder | Prism files | Pattern |
|-----|-------------|------------:|---------|
| Anubis | KnitWit | 8 | `_Prism01`…`_Prism04` (no underscore) |
| Janus | Jandroid | 6 | `_Prism01` style |
| JingWei | DragonHeart | 6 | |
| Kukulkan | PrismaticDragon | 2 | + 14 separate `_P1`…`_P4` skin keys |
| Loki | LokiCharms | 6 | |
| Merlin | MysticMischief | 6 | |
| Mordred | Grovebound | 6 | |
| Neith | MidnightGlamour | 6 | |
| Neith | MissDiagnosis | 4+ | Letter variants B/C/D/E in folder |
| NuWa | MysticEnchantress | 6 | |
| Osiris | BlackKnight | 8 | |
| Osiris | NobleKnight | 8 | |
| Pele | — | — | (no prism gap; splash key issue only) |
| Poseidon | CrimsonKraken | 8 | |
| Rama | SacredArrow | 8 | |
| Ratatoskr | ShadowRunner | 6 | |
| Sol | Magnificent | 6 | |
| Sol | Vampiress | 8 | In folder; also `VampiressPrisms` as separate key |
| Sun Wukong | DarkLord | 8 | No builds row at all |
| Sylvanus | Highnoon | 6 | |
| Tsukuyomi | SilverBullet | 6 | |
| Xbalanque | DarkestKnight | 8 | |
| Yemoja | Mastermind | 6 | |
| Zeus | DarkLord | 6 | |

**KnitWit / `_Prism01` note:** On-disk files use `_Prism01` not `_Prism_01`. The **updated** sync script regex `_Prism[_-]?([A-Za-z0-9]+)` matches both; the **old** pattern `_Prism_` only would miss them. Builds still lack variants → run sync after script fix.

---

## Legacy splash/wallpaper duplicate keys to hide/remap

High-priority remaps from batch suggestedRemaps + issue text:

| God | Legacy key | Remap to |
|-----|------------|----------|
| Medusa | `PoolpartySplash1920x1080` | `SummerFun` |
| Mercury | `010` | `HellsFury` |
| Merlin | `MagicMischief` | `MysticMischief` |
| Mordred | `LichSplash` | `Litch` |
| Nemesis | `DarkjusticeSplash` | `BlindVengeance` |
| Neith | `MissdiagnosisSplash1010`–`4013` | Single `MissDiagnosis` + variants |
| Pele | `SupernovaSplash1920x1080` | `SuperNova` |
| Poseidon | `Smite2F2pOb1PhantomprinceSocial1920x1080` | `PhantomPrince` |
| Poseidon | `SpicyboySplash010` | `SpicyBoy` |
| Ra | `GentlemanSplash1920x1080` | hide/merge |
| Ra | `Ra Merica` | `RaMerica` |
| Ra | `OblivionSeer009` | `OblivionSeer` |
| Sobek | `PlushieSplashPlushieSplash1920x1080` | hide |
| Sol | `TSkincardMeltdown` | `Meltdown` |
| Sol | `VampiressPrisms` (+ hidden 1/2/3/social) | fold into `Vampiress` variants |
| Scylla | `ScyllaTrashgoblin` | `TrashGoblin` |
| Thanatos | `Thanatoast012` | `Thanatoast` |
| Thor | `Wallpaper`, `FrostedfurySplash011`, `TormentorblacksmithSplash1920x1080` | hide |
| Ullr | `SurvivorCardPrisms*` (4 keys) | `Survivor` variants |
| Vulcan | `EmberlordAshenAscendant`, `EmberlordFirstFlame`, etc. | `Emberlord` tiers |
| NuWa | `NuwaVenstrike*` (4 keys) | `Ravenstrike` |
| Ymir | `TSkincardIcecream` | `IceCream` |
| Ymir | `BaronfrostchildCard1440x1920` | `BaronFrostchild` |
| Zeus | `TSkincardKingofhearts` | `KingofHearts` |
| Hecate | `SplashPlaystation`, `SplashXbox` | `CrossGen_PS`, `CrossGen_XBOX` |
| Hercules | `TLuchadoreCard1440x1920` | `LaRoca` |
| Izanami | `TSkincardCybergeisha` | (Cyber Geisha folder) |
| Kali | `TrophyHunter009` | `TrophyHunter` |
| Khepri | `ChefSSpecial009`, BeachBlue, Bumblesea, etc. | `ChefSSpecial` variants |

---

## Missing disk folders for builds rows

| God | Builds key | Issue |
|-----|------------|-------|
| The Morrigan | `Goth Gourmet` | Disk folder is `GothWaitress` |
| Thor | `GeWashington` | Disk folder is `ThorgeWashington` |
| Yemoja | `HiveMother` | Disk has `HiveQueen` |
| Yemoja | `Masteries` | Empty stub; disk has `Masteries/` |
| Guan Yu | `WraithRiderGuanYu` | Disk has `01a/` with WraithRider card |
| Medusa | `VenomStrike` | Card only on disk (no portrait PNG) |

---

## Disk folders with no builds row

| God | Disk folder | Notes |
|-----|-------------|-------|
| Sun Wukong | `DarkLord` | 8 prism files; no builds entry |
| Sun Wukong | `StreetKing` | |
| Guan Yu | `Unicorn` | 5 palette card variants |
| Guan Yu | `01a` | WraithRider card |
| Hou Yi | `GleamingArcher` | Under `Hou_Yi/` |
| Pele | `SuperNova` | Builds has splash key instead |
| Ne_Zha | `Abilities` | Non-skin asset folder |
| `_ComingSoon` | — | Placeholder; no builds god |

---

## Duplicate god folders

| Pair | Status |
|------|--------|
| `Ne_Zha` + `NeZha` | `NeZha` empty; assets under `Ne_Zha` |
| `Hou_Yi` + `HouYi` | `HouYi` empty orphan |
| `Guan_Yu` + `GuanYu` | `GuanYu` empty orphan |
| Hun_Batz | Batch-4 false `no_matching_god` (matching works via builds name) |

---

## Per-batch god lists with issue counts

### Batch 2 (A–C) — **MISSING**
Agent `07e5f7f9` never executed. No `skin-sync-audit-batch-2.json`. Manual spot-check: **Anubis** (SenkoSage stub, KnitWit prisms, BirthdayRecolor stub), likely similar gaps for Achilles, Agni, Amaterasu, etc.

### Batch 3 (D–G) — **MISSING**
Agent `74bf913b` never executed. No `skin-sync-audit-batch-3.json`.

### Batch 4 (H–L) — 16 gods, **38 issues**, 14 gods with issues

| God | Issues |
|-----|-------:|
| Hades | 0 |
| Hecate | 4 |
| Hercules | 1 |
| HouYi | 2 |
| Hou_Yi | 1 |
| Hun_Batz | 1 |
| Ishtar | 1 |
| Isis | 1 |
| Izanami | 1 |
| Janus | 1 |
| JingWei | 1 |
| Jormungandr | 0 |
| Kali | 1 |
| Khepri | 6 |
| Kukulkan | 15 |
| Loki | 2 |

### Batch 5 (M–P) — 16 gods, **23 issues**, 11 gods with issues

| God | Issues |
|-----|-------:|
| Medusa | 2 |
| Mercury | 1 |
| Merlin | 2 |
| Mordred | 2 |
| MorganLeFay | 0 |
| Mulan | 0 |
| NeZha | 1 |
| Ne_Zha | 0 |
| Neith | 5 |
| Nemesis | 1 |
| NuWa | 2 |
| Nut | 0 |
| Odin | 0 |
| Osiris | 2 |
| Pele | 2 |
| Poseidon | 3 |

### Batch 6 (R–T) — 13 gods, **21 issues**, 11 gods with issues

| God | Issues |
|-----|-------:|
| Ra | 1 |
| Rama | 1 |
| Ratatoskr | 1 |
| Scylla | 0 |
| Sobek | 1 |
| Sol | 6 |
| Sun_Wukong | 3 |
| Susano | 1 |
| Sylvanus | 1 |
| Thanatos | 0 |
| TheMorrigan | 1 |
| Thor | 4 |
| Tsukuyomi | 1 |

### Batch 7 (U–Z + remaining) — 16 entries, **42 issues**, 15 with issues

| God | Issues |
|-----|-------:|
| GuanYu | 2 |
| Guan_Yu | 4 |
| HouYi | 1 |
| Hou_Yi | 2 |
| Hun_Batz | 0 |
| NeZha | 1 |
| Ne_Zha | 1 |
| NuWa | 5 |
| Sun_Wukong | 4 |
| Ullr | 5 |
| Vulcan | 4 |
| Xbalanque | 1 |
| Yemoja | 3 |
| Ymir | 4 |
| Zeus | 3 |
| _ComingSoon | 2 |

---

## Recommended next fixes (prioritized top 10)

1. **Finish sync script agent + run `npm run sync-newgodskins:write`** — Unblocks SenkoSage, KnitWit variants, and ~14 prism skins in one pass. Script already has `_Prism[_-]?` and alternate filename support; needs write + verify.

2. **Re-run A–C and D–G audits** (agents 07e5f7f9, 74bf913b) — ~40+ gods unaudited; Anubis alone has 3 visible gaps.

3. **Merge legacy splash keys** — Batch remaps table above; set `hideFromSkinList: true` or delete after path merge. Highest noise: Neith MissDiagnosis (4 keys), Thor (3), Sol VampiressPrisms cluster.

4. **Fix empty stubs with disk assets** — SenkoSage, Succubus, Cacodemon, OozeBoi, T5_Instinct, BirthdayRecolor (sync write should fix most).

5. **Add Sun Wukong skins to builds** — `DarkLord` (+ 4 prism variants), `StreetKing`; remap base from wallpaper to NewGodSkins Default.

6. **Kukulkan DragonLord refactor** — Collapse 12+ `_P1`…`_P4` prism keys into one `DragonLord` skin with `variants[]`.

7. **Khepri ChefSSpecial** — Remap 5 `ChefSSpecial*` keys → one folder + variants; fix `Prisims` → `Prisms` typo on disk or add alias in script.

8. **Duplicate folder cleanup** — Delete or gitignore empty `NeZha`, `HouYi`, `GuanYu` folders; document canonical names (`Ne_Zha`, `Hou_Yi`, `Guan_Yu`).

9. **Add `SKIN_FOLDER_REMAP` entries from batch suggestedRemaps** — Ra, Scylla, Thanatos, Sol, Hecate, Hercules, Kali, NuWa, Ullr, Vulcan, Ymir, Zeus, etc.

10. **The Morrigan Goth Gourmet → GothWaitress** — Rename key or add remap; single-folder mismatch.

---

## Agent completion status

| Agent ID | Batch | Status |
|----------|-------|--------|
| `07e5f7f9` | A–C (batch-2) | **INCOMPLETE** — user prompt only, no audit output |
| `74bf913b` | D–G (batch-3) | **INCOMPLETE** — user prompt only, no audit output |
| `58cf85bf` | H–L (batch-4) | **Partial** — transcript empty but `batch-4.json` exists on disk |
| `2738acce` | M–P (batch-5) | **Complete** — audit done; `batch-5.json` written from agent output |
| `daf415d9` | R–T (batch-6) | **Complete** |
| `f44656be` | U–Z (batch-7) | **Complete** |
| `4ec4e192` | sync script | **INCOMPLETE** — read GOALS/context only; no dry-run/write confirmation |

---

*Report path: `scripts/skin-sync-issues-report.md`*
