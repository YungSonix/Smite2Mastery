/**
 * Guess the Emoji clue pool — isolated from Scroll Trivia god-emoji-map.
 */
const CLUES = require('../app/data/Minigames/god-emoji-guess/emoji-clues.json');
const ASSETS = require('../app/data/Minigames/god-emoji-guess/clue-assets.json');

export const EMOJI_GUESS_MODES = {
  easy: {
    id: 'easy',
    label: 'Easy',
    roster: 'smite2',
    tier: 'easy',
    points: [3, 2, 1],
    oneSubmit: false,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    roster: 'smite2',
    tier: 'hard',
    points: [5, 3, 1],
    oneSubmit: true,
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    roster: 'all',
    tier: 'easy',
    points: [3, 2, 1],
    oneSubmit: false,
  },
};

export function getEmojiGuessPoints(modeId, visibleCount) {
  const mode = EMOJI_GUESS_MODES[modeId] || EMOJI_GUESS_MODES.easy;
  const idx = Math.max(0, Math.min(2, (visibleCount || 1) - 1));
  return mode.points[idx];
}

export function resolveClueAsset(key) {
  const asset = ASSETS[key];
  if (!asset) return { kind: 'emoji', glyph: '❓', key };
  if (asset.kind === 'icon') {
    return {
      kind: 'icon',
      key,
      file: asset.file,
      glyph: asset.glyph || '❓',
    };
  }
  return { kind: 'emoji', key, glyph: asset.glyph || '❓' };
}

function godNamesForRoster(roster) {
  return Object.keys(CLUES).filter((name) => {
    const game = CLUES[name]?.game;
    if (roster === 'all') return true;
    return game === 'smite2';
  });
}

export function listEmojiGuessGods(modeId = 'easy') {
  const mode = EMOJI_GUESS_MODES[modeId] || EMOJI_GUESS_MODES.easy;
  return godNamesForRoster(mode.roster).map((godName) => ({ godName, name: godName }));
}

/**
 * Pick a random god for Guess the Emoji.
 * Gamemode uses Set A only: mode easy → set.easy, mode hard → set.hard.
 * (Sets B/C are not used in the minigame for now.)
 * @param {string} modeId
 * @param {{ excludeName?: string }} [opts]
 */
export function pickEmojiGuessRound(modeId = 'easy', opts = {}) {
  const mode = EMOJI_GUESS_MODES[modeId] || EMOJI_GUESS_MODES.easy;
  const names = godNamesForRoster(mode.roster);
  if (!names.length) return null;

  let pool = names;
  if (opts.excludeName && names.length > 1) {
    pool = names.filter((n) => n !== opts.excludeName);
  }
  const godName = pool[Math.floor(Math.random() * pool.length)];
  const entry = CLUES[godName];
  const sets = Array.isArray(entry?.sets) ? entry.sets : [];
  if (!sets.length) return null;

  const setIndex = 0; // Set A only
  const set = sets[setIndex];
  const keys = Array.isArray(set?.[mode.tier]) ? set[mode.tier] : set?.easy || [];
  if (keys.length < 3) return null;

  return {
    godName,
    game: entry.game || 'smite2',
    setIndex,
    clues: keys.slice(0, 3).map(resolveClueAsset),
    modeId: mode.id,
  };
}

export function normalizeGodGuess(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ');
}

export function isCorrectEmojiGuess(guess, godName) {
  return normalizeGodGuess(guess) === normalizeGodGuess(godName);
}
