/**
 * Regrade existing trivia_responses from the current answer keys.
 * Used by host "Regrade from answer key" and auto-regrade when correct answers change.
 */
const { scoreAnswersWithVariants } = require('./triviaApi');
const { isContentType, isManualType } = require('./triviaQuestionTypes');
const { applyQuizPartialCreditToQuestions } = require('./quizGradingSettings');
const { extractLifelines, lifelineMultiplier } = require('./triviaHints');
const { extractVariantMap } = require('./triviaVariants');
const { insertQuestionResponses } = require('./triviaQuestionResponses');

function stableJson(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
}

/** True when patch changes the answer key (including variant keys). */
function answerKeyChanged(before, patch) {
  if (!before || !patch || typeof patch !== 'object') return false;
  if ('correct' in patch && stableJson(before.correct) !== stableJson(patch.correct)) {
    return true;
  }
  if ('meta' in patch) {
    const oldVars = Array.isArray(before.meta?.variants) ? before.meta.variants : [];
    const newVars = Array.isArray(patch.meta?.variants) ? patch.meta.variants : [];
    const n = Math.max(oldVars.length, newVars.length);
    for (let i = 0; i < n; i += 1) {
      if (stableJson(oldVars[i]?.correct) !== stableJson(newVars[i]?.correct)) return true;
    }
  }
  return false;
}

function scoreFromPerQuestion(questions, perQuestion, answers) {
  const usedMap = extractLifelines(answers);
  let score = 0;
  let maxScore = 0;
  for (const q of questions || []) {
    if (isContentType(q.type)) continue;
    const pts = Number.isFinite(Number(q.points)) ? Number(q.points) : 1;
    if (q.meta?.is_discord_gate || q.meta?.is_ingame_gate || pts <= 0) continue;
    maxScore += pts;
    const raw = perQuestion?.[q.id];
    if (raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    const frac = n > 1 ? Math.min(1, n / pts) : Math.max(0, Math.min(1, n));
    score += frac * pts * lifelineMultiplier(usedMap[q.id]);
  }
  return { score, maxScore };
}

function perQuestionChanged(a, b, questionIds) {
  const ids =
    Array.isArray(questionIds) && questionIds.length
      ? questionIds
      : [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
  for (const id of ids) {
    const left = a?.[id];
    const right = b?.[id];
    if (left == null && right == null) continue;
    if (left == null || right == null) return true;
    if (Number(left) !== Number(right)) return true;
  }
  return false;
}

/**
 * Recompute per_question / score for one submission from current questions.
 * Preserves host grades on manual upload types.
 * @param {object} opts
 * @param {object[]} opts.questions
 * @param {object} opts.quizSettings
 * @param {object} opts.response - trivia_responses row
 * @param {string[]} [opts.questionIds] - limit overwrite to these question ids
 */
function regradeOneResponse({ questions, quizSettings, response, questionIds }) {
  const answers = response?.answers && typeof response.answers === 'object' ? response.answers : {};
  const map = extractVariantMap(answers) || {};
  const graded = scoreAnswersWithVariants(
    applyQuizPartialCreditToQuestions(questions || [], quizSettings),
    answers,
    map
  );

  const prev = response?.per_question && typeof response.per_question === 'object'
    ? { ...response.per_question }
    : {};
  const next = { ...prev };
  const limit =
    Array.isArray(questionIds) && questionIds.length
      ? new Set(questionIds.map(String))
      : null;

  for (const q of questions || []) {
    const qid = String(q.id);
    if (limit && !limit.has(qid)) continue;
    if (isContentType(q.type)) {
      delete next[qid];
      continue;
    }
    if (isManualType(q.type)) {
      // Keep host-set grades; only fill blanks the same way submit does when unset.
      if (prev[qid] == null && graded.perQuestion[qid] != null) {
        next[qid] = graded.perQuestion[qid];
      }
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(graded.perQuestion, qid)) {
      next[qid] = graded.perQuestion[qid];
    } else {
      delete next[qid];
    }
  }

  const { score, maxScore } = scoreFromPerQuestion(questions, next, answers);
  const changed = perQuestionChanged(prev, next, limit ? [...limit] : null)
    || Number(response?.score) !== Number(score)
    || Number(response?.max_score) !== Number(maxScore);

  return {
    perQuestion: next,
    score,
    maxScore,
    variantMap: map,
    answers,
    changed,
  };
}

async function refreshQuestionResponseRows(sb, {
  responseId,
  quizId,
  discord,
  questions,
  answers,
  perQuestion,
  variantMap,
}) {
  try {
    // Replace the full analytics snapshot for this submission so partial
    // question regrades cannot collide with leftover unique rows.
    await sb.from('trivia_question_responses').delete().eq('response_id', responseId);
    await insertQuestionResponses(sb, {
      responseId,
      quizId,
      discord,
      questions,
      answers,
      perQuestion,
      variantMap,
    });
  } catch (err) {
    console.warn('trivia regrade question_responses', err?.message || err);
  }
}

/**
 * Regrade all (or filtered) submissions for a quiz.
 * @returns {{ total, updated, unchanged, errors }}
 */
async function regradeQuizResponses(sb, {
  quiz,
  questions,
  questionIds,
  responses,
}) {
  const list = Array.isArray(responses) ? responses : [];
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const row of list) {
    try {
      const result = regradeOneResponse({
        questions,
        quizSettings: quiz?.settings,
        response: row,
        questionIds,
      });
      if (!result.changed) {
        unchanged += 1;
        continue;
      }
      const { error } = await sb
        .from('trivia_responses')
        .update({
          per_question: result.perQuestion,
          score: result.score,
          max_score: result.maxScore,
        })
        .eq('id', row.id);
      if (error) {
        errors += 1;
        console.warn('trivia regrade update', row.id, error.message);
        continue;
      }
      updated += 1;
      void refreshQuestionResponseRows(sb, {
        responseId: row.id,
        quizId: quiz.id,
        discord: row.discord_username,
        questions,
        answers: result.answers,
        perQuestion: result.perQuestion,
        variantMap: result.variantMap,
      });
    } catch (err) {
      errors += 1;
      console.warn('trivia regrade', row?.id, err?.message || err);
    }
  }

  return { total: list.length, updated, unchanged, errors };
}

async function loadQuizResponses(sb, quizId) {
  const { data, error } = await sb
    .from('trivia_responses')
    .select('id, quiz_id, discord_username, answers, per_question, score, max_score')
    .eq('quiz_id', quizId);
  if (error) throw new Error(error.message);
  return data || [];
}

async function regradeOwnedQuiz(sb, {
  quiz,
  questions,
  questionIds,
}) {
  if (!quiz?.id) return { total: 0, updated: 0, unchanged: 0, errors: 0 };
  const responses = await loadQuizResponses(sb, quiz.id);
  if (!responses.length) return { total: 0, updated: 0, unchanged: 0, errors: 0 };
  return regradeQuizResponses(sb, {
    quiz,
    questions: questions || [],
    questionIds,
    responses,
  });
}

module.exports = {
  answerKeyChanged,
  regradeOneResponse,
  regradeQuizResponses,
  regradeOwnedQuiz,
  scoreFromPerQuestion,
};
