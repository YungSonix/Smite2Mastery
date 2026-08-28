import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import RichText from '../components/RichText';
import MediaStack from '../components/MediaStack';
import { submitTrivia, requestTriviaHint } from '../lib/api';
import { splitFillBlankPrompt } from '../lib/fillBlank';
import { listMediaUrls } from '../lib/questionMedia';
import { typeLabel } from '../lib/questionTypes';
import {
  isOrderingQuestion,
  matchingAllRights,
  matchingCorrectRights,
  matchingPrompts,
} from '../lib/matching';
import CategorizeBoard from '../components/CategorizeBoard';
import {
  clearTriviaProgress,
  loadTriviaProgress,
  saveTriviaProgress,
} from '../lib/triviaVariants';
import { quizWindowState } from '../lib/quizSettings';
import { quizThemeProps } from '../lib/quizThemes';
import { pingTriviaPresence, compactDraftAnswers } from '../lib/triviaPresence';
import { LIFELINES_PER_ATTEMPT, totalLifelinesUsed, lifelineMultiplier } from '../lib/triviaHints';
import { allChoicesHaveArt, lookupChoiceArt } from '../lib/choiceArt';
import { resolveMediaUrl } from '../lib/mediaUrl';
import {
  formatUnlockCountdown,
  formatWhenLocal,
  formatWhenWithLocalHint,
} from '../lib/formatWhen';

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
function seededShuffle(list, seedStr) {
  const out = [...list];
  let seed = 0;
  const id = String(seedStr || '');
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function choiceRows(q, quizRandomize) {
  const opts = Array.isArray(q.options) ? q.options : [];
  const rows = opts.map((label, originalIndex) => ({ label, originalIndex }));
  if (!(q.meta?.randomize_order || quizRandomize) || rows.length < 2) return rows;
  return seededShuffle(rows, q.id);
}

function TakeChoices({ q, choices, answers, setAnswer, multi = false }) {
  const useTiles = allChoicesHaveArt(choices.map((row) => row.label));
  const arr = Array.isArray(answers[q.id]) ? answers[q.id] : [];
  const items = choices.map(({ label, originalIndex }) => {
    const art = useTiles ? lookupChoiceArt(label) : null;
    const checked = multi ? arr.includes(originalIndex) : Number(answers[q.id]) === originalIndex;
    return (
      <label
        key={originalIndex}
        className={useTiles ? 'f-choice-tile' : 'f-option-row'}
        style={{ cursor: 'pointer' }}
      >
        <input
          type={multi ? 'checkbox' : 'radio'}
          name={multi ? undefined : `q-${q.id}`}
          checked={checked}
          onChange={() => {
            if (!multi) {
              setAnswer(q.id, originalIndex);
              return;
            }
            const next = new Set(arr);
            if (next.has(originalIndex)) next.delete(originalIndex);
            else next.add(originalIndex);
            setAnswer(q.id, [...next].sort((a, b) => a - b));
          }}
        />
        {art ? (
          <img
            className="f-choice-tile-art"
            src={resolveMediaUrl(art.image)}
            alt=""
            draggable={false}
          />
        ) : null}
        <span>{label}</span>
      </label>
    );
  });
  return useTiles ? <div className="f-choice-tiles">{items}</div> : <>{items}</>;
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

function isGate(q) {
  return Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);
}

const SKIP_UNANSWERED = new Set(['image', 'content', 'audio', 'video', 'embed']);

function promptPlain(q) {
  return String(q?.prompt || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRequiredTake(q, settings) {
  if (!q || SKIP_UNANSWERED.has(q.type)) return false;
  if (q.meta?.extra_credit && !q.required) return false;
  return Boolean(q.required || settings?.require_all);
}

function isAnswered(q, answers) {
  const v = answers?.[q.id];
  if (v == null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') {
    if (v.x != null || v.y != null) return true;
    if (v.data || v.url) return true;
    return Object.values(v).some((x) => (Array.isArray(x) ? x.length > 0 : String(x || '').trim()));
  }
  return true;
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
  const [shuffleSeed, setShuffleSeed] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [missingConfirm, setMissingConfirm] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [visibleQ, setVisibleQ] = useState(1);
  const [hintTexts, setHintTexts] = useState({});
  const [hintCounts, setHintCounts] = useState({});
  const [hintBusy, setHintBusy] = useState('');
  const restoredRef = useRef(false);
  const submittingRef = useRef(false);
  const resultRef = useRef(null);
  const payloadRef = useRef({});
  resultRef.current = result;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = loadTriviaProgress(slug);
        const discordQ = saved?.discord ? `&discord=${encodeURIComponent(saved.discord)}` : '';
        const res = await fetch(`/api/trivia/public?slug=${encodeURIComponent(slug)}${discordQ}`, {
          cache: 'no-store',
        });
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
          if (saved.shuffleSeed) setShuffleSeed(String(saved.shuffleSeed));
          else if (saved.startedAt) {
            setShuffleSeed(`${slug}|${saved.discord || ''}|${saved.ingame || ''}`);
          }
          if (saved.startedAt && saved.variantMap && typeof saved.variantMap === 'object') {
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
    if (!slug || !name || name.length < 2 || startedAt) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/trivia/public?slug=${encodeURIComponent(slug)}&discord=${encodeURIComponent(name)}`,
          { cache: 'no-store' }
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
  }, [slug, discord, startedAt]);

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
      shuffleSeed,
    });
  }, [slug, discord, ingame, answers, variantMap, startedAt, shuffleSeed, result, loading]);

  const playable = useMemo(() => (questions || []).filter((q) => !isGate(q)), [questions]);
  const settings = quiz ? quiz.settings || {} : {};
  const orderedPlayable = useMemo(() => {
    if (!settings.shuffle_questions) return playable;
    return seededShuffle(playable, shuffleSeed || `${slug}|${discord}|${ingame}`);
  }, [playable, settings.shuffle_questions, slug, discord, ingame, shuffleSeed]);

  const setAnswer = (id, value) => {
    setAnswers((prev) => {
      const timings = { ...(prev.__timings || {}) };
      if (timings[id] == null && startedAt) {
        timings[id] = Math.max(0, Date.now() - Number(startedAt));
      }
      const next = { ...prev, [id]: value, __timings: timings };
      payloadRef.current = { ...payloadRef.current, answers: next };
      if (slug) {
        saveTriviaProgress(slug, {
          discord,
          ingame,
          answers: next,
          variantMap,
          startedAt,
          shuffleSeed,
        });
      }
      return next;
    });
  };

  const timeLimitSec = Math.max(0, Number(settings.time_limit_seconds) || 0);
  const windowState = quizWindowState(settings, now);
  const timed = timeLimitSec > 0;
  const remainingMs = startedAt && timed ? startedAt + timeLimitSec * 1000 - now : null;
  const quizLocked = windowState.status !== 'open';
  const showQuestions = !quizLocked && Boolean(startedAt);
  payloadRef.current = {
    slug,
    discord,
    ingame,
    answers: {
      ...answers,
      __lifelines: hintCounts,
      __duration_ms: startedAt ? Math.max(0, Date.now() - Number(startedAt)) : undefined,
    },
    variantMap,
    startedAt,
  };

  const lifelinesLeft = Math.max(0, LIFELINES_PER_ATTEMPT - totalLifelinesUsed(hintCounts));

  const spendHint = async (q) => {
    if (!q?.id || hintBusy || lifelinesLeft <= 0) return;
    setHintBusy(q.id);
    setError('');
    try {
      const data = await requestTriviaHint({
        slug,
        discord_username: discord,
        questionId: q.id,
        variant_map: variantMap,
      });
      setHintTexts((prev) => ({
        ...prev,
        [q.id]: [...(prev[q.id] || []), data.text].filter(Boolean),
      }));
      setHintCounts((prev) => ({ ...prev, [q.id]: data.usedOnQuestion }));
    } catch (e) {
      setError(e.message || 'Hint failed');
    } finally {
      setHintBusy('');
    }
  };

  useEffect(() => {
    if (!showQuestions || !orderedPlayable.length) {
      setVisibleQ(1);
      return undefined;
    }
    let io = null;
    const frame = requestAnimationFrame(() => {
      const nodes = orderedPlayable
        .map((q) => document.getElementById(`take-q-${q.id}`))
        .filter(Boolean);
      if (!nodes.length) return;
      io = new IntersectionObserver(
        (entries) => {
          const vis = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (!vis?.target?.id) return;
          const id = vis.target.id.replace(/^take-q-/, '');
          const i = orderedPlayable.findIndex((q) => q.id === id);
          if (i >= 0) setVisibleQ(i + 1);
        },
        { rootMargin: '-18% 0px -55% 0px', threshold: [0.15, 0.4, 0.7] }
      );
      nodes.forEach((el) => io.observe(el));
    });
    return () => {
      cancelAnimationFrame(frame);
      io?.disconnect();
    };
  }, [showQuestions, orderedPlayable]);

  useEffect(() => {
    if (!showQuestions) return;
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      playable.forEach((q) => {
        if (!isOrderingQuestion(q) || next[q.id] != null) return;
        const items = Array.isArray(q.correct?.order) ? q.correct.order : q.options || [];
        if (!Array.isArray(items) || !items.length) return;
        next[q.id] = seededShuffle(items, `${slug}|${q.id}|ord`);
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [showQuestions, playable, slug]);

  useEffect(() => {
    if (!timed || !startedAt || result) return undefined;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timed, startedAt, result]);

  const answeredCount = useMemo(() => {
    let n = 0;
    playable.forEach((q) => {
      if (SKIP_UNANSWERED.has(q.type)) return;
      if (isAnswered(q, answers)) n += 1;
    });
    return n;
  }, [playable, answers]);

  const scoredQuestionCount = useMemo(
    () => playable.filter((q) => !SKIP_UNANSWERED.has(q.type)).length,
    [playable]
  );

  useEffect(() => {
    if (!startedAt || result || !slug) return undefined;
    const name = String(discord || '').trim();
    if (name.length < 2) return undefined;

    const sendPing = (extra = {}) => {
      const hidden = typeof document !== 'undefined' && document.hidden;
      const p = payloadRef.current;
      pingTriviaPresence(
        {
          slug: p.slug || slug,
          discord_username: name,
          ingame_name: String(p.ingame || ingame || '').trim(),
          answered_count: answeredCount,
          question_count: scoredQuestionCount,
          currently_hidden: extra.left_page ? true : hidden,
          hidden_inc: extra.hidden_inc || 0,
          left_page: Boolean(extra.left_page),
          answers: compactDraftAnswers(p.answers),
          variant_map: p.variantMap || {},
          started_at: p.startedAt || startedAt,
        },
        { keepalive: Boolean(extra.left_page) }
      );
    };

    sendPing();
    const tick = setInterval(() => sendPing(), 15000);
    const onVis = () => {
      sendPing({ hidden_inc: document.hidden ? 1 : 0 });
    };
    const onHide = () => sendPing({ left_page: true });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
    };
  }, [startedAt, result, slug, discord, ingame, answeredCount, scoredQuestionCount]);

  useEffect(() => {
    if (quizLocked) {
      const t = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(t);
    }
    return undefined;
  }, [quizLocked]);

  useEffect(() => {
    if (!highlightId) return;
    const q = orderedPlayable.find((item) => item.id === highlightId);
    if (q && isAnswered(q, answers)) setHighlightId(null);
  }, [answers, highlightId, orderedPlayable]);

  const missingRequired = useMemo(() => {
    const items = [];
    orderedPlayable.forEach((q, idx) => {
      if (!isRequiredTake(q, settings) || isAnswered(q, answers)) return;
      items.push({ id: q.id, num: idx + 1, preview: promptPlain(q) });
    });
    return items;
  }, [orderedPlayable, answers, settings]);

  const missingOptional = useMemo(() => {
    const items = [];
    orderedPlayable.forEach((q, idx) => {
      if (SKIP_UNANSWERED.has(q.type) || isRequiredTake(q, settings) || isAnswered(q, answers)) return;
      items.push({ id: q.id, num: idx + 1, preview: promptPlain(q) });
    });
    return items;
  }, [orderedPlayable, answers, settings]);

  const jumpToQuestion = (id) => {
    setMissingConfirm(null);
    setHighlightId(id);
    window.setTimeout(() => {
      document.getElementById(`take-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const onSubmit = async (e, opts = {}) => {
    e?.preventDefault?.();
    if (submittingRef.current || resultRef.current) return;
    if (!opts.force && !opts.confirmed) {
      if (missingRequired.length) {
        setMissingConfirm({ kind: 'required', items: missingRequired });
        return;
      }
      if (missingOptional.length) {
        setMissingConfirm({ kind: 'optional', items: missingOptional });
        return;
      }
    }
    const p = payloadRef.current;
    const discordName = String(p.discord || '').trim();
    const ingameName = String(p.ingame || '').trim();
    if (!p.slug || !discordName || !ingameName) {
      if (opts.force) return;
      setError('Discord Username and In-Game Name are required.');
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setError('');
    setMissingConfirm(null);
    try {
      if (!opts.force && windowState.status === 'not_open') {
        throw new Error(`This quiz opens ${formatWhenWithLocalHint(windowState.opensAt)}.`);
      }
      if (!opts.force && windowState.status === 'closed') {
        throw new Error('This quiz is closed.');
      }
      const data = await submitTrivia(
        {
          slug: p.slug,
          discord_username: discordName,
          ingame_name: ingameName,
          answers: p.answers,
          variant_map: p.variantMap,
          force_timeout: Boolean(opts.force),
        },
        { keepalive: Boolean(opts.keepalive) },
      );
      clearTriviaProgress(p.slug);
      resultRef.current = data || { ok: true };
      if (!opts.keepalive) setResult(data);
      else setResult(data || { ok: true });
    } catch (err) {
      setError(err.message || 'Submit failed');
      submittingRef.current = false;
    } finally {
      setBusy(false);
    }
  };

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (!timed || !startedAt || result) return undefined;
    const deadline = Number(startedAt) + timeLimitSec * 1000;
    const fire = (keepalive = false) => {
      if (Date.now() < deadline) return;
      onSubmitRef.current?.(null, { force: true, keepalive });
    };
    const wait = Math.max(0, deadline - Date.now());
    const tid = window.setTimeout(() => fire(false), wait);
    const retry = window.setInterval(() => fire(false), 2000);
    const onVis = () => fire(false);
    const onHide = () => fire(true);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    window.addEventListener('pagehide', onHide);
    fire(false);
    return () => {
      window.clearTimeout(tid);
      window.clearInterval(retry);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      window.removeEventListener('pagehide', onHide);
    };
  }, [timed, startedAt, timeLimitSec, result]);

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

  const theme = quizThemeProps(settings);

  if (result) {
    const showScores = Boolean(quiz.settings?.show_scores);
    return (
      <div className={`f-take ${theme.className}`} style={theme.style}>
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
    <div className={`f-take ${theme.className}`} style={theme.style}>
      {showQuestions ? (
        <div className="f-take-progress" aria-live="polite">
          Question {visibleQ} of {orderedPlayable.length}
        </div>
      ) : null}
      {timed && startedAt && showQuestions ? (
        <div
          className={`f-timer-float ${remainingMs != null && remainingMs < 30000 ? 'is-low' : ''}`}
          role="timer"
          aria-live="polite"
        >
          {formatRemain(remainingMs ?? 0)}
        </div>
      ) : null}
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
              <p className="f-cover-sub">Read the instructions, enter your names, then start.</p>
            </div>
          )}
        </header>

        {resumed ? (
          <div className="f-notice f-fade-up" role="status">
            Welcome back — your answers were restored from this browser.
          </div>
        ) : null}

        {String(quiz.settings?.instructions || '').trim() ? (
          showQuestions ? (
            <details className="f-student-instructions f-take-fold f-fade-up">
              <summary>
                <h2>Instructions</h2>
                <span className="f-chevron" aria-hidden="true" />
              </summary>
              <div className="f-take-fold-body">
                <RichText className="f-md" text={String(quiz.settings.instructions).trim()} />
              </div>
            </details>
          ) : (
            <section className="f-student-instructions f-fade-up">
              <h2>Instructions</h2>
              <RichText className="f-md" text={String(quiz.settings.instructions).trim()} />
            </section>
          )
        ) : null}

        {windowState.status === 'not_open' ? (
          <div className="f-notice f-fade-up">
            Opens {formatWhenWithLocalHint(windowState.opensAt)}.
            {formatUnlockCountdown(windowState.opensAt, now)
              ? ` ${formatUnlockCountdown(windowState.opensAt, now)}.`
              : ''}{' '}
            You can read the rules now — Start unlocks then.
          </div>
        ) : null}
        {windowState.status === 'closed' ? (
          <div className="f-notice f-fade-up">
            This quiz closed {formatWhenWithLocalHint(windowState.closesAt)}.
          </div>
        ) : null}

        <form className="f-take-form" onSubmit={(e) => onSubmit(e)}>
          {showQuestions ? (
            <details className="f-identity-card f-take-fold f-fade-up">
              <summary>
                <h2>Your details</h2>
                <span className="f-fold-meta">
                  {[String(discord).trim(), String(ingame).trim()].filter(Boolean).join(' · ')}
                </span>
                <span className="f-chevron" aria-hidden="true" />
              </summary>
              <div className="f-take-fold-body">
                <p className="f-field-hint">
                  Discord IGN must be First Last. Wrong format is a DQ. You can still fix a typo
                  here before submit.
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
                    />
                  </label>
                </div>
              </div>
            </details>
          ) : (
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
                  />
                </label>
              </div>
              <button
                type="button"
                className="f-submit-btn"
                style={{ marginTop: 16 }}
                disabled={
                  busy || quizLocked || !String(discord).trim() || !String(ingame).trim()
                }
                onClick={async () => {
                  if (quizLocked || busy) return;
                  const name = String(discord || '').trim();
                  setBusy(true);
                  try {
                    if (name.length >= 2) {
                      const res = await fetch(
                        `/api/trivia/public?slug=${encodeURIComponent(slug)}&discord=${encodeURIComponent(name)}&assign=1`,
                        { cache: 'no-store' }
                      );
                      const data = await res.json().catch(() => ({}));
                      if (res.ok) {
                        if (data.questions) setQuestions(data.questions);
                        if (data.variant_map) setVariantMap(data.variant_map);
                      }
                    }
                    setShuffleSeed(`${slug}|${discord}|${ingame}|${Date.now()}`);
                    setStartedAt(Date.now());
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {windowState.status === 'not_open'
                  ? formatUnlockCountdown(windowState.opensAt, now) ||
                    `Opens ${formatWhenLocal(windowState.opensAt)}`
                  : windowState.status === 'closed'
                    ? 'Quiz closed'
                    : timed
                      ? `Next — start ${Math.round(timeLimitSec / 60)}-minute quiz`
                      : 'Next'}
              </button>
            </section>
          )}

          {showQuestions ? orderedPlayable.map((q, idx) => {
            const opts = Array.isArray(q.options) ? q.options : [];
            const choices = choiceRows(q, settings.randomize_order);
            const categorize =
              q.options && !Array.isArray(q.options) && typeof q.options === 'object'
                ? q.options
                : null;
            const matchRights =
              q.type === 'matching'
                ? seededShuffle(matchingAllRights(q), `${slug}|${q.id}|match`)
                : [];
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
                opaque
                imageCrop={q.meta?.media_crop}
                imageCropSeed={q.meta?.media_seed}
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

            const mustAnswer = isRequiredTake(q, settings);
            const answerBody = (
              <>
                {isFillBlank && fib?.hasBlank ? (
                  <div className="f-fib-take f-q-prompt">
                    <span className="f-q-num" title={`Question ${idx + 1}`} aria-label={`Question ${idx + 1}`}>
                      {idx + 1}
                    </span>
                    <span>{fib.before}</span>
                    <input
                      type="text"
                      className="f-fib-inline"
                      value={answers[q.id] ?? ''}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder="…"
                    />
                    <span>{fib.after}</span>
                    {mustAnswer ? <span className="f-take-req">* Required</span> : null}
                  </div>
                ) : (
                  <div className="f-q-prompt">
                    <span className="f-q-num" title={`Question ${idx + 1}`} aria-label={`Question ${idx + 1}`}>
                      {idx + 1}
                    </span>
                    <div className="f-q-prompt-copy">
                      <RichText className="f-md" text={q.prompt} />
                      {mustAnswer ? <span className="f-take-req">* Required</span> : null}
                    </div>
                  </div>
                )}
                {q.meta?.passage ? <p className="f-passage">{q.meta.passage}</p> : null}

                {settings.lifelines_enabled && q.meta?.hints_enabled ? (
                  <div className="f-lifeline">
                    {(hintTexts[q.id] || []).map((line, hi) => (
                      <p key={hi} className="f-lifeline-text">
                        <strong>Hint {hi + 1}.</strong> {line}
                      </p>
                    ))}
                    <button
                      type="button"
                      className="f-outline-btn f-lifeline-btn"
                      disabled={
                        busy ||
                        hintBusy === q.id ||
                        lifelinesLeft <= 0 ||
                        (Number(hintCounts[q.id]) || 0) >= 3
                      }
                      onClick={() => spendHint(q)}
                    >
                      {hintBusy === q.id
                        ? '…'
                        : (Number(hintCounts[q.id]) || 0) >= 3
                          ? 'No more hints here'
                          : lifelinesLeft <= 0
                            ? 'No lifelines left'
                            : `Use hint (${lifelinesLeft} left)`}
                    </button>
                    {(Number(hintCounts[q.id]) || 0) > 0 ? (
                      <span className="f-muted f-lifeline-cost">
                        This question is worth {Math.round(lifelineMultiplier(hintCounts[q.id]) * 100)}% if you get it right.
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {!useMediaSplit ? mediaBlock : null}

                {q.type === 'short_answer' && !(isFillBlank && fib?.hasBlank) ? (
                  <input
                    type="text"
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                ) : null}

                {(q.type === 'multiple_choice' || q.type === 'true_false') ? (
                  <TakeChoices q={q} choices={choices} answers={answers} setAnswer={setAnswer} />
                ) : null}

                {q.type === 'dropdown' ? (
                  <select
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, Number(e.target.value))}
                  >
                    <option value="">Select…</option>
                    {choices.map(({ label, originalIndex }) => (
                      <option key={originalIndex} value={originalIndex}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : null}

                {q.type === 'multiple_selection' ? (
                  <TakeChoices q={q} choices={choices} answers={answers} setAnswer={setAnswer} multi />
                ) : null}

                {q.type === 'matching' ? (
                  <div style={{ marginTop: 8 }}>
                    <p className="f-muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
                      Answers are shuffled. Extra answers may not belong to any prompt.
                    </p>
                    {matchingPrompts(q).map((pair) => {
                      const map = answers[q.id] || {};
                      const multi = matchingCorrectRights(q, pair.left).length > 1;
                      const selected = multi
                        ? Array.isArray(map[pair.left])
                          ? map[pair.left]
                          : map[pair.left]
                            ? [map[pair.left]]
                            : []
                        : map[pair.left] || '';
                      return (
                        <div className="f-option-row f-match-take" key={pair.left}>
                          <span className="f-match-prompt">{pair.left}</span>
                          {multi ? (
                            <div className="f-match-multi">
                              <div className="f-muted" style={{ fontSize: 12 }}>
                                Select every correct match
                              </div>
                              {matchRights.map((r) => {
                                const on = selected.includes(r);
                                return (
                                  <label key={r} className="f-option-row" style={{ marginTop: 6 }}>
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      onChange={() => {
                                        const next = new Set(selected);
                                        if (on) next.delete(r);
                                        else next.add(r);
                                        setAnswer(q.id, { ...map, [pair.left]: [...next] });
                                      }}
                                    />
                                    <span>{r}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <select
                              value={selected}
                              onChange={(e) =>
                                setAnswer(q.id, { ...map, [pair.left]: e.target.value })
                              }
                            >
                              <option value="">Match…</option>
                              {matchRights.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {isOrderingQuestion(q) ? (
                  <div className="f-order-take" style={{ marginTop: 8 }}>
                    <p className="f-muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
                      Put these in order, top to bottom. Use the arrows to move items.
                    </p>
                    {(Array.isArray(answers[q.id]) ? answers[q.id] : []).map((item, i, list) => (
                      <div className="f-option-row f-order-row" key={`${item}-${i}`}>
                        <span className="f-order-idx">{i + 1}</span>
                        <span style={{ flex: 1 }}>{item}</span>
                        <button
                          type="button"
                          className="f-ghost-btn"
                          disabled={i === 0}
                          onClick={() => {
                            const next = [...list];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            setAnswer(q.id, next);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="f-ghost-btn"
                          disabled={i === list.length - 1}
                          onClick={() => {
                            const next = [...list];
                            [next[i + 1], next[i]] = [next[i], next[i + 1]];
                            setAnswer(q.id, next);
                          }}
                        >
                          ↓
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {q.type === 'categorize' && categorize ? (
                  <CategorizeBoard
                    mode="take"
                    categories={categorize.categories || []}
                    items={categorize.items || []}
                    map={answers[q.id] || {}}
                    shuffleSeed={`${slug}|${q.id}|cat`}
                    onChange={(next) => setAnswer(q.id, next.map)}
                  />
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
                className={`f-qcard f-fade-up ${useMediaSplit ? 'f-qcard-media' : ''} ${highlightId === q.id ? 'is-missing' : ''}`}
                key={q.id}
                id={`take-q-${q.id}`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="f-qcard-head">
                  <span className="f-q-num f-q-num-head" title={`Question ${idx + 1}`} aria-label={`Question ${idx + 1}`}>
                    {idx + 1}
                  </span>
                  <span className="f-type-chip">{typeLabel(q)}</span>
                  <span className="f-qcard-head-meta">
                    <span className="f-q-of">
                      {idx + 1} / {orderedPlayable.length}
                    </span>
                    {mustAnswer ? <span className="f-take-req">* Required</span> : null}
                    {!hideScore ? <span className="pts">{q.points || 0} pts</span> : null}
                  </span>
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
      {missingConfirm?.items?.length ? (
        <div className="f-missing-scrim" role="dialog" aria-modal="true" aria-labelledby="f-missing-title">
          <div className="f-missing-card">
            <h2 id="f-missing-title">
              {missingConfirm.kind === 'required' ? 'Required questions are unanswered' : 'Some questions are blank'}
            </h2>
            <p>
              {missingConfirm.kind === 'required'
                ? 'Finish these before you can submit:'
                : `You skipped ${missingConfirm.items.length === 1 ? 'this question' : 'these questions'}:`}
            </p>
            <ul className="f-missing-list">
              {missingConfirm.items.map((item) => (
                <li key={item.id}>
                  <button type="button" className="f-missing-jump" onClick={() => jumpToQuestion(item.id)}>
                    Question {item.num}
                    {item.preview ? ` — ${item.preview.slice(0, 80)}${item.preview.length > 80 ? '…' : ''}` : ''}
                  </button>
                </li>
              ))}
            </ul>
            <div className="f-missing-actions">
              <button
                type="button"
                className="f-submit-btn"
                onClick={() => jumpToQuestion(missingConfirm.items[0].id)}
              >
                Go to question {missingConfirm.items[0].num}
              </button>
              <button type="button" className="f-outline-btn" onClick={() => setMissingConfirm(null)}>
                Close
              </button>
              {missingConfirm.kind === 'optional' ? (
                <button
                  type="button"
                  className="f-outline-btn"
                  disabled={busy}
                  onClick={() => onSubmit(null, { confirmed: true })}
                >
                  Submit anyway
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
