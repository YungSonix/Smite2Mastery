#!/usr/bin/env node
/**
 * Fails if tracked files look like they contain secrets (pre-push / CI).
 * Run: npm run check:secrets
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const TRACKED_IGNORE = new Set([
  '.env.example',
  'scripts/check-secrets.mjs',
  'supabase/security_hardening_economy.sql',
]);

const PATTERNS = [
  { name: 'Supabase JWT anon key', re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { name: 'sb_publishable key', re: /sb_publishable_[A-Za-z0-9_]+/ },
  { name: 'service_role in source', re: /service_role/i },
  { name: 'Hardcoded supabase.co URL in config', re: /https:\/\/[a-z0-9]+\.supabase\.co/ },
];

function listTrackedFiles() {
  try {
    const out = execSync('git ls-files', { cwd: root, encoding: 'utf8' });
    return out
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const files = listTrackedFiles();
const hits = [];

for (const rel of files) {
  if (TRACKED_IGNORE.has(rel.replace(/\\/g, '/'))) continue;
  if (rel.startsWith('app/data/')) continue;
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
  if (!/\.(js|jsx|ts|tsx|json|sql|md|env|example|yml|yaml)$/i.test(rel)) continue;

  let text;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }

  for (const { name, re } of PATTERNS) {
    if (rel.endsWith('.env.example')) continue;
    if (name.includes('supabase.co') && !rel.includes('config/') && !rel.includes('ENV_SETUP')) continue;
    const m = text.match(re);
    if (m) {
      hits.push({ file: rel, pattern: name, sample: m[0].slice(0, 48) + '…' });
    }
  }
}

if (hits.length) {
  console.error('Secret scan failed — possible credentials in tracked files:\n');
  for (const h of hits) {
    console.error(`  ${h.file}\n    ${h.pattern}: ${h.sample}\n`);
  }
  console.error('Remove secrets, use .env + Vercel/Expo env vars. See .env.example');
  process.exit(1);
}

console.log('Secret scan OK (%d tracked files checked).', files.length);
