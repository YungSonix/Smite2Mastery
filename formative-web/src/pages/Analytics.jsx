import { useEffect, useMemo, useState } from 'react';
import HostShell from '../components/HostShell';
import { hostApi } from '../lib/api';

function BarChart({ title, rows, valueKey = 'value', labelKey = 'label', maxHint }) {
  const max = Math.max(1, maxHint || Math.max(0, ...rows.map((r) => Number(r[valueKey]) || 0)));
  return (
    <div className="f-chart-card">
      <h3>{title}</h3>
      {!rows.length ? (
        <p className="f-muted">No data yet</p>
      ) : (
        <div className="f-bar-chart">
          {rows.map((r) => (
            <div className="f-bar-chart-row" key={r[labelKey]}>
              <div className="f-bar-chart-label" title={r[labelKey]}>
                {r[labelKey]}
              </div>
              <div className="f-bar-chart-track">
                <div
                  className="f-bar-chart-fill"
                  style={{ width: `${Math.round(((Number(r[valueKey]) || 0) / max) * 100)}%` }}
                />
              </div>
              <div className="f-bar-chart-val">{r[valueKey]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Donut({ title, parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  let acc = 0;
  const stops = parts
    .map((p) => {
      const start = (acc / total) * 100;
      acc += p.value;
      const end = (acc / total) * 100;
      return `${p.color} ${start}% ${end}%`;
    })
    .join(', ');
  return (
    <div className="f-chart-card">
      <h3>{title}</h3>
      <div className="f-donut-wrap">
        <div
          className="f-donut"
          style={{ background: `conic-gradient(${stops || '#1e3a5f 0 100%'})` }}
        />
        <ul className="f-donut-legend">
          {parts.map((p) => (
            <li key={p.label}>
              <span style={{ background: p.color }} />
              {p.label}: {p.value}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState({ quizzes: [], questions: [], responses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizFilter, setQuizFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await hostApi('/api/trivia/host?action=analytics');
        if (alive) setData(res);
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load analytics');
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

  const stats = useMemo(() => {
    const responses = filteredResponses;
    const n = responses.length;
    const pcts = responses
      .map((r) => {
        const max = Number(r.max_score) || 0;
        return max > 0 ? (Number(r.score) / max) * 100 : null;
      })
      .filter((x) => x != null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const uniqueIps = new Set(responses.map((r) => r.ip_address).filter(Boolean)).size;
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

    const quizMap = Object.fromEntries((data.quizzes || []).map((q) => [q.id, q]));
    const byQuiz = {};
    for (const r of responses) {
      if (!byQuiz[r.quiz_id]) byQuiz[r.quiz_id] = { n: 0, sum: 0 };
      byQuiz[r.quiz_id].n += 1;
      const max = Number(r.max_score) || 0;
      byQuiz[r.quiz_id].sum += max > 0 ? (Number(r.score) / max) * 100 : 0;
    }
    const quizRows = Object.entries(byQuiz)
      .map(([id, v]) => ({
        label: (quizMap[id]?.title || id).slice(0, 28),
        value: Math.round(v.sum / v.n),
        n: v.n,
        id,
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);

    const qMap = {};
    for (const q of data.questions || []) {
      if (quizFilter !== 'all' && q.quiz_id !== quizFilter) continue;
      if (Number(q.points) <= 0) continue;
      qMap[q.id] = { label: (q.prompt || 'Q').slice(0, 36), ok: 0, n: 0 };
    }
    for (const r of responses) {
      for (const [qid, v] of Object.entries(r.per_question || {})) {
        if (!qMap[qid] || v == null) continue;
        qMap[qid].n += 1;
        qMap[qid].ok += Number(v) ? 1 : 0;
      }
    }
    const questionRows = Object.values(qMap)
      .filter((q) => q.n > 0)
      .map((q) => ({ label: q.label, value: Math.round((q.ok / q.n) * 100) }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 10);

    const ipCounts = {};
    for (const r of responses) {
      if (!r.ip_address) continue;
      if (!ipCounts[r.ip_address]) ipCounts[r.ip_address] = new Set();
      ipCounts[r.ip_address].add(String(r.discord_username || '').toLowerCase());
    }
    const multiIp = Object.entries(ipCounts)
      .filter(([, set]) => set.size > 1)
      .map(([ip, set]) => ({ label: ip, value: set.size }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      n,
      avg,
      uniqueIps,
      buckets,
      dayRows,
      quizRows,
      questionRows,
      multiIp,
      passFail: [
        { label: '≥70%', value: pass, color: '#2dd4bf' },
        { label: '<70%', value: fail, color: '#f87171' },
      ],
    };
  }, [filteredResponses, data.questions, data.quizzes, quizFilter]);

  return (
    <HostShell active="analytics">
      <div className="f-welcome-row">
        <h1>Analytics</h1>
        <select
          value={quizFilter}
          onChange={(e) => setQuizFilter(e.target.value)}
          style={{ maxWidth: 280 }}
        >
          <option value="all">All quizzes</option>
          {(data.quizzes || []).map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="f-error">{error}</div> : null}
      {loading ? <p className="f-muted">Loading…</p> : null}

      <div className="f-kpi-row">
        <div className="f-kpi">
          <div className="f-kpi-label">Submissions</div>
          <div className="f-kpi-value">{stats.n}</div>
        </div>
        <div className="f-kpi">
          <div className="f-kpi-label">Avg score</div>
          <div className="f-kpi-value">{stats.avg}%</div>
        </div>
        <div className="f-kpi">
          <div className="f-kpi-label">Unique IPs</div>
          <div className="f-kpi-value">{stats.uniqueIps}</div>
        </div>
        <div className="f-kpi">
          <div className="f-kpi-label">Quizzes</div>
          <div className="f-kpi-value">{(data.quizzes || []).length}</div>
        </div>
      </div>

      <div className="f-analytics-grid">
        <BarChart title="Score distribution" rows={stats.buckets} />
        <Donut title="Pass threshold (≥70%)" parts={stats.passFail} />
        <BarChart title="Submissions by day (last 14)" rows={stats.dayRows} />
        <BarChart title="Hardest questions (% correct)" rows={stats.questionRows} />
        <BarChart
          title="Avg score by quiz"
          rows={stats.quizRows.map((r) => ({ label: r.label, value: r.value }))}
        />
        <BarChart title="IPs with multiple Discord names" rows={stats.multiIp} />
      </div>

      <p className="f-muted" style={{ marginTop: 16, fontSize: 12 }}>
        Integrity signals (including IP) stay on host pages only.
      </p>
    </HostShell>
  );
}
