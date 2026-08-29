import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MediaStack from '../components/MediaStack';
import RichText from '../components/RichText';
import { hostApi, activityHref } from '../lib/api';
import { allChoicesHaveArt, lookupChoiceArt } from '../lib/choiceArt';
import { formatResponseAnswer, hasResponseAnswers, isContentQuestion } from '../lib/formatResponseAnswer';
import { listMediaUrls, questionMediaCrop, questionMediaCropSeed } from '../lib/questionMedia';
import { promptPlain } from '../lib/promptPlain';
import { typeLabel } from '../lib/questionTypes';
import { quizThemeProps } from '../lib/quizThemes';
import { resolveMediaUrl } from '../lib/mediaUrl';
import {
  applyVariant,
  extractQuestionOrder,
  extractVariantMap,
  orderQuestionsLikeStudent,
} from '../lib/triviaVariants';

function ReplayChoices({ q, answerRaw }) {
  const options = Array.isArray(q.options) ? q.options : [];
  const useTiles = allChoicesHaveArt(options);
  const selected = new Set();
  if (Array.isArray(answerRaw)) {
    answerRaw.forEach((i) => selected.add(Number(i)));
  } else if (answerRaw != null && answerRaw !== '') {
    selected.add(Number(answerRaw));
  }

  if (!options.length) return null;

  if (useTiles) {
    return (
      <div className="f-choice-tiles f-student-replay-choices">
        {options.map((label, i) => {
          const art = lookupChoiceArt(label);
          const picked = selected.has(i);
          return (
            <div
              key={`${q.id}-opt-${i}`}
              className={`f-choice-tile ${picked ? 'is-student-pick' : ''}`}
            >
              {art?.image ? (
                <img className="f-choice-tile-art" src={resolveMediaUrl(art.image)} alt="" draggable={false} />
              ) : (
                <div className="f-choice-tile-art f-choice-tile-art-empty" />
              )}
              <span>{label}</span>
              {picked ? <span className="f-student-pick-tag">Their pick</span> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="f-preview-option-list f-student-replay-list">
      {options.map((label, i) => {
        const picked = selected.has(i);
        return (
          <li key={`${q.id}-opt-${i}`} className={picked ? 'is-student-pick' : ''}>
            <span className="f-preview-opt-mark">{picked ? '●' : '○'}</span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function QuestionReplayCard({ q, idx, answerRaw, response }) {
  const media = listMediaUrls(q);
  const isChoice =
    q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown';
  const answerText = formatResponseAnswer(q, answerRaw, response);
  const useMediaSplit =
    q.type === 'image' ||
    q.type === 'audio' ||
    q.type === 'video' ||
    q.type === 'embed' ||
    ((isChoice || q.type === 'multiple_selection' || q.type === 'short_answer') && media.length > 0);

  const mediaBlock = media.length ? (
    <MediaStack
      urls={media}
      opaque
      imageCrop={questionMediaCrop(q.meta)}
      imageCropSeed={questionMediaCropSeed(q.meta, media[0])}
    />
  ) : null;

  const body = (
    <>
      {isChoice || q.type === 'multiple_selection' ? (
        <ReplayChoices q={q} answerRaw={answerRaw} />
      ) : answerText != null ? (
        <div className="f-student-replay-answer">
          <pre>{answerText}</pre>
        </div>
      ) : (
        <p className="f-muted f-student-replay-empty">No answer recorded</p>
      )}
    </>
  );

  return (
    <section className="f-qcard f-student-replay-card">
      <div className="f-q-head">
        <span className="f-q-num">{idx + 1}</span>
        <span className="f-type-pill">{typeLabel(q)}</span>
        {q.meta?.variant_index > 0 ? (
          <span className="f-muted" style={{ fontSize: 12 }}>
            Version {String.fromCharCode(65 + (q.meta.variant_index || 0))}
          </span>
        ) : null}
      </div>
      {promptPlain(q.prompt) ? (
        <div className="f-student-replay-prompt">
          <RichText className="f-md" text={q.prompt} />
        </div>
      ) : null}
      {useMediaSplit ? (
        <div className="f-q-split">
          <div className="f-q-media-pane">
            <div className="f-q-media-label">Media</div>
            {mediaBlock}
          </div>
          <div className="f-q-main-pane">{body}</div>
        </div>
      ) : (
        <>
          {mediaBlock}
          {body}
        </>
      )}
    </section>
  );
}

export default function StudentTakeView() {
  const { quizId, responseId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [quizData, respData] = await Promise.all([
          hostApi(`/api/trivia/host?action=quiz&quizId=${encodeURIComponent(quizId)}`),
          hostApi(`/api/trivia/host?action=response&id=${encodeURIComponent(responseId)}`),
        ]);
        if (!alive) return;
        setQuiz(quizData.quiz);
        setQuestions(quizData.questions || []);
        setResponse(respData.response);
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load student view');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [quizId, responseId]);

  const variantMap = useMemo(
    () => extractVariantMap(response?.answers) || {},
    [response]
  );

  const displayQuestions = useMemo(() => {
    const filtered = (questions || [])
      .filter((q) => !isContentQuestion(q))
      .map((q) => applyVariant(q, variantMap[q.id] ?? 0));
    const answers = hasResponseAnswers(response?.answers) ? response.answers : {};
    return orderQuestionsLikeStudent(filtered, answers, {
      slug: quizId,
      discord: response?.discord_username,
      ingame: response?.ingame_name,
      shuffleQuestions: Boolean(quiz?.settings?.shuffle_questions),
    });
  }, [questions, variantMap, response, quizId, quiz]);

  const orderApproximated =
    Boolean(quiz?.settings?.shuffle_questions) &&
    !extractQuestionOrder(hasResponseAnswers(response?.answers) ? response.answers : {});

  const theme = quizThemeProps(quiz?.settings?.theme);

  if (loading) {
    return (
      <div className="f-activity-shell">
        <p className="f-muted">Loading student view…</p>
      </div>
    );
  }

  if (error || !quiz || !response) {
    return (
      <div className="f-activity-shell">
        <p className="f-error">{error || 'Not found'}</p>
        <Link to={activityHref({ slug: quizId })}>Back to activity</Link>
      </div>
    );
  }

  return (
    <div className={`f-take-shell f-student-take-view ${theme.className}`} style={theme.style}>
      <header className="f-student-take-view-head">
        <div>
          <h1 className="f-student-take-view-title">{quiz.title || 'Quiz'}</h1>
          <p className="f-muted">
            What <strong>{response.discord_username}</strong> saw · read-only replay
            {response.ingame_name ? ` · ${response.ingame_name}` : ''}
          </p>
          {orderApproximated ? (
            <p className="f-muted" style={{ fontSize: 12, marginTop: 4 }}>
              Order approximated (submission before order tracking)
            </p>
          ) : null}
        </div>
        <Link className="f-outline-btn" to={activityHref(quiz)}>
          Back to activity
        </Link>
      </header>

      <div className="f-take-form f-student-take-view-list">
        {displayQuestions.map((q, idx) => (
          <QuestionReplayCard
            key={q.id}
            q={q}
            idx={idx}
            answerRaw={response.answers?.[q.id]}
            response={response}
          />
        ))}
      </div>
    </div>
  );
}
