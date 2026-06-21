/**
 * Skin showcase JSON — optional fields per skin in `builds.json`:
 *
 * - **Bundled PNGs** (recommended): repo-relative paths under `app/data/NewGodSkins/{God}/Skins/{SkinKey}/…`
 *   or `app/data/NewGodSkins/{God}/Default/…` for base. Run `npm run sync-newgodskins:write` after adding files.
 * - cardArt / card_art / splash — hero “card” image (defaults to `skin`)
 * - inGame / … — Loadout / full-body when present (e.g. `T_GodFull_*.png` in Default)
 * - icon / thumb / thumbnail / cardArt / splash — picker thumb (e.g. `t_GodPortrait_*.png` or wallpaper path)
 * - variants: [{ cardArt?, skin?, icon?, inGame?, name? }] — **prism overlays** only (not the default look).
 *   The UI shows the base skin first, then merges each entry when its prism chip is selected.
 * - hideFromSkinList: when true, this row is omitted from the skin picker (used for legacy duplicate prism rows).
 * - voiceSkinFolder: optional `VoiceAudio/<god>/<this>/VOX` folder override (e.g. `Skin01_DevilPunk`).
 * - **Disk discovery** (`npm run sync-newgodskins:write`): new `Skins/{Folder}` stubs are added when a folder
 *   exists under `NewGodSkins/{God}/Skins/` but had no JSON row (except the `Mastery` folder — see below).
 * - **Palette prisms**: filenames like `*_Mystic_P1.png` / `_P2.png` become variant chips (same UI as `_Prism_*`).
 *   When the disk folder name does not match the JSON skin key, add a row to `SKIN_FOLDER_REMAP` in
 *   `scripts/sync-newgodskins-to-builds.js` (e.g. Athena `MysticGuardian` → `02A`).
 * - **Tier-style in `Prisms/`** (e.g. Artemis Frostwarden): `t_SkinCard_*_T2_B.png` under `Skins/.../Prisms/` — sync maps
 *   each `T{tier}_{letter}` to a variant chip (`npm run sync-newgodskins:write`).
 * - **Mastery** (`Skins/Mastery/`): merged into the **base** skin’s `variants[]` (same prism strip UI). Often
 *   only `icon` is set per tier; splash may fall back to the default god card. `masteryFromDisk` marks rows the
 *   sync script replaces each run — do not remove if you rely on sync.
 *
 * Paths resolve in the app via `getSkinImage` (GitHub raw `master` for NewGodSkins; push assets before release).
 */

export function getSkinCardArtPath(skin) {
  if (!skin || typeof skin !== 'object') return null;
  const p = skin.cardArt || skin.card_art || skin.splash || skin.skin || null;
  return p ? String(p).trim() || null : null;
}

export function getSkinModelViewPath(skin) {
  if (!skin || typeof skin !== 'object') return null;
  const p =
    skin.inGame ||
    skin.in_game ||
    skin.gameplay ||
    skin.gameplayScreenshot ||
    skin.gameplay_screenshot ||
    skin.modelPreview ||
    skin.model_preview ||
    skin.model ||
    skin.screenshot ||
    null;
  return p ? String(p).trim() || null : null;
}

export function getSkinThumbPath(skin) {
  if (!skin || typeof skin !== 'object') return null;
  const p =
    skin.icon ||
    skin.thumb ||
    skin.thumbnail ||
    skin.skin ||
    skin.cardArt ||
    skin.card_art ||
    skin.splash ||
    null;
  return p ? String(p).trim() || null : null;
}

export function parseSkinVariants(skin) {
  if (!skin?.variants || !Array.isArray(skin.variants)) return [];
  return skin.variants.filter((v) => v && typeof v === 'object');
}

/** Skin keys shown in the god detail picker (excludes rows merged into a primary prism skin). */
export function getVisibleSkinKeys(skinsRecord) {
  if (!skinsRecord || typeof skinsRecord !== 'object') return [];
  return Object.keys(skinsRecord).filter((k) => {
    const s = skinsRecord[k];
    return s && !s.hideFromSkinList && !s.hide_from_skin_list;
  });
}

/** Default preview skin — base/default row when present, else first visible key. */
export function getDefaultSkinKey(skinsRecord) {
  const keys = getVisibleSkinKeys(skinsRecord);
  if (!keys.length) return null;
  for (const key of keys) {
    const type = String(skinsRecord[key]?.type || '').toLowerCase();
    if (type.includes('base') || type === 'default') return key;
  }
  for (const key of keys) {
    const name = String(skinsRecord[key]?.name || '').toLowerCase();
    if (name.startsWith('base ') || name === 'base' || name.includes('default')) return key;
  }
  return keys[0];
}

/** Visible keys with the default/base skin first (picker order). */
export function getOrderedVisibleSkinKeys(skinsRecord) {
  const keys = getVisibleSkinKeys(skinsRecord);
  const defaultKey = getDefaultSkinKey(skinsRecord);
  if (!defaultKey || keys[0] === defaultKey) return keys;
  return [defaultKey, ...keys.filter((k) => k !== defaultKey)];
}

export function mergeSkinVariant(baseSkin, variant) {
  if (!variant) return baseSkin || {};
  return { ...(baseSkin || {}), ...variant };
}
