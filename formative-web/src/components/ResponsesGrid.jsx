import { formatIp } from '../lib/quizSettings';

export default function ResponsesGrid({ questions, responses, onSelect, selectedId }) {
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

  return (
    <div className="f-grid-wrap">
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
