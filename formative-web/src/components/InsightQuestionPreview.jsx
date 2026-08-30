import { useMemo, useState } from 'react';
import MediaStack from './MediaStack';
import RichText from './RichText';
import { allChoicesHaveArt, lookupChoiceArt } from '../lib/choiceArt';
import { correctChoiceIndexes, formatCorrectAnswer } from '../lib/correctAnswer';
import { listMediaUrls, questionMediaCrop, questionMediaCropSeed } from '../lib/questionMedia';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { promptPlain } from '../lib/promptPlain';
import { typeLabel } from '../lib/questionTypes';
import { applyVariant, variantCount, variantLetter } from '../lib/triviaVariants';

function PreviewChoices({ q }) {
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  if (!options.length) return null;
  const correct = new Set(correctChoiceIndexes(q));
  const useTiles = allChoicesHaveArt(options);

  if (useTiles) {
    return (
      <div className="f-choice-tiles f-preview-choices">
        {options.map((label, i) => {
          const art = lookupChoiceArt(label);
          const ok = correct.has(i);
          return (
            <div key={`${q.id}-opt-${i}`} className={`f-choice-tile ${ok ? 'is-correct' : ''}`}>
              {art?.image ? (
                <img className="f-choice-tile-art" src={resolveMediaUrl(art.image)} alt="" draggable={false} />
              ) : (
                <div className="f-choice-tile-art f-choice-tile-art-empty" />
              )}
              <span>{label}</span>
              {ok ? <span className="f-preview-correct-tag">Correct</span> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="f-preview-option-list">
      {options.map((label, i) => {
        const ok = correct.has(i);
        return (
          <li key={`${q.id}-opt-${i}`} className={ok ? 'is-correct' : ''}>
            <span className="f-preview-opt-mark">{ok ? '✓' : '○'}</span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function InsightQuestionPreview({
  question,
  questionIndex = 0,
  initialVariantIndex = 0,
  insightPct,
  insightN,
  onClose,
  onOpenInEditor,
}) {
  const [variantIndex, setVariantIndex] = useState(initialVariantIndex);
  const displayQ = useMemo(() => applyVariant(question, variantIndex), [question, variantIndex]);
  const count = variantCount(question);
  const media = listMediaUrls(displayQ);
  const isGate = displayQ.meta?.is_discord_gate || displayQ.meta?.is_ingame_gate;
  const isContent = ['image', 'audio', 'video', 'embed', 'content'].includes(displayQ.type);

  if (!question) return null;

  return (
    <div className="f-insight-preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="f-insight-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Question ${questionIndex + 1} preview`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="f-insight-preview-head">
          <div>
            <h3>Question {questionIndex + 1}</h3>
            <p className="f-muted">
              {typeLabel(displayQ)}
              {insightN != null ? ` · ${insightPct}% correct (${insightN} takes)` : ''}
            </p>
          </div>
          <button type="button" className="f-icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="f-insight-preview-body">
          {count > 1 ? (
            <div className="f-host-preview-variant-bar" role="group" aria-label="Question version">
              <button
                type="button"
                className="f-outline-btn f-compact"
                onClick={() => setVariantIndex((v) => (v + count - 1) % count)}
              >
                ←
              </button>
              <span className="f-host-preview-variant-label">
                Version {variantLetter(variantIndex)}
              </span>
              <button
                type="button"
                className="f-outline-btn f-compact"
                onClick={() => setVariantIndex((v) => (v + 1) % count)}
              >
                →
              </button>
            </div>
          ) : null}

          {promptPlain(displayQ.prompt) ? (
            <div className="f-host-preview-prompt">
              <RichText className="f-md" text={displayQ.prompt} />
            </div>
          ) : null}

          {media.length ? (
            <MediaStack
              urls={media}
              opaque
              imageCrop={questionMediaCrop(displayQ.meta)}
              imageCropSeed={questionMediaCropSeed(displayQ.meta, media[0])}
            />
          ) : null}

          {!isGate && !isContent ? (
            <>
              <PreviewChoices q={displayQ} />
              <p className="f-preview-answer-line">
                <strong>Answer:</strong> {formatCorrectAnswer(displayQ) || '—'}
              </p>
            </>
          ) : null}
          {isGate ? (
            <p className="f-muted f-preview-answer-line">Gate question (Discord / in-game name).</p>
          ) : null}
        </div>

        <footer className="f-insight-preview-foot">
          {onOpenInEditor ? (
            <button type="button" className="f-outline-btn" onClick={() => onOpenInEditor(question.id)}>
              Open in editor
            </button>
          ) : null}
          <button type="button" className="f-save-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
