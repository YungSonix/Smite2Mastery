import { useEffect, useMemo, useState } from 'react';
import HostShell from '../components/HostShell';
import { BarChart, Donut } from '../components/HostCharts';
import { hostApi } from '../lib/api';
import { buildSubmissionIntegrity, integrityPairsCount } from '../lib/submissionIntegrity';

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
    const integrityIndex = buildSubmissionIntegrity(responses);
    const reviewPairs = integrityPairsCount(responses, integrityIndex);
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

    const integrityRows = responses
      .map((r) => integrityIndex.get(r.id))
      .filter((entry) => entry?.level && entry.level !== 'none')
      .slice(0, 8)
      .map((entry, i) => ({
        label: entry.peers?.[0]?.discord || `Flag ${i + 1}`,
        value: entry.score,
      }));

    return {
      n,
      avg,
      flagged,
      reviewPairs,
      buckets,
      dayRows,
      quizRows,
      questionRows,
      integrityRows,
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
          <div className="f-kpi-label">Review flags</div>
          <div className="f-kpi-value">{stats.flagged}</div>
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
        <BarChart title="Integrity signal strength" rows={stats.integrityRows} />
      </div>

      <p className="f-muted" style={{ marginTop: 16, fontSize: 12 }}>
        Review flags use name, timing, and score patterns — not IP addresses. Host pages only.
      </p>
    </HostShell>
  );
}
