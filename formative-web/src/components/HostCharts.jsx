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

/** Vertical histogram for time buckets or counts. */
export function ColumnHistogram({ title, rows, empty = 'No data yet', glow = false, hint }) {
  const list = (rows || []).filter((r) => Number(r.value) > 0);
  const max = Math.max(1, ...list.map((r) => Number(r.value) || 0));
  return (
    <div className={`f-chart-card${glow ? ' is-glow' : ''}`}>
      <h3>{title}</h3>
      {hint ? <p className="f-chart-hint f-muted">{hint}</p> : null}
      {!list.length ? (
        <p className="f-muted">{empty}</p>
      ) : (
        <div className="f-col-histogram">
          {list.map((r) => {
            const val = Number(r.value) || 0;
            const height = Math.max(8, Math.round((val / max) * 100));
            return (
              <div className="f-col-histogram-slot" key={r.label}>
                <div className="f-col-histogram-val">{val}</div>
                <div className="f-col-histogram-bar-wrap">
                  <div
                    className="f-col-histogram-bar"
                    style={{ height: `${height}%`, background: r.color || 'var(--f-blue)' }}
                    title={`${r.label}: ${val}`}
                  />
                </div>
                <div className="f-col-histogram-label">{r.label}</div>
              </div>
            );
          })}
        </div>
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

/** One row per question; stacked mini-bars per variant letter. */
export function VariantStackChart({ title, questions, empty = 'No variant questions yet', onQuestionClick, hint }) {
  const rows = (questions || []).filter((q) => q.hasVariants && q.variants?.some((v) => v.n > 0));
  if (!rows.length) {
    return (
      <div className="f-chart-card is-glow">
        <h3>{title}</h3>
        <p className="f-muted">{empty}</p>
      </div>
    );
  }

  return (
    <div className="f-chart-card is-glow f-variant-stack-chart">
      <h3>{title}</h3>
      {hint ? <p className="f-chart-hint f-muted">{hint}</p> : null}
      <div className="f-variant-stack-list">
        {rows.map((q) => {
          const label = q.label;
          const slots = q.variants.filter((v) => v.n > 0);
          return (
            <div className="f-variant-stack-row" key={q.id}>
              <div className="f-variant-stack-head">
                {onQuestionClick ? (
                  <button
                    type="button"
                    className="f-variant-stack-q f-variant-stack-q-btn"
                    onClick={() => onQuestionClick(q)}
                    title="Preview question"
                  >
                    {label}
                  </button>
                ) : (
                  <span className="f-variant-stack-q">{label}</span>
                )}
                <span className="f-variant-stack-overall">{q.pct}% overall</span>
              </div>
              <div className="f-variant-stack-bars">
                {slots.map((slot) => (
                  <div className="f-variant-stack-slot" key={`${q.id}-${slot.index}`}>
                    <div className="f-variant-stack-meta">
                      <span className="f-variant-chip" style={{ '--v-accent': slot.color }}>
                        Ver {slot.letter}
                      </span>
                      <span className="f-variant-stack-pct">{slot.pct}%</span>
                      <span className="f-muted">n={slot.n}</span>
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
        })}
      </div>
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

function NextEventList({ title, items, empty, onItemClick }) {
  if (!items?.length) {
    return (
      <div className="f-next-event-col">
        <h4>{title}</h4>
        <p className="f-muted">{empty}</p>
      </div>
    );
  }
  return (
    <div className="f-next-event-col">
      <h4>{title}</h4>
      <ul className="f-next-event-list">
        {items.map((item) => (
          <li key={item.id}>
            {onItemClick ? (
              <button type="button" className="f-next-event-q-btn" onClick={() => onItemClick(item)}>
                <span className="f-next-event-q">{item.label}</span>
                <span className="f-next-event-reason">{item.reason || `${item.pct}%`}</span>
              </button>
            ) : (
              <>
                <span className="f-next-event-q">{item.label}</span>
                <span className="f-next-event-reason">{item.reason || `${item.pct}%`}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NextEventSection({ data, onItemClick }) {
  if (!data) return null;
  return (
    <div className="f-chart-card is-glow f-next-event">
      <div className="f-next-event-head">
        <h3>Prep for next event</h3>
        <p className="f-muted">
          Based on {data.summary?.submissions || 0} submission
          {data.summary?.submissions === 1 ? '' : 's'} — rewrite skewed or confusing items, keep stable
          questions, trim giveaways.
        </p>
      </div>
      <div className="f-next-event-grid">
        <NextEventList
          title="Rewrite candidates"
          items={data.rewrite}
          empty="No weak questions flagged yet"
          onItemClick={onItemClick}
        />
        <NextEventList
          title="Skewed variants"
          items={data.skewed?.map((s) => ({ ...s, reason: s.reason }))}
          empty="Variant balance looks OK"
          onItemClick={onItemClick}
        />
        <NextEventList
          title="Keep"
          items={data.keep?.map((k) => ({ ...k, reason: `${k.pct}% · stable` }))}
          empty="—"
          onItemClick={onItemClick}
        />
        <NextEventList title="Trim / swap" items={data.trim} empty="Nothing too easy flagged" onItemClick={onItemClick} />
      </div>
    </div>
  );
}
