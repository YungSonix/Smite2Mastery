import { EXTERNAL_LINKS } from './networkConfig';

export const APP_VERSION_CONFIG = {
  currentVersion: '2.2.0',
  previousVersion: '2.1.0',
  updateNotes: [
    'Interactive Conquest map — day/night toggle and tap POIs for towers, camps, bosses, and objectives.',
    'Profile refresh — grouped settings, theme colors with gradient border glow, and smoother tab switching.',
    'Partners show live display names and a green verified checkmark on contributor builds.',
    'Cloud sync runs automatically when you sign in — no separate Connect step.',
    'Name effect previews in Profile are easier to read when picking animations.',
  ],
} as const;

export const VERSION_HISTORY = [
  {
    version: '2.2.0',
    date: '2026-07-10',
    updateNotes: [
      'Interactive Conquest map — day/night toggle and tap POIs for towers, camps, bosses, and objectives.',
      'Profile refresh — grouped settings, theme colors with gradient border glow, and smoother tab switching.',
      'Partners show live display names and a green verified checkmark on contributor builds.',
      'Cloud sync runs automatically when you sign in — no separate Connect step.',
      'Name effect previews in Profile are easier to read when picking animations.',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-01-21',
    updateNotes: [
      'Gods slider now draggable.',
      'Added new channels to Guides section',
      'Updated home page.',
      'Made improvements while in a god/item page.',
      'Improved Web performance.',
      'Fixed some bugs.',
    ],
  },
  {
    version: '1.1.0',
    date: '2025-12-09',
    updateNotes: [
      'Gods slider now draggable.',
      'Added new channels to Guides section',
      'Updated home page.',
      'Made improvements while in a god/item page.',
      'Improved Web performance.',
      'Fixed some bugs.',
    ],
  },
  {
    version: '1.0.0',
    date: '2025-12-07',
    updateNotes: [
      'Initial release of the SMITE 2 App.',
      'Added app review form and bug report form.',
      'Added update status section to the home page.',
    ],
  },
] as const;

export const NEWS_CONFIG = {
  openBeta: {
    version: 38,
    title: 'Open Beta 38 — Chronos, Keeper of Time',
    link: EXTERNAL_LINKS.OPEN_BETA_38_NOTES,
    image: EXTERNAL_LINKS.OPEN_BETA_27_IMAGE,
    snippet: 'Chronos joins the roster. Global base stat pass, penetration shifts, and Spear of the Magus.',
  },
  latestNews: {
    title: 'SMITE 2 News',
    link: EXTERNAL_LINKS.SMITE2_NEWS_HOME,
    image: EXTERNAL_LINKS.SMITE2_NEWS_IMAGE,
    snippet: 'Stay updated with the latest SMITE 2 news, patch notes, and updates.',
  },
} as const;

export const BUILD_AUTHORS = {
  FEATURED: ['mytharria', 'mendar'],
  CONTRIBUTORS: [''],
} as const;

/** Smite Wars is hidden (TBD) for public users until `public` is true. */
export const SMITE_WARS_ACCESS = {
  public: false,
  /** Lowercase usernames that can open Smite Wars while it is TBD. */
  devUsernames: ['mytharria'],
} as const;
