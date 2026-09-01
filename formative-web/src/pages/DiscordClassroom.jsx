import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HostShell from '../components/HostShell';
import { KpiStrip } from '../components/HostCharts';
import { hostApi } from '../lib/api';
import { formatClassPoints } from '../lib/classroomBadges';
import { buildClassNextTriviaRecipe } from '../lib/classroomThesis';
import { useClassroomData } from '../lib/useClassroomData';
import { PaginationBar, usePagination } from '../lib/usePagination';
import { PointControls } from '../components/ClassroomStudentDetail';

const CLASSROOM_PAGE_SIZE = 30;
const SCORING_HELP_STORAGE_KEY = 'classroom_scoring_help_open';

function readScoringHelpOpen() {
  try {
    return localStorage.getItem(SCORING_HELP_STORAGE_KEY) === 'expanded';
  } catch {
    return false;
  }
}

const BULK_DELTAS = [
  { delta: 1, label: '+1 everyone' },
  { delta: -1, label: '−1 everyone' },
  { delta: 0.5, label: '+½ everyone' },
  { delta: -0.5, label: '−½ everyone' },
  { delta: 5, label: '+5 everyone' },
  { delta: -5, label: '−5 everyone' },
];

function ClassroomCard({ student, onSelect, onAdjust, busy }) {
  return (
    <div
      className={`f-classroom-card-wrap ${student.isRegular ? 'is-regular' : ''}`}
    >
      <div className="f-classroom-card-row">
        <button
          type="button"
          className="f-classroom-card"
          onClick={() => onSelect(student.discordKey)}
        >
          {student.isRegular ? <span className="f-classroom-regular-tag">Regular</span> : null}
          <span className="f-classroom-points-bubble">
            {formatClassPoints(student.classroomPoints)}
          </span>
          <div className="f-classroom-card-body">
            <div className="f-classroom-avatar-ring">
              <img src={student.avatarUrl} alt="" className="f-classroom-avatar" loading="lazy" />
            </div>
            <div className="f-classroom-card-text">
              <div className="f-classroom-card-discord">{student.discord}</div>
              <div className="f-classroom-card-name">{student.ingame}</div>
              <div className="f-classroom-card-stats">
                <span>
                  {student.triviasDone} trivia{student.triviasDone === 1 ? '' : 's'}
                </span>
                <span>{student.avgPct != null ? `${student.avgPct}% avg` : '—'}</span>
              </div>
            </div>
          </div>
          {student.flagged ? (
            <span className="f-classroom-flag" title={`Review: ${student.flagLevel}`}>
              ⚑
            </span>
          ) : null}
        </button>
        <PointControls student={student} onAdjust={onAdjust} busy={busy} steps={[1]} />
      </div>
    </div>
  );
}

export default function DiscordClassroom() {
  const navigate = useNavigate();
  const { data, loading, error, setError, load, studentsWithThesis, upsertProfile } =
    useClassroomData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('regulars');
  const [busyKey, setBusyKey] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNote, setSyncNote] = useState('');
  const [scoringHelpOpen, setScoringHelpOpen] = useState(readScoringHelpOpen);

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
      if (sort === 'points') {
        const ptsDiff = b.classroomPoints - a.classroomPoints;
        if (ptsDiff !== 0) return ptsDiff;
        return String(a.lastSubmittedAt || '').localeCompare(String(b.lastSubmittedAt || ''));
      }
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

  const handleAdjust = useCallback(
    async (discordKey, delta) => {
      setBusyKey(discordKey);
      setError('');
      try {
        const res = await hostApi('/api/trivia/host', {
          method: 'POST',
          body: { action: 'classroom-points', discordKey, delta },
        });
        if (res.profile) upsertProfile(res.profile);
      } catch (e) {
        setError(e.message || 'Could not update points');
      } finally {
        setBusyKey(null);
      }
    },
    [upsertProfile, setError]
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
    [visible, bulkBusy, upsertProfile, setError]
  );

  const handleScoringHelpToggle = useCallback((e) => {
    const open = e.currentTarget.open;
    setScoringHelpOpen(open);
    try {
      localStorage.setItem(SCORING_HELP_STORAGE_KEY, open ? 'expanded' : 'collapsed');
    } catch {
      /* ignore */
    }
  }, []);

  const handleRecalculatePoints = useCallback(async () => {
    setSyncBusy(true);
    setSyncNote('');
    setError('');
    try {
      const res = await hostApi('/api/trivia/host', {
        method: 'POST',
        body: { action: 'sync-player-profiles', scope: 'host' },
      });
      await load();
      const n = res.synced ?? 0;
      setSyncNote(
        n
          ? `Recalculated trivia auto-points for ${n} student${n === 1 ? '' : 's'}.`
          : 'No student profiles needed updating.'
      );
    } catch (e) {
      setError(e.message || 'Could not recalculate class points');
    } finally {
      setSyncBusy(false);
    }
  }, [load, setError]);

  const openStudent = useCallback(
    (key) => {
      navigate(`/classroom/student/${encodeURIComponent(key)}`);
    },
    [navigate]
  );

  const regularCount = studentsWithThesis.filter((s) => s.isRegular).length;
  const totalPoints = studentsWithThesis.reduce((n, s) => n + s.classroomPoints, 0);

  return (
    <HostShell active="classroom">
      <div className="f-classroom-page">
        <div className="f-classroom-hero">
          <div className="f-classroom-hero-main">
            <h1 className="f-classroom-title">Discord Classroom</h1>
            <details
              className="f-classroom-scoring-details"
              open={scoringHelpOpen}
              onToggle={handleScoringHelpToggle}
            >
              <summary>
                How scoring works
                <span className="f-chevron" aria-hidden="true" />
              </summary>
              <div className="f-classroom-scoring-body">
                <p className="f-classroom-subtitle">
                  ClassDojo energy — tap +/− to reward or deduct manual bonus points. Trivia
                  auto-points factor in passes, first-day submits, placement, streaks, and perfect
                  scores.
                </p>
                <p className="f-muted f-pts-explain">
                  Class points = trivia auto-points + your manual bonus. Half points (+/− ½)
                  supported.
                </p>
                <div className="f-classroom-scoring-actions">
                  <button
                    type="button"
                    className="f-outline-btn f-compact"
                    disabled={syncBusy || loading}
                    onClick={handleRecalculatePoints}
                    title="Recompute trivia auto-points from submissions and save to database"
                  >
                    {syncBusy ? 'Recalculating…' : 'Recalculate class points'}
                  </button>
                  {syncNote ? (
                    <p className="f-muted f-classroom-sync-note" role="status">
                      {syncNote}
                    </p>
                  ) : null}
                </div>
              </div>
            </details>
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
                className="f-hub-input f-classroom-search"
                placeholder="Find a student…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="f-classroom-toolbar-right">
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
                  onSelect={openStudent}
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

            <p className="f-muted f-classroom-foot">
              +/− adjusts your manual bonus (saved in Supabase), including half points. Trivia
              auto-points recompute on profile sync (pass ≥70%, first-day, placement, perfect,
              streak). Class points = auto + manual bonus.
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
