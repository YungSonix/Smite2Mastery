/**
 * Import SMITE 2 patch notes into structured JSON.
 *
 * Dev-only fetcher — preserves section hierarchy (h2/h3) and nested bullet lists.
 *
 * Usage:
 *   node scripts/import-patch-notes.js
 *   node scripts/import-patch-notes.js --only ob1,ob27
 *   node scripts/import-patch-notes.js --dry-run
 *
 * Output:
 *   app/data/Patch Notes/patchnotes-index.json
 *   app/data/Patch Notes/patchnotesob1.json … patchnotesob38.json
 *   app/data/Patch Notes/patchnotesca1.json … patchnotesca8.json
 *   app/data/Patch Notes/patchnotesaw1.json … patchnotesaw4.json
 */

const fs = require('fs');
const path = require('path');

// Remote source for dev import only — not written into app JSON.
const PATCH_SOURCE_BASE = process.env.PATCH_NOTES_SOURCE_BASE || 'https://wiki.smite2.com';
const API_URL = `${PATCH_SOURCE_BASE}/api.php`;
const OUT_DIR = path.join(__dirname, '..', 'app', 'data', 'Patch Notes');
const DELAY_MS = 350;

const PATCH_MANIFEST = [
  {
    id: 'open_beta',
    label: 'Open Beta patch notes',
    folder: 'open-beta',
    prefix: 'ob',
    patches: [
      [38, 'SMITE_2_Open_Beta_38', 'June 30th, 2026'],
      [37, 'SMITE_2_Open_Beta_37', 'June 16th, 2026'],
      [36, 'SMITE_2_Open_Beta_36', 'June 2nd, 2026'],
      [35, 'SMITE_2_Open_Beta_35', 'May 19th, 2026'],
      [34, 'SMITE_2_Open_Beta_34', 'May 6th, 2026'],
      [33, 'SMITE_2_Open_Beta_33', 'April 21st, 2026'],
      [32, 'SMITE_2_Open_Beta_32', 'April 7th, 2026'],
      [31, 'SMITE_2_Open_Beta_31', 'March 24, 2026'],
      [30, 'SMITE_2_Open_Beta_30', 'March 10, 2026'],
      [29, 'SMITE_2_Open_Beta_29', 'February 24, 2026'],
      [28, 'SMITE_2_Open_Beta_28', 'February 10, 2026'],
      [27, 'SMITE_2_Open_Beta_27', 'January 27, 2026'],
      [26, 'SMITE_2_Open_Beta_26', 'January 13, 2026'],
      [25, 'SMITE_2_Open_Beta_25', 'December 16, 2025'],
      [24, 'SMITE_2_Open_Beta_24', 'December 2, 2025'],
      [23, 'SMITE_2_Open_Beta_23', 'November 18, 2025'],
      [22, 'SMITE_2_Open_Beta_22', 'November 4, 2025'],
      [21, 'SMITE_2_Open_Beta_21', 'October 21, 2025'],
      [20, 'SMITE_2_Open_Beta_20', 'October 7, 2025'],
      [19, 'SMITE_2_Open_Beta_19', 'September 23, 2025'],
      [18, 'SMITE_2_Open_Beta_18', 'September 9, 2025'],
      [17, 'SMITE_2_Open_Beta_17', 'August 26, 2025'],
      [16, 'SMITE_2_Open_Beta_16', 'August 12, 2025'],
      [15, 'SMITE_2_Open_Beta_15', 'July 29, 2025'],
      [14, 'SMITE_2_Open_Beta_14', 'July 15, 2025'],
      [13, 'SMITE_2_Open_Beta_13', 'July 1, 2025'],
      [12, 'SMITE_2_Open_Beta_12', 'June 16, 2025'],
      [11, 'SMITE_2_Open_Beta_11', 'June 2, 2025'],
      [10, 'SMITE_2_Open_Beta_10', 'May 19, 2025'],
      [9, 'SMITE_2_Open_Beta_9', 'May 5, 2025'],
      [8, 'SMITE_2_Open_Beta_8', 'April 21, 2025'],
      [7, 'SMITE_2_Open_Beta_7', 'April 7, 2025'],
      [6, 'SMITE_2_Open_Beta_6', 'March 24, 2025'],
      [5, 'SMITE_2_Open_Beta_5', 'March 10, 2025'],
      [4, 'SMITE_2_Open_Beta_4', 'February 24, 2025'],
      [3, 'SMITE_2_Open_Beta_3', 'February 10, 2025'],
      [2, 'SMITE_2_Open_Beta_2', 'January 24, 2025'],
      [1, 'SMITE_2_Open_Beta_1', 'January 7, 2025'],
    ],
  },
  {
    id: 'closed_alpha',
    label: 'Closed Alpha patch notes',
    folder: 'closed-alpha',
    prefix: 'ca',
    patches: [
      [8, 'SMITE_2_Closed_Alpha_8', 'December 10, 2024'],
      [7, 'SMITE_2_Closed_Alpha_7', 'November 25, 2024'],
      [6, 'SMITE_2_Closed_Alpha_6', 'November 12, 2024'],
      [5, 'SMITE_2_Closed_Alpha_5', 'October 29, 2024'],
      [4, 'SMITE_2_Closed_Alpha_4', 'October 17, 2024'],
      [3, 'SMITE_2_Closed_Alpha_3', 'October 3, 2024'],
      [2, 'SMITE_2_Closed_Alpha_2', 'September 17, 2024'],
      [1, 'SMITE_2_Closed_Alpha_1', 'August 27, 2024'],
    ],
  },
  {
    id: 'alpha_weekend',
    label: 'Alpha Weekend Test patch notes',
    folder: 'alpha-weekend',
    prefix: 'aw',
    patches: [
      [4, 'SMITE_2_Alpha_Weekend_4', 'July 18, 2024'],
      [3, 'SMITE_2_Alpha_Weekend_3', 'June 27, 2024'],
      [2, 'SMITE_2_Alpha_Weekend_2', 'May 30, 2024'],
      [1, 'SMITE_2_Alpha_Weekend_1', 'May 2, 2024'],
    ],
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\u00a0/g, ' ');
}

