import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { UI_THEME } from './uiTheme';
import PatchHubSimpleSummary from './PatchHubSimpleSummary';
import { openBetaPatches } from './patchNotesConfig';
import { buildPatchSummary, searchOpenBetaPatches } from './buildCatchUpSummary';

const IS_WEB = Platform.OS === 'web';

const BUCKET_LABEL = {
  new: 'NEW',
  buffed: 'BUFF',
  nerfed: 'NERF',
  adjusted: 'ADJ',
  shifted: 'SHIFT',
  mode: 'MODE',
};

export default function PatchHubArchive({ buildsData, screenWidth = 400 }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPatch, setExpandedPatch] = useState(null);

  const patchNumbers = useMemo(
    () => openBetaPatches.map((p) => p.number),
    []
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchOpenBetaPatches(searchQuery, patchNumbers);
  }, [searchQuery, patchNumbers]);

  const selectedSummary = useMemo(() => {
    if (expandedPatch == null) return null;
    return buildPatchSummary(expandedPatch);
  }, [expandedPatch]);

  const togglePatch = useCallback((patchNumber) => {
    setExpandedPatch((prev) => (prev === patchNumber ? null : patchNumber));
  }, []);

  const openPatchFromSearch = useCallback((patchNumber) => {
    setExpandedPatch(patchNumber);
    setSearchQuery('');
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Patch Archive</Text>
      <Text style={styles.description}>
        Browse every Open Beta patch or search by god, item, or game mode.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search gods, items, modes…"
          placeholderTextColor={UI_THEME.textHint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {searchQuery.trim().length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.length === 0 ? (
            <Text style={styles.searchEmpty}>No matches in loaded patch summaries.</Text>
          ) : (
            searchResults.map((hit, idx) => (
              <Pressable
                key={`${hit.patchNumber}-${hit.type}-${hit.name}-${idx}`}
                style={({ pressed }) => [styles.searchHit, pressed && styles.searchHitPressed]}
                onPress={() => openPatchFromSearch(hit.patchNumber)}
              >
                <Text style={styles.searchHitName}>{hit.name}</Text>
                <Text style={styles.searchHitMeta}>
                  OB{hit.patchNumber} · {BUCKET_LABEL[hit.bucket] || hit.bucket} · {hit.type}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}

      <ScrollView style={styles.timeline} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {openBetaPatches.map((patch) => {
          const isOpen = expandedPatch === patch.number;
          return (
            <View key={patch.number} style={styles.timelineItem}>
              <Pressable
                style={({ pressed }) => [
                  styles.timelineHeader,
                  isOpen && styles.timelineHeaderOpen,
                  pressed && styles.timelineHeaderPressed,
                ]}
                onPress={() => togglePatch(patch.number)}
              >
                <View style={styles.timelineHeaderText}>
                  <Text style={styles.timelineTitle}>OB{patch.number}</Text>
                  <Text style={styles.timelineSubtitle} numberOfLines={2}>
                    {patch.title.replace(/^SMITE 2 Open Beta \d+\s*/i, '') || patch.title}
                  </Text>
                  {patch.releaseDate ? (
                    <Text style={styles.timelineDate}>{patch.releaseDate}</Text>
                  ) : null}
                </View>
                <Text style={styles.timelineChevron}>{isOpen ? '▼' : '▶'}</Text>
              </Pressable>
              {isOpen && selectedSummary && expandedPatch === patch.number ? (
                <View style={styles.timelineBody}>
                  <PatchHubSimpleSummary
                    summary={selectedSummary}
                    buildsData={buildsData}
                    screenWidth={screenWidth}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: UI_THEME.accentSky,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    color: UI_THEME.textBody,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  searchRow: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: UI_THEME.panelBgSection,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: IS_WEB ? 10 : 12,
    color: UI_THEME.textPrimary,
    fontSize: 15,
  },
  searchResults: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyanSoft,
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchEmpty: {
    color: UI_THEME.textMuted,
    padding: 14,
    fontSize: 14,
  },
  searchHit: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorderMuted,
    backgroundColor: UI_THEME.panelBgSection,
  },
  searchHitPressed: {
    backgroundColor: UI_THEME.borderCyanFill08,
  },
  searchHitName: {
    color: UI_THEME.textBright,
    fontSize: 15,
    fontWeight: '600',
  },
  searchHitMeta: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  timeline: {
    flexGrow: 0,
  },
  timelineItem: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    overflow: 'hidden',
    backgroundColor: UI_THEME.panelBgSection,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  timelineHeaderOpen: {
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorderMuted,
    backgroundColor: UI_THEME.borderCyanFill08,
  },
  timelineHeaderPressed: {
    opacity: 0.9,
  },
  timelineHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  timelineTitle: {
    color: UI_THEME.accentSky,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timelineSubtitle: {
    color: UI_THEME.textBody,
    fontSize: 14,
    marginTop: 2,
  },
  timelineDate: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  timelineChevron: {
    color: UI_THEME.labelSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineBody: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});
