/**
 * Reads basic-attack damage scaling from a normalized god (`basic.scales.Damage_Scaling`).
 * PhysicalPower + InhandPower → Strength; MagicalPower → Intelligence (Smite 2 item stats).
 */
export function getBasicAttackPowerCoefficients(god) {
  const list = god?.basic?.scales?.Damage_Scaling;
  if (!Array.isArray(list)) {
    return { strength: 0, intelligence: 0 };
  }
  let strength = 0;
  let intelligence = 0;
  for (const entry of list) {
    const stat = entry?.stat;
    const raw =
      Array.isArray(entry?.values) && entry.values.length ? Number(entry.values[0]) : NaN;
    const v = Number.isFinite(raw) ? raw : 0;
    if (stat === 'PhysicalPower' || stat === 'InhandPower') strength += v;
    else if (stat === 'MagicalPower') intelligence += v;
  }
  return { strength, intelligence };
}
