import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MediaStack from '../components/MediaStack';
import RichText from '../components/RichText';
import { activityHref, hostApi } from '../lib/api';
import { allChoicesHaveArt, lookupChoiceArt } from '../lib/choiceArt';
import { listMediaUrls, questionMediaCrop, questionMediaCropSeed } from '../lib/questionMedia';
import { typeLabel } from '../lib/questionTypes';
import { mergeQuizSettings } from '../lib/quizSettings';
import { quizThemeProps } from '../lib/quizThemes';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { promptPlain } from '../lib/promptPlain';
import { applyVariant, variantCount, variantLetter } from '../lib/triviaVariants';

function correctIndexes(q) {
  if (q?.type === 'multiple_selection' || Array.isArray(q?.correct?.indices)) {
    return (q.correct?.indices || []).map(Number).filter((n) => Number.isFinite(n));
  }
  if (Number.isFinite(Number(q?.correct?.index))) return [Number(q.correct.index)];
  return [];
}

function correctAnswerText(q) {
  if (q?.meta?.kind === 'fill_blank' || q?.type === 'short_answer') {
    const answers = q.correct?.answers || (q.correct?.answer ? [q.correct.answer] : []);
    return answers.filter(Boolean).join(' / ') || '—';
  }
  const opts = Array.isArray(q?.options) ? q.options : [];
  const idxs = correctIndexes(q);
  if (idxs.length) return idxs.map((i) => opts[i] ?? `#${i}`).join(', ');
  if (Array.isArray(q?.correct?.answers) && q.correct.answers.length) {
    return q.correct.answers.join(' / ');
  }
  return '—';
}

