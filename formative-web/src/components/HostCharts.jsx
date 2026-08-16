export function BarChart({ title, rows, valueKey = 'value', labelKey = 'label', maxHint, empty = 'No data yet' }) {
  const list = Array.isArray(rows) ? rows : [];
  const max = Math.max(1, maxHint || Math.max(0, ...list.map((r) => Number(r[valueKey]) || 0)));
  return (
    <div className="f-chart-card">
      <h3>{title}</h3>
      {!list.length ? (
        <p className="f-muted">{empty}</p>
      ) : (
        <div className="f-bar-chart">
          {list.map((r, i) => (
            <div className="f-bar-chart-row" key={r.id || `${r[labelKey]}-${i}`}>
              <div className="f-bar-chart-label" title={r.title || r[labelKey]}>
                {r[labelKey]}
              </div>
              <div className="f-bar-chart-track">
                <div
                  className="f-bar-chart-fill"
                  style={{ width: `${Math.round(((Number(r[valueKey]) || 0) / max) * 100)}%` }}
                />
              </div>
              <div className="f-bar-chart-val">{r.display != null ? r.display : r[valueKey]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Donut({ title, parts, center, empty = 'No data yet' }) {
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
    <div className="f-chart-card">
      <h3>{title}</h3>
      {!total ? (
        <p className="f-muted">{empty}</p>
      ) : (
        <div className="f-donut-wrap">
          <div
            className="f-donut"
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
