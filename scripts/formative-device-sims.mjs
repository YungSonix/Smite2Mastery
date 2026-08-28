#!/usr/bin/env node
/**
 * 500-session Scroll Trivia take-page device/browser matrix sims.
 *
 * Prerequisites (local preferred):
 *   TRIVIA_HOST_SECRET=devsecret npm run trivia:api
 *   TRIVIA_HOST_SECRET=devsecret npm run trivia:dev
 *   node scripts/formative-random-quiz.mjs   # or TRIVIA_SLUG=smite-2-trivia
 *
 *   npm run trivia:device-sims
 *
 * Env:
 *   TRIVIA_DEVICE_SIMS_N (default 500)
 *   TRIVIA_DEVICE_SIMS_CONCURRENCY (default 8 local, 5 prod)
 *   FORMATIVE_UI_BASE, FORMATIVE_API_BASE, TRIVIA_SLUG, TRIVIA_QUIZ_JSON
 *   TRIVIA_DEVICE_SIMS_PROD=1  — allow production URL (concurrency capped at 5)
 *
 * Production smoke (safe):
 *   TRIVIA_DEVICE_SIMS_PROD=1 TRIVIA_DEVICE_SIMS_N=100 FORMATIVE_UI_BASE=https://smitescroll.com npm run trivia:device-sims
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, firefox, devices } from 'playwright';
import {
  answerAllQuestions,
  filterConsoleErrors,
  plannedAnswers,
  submitTakeQuiz,
  waitForTakeMedia,
  waitForUi,
} from './formative-sim-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UI_BASE = process.env.FORMATIVE_UI_BASE || 'http://localhost:5174';
const API_BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const OUT_DIR = path.join(ROOT, 'artifacts', 'trivia-device-sims');
const QUIZ_PATH = process.env.TRIVIA_QUIZ_JSON || path.join(ROOT, 'artifacts', 'trivia-sims', 'quiz.json');
const HOST_USER = process.env.TRIVIA_HOST_USER || 'teacher';
const HOST_SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';

const IS_PROD =
  process.env.TRIVIA_DEVICE_SIMS_PROD === '1' ||
  /smitescroll\.com/i.test(UI_BASE) ||
  /smitescroll\.com/i.test(API_BASE);

const TOTAL = Math.max(1, Number(process.env.TRIVIA_DEVICE_SIMS_N || 500));
const CONCURRENCY = Math.min(
  IS_PROD ? 5 : 32,
  Math.max(
    1,
    Number(process.env.TRIVIA_DEVICE_SIMS_CONCURRENCY || (IS_PROD ? 5 : 8))
  )
);
const FULL_SUBMIT_EVERY = Math.max(1, Number(process.env.TRIVIA_DEVICE_SIMS_FULL_EVERY || 25));

/** @type {import('playwright').Browser | null} */
let chromiumBrowser = null;
/** @type {import('playwright').Browser | null} */
let webkitBrowser = null;
/** @type {import('playwright').Browser | null} */
let firefoxBrowser = null;

