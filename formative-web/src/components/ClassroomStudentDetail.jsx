import { useCallback, useEffect, useState } from 'react';
import { formatClassPoints } from '../lib/classroomBadges';
import { formatWhenLocal } from '../lib/formatWhen';
import ClassroomAutoPointsBreakdown from './ClassroomAutoPointsBreakdown';

export const THESIS_ENTITY_KEYS = [
  { id: 'gods', label: 'Gods' },
  { id: 'skins', label: 'Skins' },
  { id: 'voice', label: 'Voice lines' },
  { id: 'ability_sfx', label: 'Ability SFX' },
  { id: 'items', label: 'Items' },
  { id: 'vgs', label: 'VGS' },
];

function EntityChipModal({ entity, onClose }) {
  if (!entity) return null;
  const questions = entity.questions || [];
  return (
    <div
      className="f-classroom-entity-modal"
      role="dialog"
      aria-label={`${entity.label} questions`}
      onDoubleClick={onClose}
    >
      <div className="f-classroom-entity-modal-head">
        <strong>{entity.label}</strong>
        <button type="button" className="f-classroom-entity-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {questions.length ? (
        <ul className="f-classroom-entity-modal-list">
          {questions.map((q) => (
            <li key={q.label} className={q.correct ? 'is-correct' : 'is-wrong'}>
              <span>{q.label}</span>
              <span className="f-muted">{q.correct ? '✓' : '✗'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="f-muted">No tagged questions linked yet.</p>
      )}
    </div>
  );
}

function ThesisEntityBlock({ title, bag, highlightGroup, onEntityClick }) {
  if (!bag) return null;
  const rows = THESIS_ENTITY_KEYS.map(({ id, label }) => {
    const items = bag[id] || [];
    return { id, label, items };
  }).filter((r) => r.items.length);
  if (!rows.length) {
    return (
      <div className="f-classroom-thesis-entities">
        <h4 className="f-player-detail-title">{title}</h4>
        <p className="f-muted">Nothing tagged yet.</p>
      </div>
    );
  }
  return (
    <div className="f-classroom-thesis-entities">
      <h4 className="f-player-detail-title">{title}</h4>
      {rows.map(({ id, label, items }) => (
        <div
          key={id}
          id={`thesis-entity-${id}`}
          className={`f-classroom-recognize-group ${highlightGroup === id ? 'is-highlighted' : ''}`}
        >
          <div className="f-classroom-recognize-head">
            <span>{label}</span>
            <span className="f-muted">{items.length}</span>
          </div>
          <ul className="f-classroom-recognize-list">
            {items.map((ent) => (
              <li key={ent.key}>
                <button
                  type="button"
                  className="f-classroom-entity-chip"
                  aria-label={`${ent.label} — view related questions`}
                  onClick={() => onEntityClick(ent)}
                >
                  {ent.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StatCell({ label, value }) {
  return (
    <div className="f-classroom-stat-cell">
      <div className="f-classroom-stat-value">{value}</div>
      <div className="f-muted f-classroom-stat-label">{label}</div>
    </div>
  );
}

export function PointControls({ student, onAdjust, busy, size = 'md', steps }) {
  if (!student) return null;
  const step = steps ?? (size === 'lg' ? [0.5, 1, 5] : [0.5, 1]);

  const formatStepLabel = (n) => {
    if (n === 0.5) return '½';
    if (n === 1) return '';
    return String(n);
  };

  const formatStepAria = (n) => {
    if (n === 0.5) return 'half a point';
    if (n === 1) return '1 point';
    return `${n} points`;
  };

  return (
    <div
      className={`f-classroom-points-ctrl f-classroom-points-ctrl--${size}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Adjust class points"
    >
      {step.map((n) => (
        <span key={`step-${n}`} className="f-classroom-points-ctrl-pair">
          <button
            type="button"
            className="f-classroom-pt-btn is-minus"
            disabled={busy}
            onClick={() => onAdjust(student.discordKey, -n)}
            aria-label={`Remove ${formatStepAria(n)}`}
          >
            −{formatStepLabel(n)}
          </button>
          <button
            type="button"
            className="f-classroom-pt-btn is-plus"
            disabled={busy}
            onClick={() => onAdjust(student.discordKey, n)}
            aria-label={`Add ${formatStepAria(n)}`}
          >
            +{formatStepLabel(n)}
          </button>
        </span>
      ))}
    </div>
  );
}

function QuestionRow({ q, tone }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(q.fullLabel || q.label);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }, [q.fullLabel, q.label]);

  return (
    <li>
      <button
        type="button"
        className={`f-classroom-question-row is-${tone}`}
        onClick={handleClick}
        aria-label={`Copy prompt: ${q.label}`}
        title="Click to copy full prompt"
      >
        <span>{q.label}</span>
        <span className="f-muted">
          {q.avgPct}% · {q.attempts}×{copied ? ' · copied!' : ''}
        </span>
      </button>
    </li>
  );
}

export default function ClassroomStudentDetail({ student, onAdjust, busy, onChangeAvatar }) {
  const [highlightGroup, setHighlightGroup] = useState(null);
  const [entityModal, setEntityModal] = useState(null);
  const [expandedStyle, setExpandedStyle] = useState(null);

  if (!student) return null;

  const attempts = student.attempts || [];
  const thesis = student.thesis;
  const firstAttempt = attempts.length ? attempts[attempts.length - 1] : null;
  const firstSeen =
    formatWhenLocal(firstAttempt?.submittedAt) ||
    formatWhenLocal(student.lastSubmittedAt) ||
    '—';
  const lastSeen = formatWhenLocal(student.lastSubmittedAt) || '—';
  const trendLabel =
    thesis?.trend === 'up' ? 'Improving' : thesis?.trend === 'down' ? 'Slipping' : 'Steady';

  const handleStyleCardClick = (card) => {
    setExpandedStyle(card.id);
    setHighlightGroup(card.id);
    requestAnimationFrame(() => {
      document.getElementById(`thesis-entity-${card.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });
    setTimeout(() => setHighlightGroup(null), 2400);
  };

  const handleStyleCardDoubleClick = (card, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedStyle(null);
    setHighlightGroup(null);
  };

  useEffect(() => {
    if (!expandedStyle && !entityModal) return undefined;

    const onPointerDown = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.f-classroom-style-card')) return;
      if (target.closest('.f-classroom-entity-modal')) return;
      if (target.closest('.f-classroom-entity-chip')) return;
      if (expandedStyle) {
        setExpandedStyle(null);
        setHighlightGroup(null);
      }
      if (entityModal) setEntityModal(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [expandedStyle, entityModal]);

  return (
    <div className="f-classroom-detail f-classroom-profile-deep">
      <div className="f-classroom-detail-head">
        <button
          type="button"
          className="f-classroom-avatar-edit"
          onClick={onChangeAvatar}
          aria-label="Change avatar"
        >
          <img src={student.avatarUrl} alt="" className="f-classroom-detail-avatar" />
          <span className="f-classroom-avatar-edit-tag">Change</span>
        </button>
        <div>
          <h3>{student.ingame}</h3>
          {student.profileTitle ? (
            <p className="f-classroom-profile-title">{student.profileTitle}</p>
          ) : null}
          <p className="f-muted">{student.discord}</p>
          <p className="f-classroom-detail-badge-label">{student.badgeLabel}</p>
          {thesis?.oneLiner ? (
            <p className="f-classroom-thesis-oneliner">{thesis.oneLiner}</p>
          ) : null}
          {student.flagged ? (
            <p className="f-classroom-flag-note">
              ⚑ Review flagged ({student.flagLevel})
            </p>
          ) : null}
        </div>
      </div>

      <div className="f-classroom-pts-card">
        <div className="f-classroom-detail-points">
          {formatClassPoints(student.classroomPoints)} pts
        </div>
        <p className="f-muted f-classroom-points-breakdown f-pts-explain">
          Class points = trivia auto-points + your manual bonus
        </p>
        <p className="f-classroom-points-breakdown">
          <span>{formatClassPoints(student.classroomAutoPoints)} trivia auto</span>
          <span className="f-muted"> · </span>
          <span>
            {student.classroomBonus > 0 ? '+' : ''}
            {formatClassPoints(student.classroomBonus)} your bonus
          </span>
        </p>
        <PointControls student={student} onAdjust={onAdjust} busy={busy} size="lg" />
        <ClassroomAutoPointsBreakdown breakdown={student.classroomAutoBreakdown} />
      </div>

      <div className="f-classroom-stat-grid">
        <StatCell label="Trivias done" value={student.triviasDone} />
        <StatCell label="Events entered" value={student.eventsEntered} />
        <StatCell label="Avg %" value={student.avgPct != null ? `${student.avgPct}%` : '—'} />
        <StatCell label="Best %" value={student.bestPct != null ? `${student.bestPct}%` : '—'} />
        <StatCell
          label="Pass rate"
          value={student.passRate != null ? `${student.passRate}%` : '—'}
        />
        <StatCell label="Avg duration" value={student.avgDurationLabel || '—'} />
        <StatCell label="Loyalty" value={student.loyaltyScore ?? '—'} />
        <StatCell label="First seen" value={firstSeen} />
        <StatCell label="Last seen" value={lastSeen} />
      </div>

      {thesis ? (
        <div className="f-classroom-thesis">
          {thesis.sampleThin ? (
            <p className="f-muted f-classroom-thesis-thin">
              Only one trivia so far — style tags will sharpen after more attempts.
            </p>
          ) : null}
          <h4 className="f-player-detail-title">Style report card</h4>
          <div className="f-classroom-style-grid">
            {(thesis.styleCards || []).map((card) => {
              const verdictClass = String(card.verdict || 'thin').toLowerCase().replace(/\s+/g, '-');
              const expanded = expandedStyle === card.id;
              const recognizeItems = thesis.recognizes?.[card.id] || [];
              const missItems = thesis.misses?.[card.id] || [];
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`f-classroom-style-card is-${verdictClass} ${expanded ? 'is-expanded' : ''}`}
                  aria-label={`${card.label} — ${card.verdict}. Click to jump to entities.`}
                  aria-expanded={expanded}
                  onClick={() => handleStyleCardClick(card)}
                  onDoubleClick={(e) => handleStyleCardDoubleClick(card, e)}
                >
                  <div className="f-classroom-style-label">{card.label}</div>
                  <div className="f-classroom-style-ratio">
                    {card.right}/{card.seen}
                  </div>
                  <div className="f-classroom-style-pct">
                    {card.pct != null ? `${card.pct}%` : '—'}
                  </div>
                  <div className="f-classroom-style-verdict">{card.verdict}</div>
                  {expanded && (recognizeItems.length || missItems.length) ? (
                    <div className="f-classroom-style-expand">
                      {recognizeItems.length ? (
                        <p>
                          <span className="f-muted">Recognizes: </span>
                          {recognizeItems.map((e) => e.label).join(', ')}
                        </p>
                      ) : null}
                      {missItems.length ? (
                        <p>
                          <span className="f-muted">Misses: </span>
                          {missItems.map((e) => e.label).join(', ')}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="f-classroom-thesis-split">
            <ThesisEntityBlock
              title="Recognizes"
              bag={thesis.recognizes}
              highlightGroup={highlightGroup}
              onEntityClick={setEntityModal}
            />
            <ThesisEntityBlock
              title="Misses"
              bag={thesis.misses}
              highlightGroup={highlightGroup}
              onEntityClick={setEntityModal}
            />
          </div>

          {entityModal ? (
            <EntityChipModal entity={entityModal} onClose={() => setEntityModal(null)} />
          ) : null}

          <div className="f-classroom-thesis-split">
            <div>
              <h4 className="f-player-detail-title">Good at</h4>
              {thesis.goodQuestions?.length ? (
                <ul className="f-player-topic-list is-strong">
                  {thesis.goodQuestions.map((q) => (
                    <QuestionRow key={`good-${q.label}`} q={q} tone="strong" />
                  ))}
                </ul>
              ) : (
                <p className="f-muted">Needs more repeat prompts.</p>
              )}
            </div>
            <div>
              <h4 className="f-player-detail-title">Struggles with</h4>
              {thesis.toughQuestions?.length ? (
                <ul className="f-player-topic-list is-weak">
                  {thesis.toughQuestions.map((q) => (
                    <QuestionRow key={`tough-${q.label}`} q={q} tone="weak" />
                  ))}
                </ul>
              ) : (
                <p className="f-muted">No tough prompts flagged yet.</p>
              )}
            </div>
          </div>

          <div className="f-classroom-thesis-trend">
            <h4 className="f-player-detail-title">Trend</h4>
            <p className={`f-classroom-trend-pill is-${thesis.trend || 'flat'}`}>{trendLabel}</p>
            {thesis.recent?.length ? (
              <ul className="f-classroom-recent-list">
                {thesis.recent.map((r, idx) => (
                  <li key={`${r.quizTitle}-${r.submittedAt || idx}`}>
                    <span className="f-player-attempt-quiz">{r.quizTitle}</span>
                    <span className="f-player-attempt-score">
                      {r.pct != null ? `${r.pct}%` : '—'}
                    </span>
                    <span className="f-muted f-player-attempt-when">
                      {formatWhenLocal(r.submittedAt) || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="f-muted">No recent events yet.</p>
            )}
          </div>
        </div>
      ) : null}

      {student.ingameNames?.length ? (
        <div className="f-classroom-ingame-names">
          <h4 className="f-player-detail-title">In-game names</h4>
          <ul className="f-classroom-name-list">
            {student.ingameNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="f-player-detail-grid">
        <div>
          <h4 className="f-player-detail-title">Trivia report card</h4>
          {attempts.length ? (
            <ul className="f-player-attempt-list">
              {attempts.map((a) => (
                <li key={a.id}>
                  <span className="f-player-attempt-quiz">{a.quizTitle}</span>
                  <span className="f-player-attempt-score">
                    {a.score}/{a.maxScore} ({a.pct != null ? `${a.pct}%` : '—'})
                  </span>
                  <span className="f-muted">{a.durationLabel}</span>
                  <span className="f-muted f-player-attempt-when">
                    {formatWhenLocal(a.submittedAt) || '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="f-muted">No trivia attempts yet.</p>
          )}
        </div>
        <div>
          <h4 className="f-player-detail-title">Usually gets right</h4>
          {student.strongQuestions?.length ? (
            <ul className="f-player-topic-list is-strong">
              {student.strongQuestions.map((q) => (
                <QuestionRow key={q.label} q={q} tone="strong" />
              ))}
            </ul>
          ) : (
            <p className="f-muted">Needs more repeat questions.</p>
          )}
          <h4 className="f-player-detail-title">Usually misses</h4>
          {student.weakQuestions?.length ? (
            <ul className="f-player-topic-list is-weak">
              {student.weakQuestions.map((q) => (
                <QuestionRow key={q.label} q={q} tone="weak" />
              ))}
            </ul>
          ) : (
            <p className="f-muted">No weak spots flagged yet.</p>
          )}
        </div>
      </div>

      {student.flagged ? (
        <div className="f-classroom-integrity-note">
          <h4 className="f-player-detail-title">Integrity / review</h4>
          <p className="f-muted">
            This student has submissions flagged for review (level: {student.flagLevel}). Check
            timing and answer patterns before awarding giveaway eligibility.
          </p>
        </div>
      ) : null}
    </div>
  );
}
