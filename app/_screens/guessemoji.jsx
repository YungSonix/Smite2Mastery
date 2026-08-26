import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { COLORS } from '../../lib/themeColors';
import { UI_THEME } from '../../lib/uiTheme';
import { playMinigameSound } from '../../lib/minigameSounds';
import { useMinigameGold, pauseMinigameRound } from '../../hooks/useMinigameGold';
import {
  EMOJI_GUESS_MODES,
  getEmojiGuessPoints,
  isCorrectEmojiGuess,
  listEmojiGuessGods,
  normalizeGodGuess,
  pickEmojiGuessRound,
} from '../../lib/minigameEmojiClues';
import {
  MinigamePage,
  MinigameHeader,
  MinigameStreakLine,
  MinigameMediaCard,
  MinigameGodSearch,
  MinigameChipRow,
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
      update: () => ({
        eq: async () => ({
          error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
        }),
      }),
    }),
    single: async () => ({
      data: null,
      error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
    }),
    upsert: async () => ({
      error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
    }),
  };
  supabase = {
    from: () => ({
      select: () => mockQuery,
      insert: async () => ({
        error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
      }),
      upsert: async () => ({
        error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
      }),
      update: () => mockQuery,
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

function ClueRow({ clues, visibleCount }) {
  return (
    <View style={localStyles.clueRow}>
      {[0, 1, 2].map((i) => {
        const shown = i < visibleCount;
        const clue = clues?.[i];
        return (
          <View key={i} style={[localStyles.clueSlot, !shown && localStyles.clueSlotHidden]}>
            {shown && clue ? (
              <Text style={localStyles.clueGlyph} accessibilityLabel={clue.key}>
                {clue.glyph}
              </Text>
            ) : (
              <Text style={localStyles.clueHiddenMark}>?</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function GuessEmojiPage({ onBack = null }) {
  const { gold } = useMinigameGold();
  const [modeId, setModeId] = useState('easy');
  const [target, setTarget] = useState(() => pickEmojiGuessRound('easy'));
  const [visibleCount, setVisibleCount] = useState(1);
  const [guessGodText, setGuessGodText] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('neutral');
  const [roundBusy, setRoundBusy] = useState(false);
  const [runScore, setRunScore] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  const mode = EMOJI_GUESS_MODES[modeId] || EMOJI_GUESS_MODES.easy;
  const poolGods = useMemo(() => listEmojiGuessGods(modeId), [modeId]);
  const pointsNow = getEmojiGuessPoints(modeId, visibleCount);

  const suggestions = useMemo(() => {
    const term = normalizeGodGuess(guessGodText);
    if (!term) return [];
    return poolGods.filter((g) => normalizeGodGuess(g.godName).includes(term)).slice(0, 8);
  }, [guessGodText, poolGods]);

  const fetchLeaderboard = useCallback(async () => {
    if (!supabase) return;
    setIsLoadingLeaderboard(true);
    setLeaderboardError('');
    try {
      const { data, error: lbError } = await supabase
        .from('emoji_guess_scores')
        .select('username, best_run_score, mode, updated_at')
        .eq('mode', modeId)
        .order('best_run_score', { ascending: false })
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
    let isMounted = true;
    const init = async () => {
      try {
        if (profileHelpers?.getCurrentUser) {
          const user = await profileHelpers.getCurrentUser();
          if (isMounted) setCurrentUser(user);
        }
      } catch (_) {}
      await fetchLeaderboard();
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [fetchLeaderboard]);

  const submitBestRun = async (score, forMode) => {
    if (!supabase || !currentUser || !score || score <= 0) return;
    const authSession = await ensureAppWriteSession(currentUser);
    if (!authSession.ready) return;
    try {
      const { error: upsertError } = await supabase.from('emoji_guess_scores').upsert(
        {
          username: currentUser,
          mode: forMode,
          best_run_score: score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'username,mode' }
      );
      if (!upsertError || upsertError.code === 'MISSING_CONFIG') await fetchLeaderboard();
    } catch (_) {}
  };

  const endRun = useCallback(
    async (finalScore) => {
      const score = Number(finalScore) || 0;
      setBestRun((prev) => {
        const next = Math.max(prev, score);
        if (next > prev && next > 0) submitBestRun(next, modeId);
        return next;
      });
      setRunScore(0);
    },
    [modeId]
  );

  const startNextRound = useCallback(
    (excludeName) => {
      const next = pickEmojiGuessRound(modeId, { excludeName });
      setTarget(next);
      setVisibleCount(1);
      setGuessGodText('');
      setError('');
    },
    [modeId]
  );

  const handleModeChange = useCallback(
    (nextMode) => {
      if (nextMode === modeId || roundBusy) return;
      if (runScore > 0) endRun(runScore);
      setModeId(nextMode);
      setFeedback('');
      setFeedbackType('neutral');
      const next = pickEmojiGuessRound(nextMode);
      setTarget(next);
      setVisibleCount(1);
      setGuessGodText('');
      setError('');
      setRunScore(0);
    },
    [modeId, roundBusy, runScore, endRun]
  );

  const handleReveal = useCallback(() => {
    if (roundBusy || !target) return;
    if (visibleCount >= 3) return;
    setVisibleCount((c) => Math.min(3, c + 1));
    setError('');
  }, [roundBusy, target, visibleCount]);

  const handleSkip = useCallback(async () => {
    if (!target || roundBusy) return;
    setFeedback(`Skipped ${target.godName}.`);
    setFeedbackType('neutral');
    playMinigameSound('incorrect');
    const prev = target;
    await pauseMinigameRound(setRoundBusy);
    startNextRound(prev.godName);
  }, [target, roundBusy, startNextRound]);

  const handleSubmitGuess = useCallback(
    async (godNameOverride = null) => {
      if (!target || roundBusy) return;
      const nameToUse = String(godNameOverride || guessGodText || '').trim();
      if (!nameToUse) {
        setError('Type the god name.');
        return;
      }
      const known = poolGods.some((g) => normalizeGodGuess(g.godName) === normalizeGodGuess(nameToUse));
      if (!known) {
        setError('God not found. Check spelling.');
        return;
      }
      setError('');
      const correct = isCorrectEmojiGuess(nameToUse, target.godName);
      if (correct) {
        const gained = getEmojiGuessPoints(modeId, visibleCount);
        const nextRun = runScore + gained;
        setRunScore(nextRun);
        setBestRun((b) => {
          if (nextRun > b) {
            submitBestRun(nextRun, modeId);
            return nextRun;
          }
          return b;
        });
        setFeedback(`Correct! ${target.godName} — +${gained} (run ${nextRun}).`);
        setFeedbackType('success');
        playMinigameSound('correct');
        const prev = target;
        await pauseMinigameRound(setRoundBusy);
        startNextRound(prev.godName);
        return;
      }

      setFeedback(`Wrong — ${target.godName}. Run ended at ${runScore}.`);
      setFeedbackType('error');
      playMinigameSound('incorrect');
      await endRun(runScore);
      await pauseMinigameRound(setRoundBusy);
      startNextRound(target.godName);
    },
    [target, roundBusy, guessGodText, poolGods, modeId, visibleCount, runScore, startNextRound, endRun]
  );

  const modeSubtitle =
    modeId === 'classic'
      ? 'Smite 1 + Smite 2 gods. Reveal clues for fewer points.'
      : modeId === 'hard'
        ? 'Smite 2 only. Harder clues — one submit; reveal still lowers points.'
        : 'Smite 2 only. Reveal more clues for fewer points.';

  return (
    <MinigamePage onBack={onBack}>
      <MinigameHeader title="Guess the Emoji" subtitle={modeSubtitle} gold={gold} />

      <MinigameChipRow
        label="Mode"
        value={modeId}
        onChange={handleModeChange}
        options={[
          { value: 'easy', label: 'Easy' },
          { value: 'hard', label: 'Hard' },
          { value: 'classic', label: 'Classic' },
        ]}
      />

      {!target ? (
        <View style={localStyles.errorBox}>
          <Text style={localStyles.errorText}>No emoji clue data available.</Text>
        </View>
      ) : (
        <>
          <MinigameStreakLine
            current={runScore}
            best={bestRun}
            currentLabel="Run"
            bestLabel="Best"
          />
          <MinigameMediaCard
            label={`Which god? · Correct now: ${pointsNow} pt${pointsNow === 1 ? '' : 's'}`}
            busy={roundBusy}
          >
            <ClueRow clues={target.clues} visibleCount={visibleCount} />
          </MinigameMediaCard>
          <MinigameGodSearch
            label="God name"
            value={guessGodText}
            onChangeText={setGuessGodText}
            placeholder="Type a god name"
            gods={suggestions}
            onSubmitEditing={() => handleSubmitGuess()}
            onPickSubmit={(name) => handleSubmitGuess(name)}
            editable={!roundBusy}
          />
          {error ? <Text style={minigameShellStyles.errorText}>{error}</Text> : null}
          <MinigameResultBanner type={feedbackType} message={feedback} />
          <MinigamePrimaryButton
            label="Submit guess"
            onPress={() => handleSubmitGuess()}
            disabled={roundBusy || !guessGodText.trim()}
          />
          <View style={localStyles.secondaryRow}>
            <View style={localStyles.secondaryHalf}>
              <MinigameSecondaryButton
                label={visibleCount >= 3 ? 'All clues shown' : 'Reveal next'}
                onPress={handleReveal}
                disabled={roundBusy || visibleCount >= 3}
              />
            </View>
            <View style={localStyles.secondaryHalf}>
              <MinigameSecondaryButton label="Skip" onPress={handleSkip} disabled={roundBusy} />
            </View>
          </View>
          {mode.oneSubmit ? (
            <Text style={localStyles.hint}>Hard: one wrong answer ends the run.</Text>
          ) : null}
        </>
      )}

      <MinigameLeaderboard
        title={`Emoji leaderboard (${mode.label})`}
        subtitle={
          currentUser
            ? `Playing as ${currentUser}`
            : 'Sign in on Profile to appear on the leaderboard.'
        }
        loading={isLoadingLeaderboard}
        error={leaderboardError}
        emptyText="No runs yet."
        rows={leaderboard}
        renderRow={(entry, idx) => {
          const isYou = currentUser && entry.username === currentUser;
          return (
            <View
              key={`${entry.username}-${entry.mode}-${idx}`}
              style={[minigameShellStyles.leaderboardRow, isYou && minigameShellStyles.leaderboardRowYou]}
            >
              <Text style={minigameShellStyles.leaderboardRank}>{idx + 1}</Text>
              <Text
                style={[minigameShellStyles.leaderboardName, isYou && minigameShellStyles.leaderboardNameYou]}
                numberOfLines={1}
              >
                {entry.username || 'Anonymous'}
              </Text>
              <Text style={minigameShellStyles.leaderboardScore}>{entry.best_run_score} pts</Text>
            </View>
          );
        }}
      />
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
  clueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: IS_WEB ? 120 : 100,
  },
  clueSlot: {
    width: IS_WEB ? 88 : 72,
    height: IS_WEB ? 88 : 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    backgroundColor: COLORS.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clueSlotHidden: {
    borderColor: UI_THEME.panelBorder,
    opacity: 0.75,
  },
  clueGlyph: {
    fontSize: IS_WEB ? 42 : 36,
    lineHeight: IS_WEB ? 50 : 44,
  },
  clueHiddenMark: {
    color: COLORS.slate500,
    fontSize: 28,
    fontWeight: '800',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  secondaryHalf: { flex: 1 },
  hint: {
    color: UI_THEME.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
});
