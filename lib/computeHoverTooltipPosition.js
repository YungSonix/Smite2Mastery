/** Place a hover card anchored above (or below) an element, clamped to the viewport. */
export function computeHoverTooltipPosition({
  anchor,
  cardWidth,
  maxHeight,
  screenWidth,
  screenHeight,
  gap = 10,
  preferBelow = false,
  estimatedHeight,
}) {
  const vw =
    typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : screenWidth;
  const vh =
    typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : screenHeight;

  const estHeight = estimatedHeight ?? maxHeight ?? 280;

  const clampLeft = (left) => Math.max(8, Math.min(left, vw - cardWidth - 8));

  if (!anchor) {
    return {
      left: clampLeft((vw - cardWidth) / 2),
      top: Math.max(8, (vh - estHeight) / 2),
      placement: 'below',
    };
  }

  const left = clampLeft(anchor.x + anchor.width / 2 - cardWidth / 2);

  if (!preferBelow) {
    const aboveAnchor = anchor.y - gap;
    const cardTopIfAbove = aboveAnchor - estHeight;
    if (cardTopIfAbove >= 8) {
      return {
        left,
        top: aboveAnchor,
        placement: 'above',
      };
    }
  }

  return {
    left,
    top: anchor.y + anchor.height + gap,
    placement: 'below',
  };
}

/** Apply anchor-above positioning so the card bottom sits above the icon. */
export function hoverCardPositionStyle({ left, top, placement }) {
  if (placement === 'above') {
    return {
      left,
      top,
      transform: 'translateY(-100%)',
    };
  }
  return { left, top };
}
