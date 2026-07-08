/** Normalize item names for fuzzy catalog lookup. */
export function normItemKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve a saved slot ref to the canonical row from `builds.json`.
 * Always prefers the catalog entry when internalName/name matches — never trust
 * embedded `stats` on community/saved snapshots (they drift from builds.json).
 */
export function resolveBuildCatalogItem(ref, catalog) {
  if (!ref || typeof ref !== 'object') return null;
  if (!Array.isArray(catalog) || catalog.length === 0) return ref;

  const a = String(ref.internalName || '').toLowerCase().trim();
  const b = String(ref.name || '').toLowerCase().trim();
  const an = normItemKey(ref.internalName);
  const bn = normItemKey(ref.name);

  for (const it of catalog) {
    const i = String(it.internalName || '').toLowerCase().trim();
    const n = String(it.name || '').toLowerCase().trim();
    if (a && i === a) return it;
    if (b && n === b) return it;
    if (an && normItemKey(it.internalName) === an) return it;
    if (bn && normItemKey(it.name) === bn) return it;
  }

  return ref;
}

export function resolveBuildCatalogRelic(ref, relicCatalog) {
  return resolveBuildCatalogItem(ref, relicCatalog);
}
