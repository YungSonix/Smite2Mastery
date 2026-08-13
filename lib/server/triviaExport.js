/** Excel-friendly CSV export for trivia_responses (Node). */

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function responsesToCsv(quiz, responses) {
  const headers = [
    'submitted_at',
    'discord_username',
    'ingame_name',
    'score',
    'max_score',
    'percent',
    'ip_address',
    'user_agent',
    'response_id',
    'quiz_slug',
    'quiz_title',
    'answers_json',
  ];
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of responses || []) {
    const max = Number(r.max_score) || 0;
    const score = Number(r.score) || 0;
    const percent = max > 0 ? Math.round((score / max) * 100) : 0;
    lines.push(
      [
        r.submitted_at || '',
        r.discord_username || '',
        r.ingame_name || '',
        score,
        max,
        percent,
        r.ip_address || '',
        r.user_agent || '',
        r.id || '',
        quiz?.slug || '',
        quiz?.title || '',
        JSON.stringify(r.answers || {}),
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  return `\uFEFF${lines.join('\n')}\n`;
}

module.exports = { responsesToCsv, csvEscape };
