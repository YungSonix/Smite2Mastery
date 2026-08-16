import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AddItemModal from '../components/AddItemModal';
import InstructionsEditor from '../components/InstructionsEditor';
import QuestionCard from '../components/QuestionCard';
import ResponsesGrid from '../components/ResponsesGrid';
import StudentResponsePanel from '../components/StudentResponsePanel';
import LiveSessionPanel from '../components/LiveSessionPanel';
import { hostApi, takeUrl, activityHref } from '../lib/api';
import { downloadResponsesCsv } from '../lib/exportResponses';
import { readImageAsDataUrl } from '../lib/imageUpload';
import { mergeQuizSettings } from '../lib/quizSettings';
import { quizThemeProps } from '../lib/quizThemes';
import { randomizeQuestion } from '../lib/triviaRemix';
import { presenceStatus } from '../lib/triviaPresence';
import QuizSettingsModal from '../components/QuizSettingsModal';
import {
  clearEditorDraft,
  loadEditorDraft,
  saveEditorDraft,
} from '../lib/editorDraftStorage';
import { promptPlain } from '../lib/promptPlain';

const MORE_ITEMS = [
  { id: 'join', label: 'Join instructions', wire: true },
  { id: 'share', label: 'Share link', wire: true },
  { id: 'duplicate', label: 'Duplicate quiz', wire: true },
  { id: 'settings', label: 'Quiz Settings', wire: true },
  { id: 'delete', label: 'Delete quiz', wire: true, danger: true },
];

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export default function Activity() {
  const { quizId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'edit';
  const nav = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsError, setSessionsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftWarning, setDraftWarning] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [quizSettingsOpen, setQuizSettingsOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoSaveHint, setAutoSaveHint] = useState('');
  const [quizDirty, setQuizDirty] = useState(false);
  const [bannerDirty, setBannerDirty] = useState(false);
  const [dirtyIds, setDirtyIds] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleEditAt, setTitleEditAt] = useState(null); // 'top' | 'cover'
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const instructionsLiveRef = useRef('');
  const indexNavRef = useRef(null);
  const jumpLockUntil = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveAllRef = useRef(null);
  const quizRef = useRef(null);
  const dirtyStampRef = useRef('');
  const autoFailStampRef = useRef('');
  const autoHintTimerRef = useRef(null);
  const saveLockRef = useRef(false);

  const setTab = (t) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next);
    if (t !== 'responses') setSelectedResponse(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await hostApi(
        `/api/trivia/host?action=quiz&quizId=${encodeURIComponent(quizId)}`
      );
      setQuiz(data.quiz);
      const draft = await loadEditorDraft(quizId);
      if (draft?.questions?.length) {
        setQuestions(draft.questions);
        setDirtyIds(
          Array.isArray(draft.dirtyIds) && draft.dirtyIds.length
            ? draft.dirtyIds
            : draft.questions.map((q) => q.id).filter(Boolean)
        );
        if (draft.quiz && typeof draft.quiz === 'object') {
          setQuiz({
            ...data.quiz,
            ...draft.quiz,
            settings: { ...(data.quiz.settings || {}), ...(draft.quiz.settings || {}) },
          });
          setQuizDirty(true);
        }
        setBannerDirty(Boolean(draft.bannerDirty));
      } else {
        setQuestions(data.questions || []);
        setQuizDirty(false);
        setBannerDirty(false);
        setDirtyIds([]);
      }
      instructionsLiveRef.current = data.quiz?.settings?.instructions ?? '';
      if (tab === 'responses' || tab === 'insights') {
        const r = await hostApi(`/api/trivia/host?action=responses&quizId=${encodeURIComponent(quizId)}`);
        setResponses(r.responses || []);
        setSessions(r.sessions || []);
        setSessionsError(r.sessionsError || '');
      }
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [quizId, tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!quiz?.slug || !quizId) return;
    if (decodeURIComponent(String(quizId)) === quiz.slug) return;
    const qs = params.toString();
    nav(`${activityHref(quiz)}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [quiz?.slug, quizId, nav, params]);

  useEffect(() => {
    if (tab !== 'responses' && tab !== 'insights') return undefined;
    const id = setInterval(async () => {
      try {
        const r = await hostApi(`/api/trivia/host?action=responses&quizId=${encodeURIComponent(quizId)}`);
        setResponses(r.responses || []);
        setSessions(r.sessions || []);
        setSessionsError(r.sessionsError || '');
      } catch {
        /* ignore poll errors */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [tab, quizId]);

  const points = useMemo(
    () =>
      questions.reduce((sum, q) => {
        const pts = Number(q.points);
        return sum + (Number.isFinite(pts) ? pts : 0);
      }, 0),
    [questions]
  );

  const saveQuizPatch = async (patch) => {
    setSaving(true);
    try {
      const data = await hostApi('/api/trivia/host', {
        method: 'PUT',
        body: { action: 'update_quiz', quizId, patch },
      });
      setQuiz(data.quiz);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const beginEditTitle = (at = 'top') => {
    if (!quiz) return;
    setTitleDraft(quiz.title || '');
    setTitleEditAt(at);
    setEditingTitle(true);
  };

  const commitTitle = async () => {
    if (!quiz) return;
    const next = String(titleDraft || '').trim() || 'Untitled Scroll Trivia';
    setEditingTitle(false);
    setTitleEditAt(null);
    if (next === quiz.title) return;
    setQuiz({ ...quiz, title: next });
    await saveQuizPatch({ title: next });
  };

  const cancelTitleEdit = () => {
    setEditingTitle(false);
    setTitleEditAt(null);
    setTitleDraft(quiz?.title || '');
  };

  const dirty = quizDirty || bannerDirty || dirtyIds.length > 0;

  const saveQuestion = (q) => {
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? q : x)));
    setDirtyIds((ids) => (ids.includes(q.id) ? ids : [...ids, q.id]));
  };

  const questionPatch = (q) => ({
    prompt: q.prompt,
    points: q.points,
    required: q.required,
    options: q.options,
    correct: q.correct,
    image_url: q.image_url,
    type: q.type,
    meta: q.meta,
  });

  const saveAll = useCallback(async (source) => {
    if (source && typeof source !== 'string') source = undefined;
    if (!quiz) return false;
    if (saveLockRef.current) return 'busy';
    const changed = questions.filter((q) => dirtyIds.includes(q.id));
    const instructionsNow = instructionsLiveRef.current;
    const instructionsDirty = instructionsNow !== (quiz.settings?.instructions ?? '');
    if (!quizDirty && !bannerDirty && !instructionsDirty && !changed.length) return true;
    saveLockRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (quizDirty || bannerDirty || instructionsDirty) {
        const patch = {
          title: quiz.title,
          settings: {
            ...mergeQuizSettings(quiz.settings),
            instructions: instructionsNow,
          },
        };
        if (bannerDirty) patch.banner_url = quiz.banner_url;
        const data = await hostApi('/api/trivia/host', {
          method: 'PUT',
          body: {
            action: 'update_quiz',
            quizId,
            patch,
          },
        });
        setQuiz(data.quiz);
      }
      if (changed.length) {
        for (const q of changed) {
          await hostApi('/api/trivia/host', {
            method: 'PUT',
            body: {
              action: 'update_question',
              questionId: q.id,
              patch: questionPatch(q),
            },
          });
        }
      }
      setQuizDirty(false);
      setBannerDirty(false);
      setDirtyIds([]);
      setDraftWarning('');
      autoFailStampRef.current = '';
      clearEditorDraft(quizId);
      if (source === 'auto') {
        setAutoSaveHint('Autosaved');
        clearTimeout(autoHintTimerRef.current);
        autoHintTimerRef.current = setTimeout(() => setAutoSaveHint(''), 3500);
      } else {
        setAutoSaveHint('');
      }
      return true;
    } catch (e) {
      setError(source === 'auto' ? `Autosave failed: ${e.message}` : e.message);
      return false;
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }, [quiz, questions, quizId, quizDirty, bannerDirty, dirtyIds]);

  dirtyRef.current = dirty;
  savingRef.current = saving;
  saveAllRef.current = saveAll;
  quizRef.current = quiz;
  dirtyStampRef.current = `${quizDirty}|${bannerDirty}|${dirtyIds.join(',')}|${quiz?.settings?.instructions ?? ''}|${instructionsLiveRef.current}`;

  useEffect(() => {
    const id = setInterval(async () => {
      const q = quizRef.current;
      const instructionsDirty = Boolean(
        q && instructionsLiveRef.current !== (q.settings?.instructions ?? '')
      );
      if ((!dirtyRef.current && !instructionsDirty) || savingRef.current) return;
      const stamp = dirtyStampRef.current;
      if (autoFailStampRef.current && autoFailStampRef.current === stamp) return;
      const ok = await saveAllRef.current?.('auto');
      if (ok === false) autoFailStampRef.current = stamp;
    }, 45000);
    return () => {
      clearInterval(id);
      clearTimeout(autoHintTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!quizId || !questions.length || !dirty) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      saveEditorDraft(quizId, {
        questions,
        dirtyIds,
        quizDirty,
        bannerDirty,
        quiz: quiz
          ? { title: quiz.title, banner_url: quiz.banner_url, settings: quiz.settings }
          : null,
        savedAt: Date.now(),
      }).then((result) => {
        if (!alive) return;
        if (result.status === 'fail') {
          setDraftWarning(
            'Local backup failed — your browser storage is full. Click Save (top right) so the quiz is stored on the server.'
          );
        } else if (result.status === 'lite' && !result.idb) {
          setDraftWarning(
            'Audio is saved on the server after you click Save. Local backup kept text only (WAV clips are too large for browser storage).'
          );
        } else {
          setDraftWarning('');
        }
      });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [quizId, questions, dirtyIds, dirty, quiz, quizDirty, bannerDirty]);

  useEffect(() => {
    const onBefore = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 's') {
        e.preventDefault();
        saveAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveAll]);

  const addQuestion = async (type, patch) => {
    try {
      const data = await hostApi('/api/trivia/host', {
        method: 'POST',
        body: { action: 'add_question', quizId, type, patch },
      });
      let nextQ = data.question;
      const auto = mergeQuizSettings(quiz?.settings).auto_random_questions;
      const canFill = ['multiple_choice', 'multiple_selection', 'dropdown', 'short_answer', 'fill_blank'].includes(
        nextQ?.type
      ) || nextQ?.meta?.kind === 'fill_blank';
      if (auto && canFill) {
        const gen = randomizeQuestion(nextQ);
        if (gen.patch) {
          nextQ = {
            ...nextQ,
            ...gen.patch,
            meta: { ...(nextQ.meta || {}), ...(gen.patch.meta || {}) },
          };
        }
      }
      setQuestions((prev) => [...prev, nextQ]);
      if (auto && nextQ?.id) {
        setDirtyIds((ids) => (ids.includes(nextQ.id) ? ids : [...ids, nextQ.id]));
      }
      setAddOpen(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteQuestion = async (id) => {
    try {
      await hostApi(`/api/trivia/host?action=question&id=${id}`, { method: 'DELETE' });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const assign = async () => {
    if (dirty) {
      const ok = await saveAll();
      if (!ok) return;
    }
    await saveQuizPatch({ is_assigned: true });
    setAssignOpen(true);
  };

  const onMore = async (id) => {
    setMoreOpen(false);
    if (id === 'share' || id === 'join') {
      setAssignOpen(true);
      return;
    }
    if (id === 'settings') {
      setQuizSettingsOpen(true);
      return;
    }
    if (id === 'duplicate') {
      try {
        const data = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: { action: 'duplicate', quizId },
        });
        nav(activityHref(data.quiz));
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    if (id === 'delete') {
      const title = String(quiz?.title || 'this quiz').trim() || 'this quiz';
      const extra = quiz?.is_assigned
        ? ' This quiz is assigned — take links stop working and all responses are removed.'
        : ' Questions and responses for it are removed.';
      if (!window.confirm(`Delete “${title}”?${extra}`)) return;
      try {
        await hostApi(`/api/trivia/host?action=quiz&quizId=${encodeURIComponent(quiz.id)}`, {
          method: 'DELETE',
        });
        nav('/');
      } catch (e) {
        setError(e.message || 'Delete failed');
      }
    }
  };

  const jumpToHostQuestion = (id) => {
    jumpLockUntil.current = Date.now() + 700;
    setActiveQuestionId(id);
    document.getElementById(`host-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateActiveFromScroll = useCallback(() => {
    if (Date.now() < jumpLockUntil.current) return;
    if (!questions.length) return;
    const marker = 110;
    let active = questions[0].id;
    for (const q of questions) {
      const el = document.getElementById(`host-q-${q.id}`);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= marker) active = q.id;
    }
    setActiveQuestionId((prev) => (prev === active ? prev : active));
  }, [questions]);

  useEffect(() => {
    if (tab !== 'edit' || !questions.length) return undefined;
    setActiveQuestionId((prev) => prev || questions[0].id);
    updateActiveFromScroll();
    const onScroll = () => updateActiveFromScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [tab, questions, updateActiveFromScroll]);

  useEffect(() => {
    if (tab !== 'edit' || !activeQuestionId || !indexNavRef.current) return;
    const btn = indexNavRef.current.querySelector(`[data-qid="${activeQuestionId}"]`);
    btn?.scrollIntoView({ block: 'nearest' });
  }, [activeQuestionId, tab]);

  const insights = useMemo(() => {
    const scored = questions.filter((q) => q.type !== 'image' && q.type !== 'content');
    return scored.map((q, i) => {
      let n = 0;
      let ok = 0;
      for (const r of responses) {
        const v = r.per_question?.[q.id];
        if (v == null) continue;
        n += 1;
        ok += Number(v) ? 1 : 0;
      }
      const pct = n ? Math.round((ok / n) * 100) : 0;
      return { q, i, pct, n };
    });
  }, [questions, responses]);

  if (loading && !quiz) {
    return <div className="f-content">Loading…</div>;
  }

  if (!quiz) {
    return (
      <div className="f-content">
        <p className="f-error">{error || 'Quiz not found'}</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  const settings = mergeQuizSettings(quiz?.settings);

  const patchSettings = (partial) => {
    if (!quiz) return;
    const next = {
      ...mergeQuizSettings(quiz.settings),
      ...partial,
      instructions: instructionsLiveRef.current,
    };
    setQuiz({ ...quiz, settings: next });
    saveQuizPatch({ settings: next });
  };

  const link = quiz ? takeUrl(quiz.slug) : '';

  const theme = quizThemeProps(settings);
  return (
    <div className={`f-activity-shell ${theme.className}`} style={theme.style}>
      <header className="f-topbar">
        <button type="button" className="f-icon-btn" onClick={() => nav('/')} aria-label="Menu">
          ☰
        </button>
        <button type="button" className="f-icon-btn" onClick={() => nav('/')} aria-label="Back">
          ←
        </button>
        <div className="f-title-edit">
          {editingTitle && titleEditAt === 'top' ? (
            <input
              className="f-topbar-title f-title-input"
              value={titleDraft}
              autoFocus
              aria-label="Quiz title"
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelTitleEdit();
                }
              }}
            />
          ) : (
            <button type="button" className="f-topbar-title f-title-display" onClick={() => beginEditTitle('top')}>
              {quiz.title || 'Untitled Scroll Trivia'}
            </button>
          )}
          <button
            type="button"
            className="f-icon-btn f-title-pencil"
            title="Rename quiz"
            aria-label="Rename quiz"
            onClick={() => beginEditTitle('top')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5.2 12.8 2 13.5l.7-3.2L11.5 2.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="f-topbar-actions" style={{ position: 'relative' }}>
          <button
            type="button"
            className="f-icon-btn"
            title="Preview"
            onClick={() => window.open(link, '_blank')}
          >
            👁
          </button>
          <button type="button" className="f-icon-btn" title="Notifications" disabled>
            🔔
          </button>
          <button type="button" className="f-icon-btn" title="Collaborators" disabled>
            👥
          </button>
          <button
            type="button"
            className={`f-icon-btn ${moreOpen ? 'open' : ''}`}
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="More"
          >
            ⋮
          </button>
          {moreOpen ? (
            <div className="f-menu">
              {MORE_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.danger ? 'f-menu-danger' : undefined}
                  disabled={!item.wire}
                  onClick={() => onMore(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="f-topbar-points" aria-live="polite">
            <span className="f-topbar-points-label">Total</span>
            <span className="f-topbar-points-value">
              {points} pt{points === 1 ? '' : 's'}
            </span>
          </div>
          {autoSaveHint ? (
            <span className="f-autosave-hint" role="status" aria-live="polite">
              {autoSaveHint}
            </span>
          ) : null}
          <button
            type="button"
            className={`f-save-btn ${dirty ? 'is-dirty' : ''}`}
            onClick={() => saveAll()}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
          <button type="button" className="f-assign-btn" onClick={assign}>
            Assign
          </button>
        </div>
      </header>

      <div className="f-subbar">
        <div className="f-pills">
          <button
            type="button"
            className={`f-pill ${tab === 'edit' ? 'active' : ''}`}
            onClick={() => setTab('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            className={`f-pill ${tab === 'responses' ? 'active' : ''}`}
            onClick={() => setTab('responses')}
          >
            Responses {tab === 'responses' ? <span className="f-pill-dot" /> : null}
          </button>
          <button
            type="button"
            className={`f-pill ${tab === 'insights' ? 'active' : ''}`}
            onClick={() => setTab('insights')}
          >
            Insights
          </button>
        </div>
      </div>

      {error ? (
        <div className="f-error" style={{ padding: '8px 16px' }}>
          {error}
        </div>
      ) : null}
      {draftWarning ? (
        <div className="f-banner-warn" role="status">
          {draftWarning}
        </div>
      ) : null}

      {tab === 'edit' && (
        <div className="f-edit-layout">
          {questions.length ? (
            <nav className="f-q-index" aria-label="Jump to question" ref={indexNavRef}>
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  data-qid={q.id}
                  className={`f-q-index-btn ${activeQuestionId === q.id ? 'active' : ''}`}
                  title={`Question ${idx + 1}`}
                  aria-current={activeQuestionId === q.id ? 'true' : undefined}
                  onClick={() => jumpToHostQuestion(q.id)}
                >
                  {idx + 1}
                </button>
              ))}
            </nav>
          ) : null}
          <div className="f-edit-scroll">
          <header className={`f-cover f-cover-edit ${quiz.banner_url ? 'has-art' : ''}`}>
            {quiz.banner_url ? <img className="f-cover-img" src={quiz.banner_url} alt="" /> : null}
            <div className="f-cover-scrim" />
            <div className="f-banner-tools">
              <label className="f-tool-btn" title="Upload banner">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
                  <path d="M3.5 11.5 6.5 8.5 9 10.5 12.5 6.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                Upload
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    try {
                      const dataUrl = await readImageAsDataUrl(file);
                      setQuiz({ ...quiz, banner_url: dataUrl });
                      setQuizDirty(true);
                      setBannerDirty(true);
                    } catch (err) {
                      setError(err.message || 'Banner upload failed');
                    }
                  }}
                />
              </label>
              {quiz.banner_url ? (
                <button
                  type="button"
                  className="f-tool-btn ghost"
                  title="Remove banner"
                  onClick={() => {
                    setQuiz({ ...quiz, banner_url: null });
                    setQuizDirty(true);
                    setBannerDirty(true);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="f-cover-caption">
              <span className="f-kicker">Quiz cover</span>
              {editingTitle && titleEditAt === 'cover' ? (
                <input
                  className="f-cover-caption-title f-title-input"
                  value={titleDraft}
                  autoFocus
                  aria-label="Quiz title"
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelTitleEdit();
                    }
                  }}
                />
              ) : (
                <div className="f-cover-title-row">
                  <strong className="f-cover-caption-title">{quiz.title}</strong>
                  <button
                    type="button"
                    className="f-icon-btn f-title-pencil"
                    title="Rename quiz"
                    aria-label="Rename quiz"
                    onClick={() => beginEditTitle('cover')}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5.2 12.8 2 13.5l.7-3.2L11.5 2.5Z"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </header>

          <InstructionsEditor
            quizId={quiz.id}
            initialValue={quiz.settings?.instructions ?? ''}
            liveRef={instructionsLiveRef}
            onDirty={() => setQuizDirty(true)}
            onCommit={(text) => {
              instructionsLiveRef.current = text;
              setQuiz((prev) =>
                prev
                  ? { ...prev, settings: { ...(prev.settings || {}), instructions: text } }
                  : prev
              );
            }}
          />

          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              onChange={saveQuestion}
              onDelete={() => deleteQuestion(q.id)}
            />
          ))}

          <div className="f-quickbar" style={{ marginTop: 16 }}>
            <button type="button" className="plus" onClick={() => setAddOpen(true)} aria-label="Add item">
              +
            </button>
            <button type="button" className="f-quick-btn" onClick={() => addQuestion('multiple_choice')}>
              Multiple Choice
            </button>
            <button type="button" className="f-quick-btn" onClick={() => addQuestion('true_false')}>
              True or False
            </button>
            <button type="button" className="f-quick-btn" onClick={() => addQuestion('short_answer')}>
              Short Answer
            </button>
            <button type="button" className="f-quick-btn" onClick={() => addQuestion('image')}>
              Image
            </button>
            <button type="button" className="f-quick-btn" onClick={() => addQuestion('audio')}>
              Audio
            </button>
          </div>
          </div>
        </div>
      )}

      {tab === 'responses' && (
        <div className={`f-responses ${selectedResponse || selectedSession ? 'has-panel' : ''}`}>
          <div className="f-responses-main">
            <div className="f-responses-tools">
              <button type="button" className="f-outline-btn" disabled>
                AZ Active
              </button>
              <button type="button" className="f-outline-btn" disabled>
                Grading method
              </button>
              <button
                type="button"
                className="f-outline-btn"
                disabled={!responses?.length}
                title="Download Excel-friendly CSV of all submissions"
                onClick={() => downloadResponsesCsv(quiz, questions, responses)}
              >
                Export Excel/CSV
              </button>
              <button type="button" className="f-outline-btn" onClick={load}>
                Refresh
              </button>
            </div>
            <ResponsesGrid
              questions={questions}
              responses={responses}
              sessions={sessions}
              sessionsError={sessionsError}
              selectedId={selectedResponse?.id}
              selectedLiveId={selectedSession?.id}
              onSelect={(r) => {
                setSelectedSession(null);
                setSelectedResponse(r);
              }}
              onLiveSelect={(s) => {
                setSelectedResponse(null);
                setSelectedSession(s);
              }}
            />
          </div>
          {selectedSession ? (
            <LiveSessionPanel
              session={sessions.find((s) => s.id === selectedSession.id) || selectedSession}
              sessions={sessions.filter((s) => presenceStatus(s) !== 'gone')}
              questions={questions}
              onClose={() => setSelectedSession(null)}
              onSelect={setSelectedSession}
            />
          ) : null}
          {selectedResponse ? (
            <StudentResponsePanel
              response={
                responses.find((r) => r.id === selectedResponse.id) || selectedResponse
              }
              responses={responses}
              questions={questions}
              onClose={() => setSelectedResponse(null)}
              onSelect={setSelectedResponse}
              onViewActivity={() => {
                setSelectedResponse(null);
                setTab('edit');
              }}
              onGrade={async (responseId, questionId, earned, maxPts, perQuestionPatch) => {
                try {
                  const body = perQuestionPatch
                    ? {
                        action: 'update_response',
                        responseId,
                        perQuestionPatch,
                      }
                    : {
                        action: 'update_response',
                        responseId,
                        questionId,
                        earned,
                        maxPts,
                      };
                  const data = await hostApi('/api/trivia/host', {
                    method: 'PUT',
                    body,
                  });
                  setResponses((prev) =>
                    prev.map((r) => (r.id === responseId ? data.response : r))
                  );
                  setSelectedResponse(data.response);
                } catch (e) {
                  setError(e.message || 'Failed to update grade');
                }
              }}
              onRemove={async (responseId) => {
                try {
                  await hostApi(`/api/trivia/host?action=response&id=${responseId}`, {
                    method: 'DELETE',
                  });
                  setResponses((prev) => prev.filter((r) => r.id !== responseId));
                  setSelectedResponse(null);
                } catch (e) {
                  setError(e.message || 'Failed to remove response');
                }
              }}
            />
          ) : null}
        </div>
      )}

      {tab === 'insights' && (
        <div className="f-insights f-insights-v2">
          <header className="f-insights-head">
            <div>
              <h2>Insights</h2>
              <p className="f-muted">{responses.length} submission(s)</p>
            </div>
          </header>
          <div className="f-insights-list">
            {insights.map(({ q, i, pct, n }) => {
              const label = promptPlain(q.prompt) || 'Question';
              const tone = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
              return (
                <div className="f-insight-row" key={q.id}>
                  <span className="f-insight-num">{i + 1}</span>
                  <div className="f-insight-copy">
                    <div className="f-insight-prompt" title={label}>
                      {label}
                    </div>
                    <div className="f-insight-bar-track">
                      <div className={`f-insight-bar-fill is-${tone}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="f-insight-stats">
                    <strong>{pct}%</strong>
                    <span className="f-muted">n={n}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {!insights.length ? <p className="f-muted">Add scored questions to see insights.</p> : null}
        </div>
      )}

      {tab === 'edit' ? (
        <button type="button" className="f-fab" onClick={() => setAddOpen(true)} aria-label="Add item">
          +
        </button>
      ) : null}

      <button
        type="button"
        className={`f-fab f-fab-up ${tab === 'edit' ? 'with-add' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        title="Back to top"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 19V5M12 5 6 11M12 5l6 6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addQuestion} />

      {quizSettingsOpen ? (
        <QuizSettingsModal
          settings={settings}
          onChange={patchSettings}
          onClose={() => setQuizSettingsOpen(false)}
        />
      ) : null}

      {assignOpen ? (
        <div className="f-overlay" onClick={() => setAssignOpen(false)} role="presentation">
          <div
            className="f-modal f-modal-wide"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="f-modal-head">
              <strong>Assign settings</strong>
              <button type="button" className="f-icon-btn" onClick={() => setAssignOpen(false)}>
                ✕
              </button>
            </div>
            <div className="f-assign-body">
              <section className="f-assign-section">
                <h4>Share link</h4>
                <p className="f-muted" style={{ marginTop: 0 }}>
                  Guests open this link, enter Discord + In-Game Name, and submit. Join code:{' '}
                  <strong>{quiz.join_code}</strong>
                  {' '}Assigning this quiz unassigns your other quizzes. Same Discord cannot submit
                  twice unless Total attempts is Unlimited.
                </p>
                <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="f-primary-btn"
                    onClick={() => navigator.clipboard?.writeText(link)}
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="f-outline-btn"
                    onClick={() => window.open(link, '_blank')}
                  >
                    Open take page
                  </button>
                </div>
                {quiz.is_assigned ? (
                  <p style={{ color: '#4ade80', fontSize: 13, marginTop: 12 }}>Assigned — link is live.</p>
                ) : (
                  <p className="f-muted" style={{ fontSize: 12, marginTop: 12 }}>
                    Click Assign in the top bar to publish if still a draft.
                  </p>
                )}
              </section>

              <section className="f-assign-section">
                <h4>Grading and feedback</h4>
                <label className="f-assign-row">
                  <span>
                    Total attempts
                    <small>How many times the same Discord name can submit</small>
                  </span>
                  <select
                    value={settings.allow_retake ? 'unlimited' : '1'}
                    onChange={(e) =>
                      patchSettings({ allow_retake: e.target.value === 'unlimited' })
                    }
                  >
                    <option value="1">1</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </label>
                <label className="f-assign-row">
                  <span>
                    After submission
                    <small>What players see after they submit</small>
                  </span>
                  <select
                    value={settings.after_submission || 'hidden'}
                    onChange={(e) => patchSettings({ after_submission: e.target.value })}
                  >
                    <option value="hidden">Thank-you only</option>
                    <option value="visible">Keep take page message</option>
                  </select>
                </label>
                <label className="f-assign-row">
                  <span>
                    Return scores
                    <small>
                      Quiz-wide. Per question: open the question → Settings → Don&apos;t show score
                    </small>
                  </span>
                  <select
                    value={settings.show_scores ? 'show' : 'hide'}
                    onChange={(e) => patchSettings({ show_scores: e.target.value === 'show' })}
                  >
                    <option value="hide">Don&apos;t show scores</option>
                    <option value="show">Show scores</option>
                  </select>
                </label>
                <label className="f-assign-row">
                  <span>
                    Time limit (minutes)
                    <small>0 = no timer. Starts when they click Start.</small>
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={Math.round(Number(settings.time_limit_seconds || 0) / 60) || 0}
                    onChange={(e) =>
                      patchSettings({
                        time_limit_seconds: Math.max(0, Number(e.target.value) || 0) * 60,
                      })
                    }
                  />
                </label>
                <label className="f-assign-row">
                  <span>
                    Opens
                    <small>Empty = already open. Times use this computer&apos;s timezone.</small>
                  </span>
                  <input
                    type="datetime-local"
                    value={toLocalInput(settings.opens_at)}
                    onChange={(e) => patchSettings({ opens_at: fromLocalInput(e.target.value) })}
                  />
                </label>
                <label className="f-assign-row">
                  <span>
                    Closes
                    <small>Empty = no end.</small>
                  </span>
                  <input
                    type="datetime-local"
                    value={toLocalInput(settings.closes_at)}
                    onChange={(e) => patchSettings({ closes_at: fromLocalInput(e.target.value) })}
                  />
                </label>
                <label className="f-assign-row">
                  <span>
                    Return correct answers
                    <small>Players never receive answer keys on the take page</small>
                  </span>
                  <select
                    value={settings.show_answers ? 'show' : 'hide'}
                    onChange={(e) => patchSettings({ show_answers: e.target.value === 'show' })}
                    disabled
                    title="Answer keys stay host-only"
                  >
                    <option value="hide">Don&apos;t show answers</option>
                  </select>
                </label>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
