# God render tooling

Scripts for OCR/vision-tag extraction from `app/data/God Renders/` into pantheon skin JSON.

## Main entry points

| Script | Purpose |
|--------|---------|
| `extract-god-render-metadata.js` | OCR loadout screenshots → skin metadata (`npm run extract-god-renders`) |
| `apply-vision-tags-batch-b.js` | Apply vision-tagged JSON to pantheon files (pantheon wrappers call this) |
| `apply-vision-tags-agent-c.js` / `agent-f.js` | Batch agents for multi-pantheon merges |
| `dedupe-skin-variant-loadouts.js` | Remove duplicate variant loadout rows after apply |
| `strip-god-render-loadouts.js` / `rebuild-god-render-audit.js` | Audit and cleanup helpers |
| `vision-tag-batch-c.js` | Chinese batch-C mapping runner |
| `GOD_RENDER_VISION_TAG.md` | Full workflow and field reference |

Shared libs live in `lib/` (`godRenderExtract`, `godRenderOcr`, `visionTagTemplates`, …).  
`godSkinsPaths.js` stays in `scripts/lib/`.

Vision-tag data/logs: `scripts/god-renders/.vision-tag-*` (gitignored).
