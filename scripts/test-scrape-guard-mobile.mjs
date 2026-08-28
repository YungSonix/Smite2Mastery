#!/usr/bin/env node
/**
 * Regression: iOS Safari chrome must not trip ScrapeGuard blur on take pages.
 *
 * Prerequisites:
 *   TRIVIA_HOST_SECRET=devsecret npm run trivia:api
 *   TRIVIA_HOST_SECRET=devsecret npm run trivia:dev
 *
 *   node scripts/test-scrape-guard-mobile.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const UI_BASE = process.env.FORMATIVE_UI_BASE || 'http://localhost:5174';
const API_BASE = process.env.FORMATIVE_API_BASE || 'http://localhost:3000';
const OUT_DIR = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts';
const HOST_USER = process.env.TRIVIA_HOST_USER || 'teacher';
const HOST_SECRET = process.env.TRIVIA_HOST_SECRET || 'devsecret';

const hostHeaders = {
  'Content-Type': 'application/json',
  'x-host-username': HOST_USER,
  'x-host-secret': HOST_SECRET,
};

async function host(body, method = 'POST') {
  const res = await fetch(`${API_BASE}/api/trivia/host`, {
    method,
    headers: hostHeaders,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Host API ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function createAssignedQuiz() {
  const { quiz } = await host({ action: 'create', title: 'ScrapeGuard mobile regression' });
  const added = await host({ action: 'add_question', quizId: quiz.id, type: 'multiple_choice' });
  await host(
    {
      action: 'update_question',
      questionId: added.question.id,
      patch: {
        prompt: 'Which god is the Goddess of Wisdom?',
        options: ['Athena', 'Ares', 'Zeus', 'Hades'],
        correct: { index: 0 },
        points: 1,
        required: true,
      },
    },
    'PUT'
  );
  await host(
    {
      action: 'update_quiz',
      quizId: quiz.id,
      patch: {
        is_assigned: true,
        settings: {
          ...(quiz.settings || {}),
          instructions: 'Mobile scrape-guard regression quiz.',
          show_scores: true,
        },
      },
    },
    'PUT'
  );
  return quiz.slug;
}

async function assertTakeReadable(page, label) {
  await page.waitForTimeout(2200); // poll interval 800ms + console probe buffer
  const state = await page.evaluate(() => {
    const html = document.documentElement;
    const scrim = document.querySelector('.f-scrape-guard-scrim');
    const take = document.querySelector('.f-take');
    const root = document.getElementById('root');
    const firstChild = root?.children?.[0];
    return {
      active: html.classList.contains('f-scrape-guard-active'),
      takeClass: html.classList.contains('f-scrape-guard-take'),
      hasScrim: Boolean(scrim),
      takeText: (take?.innerText || '').replace(/\s+/g, ' ').slice(0, 240),
      rootFilter: root ? getComputedStyle(root).filter : null,
      childFilter: firstChild ? getComputedStyle(firstChild).filter : null,
      outerH: window.outerHeight,
      innerH: window.innerHeight,
      heightGap: window.outerHeight - window.innerHeight,
      ua: navigator.userAgent.slice(0, 120),
    };
  });
  console.log(`[${label}]`, JSON.stringify(state, null, 2));
  if (state.active) {
    throw new Error(`${label}: f-scrape-guard-active unexpectedly set (heightGap=${state.heightGap})`);
  }
  if (state.hasScrim) {
    throw new Error(`${label}: scrape-guard scrim unexpectedly visible`);
  }
  if (!/Wisdom|Athena|Discord|instructions|regression/i.test(state.takeText)) {
    throw new Error(`${label}: take content not readable: ${JSON.stringify(state.takeText)}`);
  }
  // Old bug blurred entire #root; new CSS must keep root unfiltered when inactive
  if (state.rootFilter && state.rootFilter !== 'none') {
    throw new Error(`${label}: #root still filtered: ${state.rootFilter}`);
  }
  return state;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const slug = await createAssignedQuiz();
  const takeUrl = `${UI_BASE}/trivia/take/${slug}`;
  console.log('Take URL:', takeUrl);

  const browser = await chromium.launch({ headless: true });

  // iPhone 14 with Safari-like chrome gap (outer taller than inner by >140px)
  {
    const iphone = devices['iPhone 14'];
    const context = await browser.newContext({
      ...iphone,
      screen: { width: 390, height: 844 },
      viewport: { width: 390, height: 664 },
    });
    const page = await context.newPage();
    await page.goto(takeUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.f-take', { timeout: 30000 });

    // Prove the OLD heuristic would have falsely flagged this viewport
    const oldWouldFlag = await page.evaluate(() => {
      const widthGap = window.outerWidth - window.innerWidth;
      const heightGap = window.outerHeight - window.innerHeight;
      return { widthGap, heightGap, oldFlag: widthGap > 140 || heightGap > 140 };
    });
    console.log('[old-heuristic]', oldWouldFlag);
    if (!oldWouldFlag.oldFlag) {
      console.warn('Note: Playwright did not produce >140 height gap; forcing via stub check');
    }

    await assertTakeReadable(page, 'iphone-14-chrome-gap');
    const shot = path.join(OUT_DIR, 'scrape_guard_iphone_take_readable.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log('Wrote', shot);
    await context.close();
  }

  // Desktop without DevTools stays clear
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.goto(takeUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.f-take', { timeout: 30000 });
    await assertTakeReadable(page, 'desktop-no-devtools');
    const shot = path.join(OUT_DIR, 'scrape_guard_desktop_take_readable.png');
    await page.screenshot({ path: shot, fullPage: true });
    console.log('Wrote', shot);
    await context.close();
  }

  // Direct module check: mobile UA never reports DevTools from viewport gap
  {
    const context = await browser.newContext({ ...devices['iPhone 14'] });
    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(window, 'outerHeight', { get: () => 900 });
      Object.defineProperty(window, 'innerHeight', { get: () => 500 });
    });
    await page.goto(`${UI_BASE}/trivia/take/${slug}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.f-take', { timeout: 30000 });
    await assertTakeReadable(page, 'iphone-forced-180px-gap');
    await context.close();
  }

  await browser.close();
  console.log('OK: scrape guard does not black-screen mobile take pages');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
