/**
 * Per-god talent slot lineups — which abilities use base vs talent string-table copy.
 * Source: app/data/StringTables/God/godAbilityTalentLineups.json
 */
const lineupsFile = require('../app/data/StringTables/God/godAbilityTalentLineups.json');
const { resolveGodKey } = require('./stringTableLookup');

export const TALENT_LINEUP_SLOTS = ['A01', 'A02', 'A03', 'A04', 'PSV', 'BASIC'];

export function normalizeTalentLineupSlot(slot) {
  const raw = String(slot || '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.startsWith('BASIC')) return 'BASIC';
  if (upper === 'PASSIVE') return 'PSV';
  if (/^A0[1-4]$/.test(upper)) return upper;
  if (upper === 'PSV') return 'PSV';
  return upper;
}

export function getGodTalentLineup(god) {
  const godKey = resolveGodKey(god, null);
  if (!godKey) return null;
  return lineupsFile?.gods?.[godKey] || null;
}

export function getTalentSlotMode(god, slot) {
  const lineup = getGodTalentLineup(god);
  const normalized = normalizeTalentLineupSlot(slot);
  if (!lineup || !normalized) return 'base';
  return lineup.slots?.[normalized] === 'talent' ? 'talent' : 'base';
}

export function shouldUseTalentAbilityCopy(god, slot, buildUsesTalent = false) {
  if (!buildUsesTalent) return false;
  return getTalentSlotMode(god, slot) === 'talent';
}

export function getGodKitAbility(god, slot) {
  if (!god) return null;
  const normalized = normalizeTalentLineupSlot(slot);
  if (!normalized) return null;
  if (normalized === 'PSV') {
    return god.passive || god.abilities?.PSV || god.abilities?.passive || null;
  }
  if (normalized === 'BASIC') {
    return god.basic || god.abilities?.Basic || god.abilities?.BASIC || null;
  }
  return god.abilities?.[normalized] || null;
}

export function listChangedTalentSlots(god) {
  const lineup = getGodTalentLineup(god);
  if (!lineup?.slots) return [];
  return TALENT_LINEUP_SLOTS.filter((slot) => lineup.slots[slot] === 'talent');
}
