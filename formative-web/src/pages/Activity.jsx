import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AddItemModal from '../components/AddItemModal';
import EditQuestionSearch from '../components/EditQuestionSearch';
import InstructionsEditor from '../components/InstructionsEditor';
import QuestionCard from '../components/QuestionCard';
import InsightsPanel from '../components/InsightsPanel';
import ResponsesGrid from '../components/ResponsesGrid';
import ResponsesStudentSearch from '../components/ResponsesStudentSearch';
import StudentResponsePanel from '../components/StudentResponsePanel';
import LiveSessionPanel from '../components/LiveSessionPanel';
import QuestionReviewPanel from '../components/QuestionReviewPanel';
import SortStudentsMenu from '../components/SortStudentsMenu';
import { hostApi, takeUrl, activityHref, previewUrl } from '../lib/api';
import { downloadResponsesCsvFromServer } from '../lib/exportResponses';
import {
  ASSETS_BRANCH_BANNER_EXAMPLE,
  parseBannerLink,
  readImageAsDataUrl,
} from '../lib/imageUpload';
import { resolveBannerUrl } from '../lib/mediaUrl';
import { mergeQuizSettings, mergeDraftQuizSettings, stripAssignSettings, quizWindowState } from '../lib/quizSettings';
import { quizThemeProps } from '../lib/quizThemes';
import { randomizeQuestion } from '../lib/triviaRemix';
import { applyPromptTextStyle, htmlToPlainText } from '../lib/richText';
import { withGeneratedHints } from '../lib/triviaHints';
import { presenceStatus } from '../lib/triviaPresence';
import { scoredInsightQuestions } from '../lib/triviaInsights';
import { hasResponseAnswers } from '../lib/formatResponseAnswer';
import { clearResponsePanelAnchor, setResponsePanelAnchor } from '../lib/responsePanelAnchor';
import QuizSettingsModal from '../components/QuizSettingsModal';
import {
  clearEditorDraft,
  loadEditorDraft,
  saveEditorDraft,
  shouldPreferServerOverDraft,
} from '../lib/editorDraftStorage';
import { localTimeZoneLabel } from '../lib/formatWhen';
import { searchQuestions } from '../lib/questionSearch';
import { responseMatchesQuery } from '../lib/responseSearch';

/** How long a deleted question stays recoverable from the Undo banner. */
const UNDO_WINDOW_MS = 25000;
const UNDO_STACK_LIMIT = 3;

const isGateQuestion = (q) => Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);

/** Insert payload shared by Undo-restore and Duplicate — keeps every version in meta. */
function questionInsertPatch(snapshot, sortOrder) {
  return {
    sort_order: sortOrder,
    type: snapshot.type,
    prompt: snapshot.prompt ?? '',
    points: snapshot.points ?? 1,
    required: Boolean(snapshot.required),
    options: snapshot.options ?? [],
    correct: snapshot.correct ?? {},
    image_url: snapshot.image_url ?? null,
    meta: snapshot.meta ?? {},
  };
}

function questionLabel(q, max = 52) {
  const text = htmlToPlainText(q?.prompt || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

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

function DeferredNumberInput({ value, onCommit, min = 0, step = 1, ...props }) {
  const [draft, setDraft] = useState(null);
  const display = draft !== null ? draft : String(value ?? '');

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={display}
      onFocus={() => setDraft(String(value ?? ''))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const raw = draft ?? String(value ?? '');
        setDraft(null);
        const n = Math.max(min, Number(raw) || 0);
        if (n !== value) onCommit(n);
      }}
      {...props}
    />
  );
}

