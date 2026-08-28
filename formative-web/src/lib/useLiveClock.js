import { useEffect, useState } from 'react';

/** Tick for live elapsed-time labels (host Responses / side panel). */
export function useLiveClock(active, intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return now;
}
