/**
 * Build an Excel-friendly CSV (UTF-8 BOM) from trivia responses.
 * Spreadsheet export is for review — live contest storage stays on the API/DB.
 */

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function scoredQuestions(questions) {
  return (questions || []).filter(
    (q) =>
      !['image', 'content', 'audio', 'video', 'embed', 'file_response', 'audio_response', 'drawing'].includes(
        q.type
      ) &&
      !q.meta?.is_discord_gate &&
      !q.meta?.is_ingame_gate &&
      Number(q.points) > 0
  );
}

export function responsesToCsv(quiz, questions, responses) {
  const scored = scoredQuestions(questions);
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
    ...scored.map((q, i) => `q${i + 1}_${String(q.prompt || q.id).slice(0, 40).replace(/\s+/g, '_')}`),
    'answers_json',
  ];

  const rows = (responses || []).map((r) => {
    const max = Number(r.max_score) || 0;
    const score = Number(r.score) || 0;
    const percent = max > 0 ? Math.round((score / max) * 100) : 0;
    const per = r.per_question || {};
    return [
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
      ...scored.map((q) => {
        const v = per[q.id];
        if (v == null) return '';
        return Number(v) ? 'correct' : 'wrong';
      }),
      JSON.stringify(r.answers || {}),
    ].map(csvEscape);
  });

  const lines = [headers.map(csvEscape).join(','), ...rows.map((r) => r.join(','))];
  // BOM helps Excel on Windows recognize UTF-8
  return `\uFEFF${lines.join('\n')}\n`;
}

export function downloadResponsesCsv(quiz, questions, responses) {
  const csv = responsesToCsv(quiz, questions, responses);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const slug = String(quiz?.slug || 'trivia').replace(/[^\w-]+/g, '_');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-responses-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
