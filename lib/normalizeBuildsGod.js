/**
 * `builds.json` god entries may nest kit + bio under `baseKit` / `baseInformation` (API shape).
 * Legacy UI expects a flat object with `abilities`, `icon`, `builds`, etc.
 */
export function normalizeBuildsGod(god) {
  if (!god || typeof god !== 'object') return god;
  if (!god.baseKit || typeof god.baseKit !== 'object') return god;

  const info = god.baseInformation && typeof god.baseInformation === 'object' ? god.baseInformation : {};
  const kit = god.baseKit;
  const { baseKit, baseInformation, ...rest } = god;

  const { builds: kitBuilds, ...kitWithoutBuilds } = kit;

  let mergedBuilds =
    Array.isArray(rest.builds) && rest.builds.length > 0
      ? [...rest.builds]
      : Array.isArray(kitBuilds)
        ? [...kitBuilds]
        : [];

  const aspectBuilds =
    god.aspect && typeof god.aspect === 'object' && Array.isArray(god.aspect.builds)
      ? god.aspect.builds
      : [];
  if (aspectBuilds.length > 0) {
    mergedBuilds = mergedBuilds.concat(aspectBuilds);
  }

  return {
    ...kitWithoutBuilds,
    ...info,
    ...rest,
    builds: mergedBuilds,
  };
}

export function flattenBuildsGods(godsRoot) {
  if (!godsRoot) return [];
  if (!Array.isArray(godsRoot)) return [normalizeBuildsGod(godsRoot)].filter(Boolean);
  return godsRoot.flat(Infinity).filter(Boolean).map(normalizeBuildsGod);
}
