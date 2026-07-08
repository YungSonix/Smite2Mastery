import { useWebHoverPreview } from './useWebHoverPreview';

/** Web: hover to preview · native: tap opens modal. */
export function useWebItemTooltip() {
  const hover = useWebHoverPreview();

  const bindTrigger = (ref, item, itemName) =>
    hover.bindTrigger(ref, () => (item ? { item, itemName } : null));

  return {
    isWeb: hover.isWeb,
    isVisible: hover.isVisible,
    item: hover.payload?.item ?? null,
    itemName: hover.payload?.itemName ?? null,
    anchor: hover.anchor,
    presentation: hover.presentation,
    close: hover.close,
    cancelHide: hover.cancelHide,
    scheduleHide: hover.scheduleHide,
    bindTrigger,
  };
}
