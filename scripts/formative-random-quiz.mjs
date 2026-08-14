#!/usr/bin/env node
/**
 * Create an assigned Smite 2 Scroll Trivia quiz with random questions
 * seeded from app/data/Smite2Gods.json — always includes image, audio,
 * and fill-in-the-blank items (plus standard MC/TF/SA).
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
const DATA = path.join(ROOT, 'app/data');
const BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';
const USER = process.env.TRIVIA_HOST_USER || 'teacher';
const QUESTION_COUNT = Math.max(6, Number(process.env.TRIVIA_QUESTION_COUNT || 9));

const THEME_AUDIO_REL =
  "Audio Files/SMITE's Top 5 Plays Theme Music_ Choirs of War (Part 2).mp3";

function loadGods() {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA, 'Smite2Gods.json'), 'utf8'));
  return (Array.isArray(raw) ? raw : []).filter((g) => g?.godName);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

function uniqueValues(gods, key) {
  return [...new Set(gods.map((g) => String(g[key] || '').trim()).filter(Boolean))];
}

function mediaUrl(relPath) {
  const parts = String(relPath)
    .split(/[/\\]/)
    .filter(Boolean)
    .map((p) => encodeURIComponent(p));
  return `/media/${parts.join('/')}`;
}

function godFolderCandidates(godName) {
  const compact = godName.replace(/[^a-zA-Z0-9]/g, '');
  const underscored = godName.replace(/\s+/g, '_');
  const noSpace = godName.replace(/\s+/g, '');
  const last = godName.split(/\s+/).filter(Boolean).pop();
  return [...new Set([compact, noSpace, underscored, last].filter(Boolean))];
}

function resolvePortraitRel(godName) {
  for (const folder of godFolderCandidates(godName)) {
    const rel = path.join('NewGodSkins', folder, 'Default', `t_GodPortrait_${folder}.png`);
    if (fs.existsSync(path.join(DATA, rel))) return rel.replace(/\\/g, '/');
    // Some folders use different portrait filename stems
    const dir = path.join(DATA, 'NewGodSkins', folder, 'Default');
    if (fs.existsSync(dir)) {
      const hit = fs.readdirSync(dir).find((f) => /^t_GodPortrait_.*\.png$/i.test(f));
      if (hit) return path.join('NewGodSkins', folder, 'Default', hit).replace(/\\/g, '/');
    }
  }
  return null;
}

function resolvePantheonIconRel(pantheon) {
  const dir = path.join(DATA, 'Icons', 'Pantheon Icons');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'));
  const lower = String(pantheon || '').toLowerCase();
  const hit =
    files.find((f) => f.toLowerCase().startsWith(lower)) ||
    files.find((f) => f.toLowerCase().includes(lower.split(/\s+/)[0] || lower));
  return hit ? path.join('Icons', 'Pantheon Icons', hit).replace(/\\/g, '/') : null;
}

function makeMc(prompt, correctLabel, distractors, extras = {}) {
  const options = shuffle([correctLabel, ...distractors].slice(0, 4));
  const index = options.indexOf(correctLabel);
  return {
    type: 'multiple_choice',
    prompt,
    options,
    correct: { index },
    points: extras.points ?? 1,
    required: true,
    image_url: extras.image_url || null,
    meta: extras.meta || {},
    kind: extras.kind || 'text',
  };
}

function makeTf(prompt, isTrue, extras = {}) {
  return {
    type: 'true_false',
    prompt,
    options: ['True', 'False'],
    correct: { index: isTrue ? 0 : 1 },
    points: extras.points ?? 1,
    required: true,
    image_url: extras.image_url || null,
    meta: extras.meta || {},
    kind: extras.kind || 'text',
  };
}

function makeSa(prompt, answers, extras = {}) {
  const uniq = [...new Set(answers.map((a) => String(a).trim()).filter(Boolean))];
  return {
    type: 'short_answer',
    prompt,
    options: [],
    correct: { answers: uniq },
    points: extras.points ?? 1,
    required: true,
    image_url: extras.image_url || null,
    meta: extras.meta || {},
    kind: extras.kind || 'text',
  };
}

function makeFillBlank(before, after, answers, extras = {}) {
  return makeSa(`${before}{{blank}}${after}`, answers, {
    ...extras,
    meta: { ...(extras.meta || {}), kind: 'fill_blank' },
    kind: 'fill_blank',
  });
}

function godsWithPortraits(gods) {
  return gods
    .map((g) => ({ ...g, portraitRel: resolvePortraitRel(g.godName) }))
    .filter((g) => g.portraitRel);
}

function buildRequiredMediaQuestions(gods) {
  const withArt = godsWithPortraits(gods);
  if (withArt.length < 4) {
    throw new Error('Need at least 4 gods with portraits for image trivia');
  }
  if (!fs.existsSync(path.join(DATA, THEME_AUDIO_REL))) {
    throw new Error(`Missing theme audio at app/data/${THEME_AUDIO_REL}`);
  }

  const featured = pick(withArt, 1)[0];
  const distractors = pick(
    withArt.filter((g) => g.godName !== featured.godName),
    3
  ).map((g) => g.godName);

  const imageQ = makeMc(
    'Who is shown in this portrait?',
    featured.godName,
    distractors,
    {
      image_url: mediaUrl(featured.portraitRel),
      meta: { media: 'image', media_kind: 'god_portrait' },
      kind: 'image',
    }
  );

  const audioQ = makeSa(
    'Listen to the clip — which game franchise is this theme from?',
    ['Smite', 'smite', 'Smite 2', 'smite 2', 'SMITE'],
    {
      image_url: mediaUrl(THEME_AUDIO_REL),
      meta: { media: 'audio', attached_from: 'audio' },
      kind: 'audio',
      points: 2,
    }
  );

  const fibGod = pick(gods, 1)[0];
  const fillBlankQ = makeFillBlank(
    `${fibGod.godName} is from the `,
    ' pantheon.',
    [fibGod.pantheon, String(fibGod.pantheon || '').toLowerCase()],
    { kind: 'fill_blank' }
  );

  // Extra image (pantheon icon) when available
  const pantheonIconRel = resolvePantheonIconRel(fibGod.pantheon);
  const pantheonImageQ = pantheonIconRel
    ? makeMc(
        'Which pantheon does this icon represent?',
        fibGod.pantheon,
        pick(
          uniqueValues(gods, 'pantheon').filter((p) => p !== fibGod.pantheon),
          3
        ),
        {
          image_url: mediaUrl(pantheonIconRel),
          meta: { media: 'image', media_kind: 'pantheon_icon' },
          kind: 'image',
        }
      )
    : null;

  return { imageQ, audioQ, fillBlankQ, pantheonImageQ };
}

function buildTextBank(gods) {
  const bank = [];
  const pantheons = uniqueValues(gods, 'pantheon');
  const roles = uniqueValues(gods, 'Role');

  for (const god of gods) {
    const others = gods.filter((g) => g.godName !== god.godName);

    {
      const wrong = pick(
        pantheons.filter((p) => p !== god.pantheon),
        3
      );
      if (wrong.length >= 3 && god.pantheon) {
        bank.push(makeMc(`Which pantheon is ${god.godName} from?`, god.pantheon, wrong));
      }
    }

    {
      const wrong = pick(
        roles.filter((r) => r !== god.Role),
        3
      );
      if (wrong.length >= 3 && god.Role) {
        bank.push(makeMc(`What is ${god.godName}'s primary role?`, god.Role, wrong));
      }
    }

    if (god['Power Type']) {
      const claimPhysical = Math.random() < 0.5;
      const prompt = `${god.godName} deals ${claimPhysical ? 'Physical' : 'Magical'} damage.`;
      const isTrue = god['Power Type'] === (claimPhysical ? 'Physical' : 'Magical');
      bank.push(makeTf(prompt, isTrue));
    }

    if (god['Attack Type']) {
      const claimMelee = Math.random() < 0.5;
      const prompt = `${god.godName} is a ${claimMelee ? 'Melee' : 'Ranged'} god.`;
      const isTrue = god['Attack Type'] === (claimMelee ? 'Melee' : 'Ranged');
      bank.push(makeTf(prompt, isTrue));
    }

    if (god.pantheon) {
      const samePantheon = gods.filter((g) => g.pantheon === god.pantheon).map((g) => g.godName);
      bank.push(
        makeSa(
          `Name one Smite 2 god from the ${god.pantheon} pantheon.`,
          samePantheon.flatMap((n) => [n, n.toLowerCase()])
        )
      );
    }

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

    // Extra fill-blanks in the bank
    if (god.Role) {
      bank.push(
        makeFillBlank(`${god.godName}'s primary role is `, '.', [
          god.Role,
          String(god.Role).toLowerCase(),
        ])
      );
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

  const { imageQ, audioQ, fillBlankQ, pantheonImageQ } = buildRequiredMediaQuestions(gods);
  const required = [imageQ, audioQ, fillBlankQ];
  if (pantheonImageQ) required.push(pantheonImageQ);

  const textBank = buildTextBank(gods);
  const remaining = Math.max(0, QUESTION_COUNT - required.length);
  const filler = pick(textBank, remaining);
  const selected = shuffle([...required, ...filler]);

  const created = await host({
    action: 'create',
    title: 'Smite 2 Trivia',
    settings: {
      instructions:
        'Smite 2 trivia with text, images, audio, and fill-in-the-blank. Fill Discord + in-game name, then answer all questions.',
      show_scores: true,
      allow_retake: false,
    },
  });
  const quiz = created.quiz;

  const answerKey = [];
  for (const spec of selected) {
    const addType = spec.meta?.kind === 'fill_blank' ? 'fill_blank' : spec.type;
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
          prompt: spec.prompt,
          options: spec.options,
          correct: spec.correct,
          points: spec.points,
          required: true,
          image_url: spec.image_url || null,
          meta: {
            ...(q.meta || {}),
            ...(spec.meta || {}),
          },
        },
      },
      'PUT'
    );
    answerKey.push({
      id: q.id,
      type: addType === 'fill_blank' ? 'short_answer' : spec.type,
      addType,
      prompt: spec.prompt,
      correct: spec.correct,
      options: spec.options,
      points: spec.points,
      image_url: spec.image_url || null,
      meta: spec.meta || {},
      kind: spec.kind || 'text',
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
            'Smite 2 trivia with text, images, audio, and fill-in-the-blank. Fill Discord + in-game name, then answer all questions.',
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

  const kinds = {
    image: answerKey.filter((q) => q.kind === 'image').length,
    audio: answerKey.filter((q) => q.kind === 'audio').length,
    fill_blank: answerKey.filter((q) => q.kind === 'fill_blank').length,
    text: answerKey.filter((q) => q.kind === 'text').length,
  };

  const out = {
    ok: true,
    quiz: loaded.quiz || quiz,
    questions: (loaded.questions || []).filter(
      (q) => !q.meta?.is_discord_gate && !q.meta?.is_ingame_gate
    ),
    answerKey,
    kinds,
    takeUrl: `/trivia/take/${(loaded.quiz || quiz).slug}`,
  };

  if (kinds.image < 1 || kinds.audio < 1 || kinds.fill_blank < 1) {
    throw new Error(`Quiz missing required media kinds: ${JSON.stringify(kinds)}`);
  }

  const outPath = path.join(ROOT, 'artifacts', 'trivia-sims', 'quiz.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
