import { responseDurationMs } from './triviaInsights';
import {
  cmpNumNullLast,
  cmpResponsesByScore,
  responsePercentRounded,
  submittedMsFromResponse,
} from '@repo-lib/triviaRankTiebreak';

export const RESPONSE_SORT_OPTIONS = [
  { id: 'submitted_desc', label: 'Submission date (newest)' },
  { id: 'submitted_asc', label: 'Submission date (oldest)' },
  { id: 'discord_az', label: 'Discord (A–Z)' },
  { id: 'discord_za', label: 'Discord (Z–A)' },
  { id: 'ingame_az', label: 'In-Game (A–Z)' },
  { id: 'ingame_za', label: 'In-Game (Z–A)' },
  { id: 'score_hi', label: 'Score % (Hi–Lo · earlier submit wins ties)' },
  { id: 'score_lo', label: 'Score % (Lo–Hi · earlier submit wins ties)' },
  { id: 'time_hi', label: 'Time (longest first)' },
  { id: 'time_lo', label: 'Time (shortest first)' },
];

export function responsePercent(r) {
  return responsePercentRounded(r);
}

function cmpStr(a, b, dir = 1) {
  const sa = String(a || '').toLowerCase();
  const sb = String(b || '').toLowerCase();
  if (!sa && !sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sa.localeCompare(sb) * dir;
}

function submittedMs(r) {
  return submittedMsFromResponse(r);
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
      return list.sort((a, b) => cmpResponsesByScore(a, b, true));
    case 'score_lo':
      return list.sort((a, b) => cmpResponsesByScore(a, b, false));
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
    case 'submitted_desc':
    default:
      return list.sort((a, b) => cmpNumNullLast(submittedMs(a), submittedMs(b), -1));
  }
}

export function sortLabel(sortId) {
  return RESPONSE_SORT_OPTIONS.find((o) => o.id === sortId)?.label || 'Sort';
}
