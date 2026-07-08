export const TOOLTIP_DETAIL = {
  MINIMAL: 'minimal',
  DESCRIPTIVE: 'descriptive',
};

export const DEFAULT_TOOLTIP_DETAIL = TOOLTIP_DETAIL.MINIMAL;

export function isMinimalTooltipDetail(detailLevel) {
  return detailLevel !== TOOLTIP_DETAIL.DESCRIPTIVE;
}
