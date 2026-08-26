/**
 * Host-facing label for ability cast / skin activate SFX catalog rows.
 * Examples: "Nut - Pharaonic Flames(3)", "Achilles - Shield of Achilles(1,2)"
 * Skin activate: appends skin in brackets when not Base.
 *
 * @param {{
 *   god?: string,
 *   ability?: string,
 *   slot?: number,
 *   slots?: number[],
 *   skin?: string,
 *   kind?: 'ability' | 'skin_activate' | string,
 * }} row
 * @returns {string}
 */
export function formatAbilitySfxLabel({ god, ability, slot, slots, skin, kind } = {}) {
  const godName = String(god || '').trim() || 'Unknown';
  const abilityName = String(ability || '').trim() || 'Ability';
  const rawSlots = Array.isArray(slots) && slots.length
    ? slots
    : [slot].filter((n) => n != null && n !== '' && Number.isFinite(Number(n)));
  const slotNums = [
    ...new Set(
      rawSlots
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n >= 1)
        .map((n) => Math.trunc(n))
    ),
  ].sort((a, b) => a - b);
  const slotPart = slotNums.length ? `(${slotNums.join(',')})` : '';
  let label = `${godName} - ${abilityName}${slotPart}`;
  const skinLabel = String(skin || '').trim();
  if (
    kind === 'skin_activate' &&
    skinLabel &&
    !/^base$/i.test(skinLabel) &&
    !/^default$/i.test(skinLabel)
  ) {
    label = `${label} [${skinLabel}]`;
  }
  return label;
}
