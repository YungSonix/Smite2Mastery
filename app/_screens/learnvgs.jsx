import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../../lib/themeColors';
import { UI_THEME } from '../../lib/uiTheme';
import { playMinigameSound } from '../../lib/minigameSounds';
import { useMinigameGold, pauseMinigameRound } from '../../hooks/useMinigameGold';
import { getRemoteGodIconByName } from '../localIcons';
import {
  VGS_CATEGORIES,
  VGS_CHEAT_SHEET_URL,
  commandHasAudio,
  filterVgsCommands,
  isCorrectVgsCode,
  pickVgsCommand,
} from '../../lib/vgsCommands';
import { pickRandomGodForVgsFile, playVgsFile } from '../../lib/skinVox';
import {
  MinigamePage,
  MinigameHeader,
  MinigameStreakLine,
  MinigameMediaCard,
  MinigameChipRow,
  MinigameTextField,
  MinigamePrimaryButton,
  MinigameSecondaryButton,
  MinigameResultBanner,
  MinigameLeaderboard,
  minigameShellStyles,
} from '../../lib/MinigameShell';

const IS_WEB = Platform.OS === 'web';

let supabase;
try {
  supabase = require('../../config/supabase').supabase;
} catch (e) {
  const mockQuery = {
    eq: () => ({
      single: async () => ({
        data: null,
        error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
      }),
    }),
    upsert: async () => ({
      error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
    }),
  };
  supabase = {
    from: () => ({
      select: () => mockQuery,
      upsert: async () => ({
        error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
      }),
    }),
  };
}

const { ensureAppWriteSession } = require('../../lib/appAuth');

let profileHelpers = null;
try {
  profileHelpers = require('./profile').profileHelpers;
} catch (_) {
  profileHelpers = {
    async getCurrentUser() {
      return null;
    },
  };
}

function nextCommand(modeId, excludeCode) {
  return pickVgsCommand({
    requireAudio: modeId === 'listen',
    excludeCode,
  });
}

