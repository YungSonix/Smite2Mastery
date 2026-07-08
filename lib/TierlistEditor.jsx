import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { getLocalGodAsset } from '../app/localIcons';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import {
  buildAssignableGodLabels,
  computeUnassignedLabels,
  createEmptyTier,
  deleteTier,
  editorStorageKey,
  loadEditorState,
  mentorToEditorState,
  moveLabelToTier,
  moveTierByOffset,
  removeLabelFromAllTiers,
  reorderTiers,
  saveEditorState,
  updateTier,
} from './tierlistEditorModel';
import {
  TIER_THEME_GROUPS,
  generateTierColorSpectrum,
  hexToHsl,
  hslToHex,
  normalizeHexColor,
  randomTierColor,
} from './tierlistColors';

const IS_WEB = Platform.OS === 'web';
const DRAG_GOD = 'text/god-label';
const DRAG_TIER = 'text/tier-id';
const SPECTRUM_COLORS = generateTierColorSpectrum();

function WebRangeInput({ min, max, value, onChange, accentColor }) {
  if (!IS_WEB) return null;
  return React.createElement('input', {
    type: 'range',
    min,
    max,
    value,
    onChange: (e) => onChange(Number(e.target.value)),
    style: {
      width: '100%',
      height: 28,
      accentColor: accentColor || '#7dd3fc',
      cursor: 'pointer',
    },
  });
}

function WebColorInput({ value, onChange }) {
  if (!IS_WEB) return null;
  const hex = normalizeHexColor(value) || '#991b1b';
  return React.createElement('input', {
    type: 'color',
    value: hex,
    onChange: (e) => onChange(e.target.value),
    style: {
      width: '100%',
      height: 44,
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      background: 'transparent',
    },
  });
}

