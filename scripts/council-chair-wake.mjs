#!/usr/bin/env node
/**
 * Open Cursor with a pre-filled Chair prompt (replaces typing "go" after panel Send).
 * Uses cursor:// deeplink — user may need one Confirm click in Cursor.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'docs', 'council', 'council.config.json');

const DEFAULT_PROMPT = '@council.mdc go';

export function readPanelAutoWake() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return cfg.panelAutoWakeChair !== false;
  } catch {
    return true;
  }
}

export function buildChairGoDeeplink(prompt = DEFAULT_PROMPT) {
  const text = encodeURIComponent(prompt);
  return {
    app: `cursor://anysphere.cursor-deeplink/prompt?text=${text}`,
    web: `https://cursor.com/link/prompt?text=${text}`,
    prompt,
  };
}

export function wakeChairInCursor(prompt = DEFAULT_PROMPT) {
  const { app } = buildChairGoDeeplink(prompt);
  const opts = { detached: true, stdio: 'ignore' };
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', app], opts).unref();
    return { ok: true, method: 'win-start', deeplink: app };
  }
  if (process.platform === 'darwin') {
    spawn('open', [app], opts).unref();
    return { ok: true, method: 'open', deeplink: app };
  }
  spawn('xdg-open', [app], opts).unref();
  return { ok: true, method: 'xdg-open', deeplink: app };
}

if (process.argv[1]?.includes('council-chair-wake')) {
  console.log(JSON.stringify(wakeChairInCursor(), null, 2));
}
