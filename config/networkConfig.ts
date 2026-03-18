export const ENV_KEYS = {
  EXPO_PUBLIC_SUPABASE_URL: 'EXPO_PUBLIC_SUPABASE_URL',
  EXPO_PUBLIC_SUPABASE_KEY: 'EXPO_PUBLIC_SUPABASE_KEY',
} as const;

export const SUPABASE_CONFIG = {
  FALLBACK_URL: 'https://ofewccajgulkurtpdyoj.supabase.co',
  FALLBACK_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZXdjY2FqZ3Vsa3VydHBkeW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODA0MzYsImV4cCI6MjA4MTA1NjQzNn0.iKxzUpSsvGhEwrFMBkhjcawZvKuAm-OJpdnKLZpL3a0',
  MIN_URL_LENGTH: 10,
  MIN_KEY_LENGTH: 10,
} as const;

export const REMOTE_BASE_URLS = {
  GITHUB_RAW_MAIN_IMG: 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img',
  GITHUB_RAW_MASTER: 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master',
  SMITE_CALCULATOR: 'https://www.smitecalculator.pro',
  SMITE2_NEWS: 'https://www.smite2.com/news',
  WEB_CDN: 'https://webcdn.hirezstudios.com/smite2-cdn',
  FORMSPREE: 'https://formspree.io/f',
  APP_PUBLIC_DOMAIN: 'https://smite2app.com',
  GITHUB_API: 'https://api.github.com',
  TRACKER_GG_SMITE2: 'https://tracker.gg/smite2',
  TERMSFEED: 'https://www.termsfeed.com',
  TWITCH_PLAYER: 'https://player.twitch.tv',
} as const;

export const FORM_ENDPOINTS = {
  BUG_REPORT: `${REMOTE_BASE_URLS.FORMSPREE}/xqarlgol`,
  APP_REVIEW: `${REMOTE_BASE_URLS.FORMSPREE}/meoyzvyg`,
  MISSING_OR_OUTDATED: `${REMOTE_BASE_URLS.FORMSPREE}/xdkqlezy`,
} as const;

export const ICON_PATHS = {
  ITEM_ICONS: `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/app/data/Icons/Item%20Icons`,
  ITEM_ICONS_FILLED: `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/app/data/Icons/Item%20Icons%20Filled`,
  GOD_ICONS: `${REMOTE_BASE_URLS.GITHUB_RAW_MAIN_IMG}/God%20Info`,
  SKINS: `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/app/data/Icons/Wallpapers`,
  VOICE_AUDIO: `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/app/data/VoiceAudio`,
  ROLE_ICONS: `${REMOTE_BASE_URLS.GITHUB_RAW_MASTER}/app/data/Icons/Role%20Icons`,
  PROFILE_BANNERS: `${REMOTE_BASE_URLS.GITHUB_RAW_MAIN_IMG}/Profile%20Banner`,
  BADGES: `${REMOTE_BASE_URLS.GITHUB_RAW_MAIN_IMG}/Badges`,
} as const;

export const EXTERNAL_LINKS = {
  OPEN_BETA_27_NOTES: `${REMOTE_BASE_URLS.SMITE2_NEWS}/open-beta-27-update-notes/`,
  SMITE2_NEWS_HOME: REMOTE_BASE_URLS.SMITE2_NEWS,
  SMITE2_NEWS_HOME_TRAILING: `${REMOTE_BASE_URLS.SMITE2_NEWS}/`,
  OPEN_BETA_27_IMAGE: `${REMOTE_BASE_URLS.WEB_CDN}/Blog_Header_Promo_Assets_2560x695_1_675d416095.png`,
  SMITE2_NEWS_IMAGE: `${REMOTE_BASE_URLS.WEB_CDN}/BLOG_Header_SMITE_2_2560x695_6f634f8313.jpg`,
  BADGES_API: `${REMOTE_BASE_URLS.GITHUB_API}/repos/YungSonix/Smite2Mastery/contents/img/Badges`,
  TERMS_POLICY: `${REMOTE_BASE_URLS.TERMSFEED}/live/39fa5ec6-7ecb-4684-b2e2-99a6b1e4cde3`,
  TRACKER_SMITE2_HOME: REMOTE_BASE_URLS.TRACKER_GG_SMITE2,
} as const;

export const NETWORK_TIMINGS_MS = {
  WEB_INIT_DELAY: 100,
  NATIVE_INIT_DELAY: 500,
  VOX_DOUBLE_TAP_GUARD: 90,
  VOX_SAME_CATEGORY_COOLDOWN: 2500,
  VOX_UPDATE_INTERVAL: 100,
  VOX_CLEANUP_TIMEOUT: 12000,
} as const;

export const RESOURCE_HINT_DOMAINS = [
  'https://raw.githubusercontent.com',
  'https://yt3.googleusercontent.com',
  'https://yt3.ggpht.com',
] as const;
