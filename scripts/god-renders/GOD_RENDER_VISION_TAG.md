# God render vision tagging

Clean restart: **read screenshots → hand-edit pantheon JSON → verify in viewer**.  
Reference god: **Achilles** in `app/data/God Information/Skins/Greek.json` only.

## Locked rules (user decisions)

| Rule | Value |
|------|--------|
| Base skin cost | `{ "currency": "diamonds", "amount": "0" }` — show **0** with diamond icon |
| Base tier | **none** — no `tierBadge`, `rarity: null` |
| Base unlock | `{ "source": "base", "displayText": "Base god" }` |
| `information[]` | **Verbatim** game lines (ASCENSION REWARD, RARE, STANDARD, SPECIAL EFFECTS, TRAVELER, PRISM, etc.) |
| Mastery emblems | Infer from unlock: Onyx/Opal → `T_MasteryEmblem_Lvl5_256.png`; **Radiant** (not “Light” or “Angelic”) → `T_MasteryEmblem_Perfect_256.png` |
| Mastery Angelic | In-game **Angelic** panel = **Mastery Radiant** row — merge `T_*_Icon_Angelic.png` onto Radiant; **no** `Mastery Angelic` variant row |
| Mastery Demonic | **Never** add `Mastery Demonic` rows — `T_*_Icon_Demonic.png` is a disk-sync shadow-icon artifact only |
| Every row | One screenshot + `loadout` bar-for-bar like Achilles (base, each mastery variant, Shadow, each premium skin, each prism) |
| GO TO button | Store **`"GO TO"`** in `loadoutMeta.buttonText` when the screenshot shows GO TO (no numeric cost) |
| LOCKED button | Store **`"LOCKED"`** in `loadoutMeta.buttonText` when the purchase button says LOCKED |
| Prisms parent skin | Include **Prisms Available** block verbatim on parent row (see below) |
| Shadow | Standalone skin row — diamond cost + **Heroic** tier |
| Strip | `node scripts/strip-god-render-loadouts.js --write` keeps Achilles only |
| Folder aliases | `scripts/god-renders/lib/godRenderFolderAliases.js` (e.g. `cernennos` → Cernunnos, `morgan le fay` → Morgan Le Fay) |

## Schema (Achilles reference)

### Shared frame (all loadout rows)

```json
"loadout": {
  "screenshot": "app/data/God Renders/{folder}/Screenshot (NNN).png",
  "frame": {
    "focalX": 50,
    "focalY": 50,
    "zoom": 1.148936170212766,
    "aspectWidth": 586,
    "aspectHeight": 940,
    "cropWidth": 586,
    "cropHeight": 940
  }
}
```

### Base skin row

- `isBaseSkin: true`, `type: "Base Skin"`, `rarity: null`
- `cost: { "currency": "diamonds", "amount": "0" }`, `price: { "diamonds": "0" }`
- `loadout` + `loadoutMeta` on **base row only** (not a separate Light variant row)
- **Mastery variants** on base: `Mastery Onyx`, `Mastery Opal`, `Mastery Radiant` — each with `loadout`, `loadoutMeta`, `rarity: "Heroic"`, `tierBadge`, `unlock`, `gridBadge` (mastery emblem)
- Radiant uses Light or Angelic **icon** path only; variant name is **Mastery Radiant**; displayName **Radiant** — **no** `Mastery Light` or `Mastery Angelic` row; **never** `Mastery Demonic`

### Mastery Shadow (standalone skin row)

- `skinKey: "Shadow"`, `type: "Mastery Shadow"`, `isMasteryShadowSkin: true`
- `rarity: "Heroic"`, `tierBadge: ...HeroicTier.png`
- `cost: { "currency": "diamonds", "amount": "900" }` (read from screenshot)
- `information[]`: ASCENSION REWARD + RARE blocks when shown
- Own `loadout` / `loadoutMeta` / `screenshotTag` with `target: "skin"`

### Premium / prism skins

- Parent skin: `cost`, `rarity`, `tierBadge`, optional `information[]`, `loadout` on skin row
- Prism variants in `variants[]` with `gridBadge: { type: "prism" }`, `rarity: "Prisms"`, `tierBadge: ...RecolorsTier.png`
- `screenshotTag.cost` + `screenshotTag.tier` on purchasable skins
- Carousel prisms: `displayName` like `{Skin} - {PrismName}`; map to existing `Prism N` rows or rename variant to match game
- **Traveler + prisms parent** (no diamond cost, GO TO button): add `information[]` with **Traveler Collection** + **Prisms Available** exactly as shown:

