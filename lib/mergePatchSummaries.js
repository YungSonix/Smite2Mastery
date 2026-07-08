function entryKey(entry) {
  if (!entry) return '';
  if (entry.gridKey) return entry.gridKey;
  const name = entry.name || '';
  const scope = entry.scope || 'full';
  const aspect = entry.aspectLabel || entry.note || '';
  return `${name}|${scope}|${aspect}`.toLowerCase();
}

function mergeEntryLists(existing, incoming) {
  const map = new Map();
  for (const entry of existing || []) {
    const key = entryKey(entry);
    map.set(key, {
      ...entry,
      changes: [...(entry.changes || [])],
    });
  }
  for (const entry of incoming || []) {
    const key = entryKey(entry);
    if (map.has(key)) {
      const prev = map.get(key);
      prev.changes = [...(prev.changes || []), ...(entry.changes || [])];
      if (entry.note && !prev.note) prev.note = entry.note;
    } else {
      map.set(key, {
        ...entry,
        changes: [...(entry.changes || [])],
      });
    }
  }
  return Array.from(map.values());
}

function mergeUniqueByKey(existing, incoming, getKey) {
  const seen = new Set((existing || []).map(getKey));
  const out = [...(existing || [])];
  for (const entry of incoming || []) {
    const key = getKey(entry);
    if (!seen.has(key)) {
      out.push(entry);
      seen.add(key);
    }
  }
  return out;
}

function mergeGameModes(existing, incoming) {
  const map = new Map();
  for (const mode of existing || []) {
    map.set(mode.name.toLowerCase(), {
      ...mode,
      changes: [...(mode.changes || [])],
    });
  }
  for (const mode of incoming || []) {
    const key = mode.name.toLowerCase();
    if (map.has(key)) {
      const prev = map.get(key);
      prev.changes = [...(prev.changes || []), ...(mode.changes || [])];
    } else {
      map.set(key, { ...mode, changes: [...(mode.changes || [])] });
    }
  }
  return Array.from(map.values());
}

function mergePatchSummaries(summaries) {
  if (!summaries?.length) return null;

  const first = summaries[0];
  const last = summaries[summaries.length - 1];
  const out = {
    patchNumber: last.patchNumber,
    patchLabel:
      summaries.length === 1
        ? last.patchLabel
        : `OB${first.patchNumber}–OB${last.patchNumber}`,
    releaseDate: last.releaseDate,
    infoboxTitle: last.infoboxTitle,
    summaryLine: '',
    newGods: [],
    newAspects: [],
    wanderingMarket: [],
    gods: { buffed: [], nerfed: [], adjusted: [], shifted: [] },
    items: { buffed: [], nerfed: [], adjusted: [], shifted: [], new: [] },
    systems: [],
    gameModes: [],
    balanceIntro: '',
  };

  for (const summary of summaries) {
    out.newGods = mergeUniqueByKey(out.newGods, summary.newGods, (g) =>
      (g.name || '').toLowerCase()
    );
    out.newAspects = mergeUniqueByKey(
      out.newAspects,
      summary.newAspects,
      (a) => `${a.god}|${a.name}`.toLowerCase()
    );
    out.wanderingMarket = mergeUniqueByKey(
      out.wanderingMarket,
      summary.wanderingMarket,
      (wm) => (wm.title || wm.god || '').toLowerCase()
    );
    out.gods.buffed = mergeEntryLists(out.gods.buffed, summary.gods?.buffed);
    out.gods.nerfed = mergeEntryLists(out.gods.nerfed, summary.gods?.nerfed);
    out.gods.adjusted = mergeEntryLists(out.gods.adjusted, summary.gods?.adjusted);
    out.gods.shifted = mergeEntryLists(out.gods.shifted, summary.gods?.shifted);
    out.items.buffed = mergeEntryLists(out.items.buffed, summary.items?.buffed);
    out.items.nerfed = mergeEntryLists(out.items.nerfed, summary.items?.nerfed);
    out.items.adjusted = mergeEntryLists(out.items.adjusted, summary.items?.adjusted);
    out.items.shifted = mergeEntryLists(out.items.shifted, summary.items?.shifted);
    out.items.new = mergeEntryLists(out.items.new, summary.items?.new);
    out.systems = mergeUniqueByKey(out.systems, summary.systems, (s) =>
      (s.name || '').toLowerCase()
    );
    out.gameModes = mergeGameModes(out.gameModes, summary.gameModes);
    if (summary.balanceIntro) {
      out.balanceIntro = out.balanceIntro
        ? `${out.balanceIntro} ${summary.balanceIntro}`
        : summary.balanceIntro;
    }
  }

  return out;
}

module.exports = {
  mergePatchSummaries,
  mergeEntryLists,
};
