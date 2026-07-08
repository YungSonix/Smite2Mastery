/**
 * Item tags live in `app/data/StringTables/Items/itemTags.json` (not builds.json).
 * buildsData attaches tags at load time by internalName.
 */
const itemTagsFile = require('../app/data/StringTables/Items/itemTags.json');

let tagsByInternal = null;

function buildTagsIndex() {
  if (tagsByInternal) return tagsByInternal;

  const map = new Map();
  const list = Array.isArray(itemTagsFile?.items) ? itemTagsFile.items : [];

  list.forEach((entry) => {
    const key = String(entry?.internalName || '').trim();
    if (!key) return;
    map.set(key, {
      internalName: key,
      name: entry.name || key,
      tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
    });
  });

  tagsByInternal = map;
  return map;
}

function flattenItemNodes(itemsRoot, out = []) {
  if (!itemsRoot) return out;
  if (!Array.isArray(itemsRoot)) {
    if (itemsRoot && typeof itemsRoot === 'object') out.push(itemsRoot);
    return out;
  }
  itemsRoot.forEach((node) => {
    if (!node) return;
    if (Array.isArray(node)) flattenItemNodes(node, out);
    else if (typeof node === 'object') out.push(node);
  });
  return out;
}

/** Attach tags from itemTags.json onto builds item nodes (mutates in place). */
function attachTagsToBuilds(builds) {
  if (!builds?.items) return builds;
  const index = buildTagsIndex();
  const flat = flattenItemNodes(builds.items);

  flat.forEach((item) => {
    if (!item?.internalName) return;
    const entry = index.get(String(item.internalName).trim());
    if (entry?.tags?.length) {
      item.tags = [...entry.tags];
    } else {
      delete item.tags;
    }
  });

  return builds;
}

function getItemTags(internalName) {
  const entry = buildTagsIndex().get(String(internalName || '').trim());
  return entry?.tags ? [...entry.tags] : [];
}

function getItemTagsEntry(internalName) {
  return buildTagsIndex().get(String(internalName || '').trim()) || null;
}

module.exports = {
  ITEM_TAGS_PATH: 'app/data/StringTables/Items/itemTags.json',
  buildTagsIndex,
  attachTagsToBuilds,
  flattenItemNodes,
  getItemTags,
  getItemTagsEntry,
};
