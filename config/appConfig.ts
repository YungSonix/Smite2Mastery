import { EXTERNAL_LINKS } from './networkConfig';

export const APP_VERSION_CONFIG = {
  currentVersion: '2.1.0',
  previousVersion: '2.0.0',
  updateNotes: [
    'Added new Custom Builds page.',
    'Added new Community Builds page.',
    'Added new Certification Builds page.',
  ],
} as const;

export const VERSION_HISTORY = [
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
    version: 27,
    title: 'Open Beta 27 - The Great Teacher Update',
    link: EXTERNAL_LINKS.OPEN_BETA_27_NOTES,
    image: EXTERNAL_LINKS.OPEN_BETA_27_IMAGE,
    snippet: 'Read the latest SMITE 2 Open Beta update notes and patch information.',
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
