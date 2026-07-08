import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { getLocalGodAsset } from '../app/localIcons';
import { flattenBuildsGods } from './normalizeBuildsGod';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import TierlistEditor from './TierlistEditor';

const IS_WEB = Platform.OS === 'web';

const META_ROLES = [
  { key: 'support', label: 'Support', cardTitle: 'SUPPORT' },
  { key: 'adc', label: 'ADC', cardTitle: 'ADC' },
  { key: 'mid', label: 'Mid', cardTitle: 'MID' },
  { key: 'solo', label: 'Solo', cardTitle: 'SOLO' },
  { key: 'jungle', label: 'Jungle', cardTitle: 'JUNGLE' },
];

const BEGINNER_ROLES = [
  { key: 'beginner_support', label: 'Support', cardTitle: 'BEGINNER SUPPORT' },
  { key: 'beginner_adc', label: 'ADC', cardTitle: 'BEGINNER ADC' },
  { key: 'beginner_mid', label: 'Mid', cardTitle: 'BEGINNER MID' },
  { key: 'beginner_solo', label: 'Solo', cardTitle: 'BEGINNER SOLO' },
  { key: 'beginner_jungle', label: 'Jungle', cardTitle: 'BEGINNER JUNGLE' },
];

const ROLE_COLORS = {
  Support: { bg: '#1a2d24', border: '#10B981', accent: '#10B981' },
  ADC: { bg: '#2d1a3d', border: '#A855F7', accent: '#A855F7' },
  Mid: { bg: '#3d1a1a', border: '#EF4444', accent: '#EF4444' },
  Solo: { bg: '#1a2a3d', border: '#3B82F6', accent: '#3B82F6' },
  Jungle: { bg: '#1a1410', border: '#EA580C', accent: '#EA580C' },
};

const TIER_LETTER_COLORS = {
  S: '#ef4444',
  A: '#f97316',
  B: '#eab308',
  C: '#22c55e',
  D: '#3b82f6',
  F: '#8b5cf6',
};

const PREVIEW_ICONS_PER_TIER = 7;
const CARD_MIN_WIDTH = 210;

function parseMentorGodLabel(label) {
  const raw = String(label || '').trim();
  const match = raw.match(/^(.+?)\s*\(Aspect\)\s*$/i);
  if (match) {
    return { name: match[1].trim(), usesAspect: true };
  }
  return { name: raw, usesAspect: false };
}

function findGodByName(gods, name) {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return null;
  return (
    gods.find((god) => {
      const candidates = [god.godName, god.GodName, god.name, god.title];
      return candidates.some((c) => String(c || '').trim().toLowerCase() === target);
    }) || null
  );
}

function getGodAspectIconSource(god) {
  const aspect = god?.aspect || (god?.baseInformation && god.baseInformation.aspect);
  const iconPath = aspect?.icon;
  if (!iconPath) return null;
  return getLocalGodAsset(iconPath);
}

function tierLetterFromName(tierName) {
  const m = String(tierName || '').match(/^([SABCDEF])/i);
  return m ? m[1].toUpperCase() : '?';
}

function rolePalette(label) {
  return ROLE_COLORS[label] || { bg: '#0b1226', border: '#1e3a5f', accent: '#7dd3fc' };
}

