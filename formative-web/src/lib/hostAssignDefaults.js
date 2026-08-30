import { ASSIGN_SETTINGS_KEYS, DEFAULT_QUIZ_SETTINGS, mergeQuizSettings } from './quizSettings';

const STORAGE_KEY = 'triviaHostDefaultAssign';

export function loadHostAssignDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const out = {};
    for (const key of ASSIGN_SETTINGS_KEYS) {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) out[key] = parsed[key];
    }
    for (const key of ['randomize_order', 'shuffle_questions', 'require_all', 'partial_credit_multiple_selection']) {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) out[key] = parsed[key];
    }
    return out;
  } catch {
    return null;
  }
}

export function saveHostAssignDefaults(settings) {
  const merged = mergeQuizSettings(settings);
  const out = {};
  for (const key of ASSIGN_SETTINGS_KEYS) {
    out[key] = merged[key];
  }
  for (const key of ['randomize_order', 'shuffle_questions', 'require_all', 'partial_credit_multiple_selection']) {
    out[key] = merged[key];
  }
  out.show_scores = false;
  out.show_answers = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
}

export function applyHostAssignDefaults(settings) {
  const defaults = loadHostAssignDefaults();
  if (!defaults) return mergeQuizSettings(settings);
  return mergeQuizSettings({ ...DEFAULT_QUIZ_SETTINGS, ...defaults, ...settings });
}
