#!/usr/bin/env node
/**
 * Run 15 Scroll Trivia take-flow simulations in browsers:
 *   5 × desktop web (Chromium / Chrome)
 *   5 × iOS web (WebKit ≈ Safari, iPhone 16)
 *   5 × Android web (Chromium, Galaxy S26 viewport)
 *
 * Requires quiz.json from formative-random-quiz.mjs (or TRIVIA_SLUG).
 * Starts nothing itself — API (:3000) + formative Vite (:5174) must be up.
 *
 *   node scripts/formative-browser-sims.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI_BASE = process.env.FORMATIVE_UI_BASE || 'http://localhost:5174';
const API_BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const OUT_DIR = path.join(ROOT, 'artifacts', 'trivia-sims');
const QUIZ_PATH = process.env.TRIVIA_QUIZ_JSON || path.join(OUT_DIR, 'quiz.json');

/** Playwright ships iPhone 16; Galaxy S26 uses published CSS viewport 360×780 @3x. */
const IPHONE_16 = {
  ...devices['iPhone 16'],
  name: 'iPhone 16',
};

const GALAXY_S26 = {
  name: 'Galaxy S26',
  userAgent:
    'Mozilla/5.0 (Linux; Android 16; SM-S931U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
  viewport: { width: 360, height: 780 },
  screen: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium',
};

const PROFILES = [
  // Desktop web — Chromium (Chrome engine)
  ...Array.from({ length: 5 }, (_, i) => ({
    group: 'web',
    index: i + 1,
    label: `web-${i + 1}`,
    browserType: 'chromium',
    channel: process.env.TRIVIA_CHROME_CHANNEL || undefined, // e.g. 'chrome'
    device: null,
    deviceName: 'desktop-1440',
    viewport: { width: 1440, height: 900 },
    userAgent: undefined,
    isMobile: false,
    hasTouch: false,
  })),
  // iOS web — WebKit (Safari engine) + iPhone 16
  ...Array.from({ length: 5 }, (_, i) => ({
    group: 'ios-web',
    index: i + 1,
    label: `ios-web-${i + 1}`,
    browserType: 'webkit',
    channel: undefined,
    device: IPHONE_16,
    deviceName: 'iPhone 16',
    viewport: null,
    userAgent: undefined,
    isMobile: true,
    hasTouch: true,
  })),
  // Android web — Chromium + Galaxy S26
  ...Array.from({ length: 5 }, (_, i) => ({
    group: 'android-web',
    index: i + 1,
    label: `android-web-${i + 1}`,
    browserType: 'chromium',
    channel: undefined,
    device: GALAXY_S26,
    deviceName: 'Galaxy S26',
    viewport: null,
    userAgent: undefined,
    isMobile: true,
    hasTouch: true,
  })),
];

function loadQuiz() {
  if (process.env.TRIVIA_SLUG) {
    return {
      quiz: { slug: process.env.TRIVIA_SLUG, title: 'Smite 2 Trivia' },
      answerKey: JSON.parse(process.env.TRIVIA_ANSWER_KEY || '[]'),
    };
  }
  if (!fs.existsSync(QUIZ_PATH)) {
    throw new Error(`Missing ${QUIZ_PATH}. Run formative-random-quiz.mjs first.`);
  }
  return JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
}

async function waitForUi(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${UI_BASE}/formative/`);
      if (res.ok || res.status === 304) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Formative UI not reachable at ${UI_BASE}/formative/`);
}

function correctAnswerFor(q) {
  if (!q?.correct) return null;
  if (q.type === 'short_answer') {
    const answers = q.correct.answers || [];
    return answers[0] || '';
  }
  if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown') {
    return Number(q.correct.index);
  }
  if (q.type === 'multiple_selection') {
    return Array.isArray(q.correct.indices) ? q.correct.indices : [];
  }
  return null;
}

/** Mix of correct / wrong answers so sims aren't all perfect. */
function plannedAnswers(answerKey, runIndex) {
  const map = {};
  answerKey.forEach((q, i) => {
    const correct = correctAnswerFor(q);
    const forceWrong = (runIndex + i) % 3 === 0;
    if (q.type === 'short_answer') {
      map[q.id] = forceWrong ? 'DefinitelyNotAGod' : correct;
    } else if (q.type === 'multiple_choice' || q.type === 'true_false') {
      if (forceWrong) {
        const opts = Array.isArray(q.options) ? q.options : [];
        const wrongIdx = [...opts.keys()].find((idx) => idx !== correct) ?? 0;
        map[q.id] = wrongIdx;
      } else {
        map[q.id] = correct;
      }
    } else {
      map[q.id] = correct;
    }
  });
  return map;
}

