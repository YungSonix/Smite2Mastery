import { useEffect, useRef, useState } from 'react';
import VisualTextEditor from './VisualTextEditor';
import MediaStack from './MediaStack';
import { joinFillBlankPrompt, splitFillBlankPrompt } from '../lib/fillBlank';
import {
  MAX_VERSION_MEDIA,
  listMediaUrls,
  questionMediaCrop,
  questionMediaCropSeed,
  withMediaUrlsOnQuestion,
  withMediaUrlsOnVariant,
} from '../lib/questionMedia';
import {
  MEDIA_ATTACH_CHOICES,
  SWITCHABLE_TYPES,
  questionDefaultsForType,
  switchTypeValue,
  typeLabel,
} from '../lib/questionTypes';
import {
  buildMatchingSave,
  isOrderingQuestion,
  matchingEditorRows,
  matchingExtraRightsEditor,
} from '../lib/matching';
import CategorizeBoard from './CategorizeBoard';
import { parseCategorize } from '../lib/categorize';
import { remixQuestionFromA, fillAnswersFromPrompt, makeRandomQuestionByStyle, RANDOM_QUESTION_STYLES, RANDOM_QUESTION_QUICK } from '../lib/triviaRemix';
import { applyPromptTextStyle } from '../lib/richText';
import { questionAllowsPartialCredit } from '../lib/quizGrading';
import { applyVariant, MAX_QUESTION_VARIANTS, variantLetter } from '../lib/triviaVariants';
import {
  questionHintUiAllowed,
  storedHintList,
  withGeneratedHints,
} from '../lib/triviaHints';

