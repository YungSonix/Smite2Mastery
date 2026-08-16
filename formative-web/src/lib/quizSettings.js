/** Format host-facing IP labels. */
export function formatIp(ip) {
  const raw = String(ip || '').trim();
  if (!raw) return '—';
  if (
    raw === '::1' ||
    raw === '127.0.0.1' ||
    raw === '::ffff:127.0.0.1' ||
    raw === 'localhost'
  ) {
    return 'localhost';
  }
  return raw;
}

export const DEFAULT_QUIZ_SETTINGS = {
  instructions: '',
  allow_retake: false,
  after_submission: 'hidden',
  show_scores: false,
  show_answers: false,
  time_limit_seconds: 0,
  opens_at: '',
  closes_at: '',
  discord_field_label: '',
  ingame_field_label: '',
  theme: 'scroll',
  theme_mode: '',
  theme_accent: '',
  theme_secondary: '',
  theme_page: '',
  theme_card: '',
  theme_text: '',
  theme_border: '',
  theme_font: '',
  theme_corners: 'round',
  theme_pattern: '',
  theme_density: 'cozy',
  randomize_order: false,
  shuffle_questions: false,
  require_all: false,
  auto_random_questions: false,
  lifelines_enabled: false,
};

export function quizWindowState(settings, nowMs = Date.now()) {
  const opensRaw = settings?.opens_at;
  const closesRaw = settings?.closes_at;
  const opens = opensRaw ? Date.parse(opensRaw) : NaN;
  const closes = closesRaw ? Date.parse(closesRaw) : NaN;
  if (Number.isFinite(opens) && nowMs < opens) {
    return { status: 'not_open', opensAt: opensRaw, closesAt: closesRaw || null };
  }
  if (Number.isFinite(closes) && nowMs > closes) {
    return { status: 'closed', opensAt: opensRaw || null, closesAt: closesRaw };
  }
  return { status: 'open', opensAt: opensRaw || null, closesAt: closesRaw || null };
}

export function mergeQuizSettings(settings) {
  return { ...DEFAULT_QUIZ_SETTINGS, ...(settings && typeof settings === 'object' ? settings : {}) };
}
