#!/usr/bin/env node
/**
 * Run 15 Scroll Trivia take-flow simulations across old + new devices:
 *   5 × desktop web (common laptop widths)
 *   5 × iOS web (WebKit ≈ Safari: SE → iPhone 16)
 *   5 × Android web (Galaxy S5 → Galaxy S26)
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
import {
  answerAllQuestions,
  plannedAnswers,
  submitTakeQuiz,
  waitForQuestionImages,
  waitForUi,
} from './formative-sim-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI_BASE = process.env.FORMATIVE_UI_BASE || 'http://localhost:5174';
const API_BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const HOST_USER = process.env.TRIVIA_HOST_USER || 'teacher';
const HOST_SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';
const OUT_DIR = path.join(ROOT, 'artifacts', 'trivia-sims');
const QUIZ_PATH = process.env.TRIVIA_QUIZ_JSON || path.join(OUT_DIR, 'quiz.json');

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

function desktopProfile(index, width, height, name) {
  return {
    group: 'web',
    index,
    label: `web-${index}`,
    browserType: 'chromium',
    channel: process.env.TRIVIA_CHROME_CHANNEL || undefined,
    device: null,
    deviceName: name,
    viewport: { width, height },
    isMobile: false,
    hasTouch: false,
  };
}

function iosProfile(index, deviceKey) {
  const device = { ...devices[deviceKey], name: deviceKey };
  return {
    group: 'ios-web',
    index,
    label: `ios-web-${index}`,
    browserType: 'webkit',
    device,
    deviceName: deviceKey,
    viewport: null,
    isMobile: true,
    hasTouch: true,
  };
}

function androidProfile(index, deviceKeyOrCustom) {
  const device =
    typeof deviceKeyOrCustom === 'string'
      ? { ...devices[deviceKeyOrCustom], name: deviceKeyOrCustom }
      : deviceKeyOrCustom;
  return {
    group: 'android-web',
    index,
    label: `android-web-${index}`,
    browserType: 'chromium',
    device,
    deviceName: device.name || String(deviceKeyOrCustom),
    viewport: null,
    isMobile: true,
    hasTouch: true,
  };
}

const PROFILES = [
  // Desktop — older common laptop widths through modern
  desktopProfile(1, 1024, 768, 'desktop-1024x768'),
  desktopProfile(2, 1280, 720, 'desktop-1280x720'),
  desktopProfile(3, 1366, 768, 'desktop-1366x768'),
  desktopProfile(4, 1440, 900, 'desktop-1440x900'),
  desktopProfile(5, 1920, 1080, 'desktop-1920x1080'),
  // iOS web — older small phones through current
  iosProfile(1, 'iPhone SE'),
  iosProfile(2, 'iPhone 8'),
  iosProfile(3, 'iPhone 11'),
  iosProfile(4, 'iPhone 13'),
  iosProfile(5, 'iPhone 16'),
  // Android web — older flagships through current
  androidProfile(1, 'Galaxy S5'),
  androidProfile(2, 'Galaxy S8'),
  androidProfile(3, 'Galaxy S9+'),
  androidProfile(4, 'Galaxy S24'),
  androidProfile(5, GALAXY_S26),
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

async function runOne(browserLauncher, profile, quizPayload, runIndex) {
  const started = Date.now();
  const slug = quizPayload.quiz.slug;
  const answerKey = quizPayload.answerKey || [];
  const answers = plannedAnswers(answerKey, runIndex, 3);
  const discord = `Sim User ${profile.index} ${Date.now().toString(36)}`;
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
    const url = `${UI_BASE}/trivia/take/${slug}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForSelector('#discord-username', { timeout: 30_000 });
    await page.fill('#discord-username', discord);
    await page.fill('#ingame-name', ingame);

    const startBtn = page.locator('section.f-identity-card button.f-submit-btn');
    await startBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(() => {
      const b = document.querySelector('section.f-identity-card button.f-submit-btn');
      return Boolean(b && !b.disabled);
    }, { timeout: 10_000 });
    await startBtn.click({ force: true });

    await page.waitForSelector('section.f-qcard .f-option-row, section.f-qcard input.f-fib-inline', {
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => {
        const opt = document.querySelector('.f-option-row');
        const submit = document.querySelector('button.f-submit-btn[type="submit"]');
        if (!opt || !submit) return false;
        const oh = opt.getBoundingClientRect().height;
        const sh = submit.getBoundingClientRect().height;
        return oh >= 44 && sh >= 44;
      },
      { timeout: 15_000 }
    );

    await waitForQuestionImages(page);

    const timer = page.locator('.f-timer-float');
    if (!(await timer.count())) {
      throw new Error('Timer is missing after start');
    }
    const clock1 = await timer.innerText();
    await page.waitForTimeout(1300);
    const clock2 = await timer.innerText();
    const parseClock = (t) => {
      const m = String(t || '').trim().match(/(\d+):(\d{2})/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const sec1 = parseClock(clock1);
    const sec2 = parseClock(clock2);
    if (sec1 == null || sec2 == null) {
      throw new Error(`Timer text unreadable: "${clock1}" → "${clock2}"`);
    }
    if (sec2 >= sec1) {
      throw new Error(`Timer did not tick down: ${clock1} → ${clock2}`);
    }
    result.timer = { from: clock1.trim(), to: clock2.trim() };

    const layout = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const issues = [];
      const overflow = document.documentElement.scrollWidth - vw;
      if (overflow > 4) issues.push(`horizontal overflow ${overflow}px`);
      for (const el of document.querySelectorAll('.f-qcard, .f-q-prompt, .f-option-row, .f-take img, audio')) {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        if (r.right > vw + 8) issues.push(`${el.className || el.tagName} clips right (${Math.round(r.right - vw)}px)`);
        if (r.left < -8) issues.push(`${el.className || el.tagName} clips left`);
      }
      const imgs = [...document.querySelectorAll('.f-qcard img')];
      const broken = imgs.filter((img) => !img.complete || img.naturalWidth < 1).length;
      if (imgs.length && broken) issues.push(`${broken}/${imgs.length} images failed to load`);
      return { vw, vh, overflow, issues, imageCount: imgs.length };
    });
    result.layout = layout;
    if (layout.issues.length) {
      throw new Error(`Layout: ${layout.issues.slice(0, 4).join('; ')}`);
    }

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
        const submit = document.querySelector('.f-submit-btn[type="submit"]') || document.querySelector('.f-submit-btn');
        const input = document.querySelector('#discord-username');
        const promptCs = prompt ? cs(prompt) : null;
        const cardCs = card ? cs(card) : null;
        const walkBg = (el) => {
          let n = el;
          while (n && n !== document.documentElement) {
            const bg = cs(n).backgroundColor;
            if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
            n = n.parentElement;
          }
          return cs(document.body).backgroundColor;
        };
        const pageBg = walkBg(prompt || card || document.querySelector('.f-take'));
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
      if (a11y.mutedContrast != null && a11y.mutedContrast < 3) {
        issues.push(`muted text contrast ${a11y.mutedContrast}:1 < 3`);
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

    await answerAllQuestions(page, answerKey, answers);
    const { score, maxScore } = await submitTakeQuiz(page);
    result.score = score;
    result.maxScore = maxScore;

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
  await waitForUi(UI_BASE);

  // Confirm API still up
  const health = await fetch(`${API_BASE}/api/trivia/health`);
  if (!health.ok) throw new Error('Trivia API health check failed');

  const quizPayload = loadQuiz();
  if (!quizPayload?.quiz?.slug) throw new Error('Quiz slug missing');
  if (!quizPayload.answerKey?.length) throw new Error('answerKey missing — regenerate quiz');

  console.log(`Quiz: ${quizPayload.quiz.title} (${quizPayload.quiz.slug})`);
  console.log(`Take URL: ${UI_BASE}/trivia/take/${quizPayload.quiz.slug}`);
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
      // Keep the intended iPhone descriptor; only the engine falls back.
      effective.fallback = 'chromium-iphone-emulation';
    }
    process.stdout.write(`  → ${effective.label} (${effective.browserType}${effective.fallback ? ' fallback' : ''})… `);
    await waitForUi(UI_BASE, 30_000);
    const r = await runOne(launcher, effective, quizPayload, runIndex);
    runIndex += 1;
    results.push(r);
    console.log(r.ok ? `PASS ${r.score ?? '?'}/${r.maxScore ?? '?'} (${r.ms}ms)` : `FAIL ${r.error}`);
  }

  await chromiumBrowser.close().catch(() => {});
  await webkitBrowser?.close().catch(() => {});

  // Verify submissions were stored with required fields (memory API or Supabase via host API)
  let storage = { ok: false, checked: 0, missing: [], error: null };
  try {
    const quizId = quizPayload.quiz.id;
    const res = await fetch(`${API_BASE}/api/trivia/host?action=responses&quizId=${quizId}`, {
      headers: {
        'x-host-username': HOST_USER,
        'x-host-secret': HOST_SECRET,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `responses ${res.status}`);
    const byDiscord = new Map(
      (data.responses || []).map((r) => [String(r.discord_username || '').toLowerCase(), r])
    );
    const missing = [];
    for (const r of results.filter((x) => x.ok)) {
      const row = byDiscord.get(String(r.discord || '').toLowerCase());
      if (!row) {
        missing.push(`${r.label}: response not found for ${r.discord}`);
        continue;
      }
      if (!row.ingame_name) missing.push(`${r.label}: missing ingame_name`);
      if (row.score == null || row.max_score == null) missing.push(`${r.label}: missing score fields`);
      if (!row.answers || typeof row.answers !== 'object') {
        missing.push(`${r.label}: missing answers object`);
      } else {
        const keys = Object.keys(row.answers);
        if (keys.length < 3) missing.push(`${r.label}: answers too thin (${keys.length} keys)`);
      }
      if (!row.submitted_at) missing.push(`${r.label}: missing submitted_at`);
    }
    storage = {
      ok: missing.length === 0,
      checked: results.filter((x) => x.ok).length,
      storedTotal: (data.responses || []).length,
      missing,
      sample: (data.responses || [])[0]
        ? {
            discord_username: data.responses[0].discord_username,
            ingame_name: data.responses[0].ingame_name,
            score: data.responses[0].score,
            max_score: data.responses[0].max_score,
            hasAnswers: Boolean(data.responses[0].answers),
          }
        : null,
    };
    // Excel-friendly CSV snapshot of stored rows (UTF-8 BOM)
    const csvEscape = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      'submitted_at',
      'discord_username',
      'ingame_name',
      'score',
      'max_score',
      'ip_address',
      'user_agent',
      'response_id',
    ];
    const lines = [
      headers.join(','),
      ...(data.responses || []).map((r) =>
        [
          r.submitted_at,
          r.discord_username,
          r.ingame_name,
          r.score,
          r.max_score,
          r.ip_address,
          r.user_agent,
          r.id,
        ]
          .map(csvEscape)
          .join(',')
      ),
    ];
    fs.writeFileSync(path.join(OUT_DIR, 'responses-export.csv'), `\uFEFF${lines.join('\n')}\n`);
    storage.csvPath = path.relative(ROOT, path.join(OUT_DIR, 'responses-export.csv'));
  } catch (err) {
    storage = { ok: false, checked: 0, missing: [], error: err.message || String(err) };
  }

  const summary = {
    ok: results.every((r) => r.ok) && storage.ok,
    quiz: {
      id: quizPayload.quiz.id,
      slug: quizPayload.quiz.slug,
      title: quizPayload.quiz.title,
      takeUrl: `${UI_BASE}/trivia/take/${quizPayload.quiz.slug}`,
    },
    totals: {
      all: results.length,
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      web: results.filter((r) => r.group === 'web' && r.ok).length,
      iosWeb: results.filter((r) => r.group === 'ios-web' && r.ok).length,
      androidWeb: results.filter((r) => r.group === 'android-web' && r.ok).length,
    },
    storage,
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
    `- Storage check: **${storage.ok ? 'PASS' : 'FAIL'}** (checked ${storage.checked}, stored ${storage.storedTotal ?? '—'})`,
    storage.error ? `- Storage error: ${storage.error}` : '',
    ...(storage.missing || []).map((m) => `- Storage issue: ${m}`),
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
  ].filter(Boolean);
  fs.writeFileSync(path.join(OUT_DIR, 'sim-results.md'), md.join('\n'));

  console.log('\n' + md.join('\n'));
  console.log(`Wrote ${summaryPath}`);
  if (!summary.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
