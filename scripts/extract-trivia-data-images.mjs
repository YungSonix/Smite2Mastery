/**
 * One-shot: pull data:image blobs from a public quiz JSON dump into
 * app/data/Trivia/smite2-community/ and merge lib/server/triviaDataMediaMap.json
 *
 *   node scripts/extract-trivia-data-images.mjs scripts/_tmp-quiz.json
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST_DIR = path.join(ROOT, 'app/data/Trivia/smite2-community');
const MAP_PATH = path.join(ROOT, 'lib/server/triviaDataMediaMap.json');

function hashUrl(url) {
  return crypto.createHash('sha256').update(String(url)).digest('hex');
}

function extFor(dataUrl) {
  if (/data:image\/jpeg/i.test(dataUrl) || /data:image\/jpg/i.test(dataUrl)) return 'jpg';
  if (/data:image\/webp/i.test(dataUrl)) return 'webp';
  if (/data:image\/gif/i.test(dataUrl)) return 'gif';
  if (/data:image\/svg/i.test(dataUrl)) return 'svg';
  return 'png';
}

function collectUrls(q) {
  const out = [];
  const push = (u) => {
    const s = String(u || '').trim();
    if (s.startsWith('data:image')) out.push(s);
  };
  push(q.image_url);
  (q.meta?.image_urls || []).forEach(push);
  for (const v of q.meta?.variants || []) {
    push(v.image_url);
    (v.image_urls || []).forEach(push);
  }
  return out;
}

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error('Usage: node scripts/extract-trivia-data-images.mjs <quiz.json>');
  process.exit(1);
}

const quiz = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
const seen = new Map();
let n = 0;
for (const q of quiz.questions || []) {
  for (const url of collectUrls(q)) {
    const h = hashUrl(url);
    if (seen.has(h)) continue;
    const comma = url.indexOf(',');
    if (comma < 0) continue;
    const buf = Buffer.from(url.slice(comma + 1), 'base64');
    n += 1;
    const file = `image-inline-${String(n).padStart(2, '0')}.${extFor(url)}`;
    fs.writeFileSync(path.join(DEST_DIR, file), buf);
    seen.set(h, `/media/Trivia/smite2-community/${file}`);
  }
}

const prev = fs.existsSync(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')) : {};
const next = { ...prev, ...Object.fromEntries(seen) };
fs.writeFileSync(MAP_PATH, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Wrote ${seen.size} image files and ${Object.keys(next).length} map entries`);
