import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HostShell from '../components/HostShell';
import { KpiStrip } from '../components/HostCharts';
import { hostApi } from '../lib/api';
import { buildSubmissionIntegrity } from '../lib/submissionIntegrity';
import { buildPlayerLeaderboard } from '../lib/triviaPlayerStats';
import { mergeClassroomStudent } from '../lib/classroomBadges';
import ClassroomAvatarPicker from '../components/ClassroomAvatarPicker';

function PointControls({ student, onAdjust, busy, size = 'md' }) {
  if (!student) return null;
  const step = size === 'lg' ? [1, 5] : [1];
  return (
    <div
      className={`f-classroom-points-ctrl f-classroom-points-ctrl--${size}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Adjust class points"
    >
      {step.map((n) => (
        <span key={`minus-${n}`} className="f-classroom-points-ctrl-pair">
          <button
            type="button"
            className="f-classroom-pt-btn is-minus"
            disabled={busy}
            onClick={() => onAdjust(student.discordKey, -n)}
            aria-label={`Remove ${n} point${n === 1 ? '' : 's'}`}
          >
            −{n > 1 ? n : ''}
          </button>
          <button
            type="button"
            className="f-classroom-pt-btn is-plus"
            disabled={busy}
            onClick={() => onAdjust(student.discordKey, n)}
            aria-label={`Add ${n} point${n === 1 ? '' : 's'}`}
          >
            +{n > 1 ? n : ''}
          </button>
        </span>
      ))}
    </div>
  );
}

function PlayerDetail({ student, onAdjust, busy, onChangeAvatar }) {
  if (!student) return null;
  return (
    <div className="f-classroom-detail">
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
        </div>
        <div className="f-classroom-detail-points-col">
          <div className="f-classroom-detail-points">{student.classroomPoints} pts</div>
          <p className="f-muted f-classroom-points-breakdown">
            {student.classroomAutoPoints} trivia
            {student.classroomBonus !== 0 ? (
              <>
                {' '}
                {student.classroomBonus > 0 ? '+' : ''}
                {student.classroomBonus} you
              </>
            ) : null}
          </p>
          <PointControls student={student} onAdjust={onAdjust} busy={busy} size="lg" />
        </div>
      </div>
      <div className="f-player-detail-grid">
        <div>
          <h4 className="f-player-detail-title">Trivia report card</h4>
          <ul className="f-player-attempt-list">
            {student.attempts.map((a) => (
              <li key={a.id}>
                <span className="f-player-attempt-quiz">{a.quizTitle}</span>
                <span className="f-player-attempt-score">
                  {a.score}/{a.maxScore} ({a.pct != null ? `${a.pct}%` : '—'})
                </span>
                <span className="f-muted">{a.durationLabel}</span>
              </li>
            ))}
          </ul>
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
        <span className="f-classroom-points-bubble">{student.classroomPoints}</span>
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
        {student.flagged ? (
          <span className="f-classroom-flag" title={`Review: ${student.flagLevel}`}>
            ⚑
          </span>
        ) : null}
      </button>
      <PointControls student={student} onAdjust={onAdjust} busy={busy} />
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
  const [avatarStudent, setAvatarStudent] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await hostApi('/api/trivia/host?action=analytics');
    setData(res);
    return res;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load classroom');
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = students.filter((s) => {
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
  }, [students, search, filter, sort]);

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
  const regularCount = students.filter((s) => s.isRegular).length;
  const totalPoints = students.reduce((n, s) => n + s.classroomPoints, 0);

  return (
    <HostShell active="classroom">
      <div className="f-classroom-hero">
        <div>
          <h1 className="f-classroom-title">Discord Classroom</h1>
          <p className="f-classroom-subtitle">
            ClassDojo energy — tap +/− to reward or deduct points. Trivia stats auto-fill; your
            adjustments save to the database.
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
              { label: 'Students', value: students.length, tone: 'cyan' },
              { label: 'Regulars (2+ trivias)', value: regularCount, tone: 'teal' },
              { label: 'Class points', value: totalPoints, tone: 'gold' },
              { label: 'Trivias hosted', value: (data.quizzes || []).length, tone: 'violet' },
            ]}
          />

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
              <select className="f-hub-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="regulars">Regulars first</option>
                <option value="trivias">Most trivias</option>
                <option value="points">Most points</option>
                <option value="recent">Recently active</option>
              </select>
            </label>
          </div>

          <div className="f-classroom-grid">
            {visible.map((s) => (
              <ClassroomCard
                key={s.discordKey}
                student={s}
                active={selectedKey === s.discordKey}
                onSelect={(key) => setSelectedKey(selectedKey === key ? null : key)}
                onAdjust={handleAdjust}
                busy={busyKey === s.discordKey}
              />
            ))}
          </div>

          {!visible.length ? (
            <p className="f-muted f-classroom-empty">No students match — they will appear after trivia.</p>
          ) : null}

          {selected ? (
            <div className="f-classroom-sheet">
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
                busy={busyKey === selected.discordKey}
                onChangeAvatar={() => setAvatarStudent(selected)}
              />
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
            +/− adjusts your manual bonus (saved in Supabase). Trivia auto-points refresh on sync.
            {data.profileSync?.tableMissing ? (
              <>
                {' '}
                Run <code>supabase/formative_trivia_player_profiles.sql</code> first.
              </>
            ) : null}
          </p>
        </>
      ) : null}
    </HostShell>
  );
}