function PreviewChoices({ q }) {
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  if (!options.length) return null;
  const correct = new Set(correctIndexes(q));
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

function VariantSwitcher({ questionId, index, count, onChange }) {
  if (count <= 1) return null;
  const prev = () => onChange(questionId, (index + count - 1) % count);
  const next = () => onChange(questionId, (index + 1) % count);
  return (
    <div className="f-host-preview-variant-bar" role="group" aria-label="Question version">
      <button type="button" className="f-outline-btn f-compact" onClick={prev} aria-label="Previous version">
        ←
      </button>
      <span className="f-host-preview-variant-label">
        Version {variantLetter(index)} <span className="f-muted">({index + 1}/{count})</span>
      </span>
      <button type="button" className="f-outline-btn f-compact" onClick={next} aria-label="Next version">
        →
      </button>
    </div>
  );
}

function PreviewQuestionCard({ q, idx, variantIndex, onVariantChange }) {
  const displayQ = useMemo(() => applyVariant(q, variantIndex), [q, variantIndex]);
  const count = variantCount(q);
  const media = listMediaUrls(displayQ);
  const isGate = displayQ.meta?.is_discord_gate || displayQ.meta?.is_ingame_gate;
  const isContent = ['image', 'audio', 'video', 'embed', 'content'].includes(displayQ.type);

  return (
    <article className="f-host-preview-card" id={`preview-q-${q.id}`}>
      <div className="f-host-preview-card-head">
        <span className="f-q-num">{idx + 1}</span>
        <span className="f-type-pill">{typeLabel(displayQ)}</span>
        <VariantSwitcher
          questionId={q.id}
          index={variantIndex}
          count={count}
          onChange={onVariantChange}
        />
        <span className="f-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
          {Number(displayQ.points) || 0} pts
          {displayQ.required ? ' · required' : ''}
        </span>
      </div>
      {count > 1 ? (
        <p className="f-muted f-preview-variant-note">
          Players with alternates see one randomized version — switch above to preview each wording.
        </p>
      ) : null}
      {promptPlain(displayQ.prompt) ? (
        <div className="f-host-preview-prompt">
          <RichText className="f-md" text={displayQ.prompt} />
        </div>
      ) : null}
      {media.length ? (
        <MediaStack
          key={`${q.id}-v${variantIndex}-${media[0] || ''}`}
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
            <strong>Answer:</strong> {correctAnswerText(displayQ)}
          </p>
        </>
      ) : null}
      {isGate ? (
        <p className="f-muted f-preview-answer-line">Gate question (Discord / in-game name).</p>
      ) : null}
    </article>
  );
}

export default function HostPreview() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [variantByQ, setVariantByQ] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await hostApi(
          `/api/trivia/host?action=quiz&quizId=${encodeURIComponent(quizId)}`
        );
        if (!alive) return;
        setQuiz(data.quiz);
        setQuestions(data.questions || []);
        setVariantByQ({});
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load preview');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [quizId]);

  const settings = mergeQuizSettings(quiz?.settings);
  const theme = quizThemeProps(settings);
  const points = useMemo(
    () =>
      questions.reduce((sum, q) => {
        const pts = Number(q.points);
        return sum + (Number.isFinite(pts) ? pts : 0);
      }, 0),
    [questions]
  );

  const variantableCount = useMemo(
    () => questions.filter((q) => variantCount(q) > 1).length,
    [questions]
  );

  const cycleAllVariants = useCallback(() => {
    setVariantByQ((prev) => {
      const next = { ...prev };
      for (const q of questions) {
        const count = variantCount(q);
        if (count <= 1) continue;
        const cur = prev[q.id] ?? 0;
        next[q.id] = (cur + 1) % count;
      }
      return next;
    });
  }, [questions]);

  const resetAllVariants = useCallback(() => setVariantByQ({}), []);

  const setVariant = useCallback((questionId, index) => {
    setVariantByQ((prev) => ({ ...prev, [questionId]: index }));
  }, []);

  if (loading) {
    return (
      <div className={`f-activity-shell ${theme.className}`} style={theme.style}>
        <p className="f-muted" style={{ padding: 24 }}>
          Loading preview…
        </p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className={`f-activity-shell ${theme.className}`} style={theme.style}>
        <div style={{ padding: 24 }}>
          <p className="f-error">{error || 'Quiz not found'}</p>
          <Link to="/">Back to quizzes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`f-activity-shell f-host-preview ${theme.className}`} style={theme.style}>
      <header className="f-topbar">
        <Link className="f-icon-btn" to={activityHref(quiz)} aria-label="Back to editor" title="Back to editor">
          ←
        </Link>
        <div className="f-topbar-title">{quiz.title || 'Untitled'} — Preview</div>
        <div className="f-topbar-actions">
          {variantableCount > 0 ? (
            <>
              <button type="button" className="f-outline-btn" onClick={cycleAllVariants}>
                Next variant (all)
              </button>
              <button type="button" className="f-outline-btn" onClick={resetAllVariants}>
                Reset to A
              </button>
            </>
          ) : null}
          <span className="f-muted" style={{ fontSize: 13 }}>
            {questions.length} Q · {points} pts
          </span>
          <a className="f-outline-btn" href={`/trivia/take/${encodeURIComponent(quiz.slug || '')}`} target="_blank" rel="noreferrer">
            Open student link
          </a>
        </div>
      </header>

      <div className="f-host-preview-banner">
        Host preview — all questions and correct answers. This is not a timed take and does not record a response.
        {variantableCount > 0
          ? ` ${variantableCount} question${variantableCount === 1 ? '' : 's'} have alternate versions — use the version controls on each card.`
          : ''}
      </div>

      <div className="f-host-preview-list">
        {questions.length ? (
          questions.map((q, idx) => (
            <PreviewQuestionCard
              key={q.id || idx}
              q={q}
              idx={idx}
              variantIndex={variantByQ[q.id] ?? 0}
              onVariantChange={setVariant}
            />
          ))
        ) : (
          <p className="f-muted">No questions in this quiz yet.</p>
        )}
      </div>
    </div>
  );
}
