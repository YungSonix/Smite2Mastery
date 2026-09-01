/**
 * Verify score tie-break for two Discord users on shared quizzes.
 * Run: node scripts/trivia-verify-tiebreak-users.mjs mytharria wunderprojectv.2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { cmpResponsesByScore, responsePercentRounded } from '../lib/triviaRankTiebreak.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

for (const name of ['.env.local', '.env']) {
  const envPath = path.join(root, name);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const needles = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['mytharria', 'wunderprojectv.2'];

if (!url || !key) {
  console.log('SKIP: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(0);
}

const sb = createClient(url, key);
const orFilter = needles.map((n) => `discord_username.ilike.${n}`).join(',');

const { data, error } = await sb
  .from('trivia_responses')
  .select('id, quiz_id, discord_username, ingame_name, score, max_score, submitted_at, answers')
  .or(orFilter)
  .order('submitted_at', { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = (data || []).filter((r) => !r.answers?.__test_take);
const byQuiz = new Map();
for (const r of rows) {
  let list = byQuiz.get(r.quiz_id);
  if (!list) {
    list = [];
    byQuiz.set(r.quiz_id, list);
  }
  list.push(r);
}

let found = 0;
for (const [quizId, list] of byQuiz) {
  if (list.length < 2) continue;
  const byPct = new Map();
  for (const r of list) {
    const pct = responsePercentRounded(r);
    let bucket = byPct.get(pct);
    if (!bucket) {
      bucket = [];
      byPct.set(pct, bucket);
    }
    bucket.push(r);
  }
  for (const [pct, bucket] of byPct) {
    if (bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => cmpResponsesByScore(a, b, true));
    console.log(`\nQuiz ${quizId} — ${pct}% tie (${bucket.length} players)`);
    sorted.forEach((r, i) => {
      console.log(
        `  #${i + 1} ${r.discord_username} (${r.ingame_name || '—'}) @ ${r.submitted_at}`
      );
    });
    found += 1;
  }
}

if (!found) {
  console.log('No shared quiz score ties found for:', needles.join(', '));
  console.log('Rows loaded:', rows.length);
}
