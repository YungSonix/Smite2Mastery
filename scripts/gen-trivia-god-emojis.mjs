#!/usr/bin/env node
/**
 * Generate Scroll Trivia god-emoji SVGs from the minigame clue engine
 * (emoji-clues.json + clue-assets.json) — 3 rotating sets per god.
 *
 * Output:
 *   {slug}-a|b|c-unnamed.svg  (easy tier — take/host quiz art)
 *   {slug}-a|b|c-named.svg
 *   {slug}-unnamed.svg / named.svg  (= set a, backward compatible)
 *   god-emoji-map.json (Trivia) — resolved Set A easy glyphs only (legacy / media catalog)
 *   Also writes Minigames/god-emoji-guess/god-emoji-map.json (same Set A snapshot for gamemode browse)
 *   and Minigames/god-emoji-guess/god-emoji-sets.json (full A/B/C easy+hard — real minigame shape)
 *   index.html gallery
 *
 * Source of truth: app/data/Minigames/god-emoji-guess/emoji-clues.json + clue-assets.json
 * Do not hand-edit either god-emoji-map.json as primary — edit emoji-clues.json, then regenerate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'app/data/Trivia/god-emojis');
const MINIGAME_OUT = path.join(ROOT, 'app/data/Minigames/god-emoji-guess');
const CLUES_PATH = path.join(MINIGAME_OUT, 'emoji-clues.json');
const ASSETS_PATH = path.join(MINIGAME_OUT, 'clue-assets.json');
const ICONS_DIR = path.join(MINIGAME_OUT, 'icons');
const TRIVIA_ICONS = path.join(OUT_DIR, 'icons');
const GODS_PATH = path.join(ROOT, 'app/data/Smite2Gods.json');

const SET_LETTERS = ['a', 'b', 'c'];

export function godEmojiSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function xml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const iconUriCache = new Map();

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function resolveIconFile(file) {
  const name = String(file || '');
  const candidates = [
    path.join(ICONS_DIR, name),
    path.join(TRIVIA_ICONS, name),
    path.join(TRIVIA_ICONS, path.basename(name)),
  ];
  // Prefer Flaticon spear PNG when generating spear token
  if (/spear/i.test(name)) {
    const flaticon = path.join(TRIVIA_ICONS, 'spear.png');
    if (fs.existsSync(flaticon)) return flaticon;
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function iconDataUri(file) {
  const key = String(file);
  if (iconUriCache.has(key)) return iconUriCache.get(key);
  const abs = resolveIconFile(file);
  if (!abs) throw new Error(`Missing icon file for ${file}`);
  let raw = fs.readFileSync(abs);
  // Embed SVG as utf8 data URI when possible (smaller / sharper)
  let uri;
  if (path.extname(abs).toLowerCase() === '.svg') {
    const text = raw.toString('utf8').replace(/\s+/g, ' ').trim();
    uri = `data:image/svg+xml;utf8,${encodeURIComponent(text)}`;
  } else {
    uri = `data:${mimeFor(abs)};base64,${raw.toString('base64')}`;
  }
  iconUriCache.set(key, uri);
  return uri;
}

function resolveToken(token, assets) {
  const a = assets[token];
  if (!a) throw new Error(`Undefined clue token: ${token}`);
  if (a.kind === 'icon' && a.file) {
    return { kind: 'icon', href: iconDataUri(a.file), fallback: a.glyph || '' };
  }
  return { kind: 'emoji', value: a.glyph || '❓' };
}

function svgCard({ tokens, assets, name, named }) {
  const resolved = tokens.map((t) => resolveToken(t, assets));
  const w = 640;
  const h = named ? 300 : 220;
  const rowY = named ? 118 : 110;
  const fontEmo = named ? 72 : 84;
  const iconSize = named ? 78 : 88;
  const slotW = 150;
  const startX = 320 - slotW;
  const letterSpacing = name && name.length > 12 ? '0.14em' : '0.22em';
  const nameBlock = named
    ? `<text x="320" y="248" text-anchor="middle" fill="#e2e8f0" font-size="28" font-family="Segoe UI, system-ui, sans-serif" letter-spacing="${letterSpacing}" font-weight="700">${xml(name)}</text>`
    : '';

  const slots = resolved.map((item, i) => {
    const cx = startX + i * slotW;
    if (item.kind === 'icon') {
      const x = cx - iconSize / 2;
      const y = rowY - iconSize / 2;
      return `<image href="${item.href}" x="${x}" y="${y}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return `<text x="${cx}" y="${rowY + fontEmo * 0.35}" text-anchor="middle" font-size="${fontEmo}" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${xml(item.value)}</text>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${named ? xml(name) : 'God emojis'}">
  <rect width="${w}" height="${h}" rx="16" fill="#0b1220"/>
  <rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="12" fill="none" stroke="rgba(125,211,252,0.42)" stroke-width="2"/>
  ${slots.join('\n  ')}
  ${nameBlock}
</svg>
`;
}

function displayCell(token, assets) {
  const a = assets[token];
  if (!a) return `<span class="miss">${xml(token)}</span>`;
  if (a.kind === 'icon' && a.file) {
    const abs = resolveIconFile(a.file);
    if (abs && abs.startsWith(ICONS_DIR)) {
      return `<img src="${xml(path.relative(OUT_DIR, abs).replace(/\\/g, '/'))}" width="28" height="28" alt="${xml(token)}"/>`;
    }
    if (a.glyph) return `<span>${xml(a.glyph)}</span>`;
    return `<span class="miss">${xml(token)}</span>`;
  }
  return `<span>${xml(a.glyph || token)}</span>`;
}

function galleryHtml(rows, assets) {
  const cards = rows
    .map((r) => {
      const sets = r.sets
        .map((s, i) => {
          const cells = s.easy.map((t) => displayCell(t, assets)).join(' ');
          return `<div class="set"><b>${SET_LETTERS[i].toUpperCase()}</b> ${cells}</div>`;
        })
        .join('');
      return `<a class="card" href="${xml(r.files.a.unnamed)}" title="${xml(r.name)}">
  <div class="name">${xml(r.name)}</div>
  ${sets}
</a>`;
    })
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Scroll Trivia — god emoji sets</title>
  <style>
    body { margin: 0; background: #070b14; color: #e2e8f0; font-family: Segoe UI, system-ui, sans-serif; }
    h1 { font-size: 1.15rem; letter-spacing: 0.12em; font-weight: 700; padding: 20px 20px 8px; }
    p { color: #94a3b8; padding: 0 20px 16px; max-width: 52rem; line-height: 1.45; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; padding: 0 16px 32px; }
    .card { display: block; text-decoration: none; color: inherit; background: #0b1220; border: 1px solid rgba(125,211,252,0.35); border-radius: 10px; padding: 12px; }
    .name { font-size: 0.92rem; letter-spacing: 0.12em; font-weight: 700; margin-bottom: 8px; }
    .set { font-size: 1.35rem; margin-top: 6px; display: flex; gap: 8px; align-items: center; }
    .set b { font-size: 0.7rem; color: #7dd3fc; width: 1.2rem; }
    .set img { width: 28px; height: 28px; object-fit: contain; }
    code { color: #7dd3fc; }
  </style>
</head>
<body>
  <h1>GOD EMOJI SETS (A / B / C)</h1>
  <p>Source: <code>Minigames/god-emoji-guess/emoji-clues.json</code>. Trivia URLs: <code>/media/Trivia/god-emojis/{slug}-{a|b|c}-unnamed.svg</code>. Spear prefers Flaticon PNG in <code>Trivia/god-emojis/icons/spear.png</code> when present.</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`;
}

const smiteGods = JSON.parse(fs.readFileSync(GODS_PATH, 'utf8'));
const smiteNames = new Set(smiteGods.map((g) => String(g.godName || '').trim()).filter(Boolean));
const clues = JSON.parse(fs.readFileSync(CLUES_PATH, 'utf8'));
const assets = JSON.parse(fs.readFileSync(ASSETS_PATH, 'utf8'));

fs.mkdirSync(OUT_DIR, { recursive: true });

const legacyMap = {};
const minigameSetsMap = {};
const rows = [];
const manifestGods = [];

function resolveTokens(tokens, assetTable) {
  return tokens.map((t) => {
    const a = assetTable[t];
    if (a?.kind === 'icon' && /spear/i.test(a.file || '')) return 'icons/spear.png';
    if (a?.kind === 'icon') return `icons/${a.file}`;
    return a?.glyph || t;
  });
}

for (const name of [...smiteNames].sort((a, b) => a.localeCompare(b))) {
  const row = clues[name];
  if (!row?.sets?.length) {
    console.warn(`No emoji-clues sets for Smite 2 god: ${name}`);
    continue;
  }
  const sets = row.sets.slice(0, 3);
  while (sets.length < 3) sets.push(sets[sets.length - 1]);

  const slug = godEmojiSlug(name);
  const files = {};
  const setSnapshots = {};

  sets.forEach((set, i) => {
    const letter = SET_LETTERS[i];
    const tokens = set.easy;
    const hardTokens = Array.isArray(set.hard) ? set.hard : [];
    if (!Array.isArray(tokens) || tokens.length !== 3) {
      throw new Error(`${name} set ${letter}: easy needs 3 tokens`);
    }
    const namedFile = `${slug}-${letter}-named.svg`;
    const unnamedFile = `${slug}-${letter}-unnamed.svg`;
    fs.writeFileSync(
      path.join(OUT_DIR, namedFile),
      svgCard({ tokens, assets, name, named: true })
    );
    fs.writeFileSync(
      path.join(OUT_DIR, unnamedFile),
      svgCard({ tokens, assets, name, named: false })
    );
    files[letter] = {
      named: namedFile,
      unnamed: unnamedFile,
      tokens,
      hard: hardTokens,
    };
    setSnapshots[letter] = {
      easy: resolveTokens(tokens, assets),
      hard: resolveTokens(hardTokens, assets),
      easyTokens: tokens,
      hardTokens,
    };

    if (i === 0) {
      // Legacy single path = set A
      fs.writeFileSync(
        path.join(OUT_DIR, `${slug}-named.svg`),
        svgCard({ tokens, assets, name, named: true })
      );
      fs.writeFileSync(
        path.join(OUT_DIR, `${slug}-unnamed.svg`),
        svgCard({ tokens, assets, name, named: false })
      );
      legacyMap[name] = resolveTokens(tokens, assets);
    }
  });

  minigameSetsMap[name] = { a: setSnapshots.a };

  rows.push({ name, slug, sets, files });
  manifestGods.push({
    name,
    slug,
    sets: SET_LETTERS.map((letter) => ({
      id: letter,
      easy: files[letter].tokens,
      hard: files[letter].hard,
      unnamed: `/media/Trivia/god-emojis/${files[letter].unnamed}`,
      named: `/media/Trivia/god-emojis/${files[letter].named}`,
    })),
    unnamed: `/media/Trivia/god-emojis/${slug}-unnamed.svg`,
    named: `/media/Trivia/god-emojis/${slug}-named.svg`,
  });
}

fs.writeFileSync(path.join(OUT_DIR, 'god-emoji-map.json'), `${JSON.stringify(legacyMap, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), galleryHtml(rows, assets));
fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  `${JSON.stringify(
    {
      count: manifestGods.length,
      source: 'app/data/Minigames/god-emoji-guess/emoji-clues.json',
      unnamedPattern: '/media/Trivia/god-emojis/{slug}-{a|b|c}-unnamed.svg',
      galleryImage: 'app/data/Trivia/god-emojis/gallery-all-gods.png',
      gods: manifestGods,
    },
    null,
    2
  )}\n`
);

// Gamemode companion maps (separate from Trivia so the two surfaces stay obvious)
fs.writeFileSync(
  path.join(MINIGAME_OUT, 'god-emoji-map.json'),
  `${JSON.stringify(
    {
      _readme:
        'Guess-the-Emoji Set A easy snapshot (flat). Full A/B/C: god-emoji-sets.json. Author: emoji-clues.json. Trivia twin: app/data/Trivia/god-emojis/god-emoji-map.json',
      gods: legacyMap,
    },
    null,
    2
  )}\n`
);
fs.writeFileSync(
  path.join(MINIGAME_OUT, 'god-emoji-sets.json'),
  `${JSON.stringify(
    {
      _readme:
        'Guess-the-Emoji Set A easy+hard only (B/C unused in gamemode for now). Author: emoji-clues.json.',
      gods: minigameSetsMap,
    },
    null,
    2
  )}\n`
);

console.log(
  `Wrote ${manifestGods.length} gods × 3 sets + Trivia map + Minigame map/sets`
);
