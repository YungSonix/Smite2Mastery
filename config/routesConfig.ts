export const PAGE_KEYS = {
  HOME: 'homepage',
  DATA: 'data',
  BUILDS: 'builds',
  CUSTOM_BUILD: 'custombuild',
  PATCH_HUB: 'patchhub',
  MORE: 'more',
  SMITE_WARS: 'smitewars',
} as const;

export const DATA_SUBTABS = {
  GODS: 'gods',
  ITEMS: 'items',
  GAME_MODES: 'gamemodes',
  MECHANICS: 'mechanics',
} as const;

export const BUILDS_SUBTABS = {
  FEATURED: 'featured',
  CONTRIBUTORS: 'contributors',
  COMMUNITY: 'community',
  RANDOMIZER: 'randomizer',
  CUSTOM: 'custom',
  MY_BUILDS: 'mybuilds',
  /** Replaces legacy tierlist tab — Guides hub in Builds. */
  GUIDES: 'guides',
  /** @deprecated Use GUIDES; kept for any persisted tab strings. */
  TIERLIST: 'tierlist',
} as const;

export const PATCH_HUB_SUBTABS = {
  SIMPLE: 'simple',
  CATCH_UP: 'catchup',
  ARCHIVE: 'archive',
} as const;

export const MORE_SUBTABS = {
  MINIGAMES: 'minigames',
  PROFILE: 'profile',
  SHOP: 'shop',
  TOOLS: 'tools',
} as const;

export const DEFAULT_TAB_STATE = {
  data: DATA_SUBTABS.GODS,
  builds: BUILDS_SUBTABS.FEATURED,
  patchHub: PATCH_HUB_SUBTABS.SIMPLE,
  more: MORE_SUBTABS.MINIGAMES,
  patchHubLastPatch: 25,
} as const;
