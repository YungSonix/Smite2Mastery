import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'app/data/Trivia/smite2-community-quiz.json'), 'utf8'));
const GH = 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data';

function media(u) {
  if (!u) return null;
  if (u.startsWith('/media/')) return `${GH}/${u.slice('/media/'.length)}`;
  return u;
}

function sqlStr(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlJson(v) {
  return `${sqlStr(JSON.stringify(v))}::jsonb`;
}

const rows = [
  `(select id from q), 0, 'short_answer', 'Discord Username', 0, true, '[]'::jsonb, '{"answers":[]}'::jsonb, null, '{"is_discord_gate":true}'::jsonb`,
  `(select id from q), 1, 'short_answer', 'In-Game Name', 0, true, '[]'::jsonb, '{"answers":[]}'::jsonb, null, '{"is_ingame_gate":true}'::jsonb`,
];

spec.questions.forEach((qs, i) => {
  const type = qs.type === 'fill_blank' ? 'short_answer' : qs.type;
  const img = media(qs.image_url);
  const imgSql = img ? sqlStr(img) : 'null';
  rows.push(
    `(select id from q), ${i + 2}, ${sqlStr(type)}, ${sqlStr(qs.prompt)}, ${Number(qs.points) || 0}, ${qs.required !== false}, ${sqlJson(qs.options || [])}, ${sqlJson(qs.correct || {})}, ${imgSql}, ${sqlJson(qs.meta || {})}`
  );
});

const sql = `-- SMITE 2 TRIVIA contest seed. Paste into Supabase SQL Editor.
-- Re-runnable: replaces slug smite-2-trivia. Owner must match host login (YungSonix).

delete from public.trivia_questions
  where quiz_id in (select id from public.trivia_quizzes where slug = 'smite-2-trivia');
delete from public.trivia_responses
  where quiz_id in (select id from public.trivia_quizzes where slug = 'smite-2-trivia');
delete from public.trivia_quizzes where slug = 'smite-2-trivia';

with q as (
  insert into public.trivia_quizzes (slug, title, owner_username, join_code, is_assigned, settings)
  values (
    'smite-2-trivia',
    'SMITE 2 TRIVIA',
    'YungSonix',
    'S2TRIV',
    true,
    ${sqlJson(spec.settings)}
  )
  returning id
)
insert into public.trivia_questions
  (quiz_id, sort_order, type, prompt, points, required, options, correct, image_url, meta)
values
${rows.map((r) => `  (${r})`).join(',\n')};
`;

const out = path.join(root, 'supabase/trivia_smite2_community_seed.sql');
fs.writeFileSync(out, sql);
console.log('wrote', out);
