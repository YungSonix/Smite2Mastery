import React from 'react';

import { View, Text, StyleSheet } from 'react-native';

import { Image } from 'expo-image';

import {

  GOLD_ICON,

  STAT_ICONS,

  getStatIcon,

  itemHasActiveEffect,

} from './imageGrabber';

import {

  BUILD_STAT_DISPLAY_NAMES,

  getBuildStatColor,

  getItemGoldCostParts,

  getStepGoldCostParts,

} from './buildStats';

import ItemPassiveDescription from './ItemPassiveDescription';
import { getTooltipLayout } from './tooltipLayout';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { ITEM_TOOLTIP_DETAIL } from './itemTooltipDetail';
import { isMinimalTooltipDetail } from './tooltipDetail';
import { getItemMinimalDescription, getItemDescriptiveDescription } from './stringTableLookup';



function GoldCostRow({ parts, textStyle, iconStyle }) {

  return (

    <View style={styles.costRow}>

      {!parts.isFree ? (

        <Image

          source={GOLD_ICON}

          style={iconStyle || styles.costGoldIcon}

          contentFit="contain"

          accessibilityLabel="Gold"

        />

      ) : null}

      <Text style={textStyle || styles.costText}>

        {parts.isFree ? parts.label : `${parts.label} Gold`}

      </Text>

    </View>

  );

}



function StatIcon({ statKey, displayName, style }) {

  const src = getStatIcon(statKey, displayName);

  if (!src) return null;

  return (

    <Image

      source={src}

      style={style || styles.statIcon}

      contentFit="contain"

      accessibilityLabel={`${displayName} stat icon`}

    />

  );

}



/** Gold cost row — pin outside scroll on long item tooltips. */
export function ItemTooltipCost({ item, style }) {
  if (!item) return null;

  const { width: screenWidth } = useScreenDimensions();
  const layout = getTooltipLayout(screenWidth);
  const sectionLabelSize = { fontSize: layout.itemSectionLabelSize };

  const showTotalCost = item.totalCost != null && item.totalCost !== '';
  const showStepCost = item.stepCost && !item.totalCost;
  const totalGoldParts = showTotalCost ? getItemGoldCostParts(item) : null;
  const stepGoldParts = showStepCost ? getStepGoldCostParts(item.stepCost) : null;

  if (!totalGoldParts && !stepGoldParts) return null;

  const parts = totalGoldParts || stepGoldParts;

  return (
    <View style={[styles.costSection, styles.costSectionPinned, style]}>
      <Text style={[styles.sectionLabel, sectionLabelSize]}>Cost:</Text>
      <GoldCostRow
        parts={parts}
        textStyle={[styles.costText, { fontSize: layout.itemCostFontSize }]}
      />
    </View>
  );
}

