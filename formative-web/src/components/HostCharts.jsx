import { useState } from 'react';

function barTone(value, max = 100) {
  const pct = max > 0 ? (Number(value) / max) * 100 : 0;
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

export function BarChart({
  title,
  rows,
  valueKey = 'value',
  labelKey = 'label',
  maxHint,
  empty = 'No data yet',
  tone = false,
  glow = false,
  onRowClick,
  hint,
}) {
  const list = Array.isArray(rows) ? rows : [];
  const max = Math.max(1, maxHint || Math.max(0, ...list.map((r) => Number(r[valueKey]) || 0)));
  return (
    <div className={`f-chart-card${glow ? ' is-glow' : ''}`}>
      <h3>{title}</h3>
      {hint ? <p className="f-chart-hint f-muted">{hint}</p> : null}
      {!list.length ? (
        <p className="f-muted">{empty}</p>
      ) : (
        <div className="f-bar-chart">
          {list.map((r, i) => {
            const val = Number(r[valueKey]) || 0;
            const width = Math.round((val / max) * 100);
            const fillStyle = r.color ? { background: r.color, width: `${width}%` } : { width: `${width}%` };
            const label = r[labelKey];
            const clickable = Boolean(onRowClick && r.questionId);
            return (
              <div className="f-bar-chart-row" key={r.id || `${label}-${i}`}>
                {clickable ? (
                  <button
                    type="button"
                    className="f-bar-chart-label f-bar-chart-label-btn"
                    title={r.title || `${label} — click to preview`}
                    onClick={() => onRowClick(r)}
                  >
                    {label}
                  </button>
                ) : (
                  <div className="f-bar-chart-label" title={r.title || label}>
                    {label}
                  </div>
                )}
                <div className="f-bar-chart-track">
                  <div
                    className={`f-bar-chart-fill${tone ? ` is-${barTone(val, maxHint || max)}` : ''}${r.color ? ' is-custom' : ''}`}
                    style={fillStyle}
                  />
                </div>
                <div className="f-bar-chart-val">{r.display != null ? r.display : r[valueKey]}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Vertical histogram for time buckets or counts. Empty buckets stay visible so gaps read as gaps. */
export function ColumnHistogram({ title, rows, empty = 'No data yet', glow = false, hint, footNote }) {
  const list = Array.isArray(rows) ? rows : [];
  const hasData = list.some((r) => Number(r.value) > 0);
  const max = Math.max(1, ...list.map((r) => Number(r.value) || 0));
  return (
    <div className={`f-chart-card${glow ? ' is-glow' : ''}`}>
      <h3>{title}</h3>
      {hint ? <p className="f-chart-hint f-muted">{hint}</p> : null}
      {!hasData ? (
        <p className="f-muted">{empty}</p>
      ) : (
        <>
          <div className="f-col-histogram">
            {list.map((r) => {
              const val = Number(r.value) || 0;
              const height = val > 0 ? Math.max(8, Math.round((val / max) * 100)) : 0;
              return (
                <div
                  className={`f-col-histogram-slot${val === 0 ? ' is-empty' : ''}`}
                  key={r.label}
                >
                  <div className="f-col-histogram-val">{val}</div>
                  <div className="f-col-histogram-bar-wrap">
                    {val > 0 ? (
                      <div
                        className="f-col-histogram-bar"
                        style={{ height: `${height}%`, background: r.color || 'var(--f-blue)' }}
                        title={`${r.label}: ${val}`}
                      />
                    ) : (
                      <div className="f-col-histogram-bar is-zero" title={`${r.label}: 0`} />
                    )}
                  </div>
                  <div className="f-col-histogram-label">{r.label}</div>
                </div>
              );
            })}
          </div>
          {footNote ? <p className="f-chart-foot f-muted">{footNote}</p> : null}
        </>
      )}
    </div>
  );
}

export function Donut({ title, parts, center, empty = 'No data yet', glow = false, size = 'md' }) {
  const usable = (parts || []).filter((p) => Number(p.value) > 0);
  const total = usable.reduce((s, p) => s + p.value, 0);
  let acc = 0;
  const stops = usable
    .map((p) => {
      const start = (acc / total) * 100;
      acc += p.value;
      const end = (acc / total) * 100;
      return `${p.color} ${start}% ${end}%`;
    })
    .join(', ');
  return (
    <div className={`f-chart-card${glow ? ' is-glow' : ''}`}>
      <h3>{title}</h3>
      {!total ? (
        <p className="f-muted">{empty}</p>
      ) : (
        <div className="f-donut-wrap">
          <div
            className={`f-donut f-donut--${size}${glow ? ' is-glow' : ''}`}
            style={{ background: `conic-gradient(${stops})` }}
          >
            <div className="f-donut-center">{center != null ? center : ''}</div>
          </div>
          <ul className="f-donut-legend">
            {(parts || []).map((p) => (
              <li key={p.label}>
                <span style={{ background: p.color }} />
                {p.label}: {p.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VariantStackRow({ q, onQuestionClick }) {
  const slots = q.variants.filter((v) => v.n > 0);
  return (
    <div className="f-variant-stack-row">
      <div className="f-variant-stack-head">
        {onQuestionClick ? (
          <button
            type="button"
            className="f-variant-stack-q f-variant-stack-q-btn"
            onClick={() => onQuestionClick(q)}
            title="Preview question"
          >
            {q.label}
          </button>
        ) : (
          <span className="f-variant-stack-q">{q.label}</span>
        )}
        <span className="f-variant-stack-overall">
          {q.pct}% overall
          {q.variantSkew != null ? ` · ${q.variantSkew}pp spread` : ''}
        </span>
      </div>
      <div className="f-variant-stack-bars">
        {slots.map((slot) => (
          <div
            className={`f-variant-stack-slot${slot.lowSample ? ' is-low-sample' : ''}`}
            key={`${q.id}-${slot.index}`}
          >
            <div className="f-variant-stack-meta">
              <span className="f-variant-chip" style={{ '--v-accent': slot.color }}>
                Version {slot.letter}
              </span>
              <span className="f-variant-stack-pct">{slot.pct}%</span>
              <span className="f-muted">
                {slot.ok}/{slot.n}
              </span>
              {slot.lowSample ? <span className="f-variant-low-tag">too few takes</span> : null}
            </div>
            <div className="f-variant-stack-track">
              <div
                className="f-variant-stack-fill"
                style={{ width: `${slot.pct}%`, background: slot.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One row per question, one bar per version.
 * Only questions with a real, well-sampled skew show by default; the rest sit behind a disclosure.
 */
export function VariantStackChart({
  title,
  questions,
  empty = 'No version questions yet',
  onQuestionClick,
  hint,
  minN = 5,
  skewThreshold = 20,
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = (questions || []).filter((q) => q.hasVariants && q.variants?.some((v) => v.n > 0));

  if (!rows.length) {
    return (
      <div className="f-chart-card is-glow">
        <h3>{title}</h3>
        <p className="f-muted">{empty}</p>
      </div>
    );
  }

  const flagged = rows.filter(
    (q) => q.reliableVariantCount >= 2 && q.variantSkew != null && q.variantSkew >= skewThreshold
  );
  const rest = rows.filter((q) => !flagged.includes(q));
  const visible = showAll ? rows : flagged;

  return (
    <div className="f-chart-card is-glow f-variant-stack-chart">
      <h3>{title}</h3>
      {hint ? <p className="f-chart-hint f-muted">{hint}</p> : null}
      {!visible.length ? (
        <p className="f-muted">
          No version is meaningfully harder than another yet (nothing above a {skewThreshold}pp gap
          with at least {minN} takes per version).
        </p>
      ) : (
        <div className="f-variant-stack-list">
          {visible.map((q) => (
            <VariantStackRow key={q.id} q={q} onQuestionClick={onQuestionClick} />
          ))}
        </div>
      )}
      {rest.length ? (
        <button
          type="button"
          className="f-outline-btn f-compact f-variant-stack-toggle"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll
            ? 'Show only skewed versions'
            : `Show all versions (${rest.length} more question${rest.length === 1 ? '' : 's'})`}
        </button>
      ) : null}
    </div>
  );
}

export function KpiStrip({ items }) {
  return (
    <div className="f-kpi-row f-kpi-row--insights">
      {(items || []).map((item) => (
        <div className={`f-kpi f-kpi--${item.tone || 'default'}`} key={item.label}>
          <div className="f-kpi-label">{item.label}</div>
          <div className="f-kpi-value">{item.value}</div>
          {item.hint ? <div className="f-kpi-hint">{item.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}

/** Compact matrix: rows = questions, columns = variant letters. */
export function VariantHeatmap({ title, questions, empty = 'No variant data yet' }) {
  const rows = (questions || []).filter((q) => q.hasVariants && q.variants?.some((v) => v.n > 0));
  if (!rows.length) {
    return (
      <div className="f-chart-card is-glow f-variant-heatmap">
        <h3>{title}</h3>
        <p className="f-muted">{empty}</p>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="f-chart-card is-glow f-variant-heatmap">
      <h3>{title}</h3>
      <div className="f-variant-heatmap-scroll">
        <table className="f-variant-heatmap-table">
          <thead>
            <tr>
              <th>Q</th>
              {letters.map((l) => (
                <th key={l}>{l}</th>
              ))}
              <th>Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.id}>
                <th scope="row">{q.label}</th>
                {letters.map((letter, idx) => {
                  const slot = q.variants[idx];
                  if (!slot || slot.n === 0) {
                    return (
                      <td key={letter} className="is-empty">
                        —
                      </td>
                    );
                  }
                  const tone = slot.pct >= 70 ? 'high' : slot.pct >= 40 ? 'mid' : 'low';
                  return (
                    <td key={letter} className={`is-${tone}`} title={`n=${slot.n}`}>
                      <span className="f-heatmap-pct">{slot.pct}%</span>
                      <span className="f-muted">n={slot.n}</span>
                    </td>
                  );
                })}
                <td className="f-heatmap-overall">{q.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TAG_COPY = {
  REWRITE: 'Reword or ease this question',
  REBALANCE: 'Even out the versions',
  SWAP: 'Replace with harder content',
};

/** One ranked to-do list — most urgent first, each row opens the question. */
export function NextEventSection({ data, onItemClick, promptText }) {
  if (!data) return null;
  const items = data.items || [];
  const { submissions = 0, minSampleN = 5 } = data.summary || {};

  return (
    <div className="f-chart-card is-glow f-next-event">
      <div className="f-next-event-head">
        <h3>Prep for next event</h3>
        <p className="f-muted">
          {items.length
            ? `Ranked by impact, based on ${submissions} submission${
                submissions === 1 ? '' : 's'
              }. Questions with fewer than ${minSampleN} takes are left out.`
            : `Nothing needs changing yet — no question with at least ${minSampleN} takes is too hard, too easy, or unbalanced across versions.`}
        </p>
      </div>
      {items.length ? (
        <ol className="f-next-event-actions">
          {items.map((item, i) => {
            const body = (
              <>
                <span className="f-next-event-rank">{i + 1}</span>
                <span className={`f-next-event-tag is-${item.tag.toLowerCase()}`} title={TAG_COPY[item.tag]}>
                  {item.tag}
                </span>
                <span className="f-next-event-copy">
                  <span className="f-next-event-q">
                    {item.label}
                    {promptText ? ` · ${promptText(item)}` : ''}
                  </span>
                  <span className="f-next-event-reason">{item.reason}</span>
                </span>
              </>
            );
            return (
              <li key={item.id} className={`f-next-event-action is-${item.tone || 'medium'}`}>
                {onItemClick ? (
                  <button
                    type="button"
                    className="f-next-event-action-btn"
                    onClick={() => onItemClick(item)}
                    title="Preview question"
                  >
                    {body}
                  </button>
                ) : (
                  <span className="f-next-event-action-btn">{body}</span>
                )}
              </li>
            );
          })}
        </ol>
      ) : null}
      {data.hidden > 0 ? (
        <p className="f-chart-foot f-muted">
          {data.hidden} lower-priority item{data.hidden === 1 ? '' : 's'} not shown.
        </p>
      ) : null}
    </div>
  );
}
