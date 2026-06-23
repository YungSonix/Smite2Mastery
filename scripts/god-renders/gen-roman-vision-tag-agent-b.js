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
      info('classic', 'Classic', 'This item was Inspired by a SMITE 1 Skin.'),
    ],
  };
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

function storeLegendary(amount) {
  return {
    tier: 'Legendary',
    cost: { currency: 'diamonds', amount: String(amount), owned: false },
    unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
    information: [
      info('crossGen', 'Cross-Gen', 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.'),
      info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
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

function goToLegendary(fileName, displayName, matchSkinKey, collectionName) {
  return {
    fileName,
    displayName,
    matchSkinKey,
    tier: 'Legendary',
    cost: { currency: null, amount: null, navigateOnly: true },
    buttonText: 'GO TO',
    unlock: { source: 'traveler', displayText: 'Traveler Collection' },
    information: [
      info('wanderingMarket', 'Wandering Market', `Acquired in the "${collectionName}" Collection.`),
      info('specialEffects', 'Special Effects', 'This Skin includes a special Emote prompted by using the Special Emote 2 VGS command in match.'),
      info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
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

function prismVariantRare(fileName, displayName, parentSkinName, variantName, matchSkinKey, matchVariantName, index, total, extra = []) {
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
      ...extra,
    ],
  };
}

function sagaBase(fileName, displayName, matchSkinKey, sagaName, index, total = 5) {
  return {
    fileName,
    displayName,
    matchSkinKey,
    matchVariantName: displayName,
    parentSkinName: 'Dark Tyrant',
    variantName: displayName,
    tier: 'Epic',
    cost: { currency: null, amount: null, navigateOnly: true },
    buttonText: 'GO TO',
    unlock: { source: 'traveler', displayText: 'Traveler Collection' },
    gridBadge: prismBadge,
    carousel: { index: 1, total },
    information: [
      info('sagaSkin', 'Saga Skin', 'Choose from multiple unlocked forms. Progress through the Wandering Market.'),
      info('darkstarSaga', 'Darkstar Saga', `Unlocked in the ${sagaName}.`),
      info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
      info('specialEffects', 'Special Effects', 'This Skin includes a special Emote prompted by using the Special Emote 2 VGS command in match.'),
    ],
  };
}

function sagaPrism(fileName, displayName, parentSkinName, variantName, matchSkinKey, matchVariantName, sagaName, index, total) {
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
      info('sagaSkin', 'Saga Skin', 'Choose from multiple unlocked forms. Progress through the Wandering Market.'),
      info('darkstarSaga', 'Darkstar Saga', `Unlocked in the ${sagaName}.`),
      info('prism', 'Prism', "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms."),
      info('specialEffects', 'Special Effects', 'This Skin includes a special Emote prompted by using the Special Emote 2 VGS command in match.'),
    ],
  };
}

function emberlordBase(fileName, displayName, matchSkinKey) {
  return {
    fileName,
    displayName,
    matchSkinKey,
    tier: 'Epic',
    cost: { currency: null, amount: null, navigateOnly: true },
    unlock: { source: 'traveler', displayText: 'Traveler Collection' },
    gridBadge: prismBadge,
    carousel: { index: 1, total: 8 },
    information: [
      info('sagaSkin', 'Saga Skin', 'Choose from multiple unlocked forms. Progress through the Wandering Market.'),
      info('emberlordSaga', 'The Emberlord Saga', 'Unlocked in the Emberlord Saga.'),
      info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
    ],
  };
}

function emberlordPrism(fileName, displayName, variantName, matchSkinKey, matchVariantName, index) {
  return {
    fileName,
    displayName,
    parentSkinName: 'Emberlord Ashen Ascendant',
    variantName,
    matchSkinKey,
    matchVariantName,
    tier: 'Prisms',
    cost: { currency: null, amount: null, navigateOnly: true },
    gridBadge: prismBadge,
    carousel: { index, total: 8 },
    information: [
      info('emberlordSaga', 'The Emberlord Saga', "Available for purchase in the 'Emberlord Saga'."),
      info('prism', 'Prism', "Prisms are unique color variations of existing skins, letting you further customize your god's appearance. You must own the base skin to unlock its Prisms."),
      info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
    ],
  };
}

function missSenshiPrism(fileName, displayName, variantName, matchVariantName, index) {
  return travelerPrismVariant(
    fileName,
    displayName,
    'Miss Senshi',
    variantName,
    'MissSenshi',
    matchVariantName,
    'Miss Senshi',
    index,
    4,
    [info('supporterPremier', 'Supporter Premier', 'Select Diamond-only items for those who wish to show their support and help fund the ongoing development of SMITE 2.')]
  );
}

const romanGods = [
  {
    folder: 'bacchus',
    godName: 'Bacchus',
    extractions: [
      baseShot('Screenshot (275).png'),
      { fileName: 'Screenshot (276).png', displayName: 'Dapper Catter', matchSkinKey: 'CatGentleman', ...storeLegendary(3200) },
      legacyShot('Screenshot (277).png', 'Funky Grooves', 'SuperChill', 1250),
      goToLegendary('Screenshot (278).png', 'Sir Croakus', 'FrogKnight', 'Spellbound Realms'),
      shadowShot('Screenshot (279).png'),
      masteryShot('Screenshot (280).png', 'Onyx'),
      masteryShot('Screenshot (281).png', 'Opal'),
      masteryShot('Screenshot (282).png', 'Radiant'),
    ],
  },
  {
    folder: 'bellona',
    godName: 'Bellona',
    extractions: [
      baseShot('Screenshot (295).png'),
      {
        fileName: 'Screenshot (296).png',
        displayName: 'Miss Senshi',
        matchSkinKey: 'MissSenshi',
        tier: 'Classic',
        cost: { currency: 'diamonds', amount: '1500', owned: false },
        unlock: { source: 'traveler', displayText: 'Traveler Collection' },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 4 },
        information: [
          info('travelerCollection', 'Traveler Collection', 'Acquired in the "Miss Senshi" Traveler.'),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
          info('classic', 'Classic', 'This item was Inspired by a SMITE 1 Skin.'),
        ],
      },
      missSenshiPrism('Screenshot (297).png', 'Miss Senshi - Neowave', 'Neowave', 'Prism 1', 2),
      missSenshiPrism('Screenshot (298).png', 'Miss Senshi - Golden Grad', 'Golden Grad', 'Prism 2', 3),
      missSenshiPrism('Screenshot (299).png', 'Miss Senshi - Varsity', 'Varsity', 'Prism 3', 4),
      sagaBase('Screenshot (300).png', 'Interstellar Empyrean', 'DarkTyrant', 'Darkstar Saga'),
      sagaPrism('Screenshot (301).png', 'Interstellar Empyrean - Burning Conquest', 'Interstellar Empyrean', 'Burning Conquest', 'DarkTyrant', 'Prism 1', 'Darkstar Saga', 2, 5),
      sagaPrism('Screenshot (302).png', 'Interstellar Empyrean - Bloody Wrath', 'Interstellar Empyrean', 'Bloody Wrath', 'DarkTyrant', 'Prism 2', 'Darkstar Saga', 3, 5),
      sagaPrism('Screenshot (303).png', 'Interstellar Empyrean - Phantom Blade', 'Interstellar Empyrean', 'Phantom Blade', 'DarkTyrant', 'Prism 3', 'Darkstar Saga', 4, 5),
      sagaPrism('Screenshot (304).png', 'Interstellar Empyrean - Emerald Reaver', 'Interstellar Empyrean', 'Emerald Reaver', 'DarkTyrant', 'Prism 4', 'Darkstar Saga', 5, 5),
      sagaBase('Screenshot (305).png', 'Galactic Commander', 'DarkTyrant', 'Darkstar Saga'),
      sagaPrism('Screenshot (306).png', 'Galactic Commander - Burning Conquest', 'Galactic Commander', 'Burning Conquest', 'DarkTyrant', 'Galactic Burning Conquest', 'Darkstar Saga', 2, 5),
      sagaPrism('Screenshot (307).png', 'Galactic Commander - Bloody Wrath', 'Galactic Commander', 'Bloody Wrath', 'DarkTyrant', 'Galactic Bloody Wrath', 'Darkstar Saga', 3, 5),
      sagaPrism('Screenshot (308).png', 'Galactic Commander - Phantom Blade', 'Galactic Commander', 'Phantom Blade', 'DarkTyrant', 'Galactic Phantom Blade', 'Darkstar Saga', 4, 5),
      sagaPrism('Screenshot (309).png', 'Galactic Commander - Emerald Reaver', 'Galactic Commander', 'Emerald Reaver', 'DarkTyrant', 'Galactic Emerald Reaver', 'Darkstar Saga', 5, 5),
      sagaBase('Screenshot (310).png', 'Outerworld Invader', 'DarkTyrant', 'Darkstar Saga'),
      sagaPrism('Screenshot (311).png', 'Outerworld Invader - Burning Conquest', 'Outerworld Invader', 'Burning Conquest', 'DarkTyrant', 'Outerworld Burning Conquest', 'Darkstar Saga', 2, 5),
      sagaPrism('Screenshot (312).png', 'Outerworld Invader - Bloody Wrath', 'Outerworld Invader', 'Bloody Wrath', 'DarkTyrant', 'Outerworld Bloody Wrath', 'Darkstar Saga', 3, 5),
      sagaPrism('Screenshot (313).png', 'Outerworld Invader - Phantom Blade', 'Outerworld Invader', 'Phantom Blade', 'DarkTyrant', 'Outerworld Phantom Blade', 'Darkstar Saga', 4, 5),
      sagaPrism('Screenshot (314).png', 'Outerworld Invader - Emerald Reaver', 'Outerworld Invader', 'Emerald Reaver', 'DarkTyrant', 'Outerworld Emerald Reaver', 'Darkstar Saga', 5, 5),
      {
        fileName: 'Screenshot (315).png',
        displayName: 'Jade Dragons',
        matchSkinKey: 'JadeDragon',
        tier: 'Fabled',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'event', displayText: 'Special event' },
        information: [info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.')],
      },
      {
        fileName: 'Screenshot (316).png',
        displayName: 'Untamed',
        matchSkinKey: 'GothBarbarian',
        tier: 'Epic',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'legacy', displayText: 'SMITE 1 Divine Legacy' },
        information: [
          info('crossGen', 'Cross-Gen', 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.'),
          info('legacyPass', 'Legacy Pass', 'This Skin is acquired from purchasing the Legacy Pass DLC.'),
          info('special', 'Special', 'This item is from a special Event and may appear for direct purchase or in Chests.'),
        ],
      },
      shadowShot('Screenshot (317).png'),
      masteryShot('Screenshot (318).png', 'Onyx'),
      masteryShot('Screenshot (319).png', 'Opal'),
      masteryShot('Screenshot (320).png', 'Radiant'),
    ],
  },
  {
    folder: 'cupid',
    godName: 'Cupid',
    extractions: [
      baseShot('Screenshot (384).png'),
      { fileName: 'Screenshot (385).png', displayName: 'Bighead', matchSkinKey: 'Bighead', ...storeClassic(800) },
      { fileName: 'Screenshot (386).png', displayName: 'Court Archer', matchSkinKey: 'CourtArcher', ...storeEpic(1200) },
      travelerPrismBase('Screenshot (387).png', 'Lil Thanatos', 'LilThanatos', 'Lil Thanatos', 2400),
      travelerPrismVariant('Screenshot (388).png', 'Lil Thanatos - Candy Heart', 'Lil Thanatos', 'Candy Heart', 'LilThanatos', 'Prism 1', 'Lil Thanatos', 2, 5),
      travelerPrismVariant('Screenshot (389).png', 'Lil Thanatos - Love Bug', 'Lil Thanatos', 'Love Bug', 'LilThanatos', 'Prism 2', 'Lil Thanatos', 3, 5),
      travelerPrismVariant('Screenshot (390).png', 'Lil Thanatos - Rose Gold', 'Lil Thanatos', 'Rose Gold', 'LilThanatos', 'Prism 3', 'Lil Thanatos', 4, 5),
      prismVariantRare('Screenshot (391).png', 'Lil Thanatos - Sweetheart', 'Lil Thanatos', 'Sweetheart', 'LilThanatos', 'Prism 4', 5, 5),
      shadowShot('Screenshot (392).png'),
      masteryShot('Screenshot (393).png', 'Onyx'),
      masteryShot('Screenshot (394).png', 'Opal'),
      masteryShot('Screenshot (395).png', 'Radiant'),
    ],
  },
  {
    folder: 'hercules',
    godName: 'Hercules',
    extractions: [
      baseShot('Screenshot (509).png'),
      { fileName: 'Screenshot (510).png', displayName: 'Batter Up', matchSkinKey: 'BatterUp', ...storeClassic(2400) },
      { fileName: 'Screenshot (511).png', displayName: 'Crimson Mangus', matchSkinKey: 'CrimsonMangus', ...storeEpic(1200) },
      { fileName: 'Screenshot (512).png', displayName: 'El Macho', matchSkinKey: 'TLuchadoreCard1440x1920', ...storeClassic(2400) },
      shadowShot('Screenshot (513).png'),
      masteryShot('Screenshot (514).png', 'Onyx'),
      masteryShot('Screenshot (515).png', 'Opal'),
      masteryShot('Screenshot (516).png', 'Radiant'),
    ],
  },
  {
    folder: 'janus',
    godName: 'Janus',
    extractions: [
      baseShot('Screenshot (568).png'),
      travelerPrismBase('Screenshot (569).png', 'Jandroid', 'Jandroid', 'Jandroid', 2400),
      travelerPrismVariant('Screenshot (570).png', 'Jandroid - Chrome', 'Jandroid', 'Chrome', 'Jandroid', 'Prism 1', 'Jandroid', 2, 5),
      travelerPrismVariant('Screenshot (571).png', 'Jandroid - Copper', 'Jandroid', 'Copper', 'Jandroid', 'Prism 2', 'Jandroid', 3, 5),
      travelerPrismVariant('Screenshot (572).png', 'Jandroid - Gold', 'Jandroid', 'Gold', 'Jandroid', 'Prism 3', 'Jandroid', 4, 5),
      prismVariantRare('Screenshot (573).png', 'Jandroid - Titanium', 'Jandroid', 'Titanium', 'Jandroid', 'Prism 4', 5, 5),
      shadowShot('Screenshot (574).png'),
      masteryShot('Screenshot (575).png', 'Onyx'),
      masteryShot('Screenshot (576).png', 'Opal'),
      masteryShot('Screenshot (577).png', 'Radiant'),
    ],
  },
  {
    folder: 'mercury',
    godName: 'Mercury',
    extractions: [
      baseShot('Screenshot (674).png'),
      {
        fileName: 'Screenshot (675).png',
        displayName: "Hell's Fury",
        matchSkinKey: '010',
        tier: 'Epic',
        cost: { currency: 'diamonds', amount: '1200', owned: false },
        unlock: { source: 'store', displayText: 'Direct purchase — may appear in chests or events' },
        information: [
          info('crossGen', 'Cross-Gen', 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.'),
          info('standard', 'Standard', 'This item is available for direct purchase and may appear in Chests or other special Events.'),
        ],
      },
      shadowShot('Screenshot (676).png'),
      masteryShot('Screenshot (677).png', 'Onyx'),
      masteryShot('Screenshot (678).png', 'Opal'),
      masteryShot('Screenshot (679).png', 'Radiant'),
    ],
  },
  {
    folder: 'sylvanus',
    godName: 'Sylvanus',
    extractions: [
      baseShot('Screenshot (920).png'),
      { fileName: 'Screenshot (921).png', displayName: 'Harvest Keeper', matchSkinKey: 'HarvestKeeper', ...storeEpic(1200) },
      travelerPrismBase('Screenshot (922).png', 'Highnoon', 'Highnoon', 'Highnoon', 2400, 4),
      travelerPrismVariant('Screenshot (923).png', 'Highnoon - Dust Devil', 'Highnoon', 'Dust Devil', 'Highnoon', 'Prism 1', 'Highnoon', 2, 4),
      travelerPrismVariant('Screenshot (924).png', 'Highnoon - Sunset', 'Highnoon', 'Sunset', 'Highnoon', 'Prism 2', 'Highnoon', 3, 4),
      prismVariantRare('Screenshot (925).png', 'Highnoon - Wild West', 'Highnoon', 'Wild West', 'Highnoon', 'Prism 4', 4, 4),
      shadowShot('Screenshot (926).png'),
      masteryShot('Screenshot (927).png', 'Onyx'),
      masteryShot('Screenshot (928).png', 'Opal'),
      masteryShot('Screenshot (929).png', 'Radiant'),
    ],
  },
  {
    folder: 'vulcan',
    godName: 'Vulcan',
    extractions: [
      baseShot('Screenshot (975).png'),
      {
        fileName: 'Screenshot (976).png',
        displayName: 'Chef Vulcan',
        matchSkinKey: 'ChefVulcan',
        tier: 'Classic',
        cost: { currency: null, amount: null, navigateOnly: true },
        unlock: { source: 'traveler', displayText: 'Traveler Collection' },
        gridBadge: prismBadge,
        carousel: { index: 1, total: 4 },
        information: [
          info('travelerCollection', 'Traveler Collection', "Acquired in the 'Chef Vulcan' Traveler."),
          info('prismsAvailable', 'Prisms Available', 'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.'),
        ],
      },
      travelerPrismVariant('Screenshot (977).png', 'Chef Vulcan - Blue Plate', 'Chef Vulcan', 'Blue Plate', 'ChefVulcan', 'Prism 1', 'Chef Vulcan', 2, 4),
      travelerPrismVariant('Screenshot (978).png', 'Chef Vulcan - Sous Chef', 'Chef Vulcan', 'Sous Chef', 'ChefVulcan', 'Prism 2', 'Chef Vulcan', 3, 4),
      prismVariantRare('Screenshot (979).png', 'Chef Vulcan - Iron Skillet', 'Chef Vulcan', 'Iron Skillet', 'ChefVulcan', 'Prism 4', 4, 4),
      emberlordBase('Screenshot (980).png', 'Emberlord - First Flame', 'EmberlordAshenAscendant'),
      emberlordPrism('Screenshot (981).png', 'Emberlord - Sanguine', 'Sanguine', 'EmberlordAshenAscendant', 'Prism A', 6),
      emberlordPrism('Screenshot (982).png', 'Emberlord - Frostfire', 'Frostfire', 'EmberlordAshenAscendant', 'Prism B', 7),
      emberlordPrism('Screenshot (983).png', 'Emberlord - Molten Core', 'Molten Core', 'EmberlordAshenAscendant', 'Prism C', 4),
      emberlordPrism('Screenshot (984).png', 'Emberlord - Void Ember', 'Void Ember', 'EmberlordAshenAscendant', 'Prism D', 8),
      shadowShot('Screenshot (985).png'),
      masteryShot('Screenshot (986).png', 'Onyx'),
      masteryShot('Screenshot (987).png', 'Opal'),
      masteryShot('Screenshot (988).png', 'Radiant'),
      // Screenshot (989–991) are duplicate recaptures — not tagged (see vision read 2026-06-22)
    ],
  },
];

for (const g of romanGods) {
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

const romanDataPath = path.join(__dirname, '.vision-tag-roman-data.json');
fs.writeFileSync(
  romanDataPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Roman pantheon (8 gods). Vision-verified panel text; Vulcan 989–991 skipped (duplicate recaptures).',
      gods: romanGods,
    },
    null,
    2
  ) + '\n',
  'utf8'
);

const batchPath = path.join(__dirname, '.vision-tag-batch-b-data.json');
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const egyptianFolders = new Set([
  'anhur', 'anubis', 'bastet', 'eset', 'geb', 'horus', 'khepri', 'neith', 'nut', 'osiris', 'ra', 'sobek',
]);

const agentGods = [
  ...romanGods,
  ...(batch.gods || []).filter((g) => egyptianFolders.has(g.folder)),
];

const agentPath = path.join(__dirname, '.vision-tag-agent-b-data.json');
fs.writeFileSync(agentPath, JSON.stringify({ gods: agentGods }, null, 2) + '\n', 'utf8');

const romanShots = romanGods.reduce((n, g) => n + g.extractions.length, 0);
const egyptShots = agentGods.filter((g) => egyptianFolders.has(g.folder)).reduce((n, g) => n + g.extractions.length, 0);
console.log(`Wrote ${romanDataPath}`);
console.log(`Wrote ${agentPath}`);
console.log(`Roman: ${romanGods.length} gods, ${romanShots} shots`);
console.log(`Egyptian: ${agentGods.length - romanGods.length} gods, ${egyptShots} shots`);
console.log(`Total: ${agentGods.length} gods, ${romanShots + egyptShots} shots`);