const VIEWPORT_PROFILES = [
  { id: 'win-1920', group: 'desktop', name: 'Windows 1920×1080', viewport: { width: 1920, height: 1080 }, isMobile: false, hasTouch: false },
  { id: 'win-1366', group: 'desktop', name: 'Windows 1366×768', viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false },
  { id: 'win-2560', group: 'desktop', name: 'Windows 2560×1440', viewport: { width: 2560, height: 1440 }, isMobile: false, hasTouch: false },
  { id: 'mac-1440', group: 'desktop', name: 'MacBook 1440×900', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { id: 'ipad', group: 'tablet', name: 'iPad Pro 11', device: devices['iPad Pro 11'] },
  { id: 'iphone-se', group: 'ios', name: 'iPhone SE', device: devices['iPhone SE'] },
  { id: 'iphone-14', group: 'ios', name: 'iPhone 14', device: devices['iPhone 14'] },
  { id: 'iphone-15', group: 'ios', name: 'iPhone 15', device: devices['iPhone 15'] },
  { id: 'pixel-7', group: 'android', name: 'Pixel 7', device: devices['Pixel 7'] },
  { id: 'galaxy-s24', group: 'android', name: 'Galaxy S24', device: devices['Galaxy S24'] },
  {
    id: 'galaxy-s24-ultra',
    group: 'android',
    name: 'Galaxy S24 Ultra',
    device: {
      ...devices['Galaxy S24'],
      name: 'Galaxy S24 Ultra',
      viewport: { width: 384, height: 824 },
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    },
  },
  { id: 'iphone-13-mini', group: 'ios', name: 'iPhone 13 Mini', device: devices['iPhone 13 Mini'] },
];

const BROWSER_PROFILES = [
  {
    id: 'chrome',
    label: 'Chrome',
    engine: 'chromium',
    channel: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  {
    id: 'edge',
    label: 'Edge',
    engine: 'chromium',
    channel: 'msedge',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  },
  {
    id: 'firefox',
    label: 'Firefox',
    engine: 'firefox',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  },
  {
    id: 'safari-macos',
    label: 'Safari macOS',
    engine: 'webkit',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  },
  {
    id: 'safari-ios',
    label: 'Safari iOS',
    engine: 'webkit',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  },
  {
    id: 'opera-gx',
    label: 'Opera GX',
    engine: 'chromium',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0',
  },
];

function loadQuiz() {
  if (process.env.TRIVIA_SLUG) {
    return {
      quiz: { slug: process.env.TRIVIA_SLUG, title: process.env.TRIVIA_SLUG },
      answerKey: JSON.parse(process.env.TRIVIA_ANSWER_KEY || '[]'),
    };
  }
  if (!fs.existsSync(QUIZ_PATH)) {
    throw new Error(`Missing ${QUIZ_PATH}. Run formative-random-quiz.mjs or set TRIVIA_SLUG.`);
  }
  return JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8'));
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRunPlan(n) {
  const rng = mulberry32(Number(process.env.TRIVIA_DEVICE_SIMS_SEED || 20260827));
  const plan = [];
  for (let i = 0; i < n; i += 1) {
    const vp = VIEWPORT_PROFILES[Math.floor(rng() * VIEWPORT_PROFILES.length)];
    let browserPool = BROWSER_PROFILES;
    if (vp.group === 'ios' || vp.group === 'android') {
      browserPool = BROWSER_PROFILES.filter((b) => b.id !== 'safari-macos' || rng() > 0.85);
    } else if (vp.group === 'desktop') {
      browserPool = BROWSER_PROFILES.filter((b) => b.id !== 'safari-ios' || rng() > 0.9);
    }
    const bp = browserPool[Math.floor(rng() * browserPool.length)];
    plan.push({
      runId: i + 1,
      viewport: vp,
      browser: bp,
      fullSubmit: (i + 1) % FULL_SUBMIT_EVERY === 0,
      timerCheck: (i + 1) % 5 === 0,
    });
  }
  return plan;
}

async function getBrowser(browserProfile) {
  if (browserProfile.engine === 'firefox') {
    if (!firefoxBrowser) {
      firefoxBrowser = await firefox.launch({ headless: true });
    }
    return { browser: firefoxBrowser, fallback: null };
  }
  if (browserProfile.engine === 'webkit') {
    if (!webkitBrowser) {
      try {
        webkitBrowser = await webkit.launch({ headless: true });
      } catch (err) {
        return { browser: null, fallback: `webkit-unavailable: ${err.message}` };
      }
    }
    return { browser: webkitBrowser, fallback: null };
  }
  if (!chromiumBrowser) {
    chromiumBrowser = await chromium.launch({ headless: true });
  }
  return { browser: chromiumBrowser, fallback: null };
}

function layoutEvaluateScript() {
  return () => {
    const relLum = (rgb) => {
      const parts = String(rgb)
        .replace(/[^\d.,]/g, '')
        .split(',')
        .map((n) => Number(n.trim()) / 255);
      if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return 0;
      const [r, g, b] = parts.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
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
    const walkBg = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = cs(n).backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
        n = n.parentElement;
      }
      return cs(document.body).backgroundColor;
    };

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const root = document.querySelector('#root');
    const rootText = root?.innerText?.trim() || '';
    const issues = [];
    const overflow = document.documentElement.scrollWidth - vw;
    if (overflow > 4) issues.push(`horizontal overflow ${overflow}px`);
    if (!root || rootText.length < 8) issues.push('root empty or too thin');

    const textEls = [...document.querySelectorAll('.f-q-prompt, .f-option-row, .f-cover-title, label, p, button')]
      .filter((el) => el.getBoundingClientRect().width > 0);
    let minFontPx = Infinity;
    for (const el of textEls) {
      const px = parseFloat(cs(el).fontSize) || 0;
      if (px > 0) minFontPx = Math.min(minFontPx, px);
    }
    if (Number.isFinite(minFontPx) && minFontPx < 12) {
      issues.push(`min readable font ${minFontPx.toFixed(1)}px < 12px`);
    }

    for (const el of document.querySelectorAll('.f-qcard, .f-q-prompt, .f-option-row, .f-take img, audio')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.right > vw + 8) issues.push(`${el.className || el.tagName} clips right`);
      if (r.left < -8) issues.push(`${el.className || el.tagName} clips left`);
    }

    const prompt = document.querySelector('.f-q-prompt') || document.querySelector('.f-cover-title');
    const pageBg = walkBg(prompt || document.querySelector('.f-take') || document.body);
    const promptContrast = prompt ? contrast(cs(prompt).color, pageBg) : null;
    if (promptContrast != null && promptContrast < 3.5) {
      issues.push(`prompt contrast ${promptContrast.toFixed(2)}:1 low`);
    }

    const imgs = [...document.querySelectorAll('.f-qcard img, .f-take img')];
    const broken = imgs.filter((img) => !img.complete || img.naturalWidth < 1).length;
    if (imgs.length && broken) issues.push(`${broken}/${imgs.length} images failed`);

    const audios = [...document.querySelectorAll('audio')];
    const audioMeta = audios.map((a) => ({
      src: a.currentSrc || a.src || '',
      readyState: a.readyState,
      networkState: a.networkState,
      error: a.error?.code ?? null,
    }));

    const perf = performance.getEntriesByType('navigation')[0];
    const timing = perf
      ? {
          domContentLoaded: Math.round(perf.domContentLoadedEventEnd),
          loadEvent: Math.round(perf.loadEventEnd),
          duration: Math.round(perf.duration),
        }
      : null;

    return {
      vw,
      vh,
      overflow,
      issues,
      rootLen: rootText.length,
      minFontPx: Number.isFinite(minFontPx) ? minFontPx : null,
      promptContrast: promptContrast != null ? Number(promptContrast.toFixed(2)) : null,
      imageCount: imgs.length,
      audioCount: audios.length,
      audioMeta,
      timing,
    };
  };
}

async function runSession(planItem, quizPayload) {
  const started = Date.now();
  const { viewport: vp, browser: bp, runId, fullSubmit, timerCheck } = planItem;
  const slug = quizPayload.quiz.slug;
  const answerKey = quizPayload.answerKey || [];
  const discord = `DevSim${runId}_${Date.now().toString(36)}`;
  const ingame = `IG_${vp.id}_${bp.id}`;

  const result = {
    runId,
    ok: false,
    viewportId: vp.id,
    viewportName: vp.name,
    browserId: bp.id,
    browserLabel: bp.label,
    engine: bp.engine,
    fullSubmit,
    consoleErrors: [],
    layout: null,
    audio: null,
    timer: null,
    loadMs: null,
    interactiveMs: null,
    totalMs: 0,
    score: null,
    maxScore: null,
    error: null,
    screenshot: null,
    comboKey: `${vp.id}×${bp.id}`,
  };

  let context;
  let page;
  try {
    let { browser, fallback } = await getBrowser(bp);
    let engineUsed = bp.engine;
    if (!browser && bp.engine === 'webkit') {
      ({ browser } = await getBrowser({ ...bp, engine: 'chromium' }));
      engineUsed = 'chromium-webkit-fallback';
      result.fallback = fallback;
    }
    if (!browser) throw new Error(fallback || 'Browser launch failed');

    const contextOpts = {
      locale: 'en-US',
      userAgent: bp.userAgent,
    };
    if (vp.device) {
      Object.assign(contextOpts, vp.device);
      contextOpts.userAgent = bp.userAgent;
    } else {
      Object.assign(contextOpts, {
        viewport: vp.viewport,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      });
    }

    context = await browser.newContext(contextOpts);
    page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 240));
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(String(err.message || err).slice(0, 240));
    });

    const navStart = Date.now();
    const url = `${UI_BASE}/trivia/take/${slug}`;
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    if (!response || response.status() >= 400) {
      throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
    }

    await page.waitForSelector('#root', { timeout: 20_000 });
    await page.waitForSelector('#discord-username', { timeout: 30_000 });
    result.loadMs = Date.now() - navStart;

    await page.fill('#discord-username', discord);
    await page.fill('#ingame-name', ingame);
    const startBtn = page.locator('section.f-identity-card button.f-submit-btn');
    await startBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(() => {
      const b = document.querySelector('section.f-identity-card button.f-submit-btn');
      return Boolean(b && !b.disabled);
    }, { timeout: 12_000 });
    await startBtn.click({ force: true });

    await page.waitForSelector('section.f-qcard .f-option-row, section.f-qcard input.f-fib-inline, .f-q-prompt', {
      timeout: 30_000,
    });
    result.interactiveMs = Date.now() - navStart;

    if (timerCheck) {
      const timer = page.locator('.f-timer-float');
      if (await timer.count()) {
        const clock1 = await timer.innerText();
        await page.waitForTimeout(1200);
        const clock2 = await timer.innerText();
        const parseClock = (t) => {
          const m = String(t || '').trim().match(/(\d+):(\d{2})/);
          return m ? Number(m[1]) * 60 + Number(m[2]) : null;
        };
        const sec1 = parseClock(clock1);
        const sec2 = parseClock(clock2);
        result.timer = { from: clock1.trim(), to: clock2.trim(), tickedDown: sec1 != null && sec2 != null && sec2 < sec1 };
        if (sec1 != null && sec2 != null && sec2 >= sec1) {
          throw new Error(`Timer did not tick: ${clock1} → ${clock2}`);
        }
      }
    }

    await waitForTakeMedia(page);

    const layout = await page.evaluate(layoutEvaluateScript());
    result.layout = layout;
    if (layout.issues.length) {
      throw new Error(`Layout: ${layout.issues.slice(0, 5).join('; ')}`);
    }

    const audioEls = page.locator('audio');
    const audioCount = await audioEls.count();
    if (audioCount > 0) {
      const audioOk = await page.evaluate(async () => {
        const list = [...document.querySelectorAll('audio')];
        const out = [];
        for (const a of list) {
          const src = a.currentSrc || a.src || '';
          if (src.startsWith('blob:') && !a.error) {
            out.push({ ok: true, readyState: a.readyState, blob: true });
            continue;
          }
          if (a.error) {
            out.push({ ok: false, reason: `error code ${a.error.code}` });
            continue;
          }
          if (a.readyState >= 2) {
            out.push({ ok: true, readyState: a.readyState });
            continue;
          }
          await new Promise((resolve) => {
            const done = () => resolve(null);
            a.addEventListener('loadeddata', done, { once: true });
            a.addEventListener('loadedmetadata', done, { once: true });
            a.addEventListener('error', done, { once: true });
            setTimeout(done, 8000);
          });
          const afterSrc = a.currentSrc || a.src || '';
          out.push({
            ok: !a.error && (afterSrc.startsWith('blob:') || a.readyState >= 1),
            readyState: a.readyState,
            error: a.error?.code ?? null,
            blob: afterSrc.startsWith('blob:'),
          });
        }
        return out;
      });
      result.audio = { count: audioCount, checks: audioOk };
      const bad = audioOk.filter((x) => !x.ok);
      if (bad.length) throw new Error(`Audio failed: ${bad.length}/${audioCount}`);
    } else {
      result.audio = { count: 0, checks: [] };
    }

    if (fullSubmit && answerKey.length) {
      const answers = plannedAnswers(answerKey, runId);
      await answerAllQuestions(page, answerKey, answers);
      const { score, maxScore } = await submitTakeQuiz(page);
      result.score = score;
      result.maxScore = maxScore;
    }

    result.consoleErrors = filterConsoleErrors(consoleErrors);
    if (result.consoleErrors.length) {
      throw new Error(`Console errors: ${result.consoleErrors.slice(0, 2).join(' | ')}`);
    }

    result.engine = engineUsed;
    result.ok = true;
  } catch (err) {
    result.error = err?.message || String(err);
    try {
      if (page) {
        fs.mkdirSync(path.join(OUT_DIR, 'screenshots'), { recursive: true });
        const shotPath = path.join(OUT_DIR, 'screenshots', `run-${runId}-${vp.id}-${bp.id}.png`);
        await page.screenshot({ path: shotPath, fullPage: true });
        result.screenshot = path.relative(ROOT, shotPath);
      }
    } catch {
      /* ignore */
    }
  } finally {
    result.totalMs = Date.now() - started;
    await context?.close().catch(() => {});
  }
  return result;
}

