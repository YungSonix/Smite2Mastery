import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { COLORS } from '../../lib/themeColors';
import { Image } from 'expo-image';
import { getGodAbilityIcon } from '../localIcons';
import { getSmite2Gods } from '../../lib/smite2GodsData';
import { playMinigameSound } from '../../lib/minigameSounds';
import { useMinigameGold, pauseMinigameRound } from '../../hooks/useMinigameGold';
import {
  MinigamePage,
  MinigameHeader,
  MinigameStreakLine,
  MinigameMediaCard,
  MinigameGodSearch,
  MinigameChipRow,
  MinigamePrimaryButton,
  MinigameResultBanner,
  MinigameLeaderboard,
  minigameShellStyles,
} from '../../lib/MinigameShell';

const IS_WEB = Platform.OS === 'web';

let GODS = [];
try {
  GODS = getSmite2Gods();
} catch (e) {
  console.error('Failed to load Smite2Gods.json for AbilityGame:', e);
  GODS = [];
}

const normalize = (s) => (s || '').toString().trim().toLowerCase();

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
    rpc: async () => ({
      error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
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

function pickRandomAbilityTarget() {
  if (!Array.isArray(GODS) || GODS.length === 0) return null;
  const godsWithNames = GODS.filter((g) => !!g.godName);
  if (godsWithNames.length === 0) return null;
  const god = godsWithNames[Math.floor(Math.random() * godsWithNames.length)];
  const abilityKey = ['1', '2', '3', '4'][Math.floor(Math.random() * 4)];
  return { god, abilityKey };
}

export default function AbilityGamePage({ onBack = null }) {
  const { gold } = useMinigameGold();
  const [target, setTarget] = useState(() => pickRandomAbilityTarget());
  const [guessGodText, setGuessGodText] = useState('');
  const [selectedAbilityKey, setSelectedAbilityKey] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('neutral');
  const [roundBusy, setRoundBusy] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  const normalizedGodsByName = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(GODS)) return map;
    GODS.forEach((g) => {
      const key = normalize(g.godName);
      if (key && !map.has(key)) map.set(key, g);
    });
    return map;
  }, []);

  const suggestions = useMemo(() => {
    const term = normalize(guessGodText);
    if (!term || !Array.isArray(GODS)) return [];
    return GODS.filter((g) => normalize(g.godName).includes(term)).slice(0, 8);
  }, [guessGodText]);

  const fetchLeaderboard = useCallback(async () => {
    if (!supabase) return;
    setIsLoadingLeaderboard(true);
    setLeaderboardError('');
    try {
      const { data, error: lbError } = await supabase
        .from('ability_scores')
        .select('username, best_streak, updated_at')
        .order('best_streak', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(50);
      if (lbError) {
        if (lbError.code !== 'MISSING_CONFIG') setLeaderboardError('Failed to load leaderboard.');
        return;
      }
      setLeaderboard(data || []);
    } catch (_) {
      setLeaderboardError('Failed to load leaderboard.');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

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

  const submitBestStreak = async (newBest) => {
    if (!supabase || !currentUser || !newBest || newBest <= 0) return;
    const authSession = await ensureAppWriteSession(currentUser);
    if (!authSession.ready) return;
    try {
      const { error: upsertError } = await supabase
        .from('ability_scores')
        .upsert({ username: currentUser, best_streak: newBest }, { onConflict: 'username' });
      if (!upsertError || upsertError.code === 'MISSING_CONFIG') await fetchLeaderboard();
    } catch (_) {}
  };

  const handleSubmitGuess = useCallback(
    async (godNameOverride = null) => {
      if (!target || roundBusy || !Array.isArray(GODS) || GODS.length === 0) return;
      const nameToUse = String(godNameOverride || guessGodText || '').trim();
      if (!nameToUse) {
        setError('Type the god name.');
        return;
      }
      if (!selectedAbilityKey) {
        setError('Select an ability (1–4).');
        return;
      }
      const found = normalizedGodsByName.get(normalize(nameToUse));
      if (!found) {
        setError('God not found. Check spelling.');
        return;
      }
      setError('');
      const correctGod = normalize(found.godName) === normalize(target.god.godName);
      const correctAbility = String(selectedAbilityKey) === String(target.abilityKey);
      if (correctGod && correctAbility) {
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        setFeedback(`Correct! ${target.god.godName} — ability ${target.abilityKey}.`);
        setFeedbackType('success');
        playMinigameSound('correct');
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
          submitBestStreak(newStreak);
        }
        try {
          const { awardChallenge } = require('../../lib/shopChallenges');
          awardChallenge('ability_win').catch(() => {});
        } catch (_) {}
      } else {
        setFeedback(`Not quite — ${target.god.godName}, ability ${target.abilityKey}.`);
        setFeedbackType('error');
        playMinigameSound('incorrect');
        setCurrentStreak(0);
      }
      await pauseMinigameRound(setRoundBusy);
      setTarget(pickRandomAbilityTarget());
      setGuessGodText('');
      setSelectedAbilityKey(null);
    },
    [target, roundBusy, guessGodText, selectedAbilityKey, normalizedGodsByName, currentStreak, bestStreak]
  );

  const abilityIconSource =
    target && target.god ? getGodAbilityIcon(target.god.godName, target.abilityKey) : null;

  return (
    <MinigamePage onBack={onBack}>
      <MinigameHeader
        title="Guess the Ability"
        subtitle="Name the god + ability slot for the icon."
        gold={gold}
      />

      {!target ? (
        <View style={localStyles.errorBox}>
          <Text style={localStyles.errorText}>No ability data available.</Text>
        </View>
      ) : (
        <>
          <MinigameStreakLine current={currentStreak} best={bestStreak} />
          <MinigameMediaCard label="Which ability?" busy={roundBusy}>
            {abilityIconSource ? (
              <Image
                source={abilityIconSource}
                style={localStyles.mediaIcon}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={localStyles.mediaFallback}>
                <Text style={localStyles.mediaFallbackText}>?</Text>
              </View>
            )}
          </MinigameMediaCard>
          <MinigameGodSearch
            label="God name"
            value={guessGodText}
            onChangeText={setGuessGodText}
            placeholder="Type a god name"
            gods={suggestions}
            onSubmitEditing={() => handleSubmitGuess()}
            onPickSubmit={(name) => {
              // Autofill the god; only submit if an ability slot is already picked.
              setGuessGodText(name);
              setError('');
              if (selectedAbilityKey) handleSubmitGuess(name);
            }}
            editable={!roundBusy}
          />
          <MinigameChipRow
            label="Ability slot"
            value={selectedAbilityKey}
            onChange={setSelectedAbilityKey}
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
            ]}
          />
          {error ? <Text style={minigameShellStyles.errorText}>{error}</Text> : null}
          <MinigameResultBanner type={feedbackType} message={feedback} />
          <MinigamePrimaryButton
            label="Submit guess"
            onPress={() => handleSubmitGuess()}
            disabled={roundBusy || !guessGodText.trim() || !selectedAbilityKey}
          />
        </>
      )}

      <MinigameLeaderboard
        title="Ability leaderboard"
        subtitle={currentUser ? `Playing as ${currentUser}` : 'Sign in to save your best streak.'}
        loading={isLoadingLeaderboard}
        error={leaderboardError}
        emptyText="No streaks yet."
        rows={leaderboard}
        renderRow={(entry, idx) => {
          const isYou = currentUser && entry.username === currentUser;
          return (
            <View
              key={`${entry.username}-${idx}`}
              style={[minigameShellStyles.leaderboardRow, isYou && minigameShellStyles.leaderboardRowYou]}
            >
              <Text style={minigameShellStyles.leaderboardRank}>{idx + 1}</Text>
              <Text
                style={[minigameShellStyles.leaderboardName, isYou && minigameShellStyles.leaderboardNameYou]}
                numberOfLines={1}
              >
                {entry.username || 'Anonymous'}
              </Text>
              <Text style={minigameShellStyles.leaderboardScore}>{entry.best_streak} in a row</Text>
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
  mediaIcon: {
    width: IS_WEB ? 200 : 160,
    height: IS_WEB ? 200 : 160,
    borderRadius: 16,
  },
  mediaFallback: {
    width: IS_WEB ? 200 : 160,
    height: IS_WEB ? 200 : 160,
    borderRadius: 16,
    backgroundColor: COLORS.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFallbackText: {
    color: COLORS.gray200,
    fontSize: 40,
    fontWeight: '800',
  },
});
