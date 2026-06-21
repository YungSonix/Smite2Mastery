/**
 * Stream-scan a binary file for UTF-8 path-like strings (Unreal IoStore / pak catalogs).
 * Usage: node scripts/scan-hemingway-strings.mjs <file> <needle1> [needle2...]
 */
import fs from 'fs';

const file = process.argv[2];
const needles = process.argv.slice(3).map((s) => s.toLowerCase());
if (!file || !needles.length) {
  console.error('Usage: node scan-hemingway-strings.mjs <file> <needle>...');
  process.exit(1);
}

const CHUNK = 4 * 1024 * 1024;
const MIN_STR = 8;
const fd = fs.openSync(file, 'r');
const { size } = fs.fstatSync(fd);
let overlap = '';
let offset = 0;
const hits = new Set();

function extractStrings(buf) {
  const text = overlap + buf.toString('latin1');
  overlap = text.slice(-256);
  const re = /[\x20-\x7E]{8,200}/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[0];
    const low = s.toLowerCase();
    if (needles.some((n) => low.includes(n))) hits.add(s);
  }
}

while (offset < size) {
  const len = Math.min(CHUNK, size - offset);
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, offset);
  extractStrings(buf);
  offset += len;
  if (hits.size >= 500) break;
}
fs.closeSync(fd);

[...hits].sort().forEach((h) => console.log(h));
console.error(`\n--- ${hits.size} unique hits in ${file} (${Math.round(size / 1e6)} MB) ---`);
