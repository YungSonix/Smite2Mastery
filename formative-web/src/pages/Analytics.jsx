import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HostShell from '../components/HostShell';
import { ColumnHistogram, Donut, KpiStrip } from '../components/HostCharts';
import { hostApi } from '../lib/api';
import { PaginationBar, usePagination } from '../lib/usePagination';
import { buildSubmissionIntegrity } from '../lib/submissionIntegrity';
import {
  buildPlayerLeaderboard,
  filterGiveawayCandidates,
  playersToCsv,
  wheelPoolToCsv,
} from '../lib/triviaPlayerStats';
import ClassroomSpinWheel from '../components/ClassroomSpinWheel';

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function studentProfilePath(discordKey) {
  return `/classroom/student/${encodeURIComponent(discordKey)}`;
}

function PlayerProfileLink({ discordKey, children }) {
  if (!discordKey) return children;
  return (
    <Link
      to={studentProfilePath(discordKey)}
      className="f-player-profile-link"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

function AnalyticsEmptyState({ title, body, actions }) {
  return (
    <div className="f-analytics-empty">
      <p className="f-analytics-empty-title">{title}</p>
      {body ? <p className="f-muted f-analytics-empty-body">{body}</p> : null}
      {actions?.length ? (
        <div className="f-analytics-empty-actions">
          {actions.map((action) =>
            action.to ? (
              <Link key={action.label} to={action.to} className="f-outline-btn f-compact">
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                className="f-outline-btn f-compact"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    quizzes: [],
    questions: [],
    responses: [],
    playerProfiles: [],
    profileSync: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('players');
  const [quizFilter, setQuizFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [minTrivias, setMinTrivias] = useState(1);
  const [giveawayMinTrivias, setGiveawayMinTrivias] = useState(1);
  const [excludeFlagged, setExcludeFlagged] = useState(true);
  const [wheelExportPool, setWheelExportPool] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await hostApi('/api/trivia/host?action=analytics&syncProfiles=0');
        if (alive) setData(res);
      } catch (e) {
        const network = e.message === 'Failed to fetch' || e.name === 'TypeError';
        const timedOut =
          e.status === 504 ||
          e.status === 503 ||
          /timeout|timed out|gateway|function_invocation|load failed/i.test(String(e.message || ''));
        if (alive) {
          setError(
            network || timedOut
              ? 'Analytics took too long to load. Refresh once — profile rebuild is no longer run on every open.'
              : e.message || 'Failed to load analytics'
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filteredResponses = useMemo(() => {
    if (quizFilter === 'all') return data.responses || [];
    return (data.responses || []).filter((r) => r.quiz_id === quizFilter);
  }, [data.responses, quizFilter]);

  const integrityIndex = useMemo(
    () => buildSubmissionIntegrity(filteredResponses),
    [filteredResponses]
  );

  const allPlayers = useMemo(
    () =>
      buildPlayerLeaderboard(filteredResponses, {
        quizzes: data.quizzes,
        questions: data.questions,
        integrityIndex,
      }),
    [filteredResponses, data.quizzes, data.questions, integrityIndex]
  );

  const visiblePlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPlayers.filter((p) => {
      if (p.triviasDone < minTrivias) return false;
      if (!q) return true;
      return (
        p.discord.toLowerCase().includes(q) ||
        p.ingame.toLowerCase().includes(q) ||
        p.discordKey.includes(q.replace(/[._\s-]+/g, ''))
      );
    });
  }, [allPlayers, search, minTrivias]);

  const giveawayPool = useMemo(
    () =>
      filterGiveawayCandidates(allPlayers, {
        minTrivias: giveawayMinTrivias,
        excludeFlagged,
      }),
    [allPlayers, giveawayMinTrivias, excludeFlagged]
  );

  const giveawayStats = useMemo(() => {
    let excludedTrivias = 0;
    let excludedFlagged = 0;
    for (const p of allPlayers) {
      if (p.triviasDone < giveawayMinTrivias) excludedTrivias += 1;
      else if (excludeFlagged && p.flagged) excludedFlagged += 1;
    }
    return {
      qualified: giveawayPool.length,
      excludedTrivias,
      excludedFlagged,
      excludedTotal: excludedTrivias + excludedFlagged,
    };
  }, [allPlayers, giveawayMinTrivias, excludeFlagged, giveawayPool.length]);

  const { page, setPage, pageCount, slice, from, to } = usePagination(visiblePlayers.length, 25);
  const pagePlayers = slice(visiblePlayers);

  const overviewStats = useMemo(() => {
    const responses = filteredResponses;
    const n = responses.length;
    const pcts = responses
      .map((r) => {
        const max = Number(r.max_score) || 0;
        return max > 0 ? (Number(r.score) / max) * 100 : null;
      })
      .filter((x) => x != null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    let flagged = 0;
    for (const r of responses) {
      const entry = integrityIndex.get(r.id);
      if (entry?.level && entry.level !== 'none') flagged += 1;
    }
    const pass = pcts.filter((p) => p >= 70).length;
    const fail = pcts.length - pass;
    const buckets = [
      { label: '0–20%', value: 0 },
      { label: '21–40%', value: 0 },
      { label: '41–60%', value: 0 },
      { label: '61–80%', value: 0 },
      { label: '81–100%', value: 0 },
    ];
    for (const p of pcts) {
      if (p <= 20) buckets[0].value += 1;
      else if (p <= 40) buckets[1].value += 1;
      else if (p <= 60) buckets[2].value += 1;
      else if (p <= 80) buckets[3].value += 1;
      else buckets[4].value += 1;
    }
    const byDay = {};
    for (const r of responses) {
      const d = String(r.submitted_at || '').slice(0, 10) || 'unknown';
      byDay[d] = (byDay[d] || 0) + 1;
    }
    const dayRows = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([label, value]) => ({ label: label.slice(5) || label, value }));
    return {
      n,
      avg,
      flagged,
      buckets,
      dayRows,
      passFail: [
        { label: '≥70%', value: pass, color: '#2dd4bf' },
        { label: '<70%', value: fail, color: '#f87171' },
      ],
      uniquePlayers: allPlayers.length,
      repeatPlayers: allPlayers.filter((p) => p.triviasDone >= 2).length,
    };
  }, [filteredResponses, integrityIndex, allPlayers]);

  const openStudent = (discordKey) => {
    navigate(studentProfilePath(discordKey));
  };

  const exportPoolCount = wheelExportPool.length || giveawayPool.length;

  return (
    <HostShell active="analytics" wide>
      <div className="f-analytics-page">
        <div className="f-welcome-row">
          <h1>Analytics</h1>
          <div className="f-analytics-toolbar">
            <Link to="/classroom" className="f-outline-btn f-compact">
              ← Discord Classroom
            </Link>
            <select
              className="f-hub-select"
              value={quizFilter}
              onChange={(e) => setQuizFilter(e.target.value)}
            >
              <option value="all">All quizzes</option>
              {(data.quizzes || []).map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="f-seg-nav f-analytics-tabs">
          <button
            type="button"
            className={tab === 'players' ? 'is-active' : ''}
            onClick={() => setTab('players')}
          >
            Players
          </button>
          <button
            type="button"
            className={tab === 'giveaway' ? 'is-active' : ''}
            onClick={() => setTab('giveaway')}
          >
            Giveaway pool
          </button>
          <button
            type="button"
            className={tab === 'overview' ? 'is-active' : ''}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
        </div>

        {error ? <div className="f-error">{error}</div> : null}

        {loading ? (
          <div className="f-analytics-loading">
            <p className="f-muted">Loading analytics…</p>
            <p className="f-muted f-analytics-loading-hint">
              Pulling submissions and player stats. Large events may take a few seconds.
            </p>
          </div>
        ) : null}

        {!loading && !filteredResponses.length ? (
          <AnalyticsEmptyState
            title="No submissions yet"
            body="Host a trivia and share the take link. Responses show up here after players finish."
            actions={[
              { label: 'Open classroom', to: '/classroom' },
              { label: 'Host hub', to: '/' },
            ]}
          />
        ) : null}

        {!loading && filteredResponses.length && tab === 'players' ? (
          <>
            <KpiStrip
              items={[
                { label: 'Unique players', value: allPlayers.length, tone: 'cyan' },
                {
                  label: 'Repeat (2+ trivias)',
                  value: allPlayers.filter((p) => p.triviasDone >= 2).length,
                  tone: 'teal',
                },
                { label: 'Submissions', value: filteredResponses.length, tone: 'gold' },
                { label: 'Quizzes hosted', value: (data.quizzes || []).length, tone: 'violet' },
              ]}
            />

            <div className="f-analytics-toolbar f-analytics-toolbar--players">
              <input
                type="search"
                className="f-hub-input"
                placeholder="Search Discord or in-game name…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
              <label className="f-inline-field">
                Min trivias
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={minTrivias}
                  onChange={(e) => {
                    setMinTrivias(Math.max(1, Number(e.target.value) || 1));
                    setPage(0);
                  }}
                />
              </label>
              <button
                type="button"
                className="f-outline-btn f-compact"
                onClick={() => downloadCsv('trivia-players.csv', playersToCsv(visiblePlayers))}
              >
                Export CSV
              </button>
            </div>

            {!visiblePlayers.length ? (
              <AnalyticsEmptyState
                title="No players match your filters"
                body={
                  minTrivias > 1
                    ? `Try lowering min trivias (currently ${minTrivias}) or clear your search.`
                    : 'Clear your search or pick a different quiz filter.'
                }
                actions={
                  minTrivias > 1
                    ? [{ label: 'Set min trivias to 1', onClick: () => setMinTrivias(1) }]
                    : undefined
                }
              />
            ) : (
              <div className="f-player-table-wrap">
                <table className="f-grid f-player-table">
                  <thead>
                    <tr>
                      <th className="col-rank">#</th>
                      <th>Discord</th>
                      <th>In-game</th>
                      <th>Trivias</th>
                      <th>Total pts</th>
                      <th>Avg / trivia</th>
                      <th>Avg %</th>
                      <th>Avg time</th>
                      <th>Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagePlayers.map((p, i) => {
                      const rank = from + i;
                      return (
                        <tr
                          key={p.discordKey}
                          className="f-analytics-player-row"
                          onClick={() => openStudent(p.discordKey)}
                          title="Open student profile"
                        >
                          <td className="col-rank">{rank}</td>
                          <td>
                            <PlayerProfileLink discordKey={p.discordKey}>{p.discord}</PlayerProfileLink>
                            {p.flagged ? (
                              <span className="f-player-flag" title={`Review flag: ${p.flagLevel}`}>
                                ⚑
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <PlayerProfileLink discordKey={p.discordKey}>{p.ingame}</PlayerProfileLink>
                          </td>
                          <td>{p.triviasDone}</td>
                          <td>
                            {p.totalScore}/{p.totalMax}
                            {p.totalPct != null ? (
                              <span className="f-muted"> ({p.totalPct}%)</span>
                            ) : null}
                          </td>
                          <td>
                            {p.avgScore}/{p.avgMax}
                          </td>
                          <td>{p.avgPct != null ? `${p.avgPct}%` : '—'}</td>
                          <td>{p.avgDurationLabel}</td>
                          <td className="f-muted">{String(p.lastSubmittedAt || '').slice(0, 10)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {visiblePlayers.length ? (
              <PaginationBar
                page={page}
                pageCount={pageCount}
                from={from}
                to={to}
                total={visiblePlayers.length}
                onPage={setPage}
                pageSize={25}
              />
            ) : null}

            <p className="f-muted f-analytics-foot">
              Click a row or player name to open the student profile — per-trivia scores, weak spots, and
              classroom points. Practice test-link submissions are excluded.
              {data.profileSync?.tableMissing ? (
                <>
                  {' '}
                  Run <code>supabase/formative_trivia_player_profiles.sql</code> in Supabase, then
                  reload — player rows are not persisted yet.
                </>
              ) : data.profileSync?.synced != null ? (
                <> {data.profileSync.synced} player(s) saved to database.</>
              ) : (data.playerProfiles || []).length ? (
                <> {(data.playerProfiles || []).length} player(s) in database.</>
              ) : null}
            </p>
          </>
        ) : null}

        {!loading && filteredResponses.length && tab === 'giveaway' ? (
          <>
            <p className="f-muted f-analytics-intro">
              Players who show up consistently — filter for your giveaway. Export the list when ready.
            </p>

            <KpiStrip
              items={[
                { label: 'Qualified', value: giveawayStats.qualified, tone: 'cyan' },
                {
                  label: 'Excluded (min trivias)',
                  value: giveawayStats.excludedTrivias,
                  tone: 'gold',
                },
                {
                  label: 'Excluded (review flags)',
                  value: giveawayStats.excludedFlagged,
                  tone: 'violet',
                },
                { label: 'Roster total', value: allPlayers.length, tone: 'teal' },
              ]}
            />

            <div className="f-analytics-toolbar f-analytics-toolbar--players">
              <label className="f-inline-field">
                Min trivias entered
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={giveawayMinTrivias}
                  onChange={(e) =>
                    setGiveawayMinTrivias(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
              <label className="f-inline-check">
                <input
                  type="checkbox"
                  checked={excludeFlagged}
                  onChange={(e) => setExcludeFlagged(e.target.checked)}
                />
                Exclude review flags
              </label>
              <span className="f-muted f-analytics-pool-count">
                {giveawayStats.qualified} qualified · {giveawayStats.excludedTotal} excluded
              </span>
              <button
                type="button"
                className="f-outline-btn f-compact"
                onClick={() =>
                  downloadCsv(
                    'trivia-giveaway-pool.csv',
                    wheelExportPool.length
                      ? wheelPoolToCsv(wheelExportPool)
                      : playersToCsv(giveawayPool)
                  )
                }
                disabled={!exportPoolCount}
              >
                Export pool ({exportPoolCount})
              </button>
            </div>

            <ClassroomSpinWheel
              filteredStudents={giveawayPool}
              classRoster={allPlayers}
              poolLabel="giveaway pool"
              onPoolChange={setWheelExportPool}
            />

            {!giveawayPool.length ? (
              <AnalyticsEmptyState
                title="No one qualifies yet"
                body={
                  giveawayMinTrivias > 1
                    ? `${giveawayStats.excludedTrivias} player(s) need more trivias (min is ${giveawayMinTrivias}). Lower the threshold or use Add all from class on the wheel.`
                    : excludeFlagged && giveawayStats.excludedFlagged
                      ? `${giveawayStats.excludedFlagged} player(s) are flagged for review. Uncheck “Exclude review flags” or add names manually to the wheel.`
                      : 'Add names manually on the wheel or import the full classroom roster.'
                }
                actions={[
                  ...(giveawayMinTrivias > 1
                    ? [{ label: 'Set min trivias to 1', onClick: () => setGiveawayMinTrivias(1) }]
                    : []),
                  { label: 'View all players', onClick: () => setTab('players') },
                ]}
              />
            ) : (
              <div className="f-player-table-wrap">
                <table className="f-grid f-player-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Discord</th>
                      <th>In-game</th>
                      <th>Trivias</th>
                      <th>Avg %</th>
                      <th>Total pts</th>
                      <th>Avg time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {giveawayPool.slice(0, 100).map((p, i) => (
                      <tr
                        key={p.discordKey}
                        className="f-analytics-player-row"
                        onClick={() => openStudent(p.discordKey)}
                        title="Open student profile"
                      >
                        <td>{i + 1}</td>
                        <td>
                          <PlayerProfileLink discordKey={p.discordKey}>{p.discord}</PlayerProfileLink>
                        </td>
                        <td>
                          <PlayerProfileLink discordKey={p.discordKey}>{p.ingame}</PlayerProfileLink>
                        </td>
                        <td>{p.triviasDone}</td>
                        <td>{p.avgPct != null ? `${p.avgPct}%` : '—'}</td>
                        <td>
                          {p.totalScore}/{p.totalMax}
                        </td>
                        <td>{p.avgDurationLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {giveawayPool.length > 100 ? (
              <p className="f-muted">Showing first 100 — export CSV for the full list.</p>
            ) : null}
          </>
        ) : null}

        {!loading && filteredResponses.length && tab === 'overview' ? (
          <>
            <div className="f-kpi-row f-kpi-row--insights">
              <div className="f-kpi">
                <div className="f-kpi-label">Submissions</div>
                <div className="f-kpi-value">{overviewStats.n}</div>
              </div>
              <div className="f-kpi">
                <div className="f-kpi-label">Avg score</div>
                <div className="f-kpi-value">{overviewStats.avg}%</div>
              </div>
              <div className="f-kpi">
                <div className="f-kpi-label">Unique players</div>
                <div className="f-kpi-value">{overviewStats.uniquePlayers}</div>
              </div>
              <div className="f-kpi">
                <div className="f-kpi-label">Review flags</div>
                <div className="f-kpi-value">{overviewStats.flagged}</div>
              </div>
            </div>

            <div className="f-analytics-grid f-analytics-grid--insights">
              <div className="f-insights-span-6">
                <ColumnHistogram
                  title="Score distribution"
                  rows={overviewStats.buckets}
                  glow
                  empty="No scored submissions in this filter yet."
                  hint={`${overviewStats.n} submission${overviewStats.n === 1 ? '' : 's'} in view`}
                />
              </div>
              <div className="f-insights-span-6">
                <Donut
                  title="Pass threshold (≥70%)"
                  parts={overviewStats.passFail}
                  center={overviewStats.n ? `${overviewStats.avg}%` : ''}
                  glow
                  empty="No scored submissions yet."
                />
              </div>
              <div className="f-insights-span-12">
                <ColumnHistogram
                  title="Submissions by day (last 14)"
                  rows={overviewStats.dayRows}
                  glow
                  empty="No dated submissions yet."
                  hint="Taller bar = more finishes that day"
                />
              </div>
            </div>

            <p className="f-muted f-analytics-foot">
              {overviewStats.repeatPlayers} player
              {overviewStats.repeatPlayers === 1 ? '' : 's'} entered 2+ trivias. Open{' '}
              <button type="button" className="f-link-btn" onClick={() => setTab('giveaway')}>
                Giveaway pool
              </button>{' '}
              to spin a winner or export entrants.
            </p>
          </>
        ) : null}
      </div>
    </HostShell>
  );
}

