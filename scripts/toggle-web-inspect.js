const fs = require('fs');
const path = require('path');

const mode = String(process.argv[2] || '').toLowerCase();
if (mode !== 'on' && mode !== 'off') {
  console.error('Usage: node scripts/toggle-web-inspect.js <on|off>');
  process.exit(1);
}

const lockEnabled = mode === 'on' ? 'true' : 'false';
const envKey = 'EXPO_PUBLIC_WEB_INSPECT_LOCK';
const envPath = path.resolve(__dirname, '..', '.env.local');

let content = '';
if (fs.existsSync(envPath)) {
  content = fs.readFileSync(envPath, 'utf8');
}

const line = `${envKey}=${lockEnabled}`;
const keyRegex = new RegExp(`^\\s*${envKey}\\s*=.*$`, 'm');

if (keyRegex.test(content)) {
  content = content.replace(keyRegex, line);
} else {
  content = content.trimEnd();
  content = content ? `${content}\n${line}\n` : `${line}\n`;
}

fs.writeFileSync(envPath, content, 'utf8');

console.log(`[web-inspect] ${mode.toUpperCase()}`);
console.log(`[web-inspect] Wrote ${envKey}=${lockEnabled} to ${envPath}`);
console.log('[web-inspect] Restart Expo web server to apply changes.');
