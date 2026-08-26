import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from './themeColors';
import { UI_THEME } from './uiTheme';
import { WEB_CONTENT_MAX_WIDTH } from './webLayout';
import { getRemoteGodIconByName } from '../app/localIcons';
import { GOLD_ICON } from './imageGrabber';

const IS_WEB = Platform.OS === 'web';

export function MinigamePage({ onBack, children }) {
  return (
    <View style={shell.container}>
      <KeyboardAvoidingView
        style={shell.flex}
        behavior={IS_WEB ? undefined : Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={shell.scroll} keyboardShouldPersistTaps="handled">
          {onBack ? (
            <TouchableOpacity style={shell.backBtn} onPress={onBack} activeOpacity={0.85}>
              <Text style={shell.backBtnText}>← Back</Text>
            </TouchableOpacity>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function MinigameGoldChip({ gold }) {
  return (
    <View style={shell.goldChip}>
      <Image source={GOLD_ICON} style={shell.goldIcon} contentFit="contain" />
      <Text style={shell.goldAmount}>{Number(gold || 0).toLocaleString()}</Text>
    </View>
  );
}

export function MinigameHeader({ title, subtitle, gold = null }) {
  return (
    <View style={shell.header}>
      <View style={shell.headerTopRow}>
        <Text style={shell.title}>{title}</Text>
        {gold != null ? <MinigameGoldChip gold={gold} /> : null}
      </View>
      {subtitle ? <Text style={shell.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function MinigameStreakLine({
  current = 0,
  best = 0,
  currentLabel = 'Streak',
  bestLabel = 'Best',
}) {
  return (
    <Text style={shell.streakLine}>
      {currentLabel} <Text style={shell.streakValue}>{current}</Text>
      {' · '}
      {bestLabel} <Text style={shell.streakValue}>{best}</Text>
    </Text>
  );
}

export function MinigameMediaCard({ children, label, busy = false }) {
  return (
    <View style={shell.mediaCard}>
      {label ? <Text style={shell.mediaLabel}>{label}</Text> : null}
      <View style={shell.mediaInner}>
        {children}
        {busy ? (
          <View style={shell.mediaBusyOverlay}>
            <ActivityIndicator color={UI_THEME.accentSky} size="large" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function MinigameGodSearch({
  label,
  value,
  onChangeText,
  placeholder,
  gods,
  onSubmitEditing,
  onPickSubmit,
  editable = true,
}) {
  const showSuggestions = editable && (gods?.length || 0) > 0;
  return (
    <View style={shell.field}>
      <Text style={shell.fieldLabel}>{label}</Text>
      <View style={[shell.searchGroup, showSuggestions ? shell.searchGroupOpen : shell.searchGroupClosed]}>
        <TextInput
          style={[shell.input, showSuggestions ? shell.inputAttachedTop : shell.inputStandalone]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.slate500}
          autoCapitalize="words"
          autoCorrect={false}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
        />
        {showSuggestions ? (
          <View style={shell.suggestionAttached}>
            {gods.map((g) => {
              const name = g.godName || g.name;
              const icon = getRemoteGodIconByName(name);
              return (
                <TouchableOpacity
                  key={name}
                  style={shell.suggestionRow}
                  onPress={() => {
                    if (typeof onPickSubmit === 'function') onPickSubmit(name);
                    else onChangeText(name);
                  }}
                  activeOpacity={0.75}
                >
                  {icon ? (
                    <Image source={icon} style={shell.suggestionIcon} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <View style={shell.suggestionIconFallback}>
                      <Text style={shell.suggestionIconFallbackText}>{(name || '?').charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={shell.suggestionText}>{name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function MinigameItemSearch({
  label,
  value,
  onChangeText,
  placeholder,
  names,
  onSubmitEditing,
  onPickSubmit,
  editable = true,
}) {
  const showSuggestions = editable && (names?.length || 0) > 0;
  return (
    <View style={shell.field}>
      <Text style={shell.fieldLabel}>{label}</Text>
      <View style={[shell.searchGroup, showSuggestions ? shell.searchGroupOpen : shell.searchGroupClosed]}>
        <TextInput
          style={[shell.input, showSuggestions ? shell.inputAttachedTop : shell.inputStandalone]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.slate500}
          autoCapitalize="words"
          autoCorrect={false}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
        />
        {showSuggestions ? (
          <View style={shell.suggestionAttached}>
            {names.map((name) => (
              <TouchableOpacity
                key={name}
                style={shell.suggestionRow}
                onPress={() => {
                  if (typeof onPickSubmit === 'function') onPickSubmit(name);
                  else onChangeText(name);
                }}
                activeOpacity={0.75}
              >
                <Text style={shell.suggestionText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function MinigameTextField({
  label,
  value,
  onChangeText,
  placeholder,
  onSubmitEditing,
  editable = true,
  autoCapitalize = 'characters',
  autoCorrect = false,
}) {
  return (
    <View style={shell.field}>
      {label ? <Text style={shell.fieldLabel}>{label}</Text> : null}
      <TextInput
        style={[shell.input, shell.inputStandalone]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.slate500}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoComplete="off"
        onSubmitEditing={onSubmitEditing}
        editable={editable}
      />
    </View>
  );
}

export function MinigameChipRow({ options, value, onChange, label }) {
  return (
    <View style={shell.field}>
      {label ? <Text style={shell.fieldLabel}>{label}</Text> : null}
      <View style={shell.chipRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[shell.chip, active && shell.chipActive]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.85}
            >
              <Text style={[shell.chipText, active && shell.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function MinigamePrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[shell.primaryBtn, disabled && shell.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
    >
      <Text style={shell.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Ghost / secondary action — same chrome as back button (Reveal, Skip, etc.). */
export function MinigameSecondaryButton({ label, onPress, onLongPress, disabled }) {
  return (
    <TouchableOpacity
      style={[shell.secondaryBtn, disabled && shell.secondaryBtnDisabled]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={380}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={shell.secondaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function MinigameResultBanner({ type = 'neutral', message }) {
  if (!message) return null;
  const tone =
    type === 'success' ? shell.bannerSuccess : type === 'error' ? shell.bannerError : shell.bannerNeutral;
  return (
    <View style={[shell.banner, tone]}>
      <Text style={shell.bannerText}>{message}</Text>
    </View>
  );
}

export function MinigameLeaderboard({
  title,
  subtitle,
  loading,
  error,
  emptyText,
  rows,
  renderRow,
}) {
  return (
    <View style={shell.leaderboard}>
      <Text style={shell.leaderboardTitle}>{title}</Text>
      {subtitle ? <Text style={shell.leaderboardSubtitle}>{subtitle}</Text> : null}
      {error ? <Text style={shell.errorText}>{error}</Text> : null}
      {loading ? (
        <View style={shell.leaderboardLoading}>
          <ActivityIndicator color={UI_THEME.accentSky} />
        </View>
      ) : !rows?.length ? (
        <Text style={shell.leaderboardEmpty}>{emptyText}</Text>
      ) : (
        <View style={shell.leaderboardList}>{rows.map(renderRow)}</View>
      )}
    </View>
  );
}

const shell = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgVoid,
  },
  scroll: {
    padding: 20,
    paddingBottom: 44,
    ...(IS_WEB && {
      maxWidth: WEB_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBg,
  },
  backBtnText: {
    color: UI_THEME.accentSky,
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    marginBottom: 12,
    padding: 14,
    borderRadius: UI_THEME.radiusCard,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    backgroundColor: UI_THEME.cardBg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  goldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
  },
  goldIcon: { width: 18, height: 18 },
  goldAmount: {
    color: COLORS.statStrength,
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: UI_THEME.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
  },
  subtitle: {
    color: UI_THEME.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  streakLine: {
    color: UI_THEME.textMuted,
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  streakValue: {
    color: UI_THEME.accentSky,
    fontWeight: '800',
  },
  mediaCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: UI_THEME.radiusCard,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    backgroundColor: UI_THEME.panelBg,
    alignItems: 'center',
  },
  mediaLabel: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  mediaInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: IS_WEB ? 200 : 170,
    position: 'relative',
  },
  mediaBusyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  field: { marginBottom: 12 },
  fieldLabel: {
    color: UI_THEME.textBody,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  searchGroup: { borderRadius: UI_THEME.radiusPanel, overflow: 'hidden' },
  searchGroupClosed: {
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  searchGroupOpen: {
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: UI_THEME.textPrimary,
    fontSize: 15,
  },
  inputStandalone: {
    backgroundColor: UI_THEME.panelBgAlt,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
  },
  inputAttachedTop: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  suggestionAttached: {
    borderTopWidth: 1,
    borderTopColor: UI_THEME.panelBorderMuted,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: UI_THEME.accentSky,
    backgroundColor: UI_THEME.borderCyanFill12,
  },
  chipText: {
    color: UI_THEME.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  chipTextActive: { color: UI_THEME.textPrimary },
  primaryBtn: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: UI_THEME.radiusPanel,
    backgroundColor: COLORS.brandBlue,
    borderWidth: 1,
    borderColor: UI_THEME.accentSky,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBg,
    alignItems: 'center',
  },
  secondaryBtnDisabled: { opacity: 0.45 },
  secondaryBtnText: {
    color: UI_THEME.accentSky,
    fontSize: 14,
    fontWeight: '700',
  },
  banner: {
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
  },
  bannerSuccess: {
    borderColor: 'rgba(74, 222, 128, 0.45)',
    backgroundColor: 'rgba(22, 101, 52, 0.35)',
  },
  bannerError: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
  },
  bannerNeutral: {
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBg,
  },
  bannerText: {
    color: UI_THEME.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorderMuted,
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: UI_THEME.mediaBg,
  },
  suggestionIconFallback: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: UI_THEME.mediaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionIconFallbackText: {
    color: UI_THEME.textIconFallback,
    fontWeight: '700',
    fontSize: 12,
  },
  suggestionText: {
    color: UI_THEME.textBody,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorText: {
    color: COLORS.red200,
    fontSize: 12,
    marginBottom: 8,
  },
  leaderboard: {
    marginTop: 20,
    padding: 16,
    borderRadius: UI_THEME.radiusCard,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBg,
  },
  leaderboardTitle: {
    color: UI_THEME.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  leaderboardSubtitle: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  leaderboardLoading: { paddingVertical: 16, alignItems: 'center' },
  leaderboardEmpty: {
    color: UI_THEME.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  leaderboardList: { gap: 0 },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorderMuted,
  },
  leaderboardRowYou: {
    backgroundColor: UI_THEME.borderCyanFill08,
    borderRadius: UI_THEME.radiusPanel,
  },
  leaderboardRank: {
    width: 28,
    color: UI_THEME.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  leaderboardName: {
    flex: 1,
    color: UI_THEME.textBody,
    fontSize: 14,
    fontWeight: '600',
  },
  leaderboardNameYou: { color: UI_THEME.accentSky },
  leaderboardScore: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

export { shell as minigameShellStyles };
