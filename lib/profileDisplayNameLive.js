/** In-memory display-name cache so profile edits propagate to Builds partners without remount. */
const cache = new Map();
const listeners = new Set();

export function getLiveDisplayName(username) {
  if (!username) return null;
  return cache.get(String(username).trim()) || null;
}

export function setLiveDisplayName(username, displayName) {
  const key = String(username || '').trim();
  const name = String(displayName || '').trim();
  if (!key || !name) return;
  cache.set(key, name);
  listeners.forEach((fn) => {
    try {
      fn(key, name);
    } catch (_) {}
  });
}

export function subscribeLiveDisplayNames(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
