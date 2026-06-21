/**
 * Item sections — same rules as app/data.jsx (Database → Items).
 */
export const VAULT_ITEM_SECTIONS = [
  { id: 'starters', title: 'Starters', folder: 'Starters' },
  { id: 'tier1', title: 'Tier 1', folder: 'Tier 1' },
  { id: 'tier2', title: 'Tier 2', folder: 'Tier 2' },
  { id: 'tier3', title: 'Tier 3', folder: 'Tier 3' },
  { id: 'consumables', title: 'Consumables', folder: 'Consumables' },
  { id: 'other', title: 'Relics, actives & other', folder: 'Other' },
];

export function flattenBuildsItems(itemsRoot) {
  if (!itemsRoot) return [];
  if (!Array.isArray(itemsRoot)) return [itemsRoot].filter(Boolean);
  return itemsRoot.flat(Infinity).filter(Boolean);
}

export function isStarterItem(item) {
  if (!item || typeof item !== 'object') return false;
  return item.starter === true || (item.name && item.name.toString().toLowerCase().includes('starter'));
}

export function isConsumableSectionItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (isStarterItem(item)) return false;
  const n = (item.name || '').toString().toLowerCase();
  return (
    item.consumable === true ||
    (item.active === true && item.stepCost && !item.tier) ||
    (item.name && n.includes('consumable'))
  );
}

export function getItemSectionId(item) {
  if (!item || typeof item !== 'object') return 'other';
  if (isStarterItem(item)) return 'starters';
  if (isConsumableSectionItem(item)) return 'consumables';
  if (item.tier === 1) return 'tier1';
  if (item.tier === 2) return 'tier2';
  if (item.tier === 3) return 'tier3';
  return 'other';
}

export function sectionForId(id) {
  return VAULT_ITEM_SECTIONS.find((s) => s.id === id) ?? VAULT_ITEM_SECTIONS[VAULT_ITEM_SECTIONS.length - 1];
}

export function safeItemFileName(item) {
  const name = item?.name || item?.internalName || 'Unknown';
  return String(name).replace(/[/\\:*?"<>|]/g, '-').trim();
}

export function compareItemsForList(a, b) {
  const na = (a?.name || a?.internalName || '').toString();
  const nb = (b?.name || b?.internalName || '').toString();
  return na.localeCompare(nb);
}
