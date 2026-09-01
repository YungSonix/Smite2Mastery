const { normDiscordKey } = require('./triviaPlayerProfiles');

/**
 * Resolve smite2app shop profile titles for trivia Discord identities.
 * No dedicated discord column — match normDiscordKey(username|display_name) to discord_key.
 */
async function fetchAppProfileTitlesByDiscordKeys(sb, discordKeys) {
  const keySet = new Set(
    (discordKeys || []).map((k) => normDiscordKey(k)).filter(Boolean)
  );
  if (!keySet.size) return {};

  const { data, error } = await sb
    .from('user_data')
    .select('username, display_name, profile_title')
    .not('profile_title', 'is', null);
  if (error) throw error;

  const map = {};
  for (const row of data || []) {
    const title = String(row.profile_title || '').trim();
    if (!title) continue;
    for (const candidate of [row.username, row.display_name]) {
      const k = normDiscordKey(candidate);
      if (k && keySet.has(k) && !map[k]) map[k] = title;
    }
  }
  return map;
}

module.exports = { fetchAppProfileTitlesByDiscordKeys };
