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
};

export function mergeQuizSettings(settings) {
  return { ...DEFAULT_QUIZ_SETTINGS, ...(settings && typeof settings === 'object' ? settings : {}) };
}
