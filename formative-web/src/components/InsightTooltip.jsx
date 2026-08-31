/** Hover/focus explainer for Insights cards — keeps chart titles uncluttered until you ask. */
export function ChartTitle({ title, tooltip }) {
  return (
    <div className="f-chart-title-row">
      <h3>{title}</h3>
      {tooltip ? <InsightTooltip>{tooltip}</InsightTooltip> : null}
    </div>
  );
}

export function InsightTooltip({ label = 'Why this matters', children }) {
  if (!children) return null;
  return (
    <span className="f-insight-tip">
      <button type="button" className="f-insight-tip-btn" aria-label={label}>
        ?
      </button>
      <span className="f-insight-tip-panel" role="tooltip">
        {children}
      </span>
    </span>
  );
}

export default InsightTooltip;
