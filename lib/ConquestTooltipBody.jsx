import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { joinHelpTips } from './conquestMapHelpText';
import {
  CONQUEST_INFAMY_THRESHOLDS,
  getBuffHelpTextForLevel,
  getBuffTierHelpKeys,
  getNonBuffHelpKeys,
} from './conquestBuffInfamy';
import { getConquestBuffColor } from './conquestBuffColors';
import {
  formatHoverStatLine,
  formatStatsSection,
} from './conquestMapScaling';
import { UI_THEME } from './uiTheme';

function renownLabel(renown) {
  if (!renown) return 'Base camp (0 team Infamy)';
  return `${renown.toLocaleString()} team Infamy`;
}

/**
 * @param {Object} props
 * @param {import('../app/data/Gamemodes/Conquest/conquestMapPoints').ConquestMapPoint} props.point
 * @param {boolean} props.minimal
 * @param {ReturnType<import('./conquestMapScaling').computeConquestPoiStats>} props.stats
 * @param {number} props.gameTimeMinutes
 * @param {Object|null} props.blueprintMeta
 * @param {Object|null} props.profile
 * @param {number} [props.infamyCampLevel]
 */
export default function ConquestTooltipBody({
  point,
  minimal,
  stats,
  gameTimeMinutes,
  blueprintMeta,
  profile,
  infamyCampLevel = 1,
}) {
  const buffColor = getConquestBuffColor(point, blueprintMeta) || UI_THEME.accentSky;
  const helpTipKeys = point?.helpTipKeys || [];
  const tierKeys = getBuffTierHelpKeys(helpTipKeys);

  if (minimal) {
    const buffText = getBuffHelpTextForLevel(helpTipKeys, infamyCampLevel);
    const statLine = formatHoverStatLine(stats, blueprintMeta);
    const renown = CONQUEST_INFAMY_THRESHOLDS[infamyCampLevel - 1]?.renown ?? 0;
    return (
      <View style={styles.wrap}>
        {blueprintMeta?.buff ? (
          <Text style={styles.body}>
            <Text style={[styles.buffLabel, { color: buffColor }]}>Buff: {blueprintMeta.buff}</Text>
            {blueprintMeta.colorLabel ? (
              <Text style={[styles.buffSublabel, { color: buffColor }]}> ({blueprintMeta.colorLabel})</Text>
            ) : null}
          </Text>
        ) : null}
        {tierKeys.length > 0 ? (
          <Text style={[styles.tierHeader, { color: buffColor }]}>
            Camp level {infamyCampLevel} — {renownLabel(renown)}
          </Text>
        ) : null}
        {buffText ? <Text style={styles.body}>{buffText}</Text> : null}
        {!buffText && blueprintMeta?.description ? (
          <Text style={styles.body}>{blueprintMeta.description}</Text>
        ) : null}
        {!buffText && !blueprintMeta?.description && blueprintMeta?.roleNote ? (
          <Text style={styles.muted}>{blueprintMeta.roleNote}</Text>
        ) : null}
        {statLine && stats?.mode !== 'objective' ? (
          <Text style={styles.stats}>At {gameTimeMinutes} min: {statLine}</Text>
        ) : null}
      </View>
    );
  }

  const extraHelp = joinHelpTips(getNonBuffHelpKeys(helpTipKeys));
  const statSection = formatStatsSection(stats, profile, gameTimeMinutes);
  const isStructure = point.category === 'tower' || point.category === 'phoenix' || point.category === 'titan';
  const selectedBuffText = getBuffHelpTextForLevel(helpTipKeys, infamyCampLevel);
  const selectedRenown = CONQUEST_INFAMY_THRESHOLDS[infamyCampLevel - 1]?.renown ?? 0;

  return (
    <View style={styles.wrap}>
      {blueprintMeta?.roleNote && !isStructure ? (
        <Text style={styles.muted}>{blueprintMeta.roleNote}</Text>
      ) : null}
      {blueprintMeta?.description ? <Text style={styles.body}>{blueprintMeta.description}</Text> : null}

      {tierKeys.length > 0 ? (
        <View style={[styles.tierBlock, styles.tierBlockSelected]}>
          <Text style={[styles.tierHeader, { color: buffColor }]}>
            Camp level {infamyCampLevel} — {renownLabel(selectedRenown)}
          </Text>
          {selectedBuffText ? <Text style={styles.body}>{selectedBuffText}</Text> : null}
        </View>
      ) : !isStructure && extraHelp ? (
        <Text style={styles.body}>{extraHelp}</Text>
      ) : null}

      {point.descriptionExtra?.trim() ? (
        <Text style={styles.body}>{point.descriptionExtra.trim()}</Text>
      ) : null}
      {statSection ? <Text style={styles.stats}>{statSection}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  body: {
    color: UI_THEME.textBody,
    fontSize: 14,
    lineHeight: 21,
  },
  muted: {
    color: UI_THEME.textHint,
    fontSize: 13,
    lineHeight: 20,
  },
  stats: {
    color: UI_THEME.statDelta,
    fontSize: 13,
    lineHeight: 20,
  },
  buffLabel: {
    fontWeight: '700',
    fontSize: 14,
  },
  buffSublabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  tierBlock: {
    gap: 4,
    paddingTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tierBlockSelected: {
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: UI_THEME.borderCyanFill08,
  },
  tierHeader: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  tierHeaderSelected: {
    fontWeight: '800',
  },
});
