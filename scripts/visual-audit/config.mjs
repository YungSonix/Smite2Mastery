/** Visual audit defaults — Playwright captures against local Expo web. */
export const DEFAULT_BASE_URL = process.env.VISUAL_AUDIT_URL || 'http://localhost:8081';
export const SHOTS_DIR = 'scripts/visual-audit/shots';
export const LATEST_DIR = 'scripts/visual-audit/latest';
export const QUEUE_DIR = 'scripts/visual-audit/queue';

export const VIEWPORTS = {
  mobile: { width: 390, height: 844, label: 'mobile' },
  desktop: { width: 1440, height: 900, label: 'desktop' },
};

/** Max images per council convene (panel limit). */
export const COUNCIL_ATTACHMENT_LIMIT = 8;

/**
 * Navigation scenarios — each returns after the target screen is visible.
 * Clicks use accessibility labels on desktop web nav chips.
 */
export const SCENARIOS = [
  {
    id: 'home',
    label: 'Home',
    steps: [{ type: 'main', label: 'Home' }],
    readyText: 'SMITE 2',
  },
  {
    id: 'database-gods',
    label: 'Database — Gods',
    steps: [{ type: 'main', label: 'Database' }],
    readyText: 'Gods',
  },
  {
    id: 'builds-browse',
    label: 'Builds — Browse',
    steps: [{ type: 'main', label: 'Builds' }],
    readyText: 'Featured',
  },
  {
    id: 'builds-tierlists',
    label: 'Builds — Tierlists',
    steps: [
      { type: 'main', label: 'Builds' },
      { type: 'text', label: 'Browse tierlists' },
    ],
    readyText: 'New Player',
  },
  {
    id: 'custom-builder',
    label: 'Custom Builder',
    steps: [
      { type: 'main', label: 'Builds' },
      { type: 'text', label: 'Custom Builder' },
    ],
    readyText: 'Select God',
  },
  {
    id: 'patchhub',
    label: 'Patch Hub',
    steps: [{ type: 'main', label: 'Patch Hub' }],
    readyText: 'Patch',
  },
  {
    id: 'more-minigames',
    label: 'More — Mini Games',
    steps: [{ type: 'main', label: 'More' }],
    readyText: 'Wordle',
  },
];
