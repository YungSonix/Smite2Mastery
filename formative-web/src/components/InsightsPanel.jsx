import { useMemo } from 'react';
import { BarChart, Donut, KpiStrip, VariantHeatmap, NextEventSection } from './HostCharts';
import { promptPlain } from '../lib/promptPlain';
import { buildQuizInsights, formatDuration } from '../lib/triviaInsights';
import { buildSubmissionIntegrity, integrityPairsCount } from '../lib/submissionIntegrity';

export default function InsightsPanel({ questions, responses, timeLimitSeconds }) {
  const stats = useMemo(
    () => buildQuizInsights({ questions, responses, timeLimitSeconds }),
    [questions, responses, timeLimitSeconds]
  );

  const integrityIndex = useMemo(() => buildSubmissionIntegrity(responses), [responses]);
  const reviewPairs = useMemo(
    () => integrityPairsCount(responses, integrityIndex),
    [responses, integrityIndex]
  );
  const flaggedCount = useMemo(() => {
    let n = 0;
    for (const r of responses || []) {
      const entry = integrityIndex.get(r.id);
      if (entry?.level && entry.level !== 'none') n += 1;
    }
    return n;
  }, [responses, integrityIndex]);

  const questionBars = [...stats.perQuestion]
    .filter((q) => q.n > 0)
    .sort((a, b) => a.pct - b.pct)
    .map((q) => ({
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

  const kpis = [
    { label: 'Submissions', value: stats.n, tone: 'cyan' },
    { label: 'Avg score', value: `${stats.avg}%`, tone: 'gold' },
    { label: 'Pass rate', value: `${stats.n ? Math.round((stats.passFail[0].value / stats.n) * 100) : 0}%`, tone: 'teal' },
    { label: 'Avg finish', value: formatDuration(stats.avgDurationMs), tone: 'violet' },
    { label: 'Median finish', value: formatDuration(stats.medianDurationMs), tone: 'rose' },
  ];

  if (stats.variantQuestionCount > 0) {
    kpis.push({
      label: 'Variant Qs',
      value: stats.variantQuestionCount,
      hint: 'with A/B/C versions',
      tone: 'cyan',
    });
  }

  if (stats.n > 0) {
    kpis.push({
      label: 'Review flags',
      value: flaggedCount,
      hint: reviewPairs ? `${reviewPairs} linked pair${reviewPairs === 1 ? '' : 's'}` : 'alt-account signals',
      tone: 'gold',
    });
  }

  return (
    <div className="f-insights f-insights-v2 f-insights-v3 f-insights-full">
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

      <div className="f-analytics-grid f-analytics-grid--insights f-insights-grid-12">
        <div className="f-insights-span-4">
          <Donut title="Score mix" parts={stats.bands} center={`${stats.avg}%`} glow size="lg" />
        </div>
        <div className="f-insights-span-4">
          <Donut
            title="Pass rate"
            parts={stats.passFail}
            center={`${stats.n ? Math.round((stats.passFail[0].value / stats.n) * 100) : 0}%`}
            glow
          />
        </div>
        {stats.variantUsageParts.length ? (
          <div className="f-insights-span-4">
            <Donut title="Version mix" parts={stats.variantUsageParts} glow empty="No variant assignments yet" />
          </div>
        ) : (
          <div className="f-insights-span-4">
            <Donut title="Answers" parts={stats.answerMix} glow />
          </div>
        )}

        <div className="f-insights-span-6">
          <BarChart
            title="% correct by question (hardest first)"
            rows={questionBars}
            maxHint={100}
            tone
            glow
          />
        </div>
        <div className="f-insights-span-6">
          <BarChart
            title="Finish time"
            rows={stats.timeRows}
            empty="Finish time starts with new submissions. Older takes have no clock."
            glow
          />
        </div>

        {stats.hasTimings ? (
          <div className="f-insights-span-6">
            <BarChart title="Time to first answer" rows={timeToAnswer} glow />
          </div>
        ) : null}
        {stats.hardestVariants.length ? (
          <div className={stats.hasTimings ? 'f-insights-span-6' : 'f-insights-span-12'}>
            <BarChart
              title="Hardest versions"
              rows={stats.hardestVariants}
              maxHint={100}
              tone
              glow
              empty="No variant data yet"
            />
          </div>
        ) : null}

        {stats.variantQuestionCount > 0 ? (
          <div className="f-insights-span-12">
            <VariantHeatmap
              title="Variant heatmap"
              questions={stats.perQuestion}
              empty="No submissions mapped to question versions yet"
            />
          </div>
        ) : null}

        {stats.nextEvent ? (
          <div className="f-insights-span-12">
            <NextEventSection data={stats.nextEvent} />
          </div>
        ) : null}
      </div>

      {stats.perQuestion.length ? (
        <div className="f-insights-list f-insights-question-table" style={{ marginTop: 20 }}>
          <div className="f-insights-table-head">
            <span>#</span>
            <span>Question</span>
            <span>% correct</span>
            <span>n</span>
            <span>Avg time</span>
          </div>
          {[...stats.perQuestion]
            .sort((a, b) => a.pct - b.pct)
            .map((q) => {
              const label = promptPlain(q.prompt) || 'Question';
              const tone = q.pct >= 70 ? 'high' : q.pct >= 40 ? 'mid' : 'low';
              return (
                <div className="f-insight-row f-insight-table-row" key={q.id}>
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
                  <div className="f-insight-stats f-insight-stats--table">
                    <strong>{q.pct}%</strong>
                    <span className="f-muted">n={q.n}</span>
                    <span className="f-muted">{q.avgMs != null ? formatDuration(q.avgMs) : '—'}</span>
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