/** Shared item stats / cost / passive body for build and database tooltips. */
export default function ItemTooltipBody({
  item,
  hideCost = false,
  detailLevel = ITEM_TOOLTIP_DETAIL.MINIMAL,
  compact: compactProp,
}) {
  if (!item) return null;

  const { width: screenWidth } = useScreenDimensions();
  const layout = getTooltipLayout(screenWidth);
  const compact = compactProp ?? layout.compact;

  const isMinimal = isMinimalTooltipDetail(detailLevel);

  const passiveText = isMinimal ? getItemMinimalDescription(item) : getItemDescriptiveDescription(item);

  const showTotalCost = item.totalCost != null && item.totalCost !== '';

  const showStepCost = item.stepCost && !item.totalCost;

  const totalGoldParts = showTotalCost ? getItemGoldCostParts(item) : null;

  const stepGoldParts = showStepCost ? getStepGoldCostParts(item.stepCost) : null;



  const statKeys =

    item.stats && typeof item.stats === 'object'

      ? Object.keys(item.stats).filter((statKey) => {

          if (statKey === 'N/A' || statKey === 'NA') return false;

          const v = item.stats[statKey];

          return v !== 0 && v !== '0' && v !== 'N/A';

        })

      : [];



  const isActive = itemHasActiveEffect(item);

  const bodyTextStyle = {
    fontSize: layout.itemBodyFontSize,
    lineHeight: layout.itemBodyLineHeight,
  };
  const statLabelSize = { fontSize: layout.itemStatFontSize };
  const sectionLabelSize = { fontSize: layout.itemSectionLabelSize };
  const passiveGap = layout.itemPassiveGap;
  const sectionGap = layout.itemSectionGap;

  return (

    <>

      {item.active && !isMinimal ? (

        <View style={styles.section}>

          <View style={styles.labelRow}>

            <Image

              source={STAT_ICONS.Active}

              style={styles.effectIcon}

              contentFit="contain"

              accessibilityLabel="Active"

            />

            <Text style={[styles.sectionLabel, sectionLabelSize]}>Type:</Text>

          </View>

          <Text style={[styles.bodyText, bodyTextStyle]}>Active/Consumable</Text>

        </View>

      ) : null}



      {statKeys.length > 0 ? (

        <View style={[styles.statsSection, compact && styles.statsSectionCompact, { marginBottom: sectionGap }]}>

          <Text style={[styles.statsTitle, sectionLabelSize]}>Stats:</Text>

          {statKeys.map((statKey, index) => {

            const statValue = item.stats[statKey];

            const displayName = BUILD_STAT_DISPLAY_NAMES[statKey] || statKey;

            const statColor = getBuildStatColor(statKey, displayName);

            const isLast = index === statKeys.length - 1;

            return (

              <View key={statKey} style={[styles.statRow, isLast && styles.statRowLast, compact && styles.statRowCompact]}>

                <View style={styles.labelRow}>

                  <StatIcon statKey={statKey} displayName={displayName} />

                  <Text style={[styles.statLabel, statLabelSize, { color: statColor }]}>{displayName}:</Text>

                </View>

                <Text style={[styles.statValue, statLabelSize]}>

                  {typeof statValue === 'object' ? JSON.stringify(statValue) : statValue}

                </Text>

              </View>

            );

          })}

        </View>

      ) : null}



      {passiveText ? (

        <View
          style={[
            styles.passiveSection,
            { marginTop: passiveGap, paddingTop: passiveGap },
          ]}
        >

          <Text style={[styles.statsTitle, sectionLabelSize]}>{isActive ? 'Active:' : 'Passive:'}</Text>

          <ItemPassiveDescription
            text={passiveText}
            textStyle={bodyTextStyle}
            bulletMarkWidth={layout.bulletMarkWidth}
            bulletGap={layout.bulletGap}
          />

        </View>

      ) : null}



      {showTotalCost && totalGoldParts && !hideCost ? (

        <View style={[styles.section, styles.costSection, { marginBottom: sectionGap }]}>

          <Text style={[styles.sectionLabel, sectionLabelSize]}>Cost:</Text>

          <GoldCostRow
            parts={totalGoldParts}
            textStyle={[styles.costText, { fontSize: layout.itemCostFontSize }]}
          />

        </View>

      ) : null}



      {showStepCost && stepGoldParts && !hideCost ? (

        <View style={[styles.section, styles.costSection, { marginBottom: sectionGap }]}>

          <Text style={[styles.sectionLabel, sectionLabelSize]}>Cost:</Text>

          <GoldCostRow
            parts={stepGoldParts}
            textStyle={[styles.costText, { fontSize: layout.itemCostFontSize }]}
          />

        </View>

      ) : null}

    </>

  );

}



const styles = StyleSheet.create({

  section: {

    marginBottom: 12,

  },

  costSection: {

    marginTop: 8,

    marginBottom: 0,

    paddingTop: 12,

    borderTopWidth: 1,

    borderTopColor: '#1e3a5f',

  },

  costSectionPinned: {

    flexShrink: 0,

    marginTop: 0,

    paddingTop: 10,

    paddingBottom: 2,

  },

  sectionLabel: {

    color: '#7dd3fc',

    fontSize: 12,

    fontWeight: '700',

    marginBottom: 4,

  },

  costRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

  },

  costGoldIcon: {

    width: 18,

    height: 18,

    flexShrink: 0,

  },

  costText: {

    color: '#fbbf24',

    fontSize: 14,

    fontWeight: '700',

  },

  labelRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

  },

  effectIcon: {

    width: 18,

    height: 18,

    flexShrink: 0,

  },

  bodyText: {

    color: '#cbd5e1',

    fontSize: 13,

    lineHeight: 18,

  },

  statsSection: {

    marginTop: 0,

  },

  statsSectionCompact: {

    marginBottom: 0,

  },

  statsTitle: {

    color: '#7dd3fc',

    fontSize: 12,

    fontWeight: '700',

    marginBottom: 4,

  },

  statRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 6,

    paddingBottom: 6,

    borderBottomWidth: 1,

    borderBottomColor: '#1e3a5f',

  },

  statRowCompact: {

    marginBottom: 4,

    paddingBottom: 4,

  },

  statRowLast: {

    marginBottom: 0,

    paddingBottom: 0,

    borderBottomWidth: 0,

  },

  statIcon: {

    width: 16,

    height: 16,

    flexShrink: 0,

  },

  statLabel: {

    fontSize: 12,

    fontWeight: '600',

    flexShrink: 1,

  },

  statValue: {

    color: '#e6eef8',

    fontSize: 12,

    marginLeft: 8,

  },

  passiveSection: {

    borderTopWidth: 1,

    borderTopColor: '#1e3a5f',

    paddingBottom: 0,

  },

});


