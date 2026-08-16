import { useMemo } from 'react';
import { BarChart, Donut } from './HostCharts';
import { promptPlain } from '../lib/promptPlain';
import { buildQuizInsights, formatDuration } from '../lib/triviaInsights';

export default function InsightsPanel({ questions, responses, timeLimitSeconds }) {
  const stats = useMemo(
    () => buildQuizInsights({ questions, responses, timeLimitSeconds }),
    [questions, responses, timeLimitSeconds]
  );

  const questionBars = stats.perQuestion.map((q) => ({
    id: q.id,
    label: q.label,
    title: promptPlain(q.prompt),
    value: q.pct,
    display: `${q.pct}%`,
  }));

  const timeToAnswer = stats.hasTimings
    ? stats.perQuestion.map((q) => ({
        id: q.id,
        label: q.label,
        title: promptPlain(q.prompt),
        value: q.avgMs != null ? Math.round(q.avgMs / 1000) : 0,
        display: q.avgMs != null ? formatDuration(q.avgMs) : '—',
      }))
    : [];

  return (
    <div className="f-insights f-insights-v2">
      <header className="f-insights-head">
        <div>
          <h2>Insights</h2>
          <p className="f-muted">{stats.n} submission{stats.n === 1 ? '' : 's'}</p>
        </div>
      </header>

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
          <div className="f-kpi-label">Avg finish</div>
          <div className="f-kpi-value">{formatDuration(stats.avgDurationMs)}</div>
        </div>
        <div className="f-kpi">
          <div className="f-kpi-label">Median finish</div>
          <div className="f-kpi-value">{formatDuration(stats.medianDurationMs)}</div>
        </div>
      </div>

      <div className="f-analytics-grid">
        <Donut title="Score mix" parts={stats.bands} center={`${stats.avg}%`} />
        <Donut title="Answers" parts={stats.answerMix} />
        <BarChart title="% correct by question" rows={questionBars} maxHint={100} />
        <BarChart
          title="Finish time"
          rows={stats.timeRows}
          empty="Finish time starts with new submissions. Older takes have no clock."
        />
        {stats.hasTimings ? (
          <BarChart title="Time to first answer" rows={timeToAnswer} />
        ) : null}
      </div>

      {stats.perQuestion.length ? (
        <div className="f-insights-list" style={{ marginTop: 16 }}>
          {stats.perQuestion.map((q) => {
            const label = promptPlain(q.prompt) || 'Question';
            const tone = q.pct >= 70 ? 'high' : q.pct >= 40 ? 'mid' : 'low';
            return (
              <div className="f-insight-row" key={q.id}>
                <span className="f-insight-num">{q.i + 1}</span>
                <div className="f-insight-copy">
                  <div className="f-insight-prompt" title={label}>
                    {label}
                  </div>
                  <div className="f-insight-bar-track">
                    <div className={`f-insight-bar-fill is-${tone}`} style={{ width: `${q.pct}%` }} />
                  </div>
                </div>
                <div className="f-insight-stats">
                  <strong>{q.pct}%</strong>
                  <span className="f-muted">
                    n={q.n}
                    {q.avgMs != null ? ` · ${formatDuration(q.avgMs)}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="f-muted">Add scored questions to see insights.</p>
      )}
    </div>
  );
}
