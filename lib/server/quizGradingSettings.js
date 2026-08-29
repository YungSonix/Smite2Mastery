/** Quiz-wide grading options applied when scoring submissions. */

function quizPartialCreditMultipleSelection(settings) {
  return Boolean(settings?.partial_credit_multiple_selection);
}

/** In-memory copy: turn on partial credit for every multiple-selection question. */
function applyQuizPartialCreditToQuestions(questions, settings) {
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

module.exports = {
  quizPartialCreditMultipleSelection,
  applyQuizPartialCreditToQuestions,
};