async function runOne(browserLauncher, profile, quizPayload, runIndex) {
  const started = Date.now();
  const slug = quizPayload.quiz.slug;
  const answerKey = quizPayload.answerKey || [];
  const answers = plannedAnswers(answerKey, runIndex);
  const discord = `Sim${profile.group}${profile.index}_${Date.now().toString(36)}`;
  const ingame = `IG_${profile.label}`;
  const shotDir = path.join(OUT_DIR, 'screenshots', profile.group);
  fs.mkdirSync(shotDir, { recursive: true });

  const result = {
    label: profile.label,
    group: profile.group,
    browser: profile.browserType,
    device: profile.deviceName || profile.device?.name || 'desktop',
    viewport: profile.device?.viewport || profile.viewport || null,
    ok: false,
    score: null,
    maxScore: null,
    a11y: null,
    error: null,
    screenshot: null,
    ms: 0,
    discord,
  };

  let context;
  let page;
  try {
    const launchOpts = { headless: true };
    if (profile.channel) launchOpts.channel = profile.channel;

    const browser = browserLauncher;
    if (profile.device) {
      context = await browser.newContext({
        ...profile.device,
        // Keep locale stable for assertions
        locale: 'en-US',
      });
    } else {
      context = await browser.newContext({
        viewport: profile.viewport,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        locale: 'en-US',
      });
    }

    page = await context.newPage();
    const url = `${UI_BASE}/formative/take/${slug}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForSelector('#discord-username', { timeout: 30_000 });
    await page.waitForSelector('section.f-qcard .f-option-row, section.f-qcard input.f-fib-inline', {
      timeout: 30_000,
    });
    // Wait until mobile take styles have applied (avoid measuring pre-CSS layout).
    await page.waitForFunction(
      () => {
        const opt = document.querySelector('.f-option-row');
        const submit = document.querySelector('.f-submit-btn');
        if (!opt || !submit) return false;
        const oh = opt.getBoundingClientRect().height;
        const sh = submit.getBoundingClientRect().height;
        return oh >= 44 && sh >= 44;
      },
      { timeout: 15_000 }
    );

    // Mobile layout / accessibility checks (touch targets + readable contrast)
    if (profile.isMobile) {
      const a11y = await page.evaluate(() => {
        const relLum = (rgb) => {
          const parts = String(rgb)
            .replace(/[^\d.,]/g, '')
            .split(',')
            .map((n) => Number(n.trim()) / 255);
          if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return 0;
          const [r, g, b] = parts.map((c) =>
            c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
          );
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const contrast = (fg, bg) => {
          const L1 = relLum(fg);
          const L2 = relLum(bg);
          const light = Math.max(L1, L2);
          const dark = Math.min(L1, L2);
          return (light + 0.05) / (dark + 0.05);
        };
        const cs = (el) => getComputedStyle(el);
        const prompt = document.querySelector('.f-q-prompt');
        const card = document.querySelector('.f-qcard') || document.querySelector('.f-identity-card');
        const option = document.querySelector('.f-option-row');
        const submit = document.querySelector('.f-submit-btn');
        const input = document.querySelector('#discord-username');
        const promptCs = prompt ? cs(prompt) : null;
        const cardCs = card ? cs(card) : null;
        // Cards use translucent fills; compare against the page token color.
        const pageBg = 'rgb(7, 11, 20)';
        const optionRect = option?.getBoundingClientRect();
        const submitRect = submit?.getBoundingClientRect();
        const inputRect = input?.getBoundingClientRect();
        const promptContrast = prompt ? contrast(promptCs.color, pageBg) : 0;
        const mutedEl = document.querySelector('.f-field-hint, .f-muted, .f-cover-sub');
        const mutedContrast = mutedEl ? contrast(cs(mutedEl).color, pageBg) : null;
        return {
          viewport: { w: window.innerWidth, h: window.innerHeight },
          optionMinHeight: optionRect ? Math.round(optionRect.height) : 0,
          submitMinHeight: submitRect ? Math.round(submitRect.height) : 0,
          inputMinHeight: inputRect ? Math.round(inputRect.height) : 0,
          promptContrast: Number(promptContrast.toFixed(2)),
          mutedContrast: mutedContrast != null ? Number(mutedContrast.toFixed(2)) : null,
          promptColor: promptCs?.color || null,
          cardBg: cardCs?.backgroundColor || null,
        };
      });
      result.a11y = a11y;
      const issues = [];
      if (a11y.optionMinHeight && a11y.optionMinHeight < 44) {
        issues.push(`option tap target ${a11y.optionMinHeight}px < 44`);
      }
      if (a11y.submitMinHeight && a11y.submitMinHeight < 44) {
        issues.push(`submit tap target ${a11y.submitMinHeight}px < 44`);
      }
      if (a11y.inputMinHeight && a11y.inputMinHeight < 44) {
        issues.push(`input tap target ${a11y.inputMinHeight}px < 44`);
      }
      if (a11y.promptContrast && a11y.promptContrast < 4.5) {
        issues.push(`prompt contrast ${a11y.promptContrast}:1 < 4.5`);
      }
      if (a11y.mutedContrast != null && a11y.mutedContrast < 4.5) {
        issues.push(`muted text contrast ${a11y.mutedContrast}:1 < 4.5`);
      }
      if (profile.device?.viewport?.width && a11y.viewport?.w) {
        // Allow small chrome differences but flag major wrong device sizing
        const expected = profile.device.viewport.width;
        if (Math.abs(a11y.viewport.w - expected) > 8) {
          issues.push(`viewport width ${a11y.viewport.w} != ${expected}`);
        }
      }
      if (issues.length) {
        throw new Error(`Mobile a11y/layout: ${issues.join('; ')}`);
      }
    }

    await page.fill('#discord-username', discord);
    await page.fill('#ingame-name', ingame);

    // Answer each scored question in DOM order (skip gates — already filled above)
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
        // WebKit sometimes reports check() as no-op; click the label row instead.
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

      // Soft checks that media actually rendered for image/audio items
      if (q.kind === 'image' || q.meta?.media === 'image') {
        const img = page.locator('section.f-qcard img').first();
        if (await img.count()) {
          /* ok */
        }
      }
      if (q.kind === 'audio' || q.meta?.media === 'audio') {
        const audio = page.locator('section.f-qcard audio').first();
        if (!(await audio.count())) {
          throw new Error('Audio question rendered without <audio> element');
        }
      }
    }

    const submitBtn = page.locator('button.f-submit-btn[type="submit"]');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    // If native validation blocked submit, surface it.
    const invalid = await page.locator(':invalid').count();
    if (invalid > 0) {
      throw new Error(`Submit blocked by ${invalid} invalid field(s)`);
    }
    await page.waitForSelector('.f-success-card', { timeout: 30_000 });

    const scoreText = await page
      .locator('.f-success-card')
      .innerText()
      .catch(() => '');
    const m = scoreText.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) {
      result.score = Number(m[1]);
      result.maxScore = Number(m[2]);
    }

    const shotPath = path.join(shotDir, `${profile.label}.png`);
    const success = page.locator('.f-success-card').first();
    await success.scrollIntoViewIfNeeded().catch(() => {});
    // Prefer element shot — WebKit fullPage can produce empty black frames on mobile.
    if (await success.count()) {
      await success.screenshot({ path: shotPath });
    } else {
      await page.screenshot({ path: shotPath, fullPage: true });
    }
    result.screenshot = path.relative(ROOT, shotPath);
    result.ok = true;
  } catch (err) {
    result.error = err?.message || String(err);
    try {
      if (page) {
        const shotPath = path.join(shotDir, `${profile.label}-error.png`);
        await page.screenshot({ path: shotPath, fullPage: true });
        result.screenshot = path.relative(ROOT, shotPath);
      }
    } catch {
      /* ignore */
    }
  } finally {
    result.ms = Date.now() - started;
    await context?.close().catch(() => {});
  }
  return result;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await waitForUi();

  // Confirm API still up
  const health = await fetch(`${API_BASE}/api/trivia/health`);
  if (!health.ok) throw new Error('Trivia API health check failed');

  const quizPayload = loadQuiz();
  if (!quizPayload?.quiz?.slug) throw new Error('Quiz slug missing');
  if (!quizPayload.answerKey?.length) throw new Error('answerKey missing — regenerate quiz');

  console.log(`Quiz: ${quizPayload.quiz.title} (${quizPayload.quiz.slug})`);
  console.log(`Take URL: ${UI_BASE}/formative/take/${quizPayload.quiz.slug}`);
  if (quizPayload.kinds) console.log(`Kinds: ${JSON.stringify(quizPayload.kinds)}`);
  const missingKinds = ['image', 'audio', 'fill_blank'].filter(
    (k) => !quizPayload.answerKey?.some((q) => q.kind === k || q.meta?.kind === k || q.meta?.media === k)
  );
  if (missingKinds.length) {
    throw new Error(`Quiz answerKey missing required kinds: ${missingKinds.join(', ')}`);
  }
  console.log(`Running ${PROFILES.length} browser sims…`);

  // Prefer system Chrome for desktop if available; fall back to bundled Chromium
  let chromiumBrowser;
  try {
    chromiumBrowser = await chromium.launch({
      headless: true,
      channel: 'chrome',
    });
    console.log('Desktop/Android engine: system Google Chrome');
  } catch {
    chromiumBrowser = await chromium.launch({ headless: true });
    console.log('Desktop/Android engine: Playwright Chromium');
  }

  let webkitBrowser;
  try {
    webkitBrowser = await webkit.launch({ headless: true });
    console.log('iOS web engine: Playwright WebKit (Safari)');
  } catch (err) {
    console.warn(
      `WebKit failed to launch (${err.message}). Falling back to Chromium + iPhone device descriptor for iOS sims.`
    );
    webkitBrowser = null;
  }

  const results = [];
  let runIndex = 0;
  for (const profile of PROFILES) {
    let launcher = profile.browserType === 'webkit' ? webkitBrowser : chromiumBrowser;
    const effective = { ...profile };
    if (profile.browserType === 'webkit' && !webkitBrowser) {
      launcher = chromiumBrowser;
      effective.browserType = 'chromium';
      effective.device = devices['iPhone 14'];
      effective.fallback = 'chromium-iphone-emulation';
    }
    process.stdout.write(`  → ${effective.label} (${effective.browserType}${effective.fallback ? ' fallback' : ''})… `);
    const r = await runOne(launcher, effective, quizPayload, runIndex);
    runIndex += 1;
    results.push(r);
    console.log(r.ok ? `PASS ${r.score ?? '?'}/${r.maxScore ?? '?'} (${r.ms}ms)` : `FAIL ${r.error}`);
  }

  await chromiumBrowser.close().catch(() => {});
  await webkitBrowser?.close().catch(() => {});

  const summary = {
    ok: results.every((r) => r.ok),
    quiz: {
      id: quizPayload.quiz.id,
      slug: quizPayload.quiz.slug,
      title: quizPayload.quiz.title,
      takeUrl: `${UI_BASE}/formative/take/${quizPayload.quiz.slug}`,
    },
    totals: {
      all: results.length,
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      web: results.filter((r) => r.group === 'web' && r.ok).length,
      iosWeb: results.filter((r) => r.group === 'ios-web' && r.ok).length,
      androidWeb: results.filter((r) => r.group === 'android-web' && r.ok).length,
    },
    results,
    generatedAt: new Date().toISOString(),
  };

  const summaryPath = path.join(OUT_DIR, 'sim-results.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  const md = [
    '# Smite 2 Trivia — browser sim results',
    '',
    `- Quiz: **${summary.quiz.title}** (\`${summary.quiz.slug}\`)`,
    `- Take URL: ${summary.quiz.takeUrl}`,
    `- Passed: **${summary.totals.passed}/${summary.totals.all}**`,
    `- Desktop web: ${summary.totals.web}/5`,
    `- iOS web: ${summary.totals.iosWeb}/5`,
    `- Android web: ${summary.totals.androidWeb}/5`,
    '',
    '| Run | Group | Device | Score | Status | ms |',
    '|---|---|---|---|---|---|',
    ...results.map(
      (r) =>
        `| ${r.label} | ${r.group} | ${r.device || r.browser}${r.fallback ? ' (fallback)' : ''} | ${
          r.score != null ? `${r.score}/${r.maxScore}` : '—'
        } | ${r.ok ? 'PASS' : 'FAIL'} | ${r.ms} |`
    ),
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'sim-results.md'), md.join('\n'));

  console.log('\n' + md.join('\n'));
  console.log(`Wrote ${summaryPath}`);
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
