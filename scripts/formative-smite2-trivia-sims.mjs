#!/usr/bin/env node
/**
 * One-shot: create a random Smite 2 trivia quiz, then run 15 browser sims
 * (5 desktop web / 5 iOS web / 5 Android web).
 *
 * Prerequisites (separate terminals or already running):
 *   TRIVIA_HOST_SECRET=devsecret npm run formative:api
 *   TRIVIA_HOST_SECRET=devsecret npm run formative:dev
 *
 *   npm run formative:trivia:sims
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function run(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(file)} exited ${code}`));
    });
  });
}

async function main() {
  await run(path.join(__dirname, 'formative-random-quiz.mjs'));
  await run(path.join(__dirname, 'formative-browser-sims.mjs'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
