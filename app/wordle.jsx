import React, { useEffect, useMemo, useState } from 'react';
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
import { Image } from 'expo-image';
import { getLocalGodAsset, getRemoteGodIconByName } from './localIcons';

const IS_WEB = Platform.OS === 'web';

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

// Load gods data from Smite2Gods.json (root of project)
let GODS = [];
try {
  // wordle.jsx lives in /app, Smite2Gods.json is in project root
  GODS = require('../Smite2Gods.json');
} catch (e) {
  console.error('Failed to load Smite2Gods.json for WordlePage:', e);
  GODS = [];
}

// Normalize name for comparisons
const normalize = (s) => (s || '').toString().trim().toLowerCase();

// Daily slot (12 hour window) so everyone shares the same target in that window
const getDailySlot = () => Math.floor(Date.now() / (1000 * 60 * 60 * 12));
const pickGodForSlot = (slot) => {
  if (!Array.isArray(GODS) || GODS.length === 0) return null;
  const idx = slot % GODS.length;
  return GODS[idx];
};

export default function WordlePage({ gameMode: _initialGameMode = 'daily', onBack = null }) {
  const [mode, setMode] = useState(_initialGameMode === 'freeplay' ? 'free' : 'daily'); // 'daily' or 'free'
  const [currentSlot] = useState(getDailySlot);

  const [targetGod, setTargetGod] = useState(() => {
    if (!Array.isArray(GODS) || GODS.length === 0) return null;
    return pickGodForSlot(getDailySlot());
  });

  const [guessText, setGuessText] = useState('');
  const [guesses, setGuesses] = useState([]); // { god, feedback }
  const [error, setError] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  const maxGuesses = 6;

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

  // Load current user (for leaderboard name) and initial leaderboard
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
        console.error('Failed to load current user for Wordle leaderboard:', e);
      }

      // Load leaderboard for the current daily slot
      await fetchLeaderboard(getDailySlot());
    };

    init();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLeaderboard = async (slot) => {
    if (!supabase) return;

    setIsLoadingLeaderboard(true);
    setLeaderboardError('');

    try {
      const { data, error } = await supabase
        .from('wordle_scores')
        .select('username, guesses, slot, created_at')
        .eq('slot', slot)
        .order('guesses', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        if (error.code === 'MISSING_CONFIG') {
          // Supabase not configured; silently ignore and use local-only mode
          return;
        }
        console.error('Failed to load Wordle leaderboard:', error);
        setLeaderboardError('Failed to load leaderboard.');
        return;
      }

      setLeaderboard(data || []);
    } catch (e) {
      console.error('Error loading Wordle leaderboard:', e);
      setLeaderboardError('Failed to load leaderboard.');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const submitScore = async (guessesCount) => {
    if (!supabase || !currentUser) return;

    const slot = getDailySlot();

    try {
      // Upsert best score for this user and slot
      const payload = {
        username: currentUser,
        slot,
        guesses: guessesCount,
      };

      const { error } = await supabase
        .from('wordle_scores')
        .upsert(payload, { onConflict: 'username,slot' });

      if (error) {
        if (error.code === 'MISSING_CONFIG') {
          return;
        }
        console.error('Failed to submit Wordle score:', error);
        return;
      }

      // Refresh leaderboard after submitting score
      await fetchLeaderboard(slot);
    } catch (e) {
      console.error('Error submitting Wordle score:', e);
    }
  };

  const resetGame = () => {
    if (!Array.isArray(GODS) || GODS.length === 0) return;
    const idx = Math.floor(Math.random() * GODS.length);
    setTargetGod(GODS[idx]);
    setGuessText('');
    setGuesses([]);
    setError('');
    setIsComplete(false);
  };

  const buildFeedback = (guessGod, target) => {
    if (!guessGod || !target) return {};

    const fields = {
      pantheon: {
        label: 'Pantheon',
        value: guessGod.pantheon,
        target: target.pantheon,
      },
      role: {
        label: 'Role',
        value: guessGod.Role,
        target: target.Role,
      },
      attackType: {
        label: 'Attack Type',
        value: guessGod['Attack Type'],
        target: target['Attack Type'],
      },
      powerType: {
        label: 'Power Type',
        value: guessGod['Power Type'],
        target: target['Power Type'],
      },
      scalesWith: {
        label: 'Scales With',
        value: guessGod['Scales with'],
        target: target['Scales with'],
      },
      gender: {
        label: 'Gender',
        value: guessGod.Gender,
        target: target.Gender,
      },
      year: {
        label: 'Release Year',
        value: guessGod.releaseYear,
        target: target.releaseYear,
      },
    };

    const toYear = (val) => {
      if (!val) return null;
      try {
        // value looks like "2018-02-27" – take year part
        const str = String(val);
        const year = parseInt(str.slice(0, 4), 10);
        return Number.isNaN(year) ? null : year;
      } catch {
        return null;
      }
    };

    const feedback = {};

    Object.entries(fields).forEach(([key, info]) => {
      let color = 'red';
      let hint = '';

      if (key === 'year') {
        const gYear = toYear(info.value);
        const tYear = toYear(info.target);
        if (gYear != null && tYear != null) {
          const diff = Math.abs(gYear - tYear);
          if (diff === 0) {
            color = 'green';
            hint = 'Same year';
          } else if (diff <= 2) {
            color = 'yellow';
            hint = diff === 1 ? '±1 year' : '±2 years';
          } else {
            color = 'red';
            hint = gYear < tYear ? 'Earlier' : 'Later';
          }
        } else {
          color = 'red';
        }
      } else {
        const gVal = normalize(info.value);
        const tVal = normalize(info.target);

        if (gVal && tVal && gVal === tVal) {
          color = 'green';
        } else {
          // For some fields we can treat categories as "close" and use yellow
          if (key === 'powerType') {
            // Physical vs Magical are very different, so just red
            color = 'red';
          } else if (key === 'scalesWith') {
            // If target is Mixed and guess is STR/INT or vice versa -> yellow
            if (
              (tVal === 'mixed' && (gVal === 'str' || gVal === 'int')) ||
              (gVal === 'mixed' && (tVal === 'str' || tVal === 'int'))
            ) {
              color = 'yellow';
            } else {
              color = 'red';
            }
          } else if (key === 'role') {
            // ADC vs Carry etc. – simple contains check for yellow
            if (gVal && tVal && (gVal.includes(tVal) || tVal.includes(gVal))) {
              color = 'yellow';
            } else {
              color = 'red';
            }
          } else if (key === 'gender') {
            // Explicit: green if gender matches, red otherwise
            color = gVal === tVal ? 'green' : 'red';
          } else {
            color = 'red';
          }
        }
      }

      feedback[key] = {
        label: info.label,
        value: info.value,
        target: info.target,
        color,
        hint,
      };
    });

    return feedback;
  };

  const handleSubmitGuess = () => {
    if (!targetGod || !Array.isArray(GODS) || GODS.length === 0) return;
    if (isComplete && mode === 'daily') return;
    const trimmed = guessText.trim();
    if (!trimmed) return;

    const key = normalize(trimmed);
    const found = normalizedGodsByName.get(key);

    if (!found) {
      setError('God not found. Check spelling (e.g. "Achilles").');
      return;
    }

    setError('');

    const feedback = buildFeedback(found, targetGod);
    const newEntry = {
      god: found,
      feedback,
    };

    const nextGuesses = [...guesses, newEntry];
    setGuesses(nextGuesses);
    setGuessText('');

    const correct = normalize(found.godName) === normalize(targetGod.godName);
    if (mode === 'daily') {
      if (correct || nextGuesses.length >= maxGuesses) {
        setIsComplete(true);
        // Record score for daily mode when puzzle ends
        submitScore(nextGuesses.length);
      }
    } else {
      // In freeplay, treat each puzzle as up to 6 guesses, then auto-reset
      if (correct || nextGuesses.length >= maxGuesses) {
        setIsComplete(true);
      }
    }
  };

  const lastGuessCorrect =
    guesses.length > 0 &&
    targetGod &&
    normalize(guesses[guesses.length - 1].god.godName) === normalize(targetGod.godName);

  const guessesRemaining = Math.max(0, maxGuesses - guesses.length);

  // Suggestions for input (autocomplete)
  const suggestions = useMemo(() => {
    const term = normalize(guessText);
    if (!term || !Array.isArray(GODS)) return [];
    return GODS.filter((g) => normalize(g.godName).includes(term)).slice(0, 8);
  }, [guessText]);

  const startFreeplay = () => {
    if (!Array.isArray(GODS) || GODS.length === 0) return;
    const idx = Math.floor(Math.random() * GODS.length);
    setTargetGod(GODS[idx]);
    setGuessText('');
    setGuesses([]);
    setError('');
    setIsComplete(false);
    setMode('free');
  };

  const resetDailyIfNewSlot = () => {
    const slot = getDailySlot();
    if (slot !== currentSlot) {
      const g = pickGodForSlot(slot);
      setGuessText('');
      setGuesses([]);
      setError('');
      setIsComplete(false);
      setMode('daily');
      if (g) {
        setTargetGod(g);
      }
    }
  };

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
            <Text style={styles.title}>Smite 2 God Wordle</Text>
            <Text style={styles.subtitle}>
              Guess the hidden daily god by name. You have {maxGuesses} guesses.
            </Text>
            <Text style={styles.subtitleSmall}>
              Each row shows how your guess compares to the hidden god by Pantheon, Role, Attack Type,
              Power Type, Scales With, Gender, and Release Year.
            </Text>
            {mode === 'daily' ? (
              <Text style={styles.subtitleSmall}>
                Daily mode • Guesses remaining: {guessesRemaining}
              </Text>
            ) : (
              <Text style={styles.subtitleSmall}>
                Freeplay mode • Puzzles are random and do not affect the daily.
              </Text>
            )}
          </View>

          {(!targetGod || GODS.length === 0) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>God data not available.</Text>
            </View>
          )}

          {targetGod && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Your Guess:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={guessText}
                  onChangeText={setGuessText}
                  placeholder="Type a god name (e.g. Achilles)"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                  autoCorrect={false}
                  onSubmitEditing={handleSubmitGuess}
                  editable={!isComplete}
                />
                <TouchableOpacity
                  style={[styles.submitButton, !guessText.trim() && styles.submitButtonDisabled]}
                  onPress={handleSubmitGuess}
                  disabled={!guessText.trim() || isComplete}
                >
                  <Text style={styles.submitButtonText}>Guess</Text>
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {suggestions.length > 0 && !isComplete && (
                <View style={styles.suggestionBox}>
                  {suggestions.map((g) => {
                    // Build icon URL directly from the god name using GitHub God Info assets
                    // Example: "Achilles" -> .../God%20Info/achillesImage.webp
                    const imageSource = getRemoteGodIconByName(g.godName);

                    return (
                      <TouchableOpacity
                        key={g.godName}
                        style={styles.suggestionRow}
                        onPress={() => setGuessText(g.godName)}
                        activeOpacity={0.7}
                      >
                        {imageSource ? (
                          <Image
                            source={imageSource}
                            style={styles.suggestionIcon}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        ) : (
                          <View style={styles.suggestionIconFallback}>
                            <Text style={styles.suggestionIconFallbackText}>
                              {g.godName.charAt(0)}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.suggestionText}>{g.godName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Table-style results: 6 rows max, fixed columns */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderCellFirst]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.tableHeaderName]}>God</Text>
              {['Pantheon', 'Role', 'Attack', 'Power', 'Scales', 'Gender', 'Year'].map((label) => (
                <Text key={label} style={styles.tableHeaderCell}>
                  {label}
                </Text>
              ))}
            </View>

            {Array.from({ length: maxGuesses }).map((_, rowIdx) => {
              const entry = guesses[rowIdx];
              const god = entry?.god;
              const feedback = entry?.feedback || {};
              const guessCorrect =
                god && targetGod && normalize(god.godName) === normalize(targetGod.godName);

              return (
                <View key={`row-${rowIdx}`} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellFirst]}>{rowIdx + 1}</Text>
                  <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>
                    {god ? god.godName : '—'}
                    {guessCorrect ? ' ✓' : ''}
                  </Text>
                  {['pantheon', 'role', 'attackType', 'powerType', 'scalesWith', 'gender', 'year'].map(
                    (key) => {
                      const fb = feedback[key];
                      let bgColor = 'transparent';
                      if (fb) {
                        if (fb.color === 'green') bgColor = '#166534';
                        else if (fb.color === 'yellow') bgColor = '#854d0e';
                        else bgColor = '#7f1d1d';
                      }
                      return (
                        <View key={key} style={[styles.tableCell, styles.tableCellStat, { backgroundColor: bgColor }]}>
                          <Text style={styles.tableCellStatText} numberOfLines={1}>
                            {fb?.value || '—'}
                          </Text>
                        </View>
                      );
                    }
                  )}
                </View>
              );
            })}
          </View>

          {isComplete && targetGod && (
            <View style={styles.resultBox}>
              {lastGuessCorrect ? (
                <Text style={styles.resultTextSuccess}>You guessed it! The god was {targetGod.godName}.</Text>
              ) : (
                <Text style={styles.resultTextFailure}>
                  Out of guesses. The god was {targetGod.godName}.
                </Text>
              )}
              {mode === 'daily' ? (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setIsComplete(true);
                    startFreeplay();
                  }}
                >
                  <Text style={styles.resetButtonText}>Switch to Freeplay</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setGuessText('');
                    setGuesses([]);
                    setError('');
                    setIsComplete(false);
                    // Freeplay new random god
                    startFreeplay();
                  }}
                >
                  <Text style={styles.resetButtonText}>New Freeplay Puzzle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Daily leaderboard (least guesses at the top) */}
          {mode === 'daily' && (
            <View style={styles.leaderboardContainer}>
              <Text style={styles.leaderboardTitle}>Daily Leaderboard (Least guesses)</Text>
              <Text style={styles.leaderboardSubtitle}>
                {currentUser
                  ? `You are playing as "${currentUser}". Finish the daily to appear here.`
                  : 'Sign in on the Profile tab to appear on the leaderboard.'}
              </Text>

              {leaderboardError ? <Text style={styles.errorText}>{leaderboardError}</Text> : null}

              {isLoadingLeaderboard ? (
                <View style={styles.leaderboardLoading}>
                  <ActivityIndicator color="#1e90ff" />
                </View>
              ) : leaderboard.length === 0 ? (
                <Text style={styles.leaderboardEmptyText}>
                  No scores for this daily yet. Be the first!
                </Text>
              ) : (
                <View style={styles.leaderboardList}>
                  {leaderboard.map((entry, idx) => {
                    const isYou =
                      currentUser && entry.username && entry.username === currentUser;
                    return (
                      <View
                        key={`${entry.username}-${entry.slot}-${idx}`}
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
                        <Text style={styles.leaderboardGuesses}>
                          {entry.guesses} guess{entry.guesses === 1 ? '' : 'es'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071024',
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
    backgroundColor: '#1e90ff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  subtitleSmall: {
    color: '#94a3b8',
    fontSize: 12,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#e5e7eb',
    marginBottom: 6,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#0b1226',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#e5e7eb',
    fontSize: 14,
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1e90ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#1e3a5f',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#0b1226',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b91c1c',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#fecaca',
    fontSize: 12,
  },
  tableContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#020617',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0b1226',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: IS_WEB ? 8 : 4,
    paddingHorizontal: IS_WEB ? 6 : 3,
    color: '#e5e7eb',
    fontSize: IS_WEB ? 11 : 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableHeaderCellFirst: {
    flex: 0.5,
  },
  tableHeaderName: {
    flex: 1.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  tableCell: {
    flex: 1,
    paddingVertical: IS_WEB ? 6 : 3,
    paddingHorizontal: IS_WEB ? 6 : 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellFirst: {
    flex: 0.5,
  },
  tableCellName: {
    flex: 1.5,
    alignItems: 'flex-start',
  },
  tableCellStat: {
    minWidth: IS_WEB ? 60 : 45,
  },
  tableCellStatText: {
    color: '#e5e7eb',
    fontSize: IS_WEB ? 10 : 8,
  },
  resultBox: {
    marginTop: 16,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
  },
  resultTextSuccess: {
    color: '#bbf7d0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultTextFailure: {
    color: '#fecaca',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#1e90ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionBox: {
    marginTop: 8,
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: 220,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0b1226',
  },
  suggestionIcon: {
    width: IS_WEB ? 32 : 26,
    height: IS_WEB ? 32 : 26,
    borderRadius: IS_WEB ? 16 : 13,
    marginRight: 8,
  },
  suggestionIconFallback: {
    width: IS_WEB ? 32 : 26,
    height: IS_WEB ? 32 : 26,
    borderRadius: IS_WEB ? 16 : 13,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  suggestionIconFallbackText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionText: {
    color: '#e5e7eb',
    fontSize: IS_WEB ? 13 : 11,
    fontWeight: '500',
  },
  leaderboardContainer: {
    marginTop: 16,
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 12,
  },
  leaderboardTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  leaderboardSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  leaderboardLoading: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaderboardEmptyText: {
    color: '#64748b',
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
    borderBottomColor: '#0b1226',
  },
  leaderboardRowYou: {
    backgroundColor: '#0b1120',
  },
  leaderboardRank: {
    width: 24,
    textAlign: 'center',
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
  },
  leaderboardUsername: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 12,
  },
  leaderboardUsernameYou: {
    color: '#a5b4fc',
    fontWeight: '700',
  },
  leaderboardGuesses: {
    minWidth: 70,
    textAlign: 'right',
    color: '#facc15',
    fontSize: 12,
    fontWeight: '600',
  },
});
