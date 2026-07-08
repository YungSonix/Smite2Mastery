import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { UI_THEME } from './uiTheme';
import { getLocalGodAsset, getLocalItemIcon } from '../app/localIcons';
import { flattenBuildsGods } from './normalizeBuildsGod';
import {
  getBuildStatColor,
  parsePatchChangelogStatLine,
  parsePatchStatLine,
  getPatchLineStatColor,
} from './buildStats';
import { getNewGodPatchAsset } from './newGodPatchImages';
import { GAME_MODE_ICONS } from './imageGrabber';

const WM_ART_BG = '#1a2e22';

const IS_WEB = Platform.OS === 'web';

const BUCKET_META = {
  nerfed: { label: 'NERFS', badge: 'NERF', color: '#ef4444', icon: '▼' },
  buffed: { label: 'BUFFS', badge: 'BUFF', color: '#22c55e', icon: '▲' },
  adjusted: { label: 'ADJUSTED', badge: 'ADJUST', color: '#eab308', icon: '↻' },
  shifted: { label: 'SHIFTED', badge: 'SHIFTED', color: '#c084fc', icon: '⇅' },
  new: { label: 'NEW', badge: 'NEW', color: '#a78bfa', icon: '★' },
};

function getEntryAccent(entry, bucket) {
  if (bucket === 'shifted') {
    if (entry.scope === 'aspect') return BUCKET_META.buffed.color;
    if (entry.scope === 'base') return BUCKET_META.nerfed.color;
    return BUCKET_META.shifted.color;
  }
  if (entry.scope === 'aspect') return BUCKET_META.buffed.color;
  if (entry.scope === 'base') return BUCKET_META.nerfed.color;
  return BUCKET_META[bucket]?.color || UI_THEME.accentSky;
}

function isAspectLabel(line) {
  const t = String(line || '').trim();
  if (!/^Aspect of /i.test(t)) return false;
  if (/\s(?:reenabled|buffed|nerfed|adjusted|disabled|restored)\b/i.test(t)) return false;
  return /^Aspect of (?:the )?[A-Za-z]+(?:\s+[A-Za-z]+)*$/i.test(t);
}

function isAspectChangeBlock(change) {
  if (change?.scope === 'aspect') return true;
  if (isAspectLabel(change?.ability)) return true;
  return /^aspect of /i.test(String(change?.ability || '').trim());
}

function renderStatColoredNumberSegments(text, statColor, baseStyle) {
  if (!text) return null;
  return String(text)
    .split(/(\d+(?:\.\d+)?\s*%?)/g)
    .map((part, i) => {
      if (!part) return null;
      if (/^\d/.test(part)) {
        return (
          <Text key={i} style={[baseStyle, { color: statColor, fontWeight: '600' }]}>
            {part}
          </Text>
        );
      }
      return (
        <Text key={i} style={baseStyle}>
          {part}
        </Text>
      );
    });
}

function renderPatchStatValueLine(statLine, style) {
  const color = getBuildStatColor(statLine.statName, statLine.statName);
  return (
    <Text style={style}>
      <Text style={{ color, fontWeight: '600' }}>{statLine.value} </Text>
      <Text style={{ color, fontWeight: '700' }}>{statLine.statName}</Text>
    </Text>
  );
}

