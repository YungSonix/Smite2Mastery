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
}) {
  const list = Array.isArray(rows) ? rows : [];
  const max = Math.max(1, maxHint || Math.max(0, ...list.map((r) => Number(r[valueKey]) || 0)));
  return (
    <div className={`f-chart-card${glow ? ' is-glow' : ''}`}>
      <h3>{title}</h3>
      {!list.length ? (
        <p className="f-muted">{empty}</p>
      ) : (
        <div className="f-bar-chart">
          {list.map((r, i) => {
            const val = Number(r[valueKey]) || 0;
            const width = Math.round((val / max) * 100);
            const fillStyle = r.color ? { background: r.color, width: `${width}%` } : { width: `${width}%` };
            return (
              <div className="f-bar-chart-row" key={r.id || `${r[labelKey]}-${i}`}>
                <div className="f-bar-chart-label" title={r.title || r[labelKey]}>
                  {r[labelKey]}
                </div>
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
export function VariantStackChart({ title, questions, empty = 'No variant questions yet' }) {
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
      <div className="f-variant-stack-list">
        {rows.map((q) => {
          const label = q.label;
          const slots = q.variants.filter((v) => v.n > 0);
          return (
            <div className="f-variant-stack-row" key={q.id}>
              <div className="f-variant-stack-head">
                <span className="f-variant-stack-q">{label}</span>
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
