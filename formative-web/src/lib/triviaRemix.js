import catalog from './triviaRemixCatalog.json' with { type: 'json' };
import mediaCatalog from './triviaMediaCatalog.json' with { type: 'json' };
import godMeta from './triviaGodMeta.json' with { type: 'json' };

function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickOne(list) {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function replaceWord(text, from, to) {
  if (!from || !to) return String(text || '');
  return String(text || '').replace(new RegExp(escapeRe(from), 'gi'), to);
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function blobOf(source) {
  const opts = Array.isArray(source.options) ? source.options : [];
  const answers = source.correct?.answers || [];
  const idx = Number(source.correct?.index);
  const extra = Number.isFinite(idx) ? [opts[idx]] : [];
  const multi = (source.correct?.indices || []).map((i) => opts[i]);
  return [source.prompt, ...opts, ...answers, ...extra, ...multi].filter(Boolean).join('\n');
}

function findNameInText(text, names, { min = 3 } = {}) {
  const hay = String(text || '');
  const sorted = [...names]
    .filter((n) => String(n || '').length >= min)
    .sort((a, b) => b.length - a.length);
  for (const n of sorted) {
    if (new RegExp(`\\b${escapeRe(n)}\\b`, 'i').test(hay)) return n;
  }
  return null;
}

function exactOptionHit(options, names) {
  const map = new Map(names.map((n) => [String(n).toLowerCase(), n]));
  for (const o of options || []) {
    const hit = map.get(String(o || '').trim().toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function usedNames(texts) {
  const found = new Set();
  const names = [
    ...catalog.items.map((i) => i.name),
    ...catalog.gods.map((g) => g.name),
    ...catalog.aspects.map((a) => a.god),
  ];
  for (const t of texts || []) {
    const hit = findNameInText(t, names, { min: 3 });
    if (hit) found.add(norm(hit));
  }
  return found;
}

function rewriteAspectPrompt(prompt, fromGod, toRow) {
  let next = replaceWord(prompt, fromGod, toRow.god);
  next = next.replace(/Aspect of(?: the)?\s+\{\{blank\}\}/i, () =>
    toRow.usesThe ? 'Aspect of the {{blank}}' : 'Aspect of {{blank}}'
  );
  next = next.replace(/Aspect of(?: the)?\s+_+/i, () =>
    toRow.usesThe ? 'Aspect of the ____' : 'Aspect of ____'
  );
  if (!/\{\{blank\}\}|_+/i.test(next) && /aspect of/i.test(next)) {
    const phrase = toRow.usesThe ? `Aspect of the ${toRow.blank}` : `Aspect of ${toRow.blank}`;
    next = next.replace(
      /Aspect of(?: the)?\s+[A-Za-z][A-Za-z'’\-]*(?:\s+[A-Za-z][A-Za-z'’\-]*)*/i,
      phrase
    );
  }
  return next;
}

function applySwap(source, fromName, toName, { distractors = [], image, prefer = [] } = {}) {
  const prompt = fromName ? replaceWord(source.prompt, fromName, toName) : source.prompt;
  const patch = { prompt, correct: clone(source.correct) || {} };
  if (Array.isArray(source.correct?.answers)) {
    patch.correct = { answers: [toName, String(toName).toLowerCase()] };
  }
  if (Array.isArray(source.options) && source.options.length) {
    const rest = distractors.filter((d) => norm(d) !== norm(toName) && String(d).trim());
    const unique = [];
    const seen = new Set();
    for (const d of rest) {
      const k = norm(d);
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(d);
    }
    const need = Math.max(1, (source.options || []).length - 1);
    const mixed = trickishDistractors(toName, unique, need, { prefer });
    const options = shuffle([toName, ...mixed]);
    patch.options = options;
    if (Array.isArray(source.correct?.indices)) {
      patch.correct = { indices: [options.findIndex((o) => norm(o) === norm(toName))].filter((i) => i >= 0) };
    } else {
      patch.correct = { index: options.findIndex((o) => norm(o) === norm(toName)) };
    }
  }
  if (image) {
    patch.image_url = image;
    patch.image_urls = [image];
  }
  return { patch };
}

const STAT_ALIASES = [
  ['physical protection', ['physical protection', 'physical protections', 'phys prot', 'physical defense']],
  ['magical protection', ['magical protection', 'magical protections', 'mag prot', 'magical defense']],
  ['attack speed', ['attack speed']],
  ['cooldown rate', ['cooldown rate', 'cooldown', 'cdr']],
  ['health regen', ['health regen', 'hp5']],
  ['mana regen', ['mana regen', 'mp5']],
  ['movement speed', ['movement speed', 'move speed']],
  ['attack damage', ['attack damage', 'basic attack damage']],
  ['lifesteal', ['lifesteal', 'life steal']],
  ['penetration', ['penetration', 'pen']],
  ['intelligence', ['intelligence', '\\bint\\b']],
  ['strength', ['strength', '\\bstr\\b']],
  ['health', ['health', '\\bhp\\b']],
  ['mana', ['mana', '\\bmp\\b']],
  ['cost', ['gold cost', 'total cost', '\\bcost\\b', '\\bgold\\b']],
];

function isNumericToken(s) {
  return /^-?\d+(\.\d+)?%?$/.test(String(s || '').trim());
}

function parseNumericToken(s) {
  const n = Number(String(s || '').replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function findStatsInText(text) {
  const hay = String(text || '').toLowerCase();
  const hits = [];
  for (const [key, aliases] of STAT_ALIASES) {
    for (const alias of aliases) {
      const re = alias.startsWith('\\') ? new RegExp(alias, 'i') : new RegExp(`\\b${escapeRe(alias)}\\b`, 'i');
      if (re.test(hay) && !hits.includes(key)) hits.push(key);
    }
  }
  const extra = [...new Set(catalog.items.flatMap((i) => Object.keys(i.stats || {})))];
  for (const key of extra.sort((a, b) => b.length - a.length)) {
    if (hits.includes(key)) continue;
    if (new RegExp(`\\b${escapeRe(key)}\\b`, 'i').test(hay)) hits.push(key);
  }
  return hits;
}

function itemPoolFor(fromItem, blob) {
  const mentioned = findStatsInText(blob).filter((s) => s !== 'cost' || /cost|gold/i.test(blob));
  const others = catalog.items.filter((i) => i.name !== fromItem.name);
  if (mentioned.length) {
    const withAll = others.filter((i) => mentioned.every((s) => i.stats?.[s] != null));
    if (withAll.length) return withAll;
    const withAny = others.filter((i) => mentioned.some((s) => i.stats?.[s] != null));
    if (withAny.length) return withAny;
  }
  const fromKeys = Object.keys(fromItem.stats || {});
  if (fromKeys.length && fromItem.tier) {
    const sameTierOverlap = others.filter(
      (i) => i.tier === fromItem.tier && fromKeys.some((k) => i.stats?.[k] != null)
    );
    if (sameTierOverlap.length) return sameTierOverlap;
  }
  if (fromItem.starter) {
    const starters = others.filter((i) => i.starter);
    if (starters.length) return starters;
  }
  if (fromItem.tier) {
    const sameTier = others.filter((i) => i.tier === fromItem.tier);
    if (sameTier.length) return sameTier;
  }
  return others;
}

function formatStat(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}

function applyStatSwap(source, fromItem, next, stat, pool) {
  const fromVal = fromItem.stats?.[stat];
  const toVal = next.stats?.[stat];
  let prompt = replaceWord(source.prompt, fromItem.name, next.name);
  if (fromVal != null && toVal != null && String(prompt).includes(String(fromVal))) {
    prompt = prompt.replace(new RegExp(`\\b${escapeRe(String(fromVal))}\\b`, 'g'), formatStat(toVal));
  }
  const patch = { prompt, correct: clone(source.correct) || {}, image_url: next.image, image_urls: [next.image] };
  const toLabel = formatStat(toVal);
  if (Array.isArray(source.correct?.answers)) {
    patch.correct = { answers: [toLabel, `${toLabel}%`] };
  }
  if (Array.isArray(source.options) && source.options.length && source.options.every(isNumericToken)) {
    const nums = pool
      .map((i) => i.stats?.[stat])
      .filter((n) => n != null && n !== toVal);
    const unique = [...new Set(nums.map(formatStat))];
    const options = shuffle([toLabel, ...shuffle(unique).slice(0, source.options.length - 1)]);
    patch.options = options;
    patch.correct = { index: options.findIndex((o) => parseNumericToken(o) === toVal) };
  } else if (Array.isArray(source.options) && source.options.length) {
    const swapped = applySwap({ ...source, prompt }, fromItem.name, next.name, {
      distractors: pool.map((i) => i.name),
      image: next.image,
      prefer: itemLowerTierNames(next),
    });
    swapped.patch.prompt = prompt;
    return swapped;
  }
  return { patch };
}

function remixItem(source, avoidTexts) {
  const blob = blobOf(source);
  const names = catalog.items.map((i) => i.name);
  const fromName =
    exactOptionHit(
      [
        ...(Number.isFinite(Number(source.correct?.index))
          ? [source.options?.[source.correct.index]]
          : []),
        ...(source.options || []),
      ],
      names
    ) || findNameInText(`${source.prompt}\n${blob}`, names, { min: 4 });
  if (!fromName) return null;
  const fromItem = catalog.items.find((i) => i.name === fromName);
  if (!fromItem) return null;
  const taken = usedNames(avoidTexts);
  taken.add(norm(fromName));
  const pool = itemPoolFor(fromItem, blob).filter((i) => !taken.has(norm(i.name)));
  const next = pickOne(pool);
  if (!next) return { error: 'No other items left in that group to swap to.' };

  const mentioned = findStatsInText(blob);
  const stat = mentioned.find((s) => fromItem.stats?.[s] != null && next.stats?.[s] != null);
  const numericQuestion =
    stat &&
    ((Array.isArray(source.options) && source.options.length && source.options.every(isNumericToken)) ||
      (Array.isArray(source.correct?.answers) && source.correct.answers.some(isNumericToken)));
  if (numericQuestion) {
    return applyStatSwap(source, fromItem, next, stat, pool);
  }
  return applySwap(source, fromName, next.name, {
    distractors: pool.map((i) => i.name),
    image: next.image,
    prefer: itemLowerTierNames(next),
  });
}

function remixAspect(source, avoidTexts) {
  const text = blobOf(source);
  const fromGod = findNameInText(text, catalog.aspects.map((a) => a.god));
  if (!fromGod) return null;
  const taken = usedNames(avoidTexts);
  taken.add(norm(fromGod));
  const pool = catalog.aspects.filter((a) => !taken.has(norm(a.god)));
  const nextRow = pickOne(pool);
  if (!nextRow) return { error: 'No other gods with aspects left to swap to.' };
  const prompt = rewriteAspectPrompt(source.prompt || '', fromGod, nextRow);
  const looksLikeGods = (source.options || []).filter(Boolean).every((o) =>
    catalog.gods.some((g) => g.name.toLowerCase() === String(o).toLowerCase())
  );
  if (Array.isArray(source.options) && source.options.length) {
    const swapped = applySwap({ ...source, prompt }, fromGod, looksLikeGods ? nextRow.god : nextRow.blank, {
      distractors: looksLikeGods
        ? catalog.gods.map((g) => g.name)
        : catalog.aspects.map((a) => a.blank),
    });
    swapped.patch.prompt = prompt;
    return swapped;
  }
  return {
    patch: {
      prompt,
      correct: {
        answers: [
          ...new Set([
            nextRow.blank,
            nextRow.blank.toLowerCase(),
            ...(nextRow.usesThe ? [`the ${nextRow.blank}`, `The ${nextRow.blank}`] : []),
          ]),
        ],
      },
    },
  };
}

function remixRelease(source, avoidTexts) {
  if (isReleaseAfterPrompt(source.prompt) || source?.meta?.remix_kind === 'release_after') {
    const avoidGods = usedNames(avoidTexts);
    const current = releaseAfterAnchorName(source.prompt);
    if (current) avoidGods.add(norm(current));
    return (
      makeReleaseAfterQuestion({ count: optionCount(source), avoidGods }) || {
        error: 'No other release-after gods left to swap to.',
      }
    );
  }
  const m = String(source.prompt || '').match(/\b(?:OB|Open Beta)\s*0*(\d+)\b/i);
  if (!m) return null;
  const patchNum = Number(m[1]);
  const takenPatch = new Set();
  for (const t of avoidTexts || []) {
    const mm = String(t || '').match(/\b(?:OB|Open Beta)\s*0*(\d+)\b/i);
    if (mm) takenPatch.add(Number(mm[1]));
  }
  takenPatch.add(patchNum);
  const takenGod = usedNames(avoidTexts);
  const pool = catalog.releases.filter(
    (r) => !takenPatch.has(r.patch) && !takenGod.has(norm(r.god))
  );
  const next = pickOne(pool);
  if (!next) return { error: 'No other OB new-god patches left to swap to.' };
  let prompt = String(source.prompt || '');
  prompt = prompt.replace(/\bOB\s*0*\d+\b/gi, `OB${next.patch}`);
  prompt = prompt.replace(/\bOpen Beta\s*0*\d+\b/gi, `Open Beta ${next.patch}`);
  const god = catalog.gods.find((g) => norm(g.name) === norm(next.god));
  const patched = applySwap({ ...source, prompt }, null, next.god, {
    distractors: catalog.releases.map((r) => r.god),
    image: god?.image,
  });
  patched.patch.prompt = prompt;
  return patched;
}

function remixAbility(source, avoidTexts) {
  const names = catalog.abilities.map((a) => a.name);
  const fromName =
    exactOptionHit(source.options || [], names) || findNameInText(source.prompt, names, { min: 6 });
  if (!fromName) return null;
  const from = catalog.abilities.find((a) => a.name === fromName);
  const taken = new Set([norm(fromName), ...[...usedNames(avoidTexts)]]);
  const pool = catalog.abilities.filter((a) => !taken.has(norm(a.name)));
  const next = pickOne(pool);
  if (!next) return { error: 'No other abilities left to swap to.' };
  let prompt = replaceWord(source.prompt, fromName, next.name);
  if (from?.god && next.god) prompt = replaceWord(prompt, from.god, next.god);
  return applySwap({ ...source, prompt }, fromName, next.name, {
    distractors: pool.map((a) => a.name),
  });
}

function remixGod(source, avoidTexts) {
  const names = catalog.gods.map((g) => g.name);
  const fromName =
    exactOptionHit(
      [
        ...(Number.isFinite(Number(source.correct?.index))
          ? [source.options?.[source.correct.index]]
          : []),
        ...(source.options || []),
      ],
      names
    ) || findNameInText(source.prompt, names, { min: 4 });
  if (!fromName) return null;
  const taken = usedNames(avoidTexts);
  taken.add(norm(fromName));
  const pool = catalog.gods.filter((g) => !taken.has(norm(g.name)));
  const next = pickOne(pool);
  if (!next) return { error: 'No other gods left to swap to.' };
  return applySwap(source, fromName, next.name, {
    distractors: pool.map((g) => g.name),
    image: next.image,
  });
}

function optionCount(question) {
  const n = Array.isArray(question?.options) ? question.options.filter(Boolean).length : 0;
  return Math.min(6, Math.max(4, n));
}

function pickDistinct(list, count, exclude = new Set()) {
  const pool = shuffle(list.filter((x) => x && !exclude.has(norm(typeof x === 'string' ? x : x.name))));
  return pool.slice(0, count);
}

function nameParts(name) {
  const s = String(name || '').trim();
  const ofThe = s.match(/^(.+?)\s+of the\s+(.+)$/i);
  if (ofThe) return { head: ofThe[1].trim(), join: ' of the ', tail: ofThe[2].trim() };
  const of = s.match(/^(.+?)\s+of\s+(.+)$/i);
  if (of) return { head: of[1].trim(), join: ' of ', tail: of[2].trim() };
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return { head: words.slice(0, -1).join(' '), join: ' ', tail: words[words.length - 1] };
  }
  return null;
}

/** Fake-but-plausible mashup: "Gauntlet of Thebes" + "Breastplate of Valor" → "Gauntlet of Valor". */
function mashNames(correct, others) {
  const a = nameParts(correct);
  if (!a) return null;
  const pool = shuffle(
    (others || []).filter((n) => norm(n) !== norm(correct)).map(nameParts).filter(Boolean)
  );
  for (const b of pool.slice(0, 16)) {
    const cands = [`${a.head}${a.join}${b.tail}`, `${b.head}${b.join}${a.tail}`, `${a.head}${b.join}${b.tail}`];
    const hit = cands.find(
      (c) =>
        c &&
        norm(c) !== norm(correct) &&
        norm(c) !== norm(`${b.head}${b.join}${b.tail}`) &&
        c.length >= 6
    );
    if (hit) return hit;
  }
  return null;
}

function isLongName(name) {
  const s = String(name || '').trim();
  const words = s.split(/[\s-]+/).filter(Boolean);
  return words.length >= 3 || s.length >= 16;
}

/** Near-miss spelling. Short names skip this — "Heroiism" gives the answer away. */
function misspellName(name) {
  const s = String(name || '').trim();
  if (!isLongName(s)) return null;
  const variants = [];
  const push = (v) => {
    const t = String(v || '').replace(/\s+/g, ' ').trim();
    if (t && norm(t) !== norm(s) && t.length >= 4) variants.push(t);
  };
  push(s.replace(/([bcdfghjklmnpqrstvwxyz])([aeiou])/i, (m, a, b, offset) => (offset > 0 ? `${a}${a}${b}` : m)));
  if (/ie/i.test(s)) push(s.replace(/ie/i, 'ei'));
  else if (/ei/i.test(s)) push(s.replace(/ei/i, 'ie'));
  push(s.replace(/([aeiou])([^aeiou\s]{2,})$/i, '$1$1$2'));
  if (/ll/i.test(s)) push(s.replace(/ll/i, 'l'));
  else push(s.replace(/l(?=[aeiou])/i, 'll'));
  if (/ph/i.test(s)) push(s.replace(/ph/i, 'f'));
  if (/'s\b/.test(s)) push(s.replace(/'s\b/, 's'));
  else if (/\s\w+s\b/.test(s)) push(s.replace(/(\s\w+)s\b/, "$1's"));
  const unique = [...new Set(variants)];
  return pickOne(unique);
}

/**
 * Mix real catalog names with mashups + misspellings so identify questions aren't all real items/gods.
 */
function trickishDistractors(correctLabel, realNames, count, { prefer = [], realOnly = false } = {}) {
  const need = Math.max(0, count);
  const exclude = new Set([norm(correctLabel)]);
  const out = [];
  const add = (v) => {
    if (!v || exclude.has(norm(v)) || out.length >= need) return;
    exclude.add(norm(v));
    out.push(v);
  };
  const pool = (realNames || []).filter((n) => n && norm(n) !== norm(correctLabel));
  for (const n of prefer) add(n);
  if (!realOnly) {
    add(mashNames(correctLabel, pool));
    add(misspellName(correctLabel));
  }
  for (const n of shuffle(pool)) {
    if (out.length >= need) break;
    add(n);
  }
  return out.slice(0, need);
}

function godNeighborNames(correctName) {
  const me = godMeta[String(correctName || '').trim()] || null;
  if (!me) return [];
  const pantheon = String(me.pantheon || '').toLowerCase();
  const role = String(me.role || '').toLowerCase();
  const samePantheon = [];
  const sameRole = [];
  for (const g of catalog.gods || []) {
    if (norm(g.name) === norm(correctName)) continue;
    const row = godMeta[g.name];
    if (!row) continue;
    if (pantheon && String(row.pantheon || '').toLowerCase() === pantheon) samePantheon.push(g.name);
    else if (role && String(row.role || '').toLowerCase() === role) sameRole.push(g.name);
  }
  return [...shuffle(samePantheon), ...shuffle(sameRole)];
}

function itemLowerTierNames(itemOrName) {
  const item =
    itemOrName && typeof itemOrName === 'object'
      ? itemOrName
      : catalog.items.find((i) => norm(i.name) === norm(itemOrName));
  return Array.isArray(item?.from) ? item.from.filter(Boolean) : [];
}

function itemIdentifyDistractors(correctLabel, count) {
  const wrong = catalog.items.map((i) => i.name).filter((n) => norm(n) !== norm(correctLabel));
  return trickishDistractors(correctLabel, wrong, count, {
    prefer: itemLowerTierNames(correctLabel),
    realOnly: true,
  });
}

function popularStats() {
  const counts = {};
  for (const item of catalog.items) {
    for (const key of Object.keys(item.stats || {})) {
      if (key === 'step cost' || key === 'cost') continue;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .filter(([, n]) => n >= 8)
    .map(([k]) => k);
}

function isPlaceholderOption(s) {
  return !String(s || '').trim() || /^option\s*[a-d0-9]+$/i.test(String(s || '').trim());
}

function currentCorrectLabel(question) {
  const opts = Array.isArray(question?.options) ? question.options : [];
  if (Array.isArray(question?.correct?.indices) && question.correct.indices.length) {
    const label = opts[Number(question.correct.indices[0])];
    if (label && String(label).trim()) return String(label).trim();
  }
  const idx = Number(question?.correct?.index);
  if (Number.isFinite(idx) && opts[idx] && String(opts[idx]).trim()) {
    return String(opts[idx]).trim();
  }
  if (Array.isArray(question?.correct?.answers) && String(question.correct.answers[0] || '').trim()) {
    return String(question.correct.answers[0]).trim();
  }
  return null;
}

function packMc({ prompt, correctLabel, distractors, count, image, type = 'multiple_choice', extraMeta = {}, clearMedia }) {
  const options = shuffle([correctLabel, ...distractors.slice(0, count - 1)]);
  const patch = {
    type,
    prompt,
    options,
    correct: { index: options.findIndex((o) => norm(o) === norm(correctLabel)) },
    meta: { randomize_order: true, ...extraMeta },
  };
  if (image) {
    patch.image_url = image;
    patch.image_urls = [image];
  } else if (clearMedia !== false) {
    patch.image_url = null;
    patch.image_urls = [];
    patch.clearMedia = true;
  }
  return { patch };
}

function isIdentifyItemPrompt(prompt) {
  return /what is this item called|name of this item|which item is (this|shown)|what item is this/i.test(
    prompt || ''
  );
}

function isReleaseAfterPrompt(prompt) {
  return /(?:\bcame|\breleased)\s+after\b/i.test(String(prompt || ''));
}

function orderedReleases() {
  const ordered = [];
  const seen = new Set();
  for (const r of catalog.releases || []) {
    const k = norm(r.god);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    ordered.push(r);
  }
  return ordered;
}

function releaseAfterAnchorName(prompt) {
  const text = String(prompt || '');
  const m = text.match(/(?:came|released)\s+after\s+(.+)$/i);
  const chunk = String(m?.[1] || text)
    .replace(/[?.!]+$/g, '')
    .trim();
  const releaseNames = (catalog.releases || []).map((r) => r.god);
  const godNames = (catalog.gods || []).map((g) => g.name);
  return findNameInText(chunk, releaseNames, { min: 3 }) || findNameInText(chunk, godNames, { min: 3 });
}

function godNamePool() {
  return (catalog.gods || []).map((g) => g.name).filter(Boolean);
}

/** “Who came after X?” / “Which god(s) were released after X?” — options are always god names. */
function makeReleaseAfterQuestion({
  anchorName,
  prompt,
  count = 4,
  avoidGods = new Set(),
  keepPrompt = false,
} = {}) {
  const ordered = orderedReleases();
  if (ordered.length < 3) return null;
  const usable = ordered
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => i < ordered.length - 1 && !avoidGods.has(norm(r.god)));
  if (!usable.length) return null;

  let idx = ordered.findIndex((r) => norm(r.god) === norm(anchorName));
  if (idx < 0 || idx >= ordered.length - 1 || avoidGods.has(norm(ordered[idx].god))) {
    idx = pickOne(usable).i;
  }
  const row = ordered[idx];
  const afterGods = ordered.slice(idx + 1).map((r) => r.god);
  const beforeGods = ordered.slice(0, idx).map((r) => r.god);
  if (!afterGods.length) return null;

  const single = afterGods.length === 1;
  const type = single ? 'multiple_choice' : 'multiple_selection';
  const correctPick = single
    ? [afterGods[0]]
    : pickDistinct(afterGods, Math.min(2, afterGods.length), new Set());
  const needWrong = Math.max(single ? count - 1 : 2, count - correctPick.length);
  const taken = new Set(correctPick.map(norm));
  let wrong = pickDistinct(beforeGods, needWrong, taken);
  if (wrong.length < needWrong) {
    const extra = godNamePool().filter((n) => !afterGods.some((g) => norm(g) === norm(n)) && !taken.has(norm(n)));
    wrong = [...wrong, ...pickDistinct(extra, needWrong - wrong.length, new Set(wrong.map(norm)))];
  }
  const options = shuffle([...correctPick, ...wrong].slice(0, Math.max(count, correctPick.length + 1)));
  const indices = correctPick
    .map((g) => options.findIndex((o) => norm(o) === norm(g)))
    .filter((i) => i >= 0);
  if (!indices.length) return null;
  const canKeep = keepPrompt && prompt && idx >= 0 && norm(ordered[idx].god) === norm(anchorName);
  const nextPrompt = canKeep
    ? prompt
    : single
      ? `Who came after ${row.god}?`
      : `Which god(s) were released after ${row.god}?`;
  return {
    patch: {
      type,
      prompt: nextPrompt,
      options,
      correct: single ? { index: indices[0] } : { indices },
      meta: {
        randomize_order: true,
        remix_kind: 'release_after',
        hint_context: { anchor_god: row.god, anchor_patch: row.patch },
      },
      image_url: null,
      image_urls: [],
      clearMedia: true,
    },
  };
}

/** Fill options + correct from the current prompt (keeps the wording). */
export function fillAnswersFromPrompt(question) {
  const prompt = String(question?.prompt || '').trim();
  if (!prompt) return { error: 'Write a question first, or use Random question.' };
  const count = optionCount(question);
  const stats = findStatsInText(prompt);
  const itemNames = catalog.items.map((i) => i.name);
  const namedItem = findNameInText(prompt, itemNames, { min: 4 });
  const fillBlank = question?.meta?.kind === 'fill_blank' || question?.type === 'fill_blank';

  if (fillBlank) {
    const god = findNameInText(prompt, catalog.aspects.map((a) => a.god));
    const row = catalog.aspects.find((a) => a.god === god) || pickOne(catalog.aspects);
    if (!row) return { error: 'No aspect data to fill the blank.' };
    return {
      patch: {
        prompt: god
          ? prompt
          : `${row.god} Aspect is called ${row.usesThe ? 'Aspect of the' : 'Aspect of'} {{blank}}`,
        correct: {
          answers: [...new Set([row.blank, row.blank.toLowerCase()])],
        },
      },
    };
  }

  if (isReleaseAfterPrompt(prompt) || question?.meta?.remix_kind === 'release_after') {
    const hit = makeReleaseAfterQuestion({
      anchorName: releaseAfterAnchorName(prompt),
      prompt,
      count,
      keepPrompt: true,
    });
    if (hit?.patch) return hit;
    return { error: 'No release-order gods to fill answers. Try Random question.' };
  }

  if (namedItem && stats.length) {
    const item = catalog.items.find((i) => i.name === namedItem);
    const stat = stats.find((s) => item?.stats?.[s] != null) || stats[0];
    const val = item?.stats?.[stat];
    if (val == null) return { error: `${namedItem} has no ${stat} in builds.json.` };
    const others = catalog.items
      .filter((i) => i.name !== namedItem && i.stats?.[stat] != null && i.stats[stat] !== val)
      .map((i) => String(i.stats[stat]));
    return packMc({
      prompt,
      correctLabel: String(val),
      distractors: [...new Set(others)],
      count,
    });
  }

  if (stats.length && /item/i.test(prompt)) {
    const stat = stats[0];
    const withStat = catalog.items.filter((i) => i.stats?.[stat] != null);
    const without = catalog.items.filter((i) => i.stats?.[stat] == null);
    const marked = currentCorrectLabel(question);
    const markedItem =
      marked &&
      !isPlaceholderOption(marked) &&
      catalog.items.find((i) => norm(i.name) === norm(marked) && i.stats?.[stat] != null);
    const correct = markedItem || pickOne(withStat);
    if (!correct || without.length < count - 1) return { error: `Not enough items for ${stat}.` };
    return packMc({
      prompt,
      correctLabel: correct.name,
      distractors: pickDistinct(without.map((i) => i.name), count - 1, new Set([norm(correct.name)])),
      count,
      image: isIdentifyItemPrompt(prompt) ? correct.image : undefined,
    });
  }

  const rel = String(prompt).match(/\b(?:OB|Open Beta)\s*0*(\d+)\b/i);
  if (rel) {
    const patchNum = Number(rel[1]);
    const hit = catalog.releases.find((r) => r.patch === patchNum);
    if (!hit) return { error: `No new-god data for OB${patchNum}.` };
    const wrong = catalog.gods.map((g) => g.name).filter((n) => norm(n) !== norm(hit.god));
    return packMc({
      prompt,
      correctLabel: hit.god,
      distractors: trickishDistractors(hit.god, wrong, count - 1, {
        prefer: godNeighborNames(hit.god),
        realOnly: true,
      }),
      count,
    });
  }

  const god = findNameInText(prompt, catalog.gods.map((g) => g.name), { min: 4 });
  if (/aspect/i.test(prompt) && god) {
    const row = catalog.aspects.find((a) => a.god === god);
    if (!row) return { error: `${god} has no aspect in the catalog.` };
    const wrong = catalog.aspects.filter((a) => a.god !== god).map((a) => a.blank);
    return packMc({
      prompt,
      correctLabel: row.blank,
      distractors: trickishDistractors(row.blank, wrong, count - 1),
      count,
    });
  }

  const optionItemName = exactOptionHit(question?.options || [], itemNames);
  const markedRaw = currentCorrectLabel(question);
  const marked = markedRaw && !isPlaceholderOption(markedRaw) ? markedRaw : null;
  const item =
    (namedItem && catalog.items.find((i) => i.name === namedItem)) ||
    (marked && catalog.items.find((i) => norm(i.name) === norm(marked))) ||
    (optionItemName && catalog.items.find((i) => i.name === optionItemName));
  if (item || isIdentifyItemPrompt(prompt) || marked) {
    const correctLabel = marked || item?.name || pickOne(catalog.items)?.name;
    if (!correctLabel) return { error: 'No item names to fill answers.' };
    const existingImage = question?.image_url || question?.image_urls?.[0];
    const keepImage = isIdentifyItemPrompt(prompt) || Boolean(existingImage && item);
    return packMc({
      prompt: prompt || 'What is this item called?',
      correctLabel,
      distractors: itemIdentifyDistractors(correctLabel, count - 1),
      count,
      image: keepImage ? existingImage || item?.image : undefined,
      clearMedia: !keepImage,
    });
  }

  return { error: 'Could not read this prompt. Name a stat, item, god, aspect, or OB patch.' };
}

/** Invent a new question + answers from builds.json so you are not starting from a blank. */
export function randomizeQuestion(question) {
  const count = optionCount(question);
  const fillBlank = question?.meta?.kind === 'fill_blank';
  if (fillBlank) {
    const row = pickOne(catalog.aspects);
    if (!row) return { error: 'No aspect data.' };
    return {
      patch: {
        type: 'short_answer',
        prompt: `${row.god} Aspect is called ${row.usesThe ? 'Aspect of the' : 'Aspect of'} {{blank}}`,
        options: [],
        correct: { answers: [...new Set([row.blank, row.blank.toLowerCase()])] },
        meta: { kind: 'fill_blank', remix_kind: 'aspect_blank', hint_context: { god: row.god } },
        image_url: null,
        image_urls: [],
        clearMedia: true,
      },
    };
  }

  if (isReleaseAfterPrompt(question?.prompt) || question?.meta?.remix_kind === 'release_after') {
    const avoidGods = usedNames([question?.prompt]);
    const hit = makeReleaseAfterQuestion({ count, avoidGods });
    if (hit?.patch) return hit;
  }

  const makers = [
    () => {
      const stat = pickOne(popularStats());
      const withStat = catalog.items.filter((i) => i.stats?.[stat] != null);
      const without = catalog.items.filter((i) => i.stats?.[stat] == null);
      const correct = pickOne(withStat);
      if (!correct || without.length < 3) return null;
      return packMc({
        prompt: `What item has ${stat}?`,
        correctLabel: correct.name,
        distractors: pickDistinct(without.map((i) => i.name), count - 1, new Set([norm(correct.name)])),
        count,
      });
    },
    () => {
      const stat = pickOne(popularStats());
      const withStat = catalog.items.filter((i) => i.stats?.[stat] != null);
      const item = pickOne(withStat);
      if (!item) return null;
      const val = item.stats[stat];
      const others = [...new Set(withStat.filter((i) => i.stats[stat] !== val).map((i) => String(i.stats[stat])))];
      if (others.length < 3) return null;
      return packMc({
        prompt: `How much ${stat} does ${item.name} give?`,
        correctLabel: String(val),
        distractors: others,
        count,
      });
    },
    () => {
      const item = pickOne(catalog.items.filter((i) => i.image && (i.tier === 3 || i.starter)));
      if (!item) return null;
      return packMc({
        prompt: 'What is this item called?',
        correctLabel: item.name,
        distractors: itemIdentifyDistractors(item.name, count - 1),
        count,
        image: item.image,
      });
    },
    () => {
      const rel = pickOne(catalog.releases);
      if (!rel) return null;
      const wrong = catalog.gods.map((g) => g.name).filter((n) => norm(n) !== norm(rel.god));
      return packMc({
        prompt: `What god was released in OB${rel.patch}?`,
        correctLabel: rel.god,
        distractors: trickishDistractors(rel.god, wrong, count - 1, {
          prefer: godNeighborNames(rel.god),
          realOnly: true,
        }),
        count,
      });
    },
    () => {
      const row = pickOne(catalog.aspects);
      if (!row) return null;
      const wrong = catalog.aspects.filter((a) => a.god !== row.god).map((a) => a.blank);
      return packMc({
        prompt: `${row.god}'s aspect is called Aspect of ____`,
        correctLabel: row.blank,
        distractors: trickishDistractors(row.blank, wrong, count - 1),
        count,
      });
    },
    () => {
      const clips = mediaCatalog.voiceClips || [];
      if (clips.length < 4) return null;
      const clip = pickOne(clips);
      const wrong = trickishDistractors(
        clip.god,
        catalog.gods.map((g) => g.name).filter((n) => norm(n) !== norm(clip.god)),
        count - 1,
        { prefer: godNeighborNames(clip.god), realOnly: true }
      );
      return packMc({
        prompt: 'Choose the correct god this voice line belongs to.',
        correctLabel: clip.god,
        distractors: wrong,
        count,
        image: clip.url,
        extraMeta: {
          media: 'audio',
          remix_kind: 'voice_line',
          hint_context: { god: clip.god, skin: clip.skin, kind: clip.kind },
        },
      });
    },
    () => {
      const cards = mediaCatalog.skinCards || [];
      if (cards.length < 4) return null;
      const card = pickOne(cards);
      const wrong = trickishDistractors(
        card.god,
        catalog.gods.map((g) => g.name).filter((n) => norm(n) !== norm(card.god)),
        count - 1,
        { prefer: godNeighborNames(card.god), realOnly: true }
      );
      const seed = `${card.god}|${card.skinName}`;
      return packMc({
        prompt: 'Choose the correct god this skin belongs to.',
        correctLabel: card.god,
        distractors: wrong,
        count,
        image: card.url,
        extraMeta: {
          media: 'image',
          media_crop: 'skin_zoom_center',
          media_seed: seed,
          remix_kind: 'skin_guess',
          hint_context: { god: card.god, skin: card.skinName },
        },
      });
    },
    () => makeReleaseAfterQuestion({ count }),
    // Weighted so Random question actually lands on this template.
    () => makeReleaseAfterQuestion({ count }),
  ];

  const picked = shuffle(makers);
  for (const make of picked) {
    const result = make();
    if (result?.patch) return result;
  }
  return { error: 'Could not build a random question from builds.json.' };
}

/** Build B/C from version A using builds.json display names + GitHub item/god art. */
export function remixQuestionFromA(questionA, { avoidTexts = [] } = {}) {
  const source = {
    prompt: questionA?.prompt || '',
    options: Array.isArray(questionA?.options) ? [...questionA.options] : questionA?.options,
    correct: clone(questionA?.correct) || {},
    meta: questionA?.meta,
  };
  const avoid = [source.prompt, ...avoidTexts];
  const tries = [remixRelease, remixItem, remixAspect, remixAbility, remixGod];
  for (const fn of tries) {
    const result = fn(source, avoid);
    if (result?.error) return result;
    if (result?.patch) return result;
  }
  return {
    error:
      'Could not auto-change this question. Name an item, god, ability, aspect, or OB patch in the prompt or answers (display names from builds.json).',
  };
}
