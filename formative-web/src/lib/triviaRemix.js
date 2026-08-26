import catalog from './triviaRemixCatalog.json' with { type: 'json' };
import mediaCatalog from './triviaMediaCatalog.json' with { type: 'json' };
import godMeta from './triviaGodMeta.json' with { type: 'json' };
import abilitySfxSimilarity from './triviaAbilitySfxSimilarity.json' with { type: 'json' };
import { formatAbilitySfxLabel } from './abilitySfxLabel.js';

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

/** Default/base VOX: Skin00_Base folder, or skin label Base/Default. */
export function isBaseVoiceClip(clip) {
  const skin = String(clip?.skin || '').trim();
  const folder = String(clip?.skinFolder || '').trim();
  const url = String(clip?.url || '');
  if (/\/Skin00_Base\//i.test(url)) return true;
  if (/^Skin00_Base$/i.test(folder)) return true;
  if (/^(Base|Default)$/i.test(skin)) return true;
  return false;
}

/** Prefer non-base skins when any exist; fall back to full pool otherwise. */
export function preferSkinnedVoiceClips(pool) {
  const list = (Array.isArray(pool) ? pool : []).filter((c) => c?.url && c?.god);
  if (!list.length) return [];
  const skinned = list.filter((c) => !isBaseVoiceClip(c));
  return skinned.length ? skinned : list;
}

function pickVoiceClip(pool) {
  return pickOne(preferSkinnedVoiceClips(pool));
}

/** Default NewGodSkins card (Default folder / isDefault) — prefer alt skins for skin-guess. */
export function isDefaultSkinCard(card) {
  if (!card) return true;
  if (card.isDefault === true) return true;
  const folder = String(card.skinFolder || '').trim();
  const name = String(card.skinName || '').trim();
  const url = String(card.url || '');
  if (/^Default$/i.test(folder) || /^Default$/i.test(name)) return true;
  if (/\/Default\//i.test(url)) return true;
  return false;
}

export function preferSkinnedSkinCards(pool) {
  const list = (Array.isArray(pool) ? pool : []).filter((c) => c?.url && c?.god);
  if (!list.length) return [];
  const skinned = list.filter((c) => !isDefaultSkinCard(c));
  return skinned.length ? skinned : list;
}

function pickSkinCard(pool) {
  return pickOne(preferSkinnedSkinCards(pool));
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

function applySwap(source, fromName, toName, { distractors = [], image, prefer = [], realOnly = false } = {}) {
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
    const mixed = trickishDistractors(toName, unique, need, { prefer, realOnly });
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

function isItemHasStatPrompt(source) {
  const kind = String(source?.meta?.remix_kind || '');
  if (kind === 'item_has_stat') return true;
  return /(?:what|which)\s+item\s+has\b/i.test(String(source?.prompt || ''));
}

function isAspectIconPrompt(source) {
  const kind = String(source?.meta?.remix_kind || '');
  if (kind === 'aspect_icon') return true;
  return /aspect\s+icon|pick the god(?:s)? that has this aspect|which gods? (?:share|have|use) this aspect/i.test(
    String(source?.prompt || '')
  );
}

/** Group gods that share the same aspect pool icon (for identify-the-icon questions). */
function aspectIconGroups() {
  const map = new Map();
  for (const a of catalog.aspects || []) {
    if (!a?.image || !a?.icon) continue;
    const key = norm(a.icon);
    if (!map.has(key)) map.set(key, { icon: a.icon, image: a.image, gods: [] });
    const g = map.get(key);
    if (!g.gods.some((n) => norm(n) === norm(a.god))) g.gods.push(a.god);
  }
  return [...map.values()];
}

function currentAspectIconKey(source) {
  const fromMeta = source?.meta?.hint_context?.aspect_icon;
  if (fromMeta) return norm(fromMeta);
  const url = String(source?.image_url || source?.image_urls?.[0] || '');
  const file = url.split('/').pop() || '';
  try {
    return norm(decodeURIComponent(file));
  } catch {
    return norm(file);
  }
}

function makeItemHasStatQuestion({ count = 4, avoidStats = new Set() } = {}) {
  const stats = popularStats().filter((s) => !avoidStats.has(norm(s)));
  const pool = stats.length ? stats : popularStats();
  const stat = pickOne(pool);
  if (!stat) return null;
  const withStat = catalog.items.filter((i) => i.stats?.[stat] != null);
  const without = catalog.items.filter((i) => i.stats?.[stat] == null);
  const correct = pickOne(withStat);
  if (!correct || without.length < 3) return null;
  return packMc({
    prompt: `What item has ${stat}?`,
    correctLabel: correct.name,
    distractors: pickDistinct(without.map((i) => i.name), count - 1, new Set([norm(correct.name)])),
    count,
    clearMedia: true,
    extraMeta: { remix_kind: 'item_has_stat', hint_context: { stat } },
  });
}

/**
 * Aspect-icon identify: show shared emblem, pick god(s) that use it.
 * Multi-select when 2+ gods share the icon; single MC when only one.
 */
function makeAspectIconQuestion({ count = 5, avoidIcons = new Set(), keepPrompt = null } = {}) {
  const groups = aspectIconGroups().filter((g) => g.gods.length >= 1 && !avoidIcons.has(norm(g.icon)));
  if (!groups.length) return null;
  const multi = groups.filter((g) => g.gods.length >= 2);
  const group = pickOne(multi.length ? multi : groups);
  if (!group) return null;

  const correctGods = [...group.gods];
  const single = correctGods.length === 1;
  const type = single ? 'multiple_choice' : 'multiple_selection';
  const wantCorrect = single
    ? 1
    : Math.min(correctGods.length, Math.max(2, Math.min(4, Math.floor(count / 2))));
  const correctPick = single
    ? [correctGods[0]]
    : pickDistinct(correctGods, wantCorrect, new Set());
  const needWrong = Math.max(single ? count - 1 : 2, count - correctPick.length);
  const taken = new Set(correctPick.map(norm));
  const otherGods = godNamePool().filter((n) => !correctGods.some((g) => norm(g) === norm(n)));
  const wrong = pickDistinct(otherGods, needWrong, taken);
  const options = shuffle([...correctPick, ...wrong].slice(0, Math.max(count, correctPick.length + 1)));
  const indices = correctPick
    .map((g) => options.findIndex((o) => norm(o) === norm(g)))
    .filter((i) => i >= 0);
  if (!indices.length) return null;

  const prompt =
    keepPrompt ||
    'Pick the God that has this aspect icon. (May or may not be more than one God)';
  return {
    patch: {
      type,
      prompt,
      options,
      correct: single ? { index: indices[0] } : { indices, index: indices[0] },
      meta: {
        randomize_order: true,
        allow_partial_credit: !single,
        media: 'image',
        remix_kind: 'aspect_icon',
        hint_context: { aspect_icon: group.icon, gods: correctGods },
      },
      image_url: group.image,
      image_urls: [group.image],
    },
  };
}

function remixItem(source, avoidTexts) {
  // Text "which item has [stat]?" — rotate the stat, never attach item icons.
  if (isItemHasStatPrompt(source)) {
    const current = findStatsInText(source.prompt || '');
    const avoid = new Set(current.map(norm));
    const hit =
      makeItemHasStatQuestion({ count: optionCount(source), avoidStats: avoid }) ||
      makeItemHasStatQuestion({ count: optionCount(source) });
    if (hit?.patch) return hit;
    return { error: 'No other item-has-stat questions left to build.' };
  }

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
  const attachImage =
    isIdentifyItemPrompt(source.prompt) || source?.meta?.remix_kind === 'item_identify';
  const swapped = applySwap(source, fromName, next.name, {
    distractors: pool.map((i) => i.name),
    image: attachImage ? next.image : undefined,
    prefer: itemLowerTierNames(next),
  });
  if (!attachImage) {
    swapped.patch.image_url = null;
    swapped.patch.image_urls = [];
    swapped.patch.clearMedia = true;
  }
  return swapped;
}

function remixAspect(source, avoidTexts) {
  if (isAspectIconPrompt(source)) {
    const avoid = new Set();
    const cur = currentAspectIconKey(source);
    if (cur) avoid.add(cur);
    const hit =
      makeAspectIconQuestion({ count: optionCount(source), avoidIcons: avoid }) ||
      makeAspectIconQuestion({ count: optionCount(source) });
    if (hit?.patch) return hit;
    return { error: 'No other aspect icons left to swap to.' };
  }

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

function godEmojiSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const GOD_EMOJI_SET_LETTERS = ['a', 'b', 'c'];

function pickGodEmojiSetLetter() {
  return GOD_EMOJI_SET_LETTERS[Math.floor(Math.random() * GOD_EMOJI_SET_LETTERS.length)];
}

/** Unnamed card URL. Pass setLetter 'a'|'b'|'c' for anti-repeat variants (from emoji-clues sets). */
function godEmojiUnnamedUrl(name, setLetter = '') {
  const slug = godEmojiSlug(name);
  const letter = String(setLetter || '').toLowerCase();
  if (GOD_EMOJI_SET_LETTERS.includes(letter)) {
    return `/media/Trivia/god-emojis/${slug}-${letter}-unnamed.svg`;
  }
  return `/media/Trivia/god-emojis/${slug}-unnamed.svg`;
}

function isGodEmojiPrompt(source) {
  return (
    source?.meta?.remix_kind === 'god_emoji' ||
    /three emojis|emojis represent/i.test(source?.prompt || '')
  );
}

function makeGodEmojiQuestion({ count, avoidGods = new Set(), correctName = null } = {}) {
  const gods = (catalog.gods || []).filter((g) => {
    if (!g?.name || avoidGods.has(norm(g.name))) return false;
    const emojis = godMeta?.[g.name]?.emojis;
    return Array.isArray(emojis) && emojis.length > 0;
  });
  if (gods.length < 4) return null;
  let god = null;
  if (correctName) {
    god = gods.find((g) => norm(g.name) === norm(correctName)) || null;
  }
  if (!god) god = pickOne(gods);
  if (!god) return null;
  const wrong = godEmojiDistractors(god.name, count - 1);
  if (wrong.length < count - 1) return null;
  const setLetter = pickGodEmojiSetLetter();
  return packMc({
    prompt: 'Which god do these three emojis represent?',
    correctLabel: god.name,
    distractors: wrong,
    count,
    image: godEmojiUnnamedUrl(god.name, setLetter),
    extraMeta: {
      media: 'image',
      remix_kind: 'god_emoji',
      emoji_set: setLetter,
      hint_context: { god: god.name },
      category: 'gods',
      difficulty: 'medium',
    },
  });
}

function isVoiceLinePrompt(source) {
  const kind = String(source?.meta?.remix_kind || '');
  if (kind && kind !== 'voice_line') return false;
  return (
    kind === 'voice_line' ||
    source?.meta?.media === 'audio' ||
    /voice\s*line belongs/i.test(source?.prompt || '')
  );
}

function isSkinGuessPrompt(source) {
  const kind = String(source?.meta?.remix_kind || '');
  // Explicit non-skin kinds must win over leftover media_crop from Version A / prior remix.
  if (kind && kind !== 'skin_guess') return false;
  if (isGodEmojiPrompt(source) && kind !== 'skin_guess') return false;
  if (kind === 'skin_guess') return true;
  if (/skin belongs/i.test(source?.prompt || '')) return true;
  return source?.meta?.media_crop === 'skin_zoom_center';
}

function isAbilitySoundPrompt(source) {
  const kind = String(source?.meta?.remix_kind || '');
  if (kind && kind !== 'ability_sound') return false;
  return kind === 'ability_sound' || /which ability is this sound/i.test(source?.prompt || '');
}

function abilityOptionLabel(row) {
  if (!row) return '';
  if (row.label) return String(row.label);
  return formatAbilitySfxLabel(row);
}

/** Labels of clips that sound similar (cross-god), from audio-feature neighbor map. */
function similarAbilityLabels(clip) {
  const entry = abilitySfxSimilarity?.byUrl?.[clip?.url];
  const similar = Array.isArray(entry?.similar) ? entry.similar : [];
  const out = [];
  const seen = new Set();
  for (const nb of similar) {
    const label = nb?.label || abilityOptionLabel(nb);
    if (!label || seen.has(norm(label))) continue;
    seen.add(norm(label));
    out.push(label);
  }
  return out;
}

function makeAbilitySoundQuestion({ count, avoidUrls = new Set() } = {}) {
  const clips = mediaCatalog.abilitySounds || [];
  if (clips.length < 4) return null;
  // Pool includes base ability casts + skin_activate when present in catalog.
  let pool = clips.filter((c) => c?.url && !avoidUrls.has(c.url));
  if (!pool.length) pool = clips.filter((c) => c?.url);
  const clip = pickOne(pool);
  if (!clip) return null;
  const correctLabel = abilityOptionLabel(clip);
  const wrongPool = clips
    .filter((c) => norm(abilityOptionLabel(c)) !== norm(correctLabel))
    .map(abilityOptionLabel);
  const sameGod = clips
    .filter((c) => c.god === clip.god && norm(abilityOptionLabel(c)) !== norm(correctLabel))
    .map(abilityOptionLabel);
  const prefer = [...similarAbilityLabels(clip), ...sameGod];
  const wrong = trickishDistractors(correctLabel, wrongPool, count - 1, {
    prefer,
    realOnly: true,
  });
  return packMc({
    prompt: 'Which ability is this sound from?',
    correctLabel,
    distractors: wrong,
    count,
    image: clip.url,
    extraMeta: {
      media: 'audio',
      remix_kind: 'ability_sound',
      hint_context: {
        god: clip.god,
        ability: clip.ability,
        slot: clip.slot,
        slots: clip.slots || null,
        skin: clip.skin || null,
        kind: clip.kind || null,
      },
    },
  });
}

function correctGodFromSource(source) {
  const opts = Array.isArray(source?.options) ? source.options : [];
  const idx = Number(source?.correct?.index);
  if (Number.isFinite(idx) && opts[idx] && String(opts[idx]).trim()) {
    return String(opts[idx]).trim();
  }
  const fromHint = source?.meta?.hint_context?.god;
  if (fromHint) return fromHint;
  return findNameInText(blobOf(source), catalog.gods.map((g) => g.name), { min: 3 });
}

function remixVoiceLine(source, avoidTexts) {
  if (!isVoiceLinePrompt(source)) return null;
  const clips = mediaCatalog.voiceClips || [];
  if (clips.length < 4) return { error: 'No voice clips left to swap to.' };
  const currentGod = correctGodFromSource(source);
  const currentUrl = source.image_url || source.image_urls?.[0] || null;
  const taken = usedNames(avoidTexts);
  if (currentGod) taken.add(norm(currentGod));
  let pool = clips.filter((c) => c.url !== currentUrl && !taken.has(norm(c.god)));
  if (!pool.length) pool = clips.filter((c) => c.url !== currentUrl);
  if (!pool.length && clips.length > 1) pool = clips.filter((c) => norm(c.god) !== norm(currentGod));
  // Prefer skinned VOX; only use Skin00_Base when no skinned candidates remain.
  const clip = pickVoiceClip(pool);
  if (!clip) return { error: 'No other voice clips left to swap to.' };
  const count = optionCount(source);
  const wrong = godIdentifyDistractors(clip.god, count - 1);
  return packMc({
    prompt: source.prompt || 'Choose the correct god this voice line belongs to.',
    correctLabel: clip.god,
    distractors: wrong,
    count,
    image: clip.url,
    extraMeta: {
      media: 'audio',
      remix_kind: 'voice_line',
      hint_context: {
        god: clip.god,
        skin: clip.skin,
        skinFolder: clip.skinFolder || null,
        kind: clip.kind,
      },
    },
    clearMedia: false,
  });
}

function remixSkinGuess(source, avoidTexts) {
  if (!isSkinGuessPrompt(source)) return null;
  const cards = mediaCatalog.skinCards || [];
  if (cards.length < 4) return { error: 'No skin cards left to swap to.' };
  const currentGod = correctGodFromSource(source);
  const currentUrl = source.image_url || source.image_urls?.[0] || null;
  const taken = usedNames(avoidTexts);
  if (currentGod) taken.add(norm(currentGod));
  let pool = cards.filter((c) => c.url !== currentUrl && !taken.has(norm(c.god)));
  if (!pool.length) pool = cards.filter((c) => c.url !== currentUrl);
  if (!pool.length && cards.length > 1) pool = cards.filter((c) => norm(c.god) !== norm(currentGod));
  const card = pickSkinCard(pool);
  if (!card) return { error: 'No other skin cards left to swap to.' };
  const count = optionCount(source);
  const wrong = godIdentifyDistractors(card.god, count - 1);
  const seed = `${card.god}|${card.file || card.skinName}`;
  return packMc({
    prompt: source.prompt || 'Choose the correct god this skin belongs to.',
    correctLabel: card.god,
    distractors: wrong,
    count,
    image: card.url,
    extraMeta: {
      media: 'image',
      media_crop: 'skin_zoom_center',
      media_seed: seed,
      remix_kind: 'skin_guess',
      hint_context: { god: card.god, skin: card.skinName, file: card.file || null },
    },
    clearMedia: false,
  });
}

function remixAbilitySound(source, avoidTexts) {
  if (!isAbilitySoundPrompt(source)) return null;
  const clips = mediaCatalog.abilitySounds || [];
  if (clips.length < 4) return { error: 'No ability cast sounds left to swap to.' };
  const currentUrl = source.image_url || source.image_urls?.[0] || null;
  const avoidUrls = new Set([currentUrl].filter(Boolean));
  const hit = makeAbilitySoundQuestion({ count: optionCount(source), avoidUrls });
  if (!hit?.patch) return { error: 'No other ability cast sounds left to swap to.' };
  // keep avoidTexts from colliding labels when possible
  const used = usedNames(avoidTexts);
  if (used.size && Array.isArray(hit.patch.options)) {
    const label = hit.patch.options[hit.patch.correct?.index];
    if (label && used.has(norm(label))) {
      const retry = makeAbilitySoundQuestion({
        count: optionCount(source),
        avoidUrls: new Set([...avoidUrls, hit.patch.image_url].filter(Boolean)),
      });
      if (retry?.patch) return retry;
    }
  }
  return hit;
}

function remixGod(source, avoidTexts) {
  if (isAspectIconPrompt(source)) {
    const avoid = new Set();
    const cur = currentAspectIconKey(source);
    if (cur) avoid.add(cur);
    const hit =
      makeAspectIconQuestion({ count: optionCount(source), avoidIcons: avoid }) ||
      makeAspectIconQuestion({ count: optionCount(source) });
    if (hit?.patch) return hit;
    return { error: 'No other aspect icons left to swap to.' };
  }

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

  if (isGodEmojiPrompt(source)) {
    const hit = makeGodEmojiQuestion({ count: optionCount(source), avoidGods: taken });
    if (hit?.patch) return hit;
    return { error: 'No other emoji-god cards left to swap to.' };
  }

  const pool = catalog.gods.filter((g) => !taken.has(norm(g.name)));
  const preferSameGender = godSameGenderNames(fromName);
  const nextName =
    pickOne(preferSameGender.filter((n) => !taken.has(norm(n)))) ||
    pickOne(pool.map((g) => g.name));
  if (!nextName) return { error: 'No other gods left to swap to.' };
  const next = pool.find((g) => g.name === nextName) || { name: nextName };
  const distractors = godIdentifyDistractors(next.name, Math.max(3, optionCount(source) - 1));
  return applySwap(source, fromName, next.name, {
    distractors,
    prefer: distractors,
    image: next.image,
    realOnly: true,
  });
}

function optionCount(question) {
  const n = Array.isArray(question?.options)
    ? question.options.map((o) => String(o || '').trim()).filter(Boolean).length
    : 0;
  // Preserve host-added options (was hard-capped at 4–6 and wiped extras on Random answers).
  if (n >= 2) return Math.min(12, n);
  return 4;
}

/** @internal exported for local sim suite */
export function optionCountForSim(question) {
  return optionCount(question);
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
  const gender = String(me.gender || '').toLowerCase();
  const samePantheon = [];
  const sameRole = [];
  const sameGender = [];
  for (const g of catalog.gods || []) {
    if (norm(g.name) === norm(correctName)) continue;
    const row = godMeta[g.name];
    if (!row) continue;
    const gGender = String(row.gender || '').toLowerCase();
    if (gender && gGender && gGender !== gender) continue;
    if (pantheon && String(row.pantheon || '').toLowerCase() === pantheon) samePantheon.push(g.name);
    else if (role && String(row.role || '').toLowerCase() === role) sameRole.push(g.name);
    else sameGender.push(g.name);
  }
  return [...shuffle(samePantheon), ...shuffle(sameRole), ...shuffle(sameGender)];
}

function godSameGenderNames(correctName) {
  const gender = String(godMeta[String(correctName || '').trim()]?.gender || '')
    .trim()
    .toLowerCase();
  if (!gender) return catalog.gods.map((g) => g.name).filter((n) => norm(n) !== norm(correctName));
  return (catalog.gods || [])
    .filter((g) => {
      if (norm(g.name) === norm(correctName)) return false;
      return String(godMeta[g.name]?.gender || '')
        .trim()
        .toLowerCase() === gender;
    })
    .map((g) => g.name);
}

function emojiOverlapScore(a, b) {
  const left = Array.isArray(a) ? a : [];
  const right = new Set(Array.isArray(b) ? b : []);
  let score = 0;
  for (const e of left) {
    if (right.has(e)) score += 1;
  }
  return score;
}

/** Same gender first, then shared emoji glyphs, then pantheon/role — never items. */
function godEmojiDistractors(correctName, count) {
  const me = godMeta[String(correctName || '').trim()] || {};
  const gender = String(me.gender || '')
    .trim()
    .toLowerCase();
  const myEmojis = Array.isArray(me.emojis) ? me.emojis : [];
  const myPantheon = String(me.pantheon || '')
    .trim()
    .toLowerCase();
  const myRole = String(me.role || '')
    .trim()
    .toLowerCase();

  const scoreRow = (g, { requireGender }) => {
    if (norm(g.name) === norm(correctName)) return null;
    const row = godMeta[g.name] || {};
    const gGender = String(row.gender || '')
      .trim()
      .toLowerCase();
    if (requireGender && gender && gGender && gGender !== gender) return null;
    const overlap = emojiOverlapScore(myEmojis, row.emojis);
    let score = overlap * 100;
    if (gender && gGender === gender) score += 40;
    if (myPantheon && String(row.pantheon || '').toLowerCase() === myPantheon) score += 12;
    if (myRole && String(row.role || '').toLowerCase() === myRole) score += 6;
    score += Math.random() * 0.5;
    return { name: g.name, score, overlap };
  };

  let ranked = (catalog.gods || [])
    .map((g) => scoreRow(g, { requireGender: true }))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (ranked.length < count) {
    ranked = (catalog.gods || [])
      .map((g) => scoreRow(g, { requireGender: false }))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  const withOverlap = ranked.filter((r) => r.overlap > 0);
  const prefer = (withOverlap.length >= count ? withOverlap : ranked).map((r) => r.name);
  return trickishDistractors(correctName, prefer, count, {
    prefer,
    realOnly: true,
  });
}

function godIdentifyDistractors(correctName, count) {
  return trickishDistractors(
    correctName,
    catalog.gods.map((g) => g.name).filter((n) => norm(n) !== norm(correctName)),
    count,
    { prefer: godNeighborNames(correctName), realOnly: true }
  );
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
  const label = String(correctLabel ?? '').trim();
  const want = Math.max(2, Number(count) || 4);
  const wrong = (distractors || [])
    .map((d) => String(d ?? '').trim())
    .filter((d) => d && norm(d) !== norm(label));
  let options = shuffle([label, ...wrong.slice(0, Math.max(0, want - 1))].filter(Boolean));
  // Prefer keeping the requested length when enough distractors exist.
  if (options.length > want) options = options.slice(0, want);
  let index = options.findIndex((o) => norm(o) === norm(label));
  if (!label || index < 0) {
    options = [label || 'Correct', ...options.filter((o) => norm(o) !== norm(label))].slice(0, want);
    index = 0;
  }
  const patch = {
    type,
    prompt,
    options,
    correct: { index },
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
      correct: single
        ? { index: indices[0] }
        : { indices, index: indices[0] },
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

  if (isAspectIconPrompt(question)) {
    const avoid = new Set();
    const cur = currentAspectIconKey(question);
    if (cur) avoid.add(cur);
    const hit =
      makeAspectIconQuestion({ count, avoidIcons: avoid, keepPrompt: prompt }) ||
      makeAspectIconQuestion({ count, keepPrompt: prompt });
    if (hit?.patch) return hit;
    return { error: 'No aspect icons to fill answers.' };
  }

  if (isItemHasStatPrompt(question) || (stats.length && /(?:what|which)\s+item\s+has\b/i.test(prompt))) {
    const current = findStatsInText(prompt);
    const stat = current[0] || pickOne(popularStats());
    if (!stat) return { error: 'No item stats to fill answers.' };
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
      clearMedia: true,
      extraMeta: { remix_kind: 'item_has_stat', hint_context: { stat } },
    });
  }

  if (isGodEmojiPrompt(question)) {
    const markedRaw = currentCorrectLabel(question);
    const markedGod =
      markedRaw &&
      !isPlaceholderOption(markedRaw) &&
      catalog.gods.find((g) => norm(g.name) === norm(markedRaw));
    const hit = makeGodEmojiQuestion({
      count,
      correctName: markedGod?.name || question?.meta?.hint_context?.god || null,
    });
    if (hit?.patch) {
      return {
        patch: {
          ...hit.patch,
          prompt, // keep host wording
        },
      };
    }
    return { error: 'Not enough gods for emoji answers.' };
  }

  if (isVoiceLinePrompt(question) || isSkinGuessPrompt(question) || isAbilitySoundPrompt(question)) {
    const kind = question?.meta?.remix_kind;
    if (kind === 'ability_sound' || isAbilitySoundPrompt(question)) {
      const hit = makeAbilitySoundQuestion({ count });
      if (hit?.patch) return { patch: { ...hit.patch, prompt } };
    }
    if (kind === 'skin_guess' || isSkinGuessPrompt(question)) {
      const cards = mediaCatalog.skinCards || [];
      const card = pickSkinCard(cards);
      if (card) {
        return packMc({
          prompt,
          correctLabel: card.god,
          distractors: godIdentifyDistractors(card.god, count - 1),
          count,
          image: card.url,
          extraMeta: {
            media: 'image',
            media_crop: 'skin_zoom_center',
            media_seed: `${card.god}|${card.file || card.skinName}`,
            remix_kind: 'skin_guess',
            hint_context: { god: card.god, skin: card.skinName, file: card.file || null },
          },
        });
      }
    }
    const clips = mediaCatalog.voiceClips || [];
    const clip = pickVoiceClip(clips);
    if (clip) {
      return packMc({
        prompt,
        correctLabel: clip.god,
        distractors: godIdentifyDistractors(clip.god, count - 1),
        count,
        image: clip.url,
        extraMeta: {
          media: 'audio',
          remix_kind: 'voice_line',
          hint_context: {
            god: clip.god,
            skin: clip.skin,
            skinFolder: clip.skinFolder || null,
            kind: clip.kind,
          },
        },
      });
    }
  }

  const godNames = catalog.gods.map((g) => g.name);
  const markedRawEarly = currentCorrectLabel(question);
  const markedGodEarly =
    markedRawEarly &&
    !isPlaceholderOption(markedRawEarly) &&
    catalog.gods.find((g) => norm(g.name) === norm(markedRawEarly));
  const optionGodName = exactOptionHit(question?.options || [], godNames);
  if ((markedGodEarly || optionGodName) && !isAspectIconPrompt(question) && !isItemHasStatPrompt(question)) {
    const correctLabel = markedGodEarly?.name || optionGodName;
    return packMc({
      prompt,
      correctLabel,
      distractors: isGodEmojiPrompt(question)
        ? godEmojiDistractors(correctLabel, count - 1)
        : godIdentifyDistractors(correctLabel, count - 1),
      count,
      image: question?.image_url || question?.image_urls?.[0],
      clearMedia: false,
    });
  }

  if (namedItem && stats.length && !isItemHasStatPrompt(question)) {
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

  if (stats.length && /item/i.test(prompt) && !isItemHasStatPrompt(question)) {
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
      clearMedia: !isIdentifyItemPrompt(prompt),
      extraMeta: isIdentifyItemPrompt(prompt) ? {} : { remix_kind: 'item_has_stat', hint_context: { stat } },
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
  const markedIsGod = marked && catalog.gods.some((g) => norm(g.name) === norm(marked));
  const markedIsItem = marked && catalog.items.some((i) => norm(i.name) === norm(marked));
  const item =
    (namedItem && catalog.items.find((i) => i.name === namedItem)) ||
    (markedIsItem && catalog.items.find((i) => norm(i.name) === norm(marked))) ||
    (optionItemName && catalog.items.find((i) => i.name === optionItemName));
  if ((item || isIdentifyItemPrompt(prompt) || markedIsItem) && !markedIsGod) {
    const correctLabel = (markedIsItem && marked) || item?.name || pickOne(catalog.items)?.name;
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

/** Host picker + auto-fill: each id builds one question template. */
export const RANDOM_QUESTION_STYLES = [
  {
    id: 'item_has_stat',
    label: 'Item has this stat',
    blurb: 'Multiple choice — which item grants a named stat',
    group: 'Items',
  },
  {
    id: 'item_stat_amount',
    label: 'How much stat on item',
    blurb: 'Multiple choice — numeric amount for one item stat',
    group: 'Items',
  },
  {
    id: 'item_identify',
    label: 'Identify the item',
    blurb: 'Name the item from its icon',
    group: 'Items',
  },
  {
    id: 'ob_release',
    label: 'OB release god',
    blurb: 'Which god released in a given Open Beta patch',
    group: 'Gods',
  },
  {
    id: 'aspect_name',
    label: 'Aspect name',
    blurb: 'Fill the Aspect of ____ blank for a god',
    group: 'Gods',
  },
  {
    id: 'aspect_icon',
    label: 'Aspect icon',
    blurb: 'Show aspect emblem — pick god(s) that use it (multi when shared)',
    group: 'Gods',
  },
  {
    id: 'release_after',
    label: 'Who came after',
    blurb: 'Select all gods released after a named god',
    group: 'Gods',
  },
  {
    id: 'god_emoji',
    label: 'Guess from emojis',
    blurb: 'Three-emoji card — which god',
    group: 'Gods',
  },
  {
    id: 'voice_line',
    label: 'Guess the voice line',
    blurb: 'Audio — which god speaks this VOX line (prefers skin packs over Skin00_Base)',
    group: 'Media',
  },
  {
    id: 'ability_sound',
    label: 'Guess the ability sound',
    blurb: 'Audio — Skin00_Base Ability1–4 Activate/Start cast SFX',
    group: 'Media',
  },
  {
    id: 'skin_guess',
    label: 'Guess the skin (zoomed)',
    blurb: 'Zoomed NewGodSkins card — which god (prefers non-Default)',
    group: 'Media',
  },
];

export const RANDOM_QUESTION_QUICK = [
  'god_emoji',
  'skin_guess',
  'voice_line',
  'release_after',
  'item_identify',
];

export const MEDIA_REMIX_KINDS = new Set([
  'voice_line',
  'ability_sound',
  'skin_guess',
  'god_emoji',
  'aspect_icon',
]);

/** Apply a remix patch onto version A (mirrors QuestionCard). */
export function applyRemixPatchToQuestion(question, patch) {
  if (!patch || patch.error) return { error: patch?.error || 'No patch' };
  const p = patch.patch || patch;
  const meta = { ...(question?.meta || {}), ...(p.meta || {}), variants: question?.meta?.variants };
  const kind = p.meta?.remix_kind;
  const skin =
    kind === 'skin_guess' ||
    (p.meta?.media_crop === 'skin_zoom_center' && (!kind || kind === 'skin_guess'));
  if (!skin) {
    delete meta.media_crop;
    delete meta.media_seed;
  }
  if (p.clearMedia) delete meta.image_urls;
  let next = { ...question, ...p, meta };
  if (p.clearMedia) {
    next = { ...next, image_url: null, image_urls: [] };
    delete next.meta.image_urls;
  } else if (p.image_urls || p.image_url) {
    const list = (p.image_urls || [p.image_url]).filter(Boolean);
    next = { ...next, image_url: list[0] || null, meta: { ...next.meta, image_urls: list } };
  }
  delete next.clearMedia;
  return { question: next };
}

/** Apply a remix patch onto variant B/C (mirrors QuestionCard.commitVariantRemixPatch). */
export function applyRemixPatchToVariant(question, slotIndex, patch) {
  if (!patch || patch.error) return { error: patch?.error || 'No patch' };
  const p = patch.patch || patch;
  const variants = Array.isArray(question?.meta?.variants) ? [...question.meta.variants] : [];
  while (variants.length <= slotIndex) {
    variants.push({
      prompt: question?.prompt || '',
      options: Array.isArray(question?.options) ? [...question.options] : [],
      correct: question?.correct ? JSON.parse(JSON.stringify(question.correct)) : {},
      image_url: question?.image_url || null,
      image_urls: question?.image_urls || (question?.image_url ? [question.image_url] : []),
      type: question?.type,
      enabled: true,
    });
  }
  const {
    meta: patchMeta,
    points: _p,
    required: _r,
    clearMedia: _c,
    ...slotPatch
  } = p;
  const mediaKeys = ['media', 'media_crop', 'media_seed', 'remix_kind', 'emoji_set', 'hint_context'];
  const mediaBits = {};
  for (const k of mediaKeys) {
    if (patchMeta?.[k] !== undefined && patchMeta[k] !== null) mediaBits[k] = patchMeta[k];
  }
  let slotNext = { ...(variants[slotIndex] || {}), ...slotPatch, ...mediaBits };
  if (p.type) slotNext.type = p.type;
  if (p.clearMedia) {
    slotNext = { ...slotNext, image_url: null, image_urls: [] };
    delete slotNext.media_crop;
    delete slotNext.media_seed;
  } else if (p.image_urls || p.image_url) {
    const list = (p.image_urls || [p.image_url]).filter(Boolean);
    slotNext = { ...slotNext, image_url: list[0] || null, image_urls: list };
  }
  const skin =
    patchMeta?.remix_kind === 'skin_guess' || patchMeta?.media_crop === 'skin_zoom_center';
  if (!skin) {
    delete slotNext.media_crop;
    delete slotNext.media_seed;
  }
  variants[slotIndex] = slotNext;
  return {
    question: { ...question, meta: { ...(question?.meta || {}), variants } },
    variant: slotNext,
  };
}

/** True when a choice question has a collectible correct answer for host UI / scoring. */
export function hasCollectibleCorrect(q) {
  if (!q) return false;
  const opts = Array.isArray(q.options) ? q.options : [];
  if (q.type === 'multiple_selection' || Array.isArray(q.correct?.indices)) {
    const indices = (q.correct?.indices || [])
      .map(Number)
      .filter((i) => Number.isFinite(i) && opts[i] != null);
    return indices.length > 0;
  }
  if (q.type === 'short_answer' || q.meta?.kind === 'fill_blank') {
    const answers = q.correct?.answers || [];
    return answers.some((a) => String(a || '').trim());
  }
  const idx = Number(q.correct?.index);
  return Number.isFinite(idx) && idx >= 0 && opts[idx] != null && String(opts[idx]).trim() !== '';
}

/** Stable key for near-duplicate detection within a host session / generated set. */
export function questionFingerprint(q) {
  const opts = Array.isArray(q?.options) ? q.options : [];
  const url = q?.image_url || q?.image_urls?.[0] || '';
  let correct = '';
  if (Array.isArray(q?.correct?.indices) && q.correct.indices.length) {
    correct = q.correct.indices.map((i) => opts[i]).filter(Boolean).join('|');
  } else if (Number.isFinite(Number(q?.correct?.index))) {
    correct = opts[q.correct.index] || '';
  } else if (Array.isArray(q?.correct?.answers)) {
    correct = q.correct.answers.join('|');
  }
  return [q?.meta?.remix_kind || q?.type || '', norm(q?.prompt), norm(correct), norm(url)].join('::');
}

/** True when correct answer is not also present as a distractor / duplicate option. */
export function optionsAreValid(q) {
  const opts = (Array.isArray(q?.options) ? q.options : [])
    .map((o) => String(o || '').trim())
    .filter(Boolean);
  if (opts.length < 2) return false;
  const seen = new Set();
  for (const o of opts) {
    const k = norm(o);
    if (!k) return false;
    if (seen.has(k)) return false;
    seen.add(k);
  }
  if (!hasCollectibleCorrect(q)) return false;
  return true;
}

function styleMakers(count) {
  return {
    item_has_stat: () => makeItemHasStatQuestion({ count }),
    item_stat_amount: () => {
      const stat = pickOne(popularStats());
      const withStat = catalog.items.filter((i) => i.stats?.[stat] != null);
      const item = pickOne(withStat);
      if (!item) return null;
      const val = item.stats[stat];
      const others = [
        ...new Set(withStat.filter((i) => i.stats[stat] !== val).map((i) => String(i.stats[stat]))),
      ];
      if (others.length < 3) return null;
      return packMc({
        prompt: `How much ${stat} does ${item.name} give?`,
        correctLabel: String(val),
        distractors: others,
        count,
        clearMedia: true,
        extraMeta: { remix_kind: 'item_stat_amount', hint_context: { stat, item: item.name } },
      });
    },
    item_identify: () => {
      const item = pickOne(catalog.items.filter((i) => i.image && (i.tier === 3 || i.starter)));
      if (!item) return null;
      return packMc({
        prompt: 'What is this item called?',
        correctLabel: item.name,
        distractors: itemIdentifyDistractors(item.name, count - 1),
        count,
        image: item.image,
        extraMeta: { remix_kind: 'item_identify', media: 'image', hint_context: { item: item.name } },
      });
    },
    aspect_icon: () => makeAspectIconQuestion({ count }),
    ob_release: () => {
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
    aspect_name: () => {
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
    voice_line: () => {
      const clips = mediaCatalog.voiceClips || [];
      if (clips.length < 4) return null;
      const clip = pickVoiceClip(clips);
      if (!clip) return null;
      const wrong = godIdentifyDistractors(clip.god, count - 1);
      return packMc({
        prompt: 'Choose the correct god this voice line belongs to.',
        correctLabel: clip.god,
        distractors: wrong,
        count,
        image: clip.url,
        extraMeta: {
          media: 'audio',
          remix_kind: 'voice_line',
          hint_context: {
            god: clip.god,
            skin: clip.skin,
            skinFolder: clip.skinFolder || null,
            kind: clip.kind,
          },
        },
      });
    },
    ability_sound: () => makeAbilitySoundQuestion({ count }),
    skin_guess: () => {
      const cards = mediaCatalog.skinCards || [];
      if (cards.length < 4) return null;
      const card = pickSkinCard(cards);
      if (!card) return null;
      const wrong = godIdentifyDistractors(card.god, count - 1);
      const seed = `${card.god}|${card.file || card.skinName}`;
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
          hint_context: { god: card.god, skin: card.skinName, file: card.file || null },
        },
      });
    },
    release_after: () => makeReleaseAfterQuestion({ count }),
    god_emoji: () => makeGodEmojiQuestion({ count }),
  };
}

/** Build one question from a host-picked style id. */
export function makeRandomQuestionByStyle(styleId, question) {
  const count = optionCount(question);
  const fillBlank = question?.meta?.kind === 'fill_blank';
  if (fillBlank || styleId === 'aspect_blank') {
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

  const makers = styleMakers(count);
  const make = makers[styleId];
  if (!make) return { error: `Unknown question style: ${styleId}` };
  for (let i = 0; i < 10; i += 1) {
    const result = make();
    if (result?.patch) return result;
    if (result?.error) return result;
  }
  return { error: `Could not build a “${styleId}” question from the current catalogs.` };
}

/** Invent a new question + answers (random style). Prefer makeRandomQuestionByStyle from the host picker. */
export function randomizeQuestion(question) {
  const count = optionCount(question);
  const fillBlank = question?.meta?.kind === 'fill_blank';
  if (fillBlank) return makeRandomQuestionByStyle('aspect_blank', question);

  if (isAspectIconPrompt(question)) {
    const hit = makeAspectIconQuestion({ count });
    if (hit?.patch) return hit;
  }

  if (isItemHasStatPrompt(question)) {
    const current = findStatsInText(question?.prompt || '');
    const hit =
      makeItemHasStatQuestion({ count, avoidStats: new Set(current.map(norm)) }) ||
      makeItemHasStatQuestion({ count });
    if (hit?.patch) return hit;
  }

  if (isReleaseAfterPrompt(question?.prompt) || question?.meta?.remix_kind === 'release_after') {
    const avoidGods = usedNames([question?.prompt]);
    const hit = makeReleaseAfterQuestion({ count, avoidGods });
    if (hit?.patch) return hit;
  }

  const makers = styleMakers(count);
  const order = shuffle(Object.keys(makers));
  for (const id of order) {
    const result = makers[id]();
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
    image_url: questionA?.image_url,
    image_urls: questionA?.image_urls,
  };
  const avoid = [source.prompt, ...avoidTexts];
  const tries = [
    remixAbilitySound,
    remixVoiceLine,
    remixSkinGuess,
    remixRelease,
    remixItem,
    remixAspect,
    remixAbility,
    remixGod,
  ];
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
