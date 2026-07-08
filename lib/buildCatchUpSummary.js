const { LATEST_OPEN_BETA_PATCH } = require('./patchNotesConfig');
const { loadOpenBetaPatch } = require('./patchNotesLoader');
const { loadPatchHighlights } = require('./patchHighlights');
const { buildSimpleSummary, deriveHighlightsFromPatch } = require('./patchNotesSummary');
const { mergePatchSummaries } = require('./mergePatchSummaries');

function buildPatchSummary(patchNumber) {
  const patchJson = loadOpenBetaPatch(patchNumber);
  if (!patchJson) return null;
  const highlights = loadPatchHighlights(patchNumber) || deriveHighlightsFromPatch(patchJson);
  return buildSimpleSummary(patchJson, highlights);
}

function buildCatchUpSummaryText(lastPlayedPatch, summary) {
  if (!summary) return '';

  const g = summary.gods || {};
  const i = summary.items || {};
  const newGods = summary.newGods?.length || 0;
  const buffed = g.buffed?.length || 0;
  const nerfed = g.nerfed?.length || 0;
  const adjusted = g.adjusted?.length || 0;
  const shifted = g.shifted?.length || 0;
  const items =
    (i.new?.length || 0) +
    (i.buffed?.length || 0) +
    (i.nerfed?.length || 0) +
    (i.adjusted?.length || 0) +
    (i.shifted?.length || 0);
  const modes = summary.gameModes?.length || 0;

  let text =
    `Since OB${lastPlayedPatch}, through OB${LATEST_OPEN_BETA_PATCH}: ` +
    `${newGods} new god${newGods !== 1 ? 's' : ''}, ` +
    `${buffed} buffed, ${nerfed} nerfed`;

  if (adjusted) text += `, ${adjusted} adjusted`;
  if (shifted) text += `, ${shifted} shifted`;
  text += `, ${items} item${items !== 1 ? 's' : ''} changed`;
  if (modes) text += `, ${modes} game mode${modes !== 1 ? 's' : ''} updated`;
  return `${text}.`;
}

function buildCatchUpSummary(lastPlayedPatch) {
  if (lastPlayedPatch >= LATEST_OPEN_BETA_PATCH) {
    return {
      isLatest: true,
      summary: null,
      summaryText: "You're already on the latest patch! No changes to catch up on.",
    };
  }

  const summaries = [];
  for (let patchNum = lastPlayedPatch + 1; patchNum <= LATEST_OPEN_BETA_PATCH; patchNum += 1) {
    const summary = buildPatchSummary(patchNum);
    if (summary) summaries.push(summary);
  }

  const merged = mergePatchSummaries(summaries);
  if (!merged) {
    return {
      isLatest: false,
      summary: null,
      summaryText: 'No patch data found for this range.',
    };
  }

  merged.summaryLine = buildCatchUpSummaryText(lastPlayedPatch, merged);
  return {
    isLatest: false,
    summary: merged,
    summaryText: merged.summaryLine,
  };
}

function collectSummarySearchHits(summary, patchNumber) {
  if (!summary) return [];
  const hits = [];
  const push = (type, name, bucket, extra = {}) => {
    if (!name) return;
    hits.push({ type, name, bucket, patchNumber, ...extra });
  };

  for (const g of summary.newGods || []) push('god', g.name, 'new');
  for (const g of summary.gods?.buffed || []) push('god', g.name, 'buffed');
  for (const g of summary.gods?.nerfed || []) push('god', g.name, 'nerfed');
  for (const g of summary.gods?.adjusted || []) push('god', g.name, 'adjusted');
  for (const g of summary.gods?.shifted || []) push('god', g.name, 'shifted');
  for (const item of summary.items?.new || []) push('item', item.name, 'new');
  for (const item of summary.items?.buffed || []) push('item', item.name, 'buffed');
  for (const item of summary.items?.nerfed || []) push('item', item.name, 'nerfed');
  for (const item of summary.items?.adjusted || []) push('item', item.name, 'adjusted');
  for (const item of summary.items?.shifted || []) push('item', item.name, 'shifted');
  for (const mode of summary.gameModes || []) push('mode', mode.name, 'mode');

  return hits;
}

function searchOpenBetaPatches(query, patchNumbers, limit = 48) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  const results = [];
  for (const patchNumber of patchNumbers) {
    const summary = buildPatchSummary(patchNumber);
    if (!summary) continue;
    for (const hit of collectSummarySearchHits(summary, patchNumber)) {
      if (hit.name.toLowerCase().includes(q)) {
        results.push(hit);
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}

module.exports = {
  buildPatchSummary,
  buildCatchUpSummary,
  buildCatchUpSummaryText,
  searchOpenBetaPatches,
};