function stripTags(html) {
  return decodeHtml(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function cleanSourceHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<div class="mw-editsection[\s\S]*?<\/div>/gi, '')
    .replace(/<div style="float:\s*right[\s\S]*?<\/div>/gi, '')
    .replace(/<div class="errorbox">[\s\S]*?<\/div>/gi, '');
}

function findTagEnd(html, start, tagName) {
  const openRe = new RegExp(`<${tagName}(\\s|>)`, 'gi');
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let pos = start;
  openRe.lastIndex = start;
  const first = openRe.exec(html);
  if (!first) return -1;
  pos = first.index;
  depth = 1;
  pos = html.indexOf('>', pos) + 1;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.toLowerCase().indexOf(`<${tagName}`, pos);
    const nextClose = html.toLowerCase().indexOf(closeTag.toLowerCase(), pos);
    if (nextClose === -1) return html.length;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = html.indexOf('>', nextOpen) + 1;
    } else {
      depth -= 1;
      pos = nextClose + closeTag.length;
    }
  }
  return pos;
}

function parseList(html, start) {
  const end = findTagEnd(html, start, 'ul');
  if (end === -1) return { items: [], end: start };
  const inner = html.slice(html.indexOf('>', start) + 1, end - 5);
  const items = [];
  let pos = 0;
  while (pos < inner.length) {
    const liStart = inner.toLowerCase().indexOf('<li', pos);
    if (liStart === -1) break;
    const liOpenEnd = inner.indexOf('>', liStart);
    const liEnd = findTagEnd(inner, liStart, 'li');
    if (liEnd === -1) break;
    const liInner = inner.slice(liOpenEnd + 1, liEnd - 5);
    items.push(parseListItem(liInner));
    pos = liEnd;
  }
  return { items, end };
}

function parseListItem(innerHtml) {
  const item = {};
  let rest = innerHtml.trim();

  const boldMatch = rest.match(/^<b>([\s\S]*?)<\/b>/i);
  if (boldMatch) {
    item.text = stripTags(boldMatch[1]);
    item.bold = true;
    rest = rest.slice(boldMatch[0].length).trim();
  }

  const childUlIdx = rest.toLowerCase().indexOf('<ul');
  if (childUlIdx !== -1) {
    const before = rest.slice(0, childUlIdx).trim();
    if (!item.text && before) {
      item.text = stripTags(before);
    } else if (before) {
      item.lead = stripTags(before);
    }
    const { items, end } = parseList(rest, childUlIdx);
    if (items.length) item.items = items;
    const after = rest.slice(end).trim();
    if (after) {
      const tail = stripTags(after);
      if (tail) item.tail = tail;
    }
  } else {
    const plain = stripTags(rest);
    if (!item.text) item.text = plain;
    else if (plain && plain !== item.text) item.detail = plain;
  }

  if (!item.text && item.detail) {
    item.text = item.detail;
    delete item.detail;
  }

  return item;
}

function parseParagraph(html, start) {
  const end = findTagEnd(html, start, 'p');
  if (end === -1) return null;
  const text = stripTags(html.slice(html.indexOf('>', start) + 1, end - 4));
  return { block: text ? { type: 'paragraph', text } : null, end };
}

function parseTable(html, start) {
  const end = findTagEnd(html, start, 'table');
  if (end === -1) return null;
  const tableHtml = html.slice(start, end);
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(tableHtml))) {
    const cells = [];
    const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      cells.push(stripTags(cellMatch[1]));
    }
    if (cells.length) rows.push(cells);
  }
  return { block: rows.length ? { type: 'table', rows } : null, end };
}

