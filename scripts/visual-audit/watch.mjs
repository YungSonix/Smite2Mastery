#!/usr/bin/env node
/**
 * Background watcher — re-runs polish cycle on an interval.
 * Leaves queue files for Cursor agent / Automation to pick up.
 *
 * Usage: npm run polish:watch
 * Stop: Ctrl+C
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const INTERVAL_MS = Number(process.env.POLISH_WATCH_MS || 30 * 60 * 1000);

function runCycle() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'run-cycle.mjs')], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`cycle exit ${code}`))));
  });
}

async function loop() {
  console.log(`Polish watch — interval ${Math.round(INTERVAL_MS / 60000)} min`);
  for (;;) {
    const started = new Date().toISOString();
    console.log(`\n[${started}] Starting polish cycle…`);
    try {
      await runCycle();
      console.log(`[${started}] Cycle complete. Queue updated.`);
    } catch (err) {
      console.warn(`[${started}] Cycle failed: ${err.message}`);
    }
    console.log(`Sleeping ${Math.round(INTERVAL_MS / 60000)} min… (Ctrl+C to stop)`);
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

loop();