function DeferredDatetimeInput({ isoValue, onCommit }) {
  const [draft, setDraft] = useState(null);
  const display = draft !== null ? draft : toLocalInput(isoValue);

  return (
    <input
      type="datetime-local"
      value={display}
      onFocus={() => setDraft(toLocalInput(isoValue))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const raw = draft ?? toLocalInput(isoValue);
        setDraft(null);
        const iso = fromLocalInput(raw);
        if (iso !== (isoValue || '')) onCommit(iso);
      }}
    />
  );
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
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [responseSort, setResponseSort] = useState('submitted_desc');
  const [responseSearch, setResponseSearch] = useState('');
  const [scrollToResponse, setScrollToResponse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoSaveHint, setAutoSaveHint] = useState('');
  const [quizDirty, setQuizDirty] = useState(false);
  const [bannerDirty, setBannerDirty] = useState(false);
  const [bannerLinkOpen, setBannerLinkOpen] = useState(false);
  const [bannerLinkDraft, setBannerLinkDraft] = useState('');
  const [bannerLinkError, setBannerLinkError] = useState('');
  const [dirtyIds, setDirtyIds] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleEditAt, setTitleEditAt] = useState(null); // 'top' | 'cover'
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [insightsPreviewId, setInsightsPreviewId] = useState(null);
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editSearchDebounced, setEditSearchDebounced] = useState('');
  const [searchFocus, setSearchFocus] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [, bumpUndoTick] = useState(0);
  const [reordering, setReordering] = useState(false);
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
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
  const selectedSessionRef = useRef(null);
  const responsesWatermarkRef = useRef('');
  selectedSessionRef.current = selectedSession;

  const fetchResponses = useCallback(
    async ({ includeAnswers = false, since } = {}) => {
      const params = new URLSearchParams({
        action: 'responses',
        quizId: String(quizId),
      });
      if (includeAnswers) params.set('includeAnswers', '1');
      if (since) params.set('since', since);
      const r = await hostApi(`/api/trivia/host?${params.toString()}`);
      if (r.watermark) responsesWatermarkRef.current = r.watermark;
      return r;
    },
    [quizId]
  );

  const applyResponsesPayload = useCallback((r) => {
    if (r.unchanged) return;
    setResponses((prev) => {
      const next = r.responses || [];
      return next.map((row) => {
        const old = prev.find((p) => p.id === row.id);
        if (!old || hasResponseAnswers(row.answers)) return row;
        if (hasResponseAnswers(old.answers)) return { ...row, answers: old.answers };
        return row;
      });
    });
    setSessions((prev) => {
      const next = r.sessions || [];
      const open = selectedSessionRef.current;
      if (!open?.draft_answers) return next;
      return next.map((s) =>
        s.id === open.id ? { ...s, draft_answers: open.draft_answers, variant_map: open.variant_map } : s
      );
    });
    setSessionsError(r.sessionsError || '');
  }, []);

  const openStudentResponse = useCallback(async (r, meta) => {
    setSelectedSession(null);
    setSelectedQuestionId(null);
    if (meta?.clientY != null) setResponsePanelAnchor(meta.clientY);
    setSelectedResponse(r);
    setScrollToResponse({ id: r.id, token: Date.now() });
    if (hasResponseAnswers(r?.answers)) return;
    try {
      const data = await hostApi(`/api/trivia/host?action=response&id=${encodeURIComponent(r.id)}`);
      if (data.response) {
        setResponses((prev) => prev.map((row) => (row.id === data.response.id ? data.response : row)));
        setSelectedResponse(data.response);
      }
    } catch {
      /* lite row still opens; grading may need refresh */
    }
  }, []);

  useEffect(() => {
    if (!selectedResponse && !selectedSession && !selectedQuestionId) {
      clearResponsePanelAnchor();
    }
  }, [selectedResponse, selectedSession, selectedQuestionId]);

  useEffect(() => {
    if (!selectedResponse?.id) return;
    if (typeof window === 'undefined' || window.innerWidth > 900) return;
    requestAnimationFrame(() => {
      document.querySelector('.f-student-panel')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [selectedResponse?.id]);

  const setTab = (t) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next);
    if (t !== 'responses') setSelectedResponse(null);
    if (t !== 'insights') setInsightsPreviewId(null);
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
      const preferServer = shouldPreferServerOverDraft(draft, data.quiz, data.questions);
      if (draft?.questions?.length && !preferServer) {
        // Local draft is newer than server — recover unsaved edits
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
            settings: mergeDraftQuizSettings(data.quiz?.settings, draft.quiz?.settings),
          });
          setQuizDirty(true);
        }
        setBannerDirty(Boolean(draft.bannerDirty));
      } else {
        // Server newer/equal (or no draft) — drop stale device drafts
        if (draft?.questions?.length) clearEditorDraft(quizId);
        setQuestions(data.questions || []);
        setQuizDirty(false);
        setBannerDirty(false);
        setDirtyIds([]);
      }
      instructionsLiveRef.current = data.quiz?.settings?.instructions ?? '';
      if (tab === 'responses' || tab === 'insights') {
        const r = await fetchResponses();
        applyResponsesPayload(r);
      }
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [quizId, tab, fetchResponses, applyResponsesPayload]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedQuestionId || tab !== 'responses') return undefined;
    let alive = true;
    (async () => {
      try {
        const r = await fetchResponses({ includeAnswers: true });
        if (!alive) return;
        applyResponsesPayload(r);
      } catch {
        /* review panel still shows scores */
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedQuestionId, tab, fetchResponses, applyResponsesPayload]);

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
        const r = await fetchResponses({ since: responsesWatermarkRef.current });
        applyResponsesPayload(r);
      } catch {
        /* ignore poll errors */
      }
    }, 20000);
    return () => clearInterval(id);
  }, [tab, fetchResponses, applyResponsesPayload]);

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
    const q = quizRef.current;
    if (!q) return false;
    if (saveLockRef.current) return 'busy';
    const changed = questions.filter((item) => dirtyIds.includes(item.id));
    const instructionsNow = instructionsLiveRef.current;
    const instructionsDirty = instructionsNow !== (q.settings?.instructions ?? '');
    if (!quizDirty && !bannerDirty && !instructionsDirty && !changed.length) return true;
    saveLockRef.current = true;
    setSaving(true);
    setError('');
    try {
      if (quizDirty || bannerDirty || instructionsDirty) {
        const patch = {
          title: q.title,
          settings: stripAssignSettings({
            ...mergeQuizSettings(q.settings),
            instructions: instructionsNow,
          }),
        };
        if (bannerDirty) patch.banner_url = q.banner_url;
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
      const styleFrom = questions[questions.length - 1]?.prompt || '';
      const merged = mergeQuizSettings(quiz?.settings);
      const auto = merged.auto_random_questions;
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
      if (styleFrom && nextQ?.prompt) {
        nextQ = { ...nextQ, prompt: applyPromptTextStyle(styleFrom, nextQ.prompt) };
      }
      if (merged.auto_hints) {
        nextQ = withGeneratedHints(nextQ, { enable: true });
      }
      setQuestions((prev) => [...prev, nextQ]);
      if ((auto || merged.auto_hints) && nextQ?.id) {
        setDirtyIds((ids) => (ids.includes(nextQ.id) ? ids : [...ids, nextQ.id]));
      }
      setAddOpen(false);
    } catch (e) {
      setError(e.message);
    }
  };

  const persistOrder = useCallback(
    async (list) => {
      const orders = (list || [])
        .map((q, i) => ({ id: q.id, sort_order: i }))
        .filter((row) => row.id);
      if (!orders.length) return;
      await hostApi('/api/trivia/host', {
        method: 'PUT',
        body: { action: 'reorder', quizId, orders },
      });
    },
    [quizId]
  );

  /** Bring a just-added/just-restored card into view and flash it so the host sees where it landed. */
  const focusQuestionCard = useCallback((id) => {
    if (!id) return;
    setActiveQuestionId(id);
    setPendingScrollId(id);
    setHighlightId(id);
  }, []);

  useEffect(() => {
    if (!pendingScrollId) return undefined;
    const el = document.getElementById(`host-q-${pendingScrollId}`);
    if (!el) return undefined;
    jumpLockUntil.current = Date.now() + 900;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingScrollId(null);
    return undefined;
  }, [pendingScrollId, questions, tab]);

  useEffect(() => {
    if (!highlightId) return undefined;
    const t = setTimeout(() => setHighlightId(null), 2400);
    return () => clearTimeout(t);
  }, [highlightId]);

  useEffect(() => {
    if (!undoStack.length) return undefined;
    const id = setInterval(() => {
      setUndoStack((prev) => prev.filter((entry) => entry.expiresAt > Date.now()));
      bumpUndoTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [undoStack.length]);

  const deleteQuestion = async (id) => {
    const index = questions.findIndex((q) => q.id === id);
    if (index < 0) return;
    const snapshot = questions[index];
    if (isGateQuestion(snapshot)) return;
    const label = questionLabel(snapshot);
    const seconds = Math.round(UNDO_WINDOW_MS / 1000);
    const ok = window.confirm(
      `Delete question ${index + 1}${label ? ` — “${label}”` : ''}?\n\n` +
        `You can undo for ${seconds} seconds. Answers students already submitted for it stay ` +
        `in Responses but no longer match a question.`
    );
    if (!ok) return;
    try {
      await hostApi(`/api/trivia/host?action=question&id=${id}`, { method: 'DELETE' });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setDirtyIds((ids) => ids.filter((x) => x !== id));
      setUndoStack((prev) =>
        [
          {
            token: `${id}-${Date.now()}`,
            question: snapshot,
            index,
            label,
            expiresAt: Date.now() + UNDO_WINDOW_MS,
          },
          ...prev,
        ].slice(0, UNDO_STACK_LIMIT)
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const dismissUndo = (token) => setUndoStack((prev) => prev.filter((e) => e.token !== token));

  const undoDeleteQuestion = async (token) => {
    const entry = undoStack.find((e) => e.token === token);
    if (!entry) return;
    dismissUndo(token);
    const snapshot = entry.question;
    setSaving(true);
    setError('');
    try {
      const data = await hostApi('/api/trivia/host', {
        method: 'POST',
        body: {
          action: 'add_question',
          quizId,
          type: snapshot.type,
          patch: questionInsertPatch(snapshot, entry.index),
        },
      });
      const restored = data.question;
      if (!restored?.id) throw new Error('Restore did not return a question');
      const next = [...questions];
      next.splice(Math.min(entry.index, next.length), 0, restored);
      setQuestions(next.map((q, i) => (q.sort_order === i ? q : { ...q, sort_order: i })));
      focusQuestionCard(restored.id);
      await persistOrder(next);
    } catch (e) {
      setError(e.message || 'Could not restore the question');
      // Put the snapshot back so the host can retry instead of losing it.
      setUndoStack((prev) =>
        [{ ...entry, expiresAt: Date.now() + UNDO_WINDOW_MS }, ...prev].slice(0, UNDO_STACK_LIMIT)
      );
    } finally {
      setSaving(false);
    }
  };

  const duplicateQuestion = async (id) => {
    if (reordering || saving) return;
    const index = questions.findIndex((q) => q.id === id);
    if (index < 0) return;
    const source = questions[index];
    if (isGateQuestion(source)) return;
    setSaving(true);
    setError('');
    try {
      const data = await hostApi('/api/trivia/host', {
        method: 'POST',
        body: {
          action: 'add_question',
          quizId,
          type: source.type,
          patch: questionInsertPatch(source, index + 1),
        },
      });
      const copy = data.question;
      if (!copy?.id) throw new Error('Duplicate did not return a question');
      const next = [...questions];
      next.splice(index + 1, 0, copy);
      const reindexed = next.map((q, i) => (q.sort_order === i ? q : { ...q, sort_order: i }));
      setQuestions(reindexed);
      focusQuestionCard(copy.id);
      await persistOrder(reindexed);
    } catch (e) {
      setError(e.message || 'Could not duplicate the question');
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = async (id, direction) => {
    if (reordering) return;
    const from = questions.findIndex((q) => q.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= questions.length) return;
    // Identity gates stay pinned to the top of the quiz.
    if (isGateQuestion(questions[from]) || isGateQuestion(questions[to])) return;
    const previous = questions;
    const next = [...questions];
    [next[from], next[to]] = [next[to], next[from]];
    const reindexed = next.map((q, i) => (q.sort_order === i ? q : { ...q, sort_order: i }));
    setQuestions(reindexed);
    setActiveQuestionId(id);
    setReordering(true);
    try {
      await persistOrder(reindexed);
    } catch (e) {
      setQuestions(previous);
      setError(e.message || 'Could not reorder questions');
    } finally {
      setReordering(false);
    }
  };

  const assign = async () => {
    if (dirty) {
      const ok = await saveAll();
      if (!ok) return;
    }
    const q = quizRef.current;
    await saveQuizPatch({
      is_assigned: true,
      settings: mergeQuizSettings(q?.settings),
    });
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

  const jumpToHostQuestion = (id, variantIndex = null) => {
    jumpLockUntil.current = Date.now() + 700;
    setActiveQuestionId(id);
    if (variantIndex != null && Number.isFinite(Number(variantIndex))) {
      setSearchFocus({ id, variantIndex: Number(variantIndex), token: Date.now() });
    }
    setTimeout(() => {
      document.getElementById(`host-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 10);
  };

  useEffect(() => {
    const t = setTimeout(() => setEditSearchDebounced(editSearchQuery), 175);
    return () => clearTimeout(t);
  }, [editSearchQuery]);

  const editSearchActive = editSearchDebounced.trim().length > 0;
  const editSearchResult = useMemo(
    () => searchQuestions(questions, editSearchDebounced),
    [questions, editSearchDebounced]
  );
  const visibleEditQuestions = useMemo(() => {
    if (!editSearchActive) return questions;
    return questions.filter((q) => editSearchResult.matchedIds.has(String(q.id)));
  }, [questions, editSearchActive, editSearchResult.matchedIds]);

  const updateActiveFromScroll = useCallback(() => {
    if (Date.now() < jumpLockUntil.current) return;
    if (!questions.length) return;
    const marker = 140;
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
  const assignWindow = quizWindowState(settings);

  const patchSettings = (partial) => {
    let nextSettings = null;
    setQuiz((prev) => {
      if (!prev) return prev;
      nextSettings = {
        ...mergeQuizSettings(prev.settings),
        ...partial,
        instructions: instructionsLiveRef.current,
      };
      return { ...prev, settings: nextSettings };
    });
    if (nextSettings) saveQuizPatch({ settings: nextSettings });
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
            title="Preview all questions and answers"
            onClick={() => window.open(previewUrl(quiz), '_blank')}
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
      {quiz?.is_assigned && assignWindow.status === 'closed' ? (
        <div className="f-banner-warn" role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            Quiz window closed
            {assignWindow.closesAt
              ? ` at ${new Date(assignWindow.closesAt).toLocaleString()} (${localTimeZoneLabel()})`
              : ''}
            . Open Assign and extend or clear the close time so take links work again.
          </div>
          {assignWindow.closesAt ? (
            <button
              type="button"
              className="f-outline-btn"
              style={{ flexShrink: 0, background: 'rgba(255,255,255,0.1)' }}
              onClick={() => {
                const next = new Date(new Date(assignWindow.closesAt).getTime() + 24 * 3600 * 1000);
                patchSettings({ closes_at: next.toISOString() });
              }}
            >
              Extend 24h
            </button>
          ) : null}
        </div>
      ) : null}
      {quiz?.is_assigned && assignWindow.status === 'open' && assignWindow.closesAt ? (
        <div className="f-banner-info" role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            Closes {new Date(assignWindow.closesAt).toLocaleString()} ({localTimeZoneLabel()}). After that,
            students cannot submit until you extend the window.
          </div>
          <button
            type="button"
            className="f-outline-btn"
            style={{ flexShrink: 0, background: 'rgba(255,255,255,0.1)' }}
            onClick={() => {
              const next = new Date(new Date(assignWindow.closesAt).getTime() + 24 * 3600 * 1000);
              patchSettings({ closes_at: next.toISOString() });
            }}
          >
            Extend 24h
          </button>
        </div>
      ) : null}
      {undoStack.length ? (
        <div className="f-banner-undo" role="status" aria-live="polite">
          {undoStack.map((entry) => {
            const left = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
            return (
              <div className="f-undo-row" key={entry.token}>
                <span className="f-undo-text">
                  Deleted question {entry.index + 1}
                  {entry.label ? ` — “${entry.label}”` : ''}
                </span>
                <span className="f-undo-timer">{left}s</span>
                <button
                  type="button"
                  className="f-undo-btn"
                  onClick={() => undoDeleteQuestion(entry.token)}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className="f-icon-btn f-undo-dismiss"
                  title="Dismiss"
                  aria-label="Dismiss undo"
                  onClick={() => dismissUndo(entry.token)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'edit' && (
        <>
          <EditQuestionSearch
            questions={questions}
            query={editSearchQuery}
            onQueryChange={(next) => {
              setEditSearchQuery(next);
              if (!next.trim()) setSearchFocus(null);
            }}
            onJump={jumpToHostQuestion}
            totalCount={questions.length}
          />
          <div className="f-edit-layout">
          {visibleEditQuestions.length ? (
            <nav className="f-q-index" aria-label="Jump to question" ref={indexNavRef}>
              {visibleEditQuestions.map((q) => {
                const idx = questions.findIndex((item) => item.id === q.id);
                return (
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
                );
              })}
            </nav>
          ) : null}
          <div className="f-edit-scroll">
          <header className={`f-cover f-cover-edit ${quiz.banner_url ? 'has-art' : ''}`}>
            {quiz.banner_url ? (
              <img className="f-cover-img" src={resolveBannerUrl(quiz.banner_url)} alt="" />
            ) : null}
            <div className="f-cover-scrim" />
            <div className="f-banner-tools">
              <button
                type="button"
                className={`f-tool-btn ${bannerLinkOpen ? 'active' : ''}`}
                title="Use image link (recommended for assign)"
                aria-expanded={bannerLinkOpen}
                onClick={() => {
                  setBannerLinkOpen((open) => !open);
                  setBannerLinkError('');
                  if (!bannerLinkDraft) {
                    setBannerLinkDraft(
                      String(quiz.banner_url || '').startsWith('data:')
                        ? ASSETS_BRANCH_BANNER_EXAMPLE
                        : quiz.banner_url || ASSETS_BRANCH_BANNER_EXAMPLE
                    );
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M6.5 9.5a3 3 0 0 0 4.24 0l1.76-1.76a3 3 0 0 0-4.24-4.24L7.5 4.26"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.5 6.5a3 3 0 0 0-4.24 0L3.5 8.26a3 3 0 0 0 4.24 4.24L8.5 11.74"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Link
              </button>
              <label className="f-tool-btn" title="Upload embeds the file (blocked on assign)">
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
                      setBannerLinkOpen(false);
                      setError(
                        'Banner upload embeds the image. Use Link with a GitHub/assets URL before Assign.'
                      );
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
                    setBannerLinkDraft('');
                    setBannerLinkError('');
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            {bannerLinkOpen ? (
              <div className="f-banner-link-panel" role="region" aria-label="Banner image link">
                <label className="f-banner-link-label" htmlFor="banner-link-input">
                  Image link (GitHub file page or raw URL)
                </label>
                <div className="f-banner-link-row">
                  <input
                    id="banner-link-input"
                    className="f-banner-link-input"
                    type="url"
                    value={bannerLinkDraft}
                    placeholder={ASSETS_BRANCH_BANNER_EXAMPLE}
                    onChange={(e) => {
                      setBannerLinkDraft(e.target.value);
                      setBannerLinkError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setBannerLinkOpen(false);
                        return;
                      }
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const parsed = parseBannerLink(bannerLinkDraft);
                      if (!parsed.ok) {
                        setBannerLinkError(parsed.error);
                        return;
                      }
                      setQuiz({ ...quiz, banner_url: parsed.url });
                      setQuizDirty(true);
                      setBannerDirty(true);
                      setBannerLinkDraft(parsed.url);
                      setBannerLinkError('');
                      setError('');
                      setBannerLinkOpen(false);
                    }}
                  />
                  <button
                    type="button"
                    className="f-tool-btn"
                    onClick={() => {
                      const parsed = parseBannerLink(bannerLinkDraft);
                      if (!parsed.ok) {
                        setBannerLinkError(parsed.error);
                        return;
                      }
                      setQuiz({ ...quiz, banner_url: parsed.url });
                      setQuizDirty(true);
                      setBannerDirty(true);
                      setBannerLinkDraft(parsed.url);
                      setBannerLinkError('');
                      setError('');
                      setBannerLinkOpen(false);
                    }}
                  >
                    Apply
                  </button>
                </div>
                <button
                  type="button"
                  className="f-banner-link-preset"
                  onClick={() => {
                    const parsed = parseBannerLink(ASSETS_BRANCH_BANNER_EXAMPLE);
                    if (!parsed.ok) {
                      setBannerLinkError(parsed.error);
                      return;
                    }
                    setBannerLinkDraft(parsed.url);
                    setQuiz({ ...quiz, banner_url: parsed.url });
                    setQuizDirty(true);
                    setBannerDirty(true);
                    setBannerLinkError('');
                    setError('');
                    setBannerLinkOpen(false);
                  }}
                >
                  Use assets/IMG_3538.jpeg
                </button>
                {bannerLinkError ? (
                  <p className="f-banner-link-error" role="alert">
                    {bannerLinkError}
                  </p>
                ) : (
                  <p className="f-banner-link-hint">
                    Blob page links are converted to raw.githubusercontent.com so the take page can
                    load the image. Prefer Link over Upload before Assign.
                  </p>
                )}
              </div>
            ) : null}
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

          {editSearchActive && !visibleEditQuestions.length ? (
            <p className="f-edit-search-list-empty" role="status">
              No questions match &ldquo;{editSearchDebounced.trim()}&rdquo;
            </p>
          ) : null}

          {visibleEditQuestions.map((q) => {
            const idx = questions.findIndex((item) => item.id === q.id);
            const focusVariantIndex =
              searchFocus?.id === q.id ? searchFocus.variantIndex : undefined;
            // Filtered list hides neighbours, so reordering is only offered on the full list.
            const canReorder = !editSearchActive && !isGateQuestion(q);
            return (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              autoHints={Boolean(mergeQuizSettings(quiz?.settings).auto_hints)}
              quizPartialCreditMs={Boolean(settings.partial_credit_multiple_selection)}
              onChange={saveQuestion}
              onDelete={() => deleteQuestion(q.id)}
              onDuplicate={isGateQuestion(q) ? undefined : () => duplicateQuestion(q.id)}
              highlight={highlightId === q.id}
              onMove={canReorder ? (dir) => moveQuestion(q.id, dir) : undefined}
              canMoveUp={
                canReorder && idx > 0 && !isGateQuestion(questions[idx - 1]) && !reordering
              }
              canMoveDown={
                canReorder &&
                idx < questions.length - 1 &&
                !isGateQuestion(questions[idx + 1]) &&
                !reordering
              }
              focusVariantIndex={focusVariantIndex}
              focusVariantToken={searchFocus?.id === q.id ? searchFocus.token : undefined}
            />
            );
          })}

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
        </>
      )}

      {tab === 'responses' && (
        <div
          className={`f-responses ${
            selectedResponse || selectedSession || selectedQuestionId ? 'has-panel' : ''
          }`}
        >
          <div className="f-responses-main">
            <div className="f-responses-tools">
              <ResponsesStudentSearch
                responses={responses}
                query={responseSearch}
                onQueryChange={setResponseSearch}
                totalCount={responses?.length || 0}
                filteredCount={
                  responseSearch.trim()
                    ? (responses || []).filter((r) => responseMatchesQuery(r, responseSearch)).length
                    : responses?.length || 0
                }
                onPick={(r) => openStudentResponse(r)}
              />
              <div className="f-responses-tools-actions">
              <SortStudentsMenu value={responseSort} onChange={setResponseSort} />
              <button type="button" className="f-outline-btn" disabled>
                Grading method
              </button>
              <button
                type="button"
                className="f-outline-btn"
                disabled={!responses?.length}
                title="Download Excel-friendly CSV of all submissions"
                onClick={async () => {
                  try {
                    await downloadResponsesCsvFromServer(quizId);
                  } catch (e) {
                    setError(e.message || 'Export failed');
                  }
                }}
              >
                Export Excel/CSV
              </button>
              <button type="button" className="f-outline-btn" onClick={load}>
                Refresh
              </button>
              </div>
            </div>
            <ResponsesGrid
              questions={questions}
              responses={responses}
              sessions={sessions}
              sessionsError={sessionsError}
              sortBy={responseSort}
              searchQuery={responseSearch}
              scrollToResponse={scrollToResponse}
              selectedId={selectedResponse?.id}
              selectedLiveId={selectedSession?.id}
              selectedQuestionId={selectedQuestionId}
              onSelect={openStudentResponse}
              onQuestionSelect={(q) => {
                setSelectedSession(null);
                setSelectedResponse(null);
                setSelectedQuestionId(q.id);
              }}
              onLiveSelect={async (s) => {
                setSelectedResponse(null);
                setSelectedQuestionId(null);
                setSelectedSession(s);
                try {
                  const r = await hostApi(
                    `/api/trivia/host?action=session&quizId=${encodeURIComponent(quizId)}&sessionId=${encodeURIComponent(s.id)}`
                  );
                  if (r.session) {
                    setSelectedSession(r.session);
                    setSessions((prev) =>
                      prev.map((row) => (row.id === r.session.id ? { ...row, ...r.session } : row))
                    );
                  }
                } catch {
                  /* list row still shows status without drafts */
                }
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
          {selectedQuestionId && !selectedResponse && !selectedSession ? (
            <QuestionReviewPanel
              question={(questions || []).find((q) => q.id === selectedQuestionId)}
              questionIndex={scoredInsightQuestions(questions).findIndex(
                (q) => q.id === selectedQuestionId
              )}
              scoredQuestions={scoredInsightQuestions(questions)}
              responses={responses}
              onClose={() => setSelectedQuestionId(null)}
              onSelectQuestion={(q) => setSelectedQuestionId(q.id)}
              onSelectStudent={openStudentResponse}
            />
          ) : null}
          {selectedResponse ? (
            <StudentResponsePanel
              response={
                (() => {
                  const fromList = responses.find((r) => r.id === selectedResponse.id);
                  if (!fromList) return selectedResponse;
                  if (
                    hasResponseAnswers(selectedResponse.answers) &&
                    !hasResponseAnswers(fromList.answers)
                  ) {
                    return selectedResponse;
                  }
                  return fromList;
                })()
              }
              responses={responses}
              questions={questions}
              quiz={quiz}
              onClose={() => {
                setSelectedResponse(null);
                clearResponsePanelAnchor();
              }}
              onSelect={setSelectedResponse}
              onViewActivity={() => {
                setSelectedResponse(null);
                setTab('edit');
              }}
              onJumpToInsights={(qId) => {
                setInsightsPreviewId(qId);
                setTab('insights');
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
        <InsightsPanel
          questions={questions}
          responses={responses}
          timeLimitSeconds={settings.time_limit_seconds}
          initialPreviewId={insightsPreviewId}
          onJumpToEditor={(id, variantIndex) => {
            setTab('edit');
            jumpToHostQuestion(id, variantIndex);
          }}
        />
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
                  <DeferredNumberInput
                    min={0}
                    step={1}
                    value={Math.round(Number(settings.time_limit_seconds || 0) / 60) || 0}
                    onCommit={(minutes) =>
                      patchSettings({ time_limit_seconds: Math.max(0, minutes) * 60 })
                    }
                  />
                </label>
                <label className="f-assign-row">
                  <span>
                    Opens
                    <small>
                      Empty = already open. You&apos;re setting times in{' '}
                      {localTimeZoneLabel()}. Students see unlock times in their own timezone.
                    </small>
                  </span>
                  <DeferredDatetimeInput
                    isoValue={settings.opens_at}
                    onCommit={(iso) => patchSettings({ opens_at: iso })}
                  />
                </label>
                <label className="f-assign-row">
                  <span>
                    Closes
                    <small>Empty = no end.</small>
                  </span>
                  <DeferredDatetimeInput
                    isoValue={settings.closes_at}
                    onCommit={(iso) => patchSettings({ closes_at: iso })}
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
