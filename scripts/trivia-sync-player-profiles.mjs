#!/usr/bin/env node
/**
 * Backfill trivia_player_profiles from all production trivia_responses.
 *
 * Prerequisite: run supabase/formative_trivia_player_profiles.sql in Supabase.
 *
 * From repo root (c:\Users\Carri\Documents\smite2app):
 *   npm run trivia:sync-players
 *
 * Needs in shell or `.env` at repo root:
 *   SUPABASE_URL  (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role — secret)
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv() {
  for (const name of ['.env.local', '.env']) {
    const envPath = path.join(root, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadDotEnv();

const require = createRequire(import.meta.url);
const { supabaseAdmin } = require('../lib/server/triviaApi');
const { syncAllPlayerProfiles } = require('../lib/server/triviaPlayerProfiles');

async function main() {
  const sb = supabaseAdmin();
  const result = await syncAllPlayerProfiles(sb);
  console.log(`Synced ${result.synced} player profile(s) to trivia_player_profiles.`);
}

main().catch((err) => {
  console.error(err.message || err);
  if (String(err.message || '').includes('trivia_player_profiles')) {
    console.error('\nRun supabase/formative_trivia_player_profiles.sql in Supabase SQL editor first.');
  }
  process.exit(1);
});