function formatUpdatedAt(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function filterRoleData(roleData, entityType, query) {
  if (!roleData) return null;
  if (entityType === 'item' || entityType === 'ability') return null;

  let list = Array.isArray(roleData.list) ? roleData.list : [];

  if (entityType === 'aspect') {
    list = list
      .map((tier) => ({
        ...tier,
        gods: (tier.gods || []).filter((g) => /\(Aspect\)/i.test(String(g))),
      }))
      .filter((tier) => tier.gods.length > 0);
  }

  const q = String(query || '').trim().toLowerCase();
  if (q) {
    list = list
      .map((tier) => ({
        ...tier,
        gods: (tier.gods || []).filter((g) => String(g).toLowerCase().includes(q)),
      }))
      .filter((tier) => tier.gods.length > 0);
  }

  if (!list.length) return null;
  return { ...roleData, list };
}

function roleMatchesFilter(role, tierCategory, selectedRole) {
  if (selectedRole && role.label !== selectedRole) return false;
  if (tierCategory === 'meta') return !role.key.startsWith('beginner_');
  if (tierCategory === 'newPlayer') return role.key.startsWith('beginner_');
  return true;
}

function formatPatchLabel(patch) {
  const raw = String(patch || '').trim();
  if (!raw) return '—';
  return raw.replace(/^ob/i, 'OB ');
}

function GodMiniIcon({ gods, label, size = 22, showName = false }) {
  const parsed = parseMentorGodLabel(label);
  const god = findGodByName(gods, parsed.name);
  const iconPath =
    god?.icon || god?.GodIcon || (god?.baseInformation && god.baseInformation.icon);
  const icon = iconPath ? getLocalGodAsset(iconPath) : null;
  const aspectIcon = parsed.usesAspect ? getGodAspectIconSource(god) : null;
  const borderRadius = Math.max(4, size * 0.18);
  const badgeSize = Math.max(12, Math.round(size * 0.44));
  const overlaySize = Math.max(8, Math.round(badgeSize * 0.62));
  const displayName = parsed.usesAspect ? `${parsed.name} (Aspect)` : parsed.name;

  const portrait = icon ? (
    <Image
      source={icon}
      style={[
        styles.miniIcon,
        { width: size, height: size, borderRadius },
        parsed.usesAspect && !aspectIcon && styles.miniIconAspect,
      ]}
      contentFit="cover"
      cachePolicy="memory-disk"
      accessibilityLabel={displayName}
    />
  ) : (
    <View style={[styles.miniIconPlaceholder, { width: size, height: size, borderRadius }]}>
      <Text style={[styles.miniIconPlaceholderText, { fontSize: Math.max(8, size * 0.38) }]}>
        {parsed.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  return (
    <View style={[styles.miniIconWrap, showName && styles.miniIconWrapNamed]}>
      <View style={[styles.miniIconPortraitWrap, { width: size, height: size }]}>
        {portrait}
        {aspectIcon ? (
          <View
            style={[
              styles.aspectBadge,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
              },
            ]}
          >
            <Image
              source={aspectIcon}
              style={{ width: overlaySize, height: overlaySize }}
              contentFit="contain"
              cachePolicy="memory-disk"
              accessibilityLabel={`${parsed.name} aspect`}
            />
          </View>
        ) : null}
      </View>
      {showName ? (
        <Text style={styles.miniIconName} numberOfLines={2}>
          {displayName}
        </Text>
      ) : null}
    </View>
  );
}

function TierPreviewRow({ tier, gods, compact }) {
  const godLabels = Array.isArray(tier.gods) ? tier.gods : [];
  const preview = compact ? godLabels.slice(0, PREVIEW_ICONS_PER_TIER) : godLabels;
  const overflow = compact ? Math.max(0, godLabels.length - preview.length) : 0;
  const letter = tierLetterFromName(tier.tierName);
  const tierColor = TIER_LETTER_COLORS[letter] || '#64748b';

  return (
    <View style={styles.tierPreviewRow}>
      <View style={styles.tierPreviewLabelWrap}>
        <View style={[styles.tierPreviewDot, { backgroundColor: tierColor }]} />
        <Text style={styles.tierPreviewLabel} numberOfLines={1}>
          {tier.tierName}
        </Text>
      </View>
      <View style={styles.tierPreviewIcons}>
        {preview.map((label, idx) => (
          <GodMiniIcon key={`${label}-${idx}`} gods={gods} label={label} size={compact ? 22 : 36} />
        ))}
        {overflow > 0 ? (
          <Text style={styles.tierPreviewOverflow}>+{overflow}</Text>
        ) : null}
      </View>
    </View>
  );
}

function RoleSummaryCard({ role, roleData, gods, colors, onPress, cardWidth }) {
  const tiers = Array.isArray(roleData?.list) ? roleData.list : [];
  const updatedLabel = formatUpdatedAt(roleData?.updatedAt);

  return (
    <TouchableOpacity
      style={[
        styles.roleCard,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          width: cardWidth,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.roleCardHeader}>
        <View style={styles.roleCardTitleWrap}>
          <Text style={[styles.roleCardTitle, { color: colors.accent }]}>{role.cardTitle}</Text>
          {updatedLabel ? (
            <Text style={styles.roleCardUpdated}>Updated: {updatedLabel}</Text>
          ) : null}
        </View>
        {roleData?.patch ? (
          <View style={styles.patchChip}>
            <Text style={styles.patchChipText}>{formatPatchLabel(roleData.patch)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.roleCardBody}>
        {tiers.map((tier, idx) => (
          <TierPreviewRow key={`${tier.tierName}-${idx}`} tier={tier} gods={gods} compact />
        ))}
      </View>
    </TouchableOpacity>
  );
}

export default function MentorTierlistsView({
  buildsData,
  tierCategory = 'meta',
  entityType = 'god',
  selectedRole = null,
  query = '',
}) {
  const { width: screenWidth } = useScreenDimensions();
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);

  const gods = useMemo(() => flattenBuildsGods(buildsData?.gods), [buildsData]);

  const mentorDoc = useMemo(() => {
    const list = buildsData?.tierlist;
    if (!Array.isArray(list) || !list.length) return null;
    return list[0];
  }, [buildsData]);

  const activeRoles = useMemo(() => {
    const pool = tierCategory === 'newPlayer' ? BEGINNER_ROLES : META_ROLES;
    return pool.filter((role) => roleMatchesFilter(role, tierCategory, selectedRole));
  }, [tierCategory, selectedRole]);

  useEffect(() => {
    setSelectedRoleKey(null);
  }, [tierCategory, entityType, selectedRole, query]);

  const cardWidth = useMemo(() => {
    const usable = Math.max(280, screenWidth - (IS_WEB ? 48 : 40));
    const cols = Math.max(1, Math.min(5, Math.floor(usable / CARD_MIN_WIDTH)));
    const gap = 10;
    return Math.floor((usable - gap * (cols - 1)) / cols);
  }, [screenWidth]);

  const selectedRoleMeta = useMemo(() => {
    if (!selectedRoleKey) return null;
    return [...META_ROLES, ...BEGINNER_ROLES].find((r) => r.key === selectedRoleKey) || null;
  }, [selectedRoleKey]);

  if (!mentorDoc) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>No mentor tierlists yet</Text>
        <Text style={styles.emptyBody}>
          Tierlists show which gods are strong in each lane. Check back after the next data sync, or browse Featured builds meanwhile.
        </Text>
      </View>
    );
  }

  if (entityType === 'item' || entityType === 'ability') {
    const label = entityType === 'item' ? 'item' : 'ability';
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyBody}>
          Mentor {label} tierlists are not available yet. Try Meta with God selected.
        </Text>
      </View>
    );
  }

  if (selectedRoleMeta && mentorDoc[selectedRoleKey]) {
    const rawRoleData = mentorDoc[selectedRoleKey];
    return (
      <View style={styles.main}>
        <TierlistEditor
          role={selectedRoleMeta}
          roleData={rawRoleData}
          tierCategory={tierCategory}
          gods={gods}
          onBack={() => setSelectedRoleKey(null)}
        />
      </View>
    );
  }

  const visibleCards = activeRoles
    .map((role) => {
      const raw = mentorDoc[role.key];
      const roleData = filterRoleData(raw, entityType, query);
      if (!roleData) return null;
      return { role, roleData };
    })
    .filter(Boolean);

  return (
    <View style={styles.main}>
      <ScrollView
        style={styles.browseScroll}
        contentContainerStyle={styles.cardGrid}
        showsVerticalScrollIndicator={false}
      >
        {visibleCards.length === 0 ? (
          <Text style={styles.emptyBody}>
            No tierlist matches those filters. Try another role or clear search.
          </Text>
        ) : (
          visibleCards.map(({ role, roleData }) => (
            <RoleSummaryCard
              key={role.key}
              role={role}
              roleData={roleData}
              gods={gods}
              colors={rolePalette(role.label)}
              cardWidth={cardWidth}
              onPress={() => setSelectedRoleKey(role.key)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    marginTop: 8,
    zIndex: 0,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  browseScroll: {
    flex: 1,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 24,
  },
  roleCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    minHeight: 168,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  roleCardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  roleCardUpdated: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
  patchChip: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.45)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  patchChipText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '800',
  },
  roleCardBody: {
    gap: 6,
    overflow: 'visible',
  },
  tierPreviewRow: {
    gap: 4,
  },
  tierPreviewLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tierPreviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tierPreviewLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  tierPreviewIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 11,
    overflow: 'visible',
  },
  tierPreviewOverflow: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  miniIcon: {
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#071024',
  },
  miniIconWrap: {
    alignItems: 'center',
  },
  miniIconWrapNamed: {
    width: 72,
  },
  miniIconPortraitWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  aspectBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    zIndex: 2,
    padding: 2,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 2,
    elevation: 3,
  },
  miniIconAspect: {
    borderColor: '#eab308',
    borderWidth: 1.5,
  },
  miniIconName: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 13,
    ...(IS_WEB && { wordBreak: 'break-word' }),
  },
  miniIconPlaceholder: {
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniIconPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '700',
  },
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyBody: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailWrap: {
    flex: 1,
  },
});
