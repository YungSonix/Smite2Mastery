#!/usr/bin/env node
/** Open Council Live canvas in Cursor (Windows-friendly). */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CANVAS = path.resolve(
  process.env.USERPROFILE || process.env.HOME || '',
  '.cursor/projects/c-Users-Carri-Documents-WorkOutApp/canvases/council-live.canvas.tsx'
);

console.log('Council Live canvas:\n', CANVAS);
console.log('\nIf this does not open automatically:');
console.log('  1. File → Open File → paste path above');
console.log('  2. Or open WorkOutApp.code-workspace → Ctrl+P → council-live\n');

const cmd = process.platform === 'win32' ? 'cursor.cmd' : 'cursor';
const child = spawn(cmd, [CANVAS], { stdio: 'inherit', shell: true });
child.on('error', () => {
  console.error('cursor CLI not found. Use File → Open File with the path above.');
  process.exit(1);
});
