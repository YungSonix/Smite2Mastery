import { useEffect, useState } from 'react';
import VisualTextEditor from './VisualTextEditor';
import MediaStack from './MediaStack';
import { joinFillBlankPrompt, splitFillBlankPrompt } from '../lib/fillBlank';
import { readImageAsDataUrl } from '../lib/imageUpload';
import {
  MAX_VERSION_MEDIA,
  listMediaUrls,
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
import { remixQuestionFromA, fillAnswersFromPrompt, randomizeQuestion } from '../lib/triviaRemix';

async function readFileAsDataUrl(file, { maxBytes = 2.5 * 1024 * 1024, acceptPrefix } = {}) {
  if (!file) throw new Error('No file selected');
  if (acceptPrefix && !String(file.type || '').startsWith(acceptPrefix)) {
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

export default function QuestionCard({ question, index, onChange, onDelete }) {
  const [q, setQ] = useState(question);
  const [uploadError, setUploadError] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [variantTab, setVariantTab] = useState(0); // 0=A, 1=B, 2=C
  const [urlDraft, setUrlDraft] = useState('');
  useEffect(() => {
    setQ(question);
  }, [question]);

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
  const activeMediaUrls =
    variantTab === 0
      ? listMediaUrls(q)
      : listMediaUrls(variantExtras[variantTab - 1] || {});
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

  const ensureVariantSlot = (slotIndex) => {
    const variants = [...variantExtras];
    while (variants.length <= slotIndex) {
      variants.push({
        prompt: q.prompt || '',
        options: Array.isArray(q.options) ? [...q.options] : q.options,
        correct: q.correct ? JSON.parse(JSON.stringify(q.correct)) : {},
        image_url: null,
        image_urls: [],
        enabled: true,
      });
    }
    return variants;
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
      if (type.startsWith('image/')) return readImageAsDataUrl(file);
      if (type.startsWith('audio/')) return readFileAsDataUrl(file, { acceptPrefix: 'audio/' });
      if (type.startsWith('video/')) {
        return readFileAsDataUrl(file, { acceptPrefix: 'video/', maxBytes: 8 * 1024 * 1024 });
      }
      throw new Error('Please choose an image, audio, or video file');
    });
  };

  const applyGeneratedPatch = (result) => {
    if (result.error) {
      setUploadError(result.error);
      return;
    }
    setUploadError('');
    const patch = result.patch || {};
    const meta = { ...(q.meta || {}), ...(patch.meta || {}), variants: q.meta?.variants };
    if (patch.clearMedia) delete meta.image_urls;
    let next = { ...q, ...patch, meta };
    if (patch.clearMedia) {
      next = withMediaUrlsOnQuestion({ ...next, image_url: null }, []);
    } else if (patch.image_urls || patch.image_url) {
      next = withMediaUrlsOnQuestion(next, patch.image_urls || [patch.image_url].filter(Boolean));
    }
    if (variantTab > 0) {
      const { meta: _m, type: _t, points: _p, required: _r, clearMedia: _c, ...slot } = patch;
      if (patch.clearMedia) {
        patchVariantSlot(variantTab - 1, { ...slot, image_url: null, image_urls: [] });
      } else {
        patchVariantSlot(variantTab - 1, slot);
      }
      return;
    }
    delete next.clearMedia;
    commit(next);
  };

  const generateButtons = !isGate ? (
    <>
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
      <button
        type="button"
        className="f-outline-btn"
        title="Write a new question and answers from builds.json"
        onClick={() => {
          const extras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
          const src = variantTab === 0 ? q : { ...q, ...(extras[variantTab - 1] || {}) };
          applyGeneratedPatch(randomizeQuestion(src));
        }}
      >
        Random question
      </button>
    </>
  ) : null;

  const patchVariantSlot = (slotIndex, patch) => {
    const variants = ensureVariantSlot(slotIndex);
    variants[slotIndex] = { ...(variants[slotIndex] || {}), ...patch };
    commit({ ...q, meta: { ...(q.meta || {}), variants } });
  };

  const openVariantTab = (tab) => {
    if (tab > 0 && variantExtras.length < tab) {
      commit({ ...q, meta: { ...(q.meta || {}), variants: ensureVariantSlot(tab - 1) } });
    }
    setVariantTab(tab);
  };

  const toggleVariantEnabled = (tab) => {
    if (tab <= 0) return;
    if (variantExtras.length < tab) return;
    patchVariantSlot(tab - 1, {
      enabled: variantExtras[tab - 1]?.enabled === false,
    });
  };

  const activeVariantFields =
    variantTab === 0
      ? {
          prompt: q.prompt || '',
          options: Array.isArray(q.options) ? q.options : [],
          correct: q.correct || {},
          image_url: q.image_url,
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
        };

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
          urls={activeMediaUrls}
          editable
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
          <strong>
            {index + 1}. Fill in the blank
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
        <span className="f-q-num">{index + 1}.</span>
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
              ? 'Checkboxes — mark every correct answer.'
              : 'Circles — mark the one correct answer.'}
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
              <small>Score = (correct picks minus extras) / number of correct options</small>
            </span>
            <input
              type="checkbox"
              className="f-toggle"
              checked={Boolean(q.meta?.allow_partial_credit)}
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
            urls={activeMediaUrls}
            editable
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
            Prompts on the left. Correct answer(s) on the right — comma-separate if more than one is
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

      {settingsBlock}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }} />
        {!isGate ? (
          <button type="button" className="f-ghost-btn" style={{ marginTop: 8 }} onClick={onDelete}>
            Delete
          </button>
        ) : null}
      </div>
    </>
  );

  const variantEditor =
    supportsVariants && variantTab > 0 ? (
      <div className="f-variant-editor">
        <p className="f-muted" style={{ marginTop: 0, fontSize: 13 }}>
          Version {['A', 'B', 'C'][variantTab]} — different players may see this wording instead of A.
          Keep difficulty similar.
        </p>
        <label className="f-fib-field">
          <span>Prompt</span>
          <VisualTextEditor
            initialValue={activeVariantFields.prompt}
            placeholder="Version prompt"
            minHeight={96}
            onChange={(next) => {
              if (next === activeVariantFields.prompt) return;
              patchVariantSlot(variantTab - 1, { prompt: next });
            }}
          />
        </label>
        {(isChoice || isMulti || q.type === 'true_false') && (
          <div className="f-choice-list" style={{ marginTop: 10 }}>
            {(activeVariantFields.options || []).map((opt, i) => (
              <div className="f-option-row" key={i}>
                {isMulti ? (
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
                {q.type !== 'true_false' ? (
                  <button
                    type="button"
                    className="f-ghost-btn"
                    title="Remove option"
                    onClick={() => {
                      const current = [...(activeVariantFields.options || [])];
                      if (current.length <= 2) return;
                      const next = current.filter((_, idx) => idx !== i);
                      if (isMulti) {
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
            onClick={() =>
              patchVariantSlot(variantTab - 1, {
                prompt: q.prompt || '',
                options: Array.isArray(q.options) ? [...q.options] : q.options,
                correct: q.correct ? JSON.parse(JSON.stringify(q.correct)) : {},
                image_url: listMediaUrls(q)[0] || null,
                image_urls: listMediaUrls(q),
              })
            }
          >
            Copy from version A
          </button>
          <button
            type="button"
            className="f-outline-btn"
            title="Swap using builds.json names (items, gods, aspects, OB patches) and attach matching art"
            onClick={() => {
              const avoid = variantExtras
                .map((v, i) => (i === variantTab - 1 ? '' : v?.prompt))
                .filter(Boolean);
              const result = remixQuestionFromA(q, { avoidTexts: avoid });
              if (result.error) {
                setUploadError(result.error);
                return;
              }
              setUploadError('');
              patchVariantSlot(variantTab - 1, result.patch);
            }}
          >
            Change question/answer
          </button>
          <button
            type="button"
            className="f-outline-btn"
            title="Keep this prompt; fill real answers from builds.json"
            onClick={() => applyGeneratedPatch(fillAnswersFromPrompt({ ...q, ...activeVariantFields }))}
          >
            Random answers
          </button>
          <button
            type="button"
            className="f-outline-btn"
            title="Write a new question and answers from builds.json"
            onClick={() => applyGeneratedPatch(randomizeQuestion({ ...q, ...activeVariantFields }))}
          >
            Random question
          </button>
        </div>
        {uploadError ? <div className="f-error">{uploadError}</div> : null}
      </div>
    ) : null;

  const bodyForCard = variantEditor || mainBody;

  return (
    <div className={`f-qcard ${useMediaSplit ? 'f-qcard-media' : ''} ${isFillBlank ? 'f-qcard-fib' : ''}`}>
      <div className="f-qcard-head">
        <span>≡</span>
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
      </div>

      {supportsVariants ? (
        <div className="f-variant-tabs">
          {['A', 'B', 'C'].map((label, i) => {
            const exists = i === 0 || variantExtras.length >= i;
            const on =
              i === 0 ||
              (exists && variantExtras[i - 1]?.enabled !== false);
            return (
              <button
                key={label}
                type="button"
                className={variantTab === i ? 'active' : ''}
                title={i > 0 ? 'Double-click to turn this version off or on' : undefined}
                onClick={() => openVariantTab(i)}
                onDoubleClick={() => toggleVariantEnabled(i)}
              >
                Version {label}
                {i > 0 && exists ? (on ? ' · on' : ' · off') : ''}
              </button>
            );
          })}
          <span className="f-variant-hint">
            Version A is always on. Double-click B or C to turn that version off or on. Off
            versions are not given to players.
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
    </div>
  );
}
