/**
 * Opens scripts/skin-preview-frame.html in the default browser (563×840 loadout crop tester).
 */
const path = require('path');
const { spawn } = require('child_process');

const htmlPath = path.join(__dirname, 'skin-preview-frame.html');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const platform = process.platform;
if (platform === 'win32') {
  spawn('cmd', ['/c', 'start', '', fileUrl], { detached: true, stdio: 'ignore' }).unref();
} else if (platform === 'darwin') {
  spawn('open', [fileUrl], { detached: true, stdio: 'ignore' }).unref();
} else {
  spawn('xdg-open', [fileUrl], { detached: true, stdio: 'ignore' }).unref();
}

console.log('[preview:skin-frame] Opened:', htmlPath);
console.log('[preview:skin-frame] Default: Achilles Soul Piercer card in 563×840 cover frame');