function ChangeLineText({ line, style }) {
  const trimmed = String(line || '').trim();
  const changelog = parsePatchChangelogStatLine(trimmed);

  if (changelog) {
    const statColor = getBuildStatColor(changelog.statPhrase, changelog.statPhrase);
    const verbLower = changelog.verb.toLowerCase();
    const verbStyle =
      verbLower === 'increased'
        ? styles.changeBuffWord
        : verbLower === 'reduced' || verbLower === 'decreased' || verbLower === 'lowered'
          ? styles.changeNerfWord
          : null;

    return (
      <Text style={style}>
        <Text style={{ color: statColor, fontWeight: '700' }}>{changelog.statPhrase} </Text>
        {verbStyle ? <Text style={verbStyle}>{changelog.verb}</Text> : <Text>{changelog.verb}</Text>}
        {renderStatColoredNumberSegments(changelog.tail, statColor, style)}
      </Text>
    );
  }

  const statLine = parsePatchStatLine(trimmed);
  if (statLine.value) {
    return renderPatchStatValueLine(statLine, style);
  }

  const lineStatColor = getPatchLineStatColor(trimmed);
  if (lineStatColor && /\d/.test(trimmed)) {
    const parts = trimmed.split(/(\b(?:reduced|increased|decreased)\b)/gi);
    return (
      <Text style={style}>
        {parts.map((part, i) => {
          const lower = part.toLowerCase();
          if (lower === 'reduced' || lower === 'decreased') {
            return (
              <Text key={i} style={styles.changeNerfWord}>
                {part}
              </Text>
            );
          }
          if (lower === 'increased') {
            return (
              <Text key={i} style={styles.changeBuffWord}>
                {part}
              </Text>
            );
          }
          return (
            <Text key={i}>
              {renderStatColoredNumberSegments(part, lineStatColor, style)}
            </Text>
          );
        })}
      </Text>
    );
  }

  const parts = trimmed.split(/(\b(?:reduced|increased|decreased)\b)/gi);

  return (
    <Text style={style}>
      {parts.map((part, i) => {
        const lower = part.toLowerCase();
        if (lower === 'reduced' || lower === 'decreased') {
          return (
            <Text key={i} style={styles.changeNerfWord}>
              {part}
            </Text>
          );
        }
        if (lower === 'increased') {
          return (
            <Text key={i} style={styles.changeBuffWord}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

function inferAspectLabelFromNote(note) {
  if (!note) return null;
  const trimmed = String(note).trim();
  if (isAspectLabel(trimmed)) return trimmed;
  if (!/aspect of/i.test(trimmed)) return null;
  const withoutSuffix = trimmed.replace(
    /\s+(?:reenabled|buffed|nerfed|adjusted|disabled|restored)\b.*$/i,
    ''
  );
  const m = withoutSuffix.match(/^(Aspect of (?:the )?[A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
  return m ? m[1].trim() : withoutSuffix;
}

/** Aspect highlight notes duplicate the aspect chip on ability rows — skip the top note box. */
function shouldShowGodTooltipNote(tooltip) {
  if (!tooltip?.note) return false;
  if (tooltip.type !== 'god') return true;
  if (tooltip.scope !== 'aspect') return true;

  const note = String(tooltip.note).trim();
  if (isAspectLabel(note)) return false;

  const aspectLabel = inferAspectLabelFromNote(note);
  if (!aspectLabel) return true;

  const extra = note.slice(aspectLabel.length).trim();
  if (!extra || /^(buffs?|nerfs?|reenabled|adjusted|disabled|restored)$/i.test(extra)) {
    return false;
  }
  return true;
}

function extractAspectLabelFromLines(lines) {
  return (lines || []).find((line) => isAspectLabel(line)) || null;
}

function cleanAspectName(name) {
  return String(name || '')
    .replace(/\*\*__|__\*\*/g, '')
    .trim();
}

function findGodAspect(god, aspectLabel) {
  if (!god?.aspect) return null;
  if (!aspectLabel) return god.aspect;
  const aspectKey = normalizeMatchKey(cleanAspectName(god.aspect.name));
  const labelKey = normalizeMatchKey(aspectLabel);
  if (!labelKey) return god.aspect;
  if (aspectKey === labelKey || aspectKey.includes(labelKey) || labelKey.includes(aspectKey)) {
    return god.aspect;
  }
  return null;
}

function renderChangeLine(line, key, aspectIcon) {
  const trimmed = typeof line === 'string' ? line.trim() : String(line?.text || '').trim();
  if (!trimmed) return null;

  const depth = typeof line === 'object' && line?.depth ? line.depth : 0;

  if (isAspectLabel(trimmed)) {
    return (
      <View key={key} style={styles.changeAspectChip}>
        {aspectIcon ? (
          <Image source={aspectIcon} style={styles.changeAspectChipIcon} contentFit="contain" />
        ) : null}
        <Text style={styles.changeAspectChipText}>{trimmed}</Text>
      </View>
    );
  }

  return (
    <View
      key={key}
      style={[styles.changeBulletRow, depth > 0 && { paddingLeft: Math.min(depth * 14, 42) }]}
    >
      <Text style={styles.changeBulletMark}>•</Text>
      <ChangeLineText line={trimmed} style={styles.changeBulletText} />
    </View>
  );
}

function renderItemStatLine(line, key) {
  const statLine = parsePatchStatLine(line);
  const color = getBuildStatColor(statLine.statName, statLine.statName);

  return (
    <View key={key} style={styles.changeBulletRow}>
      <Text style={[styles.changeBulletMark, { color }]}>•</Text>
      {statLine.value ? (
        renderPatchStatValueLine(statLine, styles.changeBulletText)
      ) : (
        <Text style={[styles.changeBulletText, { color }]}>{statLine.full}</Text>
      )}
    </View>
  );
}

function itemDetailHasStructure(detail) {
  if (!detail) return false;
  if (detail.hasVersions) return Boolean(detail.old || detail.new);
  const version = detail.new;
  if (!version) return false;
  return (version.stats?.length || 0) + (version.passive?.length || 0) > 0;
}

function passiveTextsEqual(a, b) {
  const sig = (passive) =>
    (passive || [])
      .map((p) => `${p.depth || 0}:${String(p.text || '').trim().toLowerCase()}`)
      .join('|');
  return sig(a) === sig(b);
}

function hasSubstantivePassive(passive) {
  if (!passive?.length) return false;
  return passive.some((p) => {
    const t = String(p.text || '').trim();
    if (!t) return false;
    if (t.endsWith(':')) return passive.some((other) => (other.depth || 0) > (p.depth || 0));
    return true;
  });
}

function shouldShowItemPassive(detail) {
  if (!detail) return false;
  const oldP = detail.old?.passive || [];
  const newP = detail.new?.passive || [];

  if (detail.hasVersions) {
    if (passiveTextsEqual(oldP, newP)) return false;
    return hasSubstantivePassive(oldP) || hasSubstantivePassive(newP);
  }

  return hasSubstantivePassive(newP);
}

function renderItemDetailSections(version, metaLines, renderLine, detail) {
  if (!version) return null;
  const showPassive = shouldShowItemPassive(detail);

  return (
    <View style={styles.itemDetailPanel}>
      {version.stats?.length > 0 ? (
        <View style={styles.itemDetailSection}>
          <Text style={styles.changeSectionLabel}>Stats</Text>
          <View style={styles.changeLinesWrap}>
            {version.stats.map((line, idx) => renderItemStatLine(line, `stat-${idx}`))}
          </View>
        </View>
      ) : null}
      {showPassive && version.passive?.length > 0 ? (
        <View style={styles.itemDetailSection}>
          <Text style={styles.changeSectionLabel}>Passive</Text>
          <View style={styles.changeLinesWrap}>
            {version.passive.map((line, idx) => renderLine(line, `passive-${idx}`))}
          </View>
        </View>
      ) : null}
      {metaLines?.length > 0 ? (
        <View style={[styles.itemDetailSection, !showPassive && styles.itemDetailSectionLast]}>
          <Text style={styles.changeSectionLabel}>Changes</Text>
          <View style={styles.changeLinesWrap}>
            {metaLines.map((line, idx) => renderLine(line, `meta-${idx}`))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function mergeSystemEntries(systems, gameModes) {
  const byName = new Map();
  for (const mode of gameModes || []) {
    const key = normalizeMatchKey(mode.name).toLowerCase();
    byName.set(key, { name: mode.name, changes: mode.changes || [], note: null });
  }
  for (const sys of systems || []) {
    const key = normalizeMatchKey(sys.title).toLowerCase();
    const existing = byName.get(key) || { name: sys.title, changes: [] };
    byName.set(key, { ...existing, name: sys.title, note: sys.note || existing.note });
  }
  return Array.from(byName.values());
}

function getGameModeIcon(name) {
  const key = String(name || '').toLowerCase();
  if (key.includes('conquest')) return GAME_MODE_ICONS.conquest;
  if (key.includes('assault')) return GAME_MODE_ICONS.assault;
  if (key.includes('arena')) return GAME_MODE_ICONS.arena;
  if (key.includes('joust')) return GAME_MODE_ICONS.joust;
  if (key.includes('duel')) return GAME_MODE_ICONS.duel;
  return null;
}

function normalizeMatchKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B`´]/g, "'")
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\s*\([^)]+\)$/, '')
    .trim();
}

function flattenItems(items) {
  if (!items) return [];
  return items.flat(Infinity).filter(Boolean);
}

export default function PatchHubSimpleSummary({ summary, buildsData, screenWidth = 400 }) {
  const [tooltip, setTooltip] = useState(null);
  const [itemVersionView, setItemVersionView] = useState('new');

  useEffect(() => {
    setItemVersionView('new');
  }, [tooltip?.type, tooltip?.name, tooltip?.gridKey]);

  const findGodByName = useMemo(() => {
    if (!buildsData) return () => null;
    const gods = flattenBuildsGods(buildsData.gods);
    const map = new Map();
    gods.forEach((god) => {
      const name = god.name || god.GodName;
      if (name) {
        map.set(name.toLowerCase(), god);
        if (name.toLowerCase().includes('mulan')) map.set('mulan', god);
        if (name.toLowerCase().includes('ne zha') || name.toLowerCase() === 'nezha') {
          map.set('ne zha', god);
          map.set('nezha', god);
        }
      }
    });
    return (name) => map.get((name || '').toLowerCase()) || map.get('mulan') || null;
  }, [buildsData]);

  const findItemByName = useMemo(() => {
    if (!buildsData) return () => null;
    const items = flattenItems(buildsData.items);
    const map = new Map();
    const slug = (s) => normalizeMatchKey(s).replace(/[^a-z0-9]/g, '');
    items.forEach((item) => {
      if (item.name) {
        map.set(normalizeMatchKey(item.name), item);
        map.set(slug(item.name), item);
      }
      if (item.internalName) {
        map.set(normalizeMatchKey(item.internalName), item);
        map.set(slug(item.internalName), item);
      }
    });
    return (name) => {
      const key = normalizeMatchKey(name);
      const keySlug = slug(name);
      let item = map.get(key) || map.get(slug(name));
      if (item) return item;
      item = map.get(normalizeMatchKey(`The ${name}`)) || map.get(slug(`The ${name}`));
      if (item) return item;
      for (const [k, v] of map.entries()) {
        if (k === keySlug || k.includes(keySlug) || keySlug.includes(k)) return v;
        if (k === slug(`the ${name}`)) return v;
      }
      return null;
    };
  }, [buildsData]);

  const systemEntries = useMemo(
    () => mergeSystemEntries(summary?.systems, summary?.gameModes),
    [summary?.systems, summary?.gameModes]
  );

  const modalBodyMaxHeight = useMemo(() => {
    const { height } = Dimensions.get('window');
    return Math.max(280, Math.floor(height * 0.52));
  }, [screenWidth]);

  const heroScorecard = useMemo(() => {
    const entry = summary?.newGods?.find((g) => g.featuredImage);
    if (!entry?.featuredImage) return null;
    const asset = getNewGodPatchAsset(entry.featuredImage);
    if (!asset?.scorecard) return null;
    return {
      source: asset.scorecard,
      aspectRatio: asset.scorecardAspectRatio ?? 180 / 52,
      label: entry.title || entry.name,
    };
  }, [summary?.newGods]);

  const findAbility = (god, abilityName) => {
    if (!god || !abilityName) return null;
    const clean = normalizeMatchKey(abilityName);
    if (!clean) return null;
    if (
      normalizeMatchKey(god.passive?.name).includes(clean) ||
      clean.includes('passive')
    ) {
      return god.passive;
    }
    if (
      normalizeMatchKey(god.aspect?.name).includes(clean) ||
      clean.includes('aspect')
    ) {
      return god.aspect;
    }
    for (const ab of Object.values(god.abilities || {})) {
      const n = normalizeMatchKey(ab.name);
      if (n === clean || n.includes(clean) || clean.includes(n)) return ab;
    }
    return null;
  };

  if (!summary) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No patch summary available.</Text>
      </View>
    );
  }

  const isMobile = screenWidth < 520;
  const itemIconSize = isMobile ? 38 : 48;
  const iconCols = screenWidth >= 640 ? 6 : screenWidth >= 400 ? 5 : 3;
  const godColsFull = isMobile
    ? screenWidth >= 360
      ? 5
      : 4
    : screenWidth >= 900
      ? 8
      : screenWidth >= 720
        ? 7
        : iconCols;
  const godColsSplit = isMobile ? godColsFull : 4;
  const godGridCols = (columnsInRow) =>
    isMobile || columnsInRow <= 1 ? godColsFull : godColsSplit;
  const godIconSize = isMobile ? (godColsFull >= 5 ? 36 : 40) : 56;
  const itemIconCols = isMobile ? 4 : screenWidth >= 720 ? 8 : iconCols;

  const renderSectionHeader = (label, color, count, compact, arrowIcon) => (
    <View style={[styles.sectionHeaderRow, compact && styles.sectionHeaderCompact]}>
      <View style={[styles.sectionRule, { backgroundColor: color }, compact && styles.sectionRuleCompact]} />
      {arrowIcon ? (
        <Text
          style={[styles.sectionHeaderArrow, { color }, compact && styles.sectionHeaderArrowCompact]}
          accessibilityLabel={arrowIcon === '▲' ? 'Buffs' : arrowIcon === '▼' ? 'Nerfs' : undefined}
        >
          {arrowIcon}
        </Text>
      ) : null}
      <Text style={[styles.sectionHeaderLabel, { color }, compact && styles.sectionHeaderLabelCompact]}>
        {label}
      </Text>
      {count != null && <Text style={[styles.sectionCount, { color }]}>({count})</Text>}
      <View style={[styles.sectionRule, { backgroundColor: color, flex: 1 }, compact && styles.sectionRuleCompact]} />
    </View>
  );

  const renderIconCell = (key, cellWidthPct, onPress, children) => (
    <View
      key={key}
      style={[
        styles.iconCell,
        { width: `${cellWidthPct}%` },
        isMobile && styles.iconCellMobile,
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.iconCellHit, pressed && styles.iconCellHitPressed]}
        onPress={onPress}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    </View>
  );

  const renderGodIcon = (entry, columnCount) => {
    const bucket = entry.bucket || 'adjusted';
    const god = findGodByName(entry.name);
    const iconPath = god?.icon || god?.GodIcon;
    const localIcon = iconPath ? getLocalGodAsset(iconPath) : null;
    const accent = getEntryAccent(entry, bucket);
    const showAspectBadge = entry.scope === 'aspect' || Boolean(entry.aspectLabel);
    const aspectRef = findGodAspect(
      god,
      entry.aspectLabel || (entry.scope === 'aspect' ? entry.note : null)
    );
    const aspectIconSrc = aspectRef?.icon ? getLocalGodAsset(aspectRef.icon) : null;
    const badgeSize = Math.max(16, Math.round(godIconSize * 0.38));
    const cols = columnCount || iconCols;

    return renderIconCell(
      entry.gridKey || `${bucket}-${entry.name}-${entry.scope || 'full'}`,
      100 / cols,
      () => {
        if (entry.onPress) {
          entry.onPress();
          return;
        }
        setTooltip({
          type: 'god',
          name: entry.name,
          bucket,
          scope: entry.scope,
          aspectLabel: entry.aspectLabel,
          changes: entry.changes || [],
          note: entry.note,
          featuredImage: entry.featuredImage,
        });
      },
      <>
        <View
          style={[
            styles.iconRing,
            styles.godIconRing,
            {
              borderColor: accent,
              width: godIconSize,
              height: godIconSize,
              borderRadius: godIconSize / 2,
            },
          ]}
        >
          <View style={[styles.godIconClip, { borderRadius: godIconSize / 2 }]}>
            {localIcon ? (
              <Image source={localIcon} style={styles.godIcon} contentFit="cover" />
            ) : (
              <View style={[styles.iconFallback, { backgroundColor: accent + '33' }]}>
                <Text style={[styles.iconFallbackText, { color: accent }]}>{entry.name.charAt(0)}</Text>
              </View>
            )}
          </View>
          {showAspectBadge && aspectIconSrc ? (
            <View
              style={[
                styles.gridAspectBadge,
                {
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: badgeSize / 2,
                  bottom: -Math.round(badgeSize * 0.15),
                  right: -Math.round(badgeSize * 0.15),
                },
              ]}
              pointerEvents="none"
            >
              <Image
                source={aspectIconSrc}
                style={{ width: badgeSize - 6, height: badgeSize - 6 }}
                contentFit="contain"
                accessibilityLabel={
                  aspectRef?.name ? cleanAspectName(aspectRef.name) : 'Aspect'
                }
              />
            </View>
          ) : null}
        </View>
        <Text style={[styles.iconLabel, isMobile && styles.iconLabelMobile]} numberOfLines={2}>
          {entry.displayName || entry.name}
        </Text>
      </>
    );
  };

  const renderItemIcon = (entry) => {
    const bucket = entry.bucket || 'adjusted';
    const item = findItemByName(entry.name);
    const localIcon = item?.icon ? getLocalItemIcon(item.icon) : null;
    const src = localIcon?.primary || localIcon?.fallback || localIcon;
    const accent = BUCKET_META[bucket]?.color || UI_THEME.accentSky;

    return renderIconCell(
      entry.gridKey || `item-${bucket}-${entry.name}`,
      100 / itemIconCols,
      () =>
        setTooltip({
          type: 'item',
          name: entry.name,
          bucket,
          lines: entry.lines || [],
          detail: entry.detail || null,
          note: entry.note,
        }),
      <>
        <View
          style={[
            styles.iconRing,
            styles.itemRing,
            {
              borderColor: accent,
              width: itemIconSize,
              height: itemIconSize,
              borderRadius: 10,
            },
          ]}
        >
          {src ? (
            <Image source={src} style={styles.itemIcon} contentFit="cover" />
          ) : (
            <View style={[styles.iconFallback, { backgroundColor: accent + '33' }]}>
              <Text style={[styles.iconFallbackText, { color: accent }]}>{entry.name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.iconLabel, isMobile && styles.iconLabelMobile]} numberOfLines={2}>
          {entry.name}
        </Text>
      </>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.heroHeader}>
        {heroScorecard ? (
          <View
            style={[
              styles.heroScorecardWrap,
              { aspectRatio: heroScorecard.aspectRatio },
            ]}
          >
            <Image
              source={heroScorecard.source}
              style={[styles.heroScorecard, IS_WEB && styles.heroScorecardWeb]}
              contentFit="cover"
              transition={0}
              accessibilityLabel={heroScorecard.label}
            />
          </View>
        ) : null}
        <Text style={styles.heroPatch}>
          <Text style={styles.heroPatchLabel}>{summary.patchLabel}</Text>
          <Text style={styles.heroPatchRest}> PATCH NOTES</Text>
        </Text>
        {summary.releaseDate ? (
          <Text style={styles.heroDate}>{summary.releaseDate}</Text>
        ) : null}
        {summary.summaryLine ? (
          <Text style={styles.heroSummary}>{summary.summaryLine}</Text>
        ) : null}
      </View>

      {/* NEW */}
      {(summary.newGods?.length > 0 ||
        summary.newAspects?.length > 0 ||
        summary.wanderingMarket?.length > 0) && (
        <View style={styles.block}>
          {renderSectionHeader('NEW', '#a78bfa', null)}
          {summary.newGods?.length > 0 && (
            <View style={styles.iconGrid}>
              {summary.newGods.map((g) =>
                renderGodIcon(
                  {
                    name: g.name,
                    gridKey: `new-god-${g.name}`,
                    bucket: 'new',
                    scope: 'full',
                    changes: g.changes || [],
                    note: g.note,
                    featuredImage: g.featuredImage,
                    displayName: g.title || g.name,
                  },
                  godColsFull
                )
              )}
            </View>
          )}
          {summary.newAspects?.length > 0 && (
            <View style={styles.aspectRow}>
              {summary.newAspects.map((a) => (
                <View key={a.name} style={styles.aspectChip}>
                  <Text style={styles.aspectChipText}>
                    {a.god} — {a.name}
                    {a.releaseDate ? ` · ${a.releaseDate}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {summary.wanderingMarket?.length > 0 && (
            <>
              {renderSectionHeader(
                'NEW PRISMS',
                '#a78bfa',
                summary.wanderingMarket.length,
                true
              )}
              <View style={styles.iconGrid}>
              {summary.wanderingMarket.map((wm) =>
                renderGodIcon(
                  {
                    name: wm.god || wm.title,
                    gridKey: `wm-${wm.title}`,
                    bucket: 'new',
                    displayName: wm.god || wm.title,
                    note: wm.title,
                    onPress: () =>
                      setTooltip({
                        type: 'wanderingMarket',
                        name: wm.title,
                        lines: wm.premiumUnlocks || [],
                      }),
                  },
                  godColsFull
                )
              )}
            </View>
            </>
          )}
        </View>
      )}

      {(summary.gods?.nerfed?.length > 0 || summary.gods?.buffed?.length > 0) && (
        <View style={styles.block}>
          <View style={[styles.dualBalanceRow, isMobile && styles.dualBalanceRowMobile]}>
            {summary.gods?.nerfed?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  'NERFS',
                  BUCKET_META.nerfed.color,
                  summary.gods.nerfed.length,
                  true,
                  BUCKET_META.nerfed.icon
                )}
                <View style={styles.iconGrid}>
                  {summary.gods.nerfed.map((g) =>
                    renderGodIcon(
                      g,
                      godGridCols(
                        (summary.gods?.nerfed?.length > 0 ? 1 : 0) +
                          (summary.gods?.buffed?.length > 0 ? 1 : 0)
                      )
                    )
                  )}
                </View>
              </View>
            )}
            {summary.gods?.buffed?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  'BUFFS',
                  BUCKET_META.buffed.color,
                  summary.gods.buffed.length,
                  true,
                  BUCKET_META.buffed.icon
                )}
                <View style={styles.iconGrid}>
                  {summary.gods.buffed.map((g) =>
                    renderGodIcon(
                      g,
                      godGridCols(
                        (summary.gods?.nerfed?.length > 0 ? 1 : 0) +
                          (summary.gods?.buffed?.length > 0 ? 1 : 0)
                      )
                    )
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {(summary.gods?.shifted?.length > 0 || summary.gods?.adjusted?.length > 0) && (
        <View style={styles.block}>
          <View style={[styles.dualBalanceRow, isMobile && styles.dualBalanceRowMobile]}>
            {summary.gods?.shifted?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  'SHIFTED',
                  BUCKET_META.shifted.color,
                  summary.gods.shifted.length,
                  true,
                  BUCKET_META.shifted.icon
                )}
                <View style={styles.iconGrid}>
                  {summary.gods.shifted.map((g) =>
                    renderGodIcon(
                      g,
                      godGridCols(
                        (summary.gods?.shifted?.length > 0 ? 1 : 0) +
                          (summary.gods?.adjusted?.length > 0 ? 1 : 0)
                      )
                    )
                  )}
                </View>
              </View>
            )}
            {summary.gods?.adjusted?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  BUCKET_META.adjusted.label,
                  BUCKET_META.adjusted.color,
                  summary.gods.adjusted.length,
                  true,
                  BUCKET_META.adjusted.icon
                )}
                {summary.balanceIntro ? (
                  <Text style={styles.balanceIntroText}>{summary.balanceIntro}</Text>
                ) : null}
                <View style={styles.iconGrid}>
                  {summary.gods.adjusted.map((g) =>
                    renderGodIcon(
                      g,
                      godGridCols(
                        (summary.gods?.shifted?.length > 0 ? 1 : 0) +
                          (summary.gods?.adjusted?.length > 0 ? 1 : 0)
                      )
                    )
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {summary.items?.new?.length > 0 && (
        <View style={styles.block}>
          {renderSectionHeader('NEW ITEMS', BUCKET_META.new.color, summary.items.new.length, false, BUCKET_META.new.icon)}
          <View style={styles.iconGrid}>
            {summary.items.new.map((entry) => renderItemIcon(entry))}
          </View>
        </View>
      )}

      {(summary.items?.nerfed?.length > 0 || summary.items?.buffed?.length > 0) && (
        <View style={styles.block}>
          <View style={[styles.dualBalanceRow, isMobile && styles.dualBalanceRowMobile]}>
            {summary.items?.nerfed?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  'ITEM NERFS',
                  BUCKET_META.nerfed.color,
                  summary.items.nerfed.length,
                  true,
                  BUCKET_META.nerfed.icon
                )}
                <View style={styles.iconGrid}>
                  {summary.items.nerfed.map((entry) => renderItemIcon(entry))}
                </View>
              </View>
            )}
            {summary.items?.buffed?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  'ITEM BUFFS',
                  BUCKET_META.buffed.color,
                  summary.items.buffed.length,
                  true,
                  BUCKET_META.buffed.icon
                )}
                <View style={styles.iconGrid}>
                  {summary.items.buffed.map((entry) => renderItemIcon(entry))}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {(summary.items?.shifted?.length > 0 || summary.items?.adjusted?.length > 0) && (
        <View style={styles.block}>
          <View style={[styles.dualBalanceRow, isMobile && styles.dualBalanceRowMobile]}>
            {summary.items?.shifted?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  'ITEM SHIFTED',
                  BUCKET_META.shifted.color,
                  summary.items.shifted.length,
                  true,
                  BUCKET_META.shifted.icon
                )}
                <View style={styles.iconGrid}>
                  {summary.items.shifted.map((entry) => renderItemIcon(entry))}
                </View>
              </View>
            )}
            {summary.items?.adjusted?.length > 0 && (
              <View style={styles.dualBalanceCol}>
                {renderSectionHeader(
                  'ITEM ADJUSTED',
                  BUCKET_META.adjusted.color,
                  summary.items.adjusted.length,
                  true,
                  BUCKET_META.adjusted.icon
                )}
                <View style={styles.iconGrid}>
                  {summary.items.adjusted.map((entry) => renderItemIcon(entry))}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {(systemEntries.length > 0) && (
        <View style={styles.block}>
          {renderSectionHeader('SYSTEMS', '#94a3b8', null)}
          <View style={styles.systemsGrid}>
            {systemEntries.map((entry) => {
              const modeIcon = getGameModeIcon(entry.name);
              const tappable = (entry.changes?.length || 0) > 0;
              const openModeTooltip = () =>
                setTooltip({
                  type: 'gameMode',
                  name: entry.name,
                  changes: entry.changes,
                });
              const inner = (
                <View style={styles.systemCardInner}>
                  {modeIcon ? (
                    <View style={styles.systemCardIconWrap}>
                      <Image
                        source={modeIcon}
                        style={styles.systemCardIcon}
                        contentFit="cover"
                        accessibilityLabel={entry.name}
                      />
                    </View>
                  ) : null}
                  <View style={styles.systemCardBody}>
                    <Text style={styles.systemCardTitle}>{entry.name}</Text>
                    {entry.note ? (
                      <Text style={styles.systemCardNote}>{entry.note}</Text>
                    ) : null}
                    {tappable ? (
                      <Text style={styles.systemCardHint}>Tap for full patch notes</Text>
                    ) : null}
                  </View>
                  {tappable ? <Text style={styles.systemCardChevron}>›</Text> : null}
                </View>
              );
              if (tappable) {
                return (
                  <Pressable
                    key={entry.name}
                    style={({ pressed }) => [
                      styles.systemCard,
                      pressed && styles.systemCardPressed,
                      IS_WEB && styles.systemCardWeb,
                    ]}
                    onPress={openModeTooltip}
                    accessibilityRole="button"
                  >
                    {inner}
                  </Pressable>
                );
              }
              return (
                <View key={entry.name} style={styles.systemCard}>
                  {inner}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <Modal visible={tooltip !== null} transparent animationType="fade" onRequestClose={() => setTooltip(null)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTooltip(null)}
            accessibilityLabel="Close dialog"
          />
          <View style={styles.modalCard}>
            {tooltip && (() => {
              const headerGod =
                tooltip.type === 'god' ? findGodByName(tooltip.name) : null;
              const headerItem =
                tooltip.type === 'item' ? findItemByName(tooltip.name) : null;
              const headerGodPath = headerGod?.icon || headerGod?.GodIcon;
              const headerGodSrc = headerGodPath ? getLocalGodAsset(headerGodPath) : null;
              const newGodPatchAsset = tooltip.featuredImage
                ? getNewGodPatchAsset(tooltip.featuredImage)
                : null;
              const headerNewGodSrc =
                newGodPatchAsset?.scorecard || newGodPatchAsset?.source || null;
              const headerGodDisplaySrc =
                tooltip.type === 'god' && headerNewGodSrc ? headerNewGodSrc : headerGodSrc;
              const headerGodUsesScorecard =
                tooltip.type === 'god' && Boolean(newGodPatchAsset);
              const headerItemLocal = headerItem?.icon
                ? getLocalItemIcon(headerItem.icon)
                : null;
              const headerItemSrc =
                headerItemLocal?.primary || headerItemLocal?.fallback || headerItemLocal;
              const headerAccent =
                tooltip.bucket && BUCKET_META[tooltip.bucket]
                  ? tooltip.bucket === 'shifted'
                    ? getEntryAccent(
                        { scope: tooltip.scope, aspectLabel: tooltip.aspectLabel },
                        'shifted'
                      )
                    : BUCKET_META[tooltip.bucket].color
                  : UI_THEME.accentSky;
              const showHeaderIcon =
                (tooltip.type === 'god' && (headerGodDisplaySrc || tooltip.name)) ||
                (tooltip.type === 'item' && (headerItemSrc || tooltip.name));

              return (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderMain}>
                    {showHeaderIcon ? (
                      <View
                        style={[
                          styles.modalEntityIconRing,
                          tooltip.type === 'god'
                            ? headerGodUsesScorecard
                              ? styles.modalEntityIconRingScorecard
                              : styles.modalEntityIconRingGod
                            : styles.modalEntityIconRingItem,
                          { borderColor: headerAccent },
                        ]}
                      >
                        {tooltip.type === 'god' && headerGodDisplaySrc ? (
                          <Image
                            source={headerGodDisplaySrc}
                            style={
                              headerGodUsesScorecard
                                ? styles.modalScorecardIcon
                                : styles.modalGodIcon
                            }
                            contentFit="cover"
                            accessibilityLabel={tooltip.name}
                          />
                        ) : tooltip.type === 'item' && headerItemSrc ? (
                          <Image
                            source={headerItemSrc}
                            style={styles.modalItemIcon}
                            contentFit="cover"
                            accessibilityLabel={tooltip.name}
                          />
                        ) : (
                          <View
                            style={[
                              styles.modalEntityIconFallback,
                              { backgroundColor: headerAccent + '33' },
                            ]}
                          >
                            <Text style={[styles.modalEntityIconFallbackText, { color: headerAccent }]}>
                              {tooltip.name.charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null}
                  <View style={styles.modalTitleWrap}>
                    <Text style={styles.modalTitle}>{tooltip.name}</Text>
                    <View style={styles.modalHeaderBadgeRow}>
                      {tooltip.bucket && BUCKET_META[tooltip.bucket] ? (
                        <View
                          style={[
                            styles.modalBucketBadge,
                            {
                              borderColor:
                                tooltip.bucket === 'shifted'
                                  ? getEntryAccent(
                                      { scope: tooltip.scope, aspectLabel: tooltip.aspectLabel },
                                      'shifted'
                                    )
                                  : BUCKET_META[tooltip.bucket].color,
                              backgroundColor:
                                (tooltip.bucket === 'shifted'
                                  ? getEntryAccent(
                                      { scope: tooltip.scope, aspectLabel: tooltip.aspectLabel },
                                      'shifted'
                                    )
                                  : BUCKET_META[tooltip.bucket].color) + '18',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalBucketText,
                              {
                                color:
                                  tooltip.bucket === 'shifted'
                                    ? getEntryAccent(
                                        { scope: tooltip.scope, aspectLabel: tooltip.aspectLabel },
                                        'shifted'
                                      )
                                    : BUCKET_META[tooltip.bucket].color,
                              },
                            ]}
                          >
                            {tooltip.bucket === 'shifted'
                              ? BUCKET_META.shifted.icon
                              : BUCKET_META[tooltip.bucket].icon}{' '}
                            {tooltip.bucket === 'shifted'
                              ? BUCKET_META.shifted.badge
                              : BUCKET_META[tooltip.bucket].badge ||
                                BUCKET_META[tooltip.bucket].label}
                          </Text>
                        </View>
                      ) : null}
                      {tooltip.type === 'item' && tooltip.detail?.hasVersions ? (
                        <Pressable
                          style={styles.itemVersionToggleCompact}
                          onPress={() =>
                            setItemVersionView((v) => (v === 'new' ? 'old' : 'new'))
                          }
                          accessibilityRole="button"
                          accessibilityLabel={
                            itemVersionView === 'new'
                              ? 'Show old item version'
                              : 'Show new item version'
                          }
                        >
                          <Text style={styles.itemVersionToggleText}>
                            {itemVersionView === 'new' ? 'Show Old version' : 'Show New version'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTooltip(null)}
                    hitSlop={12}
                    style={styles.modalCloseBtn}
                  >
                    <Text style={styles.modalClose}>×</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={[styles.modalBody, { maxHeight: modalBodyMaxHeight }]}
                  contentContainerStyle={styles.modalBodyContent}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                >
                  {shouldShowGodTooltipNote(tooltip) ? (() => {
                    const noteGod = tooltip.type === 'god' ? findGodByName(tooltip.name) : null;
                    const noteAspect = findGodAspect(noteGod, tooltip.note);
                    const noteAspectIcon = noteAspect?.icon
                      ? getLocalGodAsset(noteAspect.icon)
                      : null;
                    return (
                      <View style={styles.modalNotePanel}>
                        {noteAspectIcon ? (
                          <View style={styles.modalNoteAspectBadge}>
                            <Image
                              source={noteAspectIcon}
                              style={styles.modalNoteAspectIcon}
                              contentFit="contain"
                            />
                          </View>
                        ) : null}
                        <Text style={[styles.modalNote, noteAspectIcon && styles.modalNoteWithIcon]}>
                          {tooltip.note}
                        </Text>
                      </View>
                    );
                  })() : null}
                  {tooltip.type === 'god' &&
                    (tooltip.changes || []).map((change, idx) => {
                      const god = findGodByName(tooltip.name);
                      const bucketColor =
                        tooltip.bucket === 'shifted'
                          ? getEntryAccent(
                              { scope: tooltip.scope, aspectLabel: tooltip.aspectLabel },
                              'shifted'
                            )
                          : BUCKET_META[tooltip.bucket]?.color || UI_THEME.accentSky;
                      const aspectAccent = '#a78bfa';

                      if (isAspectChangeBlock(change)) {
                        const aspectLabel =
                          inferAspectLabelFromNote(change.ability) ||
                          tooltip.aspectLabel ||
                          change.ability;
                        const aspectRef = findGodAspect(god, aspectLabel);
                        const aspectIconSrc = aspectRef?.icon
                          ? getLocalGodAsset(aspectRef.icon)
                          : null;
                        const releaseNote = String(change.ability || '')
                          .slice(aspectLabel.length)
                          .trim();

                        return (
                          <View key={idx} style={[styles.changeBlock, styles.aspectChangeBlock]}>
                            <View style={styles.changeHeader}>
                              <View style={styles.modalAbilityIconWrap}>
                                {aspectIconSrc ? (
                                  <Image
                                    source={aspectIconSrc}
                                    style={[
                                      styles.modalAbilityIcon,
                                      styles.modalAspectMainIcon,
                                      { borderColor: aspectAccent + '88' },
                                    ]}
                                    contentFit="contain"
                                  />
                                ) : (
                                  <View
                                    style={[
                                      styles.modalAbilityFallback,
                                      { borderColor: aspectAccent + '88' },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.modalAbilityFallbackText,
                                        { color: aspectAccent },
                                      ]}
                                    >
                                      A
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.aspectChangeHeaderText}>
                                <Text style={styles.changeAspectSectionLabel}>ASPECT</Text>
                                <Text style={[styles.changeAbilityName, { color: aspectAccent }]}>
                                  {aspectLabel}
                                </Text>
                                {releaseNote ? (
                                  <Text style={styles.aspectReleaseNote}>{releaseNote}</Text>
                                ) : null}
                              </View>
                            </View>
                            {(change.lines || []).length > 0 ? (
                              <View style={styles.changeLinesWrap}>
                                {(change.lines || []).map((line, li) =>
                                  renderChangeLine(line, li, aspectIconSrc)
                                )}
                              </View>
                            ) : null}
                            {(change.subAbilities || []).map((sub, si) => {
                              const subAbility = findAbility(god, sub.ability);
                              const subIcon = subAbility?.icon
                                ? getLocalGodAsset(subAbility.icon)
                                : null;
                              return (
                                <View key={si} style={styles.aspectSubAbilityBlock}>
                                  <View style={styles.changeHeader}>
                                    <View style={styles.modalAbilityIconWrap}>
                                      {subIcon ? (
                                        <Image
                                          source={subIcon}
                                          style={[
                                            styles.modalAbilityIcon,
                                            styles.modalAspectSubIcon,
                                            { borderColor: aspectAccent + '55' },
                                          ]}
                                          contentFit="cover"
                                        />
                                      ) : (
                                        <View
                                          style={[
                                            styles.modalAbilityFallback,
                                            styles.modalAspectSubIcon,
                                            { borderColor: aspectAccent + '55' },
                                          ]}
                                        >
                                          <Text style={styles.modalAbilityFallbackText}>
                                            {(sub.ability || '?').charAt(0)}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                    <View style={styles.aspectChangeHeaderText}>
                                      <Text style={styles.aspectSubAbilityKind}>Aspect ability</Text>
                                      <Text
                                        style={[
                                          styles.changeAbilityName,
                                          styles.aspectSubAbilityName,
                                          { color: aspectAccent },
                                        ]}
                                      >
                                        {sub.ability}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.changeLinesWrap}>
                                    {(sub.lines || []).map((line, li) =>
                                      renderChangeLine(line, li, aspectIconSrc)
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        );
                      }

                      const ability = findAbility(god, change.ability);
                      const abIcon = ability?.icon ? getLocalGodAsset(ability.icon) : null;
                      const aspectLabel =
                        tooltip.aspectLabel ||
                        extractAspectLabelFromLines(change.lines) ||
                        (isAspectLabel(tooltip.note) ? tooltip.note : null);
                      const aspectRef = findGodAspect(god, aspectLabel);
                      const aspectIconSrc = aspectRef?.icon
                        ? getLocalGodAsset(aspectRef.icon)
                        : null;
                      const showAspectBadge = Boolean(aspectIconSrc && aspectLabel);
                      return (
                        <View key={idx} style={styles.changeBlock}>
                          <View style={styles.changeHeader}>
                            <View style={styles.modalAbilityIconWrap}>
                              {abIcon ? (
                                <Image
                                  source={abIcon}
                                  style={[styles.modalAbilityIcon, { borderColor: bucketColor + '66' }]}
                                  contentFit="cover"
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.modalAbilityFallback,
                                    { borderColor: bucketColor + '66' },
                                  ]}
                                >
                                  <Text style={styles.modalAbilityFallbackText}>
                                    {(change.ability || '?').charAt(0)}
                                  </Text>
                                </View>
                              )}
                              {showAspectBadge ? (
                                <View style={styles.modalAspectBadge} pointerEvents="none">
                                  <Image
                                    source={aspectIconSrc}
                                    style={styles.modalAspectBadgeIcon}
                                    contentFit="contain"
                                    accessibilityLabel={
                                      aspectRef?.name
                                        ? cleanAspectName(aspectRef.name)
                                        : 'Aspect'
                                    }
                                  />
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.changeAbilityName, { color: bucketColor }]}>
                              {change.ability}
                            </Text>
                          </View>
                          <View style={styles.changeLinesWrap}>
                            {(change.lines || []).map((line, li) =>
                              renderChangeLine(line, li, aspectIconSrc)
                            )}
                          </View>
                        </View>
                      );
                    })}
                  {tooltip.type === 'item' && (() => {
                    const detail = tooltip.detail;
                    const structured = itemDetailHasStructure(detail);
                    const activeVersion =
                      itemVersionView === 'old' ? detail?.old : detail?.new || detail?.old;
                    const metaLines = structured ? detail?.meta || [] : [];

                    return (
                      <View style={styles.itemChangeBlock}>
                        {tooltip.note ? (
                          <Text style={styles.modalNote}>{tooltip.note}</Text>
                        ) : null}
                        {structured ? (
                          renderItemDetailSections(activeVersion, metaLines, renderChangeLine, detail)
                        ) : (tooltip.lines || []).length > 0 ? (
                          <View style={styles.changeLinesWrap}>
                            {(tooltip.lines || []).map((line, idx) => renderChangeLine(line, idx))}
                          </View>
                        ) : (
                          <Text style={styles.changeBulletText}>
                            No change details in patch notes.
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                  {tooltip.type === 'wanderingMarket' && (
                    <View style={styles.changeBlock}>
                      <Text style={styles.changeSectionLabel}>Premium unlocks</Text>
                      <View style={styles.changeLinesWrap}>
                        {(tooltip.lines || []).map((line, idx) => renderChangeLine(line, idx))}
                      </View>
                    </View>
                  )}
                  {tooltip.type === 'gameMode' &&
                    (tooltip.changes || []).map((c, idx) => (
                      <View key={idx} style={styles.changeBlock}>
                        <Text style={styles.changeAbilityName}>{c.ability}</Text>
                        <View style={styles.changeLinesWrap}>
                          {(c.lines || []).map((line, li) => renderChangeLine(line, li))}
                        </View>
                      </View>
                    ))}
                </ScrollView>
              </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: UI_THEME.textMuted,
  },
  heroHeader: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
    width: '100%',
  },
  heroScorecardWrap: {
    width: '100%',
    maxWidth: 640,
    marginBottom: 18,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    backgroundColor: '#0b1220',
    ...UI_THEME.shadowCard,
  },
  heroScorecard: {
    width: '100%',
    height: '100%',
  },
  heroScorecardWeb: {
    objectFit: 'cover',
  },
  heroPatch: {
    color: '#fbbf24',
    fontSize: 32,
    letterSpacing: 1,
    textAlign: 'center',
  },
  heroPatchLabel: {
    fontWeight: '900',
  },
  heroPatchRest: {
    fontWeight: '800',
  },
  heroDate: {
    color: UI_THEME.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  heroSummary: {
    color: UI_THEME.textBody,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 560,
  },
  balanceIntroText: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  block: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionRule: {
    height: 2,
    width: 24,
    borderRadius: 1,
    opacity: 0.85,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionHeaderArrow: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 15,
    marginRight: 2,
  },
  sectionHeaderArrowCompact: {
    fontSize: 13,
    lineHeight: 13,
  },
  sectionCount: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderCompact: {
    marginBottom: 10,
    gap: 6,
  },
  sectionRuleCompact: {
    width: 14,
  },
  sectionHeaderLabelCompact: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
  dualBalanceRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  dualBalanceRowMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  dualBalanceCol: {
    flex: 1,
    minWidth: 0,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  iconCell: {
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  iconCellMobile: {
    paddingHorizontal: 1,
    marginBottom: 6,
  },
  iconCellHit: {
    alignItems: 'center',
    alignSelf: 'center',
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: '100%',
    ...(IS_WEB ? { cursor: 'pointer' } : null),
  },
  iconCellHitPressed: {
    opacity: 0.8,
  },
  iconRing: {
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  godIconRing: {
    overflow: 'visible',
  },
  godIconClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  gridAspectBadge: {
    position: 'absolute',
    padding: 2,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  itemRing: {
    borderRadius: 10,
  },
  godIcon: {
    width: '100%',
    height: '100%',
  },
  itemIcon: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackText: {
    fontSize: 20,
    fontWeight: '700',
  },
  iconLabel: {
    color: UI_THEME.textBody,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  iconLabelMobile: {
    fontSize: 9,
    lineHeight: 12,
  },
  aspectRow: {
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  aspectChip: {
    backgroundColor: UI_THEME.borderCyanFill10,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
  },
  aspectChipText: {
    color: UI_THEME.accentSky,
    fontSize: 13,
  },
  newGodRow: {
    gap: 12,
    marginBottom: 4,
  },
  newGodCard: {
    width: '100%',
  },
  featuredCardTitle: {
    color: UI_THEME.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  featuredCardSubtitle: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  featuredImageCover: {
    backgroundColor: '#0b1220',
  },
  featuredImageCoverWeb: {
    objectFit: 'cover',
  },
  wmRow: {
    gap: 12,
    marginTop: 8,
  },
  wmRowSideBySide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  wmCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    backgroundColor: 'transparent',
  },
  wmCardHalf: {
    flex: 1,
    minWidth: 0,
  },
  wmArtStage: {
    position: 'relative',
    width: '100%',
    backgroundColor: WM_ART_BG,
    overflow: 'hidden',
  },
  wmImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  wmImageWeb: {
    objectFit: 'contain',
  },
  wmPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WM_ART_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wmPlaceholderText: {
    color: UI_THEME.textMuted,
  },
  wmTitleBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 12, 22, 0.78)',
    borderTopWidth: 1,
    borderTopColor: UI_THEME.borderCyanSoft,
  },
  wmTitle: {
    color: UI_THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  systemsGrid: {
    gap: 10,
  },
  systemCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    backgroundColor: UI_THEME.panelBg,
    overflow: 'hidden',
    ...UI_THEME.shadowCard,
  },
  systemCardWeb: {
    cursor: 'pointer',
  },
  systemCardPressed: {
    opacity: 0.9,
    borderColor: UI_THEME.accentSky,
  },
  systemCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: UI_THEME.borderCyanFill08,
  },
  systemCardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: UI_THEME.mediaBg,
  },
  systemCardIcon: {
    width: '100%',
    height: '100%',
  },
  systemCardBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  systemCardTitle: {
    color: UI_THEME.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  systemCardNote: {
    color: UI_THEME.textBody,
    fontSize: 13,
    lineHeight: 18,
  },
  systemCardHint: {
    color: UI_THEME.accentSky,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  systemCardChevron: {
    color: UI_THEME.textMuted,
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 22,
    marginLeft: 4,
    flexShrink: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: UI_THEME.overlayScrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: UI_THEME.cardBg,
    borderRadius: UI_THEME.radiusCard,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    overflow: 'hidden',
    flexDirection: 'column',
    zIndex: 1,
    ...UI_THEME.shadowCard,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBg,
  },
  modalHeaderMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingRight: 8,
  },
  modalEntityIconRing: {
    borderWidth: 2,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: UI_THEME.mediaBg,
  },
  modalEntityIconRingGod: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  modalEntityIconRingScorecard: {
    width: 76,
    height: 44,
    borderRadius: 8,
  },
  modalScorecardIcon: {
    width: '100%',
    height: '100%',
  },
  modalEntityIconRingItem: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  modalGodIcon: {
    width: '100%',
    height: '100%',
  },
  modalItemIcon: {
    width: '100%',
    height: '100%',
  },
  modalEntityIconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEntityIconFallbackText: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  modalHeaderBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: UI_THEME.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modalBucketBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modalBucketText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: UI_THEME.radiusClose,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI_THEME.borderCyanFill08,
  },
  modalClose: {
    color: UI_THEME.textClose,
    fontSize: 22,
    lineHeight: 22,
    marginTop: -1,
  },
  modalBody: {
    flexShrink: 1,
    ...(IS_WEB
      ? {
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }
      : {}),
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 10,
  },
  modalNotePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_THEME.borderCyanFill08,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    gap: 10,
  },
  modalNoteAspectBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    padding: 4,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalNoteAspectIcon: {
    width: 22,
    height: 22,
  },
  modalNote: {
    color: UI_THEME.labelSoft,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    flex: 1,
  },
  modalNoteWithIcon: {
    fontStyle: 'normal',
    fontWeight: '600',
  },
  changeBlock: {
    padding: 12,
    borderRadius: UI_THEME.radiusPanel,
    backgroundColor: UI_THEME.panelBgSection,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
  },
  aspectChangeBlock: {
    borderColor: 'rgba(167, 139, 250, 0.35)',
    backgroundColor: 'rgba(167, 139, 250, 0.06)',
  },
  aspectChangeHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  changeAspectSectionLabel: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  aspectReleaseNote: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  aspectSubAbilityBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 139, 250, 0.22)',
  },
  aspectSubAbilityKind: {
    color: UI_THEME.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  aspectSubAbilityName: {
    fontSize: 15,
  },
  modalAspectMainIcon: {
    borderRadius: 10,
  },
  modalAspectSubIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  itemChangeBlock: {
    padding: 14,
    borderRadius: UI_THEME.radiusPanel,
    backgroundColor: UI_THEME.panelBg,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    ...(IS_WEB
      ? { boxShadow: '0 0 0 1px rgba(125, 211, 252, 0.12), 0 8px 24px rgba(3, 7, 18, 0.45)' }
      : null),
  },
  itemDetailPanel: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: UI_THEME.borderCyanFill10,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
  },
  itemDetailSection: {
    marginBottom: 14,
  },
  itemDetailSectionLast: {
    marginBottom: 0,
  },
  itemVersionToggleCompact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    backgroundColor: UI_THEME.borderCyanFill12,
    ...(IS_WEB ? { cursor: 'pointer' } : null),
  },
  changeSectionLabel: {
    color: UI_THEME.labelSoft,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  itemVersionToggleText: {
    color: UI_THEME.accentSky,
    fontSize: 12,
    fontWeight: '600',
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  modalAbilityIconWrap: {
    width: 40,
    height: 40,
    position: 'relative',
    flexShrink: 0,
  },
  modalAspectBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    padding: 2,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  modalAspectBadgeIcon: {
    width: 14,
    height: 14,
  },
  modalAbilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalAbilityFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: UI_THEME.panelBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAbilityFallbackText: {
    color: UI_THEME.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  changeAbilityName: {
    color: UI_THEME.accentSky,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  changeLinesWrap: {
    gap: 4,
    paddingLeft: 2,
  },
  changeBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingRight: 4,
  },
  changeBulletMark: {
    color: UI_THEME.accentSky,
    fontSize: 15,
    lineHeight: 21,
    width: 12,
    textAlign: 'center',
    flexShrink: 0,
  },
  changeBulletText: {
    color: UI_THEME.textBody,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  changeNerfWord: {
    color: '#f87171',
    fontWeight: '600',
  },
  changeBuffWord: {
    color: '#4ade80',
    fontWeight: '600',
  },
  changeAspectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: UI_THEME.borderCyanFill10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
  },
  changeAspectChipIcon: {
    width: 18,
    height: 18,
    flexShrink: 0,
  },
  changeAspectChipText: {
    color: UI_THEME.labelSoft,
    fontSize: 12,
    fontWeight: '600',
  },
});
