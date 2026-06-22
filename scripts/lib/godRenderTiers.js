/**
 * Smite 2 loadout tier badges — `app/data/Tiers/`.
 * Canonical names match in-game UI: Classic, Prisms (PNG basenames unchanged).
 */
const path = require('path');

const TIERS_DIR_REL = 'app/data/Tiers';

/** Canonical tier id → reference PNG basename. */
const TIER_BADGE_FILES = {
  Classic: 't_FE_Cosmetics_CommonTier.png',
  Epic: 't_FE_Cosmetics_EpicTier.png',
  Fabled: 't_FE_Cosmetics_FabledTier.png',
  Heroic: 't_FE_Cosmetics_HeroicTier.png',
  Legacy: 't_FE_Cosmetics_LegacyTier.png',
  Legendary: 't_FE_Cosmetics_LegendaryTier.png',
  Mythical: 't_FE_Cosmetics_MythicalTier.png',
  Prisms: 't_FE_Cosmetics_RecolorsTier.png',
};

/** OCR / UI label (uppercase) → canonical tier id. */
const TIER_LABEL_ALIASES = {
  CLASSIC: 'Classic',
  COMMON: 'Classic',
  PRISM: 'Prisms',
  PRISMS: 'Prisms',
  RECOLOR: 'Prisms',
  RECOLORS: 'Prisms',
  EPIC: 'Epic',
  FABLED: 'Fabled',
  HEROIC: 'Heroic',
  LEGACY: 'Legacy',
  LEGENDARY: 'Legendary',
  MYTHICAL: 'Mythical',
  RARE: 'Heroic',
  UNCOMMON: 'Classic',
};

function tierBadgeRelPath(tierId) {
  const file = TIER_BADGE_FILES[tierId];
  if (!file) return null;
  return `${TIERS_DIR_REL}/${file}`;
}

function normalizeTierLabel(raw) {
  if (!raw) return null;
  const token = String(raw)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!token) return null;
  if (TIER_LABEL_ALIASES[token]) return TIER_LABEL_ALIASES[token];
  for (const [alias, id] of Object.entries(TIER_LABEL_ALIASES)) {
    if (token.includes(alias)) return id;
  }
  for (const id of Object.keys(TIER_BADGE_FILES)) {
    if (token.includes(id.toUpperCase())) return id;
  }
  return null;
}

function listTierBadgePaths(projectRoot) {
  return Object.entries(TIER_BADGE_FILES).map(([tierId, file]) => ({
    tierId,
    relPath: `${TIERS_DIR_REL}/${file}`,
    absPath: path.join(projectRoot, TIERS_DIR_REL, file),
  }));
}

/** Mastery rank on grid card art → emblem PNG in `app/data/Tiers/`. */
const MASTERY_EMBLEM_FILES = {
  5: 'T_MasteryEmblem_Lvl5_256.png',
  10: 'T_MasteryEmblem_Perfect_256.png',
};

function masteryEmblemRelPath(rank) {
  const file = MASTERY_EMBLEM_FILES[rank];
  if (!file) return null;
  return `${TIERS_DIR_REL}/${file}`;
}

module.exports = {
  TIERS_DIR_REL,
  TIER_BADGE_FILES,
  TIER_LABEL_ALIASES,
  MASTERY_EMBLEM_FILES,
  tierBadgeRelPath,
  masteryEmblemRelPath,
  normalizeTierLabel,
  listTierBadgePaths,
};
