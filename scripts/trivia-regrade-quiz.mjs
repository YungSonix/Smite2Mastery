#!/usr/bin/env node
/**
 * Regrade trivia_responses for a quiz from the current answer keys.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/trivia-regrade-quiz.mjs <quiz-slug-or-id> [--write] [--question=<uuid>]
 *
 * Dry-run (default): prints how many submissions would change.
 * --write: apply score / per_question updates.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { supabaseAdmin } = require('../lib/server/triviaApi');
const { regradeOneResponse } = require('../lib/server/triviaRegrade');
const { insertQuestionResponses } = require('../lib/server/triviaQuestionResponses');

const args = process.argv.slice(2).filter((a) => a !== '--');
const write = args.includes('--write');
const questionArg = args.find((a) => a.startsWith('--question='));
const questionIds = questionArg
  ? [questionArg.slice('--question='.length)].filter(Boolean)
  : undefined;
const key = args.find((a) => !a.startsWith('-')) || '';

if (!key) {
  console.error('Usage: node scripts/trivia-regrade-quiz.mjs <quiz-slug-or-id> [--write] [--question=<uuid>]');
  process.exit(1);
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

async function main() {
  const sb = supabaseAdmin();
  let quizQuery = sb.from('trivia_quizzes').select('id, slug, title, settings');
  quizQuery = isUuid(key) ? quizQuery.eq('id', key) : quizQuery.eq('slug', key);
  const { data: quiz, error: quizErr } = await quizQuery.maybeSingle();
  if (quizErr) throw new Error(quizErr.message);
  if (!quiz) throw new Error(`Quiz not found: ${key}`);

  const { data: questions, error: qErr } = await sb
    .from('trivia_questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('sort_order', { ascending: true });
  if (qErr) throw new Error(qErr.message);

  const { data: responses, error: rErr } = await sb
    .from('trivia_responses')
    .select('id, quiz_id, discord_username, answers, per_question, score, max_score')
    .eq('quiz_id', quiz.id)
    .order('submitted_at', { ascending: true });
  if (rErr) throw new Error(rErr.message);

  console.log(
    `Quiz: ${quiz.title} (${quiz.slug}) — ${responses?.length || 0} response(s)` +
      (questionIds?.length ? ` · question filter ${questionIds.join(',')}` : '')
  );

  let wouldUpdate = 0;
  let unchanged = 0;
  let written = 0;

  for (const row of responses || []) {
    const result = regradeOneResponse({
      questions: questions || [],
      quizSettings: quiz.settings,
      response: row,
      questionIds,
    });
    if (!result.changed) {
      unchanged += 1;
      continue;
    }
    wouldUpdate += 1;
    const before = `${row.score}/${row.max_score}`;
    const after = `${result.score}/${result.maxScore}`;
    console.log(`  ${row.discord_username}: ${before} → ${after}`);

    if (write) {
      const { error } = await sb
        .from('trivia_responses')
        .update({
          per_question: result.perQuestion,
          score: result.score,
          max_score: result.maxScore,
        })
        .eq('id', row.id);
      if (error) throw new Error(error.message);
      await sb.from('trivia_question_responses').delete().eq('response_id', row.id);
      await insertQuestionResponses(sb, {
        responseId: row.id,
        quizId: quiz.id,
        discord: row.discord_username,
        questions: questions || [],
        answers: result.answers,
        perQuestion: result.perQuestion,
        variantMap: result.variantMap,
      });
      written += 1;
    }
  }

  if (write) {
    console.log(`Updated ${written} response(s). Unchanged: ${unchanged}.`);
  } else {
    console.log(`Dry-run: would update ${wouldUpdate} response(s). Unchanged: ${unchanged}.`);
    console.log('Re-run with --write to apply.');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