async function runPool(plan, quizPayload) {
  const results = new Array(plan.length);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < plan.length) {
      const idx = cursor;
      cursor += 1;
      const item = plan[idx];
      results[idx] = await runSession(item, quizPayload);
      done += 1;
      if (done % 25 === 0 || done === plan.length) {
        const passed = results.filter(Boolean).filter((r) => r.ok).length;
        process.stdout.write(`\r  Progress: ${done}/${plan.length} (${passed} pass)   `);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  process.stdout.write('\n');
  return results;
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function summarizeFailures(results) {
  const failed = results.filter((r) => !r.ok);
  const byCombo = new Map();
  const byIssue = new Map();
  for (const r of failed) {
    byCombo.set(r.comboKey, (byCombo.get(r.comboKey) || 0) + 1);
    const key = (r.error || 'unknown').split(':')[0].slice(0, 80);
    byIssue.set(key, (byIssue.get(key) || 0) + 1);
  }
  return {
    topCombos: [...byCombo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
    topIssues: [...byIssue.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
  };
}

async function main() {
  if (IS_PROD && process.env.TRIVIA_DEVICE_SIMS_PROD !== '1') {
    throw new Error(
      'Production URL detected. Set TRIVIA_DEVICE_SIMS_PROD=1 to run (max concurrency 5). Prefer local stack.'
    );
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await waitForUi(UI_BASE);

  const health = await fetch(`${API_BASE}/api/trivia/health`);
  if (!health.ok) throw new Error('Trivia API health check failed');

  const quizPayload = loadQuiz();
  if (!quizPayload?.quiz?.slug) throw new Error('Quiz slug missing');

  const plan = buildRunPlan(TOTAL);
  const fullSubmitCount = plan.filter((p) => p.fullSubmit).length;

  console.log(`Target: ${UI_BASE}/trivia/take/${quizPayload.quiz.slug}`);
  console.log(`Environment: ${IS_PROD ? 'PRODUCTION (throttled)' : 'LOCAL'}`);
  console.log(`Sessions: ${TOTAL} | Concurrency: ${CONCURRENCY} | Full submit: ${fullSubmitCount}`);
  console.log(`Viewports: ${VIEWPORT_PROFILES.length} | Browsers: ${BROWSER_PROFILES.length}`);

  const wallStart = Date.now();
  const results = await runPool(plan, quizPayload);
  const wallMs = Date.now() - wallStart;

  await chromiumBrowser?.close().catch(() => {});
  await webkitBrowser?.close().catch(() => {});
  await firefoxBrowser?.close().catch(() => {});

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const loadTimes = results.filter((r) => r.loadMs != null).map((r) => r.loadMs).sort((a, b) => a - b);
  const interactiveTimes = results
    .filter((r) => r.interactiveMs != null)
    .map((r) => r.interactiveMs)
    .sort((a, b) => a - b);
  const { topCombos, topIssues } = summarizeFailures(results);

  const layoutFails = results.filter((r) => !r.ok && /layout|overflow|clip/i.test(r.error || '')).length;
  const audioFails = results.filter((r) => !r.ok && /audio/i.test(r.error || '')).length;
  const blankFails = results.filter((r) => !r.ok && /root empty|HTTP|no response/i.test(r.error || '')).length;
  const consoleFails = results.filter((r) => !r.ok && /console errors/i.test(r.error || '')).length;
  const timerFails = results.filter((r) => r.timer && r.timer.tickedDown === false).length;

  const report = {
    ok: failed === 0,
    environment: IS_PROD ? 'production' : 'local',
    uiBase: UI_BASE,
    apiBase: API_BASE,
    quiz: {
      slug: quizPayload.quiz.slug,
      title: quizPayload.quiz.title,
      takeUrl: `${UI_BASE}/trivia/take/${quizPayload.quiz.slug}`,
    },
    config: {
      total: TOTAL,
      concurrency: CONCURRENCY,
      viewportProfiles: VIEWPORT_PROFILES.length,
      browserProfiles: BROWSER_PROFILES.length,
      fullSubmitEvery: FULL_SUBMIT_EVERY,
      fullSubmitRuns: fullSubmitCount,
    },
    totals: {
      all: results.length,
      passed,
      failed,
      passRate: Number(((passed / results.length) * 100).toFixed(2)),
    },
    categories: {
      layout: layoutFails,
      audio: audioFails,
      blankOrHttp: blankFails,
      console: consoleFails,
      timer: timerFails,
    },
    timing: {
      wallMs,
      loadMs: { p50: percentile(loadTimes, 50), p95: percentile(loadTimes, 95), max: loadTimes.at(-1) },
      interactiveMs: {
        p50: percentile(interactiveTimes, 50),
        p95: percentile(interactiveTimes, 95),
        max: interactiveTimes.at(-1),
      },
    },
    topFailureCombos: topCombos.map(([combo, count]) => ({ combo, count })),
    topIssues: topIssues.map(([issue, count]) => ({ issue, count })),
    results,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  const md = [
    '# Scroll Trivia — device/browser sim report',
    '',
    `- **Environment:** ${report.environment}`,
    `- **Take URL:** ${report.quiz.takeUrl}`,
    `- **Passed:** ${passed}/${TOTAL} (${report.totals.passRate}%)`,
    `- **Wall time:** ${(wallMs / 1000).toFixed(1)}s (concurrency ${CONCURRENCY})`,
    '',
    '## Category failures',
    '',
    `- Layout/overflow: ${layoutFails}`,
    `- Audio: ${audioFails}`,
    `- Blank/HTTP: ${blankFails}`,
    `- Console errors: ${consoleFails}`,
    `- Timer: ${timerFails}`,
    '',
    '## Load timing (ms)',
    '',
    `- DOM ready p50/p95: ${report.timing.loadMs.p50} / ${report.timing.loadMs.p95}`,
    `- Interactive p50/p95: ${report.timing.interactiveMs.p50} / ${report.timing.interactiveMs.p95}`,
    '',
    '## Top failing device×browser combos',
    '',
    ...topCombos.map(([combo, count]) => `- \`${combo}\`: ${count}`),
    '',
    '## Top issues',
    '',
    ...topIssues.map(([issue, count]) => `- ${issue} (${count})`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'summary.md'), md);

  console.log('\n' + md);
  console.log(`Wrote ${path.relative(ROOT, path.join(OUT_DIR, 'report.json'))}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
