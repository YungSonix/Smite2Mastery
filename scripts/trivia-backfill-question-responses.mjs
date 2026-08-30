#!/usr/bin/env node
/**
 * Backfill trivia_question_responses from existing trivia_responses rows.
 *
 * Prerequisite: run supabase/formative_trivia_question_responses.sql in Supabase.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/trivia-backfill-question-responses.mjs smite-2-trivia --write
 *
 * Dry-run (default): counts rows that would be inserted.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { supabaseAdmin } = require('../lib/server/triviaApi');
const { extractVariantMap } = require('../lib/server/triviaVariants');
const {
  buildQuestionResponseRows,
  insertQuestionResponses,
} = require('../lib/server/triviaQuestionResponses');

const slug = process.argv.find((a) => !a.startsWith('-') && !a.endsWith('.mjs')) || 'smite-2-trivia';
const write = process.argv.includes('--write');
const batchSize = 25;

async function main() {
  const sb = supabaseAdmin();

  const { data: quiz, error: quizErr } = await sb
    .from('trivia_quizzes')
    .select('id, slug, title')
    .eq('slug', slug)
    .maybeSingle();
  if (quizErr) throw new Error(quizErr.message);
  if (!quiz) throw new Error(`Quiz not found: ${slug}`);

  const { data: questions, error: qErr } = await sb
    .from('trivia_questions')
    .select('*')
    .eq('quiz_id', quiz.id)
    .order('sort_order', { ascending: true });
  if (qErr) throw new Error(qErr.message);

  const { data: responses, error: rErr } = await sb
    .from('trivia_responses')
    .select('id, discord_username, answers, per_question')
    .eq('quiz_id', quiz.id)
    .order('submitted_at', { ascending: true });
  if (rErr) throw new Error(rErr.message);

  const { count: existingCount } = await sb
    .from('trivia_question_responses')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quiz.id);

  console.log(
    `Quiz: ${quiz.title} (${quiz.slug}) — ${responses?.length || 0} responses, ${existingCount || 0} question rows already`
  );

  let wouldInsert = 0;
  let skipped = 0;
  let written = 0;

  for (let i = 0; i < (responses || []).length; i += batchSize) {
    const chunk = (responses || []).slice(i, i + batchSize);
    for (const r of chunk) {
      const { count: hasRows } = await sb
        .from('trivia_question_responses')
        .select('id', { count: 'exact', head: true })
        .eq('response_id', r.id);
      if (hasRows > 0) {
        skipped += 1;
        continue;
      }

      const answers = r.answers && typeof r.answers === 'object' ? r.answers : {};
      const variantMap = extractVariantMap(answers) || {};
      const rows = buildQuestionResponseRows({
        responseId: r.id,
        quizId: quiz.id,
        discord: r.discord_username,
        questions: questions || [],
        answers,
        perQuestion: r.per_question || {},
        variantMap,
      });
      if (!rows.length) continue;
      wouldInsert += rows.length;

      if (write) {
        const { inserted, error } = await insertQuestionResponses(sb, {
          responseId: r.id,
          quizId: quiz.id,
          discord: r.discord_username,
          questions: questions || [],
          answers,
          perQuestion: r.per_question || {},
          variantMap,
        });
        if (error) throw new Error(error);
        written += inserted || 0;
      }
    }
  }

  if (write) {
    console.log(`Inserted ${written} question row(s). Skipped ${skipped} response(s) already backfilled.`);
  } else {
    console.log(`Dry-run: would insert ~${wouldInsert} row(s). Skipped ${skipped} already backfilled.`);
    console.log('Re-run with --write to apply.');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
