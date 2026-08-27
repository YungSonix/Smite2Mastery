const CONTENT_TYPES = new Set(['image', 'content', 'audio', 'video', 'embed']);

export function isGateQuestion(q) {
  return Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);
}

export function isContentQuestion(q) {
  return CONTENT_TYPES.has(q?.type);
}

export function isScoredQuestion(q) {
  if (!q || isContentQuestion(q) || isGateQuestion(q)) return false;
  return Number(q.points) > 0;
}

/** Human-readable answer text for host review (MC/TF/multi/matching/etc.). */
export function formatResponseAnswer(q, raw, response) {
  if (q?.meta?.is_discord_gate) {
    return response?.discord_username || (typeof raw === 'string' && raw.trim() ? raw : null);
  }
  if (q?.meta?.is_ingame_gate) {
    return response?.ingame_name || (typeof raw === 'string' && raw.trim() ? raw : null);
  }
  if (raw == null || raw === '') return null;

  const optLabel = (opt) => {
    if (opt == null) return null;
    if (typeof opt === 'string' || typeof opt === 'number') return String(opt);
    if (typeof opt === 'object') {
      return String(opt.text ?? opt.label ?? opt.value ?? opt.name ?? '').trim() || null;
    }
    return String(opt);
  };

  const type = q?.type;
  if (type === 'multiple_choice' || type === 'true_false' || type === 'dropdown') {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
      const idx = Number(raw);
      return optLabel(opts[idx]) ?? String(raw);
    }
    return String(raw);
  }
  if (type === 'multiple_selection') {
    const opts = Array.isArray(q.options) ? q.options : [];
    const idxs = Array.isArray(raw)
      ? raw.map(Number)
      : String(raw)
          .split(',')
          .map((x) => Number(x.trim()))
          .filter((n) => Number.isFinite(n));
    if (!idxs.length) return String(raw);
    return idxs.map((i) => optLabel(opts[i]) ?? `#${i}`).join(', ');
  }
  if (type === 'matching' || type === 'categorize') {
    if (raw && typeof raw === 'object') {
      return Object.entries(raw)
        .map(([k, v]) => `${k} → ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
    }
    return String(raw);
  }
  if (type === 'ordering' || type === 'drag_drop') {
    if (Array.isArray(raw)) return raw.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return String(raw);
  }
  if (type === 'hot_spot' && raw && typeof raw === 'object') {
    return `x: ${raw.x}, y: ${raw.y}`;
  }
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

/** Convert stored per_question value (0/1 fraction or points) to earned points. */
export function earnedFromStored(stored, maxPts) {
  if (stored == null || stored === '') return null;
  const n = Number(stored);
  if (!Number.isFinite(n)) return null;
  if (maxPts > 0 && n >= 0 && n <= 1) return n * maxPts;
  return n;
}
