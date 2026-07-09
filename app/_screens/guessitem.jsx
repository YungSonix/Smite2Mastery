import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/themeColors';
import { ItemIconImage } from '../../lib/ItemIconImage';
import { loadBuildsItemsData } from '../../lib/loadBuildsData';
import { playMinigameSound } from '../../lib/minigameSounds';
import { useMinigameGold, pauseMinigameRound } from '../../hooks/useMinigameGold';
import {
  buildItemGuessPool,
  matchItemName,
  pickRandomItemTarget,
} from '../../lib/minigamePools';
import {
  MinigamePage,
  MinigameHeader,
  MinigameStreakLine,
  MinigameMediaCard,
  MinigameItemSearch,
  MinigamePrimaryButton,
  MinigameResultBanner,
  minigameShellStyles,
} from '../../lib/MinigameShell';

const IS_WEB = Platform.OS === 'web';
const normalize = (s) => (s || '').toString().trim().toLowerCase();

export default function GuessItemPage({ onBack = null }) {
  const { gold } = useMinigameGold();
  const [pool, setPool] = useState([]);
  const [nameIndex, setNameIndex] = useState([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('neutral');
  const [roundBusy, setRoundBusy] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [failedIcons, setFailedIcons] = useState({});

  useEffect(() => {
    let mounted = true;
    loadBuildsItemsData()
      .then((data) => {
        if (!mounted) return;
        const built = buildItemGuessPool(data?.items);
        setPool(built);
        setNameIndex(built.map((item) => item.name).filter(Boolean));
        setTarget(pickRandomItemTarget(built));
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
    return nameIndex.filter((name) => normalize(name).includes(term)).slice(0, 8);
  }, [guessText, nameIndex]);

  const nextRound = useCallback(
    (exclude) => {
      if (!pool.length) return null;
      if (pool.length === 1) return pool[0];
      let pick = pickRandomItemTarget(pool);
      let guard = 0;
      while (exclude && pick?.internalName === exclude.internalName && guard < 8) {
        pick = pickRandomItemTarget(pool);
        guard += 1;
      }
      return pick;
    },
    [pool]
  );

  const handleSubmit = useCallback(
    async (nameOverride = null) => {
      if (!target || roundBusy) return;
      const trimmed = String(nameOverride || guessText || '').trim();
      if (!trimmed) {
        setError('Type the item name.');
        return;
      }
      const poolMatch = pool.find((item) => matchItemName(trimmed, item));
      if (!poolMatch) {
        setError('Item not found. Try the exact in-game name.');
        return;
      }
      setError('');
      const correct = matchItemName(trimmed, target);
      if (correct) {
        setCurrentStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
        setFeedback(`Correct! ${target.name}.`);
        setFeedbackType('success');
        playMinigameSound('correct');
      } else {
        setCurrentStreak(0);
        setFeedback(`Wrong — ${target.name}.`);
        setFeedbackType('error');
        playMinigameSound('incorrect');
      }
      const prev = target;
      await pauseMinigameRound(setRoundBusy);
      setTarget(nextRound(prev));
      setGuessText('');
    },
    [target, roundBusy, guessText, pool, nextRound]
  );

  return (
    <MinigamePage onBack={onBack}>
      <MinigameHeader title="Guess the Item" subtitle="Name the item from its icon." gold={gold} />

      {poolLoading ? (
        <View style={localStyles.loading}>
          <ActivityIndicator color={COLORS.skyMuted} size="large" />
          <Text style={localStyles.loadingText}>Loading items…</Text>
        </View>
      ) : !target || pool.length === 0 ? (
        <View style={localStyles.errorBox}>
          <Text style={localStyles.errorText}>No item data available.</Text>
        </View>
      ) : (
        <>
          <MinigameStreakLine current={currentStreak} best={bestStreak} />
          <MinigameMediaCard label="What item?" busy={roundBusy}>
            <ItemIconImage
              iconPath={target.icon}
              internalName={target.internalName}
              iconKey={target.internalName}
              failedMap={failedIcons}
              setFailedMap={setFailedIcons}
              style={localStyles.itemIcon}
            />
          </MinigameMediaCard>
          <MinigameItemSearch
            label="Item name"
            value={guessText}
            onChangeText={setGuessText}
            placeholder="e.g. Obsidian Shard"
            names={suggestions}
            onSubmitEditing={() => handleSubmit()}
            onPickSubmit={(name) => handleSubmit(name)}
            editable={!roundBusy}
          />
          {error ? <Text style={minigameShellStyles.errorText}>{error}</Text> : null}
          <MinigameResultBanner type={feedbackType} message={feedback} />
          <MinigamePrimaryButton
            label="Submit guess"
            onPress={() => handleSubmit()}
            disabled={roundBusy || !guessText.trim()}
          />
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
  itemIcon: {
    width: IS_WEB ? 120 : 96,
    height: IS_WEB ? 120 : 96,
    borderRadius: 12,
  },
});