export default function LearnVgsPage({ onBack = null }) {
  const { gold } = useMinigameGold();
  const [modeId, setModeId] = useState('callouts');
  const [target, setTarget] = useState(() => nextCommand('callouts'));
  const [voiceGod, setVoiceGod] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('neutral');
  const [roundBusy, setRoundBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [sheetCategory, setSheetCategory] = useState(null);
  const [sheetQuery, setSheetQuery] = useState('');

  const sheetRows = useMemo(
    () => filterVgsCommands({ category: sheetCategory, query: sheetQuery }),
    [sheetCategory, sheetQuery]
  );

  const fetchLeaderboard = useCallback(async () => {
    if (!supabase || modeId === 'sheet') return;
    setIsLoadingLeaderboard(true);
    setLeaderboardError('');
    try {
      const { data, error: lbError } = await supabase
        .from('vgs_learn_scores')
        .select('username, best_streak, mode, updated_at')
        .eq('mode', modeId)
        .order('best_streak', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(50);
      if (lbError) {
        if (lbError.code !== 'MISSING_CONFIG' && lbError.code !== 'PGRST205' && lbError.code !== '42P01') {
          setLeaderboardError('Failed to load leaderboard.');
        }
        return;
      }
      setLeaderboard(data || []);
    } catch (_) {
      setLeaderboardError('Failed to load leaderboard.');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [modeId]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        if (profileHelpers?.getCurrentUser) {
          const user = await profileHelpers.getCurrentUser();
          if (mounted) setCurrentUser(user);
        }
      } catch (_) {}
      await fetchLeaderboard();
    };
    init();
    return () => {
      mounted = false;
    };
  }, [fetchLeaderboard]);

  const submitBestStreak = async (streak, forMode) => {
    if (!supabase || !currentUser || !streak || streak <= 0) return;
    const authSession = await ensureAppWriteSession(currentUser);
    if (!authSession.ready) return;
    try {
      const { error: upsertError } = await supabase.from('vgs_learn_scores').upsert(
        {
          username: currentUser,
          mode: forMode,
          best_streak: streak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'username,mode' }
      );
      if (!upsertError || upsertError.code === 'MISSING_CONFIG') await fetchLeaderboard();
    } catch (_) {}
  };

  const playCommand = useCallback(async (command, godOverride = null) => {
    if (!commandHasAudio(command)) return false;
    const pick = godOverride || pickRandomGodForVgsFile(command.file);
    if (!pick) return false;
    setVoiceGod(pick);
    setPlaying(true);
    try {
      return await playVgsFile(pick.godFolder, command.file);
    } finally {
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (modeId !== 'listen' || !target?.file) return;
    const god = pickRandomGodForVgsFile(target.file);
    setVoiceGod(god);
    if (god) playCommand(target, god);
  }, [modeId, target, playCommand]);

  const startRound = useCallback((forMode, excludeCode) => {
    setTarget(nextCommand(forMode, excludeCode));
    setGuessText('');
    setError('');
    if (forMode !== 'listen') setVoiceGod(null);
  }, []);

  const handleModeChange = useCallback(
    (nextMode) => {
      if (nextMode === modeId || roundBusy) return;
      setModeId(nextMode);
      setFeedback('');
      setFeedbackType('neutral');
      setCurrentStreak(0);
      if (nextMode !== 'sheet') startRound(nextMode);
    },
    [modeId, roundBusy, startRound]
  );

  const handleSubmit = useCallback(async () => {
    if (!target || roundBusy || modeId === 'sheet') return;
    const typed = String(guessText || '').trim();
    if (!typed) {
      setError('Type the PC VGS code (example: VA1).');
      return;
    }
    setError('');
    const correct = isCorrectVgsCode(typed, target);
    if (correct) {
      const nextStreak = currentStreak + 1;
      setCurrentStreak(nextStreak);
      setBestStreak((prev) => {
        const best = Math.max(prev, nextStreak);
        if (best > prev) submitBestStreak(best, modeId);
        return best;
      });
      setFeedback(`Correct — ${target.code} · ${target.text}`);
      setFeedbackType('success');
      playMinigameSound('correct');
      try {
        const { awardChallenge } = require('../../lib/shopChallenges');
        awardChallenge('vgs_win').catch(() => {});
      } catch (_) {}
    } else {
      setCurrentStreak(0);
      setFeedback(`Wrong — ${target.code} · ${target.text}`);
      setFeedbackType('error');
      playMinigameSound('incorrect');
    }
    await pauseMinigameRound(setRoundBusy);
    startRound(modeId, target.code);
  }, [target, roundBusy, modeId, guessText, currentStreak, startRound]);

  const handleSkip = useCallback(async () => {
    if (!target || roundBusy || modeId === 'sheet') return;
    setFeedback(`Skipped — ${target.code} · ${target.text}`);
    setFeedbackType('neutral');
    playMinigameSound('incorrect');
    setCurrentStreak(0);
    await pauseMinigameRound(setRoundBusy);
    startRound(modeId, target.code);
  }, [target, roundBusy, modeId, startRound]);

  const handleReplay = useCallback(() => {
    if (!target || playing) return;
    playCommand(target, voiceGod);
  }, [target, playing, voiceGod, playCommand]);

  const godIcon = voiceGod?.displayName ? getRemoteGodIconByName(voiceGod.displayName) : null;
  const modeSubtitle =
    modeId === 'listen'
      ? 'A random god says the line from the GitHub assets VoiceAudio pack. Type the PC code.'
      : modeId === 'sheet'
        ? 'Browse every PC VGS code. Play a line or drill them in Callouts / Listen.'
        : 'Read the callout and type the PC command (VA1, VDG, VVGG).';

  return (
    <MinigamePage onBack={onBack}>
      <MinigameHeader title="Learn the VGS" subtitle={modeSubtitle} gold={gold} />

      <MinigameChipRow
        label="Mode"
        value={modeId}
        onChange={handleModeChange}
        options={[
          { value: 'callouts', label: 'Callouts' },
          { value: 'listen', label: 'Listen' },
          { value: 'sheet', label: 'Sheet' },
        ]}
      />

      {modeId === 'sheet' ? (
        <>
          <MinigameTextField
            label="Search codes or callouts"
            value={sheetQuery}
            onChangeText={setSheetQuery}
            placeholder="VA1, Fire Giant, ward"
            autoCapitalize="none"
          />
          <Text style={localStyles.fieldLabel}>Category</Text>
          <View style={localStyles.wrapChips}>
            {[{ id: null, label: 'All' }, ...VGS_CATEGORIES.map((cat) => ({ id: cat, label: cat }))].map(
              (cat) => {
                const active = sheetCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[localStyles.wrapChip, active && localStyles.wrapChipActive]}
                    onPress={() => setSheetCategory(cat.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[localStyles.wrapChipText, active && localStyles.wrapChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
          <Text style={localStyles.sheetCount}>{sheetRows.length} commands</Text>
          {sheetRows.map((command) => (
            <View key={command.code} style={localStyles.sheetRow}>
              <View style={localStyles.sheetTextCol}>
                <Text style={localStyles.sheetCode}>{command.code}</Text>
                <Text style={localStyles.sheetCallout}>{command.text}</Text>
                {command.s2 ? <Text style={localStyles.sheetMeta}>Smite 2 extra</Text> : null}
              </View>
              {commandHasAudio(command) ? (
                <MinigameSecondaryButton
                  label={playing ? '…' : 'Play'}
                  onPress={() => playCommand(command)}
                  disabled={playing}
                />
              ) : (
                <Text style={localStyles.noAudio}>No WAV</Text>
              )}
            </View>
          ))}
          <MinigameSecondaryButton
            label="Open VGS cheat sheet (wiki)"
            onPress={() => Linking.openURL(VGS_CHEAT_SHEET_URL)}
          />
        </>
      ) : !target ? (
        <View style={localStyles.errorBox}>
          <Text style={localStyles.errorText}>No VGS commands available.</Text>
        </View>
      ) : (
        <>
          <MinigameStreakLine current={currentStreak} best={bestStreak} />
          <MinigameMediaCard
            label={modeId === 'listen' ? 'What command was that?' : 'Type the PC VGS code'}
            busy={roundBusy || playing}
          >
            {modeId === 'listen' ? (
              <View style={localStyles.listenBlock}>
                {godIcon ? (
                  <Image
                    source={godIcon}
                    style={localStyles.godIcon}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={localStyles.godIconFallback}>
                    <Text style={localStyles.godIconFallbackText}>
                      {(voiceGod?.displayName || '?').charAt(0)}
                    </Text>
                  </View>
                )}
                <Text style={localStyles.godName}>{voiceGod?.displayName || 'Random god'}</Text>
                <Text style={localStyles.listenHint}>VoiceAudio / VGS on the assets branch</Text>
              </View>
            ) : (
              <View style={localStyles.calloutBlock}>
                <Text style={localStyles.categoryTag}>{target.category}</Text>
                <Text style={localStyles.calloutText}>{target.text}</Text>
              </View>
            )}
          </MinigameMediaCard>
          <MinigameTextField
            label="VGS code"
            value={guessText}
            onChangeText={setGuessText}
            placeholder="VA1"
            onSubmitEditing={handleSubmit}
            editable={!roundBusy}
          />
          {error ? <Text style={minigameShellStyles.errorText}>{error}</Text> : null}
          <MinigameResultBanner type={feedbackType} message={feedback} />
          <MinigamePrimaryButton
            label="Submit"
            onPress={handleSubmit}
            disabled={roundBusy || !guessText.trim()}
          />
          <View style={localStyles.secondaryRow}>
            {modeId === 'listen' ? (
              <View style={localStyles.secondaryHalf}>
                <MinigameSecondaryButton
                  label={playing ? 'Playing…' : 'Replay'}
                  onPress={handleReplay}
                  disabled={roundBusy || playing || !commandHasAudio(target)}
                />
              </View>
            ) : null}
            <View style={localStyles.secondaryHalf}>
              <MinigameSecondaryButton label="Skip" onPress={handleSkip} disabled={roundBusy} />
            </View>
          </View>
          <MinigameLeaderboard
            title={`VGS leaderboard (${modeId === 'listen' ? 'Listen' : 'Callouts'})`}
            subtitle={
              currentUser
                ? `Playing as ${currentUser}`
                : 'Sign in on Profile to appear on the leaderboard.'
            }
            loading={isLoadingLeaderboard}
            error={leaderboardError}
            emptyText="No streaks yet."
            rows={leaderboard}
            renderRow={(entry, idx) => {
              const isYou = currentUser && entry.username === currentUser;
              return (
                <View
                  key={`${entry.username}-${entry.mode}-${idx}`}
                  style={[
                    minigameShellStyles.leaderboardRow,
                    isYou && minigameShellStyles.leaderboardRowYou,
                  ]}
                >
                  <Text style={minigameShellStyles.leaderboardRank}>{idx + 1}</Text>
                  <Text
                    style={[
                      minigameShellStyles.leaderboardName,
                      isYou && minigameShellStyles.leaderboardNameYou,
                    ]}
                    numberOfLines={1}
                  >
                    {entry.username || 'Anonymous'}
                  </Text>
                  <Text style={minigameShellStyles.leaderboardScore}>{entry.best_streak}</Text>
                </View>
              );
            }}
          />
        </>
      )}
    </MinigamePage>
  );
}

const localStyles = StyleSheet.create({
  errorBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red700,
    backgroundColor: COLORS.bgDeep,
  },
  errorText: { color: COLORS.red200, fontSize: 13 },
  listenBlock: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  godIcon: {
    width: IS_WEB ? 88 : 72,
    height: IS_WEB ? 88 : 72,
    borderRadius: 12,
    backgroundColor: UI_THEME.mediaBg,
  },
  godIconFallback: {
    width: IS_WEB ? 88 : 72,
    height: IS_WEB ? 88 : 72,
    borderRadius: 12,
    backgroundColor: UI_THEME.mediaBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  godIconFallbackText: { color: UI_THEME.textIconFallback, fontSize: 28, fontWeight: '800' },
  godName: { color: UI_THEME.textPrimary, fontSize: 16, fontWeight: '800' },
  listenHint: { color: UI_THEME.textMuted, fontSize: 12 },
  calloutBlock: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, gap: 8 },
  categoryTag: {
    color: UI_THEME.accentSky,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  calloutText: {
    color: UI_THEME.textPrimary,
    fontSize: IS_WEB ? 22 : 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  secondaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  secondaryHalf: { flex: 1 },
  fieldLabel: {
    color: UI_THEME.textBody,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  wrapChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  wrapChipActive: {
    borderColor: UI_THEME.accentSky,
    backgroundColor: UI_THEME.borderCyanFill12,
  },
  wrapChipText: { color: UI_THEME.textMuted, fontSize: 13, fontWeight: '700' },
  wrapChipTextActive: { color: UI_THEME.textPrimary },
  sheetCount: { color: UI_THEME.textMuted, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorderMuted,
  },
  sheetTextCol: { flex: 1 },
  sheetCode: { color: UI_THEME.accentSky, fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
  sheetCallout: { color: UI_THEME.textBody, fontSize: 13, marginTop: 2 },
  sheetMeta: { color: UI_THEME.textMuted, fontSize: 11, marginTop: 2 },
  noAudio: { color: UI_THEME.textMuted, fontSize: 11, fontWeight: '600' },
});
