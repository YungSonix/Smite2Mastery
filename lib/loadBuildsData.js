/**
 * Lazy-load builds data in sections. Parses each chunk once per session.
 *
 * Scripts/API still edit `builds.json` — run `npm run builds:split` after updates.
 */

let godsCache = null;
let itemsCache = null;
let fullCache = null;

let godsPromise = null;
let itemsPromise = null;
let fullPromise = null;

function mergePartial(godsPart, itemsPart) {
  const merged = {
    gods: godsPart?.gods ?? godsCache?.gods ?? null,
    tierlist: godsPart?.tierlist ?? godsCache?.tierlist ?? [],
    items: itemsPart?.items ?? itemsCache?.items ?? null,
  };
  if (merged.gods && merged.items) {
    fullCache = merged;
  }
  return merged;
}

function normalizeScope(options) {
  if (typeof options === 'string') {
    return options;
  }
  if (options?.scope === 'gods') return 'gods';
  if (options?.scope === 'items') return 'items';
  if (options?.gods === true && options?.items === false) return 'gods';
  if (options?.items === true && options?.gods === false) return 'items';
  return 'all';
}

/** Best-effort sync read — full object, or partial if only one chunk loaded. */
export function getBuildsDataSync() {
  if (fullCache) return fullCache;
  if (godsCache || itemsCache) {
    return mergePartial(godsCache, itemsCache);
  }
  return null;
}

export function getBuildsGodsSync() {
  return godsCache;
}

export function getBuildsItemsSync() {
  return itemsCache;
}

function loadGodsChunk() {
  if (godsCache) {
    return Promise.resolve(godsCache);
  }
  if (godsPromise) {
    return godsPromise;
  }
  godsPromise = Promise.resolve()
    .then(() => {
      // eslint-disable-next-line global-require
      const data = require('./buildsDataGods');
      godsCache = { gods: data.gods, tierlist: data.tierlist ?? [] };
      mergePartial(godsCache, itemsCache);
      return godsCache;
    })
    .catch((err) => {
      godsPromise = null;
      throw err;
    });
  return godsPromise;
}

function loadItemsChunk() {
  if (itemsCache) {
    return Promise.resolve(itemsCache);
  }
  if (itemsPromise) {
    return itemsPromise;
  }
  itemsPromise = Promise.resolve()
    .then(() => {
      // eslint-disable-next-line global-require
      const data = require('./buildsDataItems');
      itemsCache = { items: data.items };
      mergePartial(godsCache, itemsCache);
      return itemsCache;
    })
    .catch((err) => {
      itemsPromise = null;
      throw err;
    });
  return itemsPromise;
}

/** Load gods + tierlist only (~4MB). */
export function loadBuildsGodsData() {
  return loadGodsChunk().then((part) => ({
    gods: part.gods,
    tierlist: part.tierlist,
    items: itemsCache?.items ?? null,
  }));
}

/** Load items catalog only (~200KB). */
export function loadBuildsItemsData() {
  return loadItemsChunk().then((part) => ({
    gods: godsCache?.gods ?? null,
    tierlist: godsCache?.tierlist ?? [],
    items: part.items,
  }));
}

/**
 * @param {'all'|'gods'|'items'|{ scope?: string, gods?: boolean, items?: boolean }} [options]
 */
export function loadBuildsData(options = 'all') {
  const scope = normalizeScope(options);

  if (scope === 'gods') {
    return loadBuildsGodsData();
  }
  if (scope === 'items') {
    return loadBuildsItemsData();
  }

  if (fullCache) {
    return Promise.resolve(fullCache);
  }
  if (fullPromise) {
    return fullPromise;
  }

  fullPromise = Promise.all([loadGodsChunk(), loadItemsChunk()])
    .then(() => fullCache)
    .catch((err) => {
      fullPromise = null;
      throw err;
    });
  return fullPromise;
}

/** Warm gods chunk — use on Builds / Database (gods tab). */
export function preloadBuildsGodsData() {
  loadBuildsGodsData().catch(() => {});
}

/** Warm items chunk — use on Custom Builder / Database (items tab). */
export function preloadBuildsItemsData() {
  loadBuildsItemsData().catch(() => {});
}

/** Warm both chunks (avoid on Home). */
export function preloadBuildsData() {
  loadBuildsData('all').catch(() => {});
}
