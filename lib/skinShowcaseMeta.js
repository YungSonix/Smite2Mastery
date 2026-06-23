/**
 * Format vision-tagged skin rows for the Database skin showcase meta panel.
 */

export function resolveSkinCost(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const buttonText = entry.loadoutMeta?.buttonText;
  if (buttonText && String(buttonText).trim()) {
    return { kind: 'action', label: String(buttonText).trim().toUpperCase() };
  }
  if (entry.cost != null && typeof entry.cost === 'object' && entry.cost.currency) {
    return {
      kind: 'currency',
      currency: String(entry.cost.currency).toLowerCase(),
      amount: entry.cost.amount != null ? String(entry.cost.amount) : '',
      owned: entry.cost.owned === true,
    };
  }
  const price = entry.price;
  if (price && typeof price === 'object') {
    const diamonds = String(price.diamonds ?? '').trim();
    const gems = String(price.gems ?? '').trim();
    const gemsdia = String(price.gemsdia ?? '').trim();
    if (diamonds) return { kind: 'currency', currency: 'diamonds', amount: diamonds };
    if (gems) return { kind: 'currency', currency: 'gems', amount: gems };
    if (gemsdia) return { kind: 'currency', currency: 'gems', amount: gemsdia };
  }
  if (entry.isBaseSkin) {
    return { kind: 'currency', currency: 'diamonds', amount: '0', owned: true };
  }
  return null;
}

export function formatCostLabel(cost) {
  if (!cost) return '—';
  if (cost.kind === 'action') return cost.label;
  if (cost.kind === 'currency') {
    const amount = cost.amount !== '' ? cost.amount : '—';
    if (cost.currency === 'gems') return `${amount} gems`;
    if (cost.currency === 'diamonds') {
      if (amount === '0' && cost.owned) return '0 diamonds';
      return `${amount} diamonds`;
    }
    return `${amount} ${cost.currency}`;
  }
  return '—';
}

export function resolveSkinTier(entry) {
  if (!entry || entry.isBaseSkin) return null;
  const rarity = entry.rarity || entry.loadoutMeta?.rarity || null;
  const tierBadge = entry.tierBadge || null;
  if (!rarity && !tierBadge) return null;
  return { rarity: rarity ? String(rarity) : null, tierBadge };
}

export function resolveSkinUnlock(entry) {
  if (!entry) return null;
  const unlock = entry.unlock;
  if (unlock?.displayText) return String(unlock.displayText);
  if (entry.isBaseSkin) return 'Base god';
  return null;
}

export function resolveSkinType(entry) {
  if (!entry) return null;
  const type = entry.type && String(entry.type).trim();
  if (!type || /^base skin$/i.test(type)) return null;
  return type;
}

export function resolveSkinInformation(entry) {
  if (!entry) return [];
  const rows = entry.information || entry.loadoutMeta?.information || [];
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row && (row.label || row.text));
}

export function hasShowcaseMeta(entry) {
  if (!entry) return false;
  return Boolean(
    resolveSkinCost(entry) ||
      resolveSkinTier(entry) ||
      resolveSkinUnlock(entry) ||
      resolveSkinType(entry) ||
      resolveSkinInformation(entry).length ||
      entry.loadoutMeta?.godName ||
      entry.loadout?.screenshot
  );
}
