import { DEFAULT_ABILITY_TOOLTIP_DETAIL } from '../lib/abilityTooltipDetail';
import { preloadTooltipDetail, useTooltipDetail } from './useTooltipDetail';

const STORAGE_KEY = 'abilityTooltipDetailLevel';

export function preloadAbilityTooltipDetail() {
  return preloadTooltipDetail(STORAGE_KEY, DEFAULT_ABILITY_TOOLTIP_DETAIL);
}

/** Persisted ability tooltip density — minimal (short) vs descriptive (full stat rows). */
export function useAbilityTooltipDetail() {
  return useTooltipDetail(STORAGE_KEY, DEFAULT_ABILITY_TOOLTIP_DETAIL);
}
