import { CARD_TYPE, PROPHECY_ALL_CARDS } from './prophecyData';

const MAX_DECK_SIZE = 30;
const MAX_DUP_DEFAULT = 2;
const MAX_DUP_LEGENDARY = 1;

function getCost(card) {
  return Number(card?.cost ?? card?.manaCost ?? 0);
}

function isLegendaryLike(card) {
  return card?.rarity === 'legendary' || card?.rarity === 'mythic';
}

export function computeDeckAvgCost(cards) {
  const list = Array.isArray(cards) ? cards : [];
  if (!list.length) return 0;
  const total = list.reduce((sum, c) => sum + getCost(c), 0);
  const divisor = list.length === MAX_DECK_SIZE ? MAX_DECK_SIZE : list.length;
  return Number((total / divisor).toFixed(1));
}

export function getDeckCostCurve(cards) {
  const curve = {};
  for (let i = 1; i <= 10; i++) curve[i] = 0;
  const list = Array.isArray(cards) ? cards : [];
  list
    .filter((c) => c?.cardType !== CARD_TYPE.TRAP)
    .forEach((c) => {
      const raw = getCost(c);
      const clamped = Math.max(1, Math.min(10, Math.round(raw)));
      curve[clamped] += 1;
    });
  return curve;
}

export function validateDeck(cards, leaderId) {
  const list = Array.isArray(cards) ? cards : [];
  const errors = [];

  if (!leaderId) errors.push('A Leader must be selected.');
  if (list.length !== MAX_DECK_SIZE) errors.push(`Deck must contain exactly ${MAX_DECK_SIZE} cards.`);

  let godCount = 0;
  let trapCount = 0;
  let itemCount = 0;
  const counts = {};

  list.forEach((card) => {
    if (!card?.id) return;
    counts[card.id] = (counts[card.id] || 0) + 1;
    if (card.cardType === CARD_TYPE.GOD) godCount += 1;
    if (card.cardType === CARD_TYPE.TRAP) trapCount += 1;
    if (card.cardType === CARD_TYPE.ITEM) itemCount += 1;
  });

  if (godCount < 10) errors.push('Deck must include at least 10 God cards.');
  if (trapCount > 10) errors.push('Deck can include at most 10 Trap cards.');
  if (itemCount > 10) errors.push('Deck can include at most 10 Item cards.');

  Object.entries(counts).forEach(([id, value]) => {
    const card = list.find((c) => c.id === id);
    const limit = isLegendaryLike(card) ? MAX_DUP_LEGENDARY : MAX_DUP_DEFAULT;
    if (value > limit) {
      errors.push(`${card?.name || id} exceeds copy limit (${limit}).`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    stats: {
      gods: godCount,
      items: itemCount,
      traps: trapCount,
      avgCost: computeDeckAvgCost(list),
    },
  };
}

export function deriveDeckArchetype(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const avgCost = computeDeckAvgCost(list);
  const gods = list.filter((c) => c?.cardType === CARD_TYPE.GOD);
  const classCounts = {};
  const pantheonCounts = {};
  let nonGod = 0;
  let trap = 0;

  gods.forEach((c) => {
    classCounts[c.cls] = (classCounts[c.cls] || 0) + 1;
    pantheonCounts[c.pantheon] = (pantheonCounts[c.pantheon] || 0) + 1;
  });
  list.forEach((c) => {
    if (c?.cardType !== CARD_TYPE.GOD) nonGod += 1;
    if (c?.cardType === CARD_TYPE.TRAP) trap += 1;
  });

  const pct = (value, total) => (total > 0 ? value / total : 0);
  const assassinHunterPct = pct((classCounts.Assassin || 0) + (classCounts.Hunter || 0), gods.length);
  const fighterPct = pct(classCounts.Fighter || 0, gods.length);
  const magePct = pct(classCounts.Mage || 0, gods.length);

  const dominantPantheon = Object.entries(pantheonCounts).sort((a, b) => b[1] - a[1])[0];
  if (avgCost <= 2.5 && assassinHunterPct > 0.5) return 'Aggro Rush';
  if (avgCost >= 2.6 && avgCost <= 3.2 && fighterPct > 0.4) return 'Midrange Fighter';
  if (avgCost >= 3.3 && avgCost <= 4.0 && magePct > 0.4) return 'Control Mage';
  if (avgCost >= 3.0 && avgCost <= 4.0 && dominantPantheon?.[1] >= 5) return `Pantheon Combo (${dominantPantheon[0]})`;
  if (avgCost > 4.5) return 'Heavy Control';
  if (avgCost >= 2.8 && avgCost <= 3.5 && Object.keys(classCounts).length >= 3) return 'Balanced Midrange';
  if (nonGod > 0 && trap / nonGod >= 0.6) return 'Trap Control';
  return 'Custom Midrange';
}

export function buildSmartStarterDeck() {
  const gods = PROPHECY_ALL_CARDS.filter((c) => c.cardType === CARD_TYPE.GOD);
  const items = PROPHECY_ALL_CARDS.filter((c) => c.cardType === CARD_TYPE.ITEM);
  const traps = PROPHECY_ALL_CARDS.filter((c) => c.cardType === CARD_TYPE.TRAP);
  const nonSpellCards = PROPHECY_ALL_CARDS.filter((c) => c.cardType !== CARD_TYPE.SPELL);
  const deck = [];
  const copyCounts = {};

  const canAdd = (card) => {
    const limit = isLegendaryLike(card) ? MAX_DUP_LEGENDARY : MAX_DUP_DEFAULT;
    return (copyCounts[card.id] || 0) < limit;
  };
  const addCard = (card) => {
    if (!card || !canAdd(card)) return false;
    deck.push({ ...card });
    copyCounts[card.id] = (copyCounts[card.id] || 0) + 1;
    return true;
  };
  const addFrom = (pool) => {
    const candidates = pool.filter(canAdd);
    if (!candidates.length) return false;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return addCard(pick);
  };

  while (deck.filter((c) => c.cardType === CARD_TYPE.GOD).length < 15 && deck.length < MAX_DECK_SIZE) addFrom(gods);
  while (deck.filter((c) => c.cardType === CARD_TYPE.ITEM).length < 7 && deck.length < MAX_DECK_SIZE) addFrom(items);
  while (deck.filter((c) => c.cardType === CARD_TYPE.TRAP).length < 6 && deck.length < MAX_DECK_SIZE) addFrom(traps);
  while (deck.length < MAX_DECK_SIZE) addFrom(nonSpellCards);

  return deck;
}

