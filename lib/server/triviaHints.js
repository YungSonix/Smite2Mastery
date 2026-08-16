const HINTS_PER_QUESTION = 3;
const LIFELINES_PER_ATTEMPT = 3;
const HINT_MULTIPLIER = { 0: 1, 1: 0.75, 2: 0.5, 3: 0.35 };

function lifelineMultiplier(used) {
  const n = Math.max(0, Math.min(HINTS_PER_QUESTION, Number(used) || 0));
  return HINT_MULTIPLIER[n] ?? 0.35;
}

function storedHintList(q) {
  const raw = q?.meta?.hints;
  if (!Array.isArray(raw)) return ['', '', ''];
  return [0, 1, 2].map((i) => String(raw[i] || '').trim());
}

function questionHintsEnabled(q) {
  if (!q?.meta?.hints_enabled) return false;
  if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate) return false;
  return storedHintList(q).some(Boolean);
}

function mergeLifelineCounts(a, b) {
  const out = { ...(a && typeof a === 'object' ? a : {}) };
  for (const [k, v] of Object.entries(b && typeof b === 'object' ? b : {})) {
    out[k] = Math.min(HINTS_PER_QUESTION, Math.max(Number(out[k]) || 0, Number(v) || 0));
  }
  return out;
}

function totalLifelinesUsed(map) {
  if (!map || typeof map !== 'object') return 0;
  return Object.values(map).reduce((s, n) => s + (Number(n) || 0), 0);
}

function extractLifelines(answers) {
  const raw = answers && typeof answers === 'object' ? answers.__lifelines : null;
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = Math.min(HINTS_PER_QUESTION, Math.max(0, Number(v) || 0));
  }
  return out;
}

module.exports = {
  HINTS_PER_QUESTION,
  LIFELINES_PER_ATTEMPT,
  HINT_MULTIPLIER,
  lifelineMultiplier,
  storedHintList,
  questionHintsEnabled,
  mergeLifelineCounts,
  totalLifelinesUsed,
  extractLifelines,
};
