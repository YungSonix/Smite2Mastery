# God skins data

One JSON file **per pantheon** under this folder:

```
Skins/
  Greek.json
  Roman.json
  Norse.json
  ...
```

Each file contains gods **sorted A–Z**, with that god’s skins nested underneath:

```json
{
  "pantheon": "Greek",
  "gods": [
    {
      "godName": "Achilles",
      "internalName": "Achilles_Item",
      "skins": [
        { "skinKey": "Achilles", "skinName": "Base Achilles", "isBaseSkin": true, ... },
        { "skinKey": "SoulPiercer", "skinName": "Soul Piercer", ... }
      ]
    }
  ]
}
```

## Skin order (within each god)

1. **Base skin** (`isBaseSkin: true`) — includes mastery tiers in `variants[]` when synced from disk  
2. **Mastery rows** (`isMastery: true`) — if stored as their own skin entry  
3. All other skins **A–Z** by `skinName`

## Fields (per skin)

| Field | Description |
|-------|-------------|
| `skinKey` | Key in builds data |
| `skinName` | Display name |
| `cost` | `null` until filled — or `{ currency, amount }` |
| `rarity` | `null` until filled |
| `isBaseSkin` | Default / base look |
| `isPrism` | Prism skin or has prism variants |
| `isRecolor` | Recolor / hidden palette row |
| `isMastery` | Standalone mastery skin row |
| `isCrossGen` | Cross-gen / platform skin |
| `assets` | `skin`, `cardArt`, `icon`, `inGame` paths |
| `tierBadge` | Reference PNG under `app/data/Tiers/` (Classic, Prisms, Heroic, …) |
| `loadout` | `{ screenshot, frame }` — full loadout PNG + CSS crop focal point (2:3, no file crop) |
| `unlock` | `{ masteryRank, requiresAscensionPass, source, prismNote }` from loadout capture |
| `variants` | Prism or mastery variant chips |

See `_schema.example.json` for a full example.

## Scripts

```bash
# Full pipeline: sync from NewGodSkins → prune wallpaper/orphans → export pantheon JSON
npm run sync-skins:full

# Extract loadout metadata from God Renders screenshots → pantheon JSON
npm run extract-god-renders -- --god achilles
npm run extract-god-renders:write -- --god achilles
npm run extract-god-renders:write -- --all
```

The app loads skins from `Builds/builds.json` at runtime. After editing pantheon JSON here, run `npm run merge-god-skins:write`.

## Web viewer (verify art + metadata)

Browse pantheons, hover gods for skin previews, and open full god detail pages:

```bash
npm run skins:viewer
```

Open **http://127.0.0.1:4177** in your browser. Images load from local `app/data/` when present, otherwise from GitHub raw. Red borders = broken image path.

If you see `EADDRINUSE`, the viewer is already running — open that URL, or stop the other terminal with Ctrl+C. Different port: `SKINS_VIEWER_PORT=4178 npm run skins:viewer` (PowerShell: `$env:SKINS_VIEWER_PORT=4178; npm run skins:viewer`).
