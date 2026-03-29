import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../lib/themeColors';
import { Image } from 'expo-image';
import { getGodAbilityIcon } from './localIcons';

const IS_WEB = Platform.OS === 'web';

// Load gods data from Smite2Gods.json (root of project)
let GODS = [];
try {
  GODS = require('../Smite2Gods.json');
} catch (e) {
  console.error('Failed to load Smite2Gods.json for AbilityGame:', e);
  GODS = [];
}

// Normalize name for comparisons
const normalize = (s) => (s || '').toString().trim().toLowerCase();

// Import Supabase with a safe fallback (same pattern as profile page)
let supabase;
try {
  supabase = require('../config/supabase').supabase;
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

// Try to import profile helpers so we can read the current username
let profileHelpers = null;
try {
  profileHelpers = require('./profile').profileHelpers;
} catch (e) {
  profileHelpers = {
    async getCurrentUser() {
      return null;
    },
  };
}

// For now we focus on standard ability slots 1–4 plus Passive/Aspect
const ABILITY_KEYS = ['1', '2', '3', '4', 'P', 'A'];

function pickRandomAbilityTarget() {
  if (!Array.isArray(GODS) || GODS.length === 0) return null;

  // Filter to gods that should have ability icons on GitHub (we assume all do)
  const godsWithNames = GODS.filter((g) => !!g.godName);
  if (godsWithNames.length === 0) return null;

  const godIndex = Math.floor(Math.random() * godsWithNames.length);
  const god = godsWithNames[godIndex];

  // Only use 1–4 for guessing, as requested
  const abilityChoices = ['1', '2', '3', '4'];
  const abilityIndex = Math.floor(Math.random() * abilityChoices.length);
  const abilityKey = abilityChoices[abilityIndex];

  return {
    god,
    abilityKey,
  };
}

export default function AbilityGamePage({ onBack = null }) {
  const [target, setTarget] = useState(() => pickRandomAbilityTarget());
  const [guessGodText, setGuessGodText] = useState('');
  const [selectedAbilityKey, setSelectedAbilityKey] = useState(null); // '1' | '2' | '3' | '4'
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

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
      if (key && !map.has(key)) {
        map.set(key, g);
      }
    });
    return map;
  }, []);

  // Suggestions for input (autocomplete by god name)
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
      const { data, error } = await supabase
        .from('ability_scores')
        .select('username, best_streak, updated_at')
        .order('best_streak', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(50);

      if (error) {
        if (error.code === 'MISSING_CONFIG') {
          // Supabase not configured; silently ignore
          return;
        }
        console.error('Failed to load Ability leaderboard:', error);
        setLeaderboardError('Failed to load leaderboard.');
        return;
      }

      setLeaderboard(data || []);
    } catch (e) {
      console.error('Error loading Ability leaderboard:', e);
      setLeaderboardError('Failed to load leaderboard.');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  // Load current user and leaderboard on mount
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        if (profileHelpers?.getCurrentUser) {
          const user = await profileHelpers.getCurrentUser();
          if (isMounted) {
            setCurrentUser(user);
          }
        }
      } catch (e) {
        console.error('Failed to load current user for Ability leaderboard:', e);
      }

      await fetchLeaderboard();
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [fetchLeaderboard]);

  const submitBestStreak = async (newBest) => {
    if (!supabase || !currentUser || !newBest || newBest <= 0) return;

    try {
      const payload = {
        username: currentUser,
        best_streak: newBest,
      };

      const { error } = await supabase
        .from('ability_scores')
        .upsert(payload, { onConflict: 'username' });

      if (error) {
        if (error.code === 'MISSING_CONFIG') {
          return;
        }
        console.error('Failed to submit ability best streak:', error);
        return;
      }

      await fetchLeaderboard();
    } catch (e) {
      console.error('Error submitting ability best streak:', e);
    }
  };

  const handleSubmitGuess = () => {
    if (!target || !Array.isArray(GODS) || GODS.length === 0) return;
    if (!guessGodText.trim()) {
      setError('Type the god name.');
      return;
    }
    if (!selectedAbilityKey) {
      setError('Select an ability (1–4).');
      return;
    }

    const key = normalize(guessGodText);
    const found = normalizedGodsByName.get(key);

    if (!found) {
      setError('God not found. Check spelling (e.g. "Achilles").');
      return;
    }

    setError('');

    const correctGod = normalize(found.godName) === normalize(target.god.godName);
    const correctAbility = String(selectedAbilityKey) === String(target.abilityKey);

    if (correctGod && correctAbility) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      setFeedback(`Correct! It was ${target.god.godName} ability ${target.abilityKey}.`);

      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        submitBestStreak(newStreak);
      }

      try {
        const { awardChallenge } = require('../lib/shopChallenges');
        awardChallenge('ability_win').catch(() => {});
      } catch (_) {}

      // Immediately move to the next random ability
      const nextTarget = pickRandomAbilityTarget();
      setTarget(nextTarget);
      setGuessGodText('');
      setSelectedAbilityKey(null);
      setError('');
    } else {
      setFeedback(
        `Incorrect. It was ${target.god.godName} ability ${target.abilityKey}. Your streak has been reset.`
      );
      setCurrentStreak(0);

      // Immediately move to the next random ability
      const nextTarget = pickRandomAbilityTarget();
      setTarget(nextTarget);
      setGuessGodText('');
      setSelectedAbilityKey(null);
      setError('');
    }
  };

  const abilityIconSource =
    target && target.god
      ? getGodAbilityIcon(target.god.godName, target.abilityKey)
      : null;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={IS_WEB ? undefined : Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back to Menu</Text>
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={styles.title}>Guess the Ability</Text>
            <Text style={styles.subtitle}>
              Guess the Smite 2 god and which ability (1–4) this icon belongs to.
            </Text>
            <Text style={styles.subtitleSmall}>
              Your current streak is how many you&apos;ve gotten correct in a row. The leaderboard
              tracks the highest streak.
            </Text>
          </View>

          {!target && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>No ability data available.</Text>
            </View>
          )}

          {target && (
            <>
              <View style={styles.streakRow}>
                <Text style={styles.streakText}>Current streak: {currentStreak}</Text>
                <Text style={styles.streakText}>Best streak: {bestStreak}</Text>
              </View>

              <View style={styles.abilityCard}>
                {abilityIconSource ? (
                  <Image
                    source={abilityIconSource}
                    style={styles.abilityIcon}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.abilityIconFallback}>
                    <Text style={styles.abilityIconFallbackText}>?</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>God Name:</Text>
                <TextInput
                  style={styles.input}
                  value={guessGodText}
                  onChangeText={setGuessGodText}
                  placeholder="Type a god name (e.g. Achilles)"
                  placeholderTextColor={COLORS.slate500}
                  autoCapitalize="words"
                  autoCorrect={false}
                  onSubmitEditing={handleSubmitGuess}
                />

                {suggestions.length > 0 && (
                  <View style={styles.suggestionBox}>
                    {suggestions.map((g) => (
                      <TouchableOpacity
                        key={g.godName}
                        style={styles.suggestionRow}
                        onPress={() => setGuessGodText(g.godName)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>{g.godName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Ability Number:</Text>
                <View style={styles.abilityButtonsRow}>
                  {['1', '2', '3', '4'].map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.abilityButton,
                        selectedAbilityKey === key && styles.abilityButtonSelected,
                      ]}
                      onPress={() => setSelectedAbilityKey(key)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.abilityButtonText,
                          selectedAbilityKey === key && styles.abilityButtonTextSelected,
                        ]}
                      >
                        {key}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitGuess}>
                <Text style={styles.submitButtonText}>Submit Guess</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Leaderboard: highest streak at the top */}
          <View style={styles.leaderboardContainer}>
            <Text style={styles.leaderboardTitle}>Ability Leaderboard (Best streak)</Text>
            <Text style={styles.leaderboardSubtitle}>
              {currentUser
                ? `You are playing as "${currentUser}". Your highest streak will appear here.`
                : 'Sign in on the Profile tab to appear on this leaderboard.'}
            </Text>

            {leaderboardError ? <Text style={styles.errorText}>{leaderboardError}</Text> : null}

            {isLoadingLeaderboard ? (
              <View style={styles.leaderboardLoading}>
                <ActivityIndicator color={COLORS.brandBlue} />
              </View>
            ) : leaderboard.length === 0 ? (
              <Text style={styles.leaderboardEmptyText}>
                No streaks recorded yet. Be the first!
              </Text>
            ) : (
              <View style={styles.leaderboardList}>
                {leaderboard.map((entry, idx) => {
                  const isYou =
                    currentUser && entry.username && entry.username === currentUser;
                  return (
                    <View
                      key={`${entry.username}-${idx}`}
                      style={[
                        styles.leaderboardRow,
                        isYou && styles.leaderboardRowYou,
                      ]}
                    >
                      <Text style={styles.leaderboardRank}>{idx + 1}</Text>
                      <Text
                        style={[
                          styles.leaderboardUsername,
                          isYou && styles.leaderboardUsernameYou,
                        ]}
                        numberOfLines={1}
                      >
                        {entry.username || 'Anonymous'}
                      </Text>
                      <Text style={styles.leaderboardStreak}>
                        {entry.best_streak} in a row
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgVoid,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  backButton: {
    backgroundColor: COLORS.brandBlue,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: COLORS.statStrength,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.slate300,
    fontSize: 14,
    marginBottom: 4,
  },
  subtitleSmall: {
    color: COLORS.slate400,
    fontSize: 12,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  streakText: {
    color: COLORS.gray200,
    fontSize: 14,
    fontWeight: '600',
  },
  abilityCard: {
    backgroundColor: COLORS.void2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate800,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  abilityIcon: {
    width: IS_WEB ? 200 : 150,
    height: IS_WEB ? 200 : 150,
    borderRadius: 16,
  },
  abilityIconFallback: {
    width: IS_WEB ? 200 : 150,
    height: IS_WEB ? 200 : 150,
    borderRadius: 16,
    backgroundColor: COLORS.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityIconFallbackText: {
    color: COLORS.gray200,
    fontSize: 40,
    fontWeight: '800',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: COLORS.gray200,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: COLORS.gray200,
    fontSize: 14,
  },
  abilityButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  abilityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    alignItems: 'center',
    backgroundColor: COLORS.bgDeep,
  },
  abilityButtonSelected: {
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.skyBright,
  },
  abilityButtonText: {
    color: COLORS.gray200,
    fontSize: 16,
    fontWeight: '600',
  },
  abilityButtonTextSelected: {
    color: COLORS.white,
  },
  errorBox: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.red700,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.red200,
    fontSize: 12,
  },
  feedbackText: {
    color: COLORS.greenSoft,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 10,
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.statHealth,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionBox: {
    marginTop: 8,
    backgroundColor: COLORS.void2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate800,
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgDeep,
  },
  suggestionText: {
    color: COLORS.gray200,
    fontSize: IS_WEB ? 13 : 11,
    fontWeight: '500',
  },
  leaderboardContainer: {
    marginTop: 16,
    backgroundColor: COLORS.void2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    padding: 12,
  },
  leaderboardTitle: {
    color: COLORS.skySoft,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  leaderboardSubtitle: {
    color: COLORS.slate400,
    fontSize: 12,
    marginBottom: 8,
  },
  leaderboardLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaderboardEmptyText: {
    color: COLORS.slate500,
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  leaderboardList: {
    marginTop: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgDeep,
  },
  leaderboardRowYou: {
    backgroundColor: COLORS.voidPanel,
  },
  leaderboardRank: {
    width: 24,
    textAlign: 'center',
    color: COLORS.gray200,
    fontSize: 12,
    fontWeight: '700',
  },
  leaderboardUsername: {
    flex: 1,
    color: COLORS.gray200,
    fontSize: 12,
  },
  leaderboardUsernameYou: {
    color: COLORS.indigoLight,
    fontWeight: '700',
  },
  leaderboardStreak: {
    minWidth: 90,
    textAlign: 'right',
    color: COLORS.statStrength,
    fontSize: 12,
    fontWeight: '600',
  },
});

