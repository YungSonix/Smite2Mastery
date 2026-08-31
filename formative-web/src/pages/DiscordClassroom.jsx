import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HostShell from '../components/HostShell';
import { KpiStrip } from '../components/HostCharts';
import { hostApi } from '../lib/api';
import { buildSubmissionIntegrity } from '../lib/submissionIntegrity';
import { buildPlayerLeaderboard } from '../lib/triviaPlayerStats';
import { formatClassPoints, mergeClassroomStudent } from '../lib/classroomBadges';
import { attachThesesToStudents, buildClassNextTriviaRecipe } from '../lib/classroomThesis';
import { formatWhenLocal } from '../lib/formatWhen';
import ClassroomAvatarPicker from '../components/ClassroomAvatarPicker';
import { PaginationBar, usePagination } from '../lib/usePagination';

const CLASSROOM_PAGE_SIZE = 30;

const THESIS_ENTITY_KEYS = [
  { id: 'gods', label: 'Gods' },
  { id: 'skins', label: 'Skins' },
  { id: 'voice', label: 'Voice lines' },
  { id: 'ability_sfx', label: 'Ability SFX' },
];

function ThesisEntityBlock({ title, bag }) {
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
        <div key={id} className="f-classroom-recognize-group">
          <div className="f-classroom-recognize-head">
            <span>{label}</span>
            <span className="f-muted">{items.length}</span>
          </div>
          <ul className="f-classroom-recognize-list">
            {items.map((ent) => (
              <li key={ent.key}>{ent.label}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const BULK_DELTAS = [
  { delta: 1, label: '+1 everyone' },
  { delta: -1, label: '−1 everyone' },
  { delta: 0.5, label: '+½ everyone' },
  { delta: -0.5, label: '−½ everyone' },
  { delta: 5, label: '+5 everyone' },
  { delta: -5, label: '−5 everyone' },
];

function formatStepLabel(n) {
  if (n === 0.5) return '½';
  if (n === 1) return '';
  return String(n);
}

function formatStepAria(n) {
  if (n === 0.5) return 'half a point';
  if (n === 1) return '1 point';
  return `${n} points`;
}

function PointControls({ student, onAdjust, busy, size = 'md', steps }) {
  if (!student) return null;
  const step = steps ?? (size === 'lg' ? [0.5, 1, 5] : [0.5, 1]);
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

function StatCell({ label, value }) {
  return (
    <div className="f-classroom-stat-cell">
      <div className="f-classroom-stat-value">{value}</div>
      <div className="f-muted f-classroom-stat-label">{label}</div>
    </div>
  );
}

function PlayerDetail({ student, onAdjust, busy, onChangeAvatar }) {
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
          <h4 className="f-player-detail-title">Style report card</h4>
          <div className="f-classroom-style-grid">
            {(thesis.styleCards || []).map((card) => (
              <div
                key={card.id}
                className={`f-classroom-style-card is-${String(card.verdict || 'thin')
                  .toLowerCase()
                  .replace(/\s+/g, '-')}`}
              >
                <div className="f-classroom-style-label">{card.label}</div>
                <div className="f-classroom-style-ratio">
                  {card.right}/{card.seen}
                </div>
                <div className="f-classroom-style-pct">
                  {card.pct != null ? `${card.pct}%` : '—'}
                </div>
                <div className="f-classroom-style-verdict">{card.verdict}</div>
              </div>
            ))}
          </div>

          <div className="f-classroom-thesis-split">
            <ThesisEntityBlock title="Recognizes" bag={thesis.recognizes} />
            <ThesisEntityBlock title="Misses" bag={thesis.misses} />
          </div>

          <div className="f-classroom-thesis-split">
            <div>
              <h4 className="f-player-detail-title">Good at</h4>
              {thesis.goodQuestions?.length ? (
                <ul className="f-player-topic-list is-strong">
                  {thesis.goodQuestions.map((q) => (
                    <li key={`good-${q.label}`}>
                      <span>{q.label}</span>
                      <span className="f-muted">
                        {q.avgPct}% · {q.attempts}×
                      </span>
                    </li>
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
                    <li key={`tough-${q.label}`}>
                      <span>{q.label}</span>
                      <span className="f-muted">
                        {q.avgPct}% · {q.attempts}×
                      </span>
                    </li>
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
                <li key={q.label}>
                  <span>{q.label}</span>
                  <span className="f-muted">
                    {q.avgPct}% · {q.attempts}×
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="f-muted">Needs more repeat questions.</p>
          )}
          <h4 className="f-player-detail-title">Usually misses</h4>
          {student.weakQuestions?.length ? (
            <ul className="f-player-topic-list is-weak">
              {student.weakQuestions.map((q) => (
                <li key={q.label}>
                  <span>{q.label}</span>
                  <span className="f-muted">
                    {q.avgPct}% · {q.attempts}×
                  </span>
                </li>
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

function ClassroomCard({ student, active, onSelect, onAdjust, busy }) {
  return (
    <div
      className={`f-classroom-card-wrap ${active ? 'is-active' : ''} ${student.isRegular ? 'is-regular' : ''}`}
    >
      <button
        type="button"
        className="f-classroom-card"
        onClick={() => onSelect(student.discordKey)}
      >
        {student.isRegular ? <span className="f-classroom-regular-tag">Regular</span> : null}
        <span className="f-classroom-points-bubble">
          {formatClassPoints(student.classroomPoints)}
        </span>
        <div className="f-classroom-avatar-ring">
          <img src={student.avatarUrl} alt="" className="f-classroom-avatar" loading="lazy" />
        </div>
        <div className="f-classroom-card-name">{student.ingame}</div>
        <div className="f-classroom-card-discord">{student.discord}</div>
        <div className="f-classroom-card-stats">
          <span>
            {student.triviasDone} trivia{student.triviasDone === 1 ? '' : 's'}
          </span>
          <span>{student.avgPct != null ? `${student.avgPct}% avg` : '—'}</span>
        </div>
        <span className="f-classroom-card-open-hint">Tap for full report</span>
        {student.flagged ? (
          <span className="f-classroom-flag" title={`Review: ${student.flagLevel}`}>
            ⚑
          </span>
        ) : null}
      </button>
      {/* Card roster: ±1 only — half points live in the profile sheet (cleaner mobile taps). */}
      <PointControls student={student} onAdjust={onAdjust} busy={busy} steps={[1]} />
    </div>
  );
}

export default function DiscordClassroom() {
  const [data, setData] = useState({
    quizzes: [],
    questions: [],
    responses: [],
    playerProfiles: [],
    profileSync: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('regulars');
  const [selectedKey, setSelectedKey] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [avatarStudent, setAvatarStudent] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const load = useCallback(async () => {
    // syncProfiles=0: do not rebuild every student profile on open (Vercel 30s timeout).
    const res = await hostApi('/api/trivia/host?action=analytics&syncProfiles=0');
    setData(res);
    return res;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        const network = e.message === 'Failed to fetch' || e.name === 'TypeError';
        const timedOut =
          e.status === 504 ||
          e.status === 503 ||
          /timeout|timed out|gateway|function_invocation|load failed/i.test(String(e.message || ''));
        if (alive) {
          setError(
            network || timedOut
              ? 'Classroom took too long to load. Refresh once — student lists no longer rebuild every profile on open.'
              : e.message || 'Failed to load classroom'
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const profileByKey = useMemo(
    () => Object.fromEntries((data.playerProfiles || []).map((p) => [p.discord_key, p])),
    [data.playerProfiles]
  );

  const integrityIndex = useMemo(
    () => buildSubmissionIntegrity(data.responses || []),
    [data.responses]
  );

  const students = useMemo(() => {
    const players = buildPlayerLeaderboard(data.responses || [], {
      quizzes: data.quizzes,
      questions: data.questions,
      integrityIndex,
    });
    return players.map((p) => mergeClassroomStudent(p, profileByKey[p.discordKey]));
  }, [data, integrityIndex, profileByKey]);

  const studentsWithThesis = useMemo(
    () => attachThesesToStudents(students, data.questions),
    [students, data.questions]
  );

  const nextTrivia = useMemo(
    () =>
      buildClassNextTriviaRecipe({
        students: studentsWithThesis,
        questions: data.questions,
        responses: data.responses,
      }),
    [studentsWithThesis, data.questions, data.responses]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = studentsWithThesis.filter((s) => {
      if (filter === 'regulars' && !s.isRegular) return false;
      if (filter === 'new' && s.triviasDone > 1) return false;
      if (!q) return true;
      return (
        s.discord.toLowerCase().includes(q) ||
        s.ingame.toLowerCase().includes(q) ||
        s.discordKey.includes(q.replace(/[._\s-]+/g, ''))
      );
    });

    list = [...list].sort((a, b) => {
      if (sort === 'points') return b.classroomPoints - a.classroomPoints;
      if (sort === 'recent')
        return String(b.lastSubmittedAt || '').localeCompare(String(a.lastSubmittedAt || ''));
      if (sort === 'trivias') return b.triviasDone - a.triviasDone || b.eventsEntered - a.eventsEntered;
      return (
        Number(b.isRegular) - Number(a.isRegular) ||
        b.triviasDone - a.triviasDone ||
        b.classroomPoints - a.classroomPoints
      );
    });
    return list;
  }, [studentsWithThesis, search, filter, sort]);

  const {
    page,
    setPage,
    pageCount,
    slice,
    from,
    to,
    reset: resetPage,
  } = usePagination(visible.length, CLASSROOM_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [search, filter, sort, resetPage]);

  const pageStudents = useMemo(() => slice(visible), [slice, visible]);

  const upsertProfile = useCallback((profile) => {
    if (!profile) return;
    setData((prev) => {
      const list = [...(prev.playerProfiles || [])];
      const idx = list.findIndex((p) => p.discord_key === profile.discord_key);
      if (idx >= 0) list[idx] = profile;
      else list.push(profile);
      return { ...prev, playerProfiles: list };
    });
  }, []);

  const handleAdjust = useCallback(
    async (discordKey, delta) => {
      setBusyKey(discordKey);
      setError('');
      try {
        const res = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: { action: 'classroom-points', discordKey, delta },
        });
        const profile = res.profile;
        if (profile) upsertProfile(profile);
      } catch (e) {
        setError(e.message || 'Could not update points');
      } finally {
        setBusyKey(null);
      }
    },
    [upsertProfile]
  );

  const handleBulkAdjust = useCallback(
    async (delta) => {
      if (!visible.length || bulkBusy) return;
      const label =
        delta === 0.5 || delta === -0.5
          ? `${delta > 0 ? '+' : '−'}½`
          : `${delta > 0 ? '+' : ''}${delta}`;
      const ok = window.confirm(
        `Apply ${label} class points to all ${visible.length} student${visible.length === 1 ? '' : 's'} matching the current filter/search?`
      );
      if (!ok) return;

      setBulkBusy(true);
      setError('');
      try {
        const res = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: {
            action: 'classroom-points-bulk',
            discordKeys: visible.map((s) => s.discordKey),
            delta,
          },
        });
        for (const profile of res.profiles || []) {
          upsertProfile(profile);
        }
      } catch (e) {
        setError(e.message || 'Could not bulk update points');
      } finally {
        setBulkBusy(false);
      }
    },
    [visible, bulkBusy, upsertProfile]
  );

  const handleSaveAvatar = useCallback(
    async ({ kind, ref }) => {
      if (!avatarStudent) return;
      setAvatarBusy(true);
      setError('');
      try {
        const res = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: {
            action: 'set-classroom-avatar',
            discordKey: avatarStudent.discordKey,
            kind,
            ref,
          },
        });
        upsertProfile(res.profile);
        setAvatarStudent(null);
      } catch (e) {
        setError(e.message || 'Could not save avatar');
      } finally {
        setAvatarBusy(false);
      }
    },
    [avatarStudent, upsertProfile]
  );

  const selected = visible.find((s) => s.discordKey === selectedKey) || null;
  const regularCount = studentsWithThesis.filter((s) => s.isRegular).length;
  const totalPoints = studentsWithThesis.reduce((n, s) => n + s.classroomPoints, 0);

  const selectStudent = useCallback((key) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  }, []);

  // Mobile: profile used to render under 30 cards — felt like tap did nothing.
  useEffect(() => {
    if (!selectedKey) return undefined;
    const prevOverflow = document.body.style.overflow;
    const isMobile =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      requestAnimationFrame(() => {
        document.getElementById('classroom-student-sheet')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedKey]);

  return (
    <HostShell active="classroom">
      <div className="f-classroom-page">
        <div className="f-classroom-hero">
          <div>
            <h1 className="f-classroom-title">Discord Classroom</h1>
            <p className="f-classroom-subtitle">
              ClassDojo energy — tap +/− to reward or deduct points. Trivia stats auto-fill; your
              adjustments save to the database.
            </p>
            <p className="f-muted f-pts-explain">
              Class points = trivia auto-points + your manual bonus. Half points (+/− ½) supported.
            </p>
          </div>
          <Link to="/analytics" className="f-outline-btn f-compact">
            Charts &amp; giveaway →
          </Link>
        </div>

        {error ? <div className="f-error">{error}</div> : null}
        {loading ? <p className="f-muted">Taking attendance…</p> : null}

        {!loading ? (
          <>
            <KpiStrip
              items={[
                { label: 'Students', value: studentsWithThesis.length, tone: 'cyan' },
                { label: 'Regulars (2+ trivias)', value: regularCount, tone: 'teal' },
                {
                  label: 'Class points',
                  value: formatClassPoints(totalPoints),
                  tone: 'gold',
                },
                { label: 'Trivias hosted', value: (data.quizzes || []).length, tone: 'violet' },
              ]}
            />

            <section className="f-classroom-recipe" aria-label="What to put in next trivia">
              <h2 className="f-classroom-recipe-title">What to put in next trivia</h2>
              <p className="f-classroom-recipe-headline">{nextTrivia.headline}</p>
              {nextTrivia.mix?.length ? (
                <div className="f-classroom-recipe-mix" aria-label="Style mix">
                  {nextTrivia.mix.map((m) => (
                    <span
                      key={m.id}
                      className={`f-classroom-recipe-chip is-${String(m.verdict || 'thin')
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                      title={`${m.seen} answers · ${m.questionCount} questions`}
                    >
                      <span className="f-classroom-recipe-chip-label">{m.label}</span>
                      <span className="f-classroom-recipe-chip-pct">
                        {m.pct != null ? `${m.pct}%` : '—'}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
              {nextTrivia.bullets?.length ? (
                <ul className="f-classroom-recipe-list">
                  {nextTrivia.bullets.map((b, idx) => {
                    const action = String(b.action || 'KEEP').toUpperCase();
                    const actionClass = action.toLowerCase();
                    return (
                      <li key={`${action}-${idx}`} className="f-classroom-recipe-bullet">
                        <span className={`f-classroom-recipe-action is-${actionClass}`}>
                          {action}
                        </span>
                        <span>{b.text}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="f-muted">Not enough tagged answers yet for recipe tips.</p>
              )}
            </section>

            <div className="f-classroom-toolbar">
              <input
                type="search"
                className="f-hub-input"
                placeholder="Find a student…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="f-classroom-filters">
                {[
                  ['all', 'Everyone'],
                  ['regulars', 'Regulars'],
                  ['new', 'First-timers'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={filter === id ? 'is-active' : ''}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="f-inline-field f-classroom-sort">
                Sort
                <select
                  className="f-hub-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="regulars">Regulars first</option>
                  <option value="trivias">Most trivias</option>
                  <option value="points">Most points</option>
                  <option value="recent">Recently active</option>
                </select>
              </label>
            </div>

            <div className="f-classroom-bulk">
              <p className="f-muted f-classroom-bulk-hint">
                Bulk adjust for {visible.length} matching student
                {visible.length === 1 ? '' : 's'}
                {bulkBusy ? ' — updating…' : ''}
              </p>
              <div className="f-classroom-bulk-row" role="group" aria-label="Bulk class points">
                {BULK_DELTAS.map(({ delta, label }) => (
                  <button
                    key={label}
                    type="button"
                    className={`f-classroom-pt-btn ${delta < 0 ? 'is-minus' : 'is-plus'}`}
                    disabled={bulkBusy || !visible.length}
                    onClick={() => handleBulkAdjust(delta)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <PaginationBar
              page={page}
              pageCount={pageCount}
              from={from}
              to={to}
              total={visible.length}
              onPage={setPage}
              pageSize={CLASSROOM_PAGE_SIZE}
              className="f-pagination-top"
            />

            <div className="f-classroom-grid">
              {pageStudents.map((s) => (
                <ClassroomCard
                  key={s.discordKey}
                  student={s}
                  active={selectedKey === s.discordKey}
                  onSelect={selectStudent}
                  onAdjust={handleAdjust}
                  busy={busyKey === s.discordKey || bulkBusy}
                />
              ))}
            </div>

            {!visible.length ? (
              <p className="f-muted f-classroom-empty">
                No students match — they will appear after trivia.
              </p>
            ) : (
              <PaginationBar
                page={page}
                pageCount={pageCount}
                from={from}
                to={to}
                total={visible.length}
                onPage={setPage}
                pageSize={CLASSROOM_PAGE_SIZE}
              />
            )}

            {selected ? (
              <div
                className="f-classroom-sheet-overlay"
                role="presentation"
                onClick={() => setSelectedKey(null)}
              >
                <div
                  id="classroom-student-sheet"
                  className="f-classroom-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${selected.ingame} student report`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="f-classroom-sheet-close"
                    onClick={() => setSelectedKey(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <PlayerDetail
                    student={selected}
                    onAdjust={handleAdjust}
                    busy={busyKey === selected.discordKey || bulkBusy}
                    onChangeAvatar={() => setAvatarStudent(selected)}
                  />
                </div>
              </div>
            ) : null}

            <ClassroomAvatarPicker
              open={Boolean(avatarStudent)}
              student={avatarStudent}
              onClose={() => setAvatarStudent(null)}
              onSave={handleSaveAvatar}
              busy={avatarBusy}
            />

            <p className="f-muted f-classroom-foot">
              +/− adjusts your manual bonus (saved in Supabase), including half points. Trivia
              auto-points refresh on sync. Class points = trivia auto-points + your manual bonus.
              For ±½, run <code>supabase/formative_trivia_classroom_bonus_half.sql</code> once.
              {data.profileSync?.tableMissing ? (
                <>
                  {' '}
                  Run <code>supabase/formative_trivia_player_profiles.sql</code> first.
                </>
              ) : null}
            </p>
          </>
        ) : null}
      </div>
    </HostShell>
  );
}
