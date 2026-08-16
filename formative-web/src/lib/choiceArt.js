import catalog from './triviaRemixCatalog.json';

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const artByKey = (() => {
  const map = new Map();
  for (const god of catalog.gods || []) {
    const key = norm(god.name);
    if (key && god.image) map.set(key, { kind: 'god', name: god.name, image: god.image });
  }
  for (const item of catalog.items || []) {
    const key = norm(item.name);
    if (key && item.image) map.set(key, { kind: 'item', name: item.name, image: item.image });
  }
  return map;
})();

export function lookupChoiceArt(label) {
  return artByKey.get(norm(label)) || null;
}

/** Tiles only when every option is a catalog god or item with art. */
export function allChoicesHaveArt(labels) {
  const list = (labels || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (list.length < 2) return false;
  return list.every((label) => lookupChoiceArt(label));
}
