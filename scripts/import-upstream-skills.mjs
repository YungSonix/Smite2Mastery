#!/usr/bin/env node
/**
 * Fetch upstream agent skills into docs/cursor-agents/skills/ (no git clone).
 * Run: node scripts/import-upstream-skills.mjs
 * Dry-run: node scripts/import-upstream-skills.mjs --dry-run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILLS_ROOT = path.join(ROOT, 'docs', 'cursor-agents', 'skills');
const DRY = process.argv.includes('--dry-run');

const MARKETING_REPO = 'coreyhaines31/marketingskills';
const STOP_SLOP_REPO = 'atanu80/Stopslopskill';
const UIUX_REPO = 'yuanfu8899/uiuxskillProMax';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function writeFile(relPath, content) {
  const full = path.join(SKILLS_ROOT, relPath);
  if (DRY) {
    console.log(`[dry-run] would write ${relPath} (${content.length} chars)`);
    return;
  }
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log(`wrote ${relPath}`);
}

function adaptMarketingSkill(name, raw) {
  const header = `---
tags: [cursor-agent, marketing, smite2app]
vault-zone: cursor-agent
upstream: https://github.com/${MARKETING_REPO}/tree/main/skills/${name}
imported: ${new Date().toISOString().slice(0, 10)}
---

`;
  let body = raw;
  body = body.replace(/\.agents\/product-marketing\.md/g, 'docs/cursor-agents/product-marketing.md');
  body = body.replace(/`\/product-marketing`/g, '`docs/cursor-agents/product-marketing.md`');
  return header + body;
}

async function importMarketingSkills() {
  const dirs = await fetchJson(
    `https://api.github.com/repos/${MARKETING_REPO}/contents/skills`
  );
  const names = dirs.filter((d) => d.type === 'dir').map((d) => d.name);
  let ok = 0;
  let fail = 0;
  for (const name of names) {
    const url = `https://raw.githubusercontent.com/${MARKETING_REPO}/main/skills/${name}/SKILL.md`;
    try {
      const raw = await fetchText(url);
      writeFile(`marketing/${name}.md`, adaptMarketingSkill(name, raw));
      ok++;
    } catch (e) {
      console.warn(`skip marketing/${name}: ${e.message}`);
      fail++;
    }
  }
  console.log(`marketing: ${ok} ok, ${fail} failed`);
}

async function importStopSlop() {
  writeFile('stop-slop/SKILL.md', await fetchText(`https://raw.githubusercontent.com/${STOP_SLOP_REPO}/main/SKILL.md`));
  const refs = await fetchJson(`https://api.github.com/repos/${STOP_SLOP_REPO}/contents/references`);
  for (const f of refs) {
    if (f.type !== 'file') continue;
    const raw = await fetchText(f.download_url);
    writeFile(`stop-slop/${f.name}`, raw);
  }
  console.log(`stop-slop: SKILL + ${refs.length} references`);
}

function parseJsArrayExport(raw, varName) {
  const re = new RegExp(`const\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*\\]);`);
  const match = raw.match(re);
  if (!match) return null;
  return JSON.parse(match[1]);
}

async function importUiuxStyleIndex() {
  const raw = await fetchText(
    `https://raw.githubusercontent.com/${UIUX_REPO}/main/js/style-data.js`
  );
  const styles = parseJsArrayExport(raw, 'stylesData');
  if (!styles) {
    console.warn('uiux: could not parse style-data.js');
    return;
  }
  const lines = [
    '---',
    'tags: [cursor-agent, design, smite2app]',
    'vault-zone: cursor-agent',
    `upstream: https://github.com/${UIUX_REPO}`,
    `imported: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
    '# UI/UX Pro Max — style index (imported)',
    '',
    'Condensed from upstream `js/style-data.js`. Full previews: [GitHub Pages](https://yuanfu8899.github.io/uiuxskillProMax/uiuxpro_styles.html).',
    '',
    '**Smite 2 app:** default shell stays `docs/SMITE2_DESIGN.md` unless user requests a divergent surface.',
    '',
    '| Style | Category | Best for | Avoid when |',
    '|-------|----------|----------|------------|',
  ];
  for (const s of styles) {
    const name = (s.category || s.name || '').replace(/\|/g, '/');
    const cat = (s.type || '').replace(/\|/g, '/');
    const best = (s.usage?.bestFor || '').slice(0, 100).replace(/\|/g, '/').replace(/\n/g, ' ');
    const avoid = (s.usage?.avoid || '').slice(0, 100).replace(/\|/g, '/').replace(/\n/g, ' ');
    lines.push(`| ${name} | ${cat} | ${best} | ${avoid} |`);
  }
  writeFile('uiux-pro-max/styles-index.md', lines.join('\n') + '\n');

  try {
    const colorsRaw = await fetchText(
      `https://raw.githubusercontent.com/${UIUX_REPO}/main/js/colors-data.js`
    );
    const palettes = parseJsArrayExport(colorsRaw, 'colorsData');
    if (palettes) {
      const clines = [
        '---',
        'tags: [cursor-agent, design, smite2app]',
        'vault-zone: cursor-agent',
        `upstream: https://github.com/${UIUX_REPO}`,
        `imported: ${new Date().toISOString().slice(0, 10)}`,
        '---',
        '',
        '# UI/UX Pro Max — palette index (imported)',
        '',
        '| Product type | Primary | Secondary | CTA | Background | Text |',
        '|--------------|---------|-----------|-----|------------|------|',
      ];
      for (const p of palettes) {
        const pt = (p.title || p.productType || '').replace(/\|/g, '/');
        const c = p.colors || p;
        clines.push(
          `| ${pt} | ${c.primary || ''} | ${c.secondary || ''} | ${c.cta || ''} | ${c.background || ''} | ${c.text || ''} |`
        );
      }
      writeFile('uiux-pro-max/palettes-index.md', clines.join('\n') + '\n');
      console.log(`uiux: ${styles.length} styles, ${palettes.length} palettes`);
    }
  } catch (e) {
    console.warn(`uiux colors: ${e.message}`);
    console.log(`uiux: ${styles.length} styles (colors skipped)`);
  }
}

async function main() {
  console.log(DRY ? 'DRY RUN' : 'Importing upstream skills...');
  await importStopSlop();
  await importMarketingSkills();
  await importUiuxStyleIndex();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