async function readFileAsDataUrl(file, { maxBytes = 2.5 * 1024 * 1024, acceptPrefix } = {}) {
  if (!file) throw new Error('No file selected');
  const type = String(file.type || '');
  const name = String(file.name || '').toLowerCase();
  const audioByName = /\.(wav|mp3|m4a|ogg|aac|flac)$/i.test(name);
  const videoByName = /\.(mp4|webm|mov)$/i.test(name);
  if (acceptPrefix === 'audio/' && !(type.startsWith('audio/') || audioByName)) {
    throw new Error('Please choose an audio file');
  }
  if (acceptPrefix === 'video/' && !(type.startsWith('video/') || videoByName)) {
    throw new Error('Please choose a video file');
  }
  if (acceptPrefix && acceptPrefix !== 'audio/' && acceptPrefix !== 'video/' && !type.startsWith(acceptPrefix)) {
    throw new Error(`Please choose a ${acceptPrefix.replace('/', '')} file`);
  }
  if (file.size > maxBytes) throw new Error('File too large (max ~2.5MB)');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function parseCommaAnswers(raw, { clean = false } = {}) {
  const parts = String(raw ?? '').split(',');
  if (clean) return parts.map((s) => s.trim()).filter(Boolean);
  return parts.map((s, i) => (i === parts.length - 1 ? s.replace(/^\s+/, '') : s.trim()));
}

function AttachFileButton({ onChange, accept = 'image/*,audio/*,video/*' }) {
  return (
    <label className="f-outline-btn f-file-btn">
      Attach file
      <input type="file" accept={accept} multiple onChange={onChange} />
    </label>
  );
}

function RandomQuestionPicker({ onPick, fillBlank }) {
  const [open, setOpen] = useState(false);
  const styles = fillBlank
    ? [{ id: 'aspect_blank', label: 'Aspect fill-in-blank', blurb: 'God Aspect of ____', group: 'Gods' }]
    : RANDOM_QUESTION_STYLES;
  const byGroup = styles.reduce((acc, s) => {
    const g = s.group || 'Other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});
  const quick = (fillBlank ? styles : RANDOM_QUESTION_QUICK.map((id) => styles.find((s) => s.id === id)).filter(Boolean));

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="f-random-style-wrap">
      <button
        type="button"
        className="f-outline-btn"
        title="Pick a question template, then roll a fresh example"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Random question
      </button>
      {open ? (
        <div className="f-overlay" onClick={() => setOpen(false)} role="presentation">
          <div
            className="f-random-style-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Question style"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="f-random-style-panel-head">
              <span>Question style</span>
              <button type="button" className="f-icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <div className="f-random-style-panel-body">
              <div className="f-random-style-sections">
                {Object.entries(byGroup).map(([group, items]) => (
                  <section className="f-random-style-section" key={group}>
                    <h4>{group}</h4>
                    <div className="f-random-style-section-grid">
                      {items.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="f-add-item"
                          onClick={() => {
                            setOpen(false);
                            onPick(s.id);
                          }}
                        >
                          <span className="f-random-style-label">{s.label}</span>
                          {s.blurb ? <span className="f-random-style-blurb">{s.blurb}</span> : null}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <aside className="f-random-style-side">
                <h4>Templates</h4>
                <p>Pick a style to roll a fresh question with matching answers and media when the catalog has it.</p>
              </aside>
            </div>
            <div className="f-add-footer">
              <div className="f-quickbar">
                <button
                  type="button"
                  className="plus"
                  aria-label="Pick first style"
                  onClick={() => {
                    const first = styles[0];
                    if (!first) return;
                    setOpen(false);
                    onPick(first.id);
                  }}
                >
                  +
                </button>
                {quick.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="f-quick-btn"
                    onClick={() => {
                      setOpen(false);
                      onPick(s.id);
                    }}
                  >
                    {s.label.replace(/^Guess (the|from) /i, '').replace(/^Who /i, '')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function QuestionCard({
  question,
  index,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
  autoHints = false,
  quizPartialCreditMs = false,
  focusVariantIndex,
  focusVariantToken,
  highlight = false,
}) {
  const [q, setQ] = useState(question);
  const [uploadError, setUploadError] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [variantTab, setVariantTab] = useState(0); // 0=A, extras in meta.variants
  const [variantSearchHighlight, setVariantSearchHighlight] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [mediaPreviewToken, setMediaPreviewToken] = useState(null);
  useEffect(() => {
    setQ(question);
  }, [question]);

  useEffect(() => {
    if (focusVariantIndex == null || focusVariantToken == null) return;
    const tab = Math.max(0, Number(focusVariantIndex) || 0);
    const extras = Array.isArray(question.meta?.variants) ? question.meta.variants : [];
    if (tab > 0 && extras.length < tab) return;
    setVariantTab(tab);
    setVariantSearchHighlight(true);
    const t = setTimeout(() => setVariantSearchHighlight(false), 2200);
    return () => clearTimeout(t);
  }, [focusVariantIndex, focusVariantToken, question.id, question.meta?.variants]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Fill-in-blank always has one blank marker.
  useEffect(() => {
    if (!question?.meta?.kind || question.meta.kind !== 'fill_blank') return;
    const parts = splitFillBlankPrompt(question.prompt);
    if (parts.hasBlank) return;
    const next = {
      ...question,
      prompt: joinFillBlankPrompt(String(question.prompt || '').trim(), '', '{{blank}}'),
      correct: {
        ...(question.correct || {}),
        answers: Array.isArray(question.correct?.answers) && question.correct.answers.length
          ? question.correct.answers
          : [''],
      },
    };
    setQ(next);
    onChange(next);
    // intentionally only when missing blank
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, question?.prompt, question?.meta?.kind]);

  const isDiscord = q.meta?.is_discord_gate;
  const isIngame = q.meta?.is_ingame_gate;
  const isGate = isDiscord || isIngame;
  const options = Array.isArray(q.options) ? q.options : [];
  const isMediaContent = ['image', 'audio', 'video', 'embed'].includes(q.type);
  const isChoice =
    q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown';
  const isMulti = q.type === 'multiple_selection';
  const isFillBlank = q.meta?.kind === 'fill_blank';
  const isGraphing = q.meta?.kind === 'graphing';
  const variantExtras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
  const VARIANT_MEDIA_META_KEYS = [
    'media',
    'media_crop',
    'media_seed',
    'remix_kind',
    'emoji_set',
    'hint_context',
  ];
  /** Crop/seed must not fall back to Version A — that forces skin zoom on emoji/item URLs. */
  const CROP_META_KEYS = new Set(['media_crop', 'media_seed']);
  const mediaMetaFromObj = (obj, fallbackMeta = {}, { inheritCrop = true } = {}) => {
    const src = obj && typeof obj === 'object' ? obj : {};
    const meta = fallbackMeta && typeof fallbackMeta === 'object' ? fallbackMeta : {};
    const nested = src.meta && typeof src.meta === 'object' ? src.meta : {};
    const out = {};
    for (const key of VARIANT_MEDIA_META_KEYS) {
      if (src[key] !== undefined && src[key] !== null) out[key] = src[key];
      else if (src[key] === null) continue;
      else if (nested[key] !== undefined && nested[key] !== null) out[key] = nested[key];
      else if (!inheritCrop && CROP_META_KEYS.has(key)) continue;
      else if (meta[key] !== undefined && meta[key] !== null) out[key] = meta[key];
    }
    return out;
  };
  const isSkinCropMeta = (meta) => {
    const kind = meta?.remix_kind;
    if (kind && kind !== 'skin_guess') return false;
    return kind === 'skin_guess' || meta?.media_crop === 'skin_zoom_center';
  };
  const stripCropUnlessSkin = (meta) => {
    if (!meta || typeof meta !== 'object') return meta;
    if (isSkinCropMeta(meta)) return meta;
    const next = { ...meta };
    delete next.media_crop;
    delete next.media_seed;
    return next;
  };
  const displayVariant = applyVariant(q, variantTab);
  const activeMediaUrls = listMediaUrls(displayVariant);
  const activeMediaMeta = displayVariant.meta || {};
  const firstMedia = activeMediaUrls[0] || null;
  const useMediaSplit =
    !isGate &&
    (q.type === 'image' ||
      q.type === 'audio' ||
      q.type === 'video' ||
      q.type === 'embed' ||
      q.type === 'hot_spot' ||
      ((isChoice || isMulti || q.type === 'short_answer') && activeMediaUrls.length > 0));

  const local = (patch) => {
    const merged = { ...q, ...patch };
    setQ(merged);
    onChange(merged);
  };
  const commit = (next) => {
    const merged = next || q;
    setQ(merged);
    onChange(merged);
  };

  const setAllowMultiple = (multi) => {
    if (q.type === 'true_false' || q.type === 'dropdown') return;
    if (multi === isMulti) return;
    if (multi) {
      const idx = Number.isFinite(Number(q.correct?.index)) ? Number(q.correct.index) : 0;
      const fromList = Array.isArray(q.correct?.indices)
        ? q.correct.indices.map(Number).filter((n) => Number.isFinite(n))
        : [];
      const indices = fromList.length ? fromList : [idx];
      commit({ ...q, type: 'multiple_selection', correct: { indices } });
      return;
    }
    const indices = (q.correct?.indices || []).map(Number).filter((n) => Number.isFinite(n));
    const index = indices.length ? indices[0] : Number(q.correct?.index) || 0;
    commit({ ...q, type: 'multiple_choice', correct: { index } });
  };

  const convertType = (nextId) => {
    if (isGate) return;
    const current = switchTypeValue(q);
    if (nextId === current) return;
    const d = questionDefaultsForType(nextId);
    const nextMeta = { ...(q.meta || {}) };
    delete nextMeta.kind;
    delete nextMeta.passage;
    delete nextMeta.extra_rights;
    Object.assign(nextMeta, d.meta || {});
    commit({
      ...q,
      type: d.type,
      options: d.options,
      correct: d.correct,
      meta: nextMeta,
      prompt: q.prompt || d.prompt,
    });
  };

  const isBareMedia = q.type === 'image' || q.type === 'audio';
  const supportsVariants =
    !isGate &&
    !isBareMedia &&
    !['image', 'audio', 'video', 'embed', 'content'].includes(q.type);

  const matchRows = matchingEditorRows(q);
  const matchExtras = matchingExtraRightsEditor(q);
  const orderItems = isOrderingQuestion(q)
    ? Array.isArray(q.options)
      ? q.options.map(String)
      : []
    : [];
  const catState = q.type === 'categorize' ? parseCategorize(q) : null;

  const fibRaw = splitFillBlankPrompt(q.prompt);
  const fib = fibRaw.hasBlank
    ? fibRaw
    : { before: fibRaw.before, after: '', marker: '{{blank}}', hasBlank: true };
  const blankAnswers = Array.isArray(q.correct?.answers)
    ? q.correct.answers.length
      ? q.correct.answers
      : ['']
    : [q.correct?.answer || ''];

  const setFibParts = (before, after, marker = '{{blank}}') => {
    local({ prompt: joinFillBlankPrompt(before, after, marker) });
  };

  const commitBlankAnswers = (list) => {
    const cleaned = (list || []).map((s) => String(s || '').trim()).filter(Boolean);
    commit({
      ...q,
      correct: { ...(q.correct || {}), answers: cleaned.length ? cleaned : [''] },
    });
  };

  /** Deep-clone Version A prompt HTML + answers/correct/media into a new B/C slot. */
  const cloneFieldsFromVersionA = () => {
    const seeded = withMediaUrlsOnVariant({}, listMediaUrls(q));
    return {
      // String copy preserves rich HTML (color / bold / size), not plain text.
      prompt: String(q.prompt ?? ''),
      options: Array.isArray(q.options) ? q.options.map((o) => (typeof o === 'string' ? o : { ...o })) : q.options,
      correct: q.correct ? JSON.parse(JSON.stringify(q.correct)) : {},
      type: q.type,
      ...seeded,
      ...mediaMetaFromObj(q.meta || {}),
      enabled: true,
    };
  };

  const ensureVariantSlot = (slotIndex) => {
    const variants = [...variantExtras];
    const maxExtras = MAX_QUESTION_VARIANTS - 1;
    const target = Math.min(slotIndex, maxExtras - 1);
    while (variants.length <= target && variants.length < maxExtras) {
      variants.push(cloneFieldsFromVersionA());
    }
    return variants;
  };

  const addQuestionVersion = () => {
    const maxExtras = MAX_QUESTION_VARIANTS - 1;
    if (variantExtras.length >= maxExtras) return;
    const variants = ensureVariantSlot(variantExtras.length);
    commit({ ...q, meta: { ...(q.meta || {}), variants } });
    setVariantTab(variants.length);
  };

  const setActiveMedia = (urls) => {
    if (variantTab === 0) {
      commit(withMediaUrlsOnQuestion(q, urls));
      return;
    }
    const slot = variantTab - 1;
    const variants = ensureVariantSlot(slot);
    variants[slot] = withMediaUrlsOnVariant(variants[slot] || {}, urls);
    commit({ ...q, meta: { ...(q.meta || {}), variants } });
  };

  const appendFiles = async (files, readFile) => {
    if (!files.length) return;
    setUploadError('');
    try {
      const next = [...activeMediaUrls];
      for (const file of files) {
        if (next.length >= MAX_VERSION_MEDIA) break;
        next.push(await readFile(file));
      }
      setActiveMedia(next);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    }
  };

  const onPickFile = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    await appendFiles(files, (file) => {
      const type = String(file.type || '');
      const name = String(file.name || '').toLowerCase();
      if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
        throw new Error(
          'Do not embed image files in the quiz. Paste a /media/… URL, a GitHub app/data URL, or use Random question.'
        );
      }
      if (type.startsWith('audio/') || /\.(wav|mp3|m4a|ogg|aac|flac)$/i.test(name)) {
        throw new Error(
          'Do not embed audio files in the quiz. Paste a /media/VoiceAudio/… or GitHub VoiceAudio URL instead.'
        );
      }
      if (type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(name)) {
        return readFileAsDataUrl(file, { acceptPrefix: 'video/', maxBytes: 8 * 1024 * 1024 });
      }
      throw new Error('Please choose an image, audio, or video file');
    });
  };

  const triggerChangeRemixPreview = (patch) => {
    const meta = patch?.meta || {};
    const url = patch.image_url || patch.image_urls?.[0] || '';
    // Remount media pane for every media swap (emoji/item/skin/audio) — stale crop/img state otherwise sticks.
    setMediaPreviewToken(`${Date.now()}|${url}|${meta.media_seed || ''}|${meta.remix_kind || ''}`);
  };

  const activeSourceQuestion = () => applyVariant(q, variantTab);

  const commitVariantRemixPatch = (patch) => {
    const slot = variantTab - 1;
    const variants = ensureVariantSlot(slot);
    const { meta: patchMeta, points: _p, required: _r, clearMedia: _c, ...slotPatch } = patch || {};
    let slotNext = { ...(variants[slot] || {}), ...slotPatch, ...mediaMetaFromObj(patchMeta || {}) };
    if (patch?.type) slotNext.type = patch.type;
    if (patch.clearMedia) {
      slotNext = { ...slotNext, image_url: null, image_urls: [] };
      delete slotNext.media_crop;
      delete slotNext.media_seed;
    } else if (patch.image_urls || patch.image_url) {
      slotNext = withMediaUrlsOnVariant(
        slotNext,
        patch.image_urls || [patch.image_url].filter(Boolean)
      );
    }
    // Drop leftover skin zoom when remixing to emoji / item / audio (URL alone used to keep crop).
    if (!isSkinCropMeta(patchMeta || {})) {
      delete slotNext.media_crop;
      delete slotNext.media_seed;
    }
    variants[slot] = slotNext;
    commit({ ...q, meta: { ...(q.meta || {}), variants } });
  };

  const styleRemixPatch = (patch, styleFromPrompt) => {
    if (!patch?.prompt) return patch;
    return { ...patch, prompt: applyPromptTextStyle(styleFromPrompt, patch.prompt) };
  };

  /** Prefer Version A’s rich prompt as the style template (extras may already be remixed plain). */
  const promptStyleSource = () => q.prompt || activeSourceQuestion().prompt || '';

  const applyChangeQuestionAnswer = () => {
    const avoid =
      variantTab > 0
        ? variantExtras.map((v, i) => (i === variantTab - 1 ? '' : v?.prompt)).filter(Boolean)
        : [];
    const source = activeSourceQuestion();
    const result = remixQuestionFromA(source, { avoidTexts: avoid });
    if (result.error) {
      setUploadError(result.error);
      return;
    }
    setUploadError('');
    const patch = styleRemixPatch(result.patch || {}, promptStyleSource());
    const metaFields = patch.meta || {};

    if (variantTab > 0) {
      commitVariantRemixPatch(patch);
    } else {
      let next = {
        ...q,
        ...patch,
        meta: stripCropUnlessSkin({
          ...(q.meta || {}),
          ...metaFields,
          variants: q.meta?.variants,
        }),
      };
      if (patch.clearMedia) {
        next = withMediaUrlsOnQuestion({ ...next, image_url: null }, []);
        next = { ...next, meta: stripCropUnlessSkin(next.meta) };
      } else if (patch.image_urls || patch.image_url) {
        next = withMediaUrlsOnQuestion(next, patch.image_urls || [patch.image_url].filter(Boolean));
        next = { ...next, meta: stripCropUnlessSkin({ ...next.meta, ...(patch.meta || {}) }) };
      }
      delete next.clearMedia;
      if (autoHints || next.meta?.hints_enabled) {
        next = withGeneratedHints(next, {
          enable: Boolean(autoHints || next.meta?.hints_enabled),
          overwrite: false,
        });
      }
      commit(next);
    }
    triggerChangeRemixPreview(patch);
  };

  const applyGeneratedPatch = (result) => {
    if (result.error) {
      setUploadError(result.error);
      return;
    }
    setUploadError('');
    const patch = styleRemixPatch(result.patch || {}, promptStyleSource());
    if (variantTab > 0) {
      commitVariantRemixPatch(patch);
      triggerChangeRemixPreview(patch);
      return;
    }
    const meta = stripCropUnlessSkin({
      ...(q.meta || {}),
      ...(patch.meta || {}),
      variants: q.meta?.variants,
    });
    if (patch.clearMedia) delete meta.image_urls;
    let next = { ...q, ...patch, meta };
    if (patch.clearMedia) {
      next = withMediaUrlsOnQuestion({ ...next, image_url: null }, []);
      next = { ...next, meta: stripCropUnlessSkin(next.meta) };
    } else if (patch.image_urls || patch.image_url) {
      next = withMediaUrlsOnQuestion(next, patch.image_urls || [patch.image_url].filter(Boolean));
      next = { ...next, meta: stripCropUnlessSkin({ ...next.meta, ...(patch.meta || {}) }) };
    }
    if (autoHints || next.meta?.hints_enabled) {
      next = withGeneratedHints(next, {
        enable: Boolean(autoHints || next.meta?.hints_enabled),
        overwrite: false,
      });
    }
    delete next.clearMedia;
    commit(next);
    triggerChangeRemixPreview(patch);
  };

  const pickRandomStyle = (styleId) => {
    applyGeneratedPatch(makeRandomQuestionByStyle(styleId, activeSourceQuestion()));
  };

  const generateButtons = !isGate ? (
    <>
      <button
        type="button"
        className="f-outline-btn"
        title="Swap using builds.json names (items, gods, aspects, OB patches) and attach matching art"
        onClick={applyChangeQuestionAnswer}
      >
        Change question/answer
      </button>
      <button
        type="button"
        className="f-outline-btn"
        title="Keep this prompt; fill real answers and mark the correct one from builds.json"
        onClick={() => {
          const extras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
          const src = variantTab === 0 ? q : { ...q, ...(extras[variantTab - 1] || {}) };
          applyGeneratedPatch(fillAnswersFromPrompt(src));
        }}
      >
        Random answers
      </button>
      <RandomQuestionPicker fillBlank={isFillBlank} onPick={pickRandomStyle} />
    </>
  ) : null;

  const patchVariantSlot = (slotIndex, patch) => {
    const variants = ensureVariantSlot(slotIndex);
    variants[slotIndex] = { ...(variants[slotIndex] || {}), ...patch };
    commit({ ...q, meta: { ...(q.meta || {}), variants } });
  };

  const openVariantTab = (tab) => {
    if (tab > 0 && variantExtras.length < tab) return;
    setVariantTab(tab);
  };

  const toggleVariantEnabled = (tab) => {
    if (tab <= 0) return;
    if (variantExtras.length < tab) return;
    patchVariantSlot(tab - 1, {
      enabled: variantExtras[tab - 1]?.enabled === false,
    });
  };

  /** Remove one extra version. Version A is the base question and can never be removed here. */
  const deleteVariantTab = (tab) => {
    if (tab <= 0 || variantExtras.length < tab) return;
    const letter = variantLetter(tab);
    const ok = window.confirm(
      `Delete Version ${letter}? This cannot be undone from responses already collected.`
    );
    if (!ok) return;
    const variants = variantExtras.filter((_, i) => i !== tab - 1);
    const nextMeta = { ...(q.meta || {}) };
    if (variants.length) nextMeta.variants = variants;
    else delete nextMeta.variants;
    commit({ ...q, meta: nextMeta });
    setVariantTab((cur) => {
      if (cur === tab) return tab - 1;
      if (cur > tab) return cur - 1;
      return cur;
    });
  };

  const activeVariantFields =
    variantTab === 0
      ? {
          prompt: q.prompt || '',
          options: Array.isArray(q.options) ? q.options : [],
          correct: q.correct || {},
          image_url: q.image_url,
          type: q.type,
        }
      : {
          prompt: variantExtras[variantTab - 1]?.prompt ?? q.prompt ?? '',
          options: Array.isArray(variantExtras[variantTab - 1]?.options)
            ? variantExtras[variantTab - 1].options
            : Array.isArray(q.options)
              ? q.options
              : [],
          correct: variantExtras[variantTab - 1]?.correct ?? q.correct ?? {},
          image_url:
            variantExtras[variantTab - 1]?.image_url !== undefined
              ? variantExtras[variantTab - 1].image_url
              : q.image_url,
          type: variantExtras[variantTab - 1]?.type || q.type,
        };
  const activeIsMulti = activeVariantFields.type === 'multiple_selection';
  const activeIsChoice =
    activeVariantFields.type === 'multiple_choice' ||
    activeVariantFields.type === 'true_false' ||
    activeVariantFields.type === 'dropdown' ||
    activeIsMulti;

  const attachQuestionType = (type) => {
    const defaults = questionDefaultsForType(type);
    setAttachOpen(false);
    commit({
      ...q,
      ...defaults,
      image_url: q.image_url,
      meta: {
        ...(q.meta || {}),
        ...(defaults.meta || {}),
        image_urls: q.meta?.image_urls,
        attached_from: q.type === 'audio' ? 'audio' : 'image',
      },
    });
  };

  const mediaPane = (
    <div className="f-q-media-pane">
      <div className="f-q-media-label">Media</div>
      {activeMediaUrls.length ? (
        <MediaStack
          key={mediaPreviewToken || activeMediaUrls[0] || 'media'}
          urls={activeMediaUrls}
          editable
          imageCrop={questionMediaCrop(activeMediaMeta)}
          imageCropSeed={questionMediaCropSeed(activeMediaMeta, activeMediaUrls[0])}
          autoPlayAudioToken={mediaPreviewToken}
          onRemove={(i) => setActiveMedia(activeMediaUrls.filter((_, j) => j !== i))}
        />
      ) : (
        <div className="f-q-media-empty">
          <p className="f-muted">Add images, audio, or video for this version</p>
        </div>
      )}
      <div className="f-q-media-tools">
        {activeMediaUrls.length < MAX_VERSION_MEDIA ? (
          <AttachFileButton onChange={onPickFile} />
        ) : null}
        {activeMediaUrls.length || variantTab > 0 ? (
          <button type="button" className="f-ghost-btn" onClick={() => setActiveMedia([])}>
            Remove media
          </button>
        ) : null}
      </div>
      {activeMediaUrls.length < MAX_VERSION_MEDIA ? (
        <input
          type="url"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={() => {
            const next = urlDraft.trim();
            if (!next) return;
            setActiveMedia([...activeMediaUrls, next]);
            setUrlDraft('');
          }}
          placeholder="Paste an image, audio, or video URL"
        />
      ) : null}
      {uploadError ? <div className="f-error">{uploadError}</div> : null}
      {q.type === 'hot_spot' ? (
        <div className="f-muted" style={{ fontSize: 12, marginTop: 8 }}>
          Correct region (%): x{' '}
          <input
            type="number"
            style={{ width: 64, display: 'inline-block', marginTop: 0 }}
            value={q.correct?.x ?? 50}
            onChange={(e) => local({ correct: { ...q.correct, x: Number(e.target.value) } })}
            onBlur={() => commit()}
          />{' '}
          y{' '}
          <input
            type="number"
            style={{ width: 64, display: 'inline-block', marginTop: 0 }}
            value={q.correct?.y ?? 50}
            onChange={(e) => local({ correct: { ...q.correct, y: Number(e.target.value) } })}
            onBlur={() => commit()}
          />{' '}
          r{' '}
          <input
            type="number"
            style={{ width: 64, display: 'inline-block', marginTop: 0 }}
            value={q.correct?.r ?? 10}
            onChange={(e) => local({ correct: { ...q.correct, r: Number(e.target.value) } })}
            onBlur={() => commit()}
          />
        </div>
      ) : null}
    </div>
  );

  const promptBlock = !isGate ? (
    isFillBlank ? (
      <div className="f-fib-editor">
        <div className="f-fib-how">
          <strong className="f-fib-how-title">
            <span className="f-q-num" title={`Question ${index + 1}`} aria-label={`Question ${index + 1}`}>
              {index + 1}
            </span>
            Fill in the blank
          </strong>
          <p>
            Students get a sentence with one missing word. Write the sentence, then the answer that
            belongs in the blank.
          </p>
        </div>

        <div className="f-fib-preview" aria-live="polite">
          <span className="f-fib-preview-label">Student preview</span>
          <p className="f-fib-preview-text">
            {fib.before || <span className="f-muted">…</span>}
            <span className="f-fib-preview-blank">______</span>
            {fib.after || null}
          </p>
        </div>

        <label className="f-fib-field">
          <span>1. Words before the blank</span>
          <input
            type="text"
            value={fib.before}
            onChange={(e) => setFibParts(e.target.value, fib.after)}
            onBlur={() => commit()}
            placeholder="e.g. Achilles Aspect is called Aspect of the"
          />
        </label>

        <div className="f-fib-blank-marker" aria-hidden="true">
          <span className="f-fib-chip">blank</span>
          <span className="f-muted">← students type here</span>
        </div>

        <label className="f-fib-field">
          <span>
            2. Words after the blank <em>(optional)</em>
          </span>
          <input
            type="text"
            value={fib.after}
            onChange={(e) => setFibParts(fib.before, e.target.value)}
            onBlur={() => commit()}
            placeholder="Usually leave empty"
          />
        </label>

        <label className="f-fib-field f-fib-answer-field">
          <span>3. Correct answer for the blank</span>
          <div className="f-fib-answer-row">
            <span className="f-fib-check" aria-hidden="true">
              ✓
            </span>
            <input
              type="text"
              className="f-option-input"
              value={blankAnswers[0] || ''}
              placeholder="e.g. Prowess"
              onChange={(e) => {
                const next = [...blankAnswers];
                next[0] = e.target.value;
                local({ correct: { ...(q.correct || {}), answers: next } });
              }}
              onBlur={() => commitBlankAnswers(blankAnswers)}
            />
          </div>
        </label>

        {blankAnswers.length > 1 || (blankAnswers[0] && blankAnswers[0].trim()) ? (
          <div className="f-fib-alts">
            {blankAnswers.slice(1).map((ans, i) => (
              <div className="f-fib-answer-row" key={`alt-${i}`}>
                <span className="f-fib-check" aria-hidden="true">
                  ✓
                </span>
                <input
                  type="text"
                  className="f-option-input"
                  value={ans}
                  placeholder="Also accept…"
                  onChange={(e) => {
                    const next = [...blankAnswers];
                    next[i + 1] = e.target.value;
                    local({ correct: { ...(q.correct || {}), answers: next } });
                  }}
                  onBlur={() => commitBlankAnswers(blankAnswers)}
                />
                <button
                  type="button"
                  className="f-ghost-btn"
                  onClick={() => commitBlankAnswers(blankAnswers.filter((_, idx) => idx !== i + 1))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="f-outline-btn"
              onClick={() =>
                commit({
                  ...q,
                  correct: { ...(q.correct || {}), answers: [...blankAnswers, ''] },
                })
              }
            >
              Also accept another spelling
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="f-ghost-btn f-fib-alt-link"
            onClick={() =>
              commit({
                ...q,
                correct: { ...(q.correct || {}), answers: [blankAnswers[0] || '', ''] },
              })
            }
          >
            + Also accept another spelling
          </button>
        )}
        {generateButtons ? <div className="f-q-action-row">{generateButtons}</div> : null}
      </div>
    ) : (
      <div className="f-q-prompt-edit">
        <span className="f-q-num" title={`Question ${index + 1}`} aria-label={`Question ${index + 1}`}>
          {index + 1}
        </span>
        <div className="f-fmt-field">
          <VisualTextEditor
            initialValue={q.prompt || ''}
            placeholder="Question prompt"
            minHeight={useMediaSplit ? 72 : 96}
            onChange={(next) => {
              if (next === q.prompt) return;
              local({ prompt: next });
            }}
          />
        </div>
      </div>
    )
  ) : (
    <div style={{ fontWeight: 600 }}>{isDiscord ? 'Discord Username' : 'In-Game Name'}</div>
  );

  const choiceBlock = (isChoice || isMulti) && (
    <div className="f-choice-list">
      {q.type === 'multiple_choice' || isMulti ? (
        <div className="f-pick-mode">
          <span className="f-pick-mode-label">Players can pick</span>
          <div className="f-pick-mode-btns" role="group" aria-label="How many options players can select">
            <button
              type="button"
              className={!isMulti ? 'is-on' : ''}
              onClick={() => setAllowMultiple(false)}
            >
              One option
            </button>
            <button
              type="button"
              className={isMulti ? 'is-on' : ''}
              onClick={() => setAllowMultiple(true)}
            >
              More than one
            </button>
          </div>
          <p className="f-pick-mode-hint">
            {isMulti
              ? 'Checkboxes: mark every correct answer.'
              : 'Circles: mark the one correct answer.'}
          </p>
        </div>
      ) : q.type === 'true_false' ? (
        <p className="f-pick-mode-hint">
          True or False is always one answer. Use Multiple Choice if you need extra options or more
          than one correct pick.
        </p>
      ) : null}
      {options.map((opt, i) => (
        <div className="f-option-row" key={i}>
          {isMulti ? (
            <input
              type="checkbox"
              checked={(q.correct?.indices || []).map(Number).includes(i)}
              onChange={() => {
                const set = new Set((q.correct?.indices || []).map(Number));
                if (set.has(i)) set.delete(i);
                else set.add(i);
                commit({ ...q, correct: { indices: [...set].sort((a, b) => a - b) } });
              }}
            />
          ) : (
            <input
              type="radio"
              name={`correct-${q.id}`}
              checked={Number(q.correct?.index) === i}
              onChange={() => commit({ ...q, correct: { index: i } })}
            />
          )}
          <input
            type="text"
            className="f-option-input"
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              local({ options: next });
            }}
            onBlur={() => commit()}
            placeholder={`Option ${i + 1}`}
          />
          {q.type !== 'true_false' ? (
            <button
              type="button"
              className="f-ghost-btn"
              onClick={() => {
                const next = options.filter((_, idx) => idx !== i);
                if (isMulti) {
                  const indices = (q.correct?.indices || [])
                    .map(Number)
                    .filter((x) => x !== i)
                    .map((x) => (x > i ? x - 1 : x));
                  commit({ ...q, options: next, correct: { indices } });
                } else {
                  const correctIndex =
                    Number(q.correct?.index) === i
                      ? 0
                      : Number(q.correct?.index) > i
                        ? Number(q.correct?.index) - 1
                        : q.correct?.index;
                  commit({ ...q, options: next, correct: { index: correctIndex || 0 } });
                }
              }}
            >
              ✕
            </button>
          ) : null}
        </div>
      ))}
      <div className="f-q-action-row">
        {q.type !== 'true_false' ? (
          <button
            type="button"
            className="f-outline-btn"
            onClick={() => commit({ ...q, options: [...options, `Option ${options.length + 1}`] })}
          >
            + Option
          </button>
        ) : null}
        {(isChoice || isMulti) && !useMediaSplit ? <AttachFileButton onChange={onPickFile} /> : null}
        {isChoice || isMulti ? generateButtons : null}
      </div>
      {uploadError && (isChoice || isMulti) ? <div className="f-error">{uploadError}</div> : null}
    </div>
  );

  const settingsBlock = !isGate ? (
    <details className="f-q-settings">
      <summary>Settings</summary>
      <div className="f-q-settings-body">
        <label className="f-toggle-row">
          <span>
            Don&apos;t show score
            <small>Hide point value on the take page for this question</small>
          </span>
          <input
            type="checkbox"
            className="f-toggle"
            checked={Boolean(q.meta?.hide_score)}
            onChange={(e) =>
              commit({ ...q, meta: { ...(q.meta || {}), hide_score: e.target.checked } })
            }
          />
        </label>
        {isChoice || isMulti ? (
          <label className="f-toggle-row">
            <span>
              Randomize order
              <small>Shuffle answer choices for each guest</small>
            </span>
            <input
              type="checkbox"
              className="f-toggle"
              checked={Boolean(q.meta?.randomize_order)}
              onChange={(e) =>
                commit({
                  ...q,
                  meta: { ...(q.meta || {}), randomize_order: e.target.checked },
                })
              }
            />
          </label>
        ) : null}
        {isMulti ? (
          <label className="f-toggle-row">
            <span>
              Allow partial credit
              <small>
                {quizPartialCreditMs
                  ? 'On for all multiple-selection questions (Quiz settings → Grading)'
                  : 'Score = (correct picks minus extras) / number of correct options'}
              </small>
            </span>
            <input
              type="checkbox"
              className="f-toggle"
              checked={questionAllowsPartialCredit(q, { partial_credit_multiple_selection: quizPartialCreditMs })}
              disabled={quizPartialCreditMs}
              onChange={(e) =>
                commit({
                  ...q,
                  meta: { ...(q.meta || {}), allow_partial_credit: e.target.checked },
                })
              }
            />
          </label>
        ) : null}
        <label className="f-toggle-row">
          <span>
            Extra credit
            <small>Mark as bonus (still scored by points above)</small>
          </span>
          <input
            type="checkbox"
            className="f-toggle"
            checked={Boolean(q.meta?.extra_credit)}
            onChange={(e) =>
              commit({ ...q, meta: { ...(q.meta || {}), extra_credit: e.target.checked } })
            }
          />
        </label>
        <label className="f-toggle-row">
          <span>
            Required
            <small>Guest must answer before submit</small>
          </span>
          <input
            type="checkbox"
            className="f-toggle"
            checked={Boolean(q.required)}
            onChange={(e) => commit({ ...q, required: e.target.checked })}
          />
        </label>
        {questionHintUiAllowed(q) || q.meta?.hints_enabled ? (
          <>
            <label className="f-toggle-row">
              <span>
                Hints
                <small>Guests can spend lifelines here. Draft text is filled in; edit below.</small>
              </span>
              <input
                type="checkbox"
                className="f-toggle"
                checked={Boolean(q.meta?.hints_enabled)}
                onChange={(e) => {
                  const on = e.target.checked;
                  if (on) {
                    commit(withGeneratedHints({ ...q, meta: { ...(q.meta || {}), hints_enabled: true } }, { enable: true }));
                    return;
                  }
                  commit({ ...q, meta: { ...(q.meta || {}), hints_enabled: false } });
                }}
              />
            </label>
            {q.meta?.hints_enabled ? (
              <div className="f-hint-editor">
                {storedHintList(q).map((text, i) => (
                  <label key={i} className="f-hint-field">
                    <span>Hint {i + 1}</span>
                    <textarea
                      rows={2}
                      value={text}
                      onChange={(e) => {
                        const hints = storedHintList(q);
                        hints[i] = e.target.value;
                        local({ meta: { ...(q.meta || {}), hints } });
                      }}
                      onBlur={() => commit()}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="f-outline-btn"
                  onClick={() => commit(withGeneratedHints(q, { enable: true, overwrite: true }))}
                >
                  Regenerate drafts
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </details>
  ) : (
    <span className="f-required" style={{ display: 'inline-block', marginTop: 12 }}>
      Required
    </span>
  );

  const mainBody = (
    <>
      {promptBlock}

      {q.meta?.kind === 'hot_text' ? (
        <div style={{ marginTop: 10 }}>
          <div className="f-muted" style={{ fontSize: 12 }}>
            Passage
          </div>
          <textarea
            value={q.meta?.passage || ''}
            onChange={(e) => local({ meta: { ...q.meta, passage: e.target.value } })}
            onBlur={() => commit()}
            rows={4}
          />
        </div>
      ) : null}

      {!useMediaSplit && (isMediaContent || q.type === 'hot_spot' || firstMedia) && !isGate ? (
        <div style={{ marginTop: 10 }}>
          <div className="f-q-media-tools">
            <AttachFileButton
              onChange={onPickFile}
              accept={q.type === 'audio_response' ? 'audio/*' : undefined}
            />
          </div>
          {activeMediaUrls.length < MAX_VERSION_MEDIA ? (
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onBlur={() => {
                const next = urlDraft.trim();
                if (!next) return;
                setActiveMedia([...activeMediaUrls, next]);
                setUrlDraft('');
              }}
              placeholder={
                q.type === 'embed' ? 'Embed URL' : 'Paste an image, audio, or video URL'
              }
            />
          ) : null}
          {uploadError ? <div className="f-error">{uploadError}</div> : null}
          <MediaStack
            key={mediaPreviewToken || activeMediaUrls[0] || 'media-inline'}
            urls={activeMediaUrls}
            editable
            imageCrop={questionMediaCrop(activeMediaMeta)}
            imageCropSeed={questionMediaCropSeed(activeMediaMeta, activeMediaUrls[0])}
            autoPlayAudioToken={mediaPreviewToken}
            onRemove={(i) => setActiveMedia(activeMediaUrls.filter((_, j) => j !== i))}
          />
        </div>
      ) : null}

      {(q.type === 'short_answer' || isGraphing) && !isGate && !isFillBlank ? (
        <div style={{ marginTop: 10 }}>
          <div className="f-muted" style={{ fontSize: 12 }}>
            Correct answer (comma-separated). Leave blank to skip auto-grade.
          </div>
          <input
            type="text"
            value={(q.correct?.answers || [q.correct?.answer || '']).join(', ')}
            onChange={(e) =>
              local({
                correct: {
                  ...q.correct,
                  answers: parseCommaAnswers(e.target.value),
                },
              })
            }
            onBlur={(e) =>
              commit({
                ...q,
                correct: {
                  ...q.correct,
                  answers: parseCommaAnswers(e.target.value, { clean: true }),
                },
              })
            }
            placeholder="Correct answer"
          />
        </div>
      ) : null}

      {isDiscord ? (
        <div className="f-muted" style={{ marginTop: 10, fontSize: 13 }}>
          Guests enter Discord Username on the take page (not scored).
        </div>
      ) : null}
      {isIngame ? (
        <div className="f-muted" style={{ marginTop: 10, fontSize: 13 }}>
          Guests enter In-Game Name on the take page (not scored).
        </div>
      ) : null}

      {choiceBlock}

      {q.type === 'matching' ? (
        <div className="f-match-editor">
          <p className="f-muted" style={{ fontSize: 12, margin: '10px 0 6px' }}>
            Prompts on the left. Correct answer(s) on the right. Comma-separate if more than one is
            right. Extra answers below have no prompt; players still see them mixed in.
          </p>
          {matchRows.map((row, i) => (
            <div className="f-option-row" key={`m-${i}`}>
              <input
                type="text"
                value={row.left}
                placeholder="Prompt"
                onChange={(e) => {
                  const rows = matchRows.map((r, idx) =>
                    idx === i ? { ...r, left: e.target.value } : r
                  );
                  const saved = buildMatchingSave(rows, matchExtras);
                  local({
                    options: saved.options,
                    correct: saved.correct,
                    meta: { ...q.meta, extra_rights: saved.extra_rights },
                  });
                }}
                onBlur={() => commit()}
              />
              <span className="f-muted">→</span>
              <input
                type="text"
                value={row.rightsText}
                placeholder="Correct answer, or several with commas"
                onChange={(e) => {
                  const rows = matchRows.map((r, idx) =>
                    idx === i ? { ...r, rightsText: e.target.value } : r
                  );
                  const saved = buildMatchingSave(rows, matchExtras);
                  local({
                    options: saved.options,
                    correct: saved.correct,
                    meta: { ...q.meta, extra_rights: saved.extra_rights },
                  });
                }}
                onBlur={() => commit()}
              />
            </div>
          ))}
          <button
            type="button"
            className="f-outline-btn"
            style={{ marginTop: 8 }}
            onClick={() => {
              const saved = buildMatchingSave(
                [...matchRows, { left: `Prompt ${matchRows.length + 1}`, rightsText: '' }],
                matchExtras
              );
              commit({
                ...q,
                options: saved.options,
                correct: saved.correct,
                meta: { ...q.meta, extra_rights: saved.extra_rights },
              });
            }}
          >
            + Prompt
          </button>
          <p className="f-muted" style={{ fontSize: 12, margin: '14px 0 6px' }}>
            Extra answers (no prompt)
          </p>
          {matchExtras.map((extra, i) => (
            <div className="f-option-row" key={`x-${i}`}>
              <input
                type="text"
                value={extra}
                placeholder="Decoy answer"
                onChange={(e) => {
                  const extras = matchExtras.map((x, idx) => (idx === i ? e.target.value : x));
                  const saved = buildMatchingSave(matchRows, extras);
                  local({
                    options: saved.options,
                    correct: saved.correct,
                    meta: { ...q.meta, extra_rights: saved.extra_rights },
                  });
                }}
                onBlur={() => commit()}
              />
            </div>
          ))}
          <button
            type="button"
            className="f-outline-btn"
            style={{ marginTop: 8 }}
            onClick={() => {
              const saved = buildMatchingSave(matchRows, [...matchExtras, '']);
              commit({
                ...q,
                options: saved.options,
                correct: saved.correct,
                meta: { ...q.meta, extra_rights: saved.extra_rights },
              });
            }}
          >
            + Extra answer
          </button>
        </div>
      ) : null}

      {isOrderingQuestion(q) ? (
        <div className="f-order-editor">
          <p className="f-muted" style={{ fontSize: 12, margin: '10px 0 6px' }}>
            Top to bottom is the correct order. Players get these shuffled and must put them back.
          </p>
          {orderItems.map((item, i) => (
            <div className="f-option-row f-order-row" key={`o-${i}`}>
              <span className="f-order-idx">{i + 1}</span>
              <input
                type="text"
                value={item}
                placeholder={`Item ${i + 1}`}
                onChange={(e) => {
                  const next = orderItems.map((x, idx) => (idx === i ? e.target.value : x));
                  local({ options: next, correct: { order: next } });
                }}
                onBlur={() => commit()}
              />
              <button
                type="button"
                className="f-ghost-btn"
                disabled={i === 0}
                onClick={() => {
                  const next = [...orderItems];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  commit({ ...q, options: next, correct: { order: next } });
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="f-ghost-btn"
                disabled={i === orderItems.length - 1}
                onClick={() => {
                  const next = [...orderItems];
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  commit({ ...q, options: next, correct: { order: next } });
                }}
              >
                ↓
              </button>
            </div>
          ))}
          <button
            type="button"
            className="f-outline-btn"
            style={{ marginTop: 8 }}
            onClick={() => {
              const next = [...orderItems, `Item ${orderItems.length + 1}`];
              commit({ ...q, options: next, correct: { order: next } });
            }}
          >
            + Item
          </button>
        </div>
      ) : null}

      {q.type === 'categorize' && catState ? (
        <CategorizeBoard
          mode="editor"
          categories={catState.categories}
          items={catState.items}
          map={catState.map}
          onChange={(next, opts) => {
            const patch = {
              options: { categories: next.categories, items: next.items },
              correct: { map: next.map },
            };
            if (opts?.commit) commit({ ...q, ...patch });
            else local(patch);
          }}
        />
      ) : null}

      {['file_response', 'audio_response', 'drawing'].includes(q.type) ? (
        <div className="f-muted" style={{ marginTop: 10, fontSize: 13 }}>
          Guest uploads / draws on the take page. Host reviews in Responses (not auto-scored).
        </div>
      ) : null}
    </>
  );

  const variantEditor =
    supportsVariants && variantTab > 0 ? (
      <div className="f-variant-editor">
        <p className="f-muted" style={{ marginTop: 0, fontSize: 13 }}>
          Version {variantLetter(variantTab)}. Different players may see this wording instead of A.
          Keep difficulty similar.
        </p>
        <div className="f-fib-field f-variant-prompt-field">
          <span>Prompt</span>
          <VisualTextEditor
            key={`variant-prompt-${q.id}-${variantTab}`}
            initialValue={activeVariantFields.prompt}
            placeholder="Version prompt"
            minHeight={96}
            onChange={(next) => {
              if (next === activeVariantFields.prompt) return;
              patchVariantSlot(variantTab - 1, { prompt: next });
            }}
          />
        </div>
        {(activeIsChoice || q.type === 'true_false') && (
          <div className="f-choice-list" style={{ marginTop: 10 }}>
            {(activeVariantFields.options || []).map((opt, i) => (
              <div className="f-option-row" key={i}>
                {activeIsMulti ? (
                  <input
                    type="checkbox"
                    checked={(activeVariantFields.correct?.indices || []).map(Number).includes(i)}
                    onChange={() => {
                      const set = new Set((activeVariantFields.correct?.indices || []).map(Number));
                      if (set.has(i)) set.delete(i);
                      else set.add(i);
                      patchVariantSlot(variantTab - 1, {
                        correct: { indices: [...set].sort((a, b) => a - b) },
                      });
                    }}
                  />
                ) : (
                  <input
                    type="radio"
                    name={`variant-correct-${q.id}-${variantTab}`}
                    checked={Number(activeVariantFields.correct?.index) === i}
                    onChange={() => patchVariantSlot(variantTab - 1, { correct: { index: i } })}
                  />
                )}
                <input
                  type="text"
                  className="f-option-input"
                  value={opt}
                  onChange={(e) => {
                    const next = [...(activeVariantFields.options || [])];
                    next[i] = e.target.value;
                    patchVariantSlot(variantTab - 1, { options: next });
                  }}
                  onBlur={() => commit()}
                  placeholder={`Option ${i + 1}`}
                />
                {activeVariantFields.type !== 'true_false' ? (
                  <button
                    type="button"
                    className="f-ghost-btn"
                    title="Remove option"
                    onClick={() => {
                      const current = [...(activeVariantFields.options || [])];
                      if (current.length <= 2) return;
                      const next = current.filter((_, idx) => idx !== i);
                      if (activeIsMulti) {
                        const indices = (activeVariantFields.correct?.indices || [])
                          .map(Number)
                          .filter((x) => x !== i)
                          .map((x) => (x > i ? x - 1 : x));
                        patchVariantSlot(variantTab - 1, {
                          options: next,
                          correct: { indices },
                        });
                      } else {
                        const cur = Number(activeVariantFields.correct?.index);
                        const correctIndex =
                          cur === i ? 0 : cur > i ? cur - 1 : cur;
                        patchVariantSlot(variantTab - 1, {
                          options: next,
                          correct: { index: correctIndex || 0 },
                        });
                      }
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
            {q.type !== 'true_false' ? (
              <button
                type="button"
                className="f-outline-btn"
                style={{ marginTop: 8 }}
                onClick={() =>
                  patchVariantSlot(variantTab - 1, {
                    options: [
                      ...(activeVariantFields.options || []),
                      `Option ${(activeVariantFields.options || []).length + 1}`,
                    ],
                  })
                }
              >
                + Option
              </button>
            ) : null}
          </div>
        )}
        {q.type === 'short_answer' || isFillBlank ? (
          <label className="f-fib-field" style={{ marginTop: 10 }}>
            <span>Correct answer(s), comma-separated</span>
            <input
              type="text"
              value={(activeVariantFields.correct?.answers || ['']).join(', ')}
              onChange={(e) =>
                patchVariantSlot(variantTab - 1, {
                  correct: {
                    ...(activeVariantFields.correct || {}),
                    answers: parseCommaAnswers(e.target.value),
                  },
                })
              }
              onBlur={(e) =>
                patchVariantSlot(variantTab - 1, {
                  correct: {
                    ...(activeVariantFields.correct || {}),
                    answers: parseCommaAnswers(e.target.value, { clean: true }),
                  },
                })
              }
            />
          </label>
        ) : null}
        <div className="f-variant-toolbar">
          {!useMediaSplit ? <AttachFileButton onChange={onPickFile} /> : null}
          <button
            type="button"
            className="f-outline-btn"
            onClick={() => patchVariantSlot(variantTab - 1, cloneFieldsFromVersionA())}
          >
            Copy from version A
          </button>
          <button
            type="button"
            className="f-outline-btn"
            title="Swap using builds.json names (items, gods, aspects, OB patches) and attach matching art"
            onClick={applyChangeQuestionAnswer}
          >
            Change question/answer
          </button>
          <button
            type="button"
            className="f-outline-btn"
            title="Keep this prompt; fill real answers from builds.json"
            onClick={() => applyGeneratedPatch(fillAnswersFromPrompt(activeSourceQuestion()))}
          >
            Random answers
          </button>
          <RandomQuestionPicker fillBlank={isFillBlank} onPick={pickRandomStyle} />
        </div>
        {uploadError ? <div className="f-error">{uploadError}</div> : null}
      </div>
    ) : null;

  const bodyForCard = variantEditor || mainBody;
  const showCardChrome = !isGate && !(useMediaSplit && isBareMedia);

  return (
    <div
      className={`f-qcard ${useMediaSplit ? 'f-qcard-media' : ''} ${isFillBlank ? 'f-qcard-fib' : ''} ${
        highlight ? 'is-restored' : ''
      }`}
      id={`host-q-${q.id}`}
    >
      <div className="f-qcard-head">
        <div className="f-qcard-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className={`f-icon-btn f-qcard-menu-btn ${menuOpen ? 'open' : ''}`}
            aria-label="Question menu"
            aria-expanded={menuOpen}
            title="Question menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ≡
          </button>
          {menuOpen ? (
            <div className="f-menu f-qcard-menu" role="menu">
              {onMove ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!canMoveUp}
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(-1);
                    }}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!canMoveDown}
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(1);
                    }}
                  >
                    Move down
                  </button>
                </>
              ) : null}
              {onDuplicate ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={isGate}
                  title="Insert a copy below, including every version and its media"
                  onClick={() => {
                    setMenuOpen(false);
                    if (!isGate) onDuplicate();
                  }}
                >
                  Duplicate question
                </button>
              ) : null}
              <button
                type="button"
                className="f-menu-danger"
                role="menuitem"
                disabled={isGate}
                onClick={() => {
                  setMenuOpen(false);
                  if (!isGate) onDelete?.();
                }}
              >
                Delete question
              </button>
            </div>
          ) : null}
        </div>
        {onMove ? (
          <div className="f-qcard-move" role="group" aria-label="Reorder question">
            <button
              type="button"
              className="f-icon-btn f-qcard-move-btn"
              disabled={!canMoveUp}
              title="Move question up"
              aria-label={`Move question ${index + 1} up`}
              onClick={() => onMove(-1)}
            >
              ▲
            </button>
            <button
              type="button"
              className="f-icon-btn f-qcard-move-btn"
              disabled={!canMoveDown}
              title="Move question down"
              aria-label={`Move question ${index + 1} down`}
              onClick={() => onMove(1)}
            >
              ▼
            </button>
          </div>
        ) : null}
        <span className="f-q-num f-q-num-head" title={`Question ${index + 1}`} aria-label={`Question ${index + 1}`}>
          {index + 1}
        </span>
        {isGate ? (
          <span>{isDiscord ? 'Discord Username' : 'In-Game Name'}</span>
        ) : (
          <label className="f-type-switch">
            <span className="f-sr-only">Question type</span>
            <select
              value={switchTypeValue(q)}
              onChange={(e) => convertType(e.target.value)}
              aria-label="Question type"
            >
              {SWITCHABLE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
              {!SWITCHABLE_TYPES.some((t) => t.id === switchTypeValue(q)) ? (
                <option value={switchTypeValue(q)}>{typeLabel(q)}</option>
              ) : null}
            </select>
          </label>
        )}
        <span className="f-qcard-head-meta">
          <span className="pts">
            <input
              type="number"
              min={0}
              step={1}
              value={q.points ?? 1}
              onChange={(e) => local({ points: Number(e.target.value) || 0 })}
              onBlur={() => commit()}
              style={{ width: 56, marginTop: 0 }}
              disabled={isGate}
            />{' '}
            Point{Number(q.points) === 1 ? '' : 's'}
          </span>
          {!isGate ? (
            <label className="f-req-head">
              <input
                type="checkbox"
                checked={Boolean(q.required)}
                onChange={(e) => commit({ ...q, required: e.target.checked })}
              />
              Required
            </label>
          ) : null}
        </span>
      </div>

      {supportsVariants ? (
        <div className={`f-variant-tabs ${variantSearchHighlight ? 'is-search-focus' : ''}`}>
          {Array.from({ length: 1 + variantExtras.length }, (_, i) => {
            const on = i === 0 || variantExtras[i - 1]?.enabled !== false;
            const isFocusedFromSearch =
              variantSearchHighlight && focusVariantIndex === i && variantTab === i;
            return (
              <span className="f-variant-tab" key={variantLetter(i)}>
                <button
                  type="button"
                  className={`${variantTab === i ? 'active' : ''} ${isFocusedFromSearch ? 'search-hit' : ''}`}
                  title={i > 0 ? 'Double-click to turn this version off or on' : undefined}
                  onClick={() => openVariantTab(i)}
                  onDoubleClick={() => toggleVariantEnabled(i)}
                >
                  Version {variantLetter(i)}
                  {i > 0 ? (on ? ' · on' : ' · off') : ''}
                </button>
                {i > 0 ? (
                  <button
                    type="button"
                    className="f-variant-del"
                    title={`Delete Version ${variantLetter(i)}`}
                    aria-label={`Delete Version ${variantLetter(i)}`}
                    onClick={() => deleteVariantTab(i)}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            );
          })}
          <button
            type="button"
            className="f-variant-add"
            disabled={variantExtras.length >= MAX_QUESTION_VARIANTS - 1}
            title={
              variantExtras.length >= MAX_QUESTION_VARIANTS - 1
                ? `Maximum ${MAX_QUESTION_VARIANTS} versions`
                : 'Add another version for this question'
            }
            onClick={addQuestionVersion}
          >
            Add version
          </button>
          <span className="f-variant-hint">
            Version A is always on. Add extra versions (up to {MAX_QUESTION_VARIANTS} total).
            Double-click an extra version to turn it off. Off versions are not given to players.
            Use × to remove one version without touching the rest of the question.
            {variantTab > 0 && String(q.prompt || '') === 'Multiple choice question' ? (
              <>
                {' '}
                You are editing Version {variantLetter(variantTab)}. Version A is still the
                default “Multiple choice question”. Put the real prompt and media on A, or on
                this version.
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {useMediaSplit ? (
        <div className="f-q-split">
          {mediaPane}
          <div className="f-q-main-pane">
            {isBareMedia ? (
              <div className="f-media-attach">
                <p className="f-media-attach-copy">
                  Add a question that uses this {q.type === 'audio' ? 'audio' : 'image'}.
                </p>
                <div className="f-media-attach-actions">
                  <button
                    type="button"
                    className="f-media-attach-plus"
                    title="Add New Item"
                    aria-label="Add New Item"
                    aria-expanded={attachOpen}
                    onClick={() => setAttachOpen((v) => !v)}
                  >
                    +
                  </button>
                  {attachOpen ? (
                    <div className="f-media-attach-menu" role="menu">
                      <div className="f-media-attach-menu-title">Choose question type</div>
                      {MEDIA_ATTACH_CHOICES.filter(
                        (item) => !(q.type === 'audio' && item.type === 'hot_spot')
                      ).map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          role="menuitem"
                          onClick={() => attachQuestionType(item.type)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button type="button" className="f-ghost-btn" onClick={onDelete}>
                  Delete
                </button>
              </div>
            ) : (
              bodyForCard
            )}
          </div>
        </div>
      ) : (
        bodyForCard
      )}

      {showCardChrome ? (
        <div className="f-qcard-foot">
          {settingsBlock}
          <div className="f-qcard-foot-actions">
            <button type="button" className="f-ghost-btn" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
