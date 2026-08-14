import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import RichText from '../components/RichText';
import MediaStack from '../components/MediaStack';
import { submitTrivia } from '../lib/api';
import { splitFillBlankPrompt } from '../lib/fillBlank';
import { listMediaUrls } from '../lib/questionMedia';
import { typeLabel } from '../lib/questionTypes';
import {
  clearTriviaProgress,
  loadTriviaProgress,
  saveTriviaProgress,
} from '../lib/triviaVariants';
import { quizWindowState } from '../lib/quizSettings';

async function fileToDataUrl(file, maxBytes = 2.5 * 1024 * 1024) {
  if (!file) throw new Error('No file');
  if (file.size > maxBytes) throw new Error('File too large (max ~2.5MB)');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

/** Stable shuffle so re-renders don't reshuffle mid-answer. */
function choiceRows(q) {
  const opts = Array.isArray(q.options) ? q.options : [];
  const rows = opts.map((label, originalIndex) => ({ label, originalIndex }));
  if (!q.meta?.randomize_order || rows.length < 2) return rows;
  let seed = 0;
  const id = String(q.id || '');
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  for (let i = rows.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = rows[i];
    rows[i] = rows[j];
    rows[j] = tmp;
  }
  return rows;
}

function DrawingPad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !value) return;
    const ctx = c.getContext('2d');
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = value;
  }, [value]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.touches?.[0];
    const clientX = t ? t.clientX : e.clientX;
    const clientY = t ? t.clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((clientY - rect.top) / rect.height) * canvasRef.current.height,
    };
  };

  const start = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={240}
      className="f-draw-canvas"
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
    />
  );
}

function formatRemain(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function isGate(q) {
  return Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);
}

