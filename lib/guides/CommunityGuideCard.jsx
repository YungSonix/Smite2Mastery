import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getLocalGodAsset, getRemoteGodIconByName } from '../../app/localIcons';
import { COLORS } from '../themeColors';

export default function CommunityGuideCard({ guide, onPress }) {
  const source = (() => {
    const iconPath = guide?.godIconPath || guide?.godIcon || guide?.god_icon || null;
    if (iconPath) {
      const local = getLocalGodAsset(iconPath);
      if (local) return local?.primary || local;
    }
    const byName = getRemoteGodIconByName(guide?.godName || guide?.god_name || '');
    return byName?.primary || byName || null;
  })();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {!!source && <Image source={source} style={styles.godIcon} contentFit="cover" cachePolicy="memory-disk" />}
      <Text style={styles.title}>{guide?.title || 'Untitled Guide'}</Text>
      {!!guide?.subtitle && <Text style={styles.subtitle}>{guide.subtitle}</Text>}
      <Text style={styles.meta}>
        {guide?.authorName || guide?.author_name || guide?.author || 'Unknown'}
        {guide?.patch ? ` • ${guide.patch}` : ''}
      </Text>
      <View style={styles.footer}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{guide?.type === 'role' ? 'Role Guide' : 'God Guide'}</Text>
        </View>
        {guide?.role ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{guide.role}</Text>
          </View>
        ) : null}
        <Text style={styles.footerStat}>▲ {guide?.upvotes || 0}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    padding: 14,
    minHeight: 140,
  },
  title: {
    color: COLORS.slate50,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  godIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.slate700,
  },
  subtitle: {
    color: COLORS.slate400,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  meta: {
    color: COLORS.slate500,
    fontSize: 12,
    marginBottom: 12,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    backgroundColor: COLORS.gray900,
    borderColor: COLORS.slate700,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: {
    color: COLORS.slate300,
    fontSize: 11,
    fontWeight: '700',
  },
  footerStat: {
    marginLeft: 'auto',
    color: COLORS.slate400,
    fontSize: 12,
    fontWeight: '700',
  },
});
