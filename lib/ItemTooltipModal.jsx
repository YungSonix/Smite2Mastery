import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';

import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { useItemTooltipDetail } from '../hooks/useItemTooltipDetail';
import { useEphemeralTooltipDetail } from '../hooks/useEphemeralTooltipDetail';
import { getLocalItemIcon } from '../app/localIcons';
import ItemNameMeta from './ItemNameMeta';
import ItemTooltipBody, { ItemTooltipCost } from './ItemTooltipBody';
import TooltipDetailToggle from './TooltipDetailToggle';
import { getTooltipLayout } from './tooltipLayout';
import { ITEM_TOOLTIP_DETAIL } from './itemTooltipDetail';
import { computeHoverTooltipPosition, hoverCardPositionStyle } from './computeHoverTooltipPosition';
import HoverTooltipPortal from './HoverTooltipPortal';

const IS_WEB = Platform.OS === 'web';

function ItemTooltipIcon({ item, itemName, iconKey, failedIcons, onIconError }) {
  const displayName = itemName || item?.name || item?.internalName || 'Item';
  const initial = displayName.charAt(0);

  if (!item?.icon) {
    return (
      <View style={styles.iconFallback}>
        <Text style={styles.iconFallbackText}>{initial}</Text>
      </View>
    );
  }

  const localIcon = getLocalItemIcon(item.icon);
  if (!localIcon) {
    return (
      <View style={styles.iconFallback}>
        <Text style={styles.iconFallbackText}>{initial}</Text>
      </View>
    );
  }

  const imageSource = localIcon.primary || localIcon;
  const fallbackSource = localIcon.fallback;
  const useFallback = failedIcons[iconKey];

  if (fallbackSource && !useFallback) {
    return (
      <Image
        source={imageSource}
        style={styles.icon}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
        onError={() => onIconError(iconKey)}
        accessibilityLabel={`${displayName} item icon`}
      />
    );
  }

  if (fallbackSource && useFallback) {
    return (
      <Image
        source={fallbackSource}
        style={styles.icon}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}
        accessibilityLabel={`${displayName} item icon`}
      />
    );
  }

  return (
    <Image
      source={imageSource}
      style={styles.icon}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={200}
      accessibilityLabel={`${displayName} item icon`}
    />
  );
}

function ItemTooltipCard({
  item,
  itemName,
  detailLevel,
  setDetailLevel,
  failedIcons,
  onIconError,
  onClose,
  onCardHoverIn,
  onCardHoverOut,
  layout,
  maxHeight,
  cardStyle,
  showClose = true,
}) {
  const resolvedName =
    itemName || (item ? item.name || item.internalName : null) || 'Unknown Item';
  const iconKey = `item-modal-${item?.internalName || item?.name || resolvedName}`;

  return (
    <Pressable
      style={[styles.card, cardStyle, { maxHeight, width: layout.itemCardWidth, maxWidth: layout.itemCardWidth, padding: layout.cardPadding }]}
      onPress={(e) => e.stopPropagation()}
      onHoverIn={onCardHoverIn}
      onHoverOut={onCardHoverOut}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <ItemTooltipIcon
            item={item}
            itemName={resolvedName}
            iconKey={iconKey}
            failedIcons={failedIcons}
            onIconError={onIconError}
          />
        </View>
        <View style={styles.titleWrap}>
          <ItemNameMeta
            item={item}
            name={item.name || resolvedName}
            titleStyle={[styles.title, { fontSize: layout.itemTitleFontSize }]}
            wrapStyle={styles.titleMetaWrap}
            hideSubtitle
          />
          <TooltipDetailToggle detailLevel={detailLevel} onChange={setDetailLevel} />
        </View>
        {showClose ? (
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <ItemTooltipBody item={item} detailLevel={detailLevel} hideCost compact={layout.compact} />
      </ScrollView>
      <ItemTooltipCost item={item} />
    </Pressable>
  );
}

/** Item preview — centered modal (tap) or floating hover card (web). */
export default function ItemTooltipModal({
  visible,
  onClose,
  item,
  itemName,
  maxHeightRatio = 0.65,
  minimalMaxHeightRatio = 0.5,
  presentation = 'modal',
  anchor = null,
  onCardHoverIn,
  onCardHoverOut,
}) {
  const { width: screenWidth, height: screenHeight } = useScreenDimensions();
  const layout = getTooltipLayout(screenWidth);
  const [itemTooltipPreference] = useItemTooltipDetail();
  const itemResetKey = item?.internalName || item?.name || itemName;
  const [detailLevel, setDetailLevel] = useEphemeralTooltipDetail(
    visible && !!item,
    itemTooltipPreference,
    itemResetKey
  );
  const [failedIcons, setFailedIcons] = useState({});

  const isMinimal = detailLevel === ITEM_TOOLTIP_DETAIL.MINIMAL;
  const isHover = presentation === 'hover' && IS_WEB;

  const handleIconError = useCallback((key) => {
    setFailedIcons((prev) => ({ ...prev, [key]: true }));
  }, []);

  const heightRatio = isHover
    ? isMinimal
      ? 0.5
      : 0.58
    : isMinimal
      ? layout.compact
        ? 0.58
        : minimalMaxHeightRatio
      : layout.compact
        ? 0.72
        : maxHeightRatio;

  const maxHeight = Math.round(
    screenHeight * heightRatio +
      (!isMinimal && item?.passive ? Math.min(140, String(item.passive).length / 18) : 0)
  );

  const hoverPosition = useMemo(() => {
    if (!isHover) return null;
    return computeHoverTooltipPosition({
      anchor,
      cardWidth: layout.itemCardWidth,
      maxHeight,
      screenWidth,
      screenHeight,
    });
  }, [anchor, isHover, layout.itemCardWidth, maxHeight, screenWidth, screenHeight]);

  if (!visible || !item) return null;

  const cardProps = {
    item,
    itemName,
    detailLevel,
    setDetailLevel,
    failedIcons,
    onIconError: handleIconError,
    onClose,
    onCardHoverIn,
    onCardHoverOut,
    layout,
    maxHeight,
    showClose: !isHover,
  };

  if (isHover) {
    const pos = hoverPosition || { left: 0, top: 0, placement: 'below' };
    return (
      <HoverTooltipPortal>
        <View style={styles.hoverLayer} pointerEvents="box-none">
          <ItemTooltipCard
            {...cardProps}
            cardStyle={[styles.hoverCard, hoverCardPositionStyle(pos)]}
          />
        </View>
      </HoverTooltipPortal>
    );
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { padding: layout.overlayPadding }]} onPress={onClose}>
        <ItemTooltipCard {...cardProps} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hoverLayer: {
    ...(IS_WEB
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10050,
        }
      : {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10050,
          elevation: 24,
        }),
  },
  hoverCard: {
    position: 'fixed',
    ...(IS_WEB
      ? {
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
          borderColor: 'rgba(125, 211, 252, 0.42)',
        }
      : {}),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#0b1226',
    borderRadius: 10,
    flexDirection: 'column',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  iconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  iconFallback: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#0f1724',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackText: {
    color: '#e6eef8',
    fontWeight: '700',
    fontSize: 18,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  titleMetaWrap: {
    flex: undefined,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#e6eef8',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    paddingBottom: 4,
  },
});
