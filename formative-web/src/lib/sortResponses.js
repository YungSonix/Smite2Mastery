import { responseDurationMs } from './triviaInsights';

export const RESPONSE_SORT_OPTIONS = [
  { id: 'submitted_desc', label: 'Submission date (newest)' },
  { id: 'submitted_asc', label: 'Submission date (oldest)' },
  { id: 'discord_az', label: 'Discord (A–Z)' },
  { id: 'discord_za', label: 'Discord (Z–A)' },
  { id: 'ingame_az', label: 'In-Game (A–Z)' },
  { id: 'ingame_za', label: 'In-Game (Z–A)' },
  { id: 'score_hi', label: 'Score % (Hi–Lo)' },
  { id: 'score_lo', label: 'Score % (Lo–Hi)' },
  { id: 'time_hi', label: 'Time (longest first)' },
  { id: 'time_lo', label: 'Time (shortest first)' },
  { id: 'ip_az', label: 'IP (A–Z)' },
];

export function responsePercent(r) {
  const max = Number(r?.max_score) || 0;
  if (max <= 0) return 0;
  return Math.round((Number(r?.score) / max) * 100);
}

function cmpStr(a, b, dir = 1) {
  const sa = String(a || '').toLowerCase();
  const sb = String(b || '').toLowerCase();
  if (!sa && !sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sa.localeCompare(sb) * dir;
}

/** Null / missing numeric values sort last (not as 0). */
function cmpNumNullLast(a, b, dir = 1) {
  const aNull = a == null || !Number.isFinite(a);
  const bNull = b == null || !Number.isFinite(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return (a - b) * dir;
}

function submittedMs(r) {
  if (!r?.submitted_at) return null;
  const t = new Date(r.submitted_at).getTime();
  return Number.isFinite(t) ? t : null;
}

export function sortResponses(responses, sortId) {
  const list = [...(responses || [])];
  switch (sortId) {
    case 'discord_az':
      return list.sort((a, b) => cmpStr(a.discord_username, b.discord_username, 1));
    case 'discord_za':
      return list.sort((a, b) => cmpStr(a.discord_username, b.discord_username, -1));
    case 'ingame_az':
      return list.sort((a, b) => cmpStr(a.ingame_name, b.ingame_name, 1));
    case 'ingame_za':
      return list.sort((a, b) => cmpStr(a.ingame_name, b.ingame_name, -1));
    case 'score_hi':
      return list.sort((a, b) => responsePercent(b) - responsePercent(a));
    case 'score_lo':
      return list.sort((a, b) => responsePercent(a) - responsePercent(b));
    case 'time_hi':
      return list.sort((a, b) =>
        cmpNumNullLast(responseDurationMs(a), responseDurationMs(b), -1)
      );
    case 'time_lo':
      return list.sort((a, b) =>
        cmpNumNullLast(responseDurationMs(a), responseDurationMs(b), 1)
      );
    case 'submitted_asc':
      return list.sort((a, b) => cmpNumNullLast(submittedMs(a), submittedMs(b), 1));
    case 'ip_az':
      return list.sort((a, b) => cmpStr(a.ip_address, b.ip_address, 1));
    case 'submitted_desc':
    default:
      return list.sort((a, b) => cmpNumNullLast(submittedMs(a), submittedMs(b), -1));
  }
}

export function sortLabel(sortId) {
  return RESPONSE_SORT_OPTIONS.find((o) => o.id === sortId)?.label || 'Sort';
}
