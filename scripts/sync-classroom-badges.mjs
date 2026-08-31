#!/usr/bin/env node
/**
 * Audit + sync classroom badge PNGs → Smite2Mastery img/Badges on GitHub.
 *
 *   node scripts/sync-classroom-badges.mjs              # dry-run audit
 *   node scripts/sync-classroom-badges.mjs --write      # copy into local clone + git commit hint
 *
 * Env:
 *   SMITE2MASTERY_REPO — path to local YungSonix/Smite2Mastery clone (default: ../Smite2Mastery)
 *   GITHUB_TOKEN — optional, for GitHub API listing (avoids rate limits)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CLASSROOM_BADGE_FILES } = require('../lib/classroomBadges.js');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const badgesRoot = path.join(root, 'app/data/Icons/Badges');
const write = process.argv.includes('--write');
const masteryRepo = path.resolve(
  process.env.SMITE2MASTERY_REPO || path.join(root, '..', 'Smite2Mastery')
);
const masteryBadgesDir = path.join(masteryRepo, 'img/Badges');
const ghApi =
  'https://api.github.com/repos/YungSonix/Smite2Mastery/contents/img/Badges?ref=main&per_page=100';

function normToken(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^60px-/i, '')
    .replace(/\.png$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Build lookup: normalized token → absolute local png path */
function buildLocalIndex() {
  const index = new Map();
  const stack = [badgesRoot];
  while (stack.length) {
    const dir = stack.pop();
    if (!fs.existsSync(dir)) continue;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (/\.png$/i.test(ent.name)) {
        index.set(normToken(ent.name), full);
        index.set(normToken(path.basename(ent.name, '.png')), full);
      }
    }
  }
  return index;
}

function resolveLocalSource(filename, index) {
  const direct = index.get(normToken(filename));
  if (direct) return direct;

  const mastery = filename.match(/^60px-(.+?)-MasteryBadge\.png$/i);
  if (mastery) {
    const god = mastery[1];
    for (const key of [
      normToken(`t_${god}_MasteryBadge_256`),
      normToken(`t_${god.replace(/-/g, '')}_MasteryBadge_256`),
    ]) {
      if (index.has(key)) return index.get(key);
    }
  }

  const cutesy = filename.match(/^60px-Cutesy-(.+)\.png$/i);
  if (cutesy) {
    const tail = cutesy[1];
    for (const key of [
      normToken(`t_Badge_Cutesy_${tail}`),
      normToken(`t_cutesy_256_${tail}`),
      normToken(`Cutesy_${tail}`),
    ]) {
      if (index.has(key)) return index.get(key);
    }
  }

  const badge = filename.match(/^60px-Badge-(.+)\.png$/i);
  if (badge) {
    const tail = badge[1].replace(/\(OB\d+\)/i, '');
    for (const [key, val] of index) {
      if (key.includes(normToken(tail))) return val;
    }
  }

  const t5 = filename.match(/^60px-T5Skin-(.+)\.png$/i);
  if (t5) {
    const tail = t5[1];
    for (const key of [
      normToken(`t_T5_${tail}`),
      normToken(`T5_${tail}`),
      normToken(tail),
    ]) {
      if (index.has(key)) return index.get(key);
    }
    for (const [key, val] of index) {
      if (key.includes(normToken(tail))) return val;
    }
  }

  const event = filename.match(/^60px-Event-(.+)\.png$/i);
  if (event) {
    for (const [key, val] of index) {
      if (key.includes(normToken(event[1]))) return val;
    }
  }

  for (const [key, val] of index) {
    if (key.includes(loose.slice(0, 12)) || loose.includes(key.slice(0, 12))) return val;
  }
  return null;
}

async function fetchRemoteNames() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'smite2app-badge-sync' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const names = new Set();
  let url = ghApi;
  for (let page = 0; page < 5 && url; page += 1) {
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.warn(`GitHub API ${resp.status} — using manifest only (set GITHUB_TOKEN if private).`);
      return null;
    }
    const chunk = await resp.json();
    if (!Array.isArray(chunk)) break;
    for (const f of chunk) {
      if (f?.name?.endsWith('.png')) names.add(f.name);
    }
    const link = resp.headers.get('link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return names;
}

async function main() {
  const index = buildLocalIndex();
  const manifest = new Set(CLASSROOM_BADGE_FILES);
  const remote = await fetchRemoteNames();

  const missingLocal = [];
  const missingRemote = [];
  const canCopy = [];

  for (const file of manifest) {
    const src = resolveLocalSource(file, index);
    if (!src) missingLocal.push(file);
    else if (remote && !remote.has(file)) missingRemote.push({ file, src });
    else if (!remote) canCopy.push({ file, src });
  }

  const remoteOnly = remote ? [...remote].filter((f) => !manifest.has(f)).sort() : [];

  console.log(`Manifest: ${manifest.size} badges`);
  console.log(`Local index: ${index.size} png paths under app/data/Icons/Badges`);
  if (remote) console.log(`GitHub img/Badges: ${remote.size} png files`);

  if (missingLocal.length) {
    console.log(`\n⚠ No local source (${missingLocal.length}):`);
    missingLocal.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
    if (missingLocal.length > 20) console.log(`  … +${missingLocal.length - 20} more`);
  }

  if (remote && missingRemote.length) {
    console.log(`\n→ Would upload to GitHub (${missingRemote.length}):`);
    missingRemote.slice(0, 15).forEach(({ file, src }) =>
      console.log(`  ${file} ← ${path.relative(root, src)}`)
    );
    if (missingRemote.length > 15) console.log(`  … +${missingRemote.length - 15} more`);
  }

  if (remoteOnly.length) {
    console.log(`\n🗑 On GitHub but not in manifest (${remoteOnly.length}) — delete if --write:`);
    remoteOnly.slice(0, 15).forEach((f) => console.log(`  - ${f}`));
    if (remoteOnly.length > 15) console.log(`  … +${remoteOnly.length - 15} more`);
  }

  if (!write) {
    console.log('\nDry run. Pass --write to copy into SMITE2MASTERY_REPO and remove orphan remote files.');
    console.log(`Target: ${masteryBadgesDir}`);
    return;
  }

  if (!fs.existsSync(masteryBadgesDir)) {
    console.error(`Missing ${masteryBadgesDir} — clone Smite2Mastery and set SMITE2MASTERY_REPO`);
    process.exit(1);
  }

  let copied = 0;
  const toUpload = remote ? missingRemote : canCopy;
  for (const { file, src } of toUpload) {
    fs.copyFileSync(src, path.join(masteryBadgesDir, file));
    copied += 1;
  }

  let deleted = 0;
  for (const file of remoteOnly) {
    const dest = path.join(masteryBadgesDir, file);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      deleted += 1;
    }
  }

  console.log(`\nCopied ${copied} badge(s), deleted ${deleted} orphan(s) in ${masteryBadgesDir}`);
  console.log('Next: cd Smite2Mastery && git add img/Badges && git commit && git push');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
