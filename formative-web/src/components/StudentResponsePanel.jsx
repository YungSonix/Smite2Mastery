import { useEffect, useMemo, useRef, useState } from 'react';
import MediaStack from './MediaStack';
import { listMediaUrls } from '../lib/questionMedia';
import { typeLabel } from '../lib/questionTypes';
import { promptPlain } from '../lib/promptPlain';
import { formatDuration, responseDurationMs } from '../lib/triviaInsights';
import { responsePercent } from '../lib/sortResponses';
import { studentTakeViewUrl } from '../lib/api';
import {
  earnedFromStored,
  effectiveEarned,
  formatResponseAnswer,
  isBlankAnswer,
  isContentQuestion,
  isGateQuestion,
  isScoredQuestion,
  needsManualGrade,
} from '../lib/formatResponseAnswer';
import { orderQuestionsLikeStudent, applyVariant, extractVariantMap, extractQuestionOrder } from '../lib/triviaVariants';
import { scoredInsightQuestions } from '../lib/triviaInsights';
import { buildSubmissionIntegrity, integrityFor } from '../lib/submissionIntegrity';

function MenuIcon({ name }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    'aria-hidden': true,
  };
  if (name === 'print') {
    return (
      <svg {...props}>
        <path d="M4 6V2h8v4M4 12H2.5A1.5 1.5 0 0 1 1 10.5v-3A1.5 1.5 0 0 1 2.5 6h11A1.5 1.5 0 0 1 15 7.5v3A1.5 1.5 0 0 1 13.5 12H12" stroke="currentColor" strokeWidth="1.4" />
        <rect x="4" y="10" width="8" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg {...props}>
        <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'edit') {
    return (
      <svg {...props}>
        <path d="M9.5 3.5 12.5 6.5M3 13l.8-3.2L11 2.6a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4L6.2 12.2 3 13Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'zero') {
    return (
      <svg {...props}>
        <text x="8" y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">
          0
        </text>
      </svg>
    );
  }
  if (name === 'undo') {
    return (
      <svg {...props}>
        <path d="M6 4 3 7l3 3M3.5 7h6a3.5 3.5 0 1 1 0 7H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'pause') {
    return (
      <svg {...props}>
        <path d="M5 3.5v9M11 3.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'timeline') {
    return (
      <svg {...props}>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 5v3.5l2.2 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'external') {
    return (
      <svg {...props}>
        <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8A1.5 1.5 0 0 0 13 12.5V10M9 3h4v4M7 9l6-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'trash') {
    return (
      <svg {...props}>
        <path d="M3 5h10M6 5V3.5h4V5M5.5 5l.5 8h4l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return null;
}

export default function StudentResponsePanel({
  response,
  responses,
  questions,
  quiz,
  onClose,
  onSelect,
  onGrade,
  onRemove,
  onViewActivity,
  onJumpToInsights,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftScores, setDraftScores] = useState({});
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const menuRef = useRef(null);
  const bodyRef = useRef(null);

  const index = useMemo(
    () => (responses || []).findIndex((r) => r.id === response?.id),
    [responses, response?.id]
  );
  const prev = index > 0 ? responses[index - 1] : null;
  const next = index >= 0 && index < (responses?.length || 0) - 1 ? responses[index + 1] : null;

  const integrity = useMemo(() => {
    const map = buildSubmissionIntegrity(responses);
    return integrityFor(response?.id, map);
  }, [responses, response?.id]);

  const variantMap = useMemo(
    () => extractVariantMap(response?.answers) || {},
    [response?.answers]
  );

  const editorNumById = useMemo(() => {
    const map = new Map();
    scoredInsightQuestions(questions).forEach((q, i) => map.set(q.id, i + 1));
    return map;
  }, [questions]);

  const reviewQuestions = useMemo(() => {
    const filtered = (questions || []).filter(
      (q) => !isContentQuestion(q) || response?.answers?.[q.id] != null
    );
    const ordered = orderQuestionsLikeStudent(filtered, response?.answers, {
      slug: quiz?.slug || quiz?.id,
      discord: response?.discord_username,
      ingame: response?.ingame_name,
      shuffleQuestions: Boolean(quiz?.settings?.shuffle_questions),
    });
    return ordered.map((q) => applyVariant(q, variantMap[q.id] ?? 0));
  }, [questions, response, quiz, variantMap]);

  const orderTracked = Boolean(extractQuestionOrder(response?.answers)?.length);
  const shuffleOn = Boolean(quiz?.settings?.shuffle_questions);

  const ungradedCount = useMemo(() => {
    if (!response) return 0;
    let n = 0;
    for (const q of questions || []) {
      if (needsManualGrade(q, response)) n += 1;
    }
    return n;
  }, [questions, response]);

  useEffect(() => {
    if (!response) return;
    const nextDraft = {};
    for (const q of questions || []) {
      if (!isScoredQuestion(q)) continue;
      const maxPts = Number(q.points) || 0;
      const earned = effectiveEarned(q, response, maxPts);
      nextDraft[q.id] = earned == null ? '' : String(earned);
    }
    setDraftScores(nextDraft);
    setMenuOpen(false);
  }, [response, questions]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (!response?.id) return;
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [response?.id]);

  if (!response) return null;

  const initial = (response.discord_username || '?').charAt(0).toUpperCase();
  const totalScore = Number(response.score) || 0;
  const maxScore = Number(response.max_score) || 0;
  const submitted = response.submitted_at
    ? new Date(response.submitted_at).toLocaleString()
    : '—';
  const durationMs = responseDurationMs(response);
  const tookLabel = durationMs != null ? formatDuration(durationMs) : null;
  const scorePct = responsePercent(response);

  const commitScore = async (questionId) => {
    const q = (questions || []).find((x) => x.id === questionId);
    if (!q || !isScoredQuestion(q)) return;
    const maxPts = Number(q.points) || 0;
    const raw = draftScores[questionId];
    if (raw === '' || raw == null) return;
    const earned = Math.max(0, Math.min(maxPts, Math.round(Number(raw) * 1000) / 1000));
    if (!Number.isFinite(earned)) return;
    const current = earnedFromStored(response.per_question?.[questionId], maxPts);
    if (current != null && Math.abs(current - earned) < 1e-9) return;
    setBusy(true);
    try {
      await onGrade?.(response.id, questionId, earned, maxPts);
    } finally {
      setBusy(false);
    }
  };

  const gradeEmptyZero = async () => {
    setBusy(true);
    setMenuOpen(false);
    try {
      const patches = {};
      for (const q of questions || []) {
        if (!isScoredQuestion(q)) continue;
        if (response.per_question?.[q.id] != null) continue;
        if (!isBlankAnswer(response.answers?.[q.id])) continue;
        patches[q.id] = 0;
      }
      if (Object.keys(patches).length) {
        await onGrade?.(response.id, null, null, null, patches);
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!window.confirm(`Remove all responses for ${response.discord_username}?`)) return;
    setBusy(true);
    try {
      await onRemove?.(response.id);
    } finally {
      setBusy(false);
    }
  };

  const printResponses = () => {
    setMenuOpen(false);
    window.print();
  };

  const menuItems = [
    { id: 'print', label: 'Print responses', icon: 'print', onClick: printResponses },
    { id: 'submit', label: 'Submit for student', icon: 'check', disabled: true, title: 'Coming soon' },
    { id: 'behalf', label: 'Answer on behalf of student', icon: 'edit', disabled: true, title: 'Coming soon' },
    {
      id: 'zero',
      label: 'Grade empty responses zero',
      icon: 'zero',
      disabled: ungradedCount === 0 || busy,
      onClick: gradeEmptyZero,
    },
    { id: 'undo', label: 'Undo submission', icon: 'undo', disabled: true, title: 'Coming soon' },
    { id: 'pause', label: 'Pause submission', icon: 'pause', disabled: true, title: 'Coming soon' },
    { id: 'timeline', label: 'View student timeline', icon: 'timeline', disabled: true, title: 'Coming soon' },
    {
      id: 'view',
      label: 'View quiz (what they saw)',
      icon: 'external',
      disabled: !quiz || !response?.id,
      onClick: () => {
        setMenuOpen(false);
        if (quiz && response?.id) {
          window.open(studentTakeViewUrl(quiz, response.id), '_blank', 'noopener,noreferrer');
        }
      },
    },
    {
      id: 'edit',
      label: 'Edit questions',
      icon: 'external',
      onClick: () => {
        setMenuOpen(false);
        onViewActivity?.();
      },
    },
    { id: 'remove', label: 'Remove responses', icon: 'trash', danger: true, onClick: remove },
  ];

  return (
    <aside
      className={`f-student-panel f-student-panel-v2 ${fullscreen ? 'fullscreen' : ''}`}
      aria-label={`Responses for ${response.discord_username}`}
    >
      <div className="f-student-panel-chrome">
      <header className="f-student-panel-head f-student-panel-head-v2">
        <button
          type="button"
          className="f-icon-btn"
          title="Previous student"
          disabled={!prev}
          onClick={() => prev && onSelect?.(prev)}
        >
          ‹
        </button>
        <div className="f-student-hero">
          <div className="f-avatar f-avatar-lg">{initial}</div>
          <div className="f-student-panel-title">
            <div className="f-student-panel-name">{response.discord_username}</div>
            <div className="f-muted f-student-panel-sub">
              {response.ingame_name || '—'} · {submitted}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="f-icon-btn"
          title="Next student"
          disabled={!next}
          onClick={() => next && onSelect?.(next)}
        >
          ›
        </button>
        <button
          type="button"
          className="f-icon-btn"
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={() => setFullscreen((v) => !v)}
        >
          {fullscreen ? '⤓' : '⤢'}
        </button>
        <button type="button" className="f-icon-btn" title="Close" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="f-student-panel-meta">
        {integrity.level !== 'none' ? (
          <span className="f-student-panel-integrity" title={integrity.title}>
            <span className={`f-dup-ip-flag is-${integrity.level}`} aria-hidden>
              ⚑
            </span>
            Possible alt account
            {integrity.peers?.length
              ? `, also ${integrity.peers.map((p) => p.discord || p.ingame).filter(Boolean).join(', ')}`
              : ''}
          </span>
        ) : null}
        {shuffleOn ? (
          <span className="f-muted f-student-panel-order-note">
            Numbers = their take order (grid columns use editor order).
            {!orderTracked ? ' Order approximated for this submission.' : ''}
          </span>
        ) : null}
      </div>

      <div className="f-student-panel-score-row">
        <div>
          <div className="f-student-panel-score-label">Quiz score</div>
          <div className="f-student-panel-score">
            <span className="f-student-panel-score-pct">{scorePct}%</span>
            <span className="f-student-panel-score-pts">
              {totalScore} / {maxScore}pts
            </span>
            {tookLabel ? (
              <span className="f-student-panel-took" title="Time from start to submit">
                · Took {tookLabel}
              </span>
            ) : (
              <span className="f-student-panel-took f-muted" title="Older takes have no finish clock">
                · Took n/a
              </span>
            )}
          </div>
        </div>
        <div className="f-student-panel-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className={`f-icon-btn ${menuOpen ? 'open' : ''}`}
            aria-label="Student actions"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋮
          </button>
          {menuOpen ? (
            <div className="f-student-menu">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.danger ? 'danger' : ''}
                  disabled={item.disabled || busy}
                  onClick={item.onClick}
                >
                  <MenuIcon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {ungradedCount > 0 ? (
        <div className="f-ungraded-banner" role="status">
          {ungradedCount} response{ungradedCount === 1 ? '' : 's'} need manual grading.
        </div>
      ) : null}
      </div>

      <div className="f-student-panel-body" ref={bodyRef}>
        {reviewQuestions.map((q, i) => {
          const answerText = formatResponseAnswer(q, response.answers?.[q.id], response);
          const scored = isScoredQuestion(q);
          const maxPts = Number(q.points) || 0;
          const earned = effectiveEarned(q, response, maxPts);
          const mark =
            earned == null
              ? 'empty'
              : earned <= 0
                ? 'bad'
                : maxPts > 0 && earned < maxPts - 1e-9
                  ? 'partial'
                  : 'ok';
          const editorNum = editorNumById.get(q.id);
          const takeNum = i + 1;
          const setAndCommit = async (pts) => {
            const next = String(pts);
            setDraftScores((prev) => ({ ...prev, [q.id]: next }));
            const current = earnedFromStored(response.per_question?.[q.id], maxPts);
            if (current != null && Math.abs(current - pts) < 1e-9) return;
            setBusy(true);
            try {
              await onGrade?.(response.id, q.id, pts, maxPts);
            } finally {
              setBusy(false);
            }
          };

          return (
            <article key={q.id} className={`f-answer-card mark-${mark}`}>
              <div className="f-answer-card-head">
                <span
                  className="f-q-num"
                  title={
                    shuffleOn && editorNum != null && editorNum !== takeNum
                      ? `Editor list: Q${editorNum}`
                      : undefined
                  }
                >
                  {takeNum}
                </span>
                <div className="f-answer-card-prompt">
                  <div className="f-answer-type">
                    {typeLabel(q)}
                    {q.meta?.variant_index > 0 ? (
                      <span className="f-muted"> · Version {String.fromCharCode(65 + (q.meta.variant_index || 0))}</span>
                    ) : null}
                    {shuffleOn && editorNum != null && editorNum !== takeNum ? (
                      <span className="f-muted"> · Editor Q{editorNum}</span>
                    ) : null}
                  </div>
                  <div>{promptPlain(q.prompt) || typeLabel(q)}</div>
                </div>
              </div>
              <MediaStack urls={listMediaUrls(q)} />
              <div className="f-answer-value">
                {answerText != null ? (
                  <pre>{answerText}</pre>
                ) : (
                  <span className="f-no-response">No response</span>
                )}
              </div>
              <div className="f-answer-foot">
                <span className="f-muted" aria-hidden="true" />
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {scored ? (
                    <button
                      type="button"
                      className="f-icon-btn f-muted"
                      title="View in Insights"
                      onClick={() => onJumpToInsights?.(q.id)}
                      style={{ fontSize: 12, padding: '2px 6px' }}
                    >
                      Insights ↗
                    </button>
                  ) : null}
                  {scored ? (
                    <div className="f-grade-wrap">
                      <div className="f-grade-quick" role="group" aria-label="Quick grade">
                        <button
                          type="button"
                          className="f-grade-chip"
                          disabled={busy}
                          title="0 points"
                          onClick={() => setAndCommit(0)}
                        >
                          0
                        </button>
                        {maxPts > 0 ? (
                          <button
                            type="button"
                            className="f-grade-chip"
                            disabled={busy}
                            title={`Half credit (${maxPts / 2} pt)`}
                            onClick={() => setAndCommit(Math.round((maxPts / 2) * 1000) / 1000)}
                          >
                            ½
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="f-grade-chip"
                          disabled={busy}
                          title={`Full credit (${maxPts} pt)`}
                          onClick={() => setAndCommit(maxPts)}
                        >
                          Full
                        </button>
                      </div>
                      <label className="f-grade-input" title="Type 0.5 for half credit, then press Enter">
                        <input
                          type="number"
                          min={0}
                          max={maxPts}
                          step="0.5"
                          inputMode="decimal"
                          value={draftScores[q.id] ?? ''}
                          disabled={busy}
                          onChange={(e) =>
                            setDraftScores((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          onBlur={() => commitScore(q.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                        <span>/ {maxPts}pt</span>
                      </label>
                    </div>
                  ) : isGateQuestion(q) ? (
                    <span className="f-muted">Identity</span>
                  ) : (
                    <span className="f-muted">—</span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!reviewQuestions.length ? (
          <p className="f-muted">No answers on this submission.</p>
        ) : null}
      </div>
    </aside>
  );
}
