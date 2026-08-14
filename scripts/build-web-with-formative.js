/**
 * Dual build for Vercel: Expo web → dist/, Scroll Trivia Vite → dist/trivia/
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const triviaSrc = path.join(root, 'formative-web');
const triviaDist = path.join(triviaSrc, 'dist');
const triviaOut = path.join(dist, 'trivia');

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

run('npx expo export --platform web');

if (!fs.existsSync(dist)) {
  throw new Error('Expo export did not produce dist/');
}

run('npm install', triviaSrc);
run('npm run build', triviaSrc);

if (!fs.existsSync(triviaDist)) {
  throw new Error('Trivia Vite build did not produce formative-web/dist/');
}

fs.rmSync(triviaOut, { recursive: true, force: true });
fs.cpSync(triviaDist, triviaOut, { recursive: true });

console.log('\nBuilt Expo → dist/ and Scroll Trivia → dist/trivia/');
