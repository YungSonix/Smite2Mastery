/** Quiz-wide grading helpers (mirrors lib/server/quizGradingSettings.js). */

export function quizPartialCreditMultipleSelection(settings) {
  return Boolean(settings?.partial_credit_multiple_selection);
}

export function applyQuizPartialCreditToQuestions(questions, settings) {
  if (!quizPartialCreditMultipleSelection(settings)) return questions || [];
  return (questions || []).map((q) => {
    if (String(q?.type || '') !== 'multiple_selection') return q;
    if (q.meta?.allow_partial_credit) return q;
    return {
      ...q,
      meta: { ...(q.meta || {}), allow_partial_credit: true },
    };
  });
}

export function questionAllowsPartialCredit(q, settings) {
  return Boolean(q?.meta?.allow_partial_credit || quizPartialCreditMultipleSelection(settings));
}
