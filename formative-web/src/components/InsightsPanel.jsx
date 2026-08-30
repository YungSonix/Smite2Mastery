import { useCallback, useMemo, useState } from 'react';
import InsightQuestionPreview from './InsightQuestionPreview';
import {
  BarChart,
  ColumnHistogram,
  Donut,
  KpiStrip,
  NextEventSection,
  VariantStackChart,
} from './HostCharts';
import { promptPlain } from '../lib/promptPlain';
import { buildQuizInsights, formatDuration, scoredInsightQuestions } from '../lib/triviaInsights';
import { buildSubmissionIntegrity, integrityPairsCount } from '../lib/submissionIntegrity';

const SORT_COLS = [
  { id: 'num', label: '#', narrow: true },
  { id: 'pct', label: '%' },
  { id: 'n', label: 'n' },
  { id: 'time', label: 'Time' },
];

function nextSort(prev, col) {
  if (prev.col === col) return { col, dir: prev.dir * -1 };
  const dir = col === 'num' ? 1 : col === 'pct' ? 1 : -1;
  return { col, dir };
}

export default function InsightsPanel({ questions, responses, timeLimitSeconds, onJumpToEditor }) {
  const [preview, setPreview] = useState(null);
  const [sort, setSort] = useState({ col: 'pct', dir: 1 });

  const scored = useMemo(() => scoredInsightQuestions(questions), [questions]);
  const questionById = useMemo(() => new Map(scored.map((q, i) => [q.id, { q, i }])), [scored]);

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

  const openInsightQuestion = useCallback(
    (insightRow, variantIndex = 0) => {
      const hit = questionById.get(insightRow?.id);
      if (!hit) return;
      setPreview({
        question: hit.q,
        questionIndex: hit.i,
        variantIndex,
        pct: insightRow.pct,
        n: insightRow.n,
      });
    },
    [questionById]
  );

  const openById = useCallback(
    (id) => {
      const hit = questionById.get(id);
      if (!hit) return;
      const insight = stats.perQuestion.find((q) => q.id === id);
      openInsightQuestion(insight || { id, pct: null, n: null });
    },
    [questionById, stats.perQuestion, openInsightQuestion]
  );

  const chartRow = useCallback(
    (q) => ({
      id: q.id,
      questionId: q.id,
      label: q.label,
      title: promptPlain(q.prompt),
      value: q.pct,
      display: `${q.pct}%`,
      insight: q,
    }),
    []
  );

  const questionBars = useMemo(
    () =>
      [...stats.perQuestion]
        .filter((q) => q.n > 0)
        .sort((a, b) => a.pct - b.pct)
        .map(chartRow),
    [stats.perQuestion, chartRow]
  );

  const hardestVariants = useMemo(
    () =>
      stats.hardestVariants.map((r) => {
        const qid = String(r.id || '').split('-v')[0];
        return { ...r, questionId: qid, insight: stats.perQuestion.find((q) => q.id === qid) };
      }),
    [stats.hardestVariants, stats.perQuestion]
  );

  const timeToAnswer = useMemo(
    () =>
      stats.hasTimings
        ? stats.perQuestion.map((q) => ({
            id: q.id,
            questionId: q.id,
            label: q.label,
            title: promptPlain(q.prompt),
            value: q.avgMs != null ? Math.round(q.avgMs / 1000) : 0,
            display: q.avgMs != null ? formatDuration(q.avgMs) : '—',
            insight: q,
          }))
        : [],
    [stats.hasTimings, stats.perQuestion]
  );

  const finishHistogram = useMemo(
    () =>
      (stats.timeRows || []).map((r) => ({
        label: r.label,
        value: r.value,
        color: '#38bdf8',
      })),
    [stats.timeRows]
  );

  const sortedTable = useMemo(() => {
    const rows = [...stats.perQuestion];
    const dir = sort.dir;
    rows.sort((a, b) => {
      switch (sort.col) {
        case 'num':
          return (a.i - b.i) * dir;
        case 'n':
          return (a.n - b.n) * dir;
        case 'time': {
          const av = a.avgMs ?? -1;
          const bv = b.avgMs ?? -1;
          return (av - bv) * dir;
        }
        case 'pct':
        default:
          return (a.pct - b.pct) * dir;
      }
    });
    return rows;
  }, [stats.perQuestion, sort]);

  const kpis = [
    { label: 'Submissions', value: stats.n, tone: 'cyan' },
    { label: 'Avg score', value: `${stats.avg}%`, tone: 'gold' },
    {
      label: 'Pass rate',
      value: `${stats.n ? Math.round((stats.passFail[0].value / stats.n) * 100) : 0}%`,
      tone: 'teal',
    },
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

  const clickHint = 'Click a question label (Q1, Q2, …) to preview what students saw.';

  return (
    <div className="f-insights f-insights-v2 f-insights-v3 f-insights-full">
      <header className="f-insights-head">
        <div>
          <h2>Insights</h2>
          <p className="f-muted">
            {stats.n} submission{stats.n === 1 ? '' : 's'}
            {stats.scoredCount ? ` · ${stats.scoredCount} scored questions` : ''}
            {' · '}
            {clickHint}
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
            onRowClick={(r) => openInsightQuestion(r.insight)}
          />
        </div>
        <div className="f-insights-span-6">
          <ColumnHistogram
            title="How long students took (finish time)"
            rows={finishHistogram}
            empty="Finish time starts with new submissions. Older takes have no clock."
            glow
            hint="Taller bar = more students finished in that time range"
          />
        </div>

        {stats.hasTimings ? (
          <div className="f-insights-span-6">
            <BarChart
              title="Time to first answer"
              rows={timeToAnswer}
              glow
              onRowClick={(r) => openInsightQuestion(r.insight)}
            />
          </div>
        ) : null}
        {stats.hardestVariants.length ? (
          <div className={stats.hasTimings ? 'f-insights-span-6' : 'f-insights-span-12'}>
            <BarChart
              title="Hardest versions"
              rows={hardestVariants}
              maxHint={100}
              tone
              glow
              empty="No variant data yet"
              onRowClick={(r) => openInsightQuestion(r.insight)}
            />
          </div>
        ) : null}

        {stats.variantQuestionCount > 0 ? (
          <div className="f-insights-span-12">
            <VariantStackChart
              title="Variant breakdown (bar chart)"
              questions={stats.perQuestion}
              empty="No submissions mapped to question versions yet"
              onQuestionClick={openInsightQuestion}
              hint="Each row shows % correct per version — longer bar = easier version for that take"
            />
          </div>
        ) : null}

        {stats.nextEvent ? (
          <div className="f-insights-span-12">
            <NextEventSection data={stats.nextEvent} onItemClick={(item) => openById(item.id)} />
          </div>
        ) : null}
      </div>

      {stats.perQuestion.length ? (
        <div className="f-insights-list f-insights-question-table" style={{ marginTop: 20 }}>
          <div className="f-insights-table-head f-insights-table-head--sort">
            <button
              type="button"
              className={`f-insights-sort-btn${sort.col === 'num' ? ' is-active' : ''}`}
              onClick={() => setSort((s) => nextSort(s, 'num'))}
            >
              #{sort.col === 'num' ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
            </button>
            <span className="f-insights-table-head-prompt">Question (click to preview)</span>
            {SORT_COLS.filter((c) => c.id !== 'num').map((col) => (
              <button
                key={col.id}
                type="button"
                className={`f-insights-sort-btn${sort.col === col.id ? ' is-active' : ''}`}
                onClick={() => setSort((s) => nextSort(s, col.id))}
              >
                {col.label}
                {sort.col === col.id ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
              </button>
            ))}
          </div>
          {sortedTable.map((q) => {
            const label = promptPlain(q.prompt) || 'Question';
            const tone = q.pct >= 70 ? 'high' : q.pct >= 40 ? 'mid' : 'low';
            return (
              <div className="f-insight-row f-insight-table-row" key={q.id}>
                <button
                  type="button"
                  className="f-insight-num f-insight-num-btn"
                  onClick={() => openInsightQuestion(q)}
                  title="Preview question"
                >
                  {q.i + 1}
                </button>
                <div className="f-insight-copy">
                  <div className="f-insight-prompt-row">
                    <button
                      type="button"
                      className="f-insight-prompt f-insight-prompt-btn"
                      title={label}
                      onClick={() => openInsightQuestion(q)}
                    >
                      {label}
                    </button>
                    {q.hasVariants ? (
                      <div className="f-insight-variant-chips">
                        {q.variants
                          .filter((slot) => slot.n > 0)
                          .map((slot) => (
                            <button
                              type="button"
                              key={`${q.id}-${slot.index}`}
                              className="f-variant-chip f-variant-chip-btn"
                              style={{ '--v-accent': slot.color }}
                              title={`Version ${slot.letter}: ${slot.pct}% correct (${slot.n} takes)`}
                              onClick={() => openInsightQuestion(q, slot.index)}
                            >
                              {slot.letter} {slot.pct}%
                            </button>
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
                  <span className="f-muted">{q.n}</span>
                  <span className="f-muted">{q.avgMs != null ? formatDuration(q.avgMs) : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="f-muted">Add scored questions to see insights.</p>
      )}

      {preview ? (
        <InsightQuestionPreview
          question={preview.question}
          questionIndex={preview.questionIndex}
          initialVariantIndex={preview.variantIndex}
          insightPct={preview.pct}
          insightN={preview.n}
          onClose={() => setPreview(null)}
          onOpenInEditor={onJumpToEditor}
        />
      ) : null}
    </div>
  );
}
