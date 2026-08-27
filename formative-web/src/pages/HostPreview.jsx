import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MediaStack from '../components/MediaStack';
import RichText from '../components/RichText';
import { activityHref, hostApi } from '../lib/api';
import { allChoicesHaveArt, lookupChoiceArt } from '../lib/choiceArt';
import { listMediaUrls } from '../lib/questionMedia';
import { typeLabel } from '../lib/questionTypes';
import { mergeQuizSettings } from '../lib/quizSettings';
import { quizThemeProps } from '../lib/quizThemes';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { promptPlain } from '../lib/promptPlain';

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

export default function HostPreview() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
      </div>

      <div className="f-host-preview-list">
        {questions.map((q, idx) => {
          const media = listMediaUrls(q);
          const isGate = q.meta?.is_discord_gate || q.meta?.is_ingame_gate;
          const isContent = ['image', 'audio', 'video', 'embed', 'content'].includes(q.type);
          return (
            <article key={q.id || idx} className="f-host-preview-card" id={`preview-q-${q.id}`}>
              <div className="f-host-preview-card-head">
                <span className="f-q-num">{idx + 1}</span>
                <span className="f-type-pill">{typeLabel(q)}</span>
                <span className="f-muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
                  {Number(q.points) || 0} pts
                  {q.required ? ' · required' : ''}
                </span>
              </div>
              {promptPlain(q.prompt) ? (
                <div className="f-host-preview-prompt">
                  <RichText className="f-md" text={q.prompt} />
                </div>
              ) : null}
              {media.length ? (
                <MediaStack
                  urls={media}
                  imageCrop={q.meta?.media_crop}
                  imageCropSeed={q.meta?.media_seed}
                />
              ) : null}
              {!isGate && !isContent ? (
                <>
                  <PreviewChoices q={q} />
                  <p className="f-preview-answer-line">
                    <strong>Answer:</strong> {correctAnswerText(q)}
                  </p>
                </>
              ) : null}
              {isGate ? (
                <p className="f-muted f-preview-answer-line">Gate question (Discord / in-game name).</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