function parseContentBlocks(html) {
  const blocks = [];
  let pos = 0;
  const cleaned = cleanSourceHtml(html);

  while (pos < cleaned.length) {
    const lower = cleaned.toLowerCase();
    const nextUl = lower.indexOf('<ul', pos);
    const nextP = lower.indexOf('<p', pos);
    const nextTable = lower.indexOf('<table', pos);
    const nextHeading = lower.indexOf('<div class="mw-heading', pos);

    const candidates = [
      nextUl === -1 ? Infinity : nextUl,
      nextP === -1 ? Infinity : nextP,
      nextTable === -1 ? Infinity : nextTable,
      nextHeading === -1 ? Infinity : nextHeading,
    ];
    const min = Math.min(...candidates);
    if (min === Infinity) break;

    if (min === nextUl) {
      const { items, end } = parseList(cleaned, nextUl);
      if (items.length) blocks.push({ type: 'list', items });
      pos = end;
    } else if (min === nextP) {
      const result = parseParagraph(cleaned, nextP);
      if (result?.block) blocks.push(result.block);
      pos = result?.end ?? nextP + 2;
    } else if (min === nextTable) {
      const result = parseTable(cleaned, nextTable);
      if (result?.block) blocks.push(result.block);
      pos = result?.end ?? nextTable + 6;
    } else {
      break;
    }
  }

  return blocks;
}

function parseInfobox(html) {
  const infoboxMatch = html.match(/<table class="infobox">([\s\S]*?)<\/table>/i);
  const meta = {
    infoboxTitle: null,
    releaseDate: null,
    bonusUpdate: null,
    hotfixes: null,
    clientVersion: null,
    navigation: { prev: null, next: null },
  };
  if (!infoboxMatch) return meta;

  const table = infoboxMatch[1];
  const titleMatch = table.match(/<th[^>]*class="title"[^>]*>([\s\S]*?)<\/th>/i);
  if (titleMatch) meta.infoboxTitle = stripTags(titleMatch[1]);

  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(table))) {
    const th = row[1].match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const td = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!th || !td) continue;
    const key = stripTags(th[1]).replace(/:$/, '').toLowerCase();
    const val = stripTags(td[1]);
    if (!val) continue;
    if (key === 'release date') meta.releaseDate = val;
    else if (key === 'bonus update') meta.bonusUpdate = val;
    else if (key === 'hotfixes') meta.hotfixes = val;
    else if (key === 'client version') meta.clientVersion = val;
  }

  const prevMatch = table.match(/href="\/w\/([^"]+)"[^>]*>←/i);
  const nextMatch = table.match(/href="\/w\/([^"]+)"[^>]*>[^<]*→/i);
  if (prevMatch) meta.navigation.prev = prevMatch[1];
  if (nextMatch) meta.navigation.next = nextMatch[1];

  return meta;
}

function splitHeadings(html, level) {
  const re = new RegExp(
    `<div class="mw-heading mw-heading${level}"><h${level}[^>]*id="([^"]*)"[^>]*>([\\s\\S]*?)</h${level}>`,
    'gi'
  );
  const parts = [];
  const markers = [];
  let match;
  while ((match = re.exec(html))) {
    markers.push({
      anchor: match[1],
      title: stripTags(match[2]),
      start: match.index,
      headingEnd: re.lastIndex,
    });
  }

  if (!markers.length) {
    return [{ title: null, anchor: null, html }];
  }

  const preamble = html.slice(0, markers[0].start);
  if (preamble.trim()) {
    parts.push({ title: null, anchor: null, html: preamble });
  }

  for (let i = 0; i < markers.length; i += 1) {
    const end = i + 1 < markers.length ? markers[i + 1].start : html.length;
    parts.push({
      title: markers[i].title,
      anchor: markers[i].anchor,
      level,
      html: html.slice(markers[i].headingEnd, end),
    });
  }

  return parts;
}

function buildSection(sectionPart) {
  const section = {
    title: sectionPart.title,
    anchor: sectionPart.anchor,
    level: sectionPart.level || 2,
    content: parseContentBlocks(sectionPart.html),
    subsections: [],
  };

  const h3Parts = splitHeadings(sectionPart.html, 3).filter((p) => p.title);
  if (h3Parts.length) {
    section.subsections = h3Parts.map((sub) => ({
      title: sub.title,
      anchor: sub.anchor,
      level: 3,
      content: parseContentBlocks(sub.html),
    }));
    const beforeFirstH3 = sectionPart.html.slice(0, sectionPart.html.toLowerCase().indexOf('<div class="mw-heading mw-heading3'));
    const preambleBlocks = parseContentBlocks(beforeFirstH3);
    if (preambleBlocks.length) section.content = preambleBlocks;
    else delete section.content;
  }

  if (section.content && !section.content.length) delete section.content;
  return section;
}

