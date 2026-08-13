/**
 * Dual build for Vercel: Expo web → dist/, Formative Vite → dist/formative/
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const formativeSrc = path.join(root, 'formative-web');
const formativeDist = path.join(formativeSrc, 'dist');
const formativeOut = path.join(dist, 'formative');

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
}

run('npx expo export --platform web');

if (!fs.existsSync(dist)) {
  throw new Error('Expo export did not produce dist/');
}

run('npm install', formativeSrc);
run('npm run build', formativeSrc);

if (!fs.existsSync(formativeDist)) {
  throw new Error('Formative Vite build did not produce formative-web/dist/');
}

fs.rmSync(formativeOut, { recursive: true, force: true });
fs.cpSync(formativeDist, formativeOut, { recursive: true });

console.log('\nBuilt Expo → dist/ and Formative → dist/formative/');
