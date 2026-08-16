/** Form palettes: paper + ink + one accent. Default is cream, navy, gold. */

export const QUIZ_FONTS = [
  { id: 'basic', label: 'Basic', family: "'Sora', system-ui, sans-serif" },
  { id: 'display', label: 'Display', family: "'Outfit', system-ui, sans-serif" },
  { id: 'formal', label: 'Formal', family: "'Source Serif 4', Georgia, serif" },
  { id: 'playful', label: 'Playful', family: "'Nunito', system-ui, sans-serif" },
];

export const QUIZ_CORNERS = [
  { id: 'sharp', label: 'Sharp', radius: '4px' },
  { id: 'round', label: 'Round', radius: '14px' },
  { id: 'pill', label: 'Soft', radius: '22px' },
];

export const QUIZ_PATTERNS = [
  { id: 'none', label: 'Plain' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
  { id: 'wash', label: 'Wash' },
];

const DARK_SURFACES = {
  page: '#1a1620',
  card: '#2a2430',
  text: '#f7f3ea',
  border: '#4a4250',
};

const LIGHT_SURFACES = {
  page: '#ece8df',
  card: '#f4f1ea',
  text: '#2c3546',
  border: '#d4cbb8',
};

const THEME_ALIASES = {
  indigo: 'ink',
  violet: 'ink',
  rose: 'clay',
  ember: 'clay',
  forge: 'clay',
  forest: 'sage',
  teal: 'sage',
  slate: 'cyan',
  aegean: 'bluebook',
  goldleaf: 'scroll',
  sand: 'clay',
  paper: 'bluebook',
  magenta: 'clay',
  lime: 'sage',
  orange: 'clay',
};

export const QUIZ_THEMES = [
  {
    id: 'scroll',
    label: 'Scroll',
    mode: 'light',
    page: '#ece8df',
    card: '#f4f1ea',
    text: '#2c3546',
    border: '#d4cbb8',
    accent: '#5b8ab0',
    secondary: '#c4a35a',
    font: 'formal',
    pattern: 'none',
    dark: {
      page: '#14182a',
      card: '#1c2238',
      text: '#ece8df',
      border: '#3d4a63',
      accent: '#7aa3c4',
      secondary: '#d4b45a',
    },
  },
  {
    id: 'bluebook',
    label: 'Bluebook',
    mode: 'light',
    page: '#e8edf3',
    card: '#f3f6fa',
    text: '#243044',
    border: '#c5d0de',
    accent: '#4d7eb0',
    secondary: '#c4a35a',
    font: 'basic',
  },
  {
    id: 'clay',
    label: 'Clay',
    mode: 'light',
    page: '#f3e4d4',
    card: '#fff6ec',
    text: '#2b1d14',
    border: '#e0c4a4',
    accent: '#8c3f24',
    secondary: '#2c4a6e',
    font: 'playful',
  },
  {
    id: 'sage',
    label: 'Sage',
    mode: 'light',
    page: '#eef3ec',
    card: '#f4f7f3',
    text: '#1c2b21',
    border: '#c9d6c4',
    accent: '#3d6b4f',
    secondary: '#c4a056',
    font: 'basic',
  },
  {
    id: 'ink',
    label: 'Ink',
    mode: 'dark',
    page: '#2a222b',
    card: '#3a303c',
    text: '#faf9fb',
    border: '#564b58',
    accent: '#e8d5a3',
    secondary: '#9bb4d0',
    font: 'formal',
  },
  {
    id: 'cyan',
    label: 'Arena',
    mode: 'dark',
    page: '#070b14',
    card: '#0b1220',
    text: '#f8fafc',
    border: '#1e3a5f',
    accent: '#7dd3fc',
    secondary: '#93c5fd',
    font: 'display',
  },
];

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [31, 78, 121];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function onAccentColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? '#14213d' : '#ffffff';
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function quizThemeId(settings) {
  let id = String(settings?.theme || 'scroll');
  if (THEME_ALIASES[id]) id = THEME_ALIASES[id];
  return QUIZ_THEMES.some((t) => t.id === id) ? id : 'scroll';
}

export function presetById(id) {
  const mapped = THEME_ALIASES[id] || id;
  return QUIZ_THEMES.find((t) => t.id === mapped) || QUIZ_THEMES[0];
}

export function paletteForMode(preset, mode) {
  if (mode === 'dark') {
    return preset.dark ? { ...preset, ...preset.dark } : preset.mode === 'dark' ? preset : { ...preset, ...DARK_SURFACES };
  }
  return preset.light ? { ...preset, ...preset.light } : preset.mode === 'light' ? preset : { ...preset, ...LIGHT_SURFACES };
}

const STALE_SCROLL = {
  accent: new Set(['#1f4e79', '#5b7c9d']),
  page: new Set(['#f6f0e4', '#f3f5f9']),
  card: new Set(['#fffef8', '#ffffff']),
  text: new Set(['#14213d', '#1c2436']),
  border: new Set(['#e4d5b5', '#d7c9a8']),
  secondary: new Set(['#c9a227', '#c4a056']),
};

function liveHex(settings, key, fallback, stale) {
  const raw = String(settings?.[key] || '').toLowerCase();
  if (!raw || stale?.has(raw)) return fallback;
  return settings[key];
}

export function resolvedQuizTheme(settings) {
  const preset = presetById(quizThemeId(settings));
  const mode = settings?.theme_mode === 'light' || settings?.theme_mode === 'dark'
    ? settings.theme_mode
    : preset.mode;
  const surfaces = paletteForMode(preset, mode);
  const stale = preset.id === 'scroll' ? STALE_SCROLL : null;
  return {
    id: preset.id,
    label: preset.label,
    mode,
    accent: liveHex(settings, 'theme_accent', surfaces.accent || preset.accent, stale?.accent),
    secondary: liveHex(settings, 'theme_secondary', surfaces.secondary || preset.secondary || preset.accent, stale?.secondary),
    page: liveHex(settings, 'theme_page', surfaces.page, stale?.page),
    card: liveHex(settings, 'theme_card', surfaces.card, stale?.card),
    text: liveHex(settings, 'theme_text', surfaces.text, stale?.text),
    border: liveHex(settings, 'theme_border', surfaces.border, stale?.border),
    font: settings?.theme_font || preset.font || 'formal',
    corners: settings?.theme_corners || 'round',
    pattern: settings?.theme_pattern || preset.pattern || 'none',
    density: settings?.theme_density || 'cozy',
  };
}

export function quizThemeStyle(settings) {
  const t = resolvedQuizTheme(settings);
  const font = QUIZ_FONTS.find((f) => f.id === t.font) || QUIZ_FONTS[2];
  const corners = QUIZ_CORNERS.find((c) => c.id === t.corners) || QUIZ_CORNERS[1];
  const pad = t.density === 'compact' ? '10px 12px' : '16px 18px';
  return {
    '--f-blue': t.accent,
    '--f-blue-hover': t.accent,
    '--f-blue-soft': rgba(t.accent, 0.16),
    '--f-blue-border': rgba(t.accent, 0.42),
    '--f-page': t.page,
    '--f-card': t.card,
    '--f-text': t.text,
    '--f-body': t.text,
    '--f-muted': rgba(t.text, 0.7),
    '--f-label': t.secondary,
    '--f-border': t.border,
    '--f-sidebar': t.mode === 'light' ? t.page : t.card,
    '--f-panel': t.card,
    '--f-panel-alt': t.page,
    '--f-input': t.mode === 'light' ? rgba(t.text, 0.04) : rgba(t.text, 0.08),
    '--f-input-hover': rgba(t.accent, 0.12),
    '--f-input-border': t.border,
    '--f-close': t.text,
    '--f-font': font.family,
    '--f-display': font.family,
    '--f-radius': corners.radius,
    '--f-qcard-radius': corners.radius,
    '--f-qcard-pad': pad,
    '--f-on-accent': onAccentColor(t.accent),
    '--f-shadow': t.mode === 'light' ? '0 10px 28px rgba(20, 33, 61, 0.08)' : '0 12px 40px rgba(0, 0, 0, 0.45)',
    '--f-totals': t.mode === 'light' ? rgba(t.accent, 0.2) : 'rgba(125, 211, 252, 0.18)',
  };
}

export function quizThemeClass(settings) {
  const t = resolvedQuizTheme(settings);
  return `f-theme-${t.id} f-theme-mode-${t.mode} f-theme-pattern-${t.pattern}`;
}

export function quizThemeProps(settings) {
  return {
    className: quizThemeClass(settings),
    style: quizThemeStyle(settings),
  };
}

export function applyPresetPatch(id, mode) {
  const p = presetById(id);
  const nextMode = mode === 'light' || mode === 'dark' ? mode : p.mode;
  const pal = paletteForMode(p, nextMode);
  return {
    theme: p.id,
    theme_mode: nextMode,
    theme_accent: pal.accent || p.accent,
    theme_secondary: pal.secondary || p.secondary || p.accent,
    theme_page: pal.page,
    theme_card: pal.card,
    theme_text: pal.text,
    theme_border: pal.border,
    theme_font: p.font || 'formal',
    theme_pattern: p.pattern || 'none',
  };
}

export function applyModePatch(settings, mode) {
  const pal = paletteForMode(presetById(quizThemeId(settings)), mode);
  return {
    theme_mode: mode,
    theme_page: pal.page,
    theme_card: pal.card,
    theme_text: pal.text,
    theme_border: pal.border,
    theme_accent: pal.accent || settings?.theme_accent || '',
    theme_secondary: pal.secondary || settings?.theme_secondary || '',
  };
}
