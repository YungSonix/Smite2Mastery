import { formatIp } from '../lib/quizSettings';
import { presenceLabel, presenceStatus } from '../lib/triviaPresence';

export default function ResponsesGrid({
  questions,
  responses,
  sessions,
  sessionsError,
  onSelect,
  selectedId,
}) {
  const scored = (questions || []).filter(
    (q) =>
      !['image', 'content', 'audio', 'video', 'embed', 'file_response', 'audio_response', 'drawing'].includes(
        q.type
      ) &&
      !q.meta?.is_discord_gate &&
      !q.meta?.is_ingame_gate &&
      Number(q.points) > 0
  );

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
  const submittedNames = new Set(
    (responses || []).map((r) => String(r.discord_username || '').toLowerCase())
  );

  return (
    <div className="f-grid-wrap">
      {sessionsError ? (
        <p className="f-error" style={{ padding: '4px 4px 12px' }}>
          {sessionsError}
        </p>
      ) : null}
      {live.length ? (
        <div className="f-live-block">
          <h3 className="f-live-heading">
            Live now <span className="f-live-count">{live.length}</span>
          </h3>
          <p className="f-muted f-live-note">
            Tab in background = they left this quiz tab (notification, Discord, another site). Left
            this page = they closed it or opened a different page in the same tab. Neither shows
            where they went.
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
                return (
                  <tr key={s.id || s.discord_username}>
                    <td className="col-discord">
                      <div className="f-student">
                        <div className="f-avatar" style={{ width: 22, height: 22, fontSize: 11 }}>
                          {initial}
                        </div>
                        <span className="f-student-name" title={s.discord_username}>
                          {s.discord_username}
                          {submittedNames.has(String(s.discord_username || '').toLowerCase())
                            ? ' (submitted)'
                            : ''}
                        </span>
                      </div>
                    </td>
                    <td className="col-ingame" title={s.ingame_name || ''}>
                      {s.ingame_name || '—'}
                    </td>
                    <td className="col-status">
                      <span className={`f-status-pill is-${status}`}>{presenceLabel(status)}</span>
                    </td>
                    <td className="col-progress">
                      {qn ? `${an}/${qn}` : an || '—'}
                    </td>
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
      <table className="f-grid">
        <thead>
          <tr>
            <th className="col-discord">
              Discord <span className="f-ok-bolt">⚡</span>
            </th>
            <th className="col-ingame">In-Game</th>
            <th className="totals-col">Tot</th>
            {scored.map((q, i) => (
              <th key={q.id} className="col-q">
                {i + 1}
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
            {scored.map((q) => {
              const a = qAvg(q.id);
              return (
                <td key={q.id} className="col-q">
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
          {(responses || []).map((r) => {
            const pct =
              Number(r.max_score) > 0
                ? Math.round((Number(r.score) / Number(r.max_score)) * 100)
                : 0;
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
                {scored.map((q) => {
                  const v = r.per_question?.[q.id];
                  const cls = v == null ? 'empty' : Number(v) ? 'ok' : 'bad';
                  return (
                    <td key={q.id} className="col-q">
                      <div className={`f-bar ${cls}`} title={v == null ? '—' : Number(v) ? 'Correct' : 'Wrong'} />
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
      {!responses?.length ? (
        <p className="f-muted" style={{ padding: '12px 4px' }}>
          No submissions yet. After someone takes the quiz, Discord, In-Game Name, and IP appear here
          (host-only). Local testing shows IP as localhost.
        </p>
      ) : null}
    </div>
  );
}
