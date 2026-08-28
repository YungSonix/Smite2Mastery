import { useEffect, useMemo } from 'react';
import { liveSessionSummary } from '../lib/liveSessionStats';
import { formatIp } from '../lib/quizSettings';
import { formatDuration, responseDurationMs, responseLeftPage, responseTabAwayCount, scoredInsightQuestions } from '../lib/triviaInsights';
import { presenceLabel, presenceStatus } from '../lib/triviaPresence';
import { responsePercent, sortResponses } from '../lib/sortResponses';
import { useLiveClock } from '../lib/useLiveClock';
import { PaginationBar, usePagination } from '../lib/usePagination';

export default function ResponsesGrid({
  questions,
  responses,
  sessions,
  sessionsError,
  sortBy = 'submitted_desc',
  onSelect,
  selectedId,
  onLiveSelect,
  selectedLiveId,
  onQuestionSelect,
  selectedQuestionId,
}) {
  const scored = scoredInsightQuestions(questions);

  const sorted = useMemo(() => sortResponses(responses, sortBy), [responses, sortBy]);
  const { page, setPage, pageCount, slice, from, to, reset } = usePagination(sorted.length);

  useEffect(() => {
    reset();
  }, [sortBy, responses?.length, reset]);

  const visibleRows = slice(sorted);

  const totalsAvg = (() => {
    if (!responses?.length) return 0;
    const sum = responses.reduce((acc, r) => {
      const max = Number(r.max_score) || 0;
      const score = Number(r.score) || 0;
      return acc + (max > 0 ? score / max : 0);
    }, 0);
    return Math.round((sum / responses.length) * 100);
  })();

  const qAvg = (qid) => {
    if (!responses?.length) return null;
    let n = 0;
    let ok = 0;
    for (const r of responses) {
      const v = r.per_question?.[qid];
      if (v == null) continue;
      n += 1;
      ok += Number(v) ? 1 : 0;
    }
    if (!n) return null;
    return Math.round((ok / n) * 100);
  };

  const live = (sessions || []).filter((s) => presenceStatus(s) !== 'gone');
  const liveNow = useLiveClock(live.length > 0);
  const submittedNames = new Set(
    (responses || []).map((r) => String(r.discord_username || '').toLowerCase())
  );

  const openQuestion = (q, e) => {
    e?.stopPropagation?.();
    onQuestionSelect?.(q);
  };

  return (
    <div className="f-grid-wrap f-responses-shell">
      {sessionsError ? (
        <p className="f-error" style={{ padding: '4px 4px 12px' }}>
          {sessionsError}
        </p>
      ) : null}
      {live.length ? (
        <div className="f-live-block f-panel-card">
          <h3 className="f-live-heading">
            Live now <span className="f-live-count">{live.length}</span>
          </h3>
          <p className="f-muted f-live-note">
            Click a row to open their in-progress answers. Tab in background = they left this quiz tab.
            Left this page = they closed it or navigated away.
          </p>
          <table className="f-grid f-live-grid">
            <thead>
              <tr>
                <th className="col-discord">Discord</th>
                <th className="col-ingame">In-Game</th>
                <th className="col-status">Status</th>
                <th className="col-progress">Answered</th>
                <th className="col-focus">Left tab</th>
                <th className="ip-col">IP</th>
              </tr>
            </thead>
            <tbody>
              {live.map((s) => {
                const status = presenceStatus(s);
                const initial = (s.discord_username || '?').charAt(0).toUpperCase();
                const qn = Number(s.question_count) || 0;
                const an = Number(s.answered_count) || 0;
                const liveHint = liveSessionSummary(s, { questions, now: liveNow });
                return (
                  <tr
                    key={s.id || s.discord_username}
                    className={selectedLiveId === s.id ? 'is-selected is-live' : 'is-live'}
                    style={{ cursor: onLiveSelect ? 'pointer' : undefined }}
                    onClick={() => onLiveSelect?.(s)}
                  >
                    <td className="col-discord">
                      <div className="f-student">
                        <div className="f-avatar" style={{ width: 22, height: 22, fontSize: 11 }}>
                          {initial}
                        </div>
                        <div className="f-student-text">
                          <span className="f-student-name" title={s.discord_username}>
                            {s.discord_username}
                            {submittedNames.has(String(s.discord_username || '').toLowerCase())
                              ? ' (submitted)'
                              : ''}
                          </span>
                          <span className="f-live-row-hint" title="Question progress and time on quiz">
                            {liveHint.text}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-ingame" title={s.ingame_name || ''}>
                      {s.ingame_name || '—'}
                    </td>
                    <td className="col-status">
                      <span className={`f-status-pill is-${status}`}>{presenceLabel(status)}</span>
                    </td>
                    <td className="col-progress">{qn ? `${an}/${qn}` : an || '—'}</td>
                    <td className="col-focus" title="Times the quiz tab went to the background">
                      {Number(s.hidden_count) || 0}
                    </td>
                    <td className="ip-col">
                      <code className="f-ip" title={s.ip_address || ''}>
                        {formatIp(s.ip_address)}
                      </code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="f-muted" style={{ padding: '4px 4px 12px' }}>
          No one is in the quiz right now. They show up here after Next, including people who
          already submitted if they open it again.
        </p>
      )}
      <div className="f-panel-card f-submissions-card">
        <div className="f-panel-card-head">
          <h3 className="f-panel-card-title">Submissions</h3>
          <span className="f-live-count">{responses?.length || 0}</span>
        </div>
        <table className="f-grid">
          <thead>
            <tr>
              <th className="col-discord">Discord</th>
              <th className="col-ingame">In-Game</th>
              <th className="totals-col">%</th>
              <th className="col-time" title="Time spent on the quiz">
                Time
              </th>
              <th className="col-tab-away" title="Times the quiz tab went to the background">
                Tab away
              </th>
              <th className="col-left-page" title="Closed or navigated away before submit">
                Left page
              </th>
              {scored.map((q, i) => (
                <th key={q.id} className={`col-q ${selectedQuestionId === q.id ? 'is-q-active' : ''}`}>
                  <button
                    type="button"
                    className="f-q-col-btn"
                    title={`Review everyone’s answers for question ${i + 1}`}
                    onClick={(e) => openQuestion(q, e)}
                  >
                    {i + 1}
                  </button>
                </th>
              ))}
              <th className="ip-col">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="f-muted col-discord">Avg</td>
              <td className="f-muted col-ingame">—</td>
              <td className="totals-col">{totalsAvg}%</td>
              <td className="col-time f-muted">—</td>
              <td className="col-tab-away f-muted">—</td>
              <td className="col-left-page f-muted">—</td>
              {scored.map((q) => {
                const a = qAvg(q.id);
                return (
                  <td
                    key={q.id}
                    className={`col-q ${selectedQuestionId === q.id ? 'is-q-active' : ''}`}
                    onClick={(e) => openQuestion(q, e)}
                    style={{ cursor: onQuestionSelect ? 'pointer' : undefined }}
                  >
                    <div
                      className={`f-bar ${a == null ? 'empty' : a >= 50 ? 'ok' : 'bad'}`}
                      title={a == null ? '—' : `${a}%`}
                      style={a != null ? { opacity: 0.35 + (a / 100) * 0.65 } : undefined}
                    />
                  </td>
                );
              })}
              <td className="ip-col f-muted">—</td>
            </tr>
            {visibleRows.map((r) => {
              const pct = responsePercent(r);
              const took = formatDuration(responseDurationMs(r));
              const tabAway = responseTabAwayCount(r);
              const leftPage = responseLeftPage(r);
              const initial = (r.discord_username || '?').charAt(0).toUpperCase();
              return (
                <tr
                  key={r.id}
                  className={selectedId === r.id ? 'is-selected' : undefined}
                  style={{ cursor: onSelect ? 'pointer' : 'default' }}
                  onClick={() => onSelect?.(r)}
                >
                  <td className="col-discord">
                    <div className="f-student">
                      <div className="f-avatar" style={{ width: 22, height: 22, fontSize: 11 }}>
                        {initial}
                      </div>
                      <span className="f-student-name" title={r.discord_username}>
                        {r.discord_username}
                      </span>
                    </div>
                  </td>
                  <td className="col-ingame" title={r.ingame_name || ''}>
                    {r.ingame_name || '—'}
                  </td>
                  <td className="totals-col">{pct}%</td>
                  <td className="col-time" title={took === '—' ? 'No finish time on older takes' : took}>
                    {took}
                  </td>
                  <td className="col-tab-away" title="Tab background count during take">
                    {tabAway}
                  </td>
                  <td className="col-left-page" title={leftPage ? 'Left before submit' : 'Stayed on page'}>
                    {leftPage ? 'Yes' : '—'}
                  </td>
                  {scored.map((q) => {
                    const v = r.per_question?.[q.id];
                    const cls = v == null ? 'empty' : Number(v) ? 'ok' : 'bad';
                    return (
                      <td
                        key={q.id}
                        className={`col-q ${selectedQuestionId === q.id ? 'is-q-active' : ''}`}
                        onClick={(e) => openQuestion(q, e)}
                        style={{ cursor: onQuestionSelect ? 'pointer' : undefined }}
                      >
                        <div
                          className={`f-bar ${cls}`}
                          title={v == null ? '—' : Number(v) ? 'Correct' : 'Wrong'}
                        />
                      </td>
                    );
                  })}
                  <td className="ip-col">
                    <code className="f-ip" title={r.ip_address || ''}>
                      {formatIp(r.ip_address)}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <PaginationBar
          page={page}
          pageCount={pageCount}
          from={from}
          to={to}
          total={sorted.length}
          onPage={setPage}
        />
        {!responses?.length ? (
          <p className="f-muted" style={{ padding: '12px 4px' }}>
            No submissions yet. After someone takes the quiz, Discord, In-Game Name, and IP appear here
            (host-only). Local testing shows IP as localhost.
          </p>
        ) : null}
      </div>
    </div>
  );
}
