#!/usr/bin/env node
/** Extract PROFILE_BADGE_FILES from profile.jsx → lib/classroomBadges.generated.json */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilePath = path.join(root, 'app/_screens/profile.jsx');
const outPath = path.join(root, 'lib/classroomBadges.generated.json');

const src = fs.readFileSync(profilePath, 'utf8');
const m = src.match(/const PROFILE_BADGE_FILES = \[([\s\S]*?)\];/);
if (!m) {
  console.error('Could not find PROFILE_BADGE_FILES in profile.jsx');
  process.exit(1);
}
const files = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
fs.writeFileSync(outPath, `${JSON.stringify(files, null, 2)}\n`);
console.log(`Wrote ${files.length} badges → lib/classroomBadges.generated.json`);
