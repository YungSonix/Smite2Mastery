import { useEffect, useMemo, useRef, useState } from 'react';
import MediaStack from './MediaStack';
import { listMediaUrls } from '../lib/questionMedia';
import { formatIp } from '../lib/quizSettings';
import { typeLabel } from '../lib/questionTypes';
import { promptPlain } from '../lib/promptPlain';

const CONTENT_TYPES = new Set(['image', 'content', 'audio', 'video', 'embed']);

function isGate(q) {
  return Boolean(q?.meta?.is_discord_gate || q?.meta?.is_ingame_gate);
}

function isScoredQuestion(q) {
  if (!q || CONTENT_TYPES.has(q.type) || isGate(q)) return false;
  return Number(q.points) > 0;
}

function formatAnswer(q, raw, response) {
  if (q?.meta?.is_discord_gate) {
    return response?.discord_username || (typeof raw === 'string' && raw.trim() ? raw : null);
  }
  if (q?.meta?.is_ingame_gate) {
    return response?.ingame_name || (typeof raw === 'string' && raw.trim() ? raw : null);
  }
  if (raw == null || raw === '') return null;
  const type = q?.type;
  if (type === 'multiple_choice' || type === 'true_false' || type === 'dropdown') {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
      const idx = Number(raw);
      return opts[idx] ?? String(raw);
    }
    return String(raw);
  }
  if (type === 'multiple_selection') {
    const opts = Array.isArray(q.options) ? q.options : [];
    const idxs = Array.isArray(raw)
      ? raw.map(Number)
      : String(raw)
          .split(',')
          .map((x) => Number(x.trim()))
          .filter((n) => Number.isFinite(n));
    if (!idxs.length) return String(raw);
    return idxs.map((i) => opts[i] ?? `#${i}`).join(', ');
  }
  if (type === 'matching' || type === 'categorize') {
    if (raw && typeof raw === 'object') {
      return Object.entries(raw)
        .map(([k, v]) => `${k} → ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
    }
    return String(raw);
  }
  if (type === 'ordering' || type === 'drag_drop') {
    if (Array.isArray(raw)) return raw.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return String(raw);
  }
  if (type === 'hot_spot' && raw && typeof raw === 'object') {
    return `x: ${raw.x}, y: ${raw.y}`;
  }
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

/** Convert stored per_question value (0/1 fraction or points) to earned points. */
function earnedFromStored(stored, maxPts) {
  if (stored == null || stored === '') return null;
  const n = Number(stored);
  if (!Number.isFinite(n)) return null;
  if (maxPts > 0 && n >= 0 && n <= 1) return n * maxPts;
  return n;
}

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
  onClose,
  onSelect,
  onGrade,
  onRemove,
  onViewActivity,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftScores, setDraftScores] = useState({});
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const menuRef = useRef(null);

  const index = useMemo(
    () => (responses || []).findIndex((r) => r.id === response?.id),
    [responses, response?.id]
  );
  const prev = index > 0 ? responses[index - 1] : null;
  const next = index >= 0 && index < (responses?.length || 0) - 1 ? responses[index + 1] : null;

  const reviewQuestions = useMemo(
    () =>
      (questions || []).filter(
        (q) => !CONTENT_TYPES.has(q.type) || response?.answers?.[q.id] != null
      ),
    [questions, response]
  );

  const ungradedCount = useMemo(() => {
    if (!response) return 0;
    let n = 0;
    for (const q of questions || []) {
      if (!isScoredQuestion(q)) continue;
      if (response.per_question?.[q.id] == null) n += 1;
    }
    return n;
  }, [questions, response]);

  useEffect(() => {
    if (!response) return;
    const nextDraft = {};
    for (const q of questions || []) {
      if (!isScoredQuestion(q)) continue;
      const maxPts = Number(q.points) || 0;
      const earned = earnedFromStored(response.per_question?.[q.id], maxPts);
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

  if (!response) return null;

  const initial = (response.discord_username || '?').charAt(0).toUpperCase();
  const totalScore = Number(response.score) || 0;
  const maxScore = Number(response.max_score) || 0;
  const submitted = response.submitted_at
    ? new Date(response.submitted_at).toLocaleString()
    : '—';

  const commitScore = async (questionId) => {
    const q = (questions || []).find((x) => x.id === questionId);
    if (!q || !isScoredQuestion(q)) return;
    const maxPts = Number(q.points) || 0;
    const raw = draftScores[questionId];
    if (raw === '' || raw == null) return;
    const earned = Math.max(0, Math.min(maxPts, Number(raw)));
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
    { id: 'submit', label: 'Submit for student', icon: 'check', disabled: true },
    { id: 'behalf', label: 'Answer on behalf of student', icon: 'edit', disabled: true },
    {
      id: 'zero',
      label: 'Grade empty responses zero',
      icon: 'zero',
      disabled: ungradedCount === 0 || busy,
      onClick: gradeEmptyZero,
    },
    { id: 'undo', label: 'Undo submission', icon: 'undo', disabled: true },
    { id: 'pause', label: 'Pause submission', icon: 'pause', disabled: true },
    { id: 'timeline', label: 'View student timeline', icon: 'timeline', disabled: true },
    {
      id: 'view',
      label: 'View quiz',
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
        <span className="f-muted">IP {formatIp(response.ip_address)}</span>
      </div>

      <div className="f-student-panel-score-row">
        <div>
          <div className="f-student-panel-score-label">Activity total points</div>
          <div className="f-student-panel-score">
            {totalScore} / {maxScore}pts
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
          ⚠ This submission has ungraded responses.
        </div>
      ) : null}

      <div className="f-student-panel-body">
        {reviewQuestions.map((q, i) => {
          const answerText = formatAnswer(q, response.answers?.[q.id], response);
          const scored = isScoredQuestion(q);
          const maxPts = Number(q.points) || 0;
          const stored = response.per_question?.[q.id];
          const mark =
            stored == null ? 'empty' : Number(stored) > 0 || earnedFromStored(stored, maxPts) > 0 ? 'ok' : 'bad';

          return (
            <article key={q.id} className={`f-answer-card mark-${mark}`}>
              <div className="f-answer-card-head">
                <span className="f-q-num">{i + 1}</span>
                <div className="f-answer-card-prompt">
                  <div className="f-answer-type">{typeLabel(q)}</div>
                  <div>{promptPlain(q.prompt) || typeLabel(q)}</div>
                </div>
              </div>
              <MediaStack urls={listMediaUrls(q)} />
              <div className="f-answer-value">
                {answerText != null ? (
                  <pre>{answerText}</pre>
                ) : (
                  <span className="f-muted">No response</span>
                )}
              </div>
              <div className="f-answer-foot">
                <span className="f-muted">{submitted}</span>
                {scored ? (
                  <label className="f-grade-input">
                    <input
                      type="number"
                      min={0}
                      max={maxPts}
                      step="any"
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
                ) : isGate(q) ? (
                  <span className="f-muted">Identity</span>
                ) : (
                  <span className="f-muted">—</span>
                )}
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
