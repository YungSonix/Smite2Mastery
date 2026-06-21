/**
 * Dev-only Morgan Le Fay reference build for Randomizer testing (18,350g @ Lv 20).
 * Only applied when __DEV__ is true. Reload app to re-apply after editing.
 *
 * Default: Death's Embrace hybrid build (your randomizer screenshot).
 * Optional: set USE_SMITECALC_PARITY_BUILD = true for the 7-item smitecalc loadout.
 */
export const RANDOMIZER_DEV_PRELOAD_ENABLED =
  typeof __DEV__ !== 'undefined' && __DEV__;

/** Set true only when comparing against smitecalc's Adamantine/Berserker's/Thoth build. */
export const USE_SMITECALC_PARITY_BUILD = false;

/** Your reference build — Death's Embrace + Purification + 6 actives/passives. */
export const RANDOMIZER_DEV_PRELOAD = {
  godName: 'Morgan Le Fay',
  starterInternalName: 'DeathsEmbrace',
  relicInternalName: 'PurificationBeads',
  itemInternalNames: [
    'AvatarsParashu',
    'LernaeanBow',
    'DeathMetal',
    'SilkenMailcoat',
    'TimeLockAegis',
    'GluttonousGrimoire',
  ],
};

/** smitecalc Morgan @ 18350g — different items; use only for side-by-side parity checks. */
export const RANDOMIZER_DEV_PRELOAD_SMITECALC = {
  godName: 'Morgan Le Fay',
  starterInternalName: 'AdamantineSickle',
  relicInternalName: null,
  itemInternalNames: [
    'BerserkersShield',
    'AtalantasBow',
    'Heartseeker',
    'GenjisGuard',
    'MantleOfDiscord',
    'BookOfThoth',
  ],
};

const ACTIVE_PRELOAD = USE_SMITECALC_PARITY_BUILD
  ? RANDOMIZER_DEV_PRELOAD_SMITECALC
  : RANDOMIZER_DEV_PRELOAD;

function findItemByInternalName(itemLookupMap, internalName) {
  if (!itemLookupMap || !internalName) return null;
  const raw = String(internalName);
  const lower = raw.toLowerCase();
  const norm = lower.replace(/[^a-z0-9]/g, '');
  return (
    itemLookupMap.get(raw) ||
    itemLookupMap.get(lower) ||
    itemLookupMap.get(norm) ||
    null
  );
}

/**
 * @returns {{ god: object, itemSlots: object[], relic: object|null } | null}
 */
export function resolveRandomizerDevPreload(gods, itemLookupMap) {
  if (!RANDOMIZER_DEV_PRELOAD_ENABLED) return null;

  const cfg = ACTIVE_PRELOAD;
  const god = (gods || []).find(
    (g) =>
      String(g?.name || g?.GodName || g?.displayName || '')
        .trim()
        .toLowerCase() === cfg.godName.toLowerCase()
  );
  if (!god) return null;

  const starter = cfg.starterInternalName
    ? findItemByInternalName(itemLookupMap, cfg.starterInternalName)
    : null;
  const relic = cfg.relicInternalName
    ? findItemByInternalName(itemLookupMap, cfg.relicInternalName)
    : null;
  const slotItems = cfg.itemInternalNames.map((id) =>
    findItemByInternalName(itemLookupMap, id)
  );

  const needsStarter = Boolean(cfg.starterInternalName);
  if ((needsStarter && !starter) || slotItems.some((it) => !it)) {
    return null;
  }

  const itemSlots = needsStarter ? [starter, ...slotItems] : slotItems;
  while (itemSlots.length < 7) {
    itemSlots.push(null);
  }

  return {
    god,
    itemSlots: itemSlots.slice(0, 7),
    relic,
  };
}