function parseMentorGodLabel(label) {
  const raw = String(label || '').trim();
  const match = raw.match(/^(.+?)\s*\(Aspect\)\s*$/i);
  if (match) return { name: match[1].trim(), usesAspect: true };
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

function GodPortrait({
  gods,
  label,
  size,
  showName,
  selected,
  onPress,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
}) {
  const parsed = parseMentorGodLabel(label);
  const god = findGodByName(gods, parsed.name);
  const iconPath =
    god?.icon || god?.GodIcon || (god?.baseInformation && god.baseInformation.icon);
  const icon = iconPath ? getLocalGodAsset(iconPath) : null;
  const aspectIcon = parsed.usesAspect ? getGodAspectIconSource(god) : null;
  const borderRadius = Math.max(4, size * 0.16);
  const badgeSize = Math.max(12, Math.round(size * 0.42));
  const overlaySize = Math.max(8, Math.round(badgeSize * 0.62));
  const displayName = parsed.usesAspect ? `${parsed.name} (Aspect)` : parsed.name;

  const inner = icon ? (
    <Image
      source={icon}
      style={[
        styles.portrait,
        { width: size, height: size, borderRadius },
        selected && styles.portraitSelected,
        parsed.usesAspect && !aspectIcon && styles.portraitAspectFallback,
      ]}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  ) : (
    <View style={[styles.portraitPlaceholder, { width: size, height: size, borderRadius }]}>
      <Text style={styles.portraitPlaceholderText}>{parsed.name.charAt(0)}</Text>
    </View>
  );

  return (
    <View
      draggable={IS_WEB && draggable}
      onDragStart={
        IS_WEB && draggable
          ? (e) => {
              e?.dataTransfer?.setData(DRAG_GOD, label);
              if (e?.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              onDragStart?.(label);
            }
          : undefined
      }
      onDragEnd={IS_WEB && draggable ? () => onDragEnd?.() : undefined}
      style={[isDragging && styles.portraitDragging]}
    >
      <Pressable
        onPress={onPress}
        style={[styles.portraitWrap, showName && styles.portraitWrapNamed]}
      >
        <View style={[styles.portraitFrame, { width: size, height: size }]}>
          {inner}
          {aspectIcon ? (
            <View
              style={[
                styles.aspectBadge,
                { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
              ]}
            >
              <Image
                source={aspectIcon}
                style={{ width: overlaySize, height: overlaySize }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          ) : null}
        </View>
        {showName ? (
          <Text style={styles.portraitName} numberOfLines={2}>
            {displayName}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

function TierEditModal({ visible, tier, onClose, onSave }) {
  const [name, setName] = useState(tier?.tierName || '');
  const [color, setColor] = useState(tier?.color || '#991b1b');
  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(65);
  const [light, setLight] = useState(42);
  const [hexInput, setHexInput] = useState('#991b1b');

  const applyColor = useCallback((hex) => {
    const n = normalizeHexColor(hex);
    if (!n) return;
    setColor(n);
    setHexInput(n);
    const hsl = hexToHsl(n);
    setHue(hsl.h);
    setSat(hsl.s);
    setLight(hsl.l);
  }, []);

  useEffect(() => {
    if (visible && tier) {
      setName(tier.tierName || '');
      applyColor(tier.color || '#991b1b');
    }
  }, [visible, tier, applyColor]);

  const setFromHsl = useCallback(
    (h, s, l) => {
      setHue(h);
      setSat(s);
      setLight(l);
      applyColor(hslToHex(h, s, l));
    },
    [applyColor]
  );

  if (!tier) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCardWide} onPress={(e) => e.stopPropagation?.()}>
          <Text style={styles.modalTitle}>Edit tier</Text>

          <View style={[styles.tierPreviewStrip, { backgroundColor: color }]}>
            <Text style={styles.tierPreviewStripText} numberOfLines={2}>
              {name.trim() || tier.tierName || 'Tier name'}
            </Text>
          </View>

          <Text style={styles.modalLabel}>Tier name</Text>
          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={setName}
            placeholder="S - Top Tier"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.modalLabel}>Custom color</Text>
          <WebColorInput value={color} onChange={applyColor} />

          <View style={styles.hslRow}>
            <Text style={styles.hslLabel}>Hue</Text>
            <WebRangeInput min={0} max={360} value={hue} onChange={(h) => setFromHsl(h, sat, light)} accentColor={color} />
            {!IS_WEB ? (
              <Text style={styles.hslValue}>{hue}°</Text>
            ) : null}
          </View>
          <View style={styles.hslRow}>
            <Text style={styles.hslLabel}>Saturation</Text>
            <WebRangeInput min={0} max={100} value={sat} onChange={(s) => setFromHsl(hue, s, light)} accentColor={color} />
          </View>
          <View style={styles.hslRow}>
            <Text style={styles.hslLabel}>Lightness</Text>
            <WebRangeInput min={12} max={72} value={light} onChange={(l) => setFromHsl(hue, sat, l)} accentColor={color} />
          </View>

          <Text style={styles.modalLabel}>Hex</Text>
          <View style={styles.hexRow}>
            <TextInput
              style={[styles.modalInput, styles.hexInput]}
              value={hexInput}
              onChangeText={setHexInput}
              placeholder="#991b1b"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.hexApplyBtn} onPress={() => applyColor(hexInput)}>
              <Text style={styles.hexApplyText}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.hexApplyBtn} onPress={() => applyColor(randomTierColor())}>
              <Text style={styles.hexApplyText}>Random</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.paletteScroll} nestedScrollEnabled>
            {TIER_THEME_GROUPS.map((group) => (
              <View key={group.title} style={styles.paletteGroup}>
                <Text style={styles.paletteGroupTitle}>{group.title}</Text>
                <View style={styles.colorGrid}>
                  {group.colors.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        color === c && styles.colorSwatchActive,
                      ]}
                      onPress={() => applyColor(c)}
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.paletteGroup}>
              <Text style={styles.paletteGroupTitle}>Full spectrum</Text>
              <View style={styles.colorGrid}>
                {SPECTRUM_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorSwatchSmall,
                      { backgroundColor: c },
                      color === c && styles.colorSwatchActive,
                    ]}
                    onPress={() => applyColor(c)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnGhost} onPress={onClose}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtnPrimary}
              onPress={() => {
                onSave({ tierName: name.trim() || tier.tierName, color });
                onClose();
              }}
            >
              <Text style={styles.modalBtnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TierlistEditor({
  role,
  roleData,
  tierCategory,
  gods,
  onBack,
}) {
  const { width: screenWidth } = useScreenDimensions();
  const compact = screenWidth < 560;
  const portraitSize = compact ? 44 : 52;

  const storageKey = editorStorageKey(role.key, tierCategory);
  const allLabels = useMemo(() => buildAssignableGodLabels(gods), [gods]);
  const mentorSeed = useMemo(
    () => mentorToEditorState({ role, roleData, tierCategory }),
    [role, roleData, tierCategory]
  );

  const [editor, setEditor] = useState(mentorSeed);
  const [hydrated, setHydrated] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [unassignedQuery, setUnassignedQuery] = useState('');
  const [editTierId, setEditTierId] = useState(null);
  const [draggingLabel, setDraggingLabel] = useState(null);
  const [draggingTierId, setDraggingTierId] = useState(null);
  const [dropTargetTierId, setDropTargetTierId] = useState(null);
  const [unassignedDropActive, setUnassignedDropActive] = useState(false);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadEditorState(storageKey);
      if (!cancelled) {
        setEditor(saved || mentorSeed);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, mentorSeed]);

  useEffect(() => {
    if (!hydrated) return;
    saveEditorState(storageKey, editor);
  }, [editor, hydrated, storageKey]);

  const unassigned = useMemo(
    () => computeUnassignedLabels(allLabels, editor.tiers),
    [allLabels, editor.tiers]
  );

  const filteredUnassigned = useMemo(() => {
    const q = unassignedQuery.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((l) => l.toLowerCase().includes(q));
  }, [unassigned, unassignedQuery]);

  const handlePick = useCallback((label) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    setSelectedLabel((prev) => (prev === label ? null : label));
  }, []);

  const handleGodDropOnTier = useCallback((tierId, label) => {
    if (!label || !tierId) return;
    setEditor((prev) => moveLabelToTier(prev, label, tierId));
    setSelectedLabel(null);
    setDraggingLabel(null);
    setDropTargetTierId(null);
  }, []);

  const handleGodDropUnassigned = useCallback((label) => {
    if (!label) return;
    setEditor((prev) => removeLabelFromAllTiers(prev, label));
    setSelectedLabel(null);
    setDraggingLabel(null);
    setUnassignedDropActive(false);
  }, []);

  const preventDragDefaults = useCallback((e) => {
    if (!IS_WEB) return;
    e?.preventDefault?.();
    e?.stopPropagation?.();
  }, []);

  const readDragPayload = useCallback((e) => {
    if (!IS_WEB || !e?.dataTransfer) return { god: null, tierId: null };
    return {
      god: e.dataTransfer.getData(DRAG_GOD) || null,
      tierId: e.dataTransfer.getData(DRAG_TIER) || null,
    };
  }, []);

  const editTier = editor.tiers.find((t) => t.id === editTierId) || null;

  const handleTierPress = useCallback(
    (tierId) => {
      if (!selectedLabel) return;
      setEditor((prev) => moveLabelToTier(prev, selectedLabel, tierId));
      setSelectedLabel(null);
    },
    [selectedLabel]
  );

  const handleUnassign = useCallback(() => {
    if (!selectedLabel) return;
    handleGodDropUnassigned(selectedLabel);
  }, [selectedLabel, handleGodDropUnassigned]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading editor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.backChevron}>←</Text>
        <Text style={styles.backText}>Back to tierlists</Text>
      </TouchableOpacity>

      <View style={styles.nameRow}>
        <Text style={styles.nameLabel}>Tierlist Name:</Text>
        <TextInput
          style={styles.nameInput}
          value={editor.listName}
          onChangeText={(listName) => setEditor((prev) => ({ ...prev, listName }))}
          placeholder="My tierlist"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={[styles.toolbar, compact && styles.toolbarCompact]}>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() =>
            setEditor((prev) => ({
              ...prev,
              tiers: [...prev.tiers, createEmptyTier(prev.tiers.length)],
            }))
          }
        >
          <Text style={styles.toolBtnText}>Add Tier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setEditor((prev) => ({ ...prev, showNames: !prev.showNames }))}
        >
          <Text style={styles.toolBtnText}>{editor.showNames ? 'Hide Names' : 'Show Names'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => {
            setEditor(mentorSeed);
            setSelectedLabel(null);
          }}
        >
          <Text style={styles.toolBtnText}>Reset template</Text>
        </TouchableOpacity>
        {selectedLabel ? (
          <TouchableOpacity style={[styles.toolBtn, styles.toolBtnAccent]} onPress={handleUnassign}>
            <Text style={styles.toolBtnTextAccent}>To unassigned</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {IS_WEB ? (
        <Text style={styles.pickHintMuted}>
          Drag gods between tiers · drag ⋮⋮ to reorder tiers · tap tier label to edit
        </Text>
      ) : selectedLabel ? (
        <Text style={styles.pickHint}>
          Tap a tier row to place <Text style={styles.pickHintBold}>{selectedLabel}</Text>
        </Text>
      ) : (
        <Text style={styles.pickHintMuted}>Tap a god to select, then tap a tier to move it</Text>
      )}

      <ScrollView style={styles.tierScroll} contentContainerStyle={styles.tierScrollContent}>
        {editor.tiers.map((tier, tierIndex) => (
          <View
            key={tier.id}
            style={[
              styles.tierRow,
              compact && styles.tierRowCompact,
              dropTargetTierId === tier.id && styles.tierRowDropTarget,
            ]}
            {...(IS_WEB
              ? {
                  onDragOver: (e) => {
                    preventDragDefaults(e);
                    setDropTargetTierId(tier.id);
                  },
                  onDragLeave: () => setDropTargetTierId((id) => (id === tier.id ? null : id)),
                  onDrop: (e) => {
                    preventDragDefaults(e);
                    const { god, tierId: draggedTierId } = readDragPayload(e);
                    if (god) {
                      handleGodDropOnTier(tier.id, god);
                    } else if (draggedTierId && draggedTierId !== tier.id) {
                      setEditor((prev) => reorderTiers(prev, draggedTierId, tier.id));
                    }
                    setDraggingTierId(null);
                    setDropTargetTierId(null);
                  },
                }
              : {})}
          >
            <View
              style={styles.tierGripCol}
              draggable={IS_WEB}
              onDragStart={
                IS_WEB
                  ? (e) => {
                      e?.dataTransfer?.setData(DRAG_TIER, tier.id);
                      if (e?.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                      setDraggingTierId(tier.id);
                    }
                  : undefined
              }
              onDragEnd={IS_WEB ? () => setDraggingTierId(null) : undefined}
            >
              <Text style={styles.tierGripText}>⋮⋮</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.tierLabelCol,
                compact && styles.tierLabelColCompact,
                { backgroundColor: tier.color },
              ]}
              onPress={() => setEditTierId(tier.id)}
              activeOpacity={0.85}
              accessibilityLabel="Edit tier name and color"
            >
              <Text style={styles.tierLabelText} numberOfLines={compact ? 3 : 4}>
                {tier.tierName}
              </Text>
              <Text style={styles.tierLabelHint}>tap to edit</Text>
            </TouchableOpacity>

            <Pressable
              style={[
                styles.tierGodsCol,
                (selectedLabel || dropTargetTierId === tier.id) && styles.tierGodsColActive,
              ]}
              onPress={() => handleTierPress(tier.id)}
            >
              <ScrollView
                horizontal={!compact}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tierGodsInner}
              >
                {(tier.gods || []).map((label, idx) => (
                  <GodPortrait
                    key={`${label}-${idx}`}
                    gods={gods}
                    label={label}
                    size={portraitSize}
                    showName={editor.showNames}
                    selected={selectedLabel === label}
                    draggable
                    isDragging={draggingLabel === label}
                    onDragStart={(l) => {
                      dragMovedRef.current = true;
                      setDraggingLabel(l);
                    }}
                    onDragEnd={() => setDraggingLabel(null)}
                    onPress={() => handlePick(label)}
                  />
                ))}
                {(tier.gods || []).length === 0 ? (
                  <Text style={styles.tierEmptyHint}>
                    {selectedLabel || draggingLabel ? 'Drop here' : 'Empty tier'}
                  </Text>
                ) : null}
              </ScrollView>
            </Pressable>

            <View style={styles.tierActionsCol}>
              {!IS_WEB && tierIndex > 0 ? (
                <TouchableOpacity
                  style={styles.tierActionBtn}
                  onPress={() => setEditor((prev) => moveTierByOffset(prev, tier.id, -1))}
                >
                  <Text style={styles.tierActionIcon}>↑</Text>
                </TouchableOpacity>
              ) : null}
              {!IS_WEB && tierIndex < editor.tiers.length - 1 ? (
                <TouchableOpacity
                  style={styles.tierActionBtn}
                  onPress={() => setEditor((prev) => moveTierByOffset(prev, tier.id, 1))}
                >
                  <Text style={styles.tierActionIcon}>↓</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.tierActionBtn}
                onPress={() => {
                  setEditor((prev) => deleteTier(prev, tier.id));
                  if (editTierId === tier.id) setEditTierId(null);
                }}
                accessibilityLabel="Delete tier"
              >
                <Text style={styles.tierActionIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View
          style={[
            styles.unassignedSection,
            unassignedDropActive && styles.unassignedSectionDrop,
          ]}
          {...(IS_WEB
            ? {
                onDragOver: (e) => {
                  preventDragDefaults(e);
                  setUnassignedDropActive(true);
                },
                onDragLeave: () => setUnassignedDropActive(false),
                onDrop: (e) => {
                  preventDragDefaults(e);
                  const { god } = readDragPayload(e);
                  if (god) handleGodDropUnassigned(god);
                  setUnassignedDropActive(false);
                },
              }
            : {})}
        >
          <View style={[styles.unassignedHeader, compact && styles.unassignedHeaderCompact]}>
            <Text style={styles.unassignedTitle}>Unassigned Gods</Text>
            <TextInput
              style={[styles.unassignedSearch, compact && styles.unassignedSearchCompact]}
              placeholder="Search gods..."
              placeholderTextColor="#64748b"
              value={unassignedQuery}
              onChangeText={setUnassignedQuery}
            />
          </View>
          <View style={styles.unassignedGrid}>
            {filteredUnassigned.map((label, idx) => (
              <View key={`${label}-${idx}`} style={styles.unassignedCell}>
                <GodPortrait
                  gods={gods}
                  label={label}
                  size={portraitSize}
                  showName={editor.showNames}
                  selected={selectedLabel === label}
                  draggable
                  isDragging={draggingLabel === label}
                  onDragStart={(l) => {
                    dragMovedRef.current = true;
                    setDraggingLabel(l);
                  }}
                  onDragEnd={() => setDraggingLabel(null)}
                  onPress={() => handlePick(label)}
                />
              </View>
            ))}
            {filteredUnassigned.length === 0 ? (
              <Text style={styles.unassignedEmpty}>
                {unassigned.length === 0
                  ? 'All gods are assigned to tiers.'
                  : 'No gods match your search.'}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <TierEditModal
        visible={Boolean(editTierId)}
        tier={editTier}
        onClose={() => setEditTierId(null)}
        onSave={(patch) => {
          if (!editTierId) return;
          setEditor((prev) => updateTier(prev, editTierId, patch));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    ...(IS_WEB && { maxWidth: 1200, alignSelf: 'center', width: '100%' }),
  },
  loading: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1226',
  },
  backChevron: {
    color: '#7dd3fc',
    fontSize: 16,
    marginRight: 6,
  },
  backText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  nameRow: {
    marginBottom: 12,
    gap: 6,
  },
  nameLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  nameInput: {
    backgroundColor: '#0b1226',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: IS_WEB ? 10 : 12,
    fontSize: 15,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  toolbarCompact: {
    gap: 6,
  },
  toolBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0b1226',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  toolBtnAccent: {
    borderColor: 'rgba(125, 211, 252, 0.5)',
    backgroundColor: 'rgba(125, 211, 252, 0.1)',
  },
  toolBtnText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  toolBtnTextAccent: {
    color: '#7dd3fc',
    fontSize: 13,
    fontWeight: '700',
  },
  pickHint: {
    color: '#7dd3fc',
    fontSize: 12,
    marginBottom: 8,
  },
  pickHintBold: {
    fontWeight: '800',
    color: '#f8fafc',
  },
  pickHintMuted: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 8,
  },
  tierScroll: {
    flex: 1,
  },
  tierScrollContent: {
    gap: 10,
    paddingBottom: 32,
  },
  tierRow: {
    flexDirection: 'row',
    minHeight: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1226',
    overflow: 'hidden',
  },
  tierRowDropTarget: {
    borderColor: '#7dd3fc',
    backgroundColor: 'rgba(125, 211, 252, 0.08)',
  },
  tierRowCompact: {
    minHeight: 72,
  },
  tierGripCol: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#061028',
    borderRightWidth: 1,
    borderRightColor: '#1e3a5f',
    cursor: IS_WEB ? 'grab' : undefined,
  },
  tierGripText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -2,
    transform: [{ rotate: '90deg' }],
  },
  tierLabelCol: {
    width: 108,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierLabelColCompact: {
    width: 76,
    paddingHorizontal: 4,
  },
  tierLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 16,
  },
  tierLabelHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  tierGodsCol: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 72,
    justifyContent: 'center',
  },
  tierGodsColActive: {
    backgroundColor: 'rgba(125, 211, 252, 0.06)',
  },
  tierGodsInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tierEmptyHint: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  tierActionsCol: {
    width: 44,
    borderLeftWidth: 1,
    borderLeftColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  tierActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#061028',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierActionIcon: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  unassignedSection: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0b1226',
    overflow: 'hidden',
  },
  unassignedSectionDrop: {
    borderColor: '#7dd3fc',
    backgroundColor: 'rgba(125, 211, 252, 0.06)',
  },
  unassignedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  unassignedHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  unassignedTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  unassignedSearch: {
    flex: 1,
    maxWidth: 280,
    backgroundColor: '#061028',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    color: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  unassignedSearchCompact: {
    maxWidth: '100%',
    width: '100%',
  },
  unassignedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 6,
    overflow: 'visible',
  },
  unassignedCell: {
    width: 56,
    alignItems: 'center',
    overflow: 'visible',
  },
  unassignedEmpty: {
    color: '#64748b',
    fontSize: 13,
    padding: 12,
    width: '100%',
    textAlign: 'center',
  },
  portraitWrap: {
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'visible',
  },
  portraitWrapNamed: {
    width: 64,
  },
  portraitDragging: {
    opacity: 0.55,
  },
  portraitFrame: {
    position: 'relative',
    overflow: 'visible',
  },
  portrait: {
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#071024',
  },
  portraitSelected: {
    borderColor: '#7dd3fc',
    borderWidth: 2,
  },
  portraitAspectFallback: {
    borderColor: '#eab308',
  },
  portraitPlaceholder: {
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 18,
  },
  aspectBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    padding: 2,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitName: {
    color: '#cbd5e1',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.35)',
    padding: 16,
  },
  modalCardWide: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.35)',
    padding: 16,
  },
  tierPreviewStrip: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  tierPreviewStripText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  hslRow: {
    marginTop: 8,
    gap: 4,
  },
  hslLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  hslValue: {
    color: '#64748b',
    fontSize: 11,
  },
  hexRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  hexInput: {
    flex: 1,
  },
  hexApplyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1e3a5f',
  },
  hexApplyText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  paletteScroll: {
    maxHeight: 220,
    marginTop: 8,
  },
  paletteGroup: {
    marginBottom: 12,
  },
  paletteGroupTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#061028',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    color: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#7dd3fc',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalBtnGhost: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalBtnGhostText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1e90ff',
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
