export const ENV_KEYS = {
  EXPO_PUBLIC_SUPABASE_URL: 'EXPO_PUBLIC_SUPABASE_URL',
  EXPO_PUBLIC_SUPABASE_KEY: 'EXPO_PUBLIC_SUPABASE_KEY',
} as const;

export const SUPABASE_CONFIG = {
  /** Set via EXPO_PUBLIC_SUPABASE_URL at build time — never commit real URLs/keys here. */
  FALLBACK_URL: '',
  FALLBACK_ANON_KEY: '',
  MIN_URL_LENGTH: 10,
  MIN_KEY_LENGTH: 10,
} as const;

/**
 * GitHub raw bases:
 * - `master` — slim app + JSON data (Vercel deploy branch)
 * - `assets` — large runtime blobs (voice, skins art, legacy icon dumps)
 * - `main/img` — current god/item icon uploads
 */
export const REMOTE_BASE_URLS = {
  GITHUB_RAW_MAIN_IMG: 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/main/img',
  GITHUB_RAW_MASTER: 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master',
  GITHUB_RAW_ASSETS: 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets',
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

/** Build a raw URL on the `assets` branch (repo-relative path, e.g. `app/data/VoiceAudio/...`). */
export function githubRawAssets(repoRelativePath: string): string {
  const normalized = String(repoRelativePath || '').replace(/^\/+/, '');
  return `${REMOTE_BASE_URLS.GITHUB_RAW_ASSETS}/${normalized
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')}`;
}

export const FORM_ENDPOINTS = {
  BUG_REPORT: `${REMOTE_BASE_URLS.FORMSPREE}/xqarlgol`,
  APP_REVIEW: `${REMOTE_BASE_URLS.FORMSPREE}/meoyzvyg`,
  MISSING_OR_OUTDATED: `${REMOTE_BASE_URLS.FORMSPREE}/xdkqlezy`,
} as const;

const ASSETS_DATA = `${REMOTE_BASE_URLS.GITHUB_RAW_ASSETS}/app/data`;

export const ICON_PATHS = {
  /** Current item art — `main/img/Item Icons` */
  ITEM_ICONS: `${REMOTE_BASE_URLS.GITHUB_RAW_MAIN_IMG}/Item%20Icons`,
  /** Legacy item art — `assets` branch */
  ITEM_ICONS_LEGACY: `${ASSETS_DATA}/Icons/Item%20Icons`,
  ITEM_ICONS_FILLED: `${ASSETS_DATA}/Icons/Item%20Icons%20Filled`,
  /** Current god portraits — `main/img/God Info` */
  GOD_ICONS: `${REMOTE_BASE_URLS.GITHUB_RAW_MAIN_IMG}/God%20Info`,
  ASPECT_ICONS: `${ASSETS_DATA}/AspectIcons`,
  SKINS: `${ASSETS_DATA}/Icons/Wallpapers`,
  NEW_GOD_SKINS: `${ASSETS_DATA}/NewGodSkins`,
  VOICE_AUDIO: `${ASSETS_DATA}/VoiceAudio`,
  ROLE_ICONS: `${ASSETS_DATA}/Icons/Role%20Icons`,
  RARITY_ICONS: `${ASSETS_DATA}/Icons/Rarity%20Icons`,
  STAT_ICONS: `${ASSETS_DATA}/Icons/Stat%20Icons`,
  AUDIO_FILES: `${ASSETS_DATA}/Audio%20Files`,
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
