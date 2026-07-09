/**
 * Lightweight live check — no Twitch API key required.
 * @returns {boolean|null} true live, false offline, null unknown
 */
export async function isTwitchChannelLive(channel) {
  try {
    const res = await fetch(
      `https://decapi.me/twitch/uptime/${encodeURIComponent(channel)}`,
      { method: 'GET' },
    );
    if (!res.ok) return null;
    const text = (await res.text()).trim().toLowerCase();
    if (!text) return null;
    if (text.includes('offline')) return false;
    return true;
  } catch {
    return null;
  }
}
