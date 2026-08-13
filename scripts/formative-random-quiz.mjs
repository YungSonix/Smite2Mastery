#!/usr/bin/env node
/**
 * Create an assigned Smite 2 Scroll Trivia quiz with random questions
 * seeded from app/data/Smite2Gods.json.
 *
 *   FORMATIVE_API_BASE=http://localhost:3000 node scripts/formative-random-quiz.mjs
 *
 * Prints JSON: { quiz, questions, answerKey } to stdout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';
const USER = process.env.TRIVIA_HOST_USER || 'teacher';
const QUESTION_COUNT = Math.max(3, Number(process.env.TRIVIA_QUESTION_COUNT || 8));

function loadGods() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/data/Smite2Gods.json'), 'utf8'));
  return (Array.isArray(raw) ? raw : []).filter((g) => g?.godName);
}

function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n, rng = Math.random) {
  return shuffle(arr, rng).slice(0, n);
}

function uniqueValues(gods, key) {
  return [...new Set(gods.map((g) => String(g[key] || '').trim()).filter(Boolean))];
}

function makeMc(prompt, correctLabel, distractors, points = 1) {
  const options = shuffle([correctLabel, ...distractors].slice(0, 4));
  const index = options.indexOf(correctLabel);
  return {
    type: 'multiple_choice',
    prompt,
    options,
    correct: { index },
    points,
    required: true,
  };
}

function makeTf(prompt, isTrue, points = 1) {
  return {
    type: 'true_false',
    prompt,
    options: ['True', 'False'],
    correct: { index: isTrue ? 0 : 1 },
    points,
    required: true,
  };
}

function makeSa(prompt, answers, points = 1) {
  const uniq = [...new Set(answers.map((a) => String(a).trim()).filter(Boolean))];
  return {
    type: 'short_answer',
    prompt,
    options: [],
    correct: { answers: uniq },
    points,
    required: true,
  };
}

function buildQuestionBank(gods) {
  const bank = [];
  const pantheons = uniqueValues(gods, 'pantheon');
  const roles = uniqueValues(gods, 'Role');
  const powerTypes = uniqueValues(gods, 'Power Type');
  const attackTypes = uniqueValues(gods, 'Attack Type');

  for (const god of gods) {
    const others = gods.filter((g) => g.godName !== god.godName);

    // Pantheon MC
    {
      const wrong = pick(
        pantheons.filter((p) => p !== god.pantheon),
        3
      );
      if (wrong.length >= 3 && god.pantheon) {
        bank.push(
          makeMc(`Which pantheon is ${god.godName} from?`, god.pantheon, wrong)
        );
      }
    }

    // Role MC
    {
      const wrong = pick(
        roles.filter((r) => r !== god.Role),
        3
      );
      if (wrong.length >= 3 && god.Role) {
        bank.push(makeMc(`What is ${god.godName}'s primary role?`, god.Role, wrong));
      }
    }

    // Power type TF (usually only Physical / Magical)
    if (god['Power Type']) {
      const claimPhysical = Math.random() < 0.5;
      const prompt = `${god.godName} deals ${claimPhysical ? 'Physical' : 'Magical'} damage.`;
      const isTrue = god['Power Type'] === (claimPhysical ? 'Physical' : 'Magical');
      bank.push(makeTf(prompt, isTrue));
    }

    // Attack type TF
    if (god['Attack Type'] && attackTypes.length >= 2) {
      const claimMelee = Math.random() < 0.5;
      const prompt = `${god.godName} is a ${claimMelee ? 'Melee' : 'Ranged'} god.`;
      const isTrue = god['Attack Type'] === (claimMelee ? 'Melee' : 'Ranged');
      bank.push(makeTf(prompt, isTrue));
    }

    // Short answer: name a god from pantheon
    if (god.pantheon) {
      const samePantheon = gods.filter((g) => g.pantheon === god.pantheon).map((g) => g.godName);
      if (samePantheon.length >= 1) {
        bank.push(
          makeSa(
            `Name one Smite 2 god from the ${god.pantheon} pantheon.`,
            samePantheon.flatMap((n) => [n, n.toLowerCase()])
          )
        );
      }
    }

    // Who matches role + pantheon
    {
      const distractorGods = pick(others, 3).map((g) => g.godName);
      if (distractorGods.length === 3 && god.Role && god.pantheon) {
        bank.push(
          makeMc(
            `Which god is a ${god.Role} from the ${god.pantheon} pantheon?`,
            god.godName,
            distractorGods
          )
        );
      }
    }
  }

  return bank;
}

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
  const gods = loadGods();
  if (gods.length < 8) throw new Error('Not enough gods in Smite2Gods.json');

  const bank = buildQuestionBank(gods);
  // Prefer a mix of MC / TF / SA when available
  const byType = {
    multiple_choice: shuffle(bank.filter((q) => q.type === 'multiple_choice')),
    true_false: shuffle(bank.filter((q) => q.type === 'true_false')),
    short_answer: shuffle(bank.filter((q) => q.type === 'short_answer')),
  };
  const selected = [];
  const order = ['multiple_choice', 'true_false', 'short_answer'];
  while (selected.length < QUESTION_COUNT) {
    let added = false;
    for (const t of order) {
      if (selected.length >= QUESTION_COUNT) break;
      const next = byType[t].pop();
      if (next) {
        selected.push(next);
        added = true;
      }
    }
    if (!added) break;
  }
  if (selected.length < QUESTION_COUNT) {
    throw new Error(`Only built ${selected.length} questions; need ${QUESTION_COUNT}`);
  }

  const created = await host({
    action: 'create',
    title: 'Smite 2 Trivia',
    settings: {
      instructions: 'Random Smite 2 gods trivia. Fill Discord + in-game name, then answer all questions.',
      show_scores: true,
      allow_retake: false,
    },
  });
  const quiz = created.quiz;

  const answerKey = [];
  for (const spec of selected) {
    const added = await host({
      action: 'add_question',
      quizId: quiz.id,
      type: spec.type,
    });
    const q = added.question;
    await host(
      {
        action: 'update_question',
        questionId: q.id,
        patch: {
          prompt: spec.prompt,
          options: spec.options,
          correct: spec.correct,
          points: spec.points,
          required: true,
        },
      },
      'PUT'
    );
    answerKey.push({
      id: q.id,
      type: spec.type,
      prompt: spec.prompt,
      correct: spec.correct,
      options: spec.options,
      points: spec.points,
    });
  }

  await host(
    {
      action: 'update_quiz',
      quizId: quiz.id,
      patch: {
        title: 'Smite 2 Trivia',
        is_assigned: true,
        settings: {
          ...(quiz.settings || {}),
          instructions:
            'Random Smite 2 gods trivia. Fill Discord + in-game name, then answer all questions.',
          show_scores: true,
          allow_retake: false,
        },
      },
    },
    'PUT'
  );

  const loadedRes = await fetch(`${BASE}/api/trivia/host?action=quiz&quizId=${quiz.id}`, {
    headers: {
      'x-host-username': USER,
      'x-host-secret': SECRET,
    },
  });
  const loaded = await loadedRes.json();
  if (!loadedRes.ok) throw new Error(loaded.error || 'Failed to reload quiz');

  const out = {
    ok: true,
    quiz: loaded.quiz || quiz,
    questions: (loaded.questions || []).filter(
      (q) => !q.meta?.is_discord_gate && !q.meta?.is_ingame_gate
    ),
    answerKey,
    takeUrl: `/formative/take/${(loaded.quiz || quiz).slug}`,
  };

  const outPath = path.join(ROOT, 'artifacts', 'trivia-sims', 'quiz.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
