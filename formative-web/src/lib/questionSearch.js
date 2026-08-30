import { splitFillBlankPrompt } from './fillBlank';
import { matchingEditorRows, matchingExtraRightsEditor } from './matching';
import { promptPlain } from './promptPlain';
import { typeLabel } from './questionTypes';
import { variantLetter } from './triviaVariants';

function norm(s) {
  return String(s || '').toLowerCase();
}

function plainOption(opt) {
  if (opt == null) return '';
  if (typeof opt === 'string') return promptPlain(opt);
  if (typeof opt === 'object') {
    return promptPlain(opt.label || opt.text || opt.left || opt.right || '');
  }
  return promptPlain(String(opt));
}

function optionTexts(options) {
  if (!Array.isArray(options)) return [];
  return options.map(plainOption).filter(Boolean);
}

function correctTexts(correct, options) {
  if (!correct || typeof correct !== 'object') return [];
  const opts = Array.isArray(options) ? options : [];
  const out = [];
  if (Array.isArray(correct.answers)) {
    out.push(...correct.answers.map((a) => promptPlain(a)).filter(Boolean));
  }
  if (correct.answer != null && String(correct.answer).trim()) {
    out.push(promptPlain(correct.answer));
  }
  if (Array.isArray(correct.indices)) {
    for (const i of correct.indices) {
      const label = opts[Number(i)];
      if (label != null) out.push(plainOption(label));
    }
  } else if (Number.isFinite(Number(correct.index))) {
    const label = opts[Number(correct.index)];
    if (label != null) out.push(plainOption(label));
  }
  if (Array.isArray(correct.order)) {
    out.push(...correct.order.map((a) => promptPlain(a)).filter(Boolean));
  }
  return out;
}

function matchingTexts(q) {
  if (q?.type !== 'matching') return [];
  const rows = matchingEditorRows(q);
  const texts = [];
  for (const row of rows) {
    if (row.left) texts.push(promptPlain(row.left));
    if (row.rightsText) texts.push(promptPlain(row.rightsText));
  }
  texts.push(...matchingExtraRightsEditor(q).map((s) => promptPlain(s)).filter(Boolean));
  return texts;
}

function categorizeTexts(q) {
  if (q?.type !== 'categorize') return [];
  const opts = q.options;
  if (!opts || typeof opts !== 'object') return [];
  const texts = [];
  if (Array.isArray(opts.categories)) texts.push(...opts.categories.map(promptPlain));
  if (Array.isArray(opts.items)) texts.push(...opts.items.map(promptPlain));
  return texts.filter(Boolean);
}

function variantSlice(q, variantIndex) {
  if (!variantIndex) {
    return { prompt: q.prompt, options: q.options, correct: q.correct, type: q.type };
  }
  const slot = Array.isArray(q.meta?.variants) ? q.meta.variants[variantIndex - 1] : null;
  if (!slot) return null;
  return {
    prompt: slot.prompt != null ? slot.prompt : q.prompt,
    options: slot.options != null ? slot.options : q.options,
    correct: slot.correct != null ? slot.correct : q.correct,
    type: slot.type || q.type,
  };
}

function collectVariantTexts(q, questionIndex, variantIndex) {
  const slice = variantSlice(q, variantIndex);
  if (!slice) return [];
  const n = questionIndex + 1;
  const texts = [
    `q${n}`,
    `question ${n}`,
    typeLabel({ ...q, type: slice.type, meta: q.meta }),
    promptPlain(slice.prompt),
  ];
  if (q.meta?.kind === 'fill_blank') {
    const parts = splitFillBlankPrompt(slice.prompt);
    if (parts.before) texts.push(promptPlain(parts.before));
    if (parts.after) texts.push(promptPlain(parts.after));
  }
  texts.push(...optionTexts(slice.options));
  texts.push(...correctTexts(slice.correct, slice.options));
  if (variantIndex === 0) {
    texts.push(...matchingTexts(q));
    texts.push(...categorizeTexts(q));
    if (q.meta?.passage) texts.push(promptPlain(q.meta.passage));
  }
  return texts.filter(Boolean);
}

function matchSnippet(texts, query) {
  const q = norm(query);
  for (const raw of texts) {
    const t = norm(raw);
    const idx = t.indexOf(q);
    if (idx < 0) continue;
    const start = Math.max(0, idx - 24);
    const end = Math.min(raw.length, idx + q.length + 36);
    let snippet = raw.slice(start, end).trim();
    if (start > 0) snippet = `…${snippet}`;
    if (end < raw.length) snippet = `${snippet}…`;
    return snippet;
  }
  return texts[0] ? promptPlain(texts[0]).slice(0, 80) : '';
}

/**
 * @returns {{ matches: Array<{ questionId, questionIndex, variantIndex, texts, snippet, title }>, matchedIds: Set<string> }}
 */
export function searchQuestions(questions, query) {
  const list = Array.isArray(questions) ? questions : [];
  const q = norm(String(query || '').trim());
  const allIds = new Set(list.map((item) => String(item.id)));
  if (!q) return { matches: [], matchedIds: allIds };

  const matches = [];
  const matchedIds = new Set();

  list.forEach((question, questionIndex) => {
    const variantCount = 1 + (Array.isArray(question.meta?.variants) ? question.meta.variants.length : 0);
    for (let variantIndex = 0; variantIndex < variantCount; variantIndex += 1) {
      const texts = collectVariantTexts(question, questionIndex, variantIndex);
      const haystack = norm(texts.join(' '));
      if (!haystack.includes(q)) continue;
      matchedIds.add(String(question.id));
      const version =
        variantIndex > 0 ? ` · Version ${variantLetter(variantIndex)}` : '';
      matches.push({
        questionId: question.id,
        questionIndex,
        variantIndex,
        texts,
        snippet: matchSnippet(texts, query),
        title: `Q${questionIndex + 1}${version}`,
      });
    }
  });

  return { matches, matchedIds };
}
