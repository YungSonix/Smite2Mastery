import { Platform } from 'react-native';

/** Legacy default — prefer abilityCardWidth / itemCardWidth from getTooltipLayout. */
export const TOOLTIP_CARD_WIDTH_DESKTOP = 318;
/** Ability tooltips — wider so long descriptions wrap less vertically. */
export const ABILITY_TOOLTIP_CARD_WIDTH_DESKTOP = 420;
/** Item tooltips — wider so long active/passive copy wraps less vertically. */
export const ITEM_TOOLTIP_CARD_WIDTH_DESKTOP = 420;
export const TOOLTIP_CARD_WIDTH_COMPACT_MIN = 240;

/** Responsive tooltip card + type scale for narrow / mobile viewports. */
export function getTooltipLayout(screenWidth) {
  const compact = screenWidth < 480;
  const isWeb = Platform.OS === 'web';
  const desktopCap = isWeb ? TOOLTIP_CARD_WIDTH_DESKTOP : 300;
  const abilityDesktopCap = isWeb ? ABILITY_TOOLTIP_CARD_WIDTH_DESKTOP : 340;
  const itemDesktopCap = isWeb ? ITEM_TOOLTIP_CARD_WIDTH_DESKTOP : 340;
  const cardWidth = compact
    ? Math.max(TOOLTIP_CARD_WIDTH_COMPACT_MIN, screenWidth - 64)
    : Math.min(desktopCap, screenWidth - 48);
  const abilityCardWidth = compact
    ? Math.max(TOOLTIP_CARD_WIDTH_COMPACT_MIN, screenWidth - 64)
    : Math.min(abilityDesktopCap, screenWidth - 32);
  const itemCardWidth = compact
    ? Math.max(TOOLTIP_CARD_WIDTH_COMPACT_MIN, screenWidth - 64)
    : Math.min(itemDesktopCap, screenWidth - 32);

  return {
    compact,
    cardWidth,
    abilityCardWidth,
    itemCardWidth,
    overlayPadding: compact ? 12 : 16,
    cardPadding: compact ? 10 : 12,
    bodyFontSize: compact ? 10 : 11,
    bodyLineHeight: compact ? 14 : 15,
    sectionLabelSize: compact ? 8 : 9,
    statFontSize: compact ? 9 : 10,
    statDeltaSize: compact ? 8 : 9,
    titleFontSize: compact ? 13 : 14,
    abilityTitleFontSize: compact ? 13 : 14,
    abilityBodyFontSize: compact ? 10 : 11,
    abilityBodyLineHeight: compact ? 14 : 15,
    abilityStatFontSize: compact ? 9 : 10,
    abilitySectionLabelSize: compact ? 8 : 9,
    abilitySectionGap: compact ? 5 : 6,
    abilityBulletMarkWidth: compact ? 9 : 10,
    abilityBulletGap: compact ? 3 : 4,
    itemTitleFontSize: compact ? 13 : 14,
    itemBodyFontSize: compact ? 10 : 11,
    itemBodyLineHeight: compact ? 14 : 15,
    itemStatFontSize: compact ? 9 : 10,
    itemSectionLabelSize: compact ? 9 : 10,
    itemCostFontSize: compact ? 11 : 12,
    itemSectionGap: compact ? 5 : 6,
    itemPassiveGap: compact ? 5 : 6,
    bulletMarkWidth: compact ? 9 : 10,
    bulletGap: compact ? 3 : 4,
  };
}
