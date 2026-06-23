#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { baseShot, shadowShot, masteryShot } = require('./lib/visionTagTemplates');

function info(key, label, text) {
  return { key, label, text };
}

function storeClassic(amount) {
  return {
    tier: 'Classic',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    unlock: { source: 'store', classicNote: true, displayText: 'Direct purchase — may appear in chests or events' },
    information: [
      info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
      info('classic', 'Classic', 'This item was inspired by a SMITE 1 Skin.'),
    ],
  };
}

function storeEpic(amount, crossGen = true) {
  const information = crossGen
    ? [
        info('crossGen', 'Cross-Gen', 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.'),
        info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
      ]
    : [info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.')];
  return {
    tier: 'Epic',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
    information,
  };
}

function travelerPrismBase(fileName, displayName, matchSkinKey, travelerName, amount, total = 5) {
  return {
    fileName,
    displayName,
    matchSkinKey,
    tier: 'Classic',
    cost: amount
      ? { currency: 'diamonds', amount: String(amount), owned: false }
      : { currency: null, amount: null, navigateOnly: true },
    unlock: { source: 'traveler', displayText: 'Traveler Collection' },
    gridBadge: prismBadge,
    carousel: { index: 1, total },
    information: [
      info('travelerCollection', 'Traveler Collection', `Acquired in the "${travelerName}" Traveler.`),
      info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
      info('classic', 'Classic', 'This item was inspired by a SMITE 1 Skin.'),
    ],
  };
}

function travelerPrismVariant(fileName, displayName, parentSkinName, variantName, matchSkinKey, matchVariantName, travelerName, index, total, extraInfo = []) {
  return {
    fileName,
    displayName,
    parentSkinName,
    variantName,
    matchSkinKey,
    matchVariantName,
    tier: 'Prisms',
    cost: { currency: null, amount: null, navigateOnly: true },
    unlock: { source: 'traveler', displayText: 'Traveler Collection' },
    gridBadge: prismBadge,
    carousel: { index, total },
    information: [
      info('travelerCollection', 'Traveler Collection', `Acquired in the "${travelerName}" Traveler.`),
      info('prism', 'Prism', 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.'),
      ...extraInfo,
    ],
  };
}

function prismVariantRare(fileName, displayName, parentSkinName, variantName, matchSkinKey, matchVariantName, index, total) {
  return {
    fileName,
    displayName,
    parentSkinName,
    variantName,
    matchSkinKey,
    matchVariantName,
    tier: 'Prisms',
    cost: { currency: null, amount: null, navigateOnly: true },
    gridBadge: prismBadge,
    carousel: { index, total },
    information: [
      info('prism', 'Prism', 'Prisms are unique color variations of existing skins, letting you further customize your god\'s appearance. You must own the base skin to unlock its Prisms.'),
      info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
    ],
  };
}

const norseGods = [
  {
    folder: 'fenrir',
    godName: 'Fenrir',
    extractions: [
      baseShot('Screenshot (437).png'),
      travelerPrismBase('Screenshot (438).png', 'Wreck the Halls', 'WrecktheHalls', 'Wreck the Halls', 2400),
      travelerPrismVariant('Screenshot (439).png', 'Wreck the Halls - Frosty', 'Wreck the Halls', 'Frosty', 'WrecktheHalls', 'Prism P1', 'Wreck the Halls', 2, 5),
      travelerPrismVariant('Screenshot (441).png', 'Wreck the Halls - Yule Napper', 'Wreck the Halls', 'Yule Napper', 'WrecktheHalls', 'Prism P2', 'Wreck the Halls', 3, 5),
      travelerPrismVariant('Screenshot (442).png', 'Wreck the Halls - Festive Filcher', 'Wreck the Halls', 'Festive Filcher', 'WrecktheHalls', 'Prism P3', 'Wreck the Halls', 4, 5),
      prismVariantRare('Screenshot (443).png', 'Wreck the Halls - Roast Chestnut', 'Wreck the Halls', 'Roast Chestnut', 'WrecktheHalls', 'Prism P4', 5, 5),
      {
        fileName: 'Screenshot (444).png',
        displayName: 'Lord Slashington III',
        matchSkinKey: 'LordslashingtonCard',
        ...storeClassic(2400),
      },
      {
        fileName: 'Screenshot (445).png',
        displayName: 'Mighty Mutt',
        matchSkinKey: 'PugOfDestruction',
        ...storeEpic(1200),
      },
      {
        fileName: 'Screenshot (446).png',
        displayName: 'The Undead',
        matchSkinKey: 'UndeadHorror',
        ...storeEpic(1200),
      },
      shadowShot('Screenshot (447).png'),
      masteryShot('Screenshot (448).png', 'Onyx'),
      masteryShot('Screenshot (449).png', 'Opal'),
      masteryShot('Screenshot (450).png', 'Radiant'),
    ],
  },
  {
    folder: 'jormungandr',
    godName: 'Jormungandr',
    extractions: [
      baseShot('Screenshot (594).png'),
      {
        ...travelerPrismBase('Screenshot (595).png', 'World Kitty', 'WorldKitty', 'World Kitty', 1500),
        information: [
          info('travelerCollection', 'Traveler Collection', "Acquired in the 'World Kitty' Traveler."),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
          info('classic', 'Classic', 'This item was inspired by a SMITE 1 Skin.'),
        ],
      },
      travelerPrismVariant('Screenshot (596).png', 'World Kitty - Baron', 'World Kitty', 'Baron', 'WorldKitty', 'Prism P1', 'The World Kitty', 2, 5),
      travelerPrismVariant('Screenshot (597).png', 'World Kitty - Ginger', 'World Kitty', 'Ginger', 'WorldKitty', 'Prism P2', 'The World Kitty', 3, 5),
      travelerPrismVariant('Screenshot (598).png', 'World Kitty - Dipper', 'World Kitty', 'Dipper', 'WorldKitty', 'Prism P3', 'The World Kitty', 4, 5),
      travelerPrismVariant('Screenshot (599).png', 'World Kitty - Snowball', 'World Kitty', 'Snowball', 'WorldKitty', 'Prism P4', 'The World Kitty', 5, 5),
      shadowShot('Screenshot (600).png'),
      masteryShot('Screenshot (601).png', 'Onyx'),
      masteryShot('Screenshot (602).png', 'Opal'),
      masteryShot('Screenshot (603).png', 'Radiant'),
    ],
  },
  {
    folder: 'loki',
    godName: 'Loki',
    extractions: [
      baseShot('Screenshot (651).png'),
      travelerPrismBase('Screenshot (652).png', 'Loki Charms', 'LokiCharms', 'Loki Charms', 2400),
      travelerPrismVariant('Screenshot (653).png', 'Loki Charms - Razzle Dazzle', 'Loki Charms', 'Razzle Dazzle', 'LokiCharms', 'Prism P1', 'Loki Charms', 2, 5),
      travelerPrismVariant('Screenshot (654).png', 'Loki Charms - Dapper Dandy', 'Loki Charms', 'Dapper Dandy', 'LokiCharms', 'Prism P2', 'Loki Charms', 3, 5),
      travelerPrismVariant('Screenshot (655).png', 'Loki Charms - Master Magician', 'Loki Charms', 'Master Magician', 'LokiCharms', 'Prism P3', 'Loki Charms', 4, 5),
      travelerPrismVariant('Screenshot (656).png', 'Loki Charms - Not So Lucky', 'Loki Charms', 'Not So Lucky', 'LokiCharms', 'Prism P4', 'Loki Charms', 5, 5),
      { fileName: 'Screenshot (657).png', displayName: 'Joki', matchSkinKey: 'Joki', ...storeClassic(800) },
      {
        fileName: 'Screenshot (658).png',
        displayName: 'Eliminator',
        matchSkinKey: 'Infiltrator',
        tier: 'Legacy',
        cost: { currency: 'diamonds', amount: '750', owned: false },
        unlock: { source: 'legacy', displayText: 'SMITE 1 Divine Legacy' },
        information: [
          info('legacy', 'Legacy', 'This item is unlocked by progressing your SMITE 1 Divine Legacy.'),
          info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
        ],
      },
      { fileName: 'Screenshot (659).png', displayName: 'Slasher', matchSkinKey: 'DeathSquad', ...storeEpic(1200) },
      shadowShot('Screenshot (660).png'),
      masteryShot('Screenshot (661).png', 'Onyx'),
      masteryShot('Screenshot (662).png', 'Opal'),
      masteryShot('Screenshot (663).png', 'Radiant'),
    ],
  },
  {
    folder: 'odin',
    godName: 'Odin',
    extractions: [
      baseShot('Screenshot (771).png'),
      {
        fileName: 'Screenshot (772).png',
        displayName: 'Winged Terror',
        matchSkinKey: 'Demon',
        tier: 'Legendary',
        cost: { currency: 'diamonds', amount: '2100', owned: false },
        unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
        information: [
          info('crossGen', 'Cross-Gen', 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.'),
          info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
          info('specialEffects', 'Special Effects', 'This Skin includes a special Emote prompted by using the Special Emote 2 VGS command in match.'),
        ],
      },
      {
        fileName: 'Screenshot (773).png',
        displayName: 'Hot Diggity',
        matchSkinKey: 'HotDiggity',
        ...storeClassic(2400),
        information: [
          info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
          info('specialEffects', 'Special Effects', 'This Skin includes a special Emote prompted by using the Special Emote 2 VGS command in match.'),
          info('classic', 'Classic', 'This item was inspired by a SMITE 1 Skin.'),
        ],
      },
      { fileName: 'Screenshot (774).png', displayName: 'Bionic Overlord', matchSkinKey: 'DarkCyborg', ...storeEpic(1200) },
      shadowShot('Screenshot (775).png'),
      masteryShot('Screenshot (776).png', 'Onyx'),
      masteryShot('Screenshot (777).png', 'Opal'),
      masteryShot('Screenshot (778).png', 'Radiant'),
    ],
  },
  {
    folder: 'ratatoskr',
    godName: 'Ratatoskr',
    extractions: [
      baseShot('Screenshot (847).png'),
      {
        ...travelerPrismBase('Screenshot (848).png', 'Shadowrunner', 'ShadowRunner', 'Shadowrunner', null, 4),
        tier: 'Epic',
        information: [
          info('travelerCollection', 'Traveler Collection', "Acquired in the 'Shadowrunner' Traveler."),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
          info('classic', 'Classic', 'This item was inspired by a SMITE 1 Skin.'),
        ],
      },
      travelerPrismVariant('Screenshot (849).png', 'Shadowrunner - Solar Spirit', 'Shadowrunner', 'Solar Spirit', 'ShadowRunner', 'Prism P1', 'Shadowrunner', 2, 4),
      travelerPrismVariant('Screenshot (850).png', 'Shadowrunner - Void Forager', 'Shadowrunner', 'Void Forager', 'ShadowRunner', 'Prism P2', 'Shadowrunner', 3, 4),
      travelerPrismVariant('Screenshot (851).png', 'Shadowrunner - Pearl Star', 'Shadowrunner', 'Pearl Star', 'ShadowRunner', 'Prism P3', 'Shadowrunner', 4, 4),
      {
        fileName: 'Screenshot (852).png',
        displayName: 'Flurry',
        matchSkinKey: 'Flurry',
        tier: 'Heroic',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'twitch', displayText: 'Twitch Drop' },
        information: [
          info('twitchDrop', 'Twitch Drop', 'This item is acquired from a Twitch Drop.'),
          info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
        ],
      },
      shadowShot('Screenshot (853).png'),
      masteryShot('Screenshot (854).png', 'Onyx'),
      masteryShot('Screenshot (855).png', 'Opal'),
      masteryShot('Screenshot (856).png', 'Radiant'),
    ],
  },
  {
    folder: 'sol',
    godName: 'Sol',
    extractions: [
      baseShot('Screenshot (881).png'),
      travelerPrismBase('Screenshot (882).png', 'The Magnificent', 'Magnificent', 'The Magnificent', 2400),
      travelerPrismVariant('Screenshot (883).png', 'The Magnificent - Golden Illusion', 'The Magnificent', 'Golden Illusion', 'Magnificent', 'Prism P1', 'The Magnificent', 2, 5),
      travelerPrismVariant('Screenshot (884).png', 'The Magnificent - Emerald Trickster', 'The Magnificent', 'Emerald Trickster', 'Magnificent', 'Prism P2', 'The Magnificent', 3, 5),
      travelerPrismVariant('Screenshot (885).png', 'The Magnificent - Pink Prestige', 'The Magnificent', 'Pink Prestige', 'Magnificent', 'Prism P3', 'The Magnificent', 4, 5),
      travelerPrismVariant('Screenshot (886).png', 'The Magnificent - Grand Noir', 'The Magnificent', 'Grand Noir', 'Magnificent', 'Prism P4', 'The Magnificent', 5, 5),
      { fileName: 'Screenshot (887).png', displayName: 'Meltdown', matchSkinKey: 'TSkincardMeltdown', ...storeClassic(2400) },
      { fileName: 'Screenshot (888).png', displayName: 'FireFly', matchSkinKey: 'Firefly', ...storeEpic(1200) },
      {
        fileName: 'Screenshot (889).png',
        displayName: 'Vampiress',
        matchSkinKey: 'VampiressPrisms',
        tier: 'Legendary',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'traveler', displayText: 'Traveler Collection' },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 5 },
        information: [
          info('travelerCollection', 'Traveler Collection', "Acquired in the 'Vampiress' Traveler."),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
          info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
        ],
      },
      travelerPrismVariant('Screenshot (890).png', 'Vampiress - Moonlit Mistress', 'Vampiress', 'Moonlit Mistress', 'VampiressPrisms', 'Prism P1', 'Vampiress', 2, 5, [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')]),
      travelerPrismVariant('Screenshot (891).png', 'Vampiress - Blood Rose', 'Vampiress', 'Blood Rose', 'VampiressPrisms', 'Prism P2', 'Vampiress', 3, 5, [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')]),
      travelerPrismVariant('Screenshot (892).png', 'Vampiress - Ultraviolent', 'Vampiress', 'Ultraviolent', 'VampiressPrisms', 'Prism P3', 'Vampiress', 4, 5, [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')]),
      prismVariantRare('Screenshot (893).png', 'Vampiress - Twilight Glimmer', 'Vampiress', 'Twilight Glimmer', 'VampiressPrisms', 'Prism P4', 5, 5),
      shadowShot('Screenshot (894).png'),
      masteryShot('Screenshot (895).png', 'Onyx'),
      masteryShot('Screenshot (896).png', 'Opal'),
      masteryShot('Screenshot (897).png', 'Radiant'),
    ],
  },
  {
    folder: 'thor',
    godName: 'Thor',
    extractions: [
      baseShot('Screenshot (947).png'),
      { fileName: 'Screenshot (948).png', displayName: 'Hellforged', matchSkinKey: 'HellForged', ...storeEpic(1200) },
      { fileName: 'Screenshot (949).png', displayName: 'Frosted Fury', matchSkinKey: 'Snowman', ...storeEpic(1200) },
      {
        fileName: 'Screenshot (950).png',
        displayName: 'Thorge Washington',
        matchSkinKey: 'ThorgeWashington',
        tier: 'Epic',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'traveler', displayText: 'Traveler Collection' },
        information: [
          info('travelerCollection', 'Traveler Collection', "Acquired in the 'Freedom' Traveler."),
          info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
        ],
      },
      shadowShot('Screenshot (951).png'),
      masteryShot('Screenshot (952).png', 'Onyx'),
      masteryShot('Screenshot (953).png', 'Opal'),
      masteryShot('Screenshot (954).png', 'Radiant'),
    ],
  },
  {
    folder: 'ullr',
    godName: 'Ullr',
    extractions: [
      baseShot('Screenshot (965).png'),
      {
        ...travelerPrismBase('Screenshot (966).png', 'The Survivor', 'SurvivorCardPrisms1', 'The Survivor', 800, 5),
        information: [
          info('travelerCollection', 'Traveler Collection', "Acquired in 'The Survivor' Traveler."),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
          info('classic', 'Classic', 'This item was inspired by a SMITE 1 Skin.'),
        ],
      },
      travelerPrismVariant('Screenshot (967).png', 'The Survivor - Fangslayer', 'The Survivor', 'Fangslayer', 'SurvivorCardPrisms1', 'Prism P1', 'The Survivor', 2, 5, [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')]),
      travelerPrismVariant('Screenshot (968).png', 'The Survivor - Corpsecaller', 'The Survivor', 'Corpsecaller', 'SurvivorCardPrisms1', 'Prism P2', 'The Survivor', 3, 5, [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')]),
      travelerPrismVariant('Screenshot (969).png', 'The Survivor - as Chuck Killigan', 'The Survivor', 'as Chuck Killigan', 'SurvivorCardPrisms1', 'Prism P3', 'The Survivor', 4, 5, [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')]),
      prismVariantRare('Screenshot (970).png', 'The Survivor - Splatterstorm', 'The Survivor', 'Splatterstorm', 'SurvivorCardPrisms1', 'Prism P4', 5, 5),
      shadowShot('Screenshot (971).png'),
      masteryShot('Screenshot (972).png', 'Onyx'),
      masteryShot('Screenshot (973).png', 'Opal'),
      masteryShot('Screenshot (974).png', 'Radiant'),
    ],
  },
  {
    folder: 'ymir',
    godName: 'Ymir',
    extractions: [
      baseShot('Screenshot (1013).png'),
      { fileName: 'Screenshot (1014).png', displayName: 'Baron Frostchild', matchSkinKey: 'BaronfrostchildCard1440x1920', ...storeClassic(2400) },
      { fileName: 'Screenshot (1015).png', displayName: 'Mr. Squish', matchSkinKey: 'CuteNSquishy', ...storeEpic(1600) },
      {
        fileName: 'Screenshot (1016).png',
        displayName: 'Mint Choco',
        matchSkinKey: 'TSkincardIcecream',
        tier: 'Legacy',
        cost: { currency: 'diamonds', amount: '2000', owned: false },
        unlock: { source: 'legacy', displayText: 'SMITE 1 Divine Legacy' },
        information: [
          info('legacy', 'Legacy', 'This item is unlocked by progressing your SMITE 1 Divine Legacy.'),
          info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
        ],
      },
      { fileName: 'Screenshot (1017).png', displayName: 'Blobmir', matchSkinKey: 'OozeBoi', ...storeEpic(1200) },
      {
        fileName: 'Screenshot (1018).png',
        displayName: 'Cacodemon 2',
        matchSkinKey: 'Cacodemon',
        tier: 'Classic',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'founder', displayText: "Founder's Edition" },
        information: [
          info('foundersEdition', "Founder's Edition", 'This item is acquired from pre-ordering a Founder\'s Edition during Closed Alpha.'),
          info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
          info('classic', 'Classic', 'This item was inspired by a SMITE 1 Skin.'),
        ],
      },
      shadowShot('Screenshot (1019).png'),
      masteryShot('Screenshot (1020).png', 'Onyx'),
      masteryShot('Screenshot (1021).png', 'Opal'),
      masteryShot('Screenshot (1022).png', 'Radiant'),
    ],
  },
];

// Fix mastery god-specific text
for (const g of norseGods) {
  for (const e of g.extractions) {
    if (e.matchVariantName?.startsWith('Mastery') && e.information?.[0]?.key === 'ascensionReward') {
      e.information[0].text = `This item is acquired from leveling up ${g.godName}'s Ascension Pass.`;
    }
  }
}

const outPath = path.join(__dirname, '.vision-tag-norse-batch-b-data.json');
fs.writeFileSync(outPath, JSON.stringify({ gods: norseGods }, null, 2) + '\n', 'utf8');

// Merge into batch-b (keep non-Norse gods)
const batchPath = path.join(__dirname, '.vision-tag-batch-b-data.json');
const norseFolders = new Set(norseGods.map((g) => g.folder));
let existing = { gods: [] };
if (fs.existsSync(batchPath)) {
  existing = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
}
const kept = (existing.gods || []).filter((g) => !norseFolders.has(g.folder));
const merged = { gods: [...kept, ...norseGods] };
fs.writeFileSync(batchPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');

const counts = norseGods.map((g) => `${g.folder}:${g.extractions.length}`).join(', ');
console.log(`Wrote ${outPath}`);
console.log(`Merged into ${batchPath}`);
console.log(`Norse: ${norseGods.reduce((n, g) => n + g.extractions.length, 0)} shots (${counts})`);
