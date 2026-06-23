#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { baseShot, shadowShot, masteryShot } = require('./lib/visionTagTemplates');

const M5 = 'app/data/Tiers/T_MasteryEmblem_Lvl5_256.png';
const M10 = 'app/data/Tiers/T_MasteryEmblem_Perfect_256.png';
const prismBadge = { type: 'prism', rank: null, label: 'prism' };

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
      info('prism', 'Prism', "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms."),
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
      info('prism', 'Prism', "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms."),
      info('rare', 'Rare', 'This is a rare item and may only appear on special occasions or in specific Events.'),
    ],
  };
}

const mayanGods = [
  {
    folder: 'ah puch',
    godName: 'Ah Puch',
    extractions: [
      baseShot('Screenshot (127).png'),
      shadowShot('Screenshot (128).png'),
      masteryShot('Screenshot (129).png', 'Onyx'),
      masteryShot('Screenshot (130).png', 'Opal'),
      masteryShot('Screenshot (131).png', 'Radiant'),
    ],
  },
  {
    folder: 'awilix',
    godName: 'Awilix',
    extractions: [
      baseShot('Screenshot (264).png'),
      travelerPrismBase('Screenshot (265).png', 'Feline Fashion', 'FelinefashionSplash1015', 'Feline Fashion', 2400),
      travelerPrismVariant('Screenshot (266).png', 'Feline Fashion - Snowfall Chic', 'Feline Fashion 1', 'Prism 1', 'FelinefashionSplash1015', 'Prism 1', 'Feline Fashion', 2, 5),
      travelerPrismVariant('Screenshot (267).png', 'Feline Fashion - Purr-ple Passion', 'Feline Fashion 1', 'Prism 2', 'FelinefashionSplash1015', 'Prism 2', 'Feline Fashion', 3, 5),
      travelerPrismVariant('Screenshot (268).png', 'Feline Fashion - Cat Burglar', 'Feline Fashion 1', 'Prism 3', 'FelinefashionSplash1015', 'Prism 3', 'Feline Fashion', 4, 5),
      prismVariantRare('Screenshot (269).png', 'Feline Fashion - Spectral Stripes', 'Feline Fashion 1', 'Prism 4', 'FelinefashionSplash1015', 'Prism 4', 5, 5),
      { fileName: 'Screenshot (270).png', displayName: 'Cyberclaw', matchSkinKey: 'Cyberclaw', ...storeEpic(1200) },
      shadowShot('Screenshot (271).png'),
      masteryShot('Screenshot (272).png', 'Onyx'),
      masteryShot('Screenshot (273).png', 'Opal'),
      masteryShot('Screenshot (274).png', 'Radiant'),
    ],
  },
  {
    folder: 'cabrakan',
    godName: 'Cabrakan',
    extractions: [
      baseShot('Screenshot (321).png'),
      travelerPrismBase('Screenshot (322).png', 'Fat Loki', 'FatLoki', 'Fat Loki', 2400),
      travelerPrismVariant('Screenshot (323).png', 'Fat Loki - 1', 'Fat Loki', 'Prism 1', 'FatLoki', 'Prism 1', 'Fat Loki', 2, 4),
      travelerPrismVariant('Screenshot (324).png', 'Fat Loki - 2', 'Fat Loki', 'Prism 2', 'FatLoki', 'Prism 2', 'Fat Loki', 3, 4),
      travelerPrismVariant('Screenshot (325).png', 'Fat Loki - 3', 'Fat Loki', 'Prism 3', 'FatLoki', 'Prism 3', 'Fat Loki', 4, 4),
      travelerPrismBase('Screenshot (326).png', 'Nerd Rage 014', 'NerdRage014', 'Nerd Rage', null, 5),
      travelerPrismVariant('Screenshot (327).png', 'Nerd Rage - A', 'Nerd Rage 014', 'Prism A', 'NerdRage014', 'Prism A', 'Nerd Rage', 2, 5),
      travelerPrismVariant('Screenshot (328).png', 'Nerd Rage - B', 'Nerd Rage 014', 'Prism B', 'NerdRage014', 'Prism B', 'Nerd Rage', 3, 5),
      travelerPrismVariant('Screenshot (329).png', 'Nerd Rage - C', 'Nerd Rage 014', 'Prism C', 'NerdRage014', 'Prism C', 'Nerd Rage', 4, 5),
      prismVariantRare('Screenshot (330).png', 'Nerd Rage - D', 'Nerd Rage 014', 'Prism D', 'NerdRage014', 'Prism D', 5, 5),
      shadowShot('Screenshot (331).png'),
      masteryShot('Screenshot (332).png', 'Onyx'),
      masteryShot('Screenshot (333).png', 'Opal'),
      masteryShot('Screenshot (334).png', 'Radiant'),
    ],
  },
  {
    folder: 'chaac',
    godName: 'Chaac',
    extractions: [
      baseShot('Screenshot (355).png'),
      { fileName: 'Screenshot (356).png', displayName: 'Demon', matchSkinKey: 'Demon', ...storeEpic(1200) },
      { fileName: 'Screenshot (357).png', displayName: 'Necrotic Divinity', matchSkinKey: 'NecroticDivinity', ...storeEpic(1200) },
      travelerPrismBase('Screenshot (358).png', 'Slaughterhouse', 'SlaughterhouseSplash1', 'Slaughterhouse', 2400),
      travelerPrismVariant('Screenshot (359).png', 'Slaughterhouse - 1', 'Slaughterhouse Splash 1', 'Prism 1', 'SlaughterhouseSplash1', 'Prism 1', 'Slaughterhouse', 2, 5),
      travelerPrismVariant('Screenshot (360).png', 'Slaughterhouse - 2', 'Slaughterhouse Splash 1', 'Prism 2', 'SlaughterhouseSplash1', 'Prism 2', 'Slaughterhouse', 3, 5),
      travelerPrismVariant('Screenshot (361).png', 'Slaughterhouse - 3', 'Slaughterhouse Splash 1', 'Prism 3', 'SlaughterhouseSplash1', 'Prism 3', 'Slaughterhouse', 4, 5),
      prismVariantRare('Screenshot (362).png', 'Slaughterhouse - 4', 'Slaughterhouse Splash 1', 'Prism 4', 'SlaughterhouseSplash1', 'Prism 4', 5, 5),
      { fileName: 'Screenshot (363).png', displayName: 'Abyssal Hunter', matchSkinKey: 'TSkincardAbyssalhunter', ...storeClassic(2400) },
      shadowShot('Screenshot (364).png'),
      masteryShot('Screenshot (365).png', 'Onyx'),
      masteryShot('Screenshot (366).png', 'Opal'),
      masteryShot('Screenshot (367).png', 'Radiant'),
    ],
  },
  {
    folder: 'hun batz',
    godName: 'Hun Batz',
    extractions: [
      baseShot('Screenshot (544).png'),
      { fileName: 'Screenshot (545).png', displayName: 'Shadow Howler', matchSkinKey: 'ShadowHowler', ...storeClassic(2400) },
      {
        fileName: 'Screenshot (546).png',
        displayName: 'Arcane Ape',
        matchSkinKey: 'ArcaneApe',
        tier: 'Fabled',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'wandering', displayText: "Wandering Market — Spellbound Realms" },
        information: [
          info('wanderingMarket', 'Wandering Market', "Acquired in the 'Spellbound Realms' Collection."),
          info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
        ],
      },
      shadowShot('Screenshot (547).png'),
      masteryShot('Screenshot (548).png', 'Onyx'),
      masteryShot('Screenshot (549).png', 'Opal'),
      masteryShot('Screenshot (550).png', 'Radiant'),
    ],
  },
  {
    folder: 'kukulkan',
    godName: 'Kukulkan',
    extractions: [
      baseShot('Screenshot (625).png'),
      travelerPrismBase('Screenshot (626).png', 'Void Wyrm', 'VoidWyrm', 'Void Wyrm', 2400, 4),
      travelerPrismVariant('Screenshot (627).png', 'Void Wyrm - 1', 'Void Wyrm', 'Prism 1', 'VoidWyrm', 'Prism 1', 'Void Wyrm', 2, 4),
      travelerPrismVariant('Screenshot (628).png', 'Void Wyrm - 2', 'Void Wyrm', 'Prism 2', 'VoidWyrm', 'Prism 2', 'Void Wyrm', 3, 4),
      travelerPrismVariant('Screenshot (629).png', 'Void Wyrm - 3', 'Void Wyrm', 'Prism 3', 'VoidWyrm', 'Prism 3', 'Void Wyrm', 4, 4),
      {
        fileName: 'Screenshot (630).png',
        displayName: 'Cosmic Moth',
        matchSkinKey: 'Smite2F2pOb1SocialCosmicmoth1920x1080Notag',
        tier: 'Epic',
        cost: { currency: 'diamonds', amount: '1600', owned: false },
        unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
        information: [info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.')],
      },
      {
        fileName: 'Screenshot (631).png',
        displayName: 'Dragon Lord',
        matchSkinKey: 'DragonLordForm01',
        tier: 'Legendary',
        cost: { currency: 'diamonds', amount: '8000', owned: false },
        unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 5 },
        information: [
          info('sagaSkin', 'Saga Skin', 'This skin is part of a Saga — a collection of related skins with a shared theme.'),
          info('archfiendSaga', 'Archfiend Saga', 'Part of the Archfiend Saga collection.'),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
        ],
      },
      travelerPrismVariant('Screenshot (632).png', 'Dragon Lord - Molten Breath', 'Dragon Lord Form 1', 'Prism P1', 'DragonLordForm01', 'Prism P1', 'Dragon Lord', 2, 5),
      travelerPrismVariant('Screenshot (633).png', 'Dragon Lord - 2', 'Dragon Lord Form 1', 'Prism P2', 'DragonLordForm01', 'Prism P2', 'Dragon Lord', 3, 5),
      travelerPrismVariant('Screenshot (634).png', 'Dragon Lord - 3', 'Dragon Lord Form 1', 'Prism P3', 'DragonLordForm01', 'Prism P3', 'Dragon Lord', 4, 5),
      prismVariantRare('Screenshot (635).png', 'Dragon Lord - 4', 'Dragon Lord Form 1', 'Prism P4', 'DragonLordForm01', 'Prism P4', 5, 5),
      {
        fileName: 'Screenshot (636).png',
        displayName: 'Crimson Majesty',
        matchSkinKey: 'DragonLordForm01',
        tier: 'Legendary',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'saga', displayText: 'Archfiend Saga' },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 5 },
        information: [
          info('sagaSkin', 'Saga Skin', 'This skin is part of a Saga — a collection of related skins with a shared theme.'),
          info('archfiendSaga', 'Archfiend Saga', 'Part of the Archfiend Saga collection.'),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
        ],
      },
      travelerPrismVariant('Screenshot (637).png', 'Crimson Majesty - 1', 'Dragon Lord Form 1', 'Prism P1', 'DragonLordForm01', 'Prism P1', 'Crimson Majesty', 2, 5),
      travelerPrismVariant('Screenshot (638).png', 'Crimson Majesty - 2', 'Dragon Lord Form 1', 'Prism P2', 'DragonLordForm01', 'Prism P2', 'Crimson Majesty', 3, 5),
      travelerPrismVariant('Screenshot (639).png', 'Crimson Majesty - 3', 'Dragon Lord Form 1', 'Prism P3', 'DragonLordForm01', 'Prism P3', 'Crimson Majesty', 4, 5),
      travelerPrismVariant('Screenshot (640).png', 'Crimson Majesty - Molten Breath', 'Dragon Lord Form 1', 'Prism P4', 'DragonLordForm01', 'Prism P4', 'Crimson Majesty', 5, 5),
      {
        fileName: 'Screenshot (641).png',
        displayName: 'Prismatic Dragon',
        matchSkinKey: 'PrismaticDragon',
        tier: 'Epic',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
        information: [info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.')],
      },
      {
        fileName: 'Screenshot (642).png',
        displayName: 'Dragon Lord Form 2',
        matchSkinKey: 'DragonLordForm01',
        tier: 'Legendary',
        cost: { currency: null, amount: null, navigateOnly: true },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 5 },
        information: [
          info('sagaSkin', 'Saga Skin', 'This skin is part of a Saga — a collection of related skins with a shared theme.'),
          info('archfiendSaga', 'Archfiend Saga', 'Part of the Archfiend Saga collection.'),
        ],
      },
      travelerPrismVariant('Screenshot (643).png', 'Form 2 - 1', 'Dragon Lord Form 1', 'Prism P1', 'DragonLordForm01', 'Prism P1', 'Dragon Lord', 2, 5),
      travelerPrismVariant('Screenshot (644).png', 'Form 2 - 2', 'Dragon Lord Form 1', 'Prism P2', 'DragonLordForm01', 'Prism P2', 'Dragon Lord', 3, 5),
      travelerPrismVariant('Screenshot (645).png', 'Form 2 - 3', 'Dragon Lord Form 1', 'Prism P3', 'DragonLordForm01', 'Prism P3', 'Dragon Lord', 4, 5),
      prismVariantRare('Screenshot (646).png', 'Form 2 - 4', 'Dragon Lord Form 1', 'Prism P4', 'DragonLordForm01', 'Prism P4', 5, 5),
      shadowShot('Screenshot (647).png'),
      masteryShot('Screenshot (648).png', 'Onyx'),
      masteryShot('Screenshot (649).png', 'Opal'),
      masteryShot('Screenshot (650).png', 'Radiant'),
    ],
  },
  {
    folder: 'xbalanque',
    godName: 'Xbalanque',
    extractions: [
      baseShot('Screenshot (992).png'),
      travelerPrismBase('Screenshot (993).png', 'Darkest Knight', 'DarkestKnight', 'Darkest Knight', 2400),
      travelerPrismVariant('Screenshot (994).png', 'Darkest Knight - 1', 'Darkest Knight', 'Prism 1', 'DarkestKnight', 'Prism 1', 'Darkest Knight', 2, 5),
      travelerPrismVariant('Screenshot (995).png', 'Darkest Knight - 2', 'Darkest Knight', 'Prism 2', 'DarkestKnight', 'Prism 2', 'Darkest Knight', 3, 5),
      travelerPrismVariant('Screenshot (996).png', 'Darkest Knight - 3', 'Darkest Knight', 'Prism 3', 'DarkestKnight', 'Prism 3', 'Darkest Knight', 4, 5),
      prismVariantRare('Screenshot (997).png', 'Darkest Knight - 4', 'Darkest Knight', 'Prism 4', 'DarkestKnight', 'Prism 4', 5, 5),
      shadowShot('Screenshot (998).png'),
      masteryShot('Screenshot (999).png', 'Onyx'),
      masteryShot('Screenshot (1000).png', 'Opal'),
      masteryShot('Screenshot (1001).png', 'Radiant'),
    ],
  },
];

for (const g of mayanGods) {
  for (const e of g.extractions) {
    if (e.matchVariantName?.startsWith('Mastery') && e.information?.[0]?.key === 'ascensionReward') {
      e.information[0].text = `This item is acquired from leveling up ${g.godName}'s Ascension Pass.`;
    }
  }
}

const outPath = path.join(__dirname, '.vision-tag-agent-c-mayan-data.json');
fs.writeFileSync(outPath, JSON.stringify({ gods: mayanGods }, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath} (${mayanGods.length} gods, ${mayanGods.reduce((n, g) => n + g.extractions.length, 0)} shots)`);
