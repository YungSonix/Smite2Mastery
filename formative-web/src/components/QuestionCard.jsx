import { useEffect, useState } from 'react';
import { joinFillBlankPrompt, splitFillBlankPrompt } from '../lib/fillBlank';
import { readImageAsDataUrl } from '../lib/imageUpload';
import { isAudioMediaUrl, resolveMediaUrl } from '../lib/mediaUrl';
import {
  MEDIA_ATTACH_CHOICES,
  questionDefaultsForType,
  typeLabel,
} from '../lib/questionTypes';

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

export default function QuestionCard({ question, index, onChange, onDelete }) {
  const [q, setQ] = useState(question);
  const [uploadError, setUploadError] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [variantTab, setVariantTab] = useState(0); // 0=A, 1=B, 2=C
  useEffect(() => {
    setQ(question);
  }, [question]);

  // Fill-in-blank always has one Text #1 marker (Formative-style).
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
  const isAudioMedia = isAudioMediaUrl(q.image_url, { type: q.type, meta: q.meta });
  const mediaSrc = resolveMediaUrl(q.image_url);
  const isImageMedia = Boolean(
    q.image_url &&
      !isAudioMedia &&
      q.type !== 'video' &&
      q.type !== 'embed'
  );
  const useMediaSplit =
    !isGate &&
    (q.type === 'image' ||
      q.type === 'audio' ||
      q.type === 'hot_spot' ||
      ((isChoice || isMulti || q.type === 'short_answer') && (isImageMedia || isAudioMedia)));

  const local = (patch) => setQ((prev) => ({ ...prev, ...patch }));
  const commit = (next) => {
    const merged = next || q;
    setQ(merged);
    onChange(merged);
  };

  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    try {
      const dataUrl = await readImageAsDataUrl(file);
      commit({ ...q, image_url: dataUrl });
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    }
  };

  const onPickAudio = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    try {
      const dataUrl = await readFileAsDataUrl(file, { acceptPrefix: 'audio/' });
      commit({ ...q, image_url: dataUrl });
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    }
  };

  const matchingPairs = Array.isArray(q.options) ? q.options : [];
  const categorize =
    q.options && !Array.isArray(q.options) && typeof q.options === 'object' ? q.options : null;

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

  const isBareMedia = q.type === 'image' || q.type === 'audio';
  const supportsVariants =
    !isGate &&
    !isBareMedia &&
    !['image', 'audio', 'video', 'embed', 'content'].includes(q.type);

  const variantExtras = Array.isArray(q.meta?.variants) ? q.meta.variants : [];
  const ensureVariantSlot = (slotIndex) => {
    // slotIndex 0 => B, 1 => C
    const variants = [...variantExtras];
    while (variants.length <= slotIndex) {
      variants.push({
        prompt: q.prompt || '',
        options: Array.isArray(q.options) ? [...q.options] : q.options,
        correct: q.correct ? JSON.parse(JSON.stringify(q.correct)) : {},
        image_url: q.image_url || null,
      });
    }
    return variants;
  };

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
        ...(defaults.meta || {}),
        attached_from: q.type === 'audio' ? 'audio' : 'image',
      },
    });
  };

  const mediaPane = (
    <div className={`f-q-media-pane ${isAudioMedia ? 'is-audio' : ''}`}>
      <div className="f-q-media-label">{isAudioMedia ? 'Audio' : 'Image'}</div>
      {isAudioMedia && q.image_url ? (
        <audio controls src={mediaSrc} className="f-q-media-audio" />
      ) : null}
      {isImageMedia ? (
        <div className="f-q-media-frame">
          <img src={mediaSrc} alt="" />
        </div>
      ) : null}
      {!q.image_url ? (
        <div className="f-q-media-empty">
          <p className="f-muted">Add media for a side-by-side question</p>
        </div>
      ) : null}
      <div className="f-q-media-tools">
        {!isAudioMedia ? (
          <label className="f-outline-btn f-file-btn">
            Upload image
            <input type="file" accept="image/*" onChange={onPickImage} />
          </label>
        ) : null}
        {q.type === 'audio' || isAudioMedia || (!q.image_url && (isChoice || isMulti)) ? (
          <label className="f-outline-btn f-file-btn">
            Upload audio
            <input type="file" accept="audio/*" onChange={onPickAudio} />
          </label>
        ) : null}
        {q.image_url ? (
          <button
            type="button"
            className="f-ghost-btn"
            onClick={() => commit({ ...q, image_url: null })}
          >
            Clear media
          </button>
        ) : null}
      </div>
      {!q.image_url?.startsWith('data:') ? (
        <input
          type="url"
          value={q.image_url || ''}
          onChange={(e) => local({ image_url: e.target.value })}
          onBlur={() => commit()}
          placeholder={isAudioMedia || q.type === 'audio' ? 'Audio URL' : 'Image URL'}
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
      </div>
    ) : (
      <div className="f-q-prompt-edit">
        <span className="f-q-num">{index + 1}.</span>
        <textarea
          value={q.prompt || ''}
          onChange={(e) => local({ prompt: e.target.value })}
          onBlur={() => commit()}
          placeholder="Question prompt"
          rows={useMediaSplit ? 2 : 3}
        />
      </div>
    )
  ) : (
    <div style={{ fontWeight: 600 }}>{isDiscord ? 'Discord Username' : 'In-Game Name'}</div>
  );

  const choiceBlock = (isChoice || isMulti) && (
    <div className="f-choice-list">
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
      {q.type !== 'true_false' ? (
        <button
          type="button"
          className="f-outline-btn"
          style={{ marginTop: 8 }}
          onClick={() => commit({ ...q, options: [...options, `Option ${options.length + 1}`] })}
        >
          + Option
        </button>
      ) : null}
      {(isChoice || isMulti) && !useMediaSplit ? (
        <div className="f-attach-row">
          <label className="f-outline-btn f-file-btn">
            Attach image
            <input type="file" accept="image/*" onChange={onPickImage} />
          </label>
          <label className="f-outline-btn f-file-btn">
            Attach audio
            <input type="file" accept="audio/*" onChange={onPickAudio} />
          </label>
        </div>
      ) : null}
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

      {!useMediaSplit && (isMediaContent || q.type === 'hot_spot' || q.image_url) && !isGate ? (
        <div style={{ marginTop: 10 }}>
          {q.type === 'audio' || q.type === 'audio_response' ? null : (
            <label className="f-outline-btn f-file-btn">
              Upload image
              <input type="file" accept="image/*" onChange={onPickImage} />
            </label>
          )}
          {q.type === 'audio' ? (
            <label className="f-outline-btn f-file-btn">
              Upload audio
              <input type="file" accept="audio/*" onChange={onPickAudio} />
            </label>
          ) : null}
          {q.type === 'video' || q.type === 'embed' ? (
            <input
              type="url"
              value={q.image_url?.startsWith('data:') ? '' : q.image_url || ''}
              onChange={(e) => local({ image_url: e.target.value })}
              onBlur={() => commit()}
              placeholder={q.type === 'video' ? 'Video URL (YouTube / mp4)' : 'Embed URL'}
            />
          ) : (
            <>
              <div className="f-muted" style={{ fontSize: 12, marginTop: 8 }}>
                Or paste a URL
              </div>
              <input
                type="url"
                value={q.image_url?.startsWith('data:') ? '' : q.image_url || ''}
                onChange={(e) => local({ image_url: e.target.value })}
                onBlur={() => commit()}
                placeholder="https://…"
              />
            </>
          )}
          {uploadError ? <div className="f-error">{uploadError}</div> : null}
          {q.image_url?.startsWith('data:image') || (q.image_url && q.type !== 'audio') ? (
            <img
              src={mediaSrc}
              alt=""
              style={{ marginTop: 10, maxWidth: 220, borderRadius: 8, border: '1px solid #1e3a5f' }}
            />
          ) : null}
          {q.type === 'audio' && q.image_url ? (
            <audio controls src={mediaSrc} style={{ marginTop: 10, width: '100%' }} />
          ) : null}
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
                  answers: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            onBlur={() => commit()}
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
        <div style={{ marginTop: 10 }}>
          {matchingPairs.map((pair, i) => (
            <div className="f-option-row" key={i}>
              <input
                type="text"
                value={pair.left || ''}
                placeholder="Left"
                onChange={(e) => {
                  const next = matchingPairs.map((p, idx) =>
                    idx === i ? { ...p, left: e.target.value } : p
                  );
                  local({ options: next });
                }}
                onBlur={() => {
                  const map = {};
                  matchingPairs.forEach((p) => {
                    if (p.left) map[p.left] = p.right || '';
                  });
                  commit({ ...q, options: matchingPairs, correct: { map } });
                }}
              />
              <span className="f-muted">→</span>
              <input
                type="text"
                value={pair.right || ''}
                placeholder="Right"
                onChange={(e) => {
                  const next = matchingPairs.map((p, idx) =>
                    idx === i ? { ...p, right: e.target.value } : p
                  );
                  local({ options: next });
                }}
                onBlur={() => {
                  const map = {};
                  matchingPairs.forEach((p) => {
                    if (p.left) map[p.left] = p.right || '';
                  });
                  commit({ ...q, options: matchingPairs, correct: { map } });
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="f-outline-btn"
            style={{ marginTop: 8 }}
            onClick={() =>
              commit({
                ...q,
                options: [...matchingPairs, { left: '', right: '' }],
              })
            }
          >
            + Pair
          </button>
        </div>
      ) : null}

      {q.type === 'categorize' && categorize ? (
        <div style={{ marginTop: 10 }}>
          <div className="f-muted" style={{ fontSize: 12 }}>
            Categories (comma-separated)
          </div>
          <input
            type="text"
            value={(categorize.categories || []).join(', ')}
            onChange={(e) =>
              local({
                options: {
                  ...categorize,
                  categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                },
              })
            }
            onBlur={() => commit()}
          />
          <div className="f-muted" style={{ fontSize: 12, marginTop: 8 }}>
            Items (comma-separated)
          </div>
          <input
            type="text"
            value={(categorize.items || []).join(', ')}
            onChange={(e) =>
              local({
                options: {
                  ...categorize,
                  items: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                },
              })
            }
            onBlur={() => commit()}
          />
          <div className="f-muted" style={{ fontSize: 12, marginTop: 8 }}>
            Correct map JSON e.g. {"{"}&quot;Item 1&quot;:&quot;Category A&quot;{"}"}
          </div>
          <input
            type="text"
            value={JSON.stringify(q.correct?.map || {})}
            onChange={(e) => {
              try {
                local({ correct: { map: JSON.parse(e.target.value || '{}') } });
              } catch {
                /* ignore while typing */
              }
            }}
            onBlur={() => commit()}
          />
        </div>
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
          <textarea
            rows={3}
            value={activeVariantFields.prompt}
            onChange={(e) => patchVariantSlot(variantTab - 1, { prompt: e.target.value })}
            onBlur={() => commit()}
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
                />
              </div>
            ))}
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
                    answers: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
              onBlur={() => commit()}
            />
          </label>
        ) : null}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="f-outline-btn"
            onClick={() =>
              patchVariantSlot(variantTab - 1, {
                prompt: q.prompt || '',
                options: Array.isArray(q.options) ? [...q.options] : q.options,
                correct: q.correct ? JSON.parse(JSON.stringify(q.correct)) : {},
                image_url: q.image_url || null,
              })
            }
          >
            Copy from version A
          </button>
          <button
            type="button"
            className="f-ghost-btn"
            onClick={() => {
              const variants = [...variantExtras];
              variants.splice(variantTab - 1);
              commit({ ...q, meta: { ...(q.meta || {}), variants } });
              setVariantTab(0);
            }}
          >
            Remove version {['A', 'B', 'C'][variantTab]}
          </button>
        </div>
      </div>
    ) : null;

  const bodyForCard = variantEditor || mainBody;

  return (
    <div className={`f-qcard ${useMediaSplit ? 'f-qcard-media' : ''} ${isFillBlank ? 'f-qcard-fib' : ''}`}>
      <div className="f-qcard-head">
        <span>≡</span>
        <span>{isDiscord ? 'Discord Username' : isIngame ? 'In-Game Name' : typeLabel(q)}</span>
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
      </div>

      {supportsVariants ? (
        <div className="f-variant-tabs">
          {['A', 'B', 'C'].map((label, i) => (
            <button
              key={label}
              type="button"
              className={variantTab === i ? 'active' : ''}
              onClick={() => openVariantTab(i)}
            >
              Version {label}
              {i > 0 && variantExtras.length >= i ? ' · on' : ''}
            </button>
          ))}
          <span className="f-variant-hint">
            Up to 3 versions — each Discord name gets one (harder to share answers)
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
