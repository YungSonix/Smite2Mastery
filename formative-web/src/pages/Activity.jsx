import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AddItemModal from '../components/AddItemModal';
import QuestionCard from '../components/QuestionCard';
import ResponsesGrid from '../components/ResponsesGrid';
import StudentResponsePanel from '../components/StudentResponsePanel';
import { hostApi, takeUrl } from '../lib/api';
import { downloadResponsesCsv } from '../lib/exportResponses';
import { readImageAsDataUrl } from '../lib/imageUpload';
import { mergeQuizSettings } from '../lib/quizSettings';

const MORE_ITEMS = [
  { id: 'join', label: 'Join instructions', wire: true },
  { id: 'share', label: 'Share link', wire: true },
  { id: 'duplicate', label: 'Duplicate quiz', wire: true },
];

export default function Activity() {
  const { quizId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'edit';
  const nav = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleEditAt, setTitleEditAt] = useState(null); // 'top' | 'cover'

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
      const data = await hostApi(`/api/trivia/host?action=quiz&quizId=${quizId}`);
      setQuiz(data.quiz);
      setQuestions(data.questions || []);
      if (tab === 'responses' || tab === 'insights') {
        const r = await hostApi(`/api/trivia/host?action=responses&quizId=${quizId}`);
        setResponses(r.responses || []);
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
    if (tab !== 'responses' && tab !== 'insights') return undefined;
    const id = setInterval(async () => {
      try {
        const r = await hostApi(`/api/trivia/host?action=responses&quizId=${quizId}`);
        setResponses(r.responses || []);
      } catch {
        /* ignore poll errors */
      }
    }, 8000);
    return () => clearInterval(id);
  }, [tab, quizId]);

  const points = useMemo(
    () =>
      questions.reduce((sum, q) => {
        if (
          ['image', 'content', 'audio', 'video', 'embed', 'file_response', 'audio_response', 'drawing'].includes(
            q.type
          ) ||
          q.meta?.is_discord_gate ||
          q.meta?.is_ingame_gate
        ) {
          return sum;
        }
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

  const saveQuestion = async (q) => {
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? q : x)));
    try {
      await hostApi('/api/trivia/host', {
        method: 'PUT',
        body: {
          action: 'update_question',
          questionId: q.id,
          patch: {
            prompt: q.prompt,
            points: q.points,
            required: q.required,
            options: q.options,
            correct: q.correct,
            image_url: q.image_url,
            type: q.type,
            meta: q.meta,
          },
        },
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const addQuestion = async (type, patch) => {
    try {
      const data = await hostApi('/api/trivia/host', {
        method: 'POST',
        body: { action: 'add_question', quizId, type, patch },
      });
      setQuestions((prev) => [...prev, data.question]);
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
    await saveQuizPatch({ is_assigned: true });
    setAssignOpen(true);
  };

  const onMore = async (id) => {
    setMoreOpen(false);
    if (id === 'share' || id === 'join') {
      setAssignOpen(true);
      return;
    }
    if (id === 'duplicate') {
      try {
        const data = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: { action: 'duplicate', quizId },
        });
        nav(`/activity/${data.quiz.id}`);
      } catch (e) {
        setError(e.message);
      }
    }
  };

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
    const next = { ...mergeQuizSettings(quiz.settings), ...partial };
    setQuiz({ ...quiz, settings: next });
    saveQuizPatch({ settings: next });
  };

  const link = quiz ? takeUrl(quiz.slug) : '';

  return (
    <div className="f-activity-shell">
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
                  disabled={!item.wire}
                  onClick={() => onMore(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
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
        <div className="f-points">
          {points} points {saving ? '· Saving…' : ''}
        </div>
      </div>

      {error ? (
        <div className="f-error" style={{ padding: '8px 16px' }}>
          {error}
        </div>
      ) : null}

      {tab === 'edit' && (
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
                      await saveQuizPatch({ banner_url: dataUrl });
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
                    saveQuizPatch({ banner_url: null });
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

          <section className="f-instructions-card">
            <div className="f-qcard-head">
              <span>Instructions</span>
              <span className="pts">Shown to students</span>
            </div>
            <p className="f-field-hint" style={{ marginTop: 0 }}>
              Write rules, prize info, or how to play. Students see this under the cover on the take
              page.
            </p>
            <textarea
              className="f-instructions-input"
              rows={5}
              value={quiz.settings?.instructions ?? ''}
              onChange={(e) =>
                setQuiz({
                  ...quiz,
                  settings: { ...(quiz.settings || {}), instructions: e.target.value },
                })
              }
              onBlur={(e) => {
                const instructions = String(e.target.value || '').trim();
                const settings = { ...(quiz.settings || {}), instructions };
                setQuiz({ ...quiz, settings });
                saveQuizPatch({ settings });
              }}
              placeholder="e.g. Answer all questions. Use your Discord + in-game name. One entry per person. Good luck!"
            />
          </section>

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
      )}

      {tab === 'responses' && (
        <div className={`f-responses ${selectedResponse ? 'has-panel' : ''}`}>
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
              selectedId={selectedResponse?.id}
              onSelect={setSelectedResponse}
            />
          </div>
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
        <div className="f-insights">
          <h2 style={{ marginTop: 0 }}>Insights</h2>
          <p className="f-muted">{responses.length} submission(s)</p>
          {insights.map(({ q, i, pct, n }) => (
            <div className="f-insight-row" key={q.id}>
              <div style={{ width: 28, fontWeight: 700 }}>{i + 1}</div>
              <div style={{ width: 220, fontSize: 13 }}>{q.prompt?.slice(0, 60) || 'Question'}</div>
              <div className="f-insight-bar-track">
                <div className="f-insight-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ width: 72, textAlign: 'right', fontWeight: 600 }}>{pct}%</div>
              <div className="f-muted" style={{ width: 64, fontSize: 12 }}>
                n={n}
              </div>
            </div>
          ))}
          {!insights.length ? <p className="f-muted">Add scored questions to see insights.</p> : null}
        </div>
      )}

      {tab === 'edit' ? (
        <button type="button" className="f-fab" onClick={() => setAddOpen(true)} aria-label="Add item">
          +
        </button>
      ) : null}

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addQuestion} />

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
