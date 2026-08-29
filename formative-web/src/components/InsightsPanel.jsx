import { useMemo } from 'react';
import { BarChart, Donut, KpiStrip, VariantStackChart } from './HostCharts';
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

  const hardestQuestions = [...stats.perQuestion]
    .filter((q) => q.n > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 8)
    .map((q) => ({
      id: `hard-${q.id}`,
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

  const kpis = [
    { label: 'Submissions', value: stats.n, tone: 'cyan' },
    { label: 'Avg score', value: `${stats.avg}%`, tone: 'gold' },
    { label: 'Avg finish', value: formatDuration(stats.avgDurationMs), tone: 'violet' },
    { label: 'Median finish', value: formatDuration(stats.medianDurationMs), tone: 'teal' },
  ];

  if (stats.variantQuestionCount > 0) {
    kpis.push({
      label: 'Variant Qs',
      value: stats.variantQuestionCount,
      hint: 'with A/B/C versions',
      tone: 'rose',
    });
  }

  return (
    <div className="f-insights f-insights-v2 f-insights-v3">
      <header className="f-insights-head">
        <div>
          <h2>Insights</h2>
          <p className="f-muted">
            {stats.n} submission{stats.n === 1 ? '' : 's'}
            {stats.scoredCount ? ` · ${stats.scoredCount} scored questions` : ''}
          </p>
        </div>
      </header>

      <KpiStrip items={kpis} />

      <div className="f-analytics-grid f-analytics-grid--insights">
        <Donut title="Score mix" parts={stats.bands} center={`${stats.avg}%`} glow size="lg" />
        <Donut title="Pass rate" parts={stats.passFail} center={`${stats.n ? Math.round((stats.passFail[0].value / stats.n) * 100) : 0}%`} glow />
        <Donut title="Answers" parts={stats.answerMix} glow />
        {stats.variantUsageParts.length ? (
          <Donut title="Version mix" parts={stats.variantUsageParts} glow empty="No variant assignments yet" />
        ) : null}
        <BarChart title="% correct by question" rows={questionBars} maxHint={100} tone glow />
        <BarChart title="Hardest questions" rows={hardestQuestions} maxHint={100} tone glow />
        <BarChart
          title="Finish time"
          rows={stats.timeRows}
          empty="Finish time starts with new submissions. Older takes have no clock."
          glow
        />
        {stats.hasTimings ? (
          <BarChart title="Time to first answer" rows={timeToAnswer} glow />
        ) : null}
        {stats.hardestVariants.length ? (
          <BarChart
            title="Hardest versions"
            rows={stats.hardestVariants}
            maxHint={100}
            tone
            glow
            empty="No variant data yet"
          />
        ) : null}
        {stats.variantQuestionCount > 0 ? (
          <div className="f-analytics-span-2">
            <VariantStackChart
              title="Variant breakdown by question"
              questions={stats.perQuestion}
              empty="No submissions mapped to question versions yet"
            />
          </div>
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
                  <div className="f-insight-prompt-row">
                    <div className="f-insight-prompt" title={label}>
                      {label}
                    </div>
                    {q.hasVariants ? (
                      <div className="f-insight-variant-chips">
                        {q.variants
                          .filter((slot) => slot.n > 0)
                          .map((slot) => (
                            <span
                              key={`${q.id}-${slot.index}`}
                              className="f-variant-chip"
                              style={{ '--v-accent': slot.color }}
                              title={`Version ${slot.letter}: ${slot.pct}% correct (n=${slot.n})`}
                            >
                              {slot.letter} {slot.pct}%
                            </span>
                          ))}
                      </div>
                    ) : null}
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
