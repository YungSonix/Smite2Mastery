'use strict';

const MASTERY_EMBLEM_5 = 'app/data/Tiers/T_MasteryEmblem_Lvl5_256.png';
const MASTERY_EMBLEM_10 = 'app/data/Tiers/T_MasteryEmblem_Perfect_256.png';

function baseShot(fileName) {
  return {
    fileName,
    displayName: 'Base',
    tier: null,
    cost: { currency: 'diamonds', amount: '0', owned: true },
    unlock: { source: 'base', displayText: 'Base god' },
  };
}

function shadowShot(fileName) {
  return {
    fileName,
    displayName: 'Shadow',
    matchSkinKey: 'Shadow',
    tier: 'Heroic',
    cost: { currency: 'diamonds', amount: '900', owned: false },
    unlock: {
      source: 'ascension',
      requiresAscensionPass: true,
      rarityNote: 'Rare',
      displayText: 'Ascension Pass — rare skin (may appear in events)',
    },
    information: [
      {
        key: 'ascensionReward',
        label: 'Ascension Reward',
        text: "This Skin is instantly unlocked when you purchase this God's Ascension Pass.",
      },
      {
        key: 'rare',
        label: 'Rare',
        text: 'This is a rare item and may only appear on special occasions or in specific Events.',
      },
    ],
  };
}

function masteryShot(fileName, variant) {
  const isRadiant = variant === 'Radiant';
  const rank = isRadiant ? 10 : 5;
  return {
    fileName,
    displayName: variant,
    matchVariantName: `Mastery ${variant}`,
    tier: 'Heroic',
    cost: { currency: null, amount: null, navigateOnly: true },
    unlock: {
      masteryRank: rank,
      requiresAscensionPass: true,
      source: 'ascension',
      masteryEmblem: isRadiant ? MASTERY_EMBLEM_10 : MASTERY_EMBLEM_5,
      displayText: isRadiant
        ? 'Ascension reward — requires Mastery rank X (Radiant)'
        : 'Ascension reward — requires Mastery rank V',
      ...(variant === 'Opal' ? { rarityNote: 'Rare' } : {}),
    },
    gridBadge: {
      type: 'masteryRank',
      rank,
      label: isRadiant ? 'X' : 'V',
      emblemPath: isRadiant ? MASTERY_EMBLEM_10 : MASTERY_EMBLEM_5,
    },
    information: [
      {
        key: 'ascensionReward',
        label: 'Ascension Reward',
        text: "This item is acquired from leveling up your God's Ascension Pass.",
      },
      {
        key: 'rare',
        label: 'Rare',
        text: 'This is a rare item and may only appear on special occasions or in specific Events.',
      },
    ],
  };
}

function premiumShot(fileName, opts) {
  return { fileName, ...opts };
}

/** Verbatim UI blocks — copy from screenshot panel text. */
const INFO_TRAVELER = (travelerLine) => ({
  key: 'travelerCollection',
  label: 'Traveler Collection',
  text: travelerLine,
});

const INFO_PRISMS_AVAILABLE = {
  key: 'prismsAvailable',
  label: 'Prisms Available',
  text:
    'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.',
};

const INFO_PRISM_CAROUSEL = {
  key: 'prism',
  label: 'Prism',
  text:
    "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms.",
};

module.exports = {
  baseShot,
  shadowShot,
  masteryShot,
  premiumShot,
  INFO_TRAVELER,
  INFO_PRISMS_AVAILABLE,
  INFO_PRISM_CAROUSEL,
};
