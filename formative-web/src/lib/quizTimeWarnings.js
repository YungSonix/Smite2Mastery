/** Brief toasts at these marks; last FINAL_COUNTDOWN_SEC shows seconds in the timer chip only. */
export const TIMER_CUE_THRESHOLDS = [
  { sec: 300, label: '5 minutes left' },
  { sec: 60, label: '1 minute left' },
  { sec: 30, label: '30 seconds left' },
];

export const FINAL_COUNTDOWN_SEC = 5;

export function remainingSeconds(remainingMs) {
  return Math.max(0, Math.ceil((remainingMs ?? 0) / 1000));
}

export function timerFloatClassName(remainingMs) {
  const sec = remainingSeconds(remainingMs);
  if (sec > 0 && sec <= FINAL_COUNTDOWN_SEC) return 'f-timer-float is-final';
  if (sec <= 30) return 'f-timer-float is-low';
  return 'f-timer-float';
}

export function formatTimerDisplay(remainingMs) {
  const sec = remainingSeconds(remainingMs);
  if (sec > 0 && sec <= FINAL_COUNTDOWN_SEC) return String(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** First milestone not yet fired that the clock has reached. */
export function nextTimerCue(remainingMs, firedSet) {
  const sec = remainingSeconds(remainingMs);
  for (const cue of TIMER_CUE_THRESHOLDS) {
    if (sec <= cue.sec && !firedSet.has(cue.sec)) return cue;
  }
  return null;
}
