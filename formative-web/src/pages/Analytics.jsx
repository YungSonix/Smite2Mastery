import { useEffect, useMemo, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import HostShell from '../components/HostShell';
import { BarChart, Donut, KpiStrip } from '../components/HostCharts';
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

function PlayerDetail({ player }) {
  if (!player) return null;
  return (
    <div className="f-player-detail">
      <div className="f-player-detail-grid">
        <div>
          <h4 className="f-player-detail-title">Per trivia</h4>
          <ul className="f-player-attempt-list">
            {player.attempts.map((a) => (
              <li key={a.id}>
                <span className="f-player-attempt-quiz">{a.quizTitle}</span>
                <span className="f-player-attempt-score">
                  {a.score}/{a.maxScore} ({a.pct != null ? `${a.pct}%` : '—'})
                </span>
                <span className="f-muted">{a.durationLabel}</span>
                <span className="f-muted f-player-attempt-date">
                  {String(a.submittedAt || '').slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="f-player-detail-title">Usually gets right</h4>
          {player.strongQuestions.length ? (
            <ul className="f-player-topic-list is-strong">
              {player.strongQuestions.map((q) => (
                <li key={q.label}>
                  <span>{q.label}</span>
                  <span className="f-muted">
                    {q.avgPct}% · {q.attempts}×
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="f-muted">Not enough repeat questions yet (needs 2+ tries).</p>
          )}
          <h4 className="f-player-detail-title">Usually misses</h4>
          {player.weakQuestions.length ? (
            <ul className="f-player-topic-list is-weak">
              {player.weakQuestions.map((q) => (
                <li key={q.label}>
                  <span>{q.label}</span>
                  <span className="f-muted">
                    {q.avgPct}% · {q.attempts}×
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="f-muted">No clear weak spots yet (or not enough repeat questions).</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
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
  const [selectedKey, setSelectedKey] = useState(null);
  const [minTrivias, setMinTrivias] = useState(1);
  const [giveawayMinTrivias, setGiveawayMinTrivias] = useState(2);
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

  const { page, setPage, pageCount, slice, from, to } = usePagination(visiblePlayers.length, 25);
  const pagePlayers = slice(visiblePlayers);
  const selectedPlayer = visiblePlayers.find((p) => p.discordKey === selectedKey) || null;

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
      .map(([label, value]) => ({ label, value }));
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
  }, [filteredResponses, integrityIndex, allPlayers.length]);

  return (
    <HostShell active="analytics">
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
      {loading ? <p className="f-muted">Loading…</p> : null}

      {!loading && tab === 'players' ? (
        <>
          <KpiStrip
            items={[
              { label: 'Unique players', value: allPlayers.length, tone: 'cyan' },
              { label: 'Repeat (2+ trivias)', value: allPlayers.filter((p) => p.triviasDone >= 2).length, tone: 'teal' },
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
              onClick={() =>
                downloadCsv('trivia-players.csv', playersToCsv(visiblePlayers))
              }
            >
              Export CSV
            </button>
          </div>

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
                  const active = selectedKey === p.discordKey;
                  return (
                    <Fragment key={p.discordKey}>
                      <tr
                        className={active ? 'is-selected' : undefined}
                        onClick={() => setSelectedKey(active ? null : p.discordKey)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="col-rank">{rank}</td>
                        <td>
                          {p.discord}
                          {p.flagged ? (
                            <span className="f-player-flag" title={`Review flag: ${p.flagLevel}`}>
                              ⚑
                            </span>
                          ) : null}
                        </td>
                        <td>{p.ingame}</td>
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
                      {active ? (
                        <tr key={`${p.discordKey}-detail`} className="f-player-detail-row">
                          <td colSpan={9}>
                            <PlayerDetail player={p} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            pageCount={pageCount}
            from={from}
            to={to}
            total={visiblePlayers.length}
            onPage={setPage}
            pageSize={25}
          />

          <p className="f-muted f-analytics-foot">
            Click a row for per-trivia scores, time, and what they usually get right or wrong. Practice
            test-link submissions are excluded.
            {data.profileSync?.tableMissing ? (
              <>
                {' '}
                Run <code>supabase/formative_trivia_player_profiles.sql</code> in Supabase, then reload —
                player rows are not persisted yet.
              </>
            ) : data.profileSync?.synced != null ? (
              <> {data.profileSync.synced} player(s) saved to database.</>
            ) : (data.playerProfiles || []).length ? (
              <> {(data.playerProfiles || []).length} player(s) in database.</>
            ) : null}
          </p>
        </>
      ) : null}

      {!loading && tab === 'giveaway' ? (
        <>
          <p className="f-muted f-analytics-intro">
            Players who show up consistently — filter for your giveaway. Export the list when ready.
          </p>
          <div className="f-analytics-toolbar f-analytics-toolbar--players">
            <label className="f-inline-field">
              Min trivias entered
              <input
                type="number"
                min={1}
                max={99}
                value={giveawayMinTrivias}
                onChange={(e) => setGiveawayMinTrivias(Math.max(1, Number(e.target.value) || 1))}
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
            >
              Export pool ({wheelExportPool.length || giveawayPool.length})
            </button>
          </div>

          <ClassroomSpinWheel
            filteredStudents={giveawayPool}
            classRoster={allPlayers}
            poolLabel="giveaway pool"
            onPoolChange={setWheelExportPool}
          />

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
                  <tr key={p.discordKey}>
                    <td>{i + 1}</td>
                    <td>{p.discord}</td>
                    <td>{p.ingame}</td>
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
          {giveawayPool.length > 100 ? (
            <p className="f-muted">Showing first 100 — export CSV for the full list.</p>
          ) : null}
        </>
      ) : null}

      {!loading && tab === 'overview' ? (
        <>
          <div className="f-kpi-row">
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
            <BarChart title="Score distribution" rows={overviewStats.buckets} glow tone />
            <Donut title="Pass threshold (≥70%)" parts={overviewStats.passFail} glow />
            <BarChart title="Submissions by day (last 14)" rows={overviewStats.dayRows} glow tone />
          </div>
        </>
      ) : null}
    </HostShell>
  );
}
