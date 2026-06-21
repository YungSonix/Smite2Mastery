#!/usr/bin/env node
/**
 * Cursor project slug + council canvas paths — works for any repo root.
 */
import fs from 'node:fs';
import path from 'node:path';

export function cursorProjectSlug(repoRoot) {
  const abs = path.resolve(repoRoot);
  return 'c-' + abs.replace(/\\/g, '-').replace(/:/g, '');
}

export function readCouncilPaths(repoRoot) {
  const local = path.join(repoRoot, 'docs', 'council', 'council.paths.json');
  if (fs.existsSync(local)) {
    try {
      return JSON.parse(fs.readFileSync(local, 'utf8'));
    } catch {
      /* fall through */
    }
  }
  return { cursorProjectSlug: cursorProjectSlug(repoRoot) };
}

export function canvasDataPath(repoRoot) {
  if (process.env.COUNCIL_CANVAS_DATA) return process.env.COUNCIL_CANVAS_DATA;
  const { cursorProjectSlug: slug } = readCouncilPaths(repoRoot);
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(home, '.cursor', 'projects', slug, 'canvases', 'council-live.canvas.data.json');
}

export function writeCouncilPaths(repoRoot) {
  const p = path.join(repoRoot, 'docs', 'council', 'council.paths.json');
  const data = {
    cursorProjectSlug: cursorProjectSlug(repoRoot),
    repoRoot: path.resolve(repoRoot),
    note: 'Auto-generated — Cursor encodes your folder path for .cursor/projects/',
  };
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return data;
}
