#!/usr/bin/env node
/**
 * Load the Discord community contest into Scroll Trivia.
 *
 *   TRIVIA_HOST_SECRET=devsecret npm run formative:trivia:community
 *
 * Requires formative:api (local) or FORMATIVE_API_BASE pointing at prod.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SPEC = path.join(ROOT, 'app/data/Trivia/smite2-community-quiz.json');
const BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';
const USER = process.env.TRIVIA_HOST_USER || 'teacher';

async function host(actionBody, method = 'POST') {
  const res = await fetch(`${BASE}/api/trivia/host`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-host-username': USER,
      'x-host-secret': SECRET,
    },
    body: JSON.stringify(actionBody),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Host API ${res.status}: ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

async function waitForApi(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/trivia/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Trivia API not reachable at ${BASE}`);
}

async function main() {
  await waitForApi();
  const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
  const created = await host({
    action: 'create',
    title: spec.title,
    settings: spec.settings || {},
  });
  const quiz = created.quiz;

  for (const qspec of spec.questions || []) {
    const addType = qspec.meta?.kind === 'fill_blank' || qspec.type === 'fill_blank' ? 'fill_blank' : qspec.type;
    const added = await host({
      action: 'add_question',
      quizId: quiz.id,
      type: addType,
    });
    const q = added.question;
    await host(
      {
        action: 'update_question',
        questionId: q.id,
        patch: {
          prompt: qspec.prompt,
          options: qspec.options || [],
          correct: qspec.correct || {},
          points: qspec.points ?? 1,
          required: qspec.required !== false,
          image_url: qspec.image_url || null,
          meta: { ...(q.meta || {}), ...(qspec.meta || {}) },
        },
      },
      'PUT'
    );
  }

  await host(
    {
      action: 'update_quiz',
      quizId: quiz.id,
      patch: {
        title: spec.title,
        is_assigned: Boolean(spec.assign),
        settings: { ...(quiz.settings || {}), ...(spec.settings || {}) },
      },
    },
    'PUT'
  );

  const take = `${BASE.replace(/:\d+$/, ':5174')}/trivia/take/${quiz.slug}`;
  console.log(
    JSON.stringify(
      {
        title: spec.title,
        quizId: quiz.id,
        slug: quiz.slug,
        takeUrl: take,
        questionCount: (spec.questions || []).length,
        points: (spec.questions || []).reduce((n, q) => n + Number(q.points || 0), 0),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
