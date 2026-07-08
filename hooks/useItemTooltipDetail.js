import { DEFAULT_ITEM_TOOLTIP_DETAIL } from '../lib/itemTooltipDetail';
import { preloadTooltipDetail, useTooltipDetail } from './useTooltipDetail';

const STORAGE_KEY = 'itemTooltipDetailLevel';

export function preloadItemTooltipDetail() {
  return preloadTooltipDetail(STORAGE_KEY, DEFAULT_ITEM_TOOLTIP_DETAIL);
}

/** Persisted item tooltip density — minimal (stats + tagline) vs descriptive (full passive). */
export function useItemTooltipDetail() {
  return useTooltipDetail(STORAGE_KEY, DEFAULT_ITEM_TOOLTIP_DETAIL);
}
