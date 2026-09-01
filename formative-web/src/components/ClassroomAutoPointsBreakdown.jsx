import { formatClassPoints } from '../lib/classroomBadges';
import { CLASSROOM_PASS_THRESHOLD } from '@repo-lib/classroomScoring';

const PLACEMENT_LABELS = {
  first: '1st place',
  top3: 'Top 3',
  top5: 'Top 5',
  top10: 'Top 10',
};

function BreakdownRow({ label, detail, points }) {
  if (!points) return null;
  return (
    <li className="f-classroom-auto-row">
      <span className="f-classroom-auto-label">{label}</span>
      {detail ? <span className="f-muted f-classroom-auto-detail">{detail}</span> : null}
      <span className="f-classroom-auto-pts">+{formatClassPoints(points)}</span>
    </li>
  );
}

export default function ClassroomAutoPointsBreakdown({ breakdown }) {
  if (!breakdown) {
    return (
      <p className="f-muted f-classroom-auto-empty">
        Auto breakdown appears after trivia submissions sync.
      </p>
    );
  }

  const { base, pass, firstDay, placement, perfect, streak, total, byQuiz } = breakdown;
  const placementParts = [];
  if (placement.first) placementParts.push(`${placement.first}× 1st`);
  if (placement.top3) placementParts.push(`${placement.top3}× top 3`);
  if (placement.top5) placementParts.push(`${placement.top5}× top 5`);
  if (placement.top10) placementParts.push(`${placement.top10}× top 10`);

  return (
    <div className="f-classroom-auto-breakdown">
      <h4 className="f-player-detail-title">Auto points breakdown</h4>
      <p className="f-muted f-classroom-auto-intro">
        Pass threshold {CLASSROOM_PASS_THRESHOLD}%. Placement uses best attempt per quiz; ties break
        by earlier submit.
      </p>
      <ul className="f-classroom-auto-list">
        <BreakdownRow
          label="Base (per trivia)"
          detail={`${base.count} entered`}
          points={base.points}
        />
        <BreakdownRow
          label="Pass bonus"
          detail={`${pass.count} at ≥${CLASSROOM_PASS_THRESHOLD}%`}
          points={pass.points}
        />
        <BreakdownRow
          label="First-day bonus"
          detail={`${firstDay.count} on quiz open day`}
          points={firstDay.points}
        />
        <BreakdownRow
          label="Placement"
          detail={placementParts.join(' · ') || null}
          points={placement.points}
        />
        <BreakdownRow
          label="Perfect score"
          detail={`${perfect.count} at 100%`}
          points={perfect.points}
        />
        <BreakdownRow
          label="Pass streak"
          detail={`${streak.count} in 2+ streak`}
          points={streak.points}
        />
      </ul>
      <p className="f-classroom-auto-total">
        Auto subtotal: <strong>{formatClassPoints(total)}</strong>
      </p>

      {byQuiz?.length ? (
        <details className="f-classroom-auto-quiz-details">
          <summary>Per-quiz tally ({byQuiz.length})</summary>
          <ul className="f-classroom-auto-quiz-list">
            {[...byQuiz]
              .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))
              .map((q) => (
                <li key={`${q.quizId}-${q.submittedAt}`}>
                  <span className="f-classroom-auto-quiz-title">{q.quizTitle}</span>
                  <span className="f-muted">
                    {q.pct != null ? `${q.pct}%` : '—'}
                    {q.placementTier ? ` · ${PLACEMENT_LABELS[q.placementTier] || q.placementTier}` : ''}
                  </span>
                  <span className="f-classroom-auto-pts">+{formatClassPoints(q.quizPoints)}</span>
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