function parsePatchPage(html, pageTitle) {
  const infobox = parseInfobox(html);
  const bodyMatch = html.match(/<div class="mw-content-ltr mw-parser-output"[^>]*>([\s\S]*)<\/div>\s*$/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const h2Parts = splitHeadings(body, 2).filter((p) => p.title);

  const sections = h2Parts.map((part) => buildSection(part));

  return {
    meta: {
      slug: pageTitle,
      title: pageTitle.replace(/_/g, ' '),
      ...infobox,
    },
    sections,
  };
}

async function fetchPatchHtml(pageTitle) {
  const url = `${API_URL}?${new URLSearchParams({
    action: 'parse',
    page: pageTitle,
    format: 'json',
    prop: 'text',
  })}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'smite2app-patch-importer/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pageTitle}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.info || JSON.stringify(data.error));
  return data.parse.text['*'];
}

function padNum(n) {
  return String(n).padStart(2, '0');
}

function patchFileName(categoryId, number) {
  if (categoryId === 'open_beta') return `patchnotesob${number}.json`;
  if (categoryId === 'closed_alpha') return `patchnotesca${number}.json`;
  return `patchnotesaw${number}.json`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const onlyIdx = args.findIndex((a) => a === '--only');
  const only = onlyIdx >= 0 ? args[onlyIdx + 1]?.split(',').map((s) => s.trim().toLowerCase()) : null;
  return { dryRun, only };
}

async function main() {
  const { dryRun, only } = parseArgs();
  const fetchedAt = new Date().toISOString();
  const index = {
    fetchedAt,
    categories: [],
  };

  let total = 0;
  let ok = 0;
  let failed = 0;

  for (const category of PATCH_MANIFEST) {
    const catEntry = {
      id: category.id,
      label: category.label,
      patches: [],
    };

    for (const [number, slug, releaseDate] of category.patches) {
      const fileKey = `${category.prefix}${padNum(number)}`;
      const onlyKeys = only
        ? only.flatMap((key) => {
            const m = key.match(/^([a-z]+)(\d+)$/i);
            if (!m) return [key];
            return [key, `${m[1]}${padNum(Number(m[2]))}`];
          })
        : null;
      if (onlyKeys && !onlyKeys.includes(fileKey) && !onlyKeys.includes(String(number))) continue;

      total += 1;
      const relFile = patchFileName(category.id, number);
      const outPath = path.join(OUT_DIR, relFile);
      process.stdout.write(`Fetching ${slug} … `);

      try {
        const html = await fetchPatchHtml(slug);
        const parsed = parsePatchPage(html, slug);
        parsed.meta.category = category.id;
        parsed.meta.categoryLabel = category.label;
        parsed.meta.number = number;
        parsed.meta.releaseDate = parsed.meta.releaseDate || releaseDate;
        parsed.meta.fetchedAt = fetchedAt;

        if (!dryRun) {
          fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
        }

        catEntry.patches.push({
          number,
          title: parsed.meta.title,
          releaseDate: parsed.meta.releaseDate,
          slug,
          file: relFile,
          sectionCount: parsed.sections.length,
        });

        ok += 1;
        console.log(`ok (${parsed.sections.length} sections)`);
      } catch (err) {
        failed += 1;
        console.log(`FAILED — ${err.message}`);
        catEntry.patches.push({
          number,
          title: slug.replace(/_/g, ' '),
          releaseDate,
          slug,
          file: relFile,
          error: err.message,
        });
      }

      await sleep(DELAY_MS);
    }

    index.categories.push(catEntry);
  }

  if (!dryRun) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const indexPath = path.join(OUT_DIR, 'patchnotes-index.json');
    if (only && fs.existsSync(indexPath)) {
      const existing = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      for (const catEntry of index.categories) {
        const existingCat = existing.categories?.find((c) => c.id === catEntry.id);
        if (!existingCat) continue;
        const merged = [...(existingCat.patches ?? [])];
        for (const patch of catEntry.patches) {
          const idx = merged.findIndex((p) => p.number === patch.number);
          if (idx >= 0) merged[idx] = patch;
          else merged.push(patch);
        }
        merged.sort((a, b) => b.number - a.number);
        catEntry.patches = merged;
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  console.log(`\nDone: ${ok}/${total} ok, ${failed} failed${dryRun ? ' (dry-run)' : ''}.`);
  if (!dryRun) console.log(`Index: ${path.join(OUT_DIR, 'patchnotes-index.json')}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  parsePatchPage,
  parseContentBlocks,
  patchFileName,
  PATCH_MANIFEST,
};
