/** Match submissions by Discord or in-game name (case-insensitive substring). */

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

export function responseMatchesQuery(response, query) {
  const q = norm(query);
  if (!q) return true;
  const discord = norm(response?.discord_username);
  const ingame = norm(response?.ingame_name);
  return discord.includes(q) || ingame.includes(q);
}

function matchScore(response, q) {
  const discord = norm(response?.discord_username);
  const ingame = norm(response?.ingame_name);
  if (!discord && !ingame) return 0;
  if (discord === q || ingame === q) return 100;
  if (discord.startsWith(q) || ingame.startsWith(q)) return 80;
  if (discord.includes(q) || ingame.includes(q)) return 50;
  return 0;
}

export function searchResponses(responses, query, limit = 12) {
  const q = norm(query);
  if (!q) return { matches: [], active: false };

  const matches = (responses || [])
    .map((response) => ({
      response,
      score: matchScore(response, q),
      label: String(response.discord_username || response.ingame_name || 'Unknown').trim(),
      sub: String(response.ingame_name || '').trim(),
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    })
    .slice(0, limit);

  return { matches, active: true };
}
