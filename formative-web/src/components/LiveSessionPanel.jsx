import { useMemo } from 'react';
import MediaStack from './MediaStack';
import { listMediaUrls, questionMediaCrop, questionMediaCropSeed } from '../lib/questionMedia';
import {
  currentLiveQuestion,
  isGateQuestion,
  isLiveAnswered,
  isScoredLiveQuestion,
  liveSessionSummary,
} from '../lib/liveSessionStats';
import { useLiveClock } from '../lib/useLiveClock';
import { presenceLabel, presenceStatus } from '../lib/triviaPresence';
import { typeLabel } from '../lib/questionTypes';
import { promptPlain } from '../lib/promptPlain';

function formatDraft(q, raw, session) {
  if (q?.meta?.is_discord_gate) return session?.discord_username || raw || null;
  if (q?.meta?.is_ingame_gate) return session?.ingame_name || raw || null;
  if (raw == null || raw === '') return null;
  const type = q?.type;
  if (type === 'multiple_choice' || type === 'true_false' || type === 'dropdown') {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
      return opts[Number(raw)] ?? String(raw);
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
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

function promptPlainLocal(html) {
  return promptPlain(html);
}

export default function LiveSessionPanel({ session, sessions, questions, onClose, onSelect }) {
  const now = useLiveClock(Boolean(session));
  const index = useMemo(
    () => (sessions || []).findIndex((s) => s.id === session?.id),
    [sessions, session?.id]
  );
  const prev = index > 0 ? sessions[index - 1] : null;
  const next = index >= 0 && index < (sessions?.length || 0) - 1 ? sessions[index + 1] : null;

  const answers = session?.draft_answers || {};
  const status = presenceStatus(session);
  const scored = useMemo(() => (questions || []).filter((q) => isScoredLiveQuestion(q)), [questions]);

  const progress = useMemo(() => {
    let answered = 0;
    for (const q of scored) {
      if (isLiveAnswered(q, answers)) answered += 1;
    }
    return { answered, total: scored.length };
  }, [scored, answers]);

  const liveSummary = useMemo(
    () => liveSessionSummary(session, { questions, now }),
    [session, questions, now]
  );

  const currentHint = useMemo(() => {
    const current = currentLiveQuestion(questions, answers);
    if (!current) return null;
    const q = questions[current.num - 1];
    return {
      num: current.num,
      preview: promptPlainLocal(q?.prompt) || typeLabel(q),
    };
  }, [questions, answers]);

  if (!session) return null;

  const lastSeen = session.last_seen_at ? new Date(session.last_seen_at).toLocaleString() : '—';

  return (
    <aside className="f-student-panel f-student-panel-v2 f-live-panel" aria-label={`Live progress for ${session.discord_username}`}>
      <header className="f-student-panel-head f-student-panel-head-v2">
        <button type="button" className="f-icon-btn" title="Previous" disabled={!prev} onClick={() => prev && onSelect?.(prev)}>
          ‹
        </button>
        <div className="f-student-hero">
          <div className="f-avatar f-avatar-lg">{(session.discord_username || '?').charAt(0).toUpperCase()}</div>
          <div className="f-student-panel-title">
            <div className="f-student-panel-name">{session.discord_username}</div>
            <div className="f-muted f-student-panel-sub">
              {session.ingame_name || '—'} · Live · {liveSummary.text}
            </div>
          </div>
        </div>
        <button type="button" className="f-icon-btn" title="Next" disabled={!next} onClick={() => next && onSelect?.(next)}>
          ›
        </button>
        <button type="button" className="f-icon-btn" title="Close" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="f-student-panel-meta f-live-meta">
        <span className={`f-status-pill is-${status}`}>{presenceLabel(status)}</span>
        <span className="f-muted">
          {progress.answered}/{progress.total || session.question_count || '?'} answered · Tab away{' '}
          {Number(session.hidden_count) || 0}
        </span>
        <span className="f-muted">Last seen {lastSeen}</span>
      </div>

      {currentHint ? (
        <div className="f-live-current" role="status">
          <strong>Likely on Q{currentHint.num}</strong>
          <span>{currentHint.preview.slice(0, 120)}{currentHint.preview.length > 120 ? '…' : ''}</span>
        </div>
      ) : (
        <div className="f-live-current is-done" role="status">
          All visible questions have an answer in their draft. They may be reviewing or submitting.
        </div>
      )}

      <div className="f-student-panel-body">
        {(questions || []).map((q, i) => {
          if (isGateQuestion(q) && !answers[q.id]) return null;
          const draft = formatDraft(q, answers[q.id], session);
          const answered = isLiveAnswered(q, answers);
          const mark = answered ? 'ok' : 'empty';
          const isCurrent = currentHint?.num === i + 1;

          return (
            <article
              key={q.id}
              className={`f-answer-card mark-${mark} ${isCurrent ? 'is-current' : ''}`}
            >
              <div className="f-answer-card-head">
                <span className="f-q-num">{i + 1}</span>
                <div className="f-answer-card-prompt">
                  <div className="f-answer-type">{typeLabel(q)}</div>
                  <div>{promptPlainLocal(q.prompt) || typeLabel(q)}</div>
                </div>
              </div>
              <MediaStack
                urls={listMediaUrls(q)}
                imageCrop={questionMediaCrop(q.meta)}
                imageCropSeed={questionMediaCropSeed(q.meta, listMediaUrls(q)[0])}
              />
              <div className="f-answer-value">
                {draft != null ? <pre>{draft}</pre> : <span className="f-muted">Not answered yet</span>}
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
