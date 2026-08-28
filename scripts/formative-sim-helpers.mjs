/**
 * Shared helpers for Scroll Trivia Playwright sim harnesses.
 */

/** Benign console noise — Google Fonts blocked, tracking protection, CORS font warnings. */
export function isBenignConsoleError(text) {
  const t = String(text || '');
  if (/favicon|devtools|extension|ResizeObserver loop/i.test(t)) return true;
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(t)) return true;
  if (/was blocked|Tracking Protection|content blocker|Enhanced Tracking/i.test(t)) return true;
  if (/downloadable font.*(rejected|failed|blocked)/i.test(t)) return true;
  if (/Cross-Origin Request Blocked.*font|Failed to load resource.*font/i.test(t)) return true;
  if (/Not allowed to load local resource.*font/i.test(t)) return true;
  if (/Access-Control-Allow-Origin.*font|CORS.*font/i.test(t)) return true;
  return false;
}

export function filterConsoleErrors(errors) {
  return (errors || []).filter((e) => !isBenignConsoleError(e));
}

export async function waitForUi(uiBase, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${uiBase}/trivia/`);
      if (res.ok || res.status === 304) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Trivia UI not reachable at ${uiBase}/trivia/`);
}

export function correctAnswerFor(q) {
  if (!q?.correct) return null;
  if (q.type === 'short_answer') return q.correct.answers?.[0] || '';
  if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown') {
    return Number(q.correct.index);
  }
  if (q.type === 'multiple_selection') return Array.isArray(q.correct.indices) ? q.correct.indices : [];
  return null;
}

/** Mix of correct / wrong answers so sims aren't all perfect scores. */
export function plannedAnswers(answerKey, runIndex, wrongEvery = 4) {
  const map = {};
  answerKey.forEach((q, i) => {
    const correct = correctAnswerFor(q);
    const forceWrong = (runIndex + i) % wrongEvery === 0;
    if (q.type === 'short_answer') {
      map[q.id] = forceWrong ? 'SimWrongAnswer' : correct;
    } else if (q.type === 'multiple_choice' || q.type === 'true_false') {
      if (forceWrong) {
        const opts = Array.isArray(q.options) ? q.options : [];
        map[q.id] = [...opts.keys()].find((idx) => idx !== correct) ?? 0;
      } else {
        map[q.id] = correct;
      }
    } else {
      map[q.id] = correct;
    }
  });
  return map;
}

/** Wait until question images finish loading (blob URL fetch in MediaStack). */
export async function waitForQuestionImages(page, timeoutMs = 20_000) {
  await page.waitForFunction(
    () => {
      const imgs = [...document.querySelectorAll('.f-qcard img, .f-take img')];
      if (!imgs.length) return true;
      return imgs.every((img) => img.complete && img.naturalWidth > 0);
    },
    { timeout: timeoutMs }
  );
}

/** Wait until audio elements have blob src or usable readyState (async media fetch). */
export async function waitForQuestionAudio(page, timeoutMs = 15_000) {
  await page
    .waitForFunction(
      () => {
        const audios = [...document.querySelectorAll('audio')];
        if (!audios.length) return true;
        return audios.every((a) => {
          if (a.error) return false;
          const src = a.currentSrc || a.src || '';
          if (src.startsWith('blob:')) return true;
          return a.readyState >= 1;
        });
      },
      { timeout: timeoutMs }
    )
    .catch(() => {});
}

export async function waitForTakeMedia(page) {
  await waitForQuestionImages(page);
  await waitForQuestionAudio(page);
}

/**
 * Answer every scored question in DOM order (ported from formative-browser-sims.mjs).
 * @returns {Promise<void>}
 */
export async function answerAllQuestions(page, answerKey, answers) {
  for (const q of answerKey) {
    const value = answers[q.id];
    const isFillBlank =
      q.kind === 'fill_blank' || q.meta?.kind === 'fill_blank' || q.addType === 'fill_blank';
    if (q.type === 'short_answer' || isFillBlank) {
      const raw = String(q.prompt || '');
      const needles = [
        raw.replace('{{blank}}', ' ').replace(/_{3,}/g, ' ').trim().slice(0, 36),
        raw.split('{{blank}}')[0].trim().slice(0, 28),
        raw.split('{{blank}}')[1]?.trim().slice(0, 28),
      ].filter(Boolean);
      let input = null;
      for (const needle of needles) {
        const block = page.locator('section.f-qcard').filter({ hasText: needle });
        if (!(await block.count())) continue;
        const fib = block.locator('input.f-fib-inline').first();
        const plain = block.locator('input[type="text"]').first();
        input = (await fib.count()) ? fib : plain;
        if (await input.count()) break;
      }
      if (!input || !(await input.count())) {
        throw new Error(`Could not find text input for: ${raw.slice(0, 48)}`);
      }
      await input.waitFor({ state: 'visible', timeout: 10_000 });
      await input.fill(String(value ?? ''));
    } else if (q.type === 'multiple_choice' || q.type === 'true_false') {
      const name = `q-${q.id}`;
      const radio = page.locator(`input[type="radio"][name="${name}"]`).nth(Number(value));
      await radio.waitFor({ state: 'attached', timeout: 10_000 });
      const row = radio.locator('xpath=ancestor::label[1]');
      if (await row.count()) {
        await row.click({ force: true });
      } else {
        await radio.click({ force: true });
      }
      const selected = await radio.isChecked().catch(() => false);
      if (!selected) {
        await page.evaluate(
          ({ n, idx }) => {
            const inputs = [...document.querySelectorAll(`input[type="radio"][name="${n}"]`)];
            const el = inputs[idx];
            if (!el) return;
            el.checked = true;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          },
          { n: name, idx: Number(value) }
        );
      }
    }

    if (q.kind === 'image' || q.meta?.media === 'image') {
      await page.locator('section.f-qcard img').first().waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
    }
    if (q.kind === 'audio' || q.meta?.media === 'audio') {
      await page.locator('section.f-qcard audio').first().waitFor({ state: 'attached', timeout: 15_000 });
    }
  }
}

/** Submit quiz and wait for success card; surfaces native validation blocks. */
export async function submitTakeQuiz(page) {
  const submitBtn = page.locator('button.f-submit-btn[type="submit"]');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click({ force: true });
  const invalid = await page.locator(':invalid').count();
  if (invalid > 0) {
    throw new Error(`Submit blocked by ${invalid} invalid field(s)`);
  }
  await page.waitForSelector('.f-success-card', { timeout: 35_000 });
  const scoreText = await page.locator('.f-success-card').innerText().catch(() => '');
  const m = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { score: Number(m[1]), maxScore: Number(m[2]) } : { score: null, maxScore: null };
}
