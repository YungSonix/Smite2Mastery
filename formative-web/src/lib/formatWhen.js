/** Human-readable IANA zone, e.g. "Pacific Daylight Time". */
export function localTimeZoneLabel() {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' }).formatToParts(
      new Date()
    );
    return (
      parts.find((p) => p.type === 'timeZoneName')?.value ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'local time'
    );
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  }
}

/** Date + time in the viewer's timezone, with abbreviation (e.g. "Aug 27, 2026, 7:30 PM PDT"). */
export function formatWhenLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    // dateStyle/timeStyle cannot be combined with timeZoneName (throws "Invalid option : option").
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return d.toLocaleString();
  }
}

/** Student-facing unlock/close label — always in the viewer's local timezone. */
export function formatWhenWithLocalHint(iso) {
  const when = formatWhenLocal(iso);
  if (!when) return '';
  return `${when} (your local time)`;
}

/** Replace raw ISO timestamps in API error strings with local labels. */
export function humanizeQuizError(message) {
  const text = String(message || '').trim();
  if (!text) return text;
  return text.replace(
    /\d{4}-\d{2}-\d{2}T[\d:.]+Z/g,
    (iso) => formatWhenWithLocalHint(iso) || iso
  );
}
/** Countdown until an ISO instant, e.g. "Unlocks in 2h 15m". Empty when past or invalid. */
export function formatUnlockCountdown(iso, nowMs = Date.now()) {
  const target = Date.parse(iso);
  if (!Number.isFinite(target)) return '';
  const ms = target - nowMs;
  if (ms <= 0) return '';
  const totalSec = Math.ceil(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `Unlocks in ${days}d ${hours}h`;
  if (hours > 0) return `Unlocks in ${hours}h ${minutes}m`;
  if (minutes > 0) return `Unlocks in ${minutes}m ${seconds}s`;
  return `Unlocks in ${seconds}s`;
}
