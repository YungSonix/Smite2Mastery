import { useCallback, useMemo, useState } from 'react';
import InsightQuestionPreview from './InsightQuestionPreview';
import { ColumnHistogram, Donut, KpiStrip, NextEventSection, VariantStackChart } from './HostCharts';
import { promptPlain } from '../lib/promptPlain';
import {
  buildInsightsTakeaway,
  buildQuizInsights,
  formatDuration,
  pctWithCounts,
  scoredInsightQuestions,
  LOW_SAMPLE_SUBMISSIONS,
  MIN_VARIANT_N,
  SKEW_THRESHOLD_PP,
} from '../lib/triviaInsights';
import { buildSubmissionIntegrity, integrityPairsCount } from '../lib/submissionIntegrity';

const SORT_COLS = [
  { id: 'num', label: '#', narrow: true },
  { id: 'pct', label: '%' },
  { id: 'n', label: 'n' },
  { id: 'time', label: 'Time' },
];

function shortPrompt(prompt, max = 70) {
  const text = promptPlain(prompt) || '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function nextSort(prev, col) {
  if (prev.col === col) return { col, dir: prev.dir * -1 };
  const dir = col === 'num' ? 1 : col === 'pct' ? 1 : -1;
  return { col, dir };
}

export default function InsightsPanel({ questions, responses, timeLimitSeconds, onJumpToEditor, initialPreviewId }) {
  const [preview, setPreview] = useState(null);
  const [sort, setSort] = useState({ col: 'pct', dir: 1 });

  const scored = useMemo(() => scoredInsightQuestions(questions), [questions]);
  const indexById = useMemo(() => new Map(scored.map((q, i) => [q.id, i])), [scored]);

  useEffect(() => {
    if (initialPreviewId) {
      const i = indexById.get(initialPreviewId);
      if (i != null) setPreview({ i, variantIndex: 0 });
    }
  }, [initialPreviewId, indexById]);

  const stats = useMemo(
    () => buildQuizInsights({ questions, responses, timeLimitSeconds }),
    [questions, responses, timeLimitSeconds]
  );

  const takeaway = useMemo(() => buildInsightsTakeaway(stats), [stats]);

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
      const i = indexById.get(insightRow?.id);
      if (i == null) return;
      setPreview({ i, variantIndex });
    },
    [indexById]
  );

  const stepPreview = useCallback(
    (delta) => {
      setPreview((prev) => {
        if (!prev) return prev;
        const next = prev.i + delta;
        if (next < 0 || next >= scored.length) return prev;
        return { i: next, variantIndex: 0 };
      });
    },
    [scored.length]
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
    { label: 'Submissions', value: stats.n, hint: stats.uniqueDiscord != null ? `${stats.uniqueDiscord} unique Discord` : undefined, tone: 'cyan' },
    stats.medianPct != null
      ? { label: 'Median score', value: `${stats.medianPct}%`, hint: `avg ${stats.avg}%`, tone: 'gold' }
      : { label: 'Avg score', value: `${stats.avg}%`, tone: 'gold' },
    { label: 'Pass rate', value: `${stats.passPct}%`, hint: `${stats.passCount} of ${stats.n} at 70%+`, tone: 'teal' },
    { label: 'Median finish', value: formatDuration(stats.medianDurationMs), tone: 'violet' },
  ];

  const versionCaption = stats.variantQuestionCount
    ? `${stats.variantQuestionCount} question${
        stats.variantQuestionCount === 1 ? ' has' : 's have'
      } multiple versions · ${
        stats.variantUsageParts.length
          ? stats.variantUsageParts.map((p) => `${p.label}: ${p.value} takes`).join(' · ')
          : 'no version assignments recorded yet'
      }`
    : null;

  const previewQuestion = preview ? scored[preview.i] : null;
  const previewStats = preview ? stats.perQuestion[preview.i] : null;

  const clickHint = 'Click any question to preview exactly what players saw.';

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

      {takeaway.length ? (
        <div className="f-insights-takeaway">
          <h3>What this says</h3>
          <p>{takeaway.join(' ')}</p>
        </div>
      ) : null}

      <KpiStrip items={kpis} />

      {stats.n > 0 && flaggedCount > 0 ? (
        <div className="f-insights-alert">
          <span className="f-insights-alert-icon" aria-hidden="true">
            ⚑
          </span>
          <span>
            <strong>
              {flaggedCount} submission{flaggedCount === 1 ? '' : 's'} flagged for review
            </strong>{' '}
            — {reviewPairs ? `${reviewPairs} linked pair${reviewPairs === 1 ? '' : 's'}, ` : ''}
            possible alt accounts. Check the Responses tab before awarding prizes.
          </span>
        </div>
      ) : null}

      {versionCaption ? <p className="f-insights-caption f-muted">{versionCaption}</p> : null}

      {stats.n > 0 && stats.lowSample ? (
        <p className="f-insights-caption f-muted">
          Charts stay hidden until {LOW_SAMPLE_SUBMISSIONS} submissions — with {stats.n}, every
          percentage below will swing hard as more people play. Read the table as counts, not rates.
        </p>
      ) : null}

      {stats.n > 0 && !stats.lowSample ? (
        <div className="f-analytics-grid f-analytics-grid--insights f-insights-grid-12">
          <div className="f-insights-span-5">
            <Donut title="Score mix" parts={stats.bands} center={`${stats.medianPct ?? stats.avg}%`} glow size="lg" />
          </div>
          <div className="f-insights-span-7">
            <ColumnHistogram
              title="How long players took (finish time)"
              rows={finishHistogram}
              empty="Finish time starts with new submissions. Older takes have no clock."
              glow
              hint="Taller bar = more players finished in that time range"
              footNote={
                stats.medianDurationMs != null
                  ? `Median finish: ${formatDuration(stats.medianDurationMs)}`
                  : null
              }
            />
          </div>
        </div>
      ) : null}

      {stats.n > 0 && stats.variantQuestionCount > 0 ? (
        <div style={{ marginTop: 16 }}>
          <VariantStackChart
            title="Version balance"
            questions={stats.perQuestion}
            empty="No submissions mapped to question versions yet"
            onQuestionClick={openInsightQuestion}
            minN={MIN_VARIANT_N}
            skewThreshold={SKEW_THRESHOLD_PP}
            hint={`Showing only questions where one version is at least ${SKEW_THRESHOLD_PP}pp easier than another, counting versions with ${MIN_VARIANT_N}+ takes.`}
          />
        </div>
      ) : null}

      {stats.n > 0 && stats.nextEvent ? (
        <div style={{ marginTop: 16 }}>
          <NextEventSection
            data={stats.nextEvent}
            onItemClick={openInsightQuestion}
            promptText={(item) => shortPrompt(item.prompt)}
          />
        </div>
      ) : null}

      {stats.n === 0 && stats.perQuestion.length > 0 ? (
        <div className="f-insights-empty" style={{ padding: '32px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginTop: 24 }}>
          <h3 style={{ margin: '0 0 8px' }}>No submissions yet</h3>
          <p className="f-muted" style={{ margin: 0 }}>
            Share the take link with your community. Once people start playing, insights and charts will appear here.
          </p>
        </div>
      ) : null}

      {stats.n > 0 && stats.perQuestion.length ? (
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
                              className={`f-variant-chip f-variant-chip-btn${
                                slot.lowSample ? ' is-low-sample' : ''
                              }`}
                              style={{ '--v-accent': slot.color }}
                              title={`Version ${slot.letter}: ${pctWithCounts(slot.pct, slot.ok, slot.n)}${
                                slot.lowSample ? ' — too few takes to trust' : ''
                              }`}
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
                  <span className="f-muted">
                    {q.ok}/{q.n}
                  </span>
                  <span className="f-muted">{q.avgMs != null ? formatDuration(q.avgMs) : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : stats.perQuestion.length === 0 ? (
        <p className="f-muted">Add scored questions to see insights.</p>
      ) : null}

      {previewQuestion ? (
        <InsightQuestionPreview
          key={`${preview.i}-${preview.variantIndex}`}
          question={previewQuestion}
          questionIndex={preview.i}
          initialVariantIndex={preview.variantIndex}
          insightPct={previewStats?.pct}
          insightOk={previewStats?.ok}
          insightN={previewStats?.n}
          responses={responses}
          hasPrev={preview.i > 0}
          hasNext={preview.i < scored.length - 1}
          onPrev={() => stepPreview(-1)}
          onNext={() => stepPreview(1)}
          onClose={() => setPreview(null)}
          onOpenInEditor={onJumpToEditor}
        />
      ) : null}
    </div>
  );
}
