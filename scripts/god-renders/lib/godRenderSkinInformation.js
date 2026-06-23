'use strict';

/**
 * Labeled info blocks under the tier line on loadout screenshots (STANDARD, SPECIAL, etc.).
 * Order matters — longer / more specific headers first.
 */
const SECTION_HEADERS = [
  { key: 'specialEffects', label: 'Special Effects', pattern: 'SPECIAL EFFECTS' },
  { key: 'foundersEdition', label: "Founder's Edition", pattern: "FOUNDER'?S?\\s+EDITION" },
  { key: 'ascensionReward', label: 'Ascension Reward', pattern: 'ASCENSION\\s+REWARD' },
  { key: 'crossGen', label: 'Cross-Gen', pattern: 'CROSS\\s*[-–]?\\s*GEN' },
  { key: 'travelerCollection', label: 'Traveler Collection', pattern: 'TRAVELER\\s+COLLECTION' },
  { key: 'standard', label: 'Standard', pattern: 'STANDARD' },
  { key: 'classic', label: 'Classic', pattern: 'CLASSIC' },
  { key: 'special', label: 'Special', pattern: 'SPECIAL' },
  { key: 'rare', label: 'Rare', pattern: 'RARE' },
  { key: 'prism', label: 'Prism', pattern: 'PRISM' },
  { key: 'fabled', label: 'Fabled', pattern: 'FABLED' },
  { key: 'legendary', label: 'Legendary', pattern: 'LEGENDARY' },
  { key: 'mythical', label: 'Mythical', pattern: 'MYTHICAL' },
  { key: 'epic', label: 'Epic', pattern: 'EPIC' },
  { key: 'heroic', label: 'Heroic', pattern: 'HEROIC' },
];

function cleanInformationText(raw) {
  return String(raw || '')
    .replace(/[|]/g, 'I')
    .replace(/[""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSectionBody(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;.\-–—]+/, '')
    .replace(/[\s:;.\-–—]+$/, '')
    .trim();
}

function findHeaderMatches(raw) {
  const matches = [];
  for (const header of SECTION_HEADERS) {
    const re = new RegExp(`\\b${header.pattern}\\s*:?\\s*`, 'gi');
    let m;
    while ((m = re.exec(raw)) !== null) {
      if (header.key === 'special') {
        const before = raw.slice(Math.max(0, m.index - 10), m.index);
        if (/SPECIAL\s*$/i.test(before)) continue;
      }
      matches.push({
        key: header.key,
        label: header.label,
        index: m.index,
        end: m.index + m[0].length,
      });
    }
  }
  return matches.sort((a, b) => a.index - b.index || a.end - b.end);
}

/**
 * Parse multi-section skin information from unlock-blurb OCR.
 * @returns {Array<{ key: string, label: string, text: string }>}
 */
function parseSkinInformation(rawText) {
  const raw = cleanInformationText(rawText);
  if (!raw) return [];

  const matches = findHeaderMatches(raw);
  if (!matches.length) {
    if (raw.length >= 20 && /[A-Za-z]{4,}/.test(raw)) {
      return [{ key: 'notes', label: 'Information', text: raw }];
    }
    return [];
  }

  const sections = [];
  const seen = new Set();
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    if (seen.has(cur.key)) continue;
    seen.add(cur.key);
    const bodyStart = cur.end;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const text = cleanSectionBody(raw.slice(bodyStart, bodyEnd));
    if (!text || text.length < 8) continue;
    sections.push({ key: cur.key, label: cur.label, text });
  }

  return sections;
}

function informationSetsCrossGen(sections) {
  return (sections || []).some((s) => s.key === 'crossGen');
}

module.exports = {
  SECTION_HEADERS,
  parseSkinInformation,
  informationSetsCrossGen,
  cleanInformationText,
};
