/** Categorize buckets: item → category map. */

export function parseCategorize(q) {
  const opts = q?.options && typeof q.options === 'object' && !Array.isArray(q.options) ? q.options : {};
  return {
    categories: (opts.categories || []).map((s) => String(s ?? '')),
    items: (opts.items || []).map((s) => String(s ?? '')),
    map: q?.correct?.map && typeof q.correct.map === 'object' ? { ...q.correct.map } : {},
  };
}

export function remapItemKey(map, oldName, newName) {
  const next = { ...map };
  if (Object.prototype.hasOwnProperty.call(next, oldName)) {
    next[newName] = next[oldName];
    if (oldName !== newName) delete next[oldName];
  }
  return next;
}

export function remapCategoryValue(map, oldName, newName) {
  const next = {};
  for (const [k, v] of Object.entries(map || {})) {
    next[k] = v === oldName ? newName : v;
  }
  return next;
}
