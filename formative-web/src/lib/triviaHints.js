import catalog from './triviaRemixCatalog.json' with { type: 'json' };
import godMeta from './triviaGodMeta.json' with { type: 'json' };

export const LIFELINES_PER_ATTEMPT = 3;
export const HINTS_PER_QUESTION = 3;

export const HINT_MULTIPLIER = {
  0: 1,
  1: 0.75,
  2: 0.5,
  3: 0.35,
};

const NO_HINT_TYPES = new Set([
  'true_false',
  'image',
  'content',
  'audio',
  'video',
  'text',
  'embed',
  'file_response',
  'audio_response',
  'drawing',
  'hot_spot',
  'categorize',
  'ordering',
  'drag_drop',
  'graphing',
]);

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function lettersOnly(s) {
  return String(s || '').replace(/[^a-zA-Z]/g, '');
}

function promptPlain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{blank\}\}/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaForGod(name) {
  if (!name) return null;
  if (godMeta[name]) return godMeta[name];
  const key = Object.keys(godMeta).find((k) => norm(k) === norm(name));
  return key ? godMeta[key] : null;
}

function itemByName(name) {
  if (!name) return null;
  return (catalog.items || []).find((i) => norm(i.name) === norm(name)) || null;
}

function dominantStat(item) {
  const stats = item?.stats || {};
  let best = null;
  let bestAbs = 0;
  for (const [k, v] of Object.entries(stats)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) continue;
    if (Math.abs(n) >= bestAbs) {
      bestAbs = Math.abs(n);
      best = k;
    }
  }
  return best;
}

function choiceList(q) {
  return Array.isArray(q?.options) ? q.options.map((o) => String(o ?? '')) : [];
}

function mcCorrectLabel(q) {
  const opts = choiceList(q);
  const idx = Number(q?.correct?.index);
  if (Number.isFinite(idx) && opts[idx] != null) return String(opts[idx]);
  return null;
}

function mcCorrectLabels(q) {
  const opts = choiceList(q);
  const indices = Array.isArray(q?.correct?.indices) ? q.correct.indices.map(Number) : [];
  if (indices.length) return indices.map((i) => opts[i]).filter((s) => s != null && String(s) !== '');
  const one = mcCorrectLabel(q);
  return one ? [one] : [];
}

function shortAnswerToken(q) {
  const answers = q?.correct?.answers;
  if (!Array.isArray(answers) || !answers.length) return '';
  return String(answers[0] || '').trim();
}

function firstLetterUnique(answer, options) {
  const a = lettersOnly(answer)[0];
  if (!a) return true;
  const needle = a.toLowerCase();
  const hits = (options || []).filter((o) => lettersOnly(o)[0]?.toLowerCase() === needle);
  return hits.length <= 1;
}

function greyWrongLine(options, correctLabels) {
  const correct = new Set((correctLabels || []).map(norm));
  const wrong = (options || []).find((o) => o && !correct.has(norm(o)));
  if (!wrong) return null;
  return `You can ignore “${wrong}”.`;
}

function hangmanTiers(word) {
  const letters = lettersOnly(word);
  if (letters.length < 3) return [];
  const first = letters[0].toUpperCase();
  const len = letters.length;
  const mask = letters
    .split('')
    .map((ch, i) => (i === 0 || i === 1 || i === len - 1 ? ch : '_'))
    .join(' ');
  return [`Starts with ${first}.`, `${len} letters.`, mask];
}

function godFactTiers(godName, options) {
  const meta = metaForGod(godName);
  const out = [];
  if (meta?.pantheon) out.push(`This god is ${meta.pantheon}.`);
  if (meta?.role) out.push(`This god’s role is ${meta.role}.`);
  if (godName && options?.length && !firstLetterUnique(godName, options)) {
    const L = lettersOnly(godName)[0];
    if (L) out.push(`The name starts with ${L.toUpperCase()}.`);
  } else {
    const grey = greyWrongLine(options, [godName]);
    if (grey) out.push(grey);
  }
  return out.slice(0, HINTS_PER_QUESTION);
}

