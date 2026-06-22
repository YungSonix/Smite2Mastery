#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { baseShot, shadowShot, masteryShot } = require('./lib/visionTagTemplates');

function info(key, label, text) {
  return { key, label, text };
}

function storeEpic(amount) {
  return {
    tier: 'Epic',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
    information: [
      info('crossGen', 'Cross-Gen', 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.'),
      info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
    ],
  };
}

function storeClassic(amount) {
  return {
    tier: 'Classic',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    unlock: { source: 'store', classicNote: true, displayText: 'Direct purchase — may appear in chests or events' },
    information: [
      info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
      info('classic', 'Classic', 'This item was Inspired by a SMITE 1 Skin.'),
    ],
  };
}

function storeFabled(amount) {
  return {
    tier: 'Fabled',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    unlock: { source: 'event', displayText: 'Special event' },
    information: [
      info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
    ],
  };
}

function legacyShot(fileName, displayName, matchSkinKey, amount) {
  return {
    fileName,
    displayName,
    matchSkinKey,
    tier: 'Legacy',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    unlock: { source: 'legacy', displayText: 'SMITE 1 Divine Legacy' },
    information: [
      info('legacy', 'Legacy', 'This item is unlocked by progressing your SMITE 1 Divine Legacy.'),
      info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
    ],
  };
}

const prismBadge = { type: 'prism', rank: null, label: 'prism' };

function travelerPrismBase(fileName, displayName, matchSkinKey, travelerName, amount, total = 5) {
  return {
    fileName,
    displayName,
    matchSkinKey,
    tier: amount ? 'Classic' : 'Epic',
    cost: amount
      ? { currency: 'diamonds', amount: String(amount), owned: false }
      : { currency: null, amount: null, navigateOnly: true },
    unlock: { source: 'traveler', displayText: 'Traveler Collection' },
    gridBadge: prismBadge,
    carousel: { index: 1, total },
    information: [
      info('travelerCollection', 'Traveler Collection', `Acquired in the "${travelerName}" Traveler.`),
      info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
      info('classic', 'Classic', 'This item was Inspired by a SMITE 1 Skin.'),
    ],
  };
}

function travelerPrismParentGoTo(fileName, displayName, matchSkinKey, travelerName, tier, total) {
  return {
    fileName,
    displayName,
    matchSkinKey,
    tier,
    cost: { currency: null, amount: null, navigateOnly: true },
    buttonText: 'GO TO',
    unlock: { source: 'traveler', displayText: 'Traveler Collection' },
    gridBadge: prismBadge,
    carousel: { index: 1, total },
    information: [
      info('travelerCollection', 'Traveler Collection', `Acquired in the "${travelerName}" Traveler.`),
      info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
      ...(tier === 'Classic'
        ? [info('classic', 'Classic', 'This item was Inspired by a SMITE 1 Skin.')]
        : [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')]),
    ],
  };
}

function travelerPrismVariant(fileName, displayName, parentSkinName, variantName, matchSkinKey, matchVariantName, travelerName, index, total, extra = []) {
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
      info('prism', 'Prism', "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms."),
      ...extra,
    ],
  };
}

function prismVariantLocked(fileName, displayName, parentSkinName, variantName, matchSkinKey, matchVariantName, index, total) {
  return {
    fileName,
    displayName,
    parentSkinName,
    variantName,
    matchSkinKey,
    matchVariantName,
    tier: 'Prisms',
    cost: { currency: null, amount: null, navigateOnly: true },
    buttonText: 'LOCKED',
    gridBadge: prismBadge,
    carousel: { index, total },
    information: [
      info('prism', 'Prism', "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms."),
    ],
  };
}

function prismVariantCost(fileName, displayName, parentSkinName, variantName, matchSkinKey, matchVariantName, amount, index, total, extra = []) {
  return {
    fileName,
    displayName,
    parentSkinName,
    variantName,
    matchSkinKey,
    matchVariantName,
    tier: 'Prisms',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    gridBadge: prismBadge,
    carousel: { index, total },
    information: [
      info('prism', 'Prism', "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms."),
      ...extra,
    ],
  };
}

const chineseGods = [
  {
    folder: 'da ji',
    godName: 'Da Ji',
    extractions: [
      baseShot('Screenshot (396).png'),
      travelerPrismBase('Screenshot (397).png', 'Devil Punk', 'Devil_Punk', 'Devil Punk', 2400, 5),
      travelerPrismVariant('Screenshot (398).png', 'Devil Punk - Soulflare', 'Devil Punk', 'Prism 1', 'Devil_Punk', 'Prism 1', 'Devil Punk', 2, 5),
      travelerPrismVariant('Screenshot (399).png', 'Devil Punk - Jade Koi', 'Devil Punk', 'Prism 2', 'Devil_Punk', 'Prism 2', 'Devil Punk', 3, 5),
      travelerPrismVariant('Screenshot (400).png', 'Devil Punk - Bloodgold Oni', 'Devil Punk', 'Prism 3', 'Devil_Punk', 'Prism 3', 'Devil Punk', 4, 5),
      prismVariantLocked('Screenshot (401).png', 'Devil Punk - Dark Temptation', 'Devil Punk', 'Prism 4', 'Devil_Punk', 'Prism 4', 5, 5),
      {
        fileName: 'Screenshot (402).png',
        displayName: 'Vixen',
        matchSkinKey: 'Vixen',
        tier: 'Heroic',
        cost: { currency: null, amount: null, navigateOnly: true },
        buttonText: 'LOCKED',
        unlock: { source: 'twitch', displayText: 'Twitch Drop' },
        information: [
          info('twitchDrop', 'Twitch Drop', 'This item is acquired from a Twitch Drop.'),
          info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
        ],
      },
      shadowShot('Screenshot (403).png'),
      masteryShot('Screenshot (404).png', 'Onyx'),
      masteryShot('Screenshot (405).png', 'Opal'),
      masteryShot('Screenshot (406).png', 'Radiant'),
    ],
  },
  {
    folder: 'guan yu',
    godName: 'Guan Yu',
    extractions: [
      baseShot('Screenshot (481).png'),
      travelerPrismBase('Screenshot (482).png', 'Guan Unicorn', 'Unicorn', 'Guan Unicorn', 2400, 5),
      travelerPrismVariant('Screenshot (483).png', 'Guan Unicorn - Scarlet Tempest', 'Guan Unicorn', 'Prism 1', 'Unicorn', 'Prism 1', 'Guan Unicorn', 2, 5, [
        info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
      ]),
      travelerPrismVariant('Screenshot (484).png', 'Guan Unicorn - Morning Haze', 'Guan Unicorn', 'Prism 2', 'Unicorn', 'Prism 2', 'Guan Unicorn', 3, 5, [
        info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
      ]),
      travelerPrismVariant('Screenshot (485).png', 'Guan Unicorn - Amethyst Shade', 'Guan Unicorn', 'Prism 3', 'Unicorn', 'Prism 3', 'Guan Unicorn', 4, 5, [
        info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
      ]),
      travelerPrismVariant('Screenshot (486).png', 'Guan Unicorn - Blacklight', 'Guan Unicorn', 'Prism 4', 'Unicorn', 'Prism 4', 'Guan Unicorn', 5, 5, [
        info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
      ]),
      { fileName: 'Screenshot (487).png', displayName: 'Wraith Rider', matchSkinKey: 'WraithRider', ...storeEpic(1200) },
      shadowShot('Screenshot (488).png'),
      masteryShot('Screenshot (489).png', 'Onyx'),
      masteryShot('Screenshot (490).png', 'Opal'),
      masteryShot('Screenshot (491).png', 'Radiant'),
    ],
  },
  {
    folder: 'hou yi',
    godName: 'Hou Yi',
    extractions: [
      baseShot('Screenshot (522).png'),
      { fileName: 'Screenshot (523).png', displayName: 'Gleaming Archer', matchSkinKey: 'GleamingArcher', ...storeEpic(1200) },
      shadowShot('Screenshot (524).png'),
      masteryShot('Screenshot (525).png', 'Onyx'),
      masteryShot('Screenshot (526).png', 'Opal'),
      masteryShot('Screenshot (527).png', 'Radiant'),
    ],
  },
  {
    folder: 'hua mulan',
    godName: 'Hua Mulan',
    extractions: [
      baseShot('Screenshot (528).png'),
      {
        fileName: 'Screenshot (529).png',
        displayName: 'Unmasked Warrior',
        matchSkinKey: 'MysteriousWarrior',
        tier: 'Heroic',
        cost: { currency: 'diamonds', amount: '0', owned: true },
        unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
      },
      travelerPrismBase('Screenshot (530).png', 'Sentai', 'Sentai', 'Sentai', 2400, 5),
      travelerPrismVariant('Screenshot (531).png', 'Sentai - White Blaze', 'Sentai', 'Prism B', 'Sentai', 'Prism B', 'Sentai', 2, 5, [
        info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
      ]),
      travelerPrismVariant('Screenshot (532).png', 'Sentai - Cosmic Flair', 'Sentai', 'Prism C', 'Sentai', 'Prism C', 'Sentai', 3, 5, [
        info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
      ]),
      travelerPrismVariant('Screenshot (533).png', 'Sentai - RGB.EXE', 'Sentai', 'Prism D', 'Sentai', 'Prism D', 'Sentai', 4, 5, [
        info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
      ]),
      travelerPrismVariant('Screenshot (534).png', 'Sentai - Neon Lotus', 'Sentai', 'Prism E', 'Sentai', 'Prism E', 'Sentai', 5, 5, [
        info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
      ]),
      { fileName: 'Screenshot (535).png', displayName: 'High Honor', matchSkinKey: 'HighHonor', ...storeEpic(1200) },
      travelerPrismParentGoTo('Screenshot (536).png', 'Moolan', 'Moolan', 'Moolan Mulan', 'Epic', 4),
      travelerPrismVariant('Screenshot (537).png', 'Moolan - Strawberry', 'Moolan', 'Prism 1', 'Moolan', 'Prism 1', 'Moolan Mulan', 2, 4),
      travelerPrismVariant('Screenshot (538).png', 'Moolan - Chocolate', 'Moolan', 'Prism 2', 'Moolan', 'Prism 2', 'Moolan Mulan', 3, 4),
      travelerPrismVariant('Screenshot (539).png', 'Moolan - Gold Ribbon', 'Moolan', 'Prism 3', 'Moolan', 'Prism 3', 'Moolan Mulan', 4, 4),
      shadowShot('Screenshot (540).png'),
      masteryShot('Screenshot (541).png', 'Onyx'),
      masteryShot('Screenshot (542).png', 'Opal'),
      masteryShot('Screenshot (543).png', 'Radiant'),
    ],
  },
  {
    folder: 'jing wei',
    godName: 'Jing Wei',
    extractions: [
      baseShot('Screenshot (578).png'),
      {
        fileName: 'Screenshot (579).png',
        displayName: 'Bumble Bee',
        matchSkinKey: 'BumbleBee',
        tier: 'Classic',
        cost: { currency: 'diamonds', amount: '2400', owned: false },
        unlock: { source: 'traveler', displayText: 'Traveler Collection' },
        carousel: { index: 1, total: 4 },
        information: [
          info('travelerCollection', 'Traveler Collection', "Acquired in the 'Buzzing Spring Time' Traveler."),
          info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
          info('classic', 'Classic', 'This item was Inspired by a SMITE 1 Skin.'),
        ],
      },
      travelerPrismVariant('Screenshot (580).png', 'Bumble Bee - Lady Bug', 'Bumble Bee', 'Prism 1', 'BumbleBee', 'Prism 1', 'Buzzing Spring Time', 2, 4),
      prismVariantCost('Screenshot (581).png', 'Bumble Bee - Beetle', 'Bumble Bee', 'Prism 2', 'BumbleBee', 'Prism 2', 500, 3, 4, [
        info('supporterPremier', 'Supporter Premier', 'Select Diamond-only items for those who wish to show their support and help fund the ongoing development of SMITE 2.'),
      ]),
      prismVariantCost('Screenshot (582).png', 'Bumble Bee - Pink Rose', 'Bumble Bee', 'Prism 3', 'BumbleBee', 'Prism 3', 500, 4, 4),
      { fileName: 'Screenshot (583).png', displayName: 'Pool Party', matchSkinKey: 'PoolParty', ...storeClassic(2400) },
      travelerPrismParentGoTo('Screenshot (584).png', 'Dragonheart Rebel', 'DragonHeart', 'Dragonheart', 'Epic', 5),
      travelerPrismVariant('Screenshot (585).png', 'Dragonheart Rebel - Detention', 'Dragonheart Rebel', 'Prism 1', 'DragonHeart', 'Prism 1', 'Dragonheart', 2, 5),
      travelerPrismVariant('Screenshot (586).png', 'Dragonheart Rebel - Chilled Out', 'Dragonheart Rebel', 'Prism 2', 'DragonHeart', 'Prism 2', 'Dragonheart', 3, 5),
      travelerPrismVariant('Screenshot (587).png', 'Dragonheart Rebel - Ivy League', 'Dragonheart Rebel', 'Prism 3', 'DragonHeart', 'Prism 3', 'Dragonheart', 4, 5),
      prismVariantLocked('Screenshot (588).png', 'Dragonheart Rebel - Valedictorian', 'Dragonheart Rebel', 'Prism 4', 'DragonHeart', 'Prism 4', 5, 5),
      {
        fileName: 'Screenshot (589).png',
        displayName: 'Baddie Bat',
        matchSkinKey: 'CuteBat',
        tier: 'Epic',
        cost: { currency: null, amount: null, navigateOnly: true },
        buttonText: 'LOCKED',
        unlock: { source: 'dlc', displayText: 'DLC' },
        information: [
          info('crossGen', 'Cross-Gen', 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.'),
          info('dlc', 'DLC', 'This item is acquired from a DLC.'),
          info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
        ],
      },
      shadowShot('Screenshot (590).png'),
      masteryShot('Screenshot (591).png', 'Onyx'),
      masteryShot('Screenshot (592).png', 'Opal'),
      masteryShot('Screenshot (593).png', 'Radiant'),
    ],
  },
  {
    folder: 'ne zha',
    godName: 'Ne Zha',
    extractions: [
      baseShot('Screenshot (708).png'),
      travelerPrismParentGoTo('Screenshot (709).png', 'Fire Lord', 'FireLord', 'Fire Lord Ne Zha', 'Classic', 4),
      travelerPrismVariant('Screenshot (710).png', 'Fire Lord - Emerald Spear', 'Fire Lord', 'Prism 1', 'FireLord', 'Prism 1', 'Fire Lord Ne Zha', 2, 4),
      travelerPrismVariant('Screenshot (711).png', 'Fire Lord - Cherry Blossom', 'Fire Lord', 'Prism 2', 'FireLord', 'Prism 2', 'Fire Lord Ne Zha', 3, 4),
      travelerPrismVariant('Screenshot (712).png', 'Fire Lord - Cursed Flame', 'Fire Lord', 'Prism 3', 'FireLord', 'Prism 3', 'Fire Lord Ne Zha', 4, 4),
      shadowShot('Screenshot (713).png'),
      masteryShot('Screenshot (714).png', 'Onyx'),
      masteryShot('Screenshot (715).png', 'Opal'),
      masteryShot('Screenshot (716).png', 'Radiant'),
    ],
  },
  {
    folder: 'nu wa',
    godName: 'Nu Wa',
    extractions: [
      baseShot('Screenshot (746).png'),
      travelerPrismBase('Screenshot (747).png', 'Mystic Enchantress', 'MysticEnchantress', 'Mystic Enchantress', 2400, 4),
      travelerPrismVariant('Screenshot (748).png', 'Mystic Enchantress - Ruby', 'Mystic Enchantress', 'Prism 1', 'MysticEnchantress', 'Prism 1', 'Mystic Enchantress', 2, 4),
      travelerPrismVariant('Screenshot (749).png', 'Mystic Enchantress - Pearl', 'Mystic Enchantress', 'Prism 2', 'MysticEnchantress', 'Prism 2', 'Mystic Enchantress', 3, 4),
      travelerPrismVariant('Screenshot (750).png', 'Mystic Enchantress - Aquamarine', 'Mystic Enchantress', 'Prism 3', 'MysticEnchantress', 'Prism 3', 'Mystic Enchantress', 4, 4),
      { fileName: 'Screenshot (751).png', displayName: 'Bad Bunny', matchSkinKey: 'BadBunny', ...storeFabled(1200) },
      { fileName: 'Screenshot (752).png', displayName: 'Dark Supreme', matchSkinKey: 'DarkSupreme', ...storeEpic(1200) },
      legacyShot('Screenshot (753).png', 'Bunny Babe', 'PlayfulBunny', 500),
      {
        fileName: 'Screenshot (754).png',
        displayName: 'Ravenstrike',
        matchSkinKey: 'NuwaVenstrike',
        tier: 'Legendary',
        cost: { currency: null, amount: null, navigateOnly: true },
        buttonText: 'GO TO',
        unlock: { source: 'traveler', displayText: 'Traveler Collection' },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 5 },
        information: [
          info('travelerCollection', 'Traveler Collection', 'Acquired in the "Ravenstrike" Traveler.'),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
        ],
      },
      travelerPrismVariant('Screenshot (755).png', 'Ravenstrike - Blood Raven', 'Ravenstrike', 'Prism B', 'NuwaVenstrike', 'Prism B', 'Ravenstrike', 2, 5),
      travelerPrismVariant('Screenshot (756).png', 'Ravenstrike - Cyber White', 'Ravenstrike', 'Prism C', 'NuwaVenstrike', 'Prism C', 'Ravenstrike', 3, 5),
      travelerPrismVariant('Screenshot (757).png', 'Ravenstrike - Teal Tempest', 'Ravenstrike', 'Prism D', 'NuwaVenstrike', 'Prism D', 'Ravenstrike', 4, 5),
      travelerPrismVariant('Screenshot (758).png', 'Ravenstrike - Bronze Talon', 'Ravenstrike', 'Prism E', 'NuwaVenstrike', 'Prism E', 'Ravenstrike', 5, 5, [
        info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
      ]),
      {
        fileName: 'Screenshot (759).png',
        displayName: 'Bunny Bliss',
        matchSkinKey: 'BunnyBliss',
        tier: 'Heroic',
        cost: { currency: null, amount: null, navigateOnly: true },
        buttonText: 'GO TO',
        unlock: { source: 'event', displayText: 'Special event' },
        information: [
          info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
        ],
      },
      shadowShot('Screenshot (760).png'),
      masteryShot('Screenshot (761).png', 'Onyx'),
      masteryShot('Screenshot (762).png', 'Opal'),
      masteryShot('Screenshot (763).png', 'Radiant'),
    ],
  },
  {
    folder: 'sun wokong',
    godName: 'Sun Wukong',
    extractions: [
      baseShot('Screenshot (898).png'),
      {
        fileName: 'Screenshot (899).png',
        displayName: 'Dark Lord',
        matchSkinKey: 'DarkLord',
        tier: 'Classic',
        cost: { currency: 'diamonds', amount: '1200', owned: false },
        unlock: { source: 'traveler', displayText: 'Traveler Collection' },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 5 },
        information: [
          info('travelerCollection', 'Traveler Collection', 'Acquired in the "Dark Lord SWK" Traveler.'),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
          info('classic', 'Classic', 'This item was Inspired by a SMITE 1 Skin.'),
        ],
      },
      travelerPrismVariant('Screenshot (900).png', 'Dark Lord - Obsidian', 'Dark Lord', 'Prism 1', 'DarkLord', 'Prism 1', 'Dark Lord SWK', 2, 5),
      travelerPrismVariant('Screenshot (901).png', 'Dark Lord - Voidspawn', 'Dark Lord', 'Prism 2', 'DarkLord', 'Prism 2', 'Dark Lord SWK', 3, 5),
      travelerPrismVariant('Screenshot (902).png', 'Dark Lord - Frostbane', 'Dark Lord', 'Prism 3', 'DarkLord', 'Prism 3', 'Dark Lord SWK', 4, 5),
      travelerPrismVariant('Screenshot (903).png', 'Dark Lord - Bloodfire', 'Dark Lord', 'Prism 4', 'DarkLord', 'Prism 4', 'Dark Lord SWK', 5, 5, [
        info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
      ]),
      { fileName: 'Screenshot (904).png', displayName: 'Street King', matchSkinKey: 'StreetKing', ...storeEpic(1200) },
      shadowShot('Screenshot (905).png'),
      masteryShot('Screenshot (906).png', 'Onyx'),
      masteryShot('Screenshot (907).png', 'Opal'),
      masteryShot('Screenshot (908).png', 'Radiant'),
    ],
  },
];

for (const g of chineseGods) {
  for (const e of g.extractions) {
    if (e.matchVariantName?.startsWith('Mastery') && e.information?.[0]?.key === 'ascensionReward') {
      e.information[0].text = `This item is acquired from leveling up ${g.godName}'s Ascension Pass.`;
    }
    if (e.displayName === 'Shadow' && e.information?.[0]?.key === 'ascensionReward') {
      e.information[0].text = "This Skin is instantly unlocked when you purchase this God's Ascension Pass.";
    }
    if (e.cost?.navigateOnly && !e.buttonText) {
      e.buttonText = 'GO TO';
    }
    if (e.matchVariantName?.startsWith('Mastery') && !e.buttonText) {
      e.buttonText = 'GO TO';
    }
  }
}

const outPath = path.join(__dirname, '.vision-tag-chinese-data.json');
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Chinese pantheon (8 gods). Vision-verified panel text; 98 PNGs, 0 duplicate recaptures skipped.',
      gods: chineseGods,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

const shots = chineseGods.reduce((n, g) => n + g.extractions.length, 0);
console.log(`Wrote ${outPath}`);
console.log(`Chinese: ${chineseGods.length} gods, ${shots} shots`);
