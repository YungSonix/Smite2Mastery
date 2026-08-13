/**
 * End-to-end teacher + student simulation against local formative API.
 * Exit 0 on pass. Re-runnable for continuous checks.
 */
const BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';
const USER = process.env.TRIVIA_HOST_USER || 'teacher';

const results = [];

function log(ok, name, detail) {
  results.push({ ok, name, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(path, { method = 'GET', body, host } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (host) {
    headers['x-host-username'] = USER;
    headers['x-host-secret'] = SECRET;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function runOnce() {
  results.length = 0;
  console.log(`\n=== Formative sim @ ${new Date().toISOString()} ===`);

  // Health
  {
    const { res, data } = await req('/api/trivia/health');
    log(res.ok && data.ok, 'API health', data.mode || '');
  }

  // Login
  {
    const { res, data } = await req('/api/trivia/host', {
      method: 'POST',
      body: { action: 'login', username: USER, secret: SECRET },
    });
    log(res.ok && data.ok, 'Host login', data.username || data.error);
  }

  // Create quiz
  let quiz;
  {
    const { res, data } = await req('/api/trivia/host', {
      method: 'POST',
      host: true,
      body: { action: 'create', title: 'Smite 2 Trivia Sim' },
    });
    quiz = data.quiz;
    log(res.ok && quiz?.id, 'Create quiz', quiz?.slug);
  }
  if (!quiz) return failOut();

  // Load quiz + default discord gate
  let questions;
  {
    const { res, data } = await req(`/api/trivia/host?action=quiz&quizId=${quiz.id}`, { host: true });
    questions = data.questions || [];
    const gate = questions.find((q) => q.meta?.is_discord_gate);
    log(res.ok && gate, 'Discord gate question present', `n=${questions.length}`);
  }

  // Add MC + SA + TF
  let mc;
  let sa;
  let tf;
  {
    const a = await req('/api/trivia/host', {
      method: 'POST',
      host: true,
      body: { action: 'add_question', quizId: quiz.id, type: 'multiple_choice' },
    });
    mc = a.data.question;
    const b = await req('/api/trivia/host', {
      method: 'POST',
      host: true,
      body: { action: 'add_question', quizId: quiz.id, type: 'short_answer' },
    });
    sa = b.data.question;
    const c = await req('/api/trivia/host', {
      method: 'POST',
      host: true,
      body: { action: 'add_question', quizId: quiz.id, type: 'true_false' },
    });
    tf = c.data.question;
    log(a.res.ok && b.res.ok && c.res.ok, 'Add MC + SA + TF');
  }

  // Edit prompts / answers
  {
    await req('/api/trivia/host', {
      method: 'PUT',
      host: true,
      body: {
        action: 'update_question',
        questionId: mc.id,
        patch: {
          prompt: 'What was this item originally called in the Smite Alpha?',
          options: ['Shard', 'Crystal', 'Gem', 'Stone'],
          correct: { index: 1 },
          points: 1,
        },
      },
    });
    await req('/api/trivia/host', {
      method: 'PUT',
      host: true,
      body: {
        action: 'update_question',
        questionId: sa.id,
        patch: {
          prompt: 'Name one Magical ADC from the Greek pantheon.',
          correct: { answers: ['Apollo', 'apollo'] },
          points: 2,
        },
      },
    });
    await req('/api/trivia/host', {
      method: 'PUT',
      host: true,
      body: {
        action: 'update_question',
        questionId: tf.id,
        patch: {
          prompt: 'Fire Giant spawns at 10:00.',
          correct: { index: 1 },
          points: 1,
        },
      },
    });
    await req('/api/trivia/host', {
      method: 'PUT',
      host: true,
      body: { action: 'update_quiz', quizId: quiz.id, patch: { title: 'Smite 2 Trivia.', is_assigned: true } },
    });
    log(true, 'Teacher edited questions + Assign');
  }

  // Guest cannot see answers
  {
    const { res, data } = await req(`/api/trivia/public?slug=${quiz.slug}`);
    const leaked = (data.questions || []).some((q) => q.correct != null);
    log(res.ok && !leaked, 'Public take hides correct answers', `qs=${(data.questions || []).length}`);
  }

  // Student submit — mixed score
  {
    const { res, data } = await req('/api/trivia/submit', {
      method: 'POST',
      body: {
        slug: quiz.slug,
        discord_username: 'SimStudent#0001',
        answers: {
          [mc.id]: 1, // correct
          [sa.id]: 'Apollo', // correct
          [tf.id]: 0, // wrong
        },
      },
    });
    log(
      res.ok && data.score === 3 && data.maxScore === 4,
      'Student submit scores 3/4',
      `score=${data.score}/${data.maxScore} ip path ok`
    );
  }

  // Duplicate discord blocked
  {
    const { res } = await req('/api/trivia/submit', {
      method: 'POST',
      body: {
        slug: quiz.slug,
        discord_username: 'SimStudent#0001',
        answers: { [mc.id]: 0 },
      },
    });
    log(res.status === 409, 'Duplicate Discord blocked');
  }

  // Second student
  {
    await req('/api/trivia/submit', {
      method: 'POST',
      body: {
        slug: quiz.slug,
        discord_username: 'OtherGuest',
        answers: { [mc.id]: 0, [sa.id]: 'wrong', [tf.id]: 1 },
      },
    });
  }

  // Responses grid data
  {
    const { res, data } = await req(`/api/trivia/host?action=responses&quizId=${quiz.id}`, {
      host: true,
    });
    const n = (data.responses || []).length;
    const hasIp = (data.responses || []).every((r) => r.ip_address);
    log(res.ok && n === 2 && hasIp, 'Responses grid has 2 rows + IP', `n=${n}`);
  }

  // List on home
  {
    const { res, data } = await req('/api/trivia/host?action=list', { host: true });
    log(res.ok && (data.quizzes || []).some((q) => q.id === quiz.id), 'Home recent activities lists quiz');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  return failed.length === 0;
}

function failOut() {
  console.log('\nSummary: aborted');
  return false;
}

async function main() {
  const once = process.argv.includes('--once');
  const intervalMs = Number(process.env.FORMATIVE_SIM_INTERVAL_MS || 5 * 60 * 1000);
  const until = Date.now() + Number(process.env.FORMATIVE_SIM_DURATION_MS || 60 * 60 * 1000);

  // wait for API
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE}/api/trivia/health`);
      if (r.ok) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
    if (i === 29) {
      console.error('API not reachable at', BASE);
      process.exit(1);
    }
  }

  let allOk = true;
  do {
    const ok = await runOnce();
    allOk = allOk && ok;
    if (once) break;
    const remaining = until - Date.now();
    if (remaining <= 0) break;
    console.log(`\nNext check in ${Math.round(Math.min(intervalMs, remaining) / 1000)}s…`);
    await new Promise((r) => setTimeout(r, Math.min(intervalMs, remaining)));
  } while (Date.now() < until);

  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