function inferKind(q) {
  const kind = String(q?.meta?.remix_kind || '');
  if (kind) return kind;
  const prompt = promptPlain(q?.prompt);
  if (/voice line belongs/i.test(prompt)) return 'voice_line';
  if (/skin belongs/i.test(prompt)) return 'skin_guess';
  if (/(?:came|released)\s+after/i.test(prompt)) return 'release_after';
  if (/what is this item called|name of this item/i.test(prompt)) return 'item_identify';
  if (q?.meta?.kind === 'fill_blank' || /aspect of/i.test(prompt)) return 'aspect_blank';
  if (/released in\s*(OB|Open Beta)/i.test(prompt)) return 'ob_release';
  const opts = choiceList(q);
  if (opts.length && opts.every((o) => /^-?\d+(\.\d+)?%?$/.test(String(o).trim()))) return 'item_stat';
  if (q?.type === 'matching' || q?.meta?.kind === 'match_table') return 'matching';
  if (q?.type === 'multiple_selection') return 'pick_all';
  if (q?.type === 'short_answer' || q?.meta?.kind === 'fill_blank') return 'short_answer';
  if (q?.type === 'multiple_choice' || q?.type === 'dropdown') return 'mc_generic';
  return '';
}

export function generateHintList(q) {
  if (!q || q.meta?.is_discord_gate || q.meta?.is_ingame_gate) return [];
  const type = String(q.type || '');
  if (NO_HINT_TYPES.has(type) || q.meta?.kind === 'free_response') return [];

  const kind = inferKind(q);
  const opts = choiceList(q);
  const labels = mcCorrectLabels(q);
  const godGuess = labels[0] || q?.meta?.hint_context?.god || '';

  if (kind === 'voice_line' || kind === 'skin_guess' || kind === 'ob_release') {
    return godFactTiers(godGuess, opts);
  }

  if (kind === 'release_after' || kind === 'pick_all') {
    const k = labels.length || Number(q?.meta?.hint_context?.correct_count) || 0;
    const out = [];
    if (k > 0) out.push(`${k} of these options are correct.`);
    const pan = labels.map((n) => metaForGod(n)?.pantheon).filter(Boolean);
    const shared = pan[0];
    if (shared) out.push(`At least one correct answer is ${shared}.`);
    const grey = greyWrongLine(opts, labels);
    if (grey) out.push(grey);
    return out.slice(0, HINTS_PER_QUESTION);
  }

  if (kind === 'item_identify') {
    const name = labels[0] || shortAnswerToken(q);
    const item = itemByName(name);
    if (opts.length >= 3) {
      const out = [];
      if (item?.tier === 'starter' || item?.tier === 0) out.push('This is a starter.');
      else if (item?.tier) out.push(`This item is tier ${item.tier}.`);
      const stat = dominantStat(item);
      if (stat) out.push(`Its main stat is ${stat}.`);
      const grey = greyWrongLine(opts, [name]);
      if (name && !firstLetterUnique(name, opts)) {
        const L = lettersOnly(name)[0];
        if (L) out.push(`The name starts with ${L.toUpperCase()}.`);
      } else if (grey) {
        out.push(grey);
      }
      return out.slice(0, HINTS_PER_QUESTION);
    }
    return hangmanTiers(name);
  }

  if (kind === 'item_stat') {
    const nums = opts.map((o) => Number(String(o).replace(/%/g, ''))).filter((n) => Number.isFinite(n));
    const correct = Number(String(labels[0] || shortAnswerToken(q)).replace(/%/g, ''));
    const out = [];
    if (Number.isFinite(correct)) {
      const pad = Math.max(1, Math.round(Math.abs(correct) * 0.25) || 1);
      out.push(`The value is between ${correct - pad} and ${correct + pad}.`);
      out.push(`The value is ${correct % 2 === 0 ? 'even' : 'odd'}.`);
      const last = Math.abs(Math.round(correct)) % 10;
      const uniqueLast = nums.filter((n) => Math.abs(Math.round(n)) % 10 === last).length <= 1;
      if (uniqueLast) {
        const grey = greyWrongLine(opts, labels);
        if (grey) out.push(grey);
      } else {
        out.push(`The last digit is ${last}.`);
      }
    }
    return out.slice(0, HINTS_PER_QUESTION);
  }

  if (kind === 'aspect_blank' || q?.meta?.kind === 'fill_blank') {
    return hangmanTiers(shortAnswerToken(q) || labels[0] || '');
  }

  if (kind === 'matching') {
    const rows = Array.isArray(q?.correct?.pairs) ? q.correct.pairs : [];
    const out = [];
    const firstRight = rows[0]?.right || rows[0]?.[1];
    const god = firstRight && metaForGod(firstRight) ? firstRight : null;
    if (god) {
      const meta = metaForGod(god);
      if (meta?.pantheon) out.push(`One match is a ${meta.pantheon} god.`);
    }
    const token = String(firstRight || '');
    if (token && lettersOnly(token).length >= 3) {
      const L = lettersOnly(token)[0];
      out.push(`One right-side label starts with ${L.toUpperCase()}.`);
    }
    const grey = greyWrongLine(
      rows.map((r) => r?.right || r?.[1]).filter(Boolean),
      [firstRight].filter(Boolean)
    );
    if (grey) out.push(grey);
    return out.slice(0, HINTS_PER_QUESTION);
  }

  if (kind === 'short_answer' || type === 'short_answer') {
    const token = shortAnswerToken(q);
    if (lettersOnly(token).length >= 3 && String(token).split(/\s+/).length <= 3) {
      return hangmanTiers(token);
    }
    return [];
  }

  if (kind === 'mc_generic' || type === 'multiple_choice' || type === 'dropdown') {
    const name = labels[0] || '';
    if (metaForGod(name)) return godFactTiers(name, opts);
    if (itemByName(name)) {
      return generateHintList({ ...q, meta: { ...(q.meta || {}), remix_kind: 'item_identify' } });
    }
    const grey = greyWrongLine(opts, labels);
    const hang = hangmanTiers(name);
    const out = [];
    if (hang[0] && !firstLetterUnique(name, opts)) out.push(hang[0]);
    if (hang[1]) out.push(hang[1]);
    if (grey) out.push(grey);
    else if (hang[2]) out.push(hang[2]);
    return out.slice(0, HINTS_PER_QUESTION);
  }

  return [];
}

