export const STORAGE_KEYS = {
  LAST_SEEN_APP_VERSION: 'lastSeenAppVersion',
  CURRENT_USER: 'currentUser',
  FEATURED_STREAM_COLLAPSED: 'featuredStreamCollapsed',
  FEATURED_STREAM_DISMISSED: 'featuredStreamDismissed',
} as const;

export const STORAGE_PREFIXES = {
  SHOP_USER: 'shop_',
  USER_GOLD_SUFFIX: '_gold',
} as const;
