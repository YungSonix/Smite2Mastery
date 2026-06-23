#!/usr/bin/env node
/**
 * Agent F — vision-tag Babylonian, Arthurian, Tales of Arabia pantheons.
 *   node scripts/god-renders/apply-vision-tags-agent-f.js [--write]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PROJECT_ROOT } = require('../../config/dataPaths');

const DATA_PATH = path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-agent-f-data.json');
const LOG_PATH = path.join(PROJECT_ROOT, 'scripts', 'god-renders', '.vision-tag-agent-f.log');

const ASCENSION_INSTANT = [
  { key: 'ascension', label: 'ASCENSION REWARD', text: "This Skin is instantly unlocked when you purchase this God's Ascension Pass." },
  { key: 'rare', label: 'RARE', text: 'This is a rare item and may only appear on special occasions or in specific Events.' },
];

const ASCENSION_LEVEL = [
  { key: 'ascension', label: 'ASCENSION REWARD', text: "This item is acquired from leveling up your God's Ascension Pass." },
  { key: 'rare', label: 'RARE', text: 'This is a rare item and may only appear on special occasions or in specific Events.' },
];

function ascensionLevel(godName) {
  return [
    { key: 'ascension', label: 'ASCENSION REWARD', text: `This item is acquired from leveling up ${godName}'s Ascension Pass.` },
    { key: 'rare', label: 'RARE', text: 'This is a rare item and may only appear on special occasions or in specific Events.' },
  ];
}

function masteryUnlock(rank, { rarityNote = true } = {}) {
  const is10 = rank === 10;
  const emblem = is10
    ? 'app/data/Tiers/T_MasteryEmblem_Perfect_256.png'
    : 'app/data/Tiers/T_MasteryEmblem_Lvl5_256.png';
  return {
    masteryRank: rank,
    requiresAscensionPass: true,
    source: 'ascension',
    masteryEmblem: emblem,
    displayText: is10
      ? 'Ascension reward — requires Mastery rank X (Radiant)'
      : 'Ascension reward — requires Mastery rank V',
    ...(rarityNote ? { rarityNote: 'Rare' } : {}),
  };
}

function masteryGrid(rank) {
  return {
    type: 'masteryRank',
    rank,
    label: rank === 10 ? 'X' : 'V',
    emblemPath:
      rank === 10
        ? 'app/data/Tiers/T_MasteryEmblem_Perfect_256.png'
        : 'app/data/Tiers/T_MasteryEmblem_Lvl5_256.png',
  };
}

function prismGrid() {
  return { type: 'prism', rank: null, label: 'prism' };
}

function shadowRow() {
  return {
    displayName: 'Shadow',
    tier: 'Heroic',
    cost: { currency: 'diamonds', amount: '900' },
    unlock: {
      source: 'ascension',
      requiresAscensionPass: true,
      rarityNote: 'Rare',
      displayText: 'Ascension Pass — rare skin (may appear in events)',
    },
    information: ASCENSION_INSTANT,
  };
}

function baseRow() {
  return {
    displayName: 'Base',
    tier: null,
    cost: { currency: 'diamonds', amount: '0', owned: true },
    unlock: { source: 'base', displayText: 'Base god' },
  };
}

function masteryVariant(name, rank, godName, fileName) {
  const key = name.toLowerCase();
  return {
    fileName,
    displayName: name,
    matchVariantName: `Mastery ${name}`,
    tier: 'Heroic',
    unlock: masteryUnlock(rank, { rarityNote: key === 'opal' || key === 'radiant' }),
    information: ascensionLevel(godName),
    gridBadge: masteryGrid(rank),
    goTo: true,
  };
}

function buildPayload() {
  return {
    gods: [
      {
        folder: 'gilgamesh',
        godName: 'Gilgamesh',
        extractions: [
          { fileName: 'Screenshot (476).png', ...baseRow() },
          { fileName: 'Screenshot (477).png', ...shadowRow() },
          { fileName: 'Screenshot (478).png', ...masteryVariant('Onyx', 5, 'Gilgamesh', 'Screenshot (478).png') },
          { fileName: 'Screenshot (479).png', ...masteryVariant('Opal', 5, 'Gilgamesh', 'Screenshot (479).png') },
          { fileName: 'Screenshot (480).png', ...masteryVariant('Radiant', 10, 'Gilgamesh', 'Screenshot (480).png') },
        ],
      },
      {
        folder: 'ishtar',
        godName: 'Ishtar',
        extractions: [
          { fileName: 'Screenshot (551).png', ...baseRow() },
          {
            fileName: 'Screenshot (552).png',
            displayName: 'Striking Archon',
            matchSkinKey: 'StrikingArchon',
            tier: 'Classic',
            unlock: { source: 'traveler', displayText: 'Traveler Collection' },
            information: [
              { key: 'traveler', label: 'TRAVELER COLLECTION', text: 'Acquired in the "Striking Archon" Traveler.' },
              {
                key: 'prisms',
                label: 'PRISMS AVAILABLE',
                text: 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.',
              },
            ],
            goTo: true,
          },
          {
            fileName: 'Screenshot (553).png',
            displayName: 'Striking Archon - Aqua',
            parentSkinName: 'Striking Archon',
            matchSkinKey: 'StrikingArchon',
            matchVariantName: 'Prism 2',
            variantName: 'Aqua',
            tier: 'Prisms',
            unlock: { source: 'traveler', prismNote: true, displayText: 'Prism variant' },
            information: [
              { key: 'traveler', label: 'TRAVELER COLLECTION', text: 'Acquired in the "Striking Archon" Traveler.' },
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 2, total: 4 },
            goTo: true,
          },
          {
            fileName: 'Screenshot (554).png',
            displayName: 'Striking Archon - Venom',
            parentSkinName: 'Striking Archon',
            matchSkinKey: 'StrikingArchon',
            matchVariantName: 'Prism 3',
            variantName: 'Venom',
            tier: 'Prisms',
            unlock: { source: 'traveler', prismNote: true, displayText: 'Prism variant' },
            information: [
              { key: 'traveler', label: 'TRAVELER COLLECTION', text: 'Acquired in the "Striking Archon" Traveler.' },
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 3, total: 4 },
            goTo: true,
          },
          {
            fileName: 'Screenshot (555).png',
            displayName: 'Striking Archon - Shimmer',
            parentSkinName: 'Striking Archon',
            matchSkinKey: 'StrikingArchon',
            matchVariantName: 'Prism 4',
            variantName: 'Shimmer',
            tier: 'Prisms',
            unlock: { source: 'traveler', prismNote: true, displayText: 'Prism variant' },
            information: [
              { key: 'traveler', label: 'TRAVELER COLLECTION', text: 'Acquired in the "Striking Archon" Traveler.' },
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 4, total: 4 },
            goTo: true,
          },
          { fileName: 'Screenshot (556).png', ...shadowRow() },
          { fileName: 'Screenshot (557).png', ...masteryVariant('Onyx', 5, 'Ishtar', 'Screenshot (557).png') },
          { fileName: 'Screenshot (558).png', ...masteryVariant('Opal', 5, 'Ishtar', 'Screenshot (558).png') },
          { fileName: 'Screenshot (559).png', ...masteryVariant('Radiant', 10, 'Ishtar', 'Screenshot (559).png') },
        ],
      },
      {
        folder: 'aladdin',
        godName: 'Aladdin',
        extractions: [
          { fileName: 'Screenshot (132).png', ...baseRow() },
          {
            fileName: 'Screenshot (133).png',
            displayName: "Winter's Wish",
            matchSkinKey: 'WinterWish',
            tier: 'Heroic',
            cost: { currency: 'diamonds', amount: '1000' },
            information: [
              { key: 'yulefest', label: 'YULEFEST', text: 'This item was acquired during The Yulefest 2025 Event.' },
            ],
          },
          {
            fileName: 'Screenshot (134).png',
            displayName: 'Silent Wish',
            matchSkinKey: 'SilentWish',
            tier: 'Epic',
            cost: { currency: 'diamonds', amount: '1200' },
            information: [
              {
                key: 'special',
                label: 'SPECIAL',
                text: 'This item is from a special Event and may appear for direct purchase or in Chests.',
              },
            ],
          },
          { fileName: 'Screenshot (135).png', ...shadowRow() },
          { fileName: 'Screenshot (136).png', ...masteryVariant('Onyx', 5, 'Aladdin', 'Screenshot (136).png') },
          { fileName: 'Screenshot (137).png', ...masteryVariant('Opal', 5, 'Aladdin', 'Screenshot (137).png') },
          { fileName: 'Screenshot (138).png', ...masteryVariant('Radiant', 10, 'Aladdin', 'Screenshot (138).png') },
        ],
      },
      {
        folder: 'merlin',
        godName: 'Merlin',
        extractions: [
          { fileName: 'Screenshot (680).png', ...baseRow() },
          {
            fileName: 'Screenshot (681).png',
            displayName: 'Cosmic Conjurer',
            matchSkinKey: 'CosmicConjurer',
            tier: 'Epic',
            cost: { currency: 'diamonds', amount: '1200' },
            information: [
              { key: 'crossgen', label: 'CROSS-GEN', text: 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.' },
              {
                key: 'standard',
                label: 'STANDARD',
                text: 'This item is available for direct purchase and may appear in Chests or other special Events.',
              },
            ],
          },
          {
            fileName: 'Screenshot (682).png',
            displayName: 'Magic Mischief',
            matchSkinKey: 'MagicMischief',
            tier: 'Epic',
            cost: { currency: null, amount: null, navigateOnly: true },
            unlock: { source: 'event', displayText: 'Special event' },
            information: [
              { key: 'wandering', label: 'WANDERING MARKET', text: 'Acquired in the "Spellbound Realms" Collection.' },
              {
                key: 'prisms',
                label: 'PRISMS AVAILABLE',
                text: 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.',
              },
              {
                key: 'special',
                label: 'SPECIAL',
                text: 'This item is from a special Event and may appear for direct purchase or in Chests.',
              },
            ],
            goTo: true,
          },
          {
            fileName: 'Screenshot (683).png',
            displayName: 'Magic Mischief - Flamekeeper',
            parentSkinName: 'Magic Mischief',
            matchSkinKey: 'MagicMischief',
            matchVariantName: 'Prism 1',
            variantName: 'Flamekeeper',
            tier: 'Prisms',
            unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
            information: [
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
              {
                key: 'supporter',
                label: 'SUPPORTER PREMIER',
                text: 'Select Diamond-only items for those who wish to show their support and help fund the ongoing development of SMITE 2.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 2, total: 4 },
            goTo: true,
          },
          {
            fileName: 'Screenshot (684).png',
            displayName: 'Magic Mischief - Emerald Sage',
            parentSkinName: 'Magic Mischief',
            matchSkinKey: 'MagicMischief',
            matchVariantName: 'Prism 2',
            variantName: 'Emerald Sage',
            tier: 'Prisms',
            unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
            information: [
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
              {
                key: 'supporter',
                label: 'SUPPORTER PREMIER',
                text: 'Select Diamond-only items for those who wish to show their support and help fund the ongoing development of SMITE 2.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 3, total: 4 },
            goTo: true,
          },
          {
            fileName: 'Screenshot (685).png',
            displayName: 'Magic Mischief - Glimmermancer',
            parentSkinName: 'Magic Mischief',
            matchSkinKey: 'MagicMischief',
            matchVariantName: 'Prism 3',
            variantName: 'Glimmermancer',
            tier: 'Prisms',
            unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
            information: [
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
              {
                key: 'supporter',
                label: 'SUPPORTER PREMIER',
                text: 'Select Diamond-only items for those who wish to show their support and help fund the ongoing development of SMITE 2.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 4, total: 4 },
            goTo: true,
          },
          { fileName: 'Screenshot (686).png', ...shadowRow() },
          { fileName: 'Screenshot (687).png', ...masteryVariant('Onyx', 5, 'Merlin', 'Screenshot (687).png') },
          { fileName: 'Screenshot (688).png', ...masteryVariant('Opal', 5, 'Merlin', 'Screenshot (688).png') },
          { fileName: 'Screenshot (689).png', ...masteryVariant('Radiant', 10, 'Merlin', 'Screenshot (689).png') },
        ],
      },
      {
        folder: 'mordred',
        godName: 'Mordred',
        extractions: [
          { fileName: 'Screenshot (690).png', ...baseRow() },
          {
            fileName: 'Screenshot (691).png',
            displayName: 'Grovebound',
            matchSkinKey: 'Grovebound',
            tier: 'Epic',
            cost: { currency: null, amount: null, navigateOnly: true },
            unlock: { source: 'event', displayText: 'Special event' },
            information: [
              {
                key: 'archfiend',
                label: 'REIGN OF THE ARCHFIEND EVENT',
                text: 'This item is acquired from the Reign of the Archfiend Event.',
              },
              {
                key: 'prisms',
                label: 'PRISMS AVAILABLE',
                text: 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.',
              },
            ],
            goTo: true,
          },
          {
            fileName: 'Screenshot (695).png',
            displayName: 'Grovebound - Nightshade',
            parentSkinName: 'Grovebound',
            matchSkinKey: 'Grovebound',
            matchVariantName: 'Prism 2',
            variantName: 'Nightshade',
            tier: 'Prisms',
            unlock: { source: 'event', prismNote: true, displayText: 'Prism variant' },
            information: [
              {
                key: 'archfiend',
                label: 'REIGN OF THE ARCHFIEND EVENT',
                text: 'This item is acquired from the Reign of the Archfiend Event.',
              },
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 3, total: 4 },
            goTo: true,
          },
          {
            fileName: 'Screenshot (696).png',
            displayName: 'Grovebound - Oleander',
            parentSkinName: 'Grovebound',
            matchSkinKey: 'Grovebound',
            matchVariantName: 'Prism 3',
            variantName: 'Oleander',
            tier: 'Prisms',
            unlock: { source: 'event', prismNote: true, displayText: 'Prism variant' },
            information: [
              {
                key: 'archfiend',
                label: 'REIGN OF THE ARCHFIEND EVENT',
                text: 'This item is acquired from the Reign of the Archfiend Event.',
              },
              {
                key: 'prism',
                label: 'PRISM',
                text: 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.',
              },
            ],
            gridBadge: prismGrid(),
            carousel: { index: 4, total: 4 },
            goTo: true,
          },
          {
            fileName: 'Screenshot (697).png',
            displayName: 'Lichborne',
            matchSkinKey: 'LichSplash',
            tier: 'Epic',
            cost: { currency: null, amount: null, navigateOnly: true },
            unlock: { source: 'event', displayText: 'Special event' },
            information: [
              { key: 'wandering', label: 'WANDERING MARKET', text: 'Acquired in the "Rise of the Gods" Collection.' },
              {
                key: 'special',
                label: 'SPECIAL',
                text: 'This item is from a special Event and may appear for direct purchase or in Chests.',
              },
            ],
            goTo: true,
          },
          { fileName: 'Screenshot (698).png', ...shadowRow() },
          { fileName: 'Screenshot (699).png', ...masteryVariant('Onyx', 5, 'Mordred', 'Screenshot (699).png') },
          { fileName: 'Screenshot (700).png', ...masteryVariant('Opal', 5, 'Mordred', 'Screenshot (700).png') },
          { fileName: 'Screenshot (701).png', ...masteryVariant('Radiant', 10, 'Mordred', 'Screenshot (701).png') },
        ],
      },
      {
        folder: 'morgan le fay',
        godName: 'Morgan Le Fay',
        extractions: [
          { fileName: 'Screenshot (702).png', ...baseRow() },
          {
            fileName: 'Screenshot (703).png',
            displayName: 'Dusk Glimmer',
            matchSkinKey: 'DuskGllmmer',
            tier: 'Classic',
            cost: { currency: null, amount: null, navigateOnly: true },
            unlock: { source: 'traveler', displayText: 'Traveler Collection' },
            information: [
              {
                key: 'darkstar',
                label: 'DAWN OF THE DARKSTAR EMPIRE',
                text: 'This item was acquired in the "Dawn of the Darkstar Empire" Event.',
              },
              { key: 'traveler', label: 'TRAVELER COLLECTION', text: 'Acquired in the "Dusk Glimmer" Traveler.' },
            ],
            goTo: true,
          },
          { fileName: 'Screenshot (704).png', ...shadowRow() },
          { fileName: 'Screenshot (705).png', ...masteryVariant('Onyx', 5, 'Morgan Le Fay', 'Screenshot (705).png') },
          { fileName: 'Screenshot (706).png', ...masteryVariant('Opal', 5, 'Morgan Le Fay', 'Screenshot (706).png') },
          { fileName: 'Screenshot (707).png', ...masteryVariant('Radiant', 10, 'Morgan Le Fay', 'Screenshot (707).png') },
        ],
      },
    ],
  };
}

function main() {
  const write = process.argv.includes('--write');
  const payload = buildPayload();
  fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const args = [
    path.join(__dirname, 'apply-vision-tags-batch-b.js'),
    ...(write ? ['--write'] : []),
    `--data=${DATA_PATH}`,
    `--log=${LOG_PATH}`,
  ];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: PROJECT_ROOT });
  process.exit(result.status ?? 1);
}

if (require.main === module) {
  main();
}

module.exports = { buildPayload };
