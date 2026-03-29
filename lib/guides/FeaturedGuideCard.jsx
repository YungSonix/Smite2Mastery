import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getLocalGodAsset, getRemoteGodIconByName } from '../../app/localIcons';
import { COLORS } from '../themeColors';

export default function FeaturedGuideCard({ guide, onPress }) {
  const source = (() => {
    const iconPath =
      guide?.godIcon ||
      guide?.god_icon ||
      guide?.god?.icon ||
      guide?.godIconPath ||
      guide?.godIcon;
    if (iconPath) {
      const local = getLocalGodAsset(iconPath);
      if (local) return local?.primary || local || null;
    }
    const byName = getRemoteGodIconByName(guide?.godName || guide?.god_name || '');
    return byName?.primary || byName || null;
  })();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.banner}>
        {source ? (
          <Image source={source} style={styles.bannerImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.bannerFallback}>
            <Text style={styles.bannerFallbackText}>{(guide?.title || '?').charAt(0)}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{guide?.title || 'Untitled Guide'}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {guide?.authorName || guide?.author_name || guide?.author || 'Unknown'}
          {guide?.patch ? ` • ${guide.patch}` : ''}
        </Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Featured</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>▲ {guide?.upvotes || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: COLORS.bgDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    overflow: 'hidden',
    marginRight: 12,
  },
  banner: {
    height: 110,
    backgroundColor: COLORS.bgElevated,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerFallbackText: {
    color: COLORS.slate200,
    fontSize: 34,
    fontWeight: '700',
  },
  body: {
    padding: 12,
  },
  title: {
    color: COLORS.slate50,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    minHeight: 40,
  },
  meta: {
    color: COLORS.slate400,
    fontSize: 12,
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: COLORS.gray900,
    borderColor: COLORS.slate700,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: COLORS.slate300,
    fontSize: 11,
    fontWeight: '700',
  },
});
