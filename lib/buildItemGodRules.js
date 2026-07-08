/** Normalize god/item names for loose matching (Ratatoskr ↔ Ratatoskr_Item). */
export function normalizeGodItemKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getGodKeys(god) {
  if (!god || typeof god !== 'object') return [];
  const keys = [
    god.internalName,
    god.name,
    god.GodName,
    god.title,
    god.displayName,
  ]
    .filter(Boolean)
    .map(normalizeGodItemKey);
  return [...new Set(keys)];
}

function godMatchesKeys(god, allowedKeys) {
  if (!allowedKeys?.length) return false;
  const godKeys = getGodKeys(god);
  if (!godKeys.length) return false;
  return allowedKeys.some((allowed) =>
    godKeys.some((godKey) => godKey.includes(allowed) || allowed.includes(godKey))
  );
}

export function isAcornItem(item) {
  const name = (item?.name || '').toLowerCase();
  const internal = (item?.internalName || '').toLowerCase();
  return name.includes('acorn') || internal.includes('acorn');
}

function isVulcanModItem(item) {
  const name = (item?.name || '').toLowerCase();
  return (
    name.includes('alternator mod') ||
    name.includes('dual mod') ||
    name.includes('effeciency mod') ||
    name.includes('resonator mod') ||
    name.includes('thermal mod') ||
    name.includes('shrapnel mod') ||
    name.includes('masterwork mod') ||
    name.includes('surplus mod') ||
    name.includes('seismic mod')
  );
}

function isBaronRestrictedItem(item) {
  const name = (item?.name || '').toLowerCase();
  const internal = (item?.internalName || '').toLowerCase();
  return name.includes('baron') || internal.includes('baron');
}

function isAladdinLampItem(item) {
  const name = (item?.name || '').toLowerCase();
  const internal = (item?.internalName || '').toLowerCase();
  return (
    internal === 'aladdinslamp' ||
    name.includes("aladdin's lamp") ||
    name.includes('aladdinslamp')
  );
}

/** Items that only belong on specific gods (acorns, lamp, Baron brew, Vulcan mods, etc.). */
export function isGodRestrictedItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (isAcornItem(item)) return true;
  if (item.godSpecific === true) return true;
  if (isBaronRestrictedItem(item)) return true;
  if (isVulcanModItem(item)) return true;
  return false;
}

/** Normalized god keys that may equip this item. */
export function getItemOwnerGodKeys(item) {
  if (isAcornItem(item)) return ['ratatoskr'];
  if (isAladdinLampItem(item)) return ['aladdin'];
  if (isBaronRestrictedItem(item)) return ['baronsamedi', 'baron'];
  if (isVulcanModItem(item)) return ['vulcan'];
  if (item?.godSpecific === true) {
    const internal = normalizeGodItemKey(item.internalName);
    if (internal) {
      const stem = internal.replace(/item$/, '');
      return stem ? [stem] : [];
    }
  }
  return [];
}

export function isItemAllowedForGod(item, god) {
  if (!isGodRestrictedItem(item)) return true;
  if (!god) return false;
  return godMatchesKeys(god, getItemOwnerGodKeys(item));
}

export function filterItemsForGod(items, god) {
  return (items || []).filter((item) => isItemAllowedForGod(item, god));
}
