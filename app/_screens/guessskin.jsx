import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../lib/themeColors';
import { UI_THEME } from '../../lib/uiTheme';
import { getSkinImage } from '../localIcons';
import { getSmite2Gods } from '../../lib/smite2GodsData';
import { loadBuildsGodsData } from '../../lib/loadBuildsData';
import { playMinigameSound } from '../../lib/minigameSounds';
import { SkinCropPreview } from '../../lib/SkinCropPreview';
import { useMinigameGold, pauseMinigameRound } from '../../hooks/useMinigameGold';
import {
  buildGodNameMap,
  buildSkinGuessPool,
  matchGodName,
  pickRandomSkinTarget,
} from '../../lib/minigamePools';
import {
  MinigamePage,
  MinigameHeader,
  MinigameStreakLine,
  MinigameMediaCard,
  MinigameGodSearch,
  MinigamePrimaryButton,
  MinigameResultBanner,
  minigameShellStyles,
} from '../../lib/MinigameShell';

const IS_WEB = Platform.OS === 'web';
const normalize = (s) => (s || '').toString().trim().toLowerCase();

let GODS = [];
try {
  GODS = getSmite2Gods();
} catch (_) {
  GODS = [];
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function GuessSkinPage({ onBack = null }) {
  const { gold } = useMinigameGold();
  const [pool, setPool] = useState([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('neutral');
  const [roundBusy, setRoundBusy] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  // phase: 'god' (guess the god) | 'skin' (bonus — pick the exact skin)
  const [phase, setPhase] = useState('god');
  const [skinOptions, setSkinOptions] = useState([]);

  const godNameMap = useMemo(() => buildGodNameMap(GODS), []);

  useEffect(() => {
    let mounted = true;
    loadBuildsGodsData()
      .then((data) => {
        if (!mounted) return;
        const built = buildSkinGuessPool(data?.gods);
        setPool(built);
        setTarget(pickRandomSkinTarget(built));
      })
      .catch(() => {
        if (mounted) setPool([]);
      })
      .finally(() => {
        if (mounted) setPoolLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const suggestions = useMemo(() => {
    const term = normalize(guessText);
    if (!term) return [];
    return GODS.filter((g) => normalize(g.godName).includes(term)).slice(0, 8);
  }, [guessText]);

  const nextRound = useCallback(
    (exclude) => {
      if (!pool.length) return null;
      if (pool.length === 1) return pool[0];
      let pick = pickRandomSkinTarget(pool);
      let guard = 0;
      while (exclude && pick && pick.godName === exclude.godName && pick.skinName === exclude.skinName && guard < 8) {
        pick = pickRandomSkinTarget(pool);
        guard += 1;
      }
      return pick;
    },
    [pool]
  );

  const advanceRound = useCallback(
    async (prevTarget) => {
      await pauseMinigameRound(setRoundBusy);
      setTarget(nextRound(prevTarget));
      setPhase('god');
      setSkinOptions([]);
      setGuessText('');
    },
    [nextRound]
  );

  const buildSkinOptions = useCallback(
    (forTarget) => {
      const names = [];
      const seen = new Set();
      pool.forEach((entry) => {
        if (entry.godName !== forTarget.godName) return;
        const key = normalize(entry.skinName);
        if (!key || seen.has(key)) return;
        seen.add(key);
        names.push(entry.skinName);
      });
      const correct = forTarget.skinName;
      const others = names.filter((n) => normalize(n) !== normalize(correct));
      const picked = shuffle(others).slice(0, 5);
      return shuffle([correct, ...picked]);
    },
    [pool]
  );

  const handleGodGuess = useCallback(
    async (godNameOverride = null) => {
      if (!target || roundBusy || phase !== 'god') return;
      const trimmed = String(godNameOverride || guessText || '').trim();
      if (!trimmed) {
        setError('Type the god name.');
        return;
      }
      const found = godNameMap.get(normalize(trimmed));
      if (!found) {
        setError('God not found. Check spelling.');
        return;
      }
      setError('');
      if (matchGodName(found.godName, target.godName)) {
        setCurrentStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        playMinigameSound('correct');
        const options = buildSkinOptions(target);
        if (options.length >= 2) {
          setFeedback(`Correct — ${target.godName}! Bonus: which skin is it?`);
          setFeedbackType('success');
          setPhase('skin');
          setSkinOptions(options);
          setGuessText('');
        } else {
          setFeedback(`Correct! ${target.godName} (${target.skinName}).`);
          setFeedbackType('success');
          await advanceRound(target);
        }
      } else {
        setCurrentStreak(0);
        setFeedback(`Wrong — ${target.godName} (${target.skinName}).`);
        setFeedbackType('error');
        playMinigameSound('incorrect');
        await advanceRound(target);
      }
    },
    [target, roundBusy, phase, guessText, godNameMap, buildSkinOptions, advanceRound]
  );

  const handleSkinPick = useCallback(
    async (skinName) => {
      if (!target || roundBusy || phase !== 'skin') return;
      if (normalize(skinName) === normalize(target.skinName)) {
        setCurrentStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        setFeedback(`Bonus! "${target.skinName}" — +1 streak.`);
        setFeedbackType('success');
        playMinigameSound('correct');
      } else {
        setFeedback(`No bonus — it was "${target.skinName}".`);
        setFeedbackType('error');
        playMinigameSound('incorrect');
      }
      await advanceRound(target);
    },
    [target, roundBusy, phase, advanceRound]
  );

  const imageSource = target ? getSkinImage(target.imagePath) : null;
  const cropSeed = target ? `${target.godName}|${target.skinName}|${target.imagePath}` : '';

  return (
    <MinigamePage onBack={onBack}>
      <MinigameHeader title="Guess the Skin" subtitle="Name the god from a zoomed skin crop." gold={gold} />

      {poolLoading ? (
        <View style={localStyles.loading}>
          <ActivityIndicator color={COLORS.skyMuted} size="large" />
          <Text style={localStyles.loadingText}>Loading skins…</Text>
        </View>
      ) : !target || pool.length === 0 ? (
        <View style={localStyles.errorBox}>
          <Text style={localStyles.errorText}>No skin data available yet.</Text>
        </View>
      ) : (
        <>
          <MinigameStreakLine current={currentStreak} best={bestStreak} />
          <MinigameMediaCard label={phase === 'skin' ? 'Which skin is it?' : 'Whose skin?'} busy={roundBusy}>
            <SkinCropPreview
              source={imageSource}
              seedKey={cropSeed}
              size={IS_WEB ? 220 : 190}
              zoomed={phase === 'god'}
            />
          </MinigameMediaCard>

          {phase === 'god' ? (
            <>
              <MinigameGodSearch
                label="God name"
                value={guessText}
                onChangeText={setGuessText}
                placeholder="Type a god name"
                gods={suggestions}
                onSubmitEditing={() => handleGodGuess()}
                onPickSubmit={(name) => handleGodGuess(name)}
                editable={!roundBusy}
              />
              {error ? <Text style={minigameShellStyles.errorText}>{error}</Text> : null}
              <MinigameResultBanner type={feedbackType} message={feedback} />
              <MinigamePrimaryButton
                label="Submit guess"
                onPress={() => handleGodGuess()}
                disabled={roundBusy || !guessText.trim()}
              />
            </>
          ) : (
            <>
              <MinigameResultBanner type={feedbackType} message={feedback} />
              <View style={localStyles.skinOptionList}>
                {skinOptions.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={localStyles.skinOption}
                    onPress={() => handleSkinPick(name)}
                    disabled={roundBusy}
                    activeOpacity={0.8}
                  >
                    <Text style={localStyles.skinOptionText}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </MinigamePage>
  );
}

const localStyles = StyleSheet.create({
  loading: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.slate400, fontSize: 13 },
  errorBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red700,
    backgroundColor: COLORS.bgDeep,
  },
  errorText: { color: COLORS.red200, fontSize: 13 },
  skinOptionList: {
    gap: 8,
  },
  skinOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  skinOptionText: {
    color: UI_THEME.textBody,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
