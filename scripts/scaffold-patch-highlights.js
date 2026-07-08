/**
 * Create patchhighlights-obN.json from template and register it for Metro.
 *
 * Usage:
 *   node scripts/scaffold-patch-highlights.js 38
 */

const fs = require('fs');
const path = require('path');

const patchNumber = Number(process.argv[2]);
if (!Number.isInteger(patchNumber) || patchNumber < 1) {
  console.error('Usage: node scripts/scaffold-patch-highlights.js <patchNumber>');
  process.exit(1);
}

const root = path.join(__dirname, '..');
const templatePath = path.join(root, 'app', 'data', 'Templates', 'patch-highlights-template.json');
const outDir = path.join(root, 'app', 'data', 'Patch Notes', 'highlights');
const outFile = path.join(outDir, `patchhighlights-ob${patchNumber}.json`);
const registryPath = path.join(root, 'lib', 'patchHighlightsRegistry.js');

if (fs.existsSync(outFile)) {
  console.error(`Already exists: ${outFile}`);
  process.exit(1);
}

const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
template.patchNumber = patchNumber;
template.patchLabel = `OB${patchNumber}`;
template.summaryLine = '';

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(template, null, 2), 'utf8');
console.log(`Created ${outFile}`);

let registry = fs.readFileSync(registryPath, 'utf8');
const requireLine = `  ${patchNumber}: require('../app/data/Patch Notes/highlights/patchhighlights-ob${patchNumber}.json'),`;
if (registry.includes(requireLine)) {
  console.log('Registry already has this patch.');
} else {
  registry = registry.replace(
    /module\.exports = \{\n/,
    `module.exports = {\n${requireLine}\n`
  );
  fs.writeFileSync(registryPath, registry, 'utf8');
  console.log(`Updated ${registryPath}`);
}

console.log('\nEdit the new file with what is new / buffed / nerfed for Simple Summary.');