export function questionHintUiAllowed(q) {
  if (!q) return false;
  if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate) return false;
  const type = String(q.type || '');
  if (NO_HINT_TYPES.has(type)) return false;
  if (q.meta?.kind === 'free_response') return false;
  return true;
}

export function questionCanHaveHints(q) {
  return questionHintUiAllowed(q) && generateHintList(q).some(Boolean);
}

export function lifelineMultiplier(used) {
  const n = Math.max(0, Math.min(HINTS_PER_QUESTION, Number(used) || 0));
  return HINT_MULTIPLIER[n] ?? 0.35;
}

export function storedHintList(q) {
  const raw = q?.meta?.hints;
  if (!Array.isArray(raw)) return ['', '', ''];
  return [0, 1, 2].map((i) => String(raw[i] || '').trim());
}

export function resolvedHintList(q) {
  const stored = storedHintList(q);
  if (stored.some(Boolean)) {
    const gen = generateHintList(q);
    return stored.map((s, i) => s || gen[i] || '');
  }
  const gen = generateHintList(q);
  return [0, 1, 2].map((i) => gen[i] || '');
}

export function withGeneratedHints(question, { enable = true, overwrite = false } = {}) {
  if (!question) return question;
  const prev = storedHintList(question);
  const gen = generateHintList(question);
  const hints = overwrite
    ? [0, 1, 2].map((i) => gen[i] || '')
    : [0, 1, 2].map((i) => prev[i] || gen[i] || '');
  return {
    ...question,
    meta: {
      ...(question.meta || {}),
      hints_enabled: enable ? true : Boolean(question.meta?.hints_enabled),
      hints,
    },
  };
}

export function mergeLifelineCounts(a, b) {
  const out = { ...(a && typeof a === 'object' ? a : {}) };
  for (const [k, v] of Object.entries(b && typeof b === 'object' ? b : {})) {
    out[k] = Math.min(HINTS_PER_QUESTION, Math.max(Number(out[k]) || 0, Number(v) || 0));
  }
  return out;
}

export function totalLifelinesUsed(map) {
  if (!map || typeof map !== 'object') return 0;
  return Object.values(map).reduce((s, n) => s + (Number(n) || 0), 0);
}
