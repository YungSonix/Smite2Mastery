/**
 * Load builds.json + itemTags.json, attach tags onto flat item nodes for scripts.
 */
const fs = require('fs');
const path = require('path');

const BUILDS_PATH = path.join(__dirname, '../app/data/God Information/Builds/builds.json');
const TAGS_PATH = path.join(__dirname, '../app/data/StringTables/Items/itemTags.json');

function flattenItems(itemsRoot, out = []) {
  if (!itemsRoot) return out;
  if (!Array.isArray(itemsRoot)) {
    if (itemsRoot && typeof itemsRoot === 'object') out.push(itemsRoot);
    return out;
  }
  itemsRoot.forEach((node) => {
    if (!node) return;
    if (Array.isArray(node)) flattenItems(node, out);
    else if (typeof node === 'object') out.push(node);
  });
  return out;
}

function loadTagsFile() {
  if (!fs.existsSync(TAGS_PATH)) {
    return { description: '', items: [] };
  }
  return JSON.parse(fs.readFileSync(TAGS_PATH, 'utf8'));
}

function buildTagsMap(tagsFile) {
  const map = new Map();
  (tagsFile.items || []).forEach((entry) => {
    const key = String(entry?.internalName || '').trim();
    if (!key) return;
    map.set(key, entry);
  });
  return map;
}

function ensureTagsEntry(tagsMap, tagsFile, item) {
  const key = String(item?.internalName || '').trim();
  if (!key) return null;
  let entry = tagsMap.get(key);
  if (!entry) {
    entry = {
      internalName: key,
      name: item.name || key,
      tags: [],
    };
    tagsFile.items = tagsFile.items || [];
    tagsFile.items.push(entry);
    tagsMap.set(key, entry);
  }
  return entry;
}

/** Load builds + tags; flat items have `.tags` attached from itemTags.json. */
function loadBuildsWithTags() {
  const builds = JSON.parse(fs.readFileSync(BUILDS_PATH, 'utf8'));
  const tagsFile = loadTagsFile();
  const tagsMap = buildTagsMap(tagsFile);
  const flat = flattenItems(builds.items).filter((i) => i && i.internalName);

  flat.forEach((item) => {
    const entry = tagsMap.get(item.internalName);
    item.tags = entry?.tags ? [...entry.tags] : [];
  });

  return { builds, tagsFile, tagsMap, flat };
}

/** Copy `.tags` from flat items back into tagsFile entries (does not write builds). */
function syncFlatTagsToFile(flat, tagsMap, tagsFile) {
  flat.forEach((item) => {
    if (!item?.internalName) return;
    const entry = ensureTagsEntry(tagsMap, tagsFile, item);
    if (entry) entry.tags = Array.isArray(item.tags) ? [...item.tags] : [];
  });

  tagsFile.items = (tagsFile.items || []).sort((a, b) =>
    String(a.internalName).localeCompare(String(b.internalName))
  );
}

function writeTagsFile(tagsFile) {
  if (!tagsFile.description) {
    tagsFile.description =
      'Item tags by internalName. Edit tags here — builds.json no longer stores tags.';
  }
  fs.writeFileSync(TAGS_PATH, JSON.stringify(tagsFile, null, 2) + '\n', 'utf8');
}

function saveTagsFromSession({ tagsFile, flat, tagsMap }) {
  syncFlatTagsToFile(flat, tagsMap, tagsFile);
  writeTagsFile(tagsFile);
}

module.exports = {
  BUILDS_PATH,
  TAGS_PATH,
  flattenItems,
  loadBuildsWithTags,
  syncFlatTagsToFile,
  writeTagsFile,
  saveTagsFromSession,
};