```json
{
  "key": "travelerCollection",
  "label": "Traveler Collection",
  "text": "Acquired in the '{SkinName} {GodName}' Traveler."
},
{
  "key": "prismsAvailable",
  "label": "Prisms Available",
  "text": "This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms."
}
```

- **Prism carousel row** (single prism selected): label **Prism** with carousel copy (not Prisms Available)
- **No cost on screen:** set `loadoutMeta.buttonText` to **`GO TO`** or **`LOCKED`** — do not leave cost row empty in viewer

### `loadoutMeta` + `screenshotTag`

- `loadoutMeta`: `godName`, `displayName`, `rarity`, `gridBadge`, `screenshot`, `extractedAt`, `information[]`, optional `buttonText: "GO TO"`, `screenshotTag`
- `gridBadge`: `{ type: "prism" }` | `{ type: "masteryRank", rank: 5|10, label: "V"|"X", emblemPath }`
- `screenshotTag` shape: `scripts/god-renders/lib/godRenderScreenshotTags.js` — `fileName`, `target` (`skin` | `variant`), `appliedTo`, optional `cost`, `tier`

## Workflow

1. Open **`app/data/God Renders/{godfolder}/`** for the **Greek god you are tagging** — use that god's folder only (e.g. `chiron/`, not global screenshot numbering across gods).
2. Vision-read **each PNG** in that folder. Map by **skin name + tier + cost shown in the screenshot** (top-right panel), **not** by assuming `Screenshot (N)` order matches capture sequence across the whole `God Renders` tree.
3. Cross-check row targets against `Greek.json` skin keys / variant names before saving.
4. Edit `app/data/God Information/Skins/{Pantheon}.json` matching Achilles field names.
5. `node scripts/rebuild-god-render-audit.js`
6. Verify: `npm run skins:viewer` — base **0** + diamond, no base tier, info panels, mastery emblems, prism badges, **Radiant** labels.

## Batch apply (Agent F pantheons)

```bash
node scripts/god-renders/apply-vision-tags-agent-f.js --write
node scripts/rebuild-god-render-audit.js
```

Log: `scripts/god-renders/.vision-tag-agent-f.log`

## Strip bad bulk tags

```bash
node scripts/strip-god-render-loadouts.js          # preview
node scripts/strip-god-render-loadouts.js --write  # keep Achilles only
node scripts/rebuild-god-render-audit.js
```

## Cost checklist (vision-required)

Bulk Batch C left **loadout + loadoutMeta** but skipped costs on purchasable skins. Every tagged row must satisfy:

| Row type | `cost` on skin row | `screenshotTag.cost` | Notes |
|----------|-------------------|----------------------|-------|
| **Base skin** | `{ currency: "diamonds", amount: "0" }` | `{ currency: "diamonds", amount: "0", owned: true }` | Unlock: `"Base god"` / panel DEFAULT SKIN |
| **Mastery Shadow** | diamond amount from screenshot (usually 900) | same + `tier: "Heroic"` | ASCENSION REWARD + RARE info blocks |
| **Premium skin** | amount from top-right / buy button | same + `tier` | **Never null** if price visible in screenshot |
| **Mastery Onyx/Opal/Radiant** | omit (ascension) | omit cost; `tier: "Heroic"` | Unlock cites ascension + rank V / X; `buttonText: "GO TO"` when shown |
| **Prism variant** | inherit parent or prism-specific if shown | `tier: "Prisms"` when badge says PRISMS | One screenshot per prism; `buttonText: "GO TO"` when shown |
| **No numeric cost** | omit `cost` | — | Set `loadoutMeta.buttonText` to **`GO TO`** or **`LOCKED`** exactly as the purchase button reads |

### Batch C failure pattern (pre-strip)

- Skin row `cost: null` + empty `price.diamonds` while `loadoutMeta` present (Chinese.json premium rows).
- `screenshotTag` on premium skins **without** `cost` (Devil Punk, Guan Unicorn, Vixen, etc.) while base/shadow had costs.
- Mastery variants correctly omitted cost.

**Rule:** Read cost text from screenshot. Do not infer from skin order alone.

## Pace

Tag **one pantheon at a time** (~5 gods/day vision-only). Greek log: `scripts/god-renders/.vision-tag-greek.log`.