export default function TakeQuiz() {
  const { slug } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [discord, setDiscord] = useState('');
  const [ingame, setIngame] = useState('');
  const [answers, setAnswers] = useState({});
  const [variantMap, setVariantMap] = useState({});
  const [resumed, setResumed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const restoredRef = useRef(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = loadTriviaProgress(slug);
        const discordQ = saved?.discord ? `&discord=${encodeURIComponent(saved.discord)}` : '';
        const res = await fetch(`/api/trivia/public?slug=${encodeURIComponent(slug)}${discordQ}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        if (!alive) return;
        setQuiz(data.quiz);
        setQuestions(data.questions || []);
        if (data.variant_map) setVariantMap(data.variant_map);
        if (saved && !restoredRef.current) {
          restoredRef.current = true;
          if (saved.discord) setDiscord(String(saved.discord));
          if (saved.ingame) setIngame(String(saved.ingame));
          if (saved.answers && typeof saved.answers === 'object') setAnswers(saved.answers);
          if (saved.startedAt) setStartedAt(Number(saved.startedAt) || saved.startedAt);
          if (saved.variantMap && typeof saved.variantMap === 'object') {
            setVariantMap(saved.variantMap);
          }
          setResumed(true);
        }
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load quiz');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  // After Discord is entered, lock in that player's question variants.
  useEffect(() => {
    const name = String(discord || '').trim();
    if (!slug || !name || name.length < 2) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/trivia/public?slug=${encodeURIComponent(slug)}&discord=${encodeURIComponent(name)}`
        );
        const data = await res.json();
        if (!res.ok || !alive) return;
        if (data.questions) setQuestions(data.questions);
        if (data.variant_map) setVariantMap(data.variant_map);
      } catch {
        /* keep current questions */
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [slug, discord]);

  // Autosave progress for tab reopen.
  useEffect(() => {
    if (!slug || result || loading) return;
    if (!discord && !ingame && !Object.keys(answers).length) return;
    saveTriviaProgress(slug, {
      discord,
      ingame,
      answers,
      variantMap,
      startedAt,
    });
  }, [slug, discord, ingame, answers, variantMap, startedAt, result, loading]);

  const playable = useMemo(() => (questions || []).filter((q) => !isGate(q)), [questions]);

  const setAnswer = (id, value) => setAnswers((a) => ({ ...a, [id]: value }));

  const settings = quiz ? quiz.settings || {} : {};
  const timeLimitSec = Math.max(0, Number(settings.time_limit_seconds) || 0);
  const windowState = quizWindowState(settings, now);
  const timed = timeLimitSec > 0;
  const remainingMs = startedAt && timed ? startedAt + timeLimitSec * 1000 - now : null;
  const quizLocked = windowState.status !== 'open';
  const showQuestions = !quizLocked && (!timed || Boolean(startedAt));

  useEffect(() => {
    if (!timed || !startedAt || result) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timed, startedAt, result]);

  useEffect(() => {
    if (quizLocked) {
      const t = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(t);
    }
    return undefined;
  }, [quizLocked]);

  const onSubmit = async (e, opts = {}) => {
    e?.preventDefault?.();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      if (windowState.status === 'not_open') {
        throw new Error(`This quiz opens ${formatWhen(windowState.opensAt)}.`);
      }
      if (windowState.status === 'closed') {
        throw new Error('This quiz is closed.');
      }
      if (!opts.force) {
        for (const q of playable) {
          if (['image', 'content', 'audio', 'video', 'embed'].includes(q.type)) continue;
          if (q.required && (answers[q.id] === undefined || answers[q.id] === '')) {
            throw new Error(`Please answer: ${q.prompt || 'required question'}`);
          }
        }
      }
      const data = await submitTrivia({
        slug,
        discord_username: discord,
        ingame_name: ingame,
        answers,
        variant_map: variantMap,
      });
      clearTriviaProgress(slug);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Submit failed');
      submittingRef.current = false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!timed || !startedAt || result || remainingMs == null || remainingMs > 0) return;
    onSubmit(null, { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, timed, startedAt, result]);

  if (loading) {
    return (
      <div className="f-take">
        <div className="f-take-shell">
          <p className="f-muted">Loading quiz…</p>
        </div>
      </div>
    );
  }
  if (!quiz) {
    return (
      <div className="f-take">
        <div className="f-take-shell">
          <p className="f-error">{error || 'Quiz not found'}</p>
        </div>
      </div>
    );
  }

  if (result) {
    const showScores = Boolean(quiz.settings?.show_scores);
    return (
      <div className="f-take">
        <div className="f-take-shell">
          <div className="f-success-card f-fade-up">
            <p className="f-kicker">Scroll Trivia</p>
            <h1>You're in</h1>
            <p>
              Thanks, <strong>{discord}</strong>
              {ingame ? (
                <>
                  {' '}
                  (<strong>{ingame}</strong>)
                </>
              ) : null}
              . Your answers were submitted.
            </p>
            {showScores && result.score != null ? (
              <p className="f-muted" style={{ marginBottom: 0 }}>
                Score{' '}
                <strong>
                  {result.score}/{result.maxScore}
                </strong>{' '}
                ({result.percent}%).
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="f-take">
      <div className="f-take-shell">
        <header className={`f-cover ${quiz.banner_url ? 'has-art' : ''}`}>
          {quiz.banner_url ? <img className="f-cover-img" src={quiz.banner_url} alt="" /> : null}
          <div className="f-cover-scrim" />
          {quiz.banner_url ? (
            <div className="f-cover-caption">
              <span className="f-kicker">Scroll Trivia</span>
              <strong className="f-cover-caption-title">{quiz.title}</strong>
            </div>
          ) : (
            <div className="f-cover-body">
              <p className="f-kicker">Scroll Trivia</p>
              <h1 className="f-cover-title">{quiz.title}</h1>
              <p className="f-cover-sub">Answer the questions below, then submit when you're ready.</p>
            </div>
          )}
        </header>

        {resumed ? (
          <div className="f-notice f-fade-up" role="status">
            Welcome back — your answers were restored from this browser.
          </div>
        ) : null}

        {String(quiz.settings?.instructions || '').trim() ? (
          <section className="f-student-instructions f-fade-up">
            <h2>Instructions</h2>
            <RichText className="f-md" text={String(quiz.settings.instructions).trim()} />
          </section>
        ) : null}

        {windowState.status === 'not_open' ? (
          <div className="f-notice f-fade-up">
            Opens {formatWhen(windowState.opensAt)}. You can read the rules now — Start unlocks then.
          </div>
        ) : null}
        {windowState.status === 'closed' ? (
          <div className="f-notice f-fade-up">This quiz closed {formatWhen(windowState.closesAt)}.</div>
        ) : null}

        {timed && startedAt && showQuestions ? (
          <div className={`f-timer-bar ${remainingMs != null && remainingMs < 30000 ? 'is-low' : ''}`}>
            Time left {formatRemain(remainingMs ?? 0)}
          </div>
        ) : null}

        <form className="f-take-form" onSubmit={(e) => onSubmit(e)}>
          <section className="f-identity-card f-fade-up">
            <h2>Your details</h2>
            <p className="f-field-hint">
              Discord IGN must be First Last. Wrong format is a DQ.
            </p>
            <div className="f-field-grid">
              <label className="f-field" htmlFor="discord-username">
                <span>{settings.discord_field_label || 'Discord Username'}</span>
                <input
                  id="discord-username"
                  type="text"
                  required
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="First Last"
                  autoComplete="off"
                  disabled={Boolean(startedAt) && timed}
                />
              </label>
              <label className="f-field" htmlFor="ingame-name">
                <span>{settings.ingame_field_label || 'In-Game Name'}</span>
                <input
                  id="ingame-name"
                  type="text"
                  required
                  value={ingame}
                  onChange={(e) => setIngame(e.target.value)}
                  placeholder="Your Smite 2 name"
                  autoComplete="off"
                  disabled={Boolean(startedAt) && timed}
                />
              </label>
            </div>
          </section>

          {timed && !startedAt && !quizLocked ? (
            <button
              type="button"
              className="f-submit-btn"
              disabled={!String(discord).trim() || !String(ingame).trim()}
              onClick={() => setStartedAt(Date.now())}
            >
              Start {Math.round(timeLimitSec / 60)}-minute quiz
            </button>
          ) : null}

          {showQuestions ? playable.map((q, idx) => {
            const opts = Array.isArray(q.options) ? q.options : [];
            const choices = choiceRows(q);
            const categorize =
              q.options && !Array.isArray(q.options) && typeof q.options === 'object'
                ? q.options
                : null;
            const hideScore = Boolean(q.meta?.hide_score);
            const isFillBlank = q.meta?.kind === 'fill_blank';
            const fib = isFillBlank ? splitFillBlankPrompt(q.prompt) : null;
            const mediaUrls = listMediaUrls(q);
            const isChoice =
              q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown';
            const isMulti = q.type === 'multiple_selection';
            const useMediaSplit =
              q.type === 'image' ||
              q.type === 'audio' ||
              q.type === 'video' ||
              q.type === 'embed' ||
              q.type === 'hot_spot' ||
              ((isChoice || isMulti || q.type === 'short_answer') && mediaUrls.length > 0);

            const mediaBlock = mediaUrls.length ? (
              <MediaStack
                urls={mediaUrls}
                hotspot={q.type === 'hot_spot'}
                onHotspot={(e) => {
                  if (q.type !== 'hot_spot') return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                  setAnswer(q.id, { x, y });
                }}
                hotspotMark={
                  q.type === 'hot_spot' && answers[q.id]?.x != null ? (
                    <span
                      className="f-hotspot-mark"
                      style={{ left: `${answers[q.id].x}%`, top: `${answers[q.id].y}%` }}
                    />
                  ) : null
                }
              />
            ) : null;

            const answerBody = (
              <>
                {isFillBlank && fib?.hasBlank ? (
                  <div className="f-fib-take f-q-prompt">
                    <span className="f-q-num">{idx + 1}</span>
                    <span>{fib.before}</span>
                    <input
                      type="text"
                      className="f-fib-inline"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      required={q.required}
                      placeholder="…"
                    />
                    <span>{fib.after}</span>
                  </div>
                ) : (
                  <div className="f-q-prompt">
                    <span className="f-q-num">{idx + 1}</span>
                    <RichText className="f-md" text={q.prompt} />
                  </div>
                )}
                {q.meta?.passage ? <p className="f-passage">{q.meta.passage}</p> : null}

                {!useMediaSplit ? mediaBlock : null}

                {q.type === 'short_answer' && !(isFillBlank && fib?.hasBlank) ? (
                  <input
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    required={q.required}
                  />
                ) : null}

                {(q.type === 'multiple_choice' || q.type === 'true_false') &&
                  choices.map(({ label, originalIndex }) => (
                    <label key={originalIndex} className="f-option-row" style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={Number(answers[q.id]) === originalIndex}
                        onChange={() => setAnswer(q.id, originalIndex)}
                        required={q.required}
                      />
                      <span>{label}</span>
                    </label>
                  ))}

                {q.type === 'dropdown' ? (
                  <select
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                    required={q.required}
                  >
                    <option value="">Select…</option>
                    {choices.map(({ label, originalIndex }) => (
                      <option key={originalIndex} value={originalIndex}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : null}

                {q.type === 'multiple_selection' &&
                  choices.map(({ label, originalIndex }) => {
                    const arr = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                    return (
                      <label key={originalIndex} className="f-option-row" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={arr.includes(originalIndex)}
                          onChange={() => {
                            const next = new Set(arr);
                            if (next.has(originalIndex)) next.delete(originalIndex);
                            else next.add(originalIndex);
                            setAnswer(q.id, [...next].sort((a, b) => a - b));
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}

                {q.type === 'matching' ? (
                  <div style={{ marginTop: 8 }}>
                    {opts.map((pair, i) => {
                      const rights = opts.map((p) => p.right);
                      const map = answers[q.id] || {};
                      return (
                        <div className="f-option-row" key={i}>
                          <span style={{ minWidth: 100 }}>{pair.left}</span>
                          <select
                            value={map[pair.left] || ''}
                            onChange={(e) =>
                              setAnswer(q.id, { ...map, [pair.left]: e.target.value })
                            }
                          >
                            <option value="">Match…</option>
                            {rights.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {q.type === 'categorize' && categorize ? (
                  <div style={{ marginTop: 8 }}>
                    {(categorize.items || []).map((item) => {
                      const map = answers[q.id] || {};
                      return (
                        <div className="f-option-row" key={item}>
                          <span style={{ minWidth: 100 }}>{item}</span>
                          <select
                            value={map[item] || ''}
                            onChange={(e) => setAnswer(q.id, { ...map, [item]: e.target.value })}
                          >
                            <option value="">Category…</option>
                            {(categorize.categories || []).map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {q.type === 'file_response' || q.type === 'audio_response' ? (
                  <input
                    type="file"
                    accept={q.type === 'audio_response' ? 'audio/*' : '*/*'}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setAnswer(q.id, await fileToDataUrl(file));
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  />
                ) : null}

                {q.type === 'drawing' ? (
                  <DrawingPad value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                ) : null}
              </>
            );

            return (
              <section
                className={`f-qcard f-fade-up ${useMediaSplit ? 'f-qcard-media' : ''}`}
                key={q.id}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="f-qcard-head">
                  <span className="f-type-chip">{typeLabel(q)}</span>
                  {!hideScore ? <span className="pts">{q.points || 0} pts</span> : null}
                </div>
                {useMediaSplit ? (
                  <div className="f-q-split">
                    <div className="f-q-media-pane">
                      <div className="f-q-media-label">Media</div>
                      {mediaBlock}
                    </div>
                    <div className="f-q-main-pane">{answerBody}</div>
                  </div>
                ) : (
                  answerBody
                )}
              </section>
            );
          }) : null}

          {error ? <div className="f-error">{error}</div> : null}
          {showQuestions ? (
            <button type="submit" className="f-submit-btn" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit answers'}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
