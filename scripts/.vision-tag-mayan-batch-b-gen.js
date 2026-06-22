'use strict';
const fs = require('fs');
const path = require('path');

const frame = {
  focalX: 50,
  focalY: 50,
  zoom: 1.148936170212766,
  aspectWidth: 586,
  aspectHeight: 940,
  cropWidth: 586,
  cropHeight: 940,
};

const tierMap = {
  Classic: 'Common',
  Legendary: 'Legendary',
  Epic: 'Epic',
  Heroic: 'Heroic',
  Prisms: 'Recolors',
  Legacy: 'Legacy',
};

function tierBadge(tier) {
  if (!tier) return null;
  const id = tierMap[tier] || tier;
  return `app/data/Tiers/t_FE_Cosmetics_${id}Tier.png`;
}

function shot(folder, file) {
  return `app/data/God Renders/${folder}/${file}`;
}

function ex(folder, file, godName, o) {
  const screenshot = shot(folder, file);
  const row = {
    screenshot,
    godName,
    displayName: o.displayName,
    parentSkinName: o.parentSkinName ?? null,
    variantName: o.variantName ?? null,
    tier: o.tier ?? null,
    tierBadge: o.tier ? tierBadge(o.tier) : null,
    cost: o.cost ?? null,
    unlock: o.unlock ?? null,
    information: o.information ?? [],
    grid: o.grid ?? null,
    carousel: o.carousel ?? null,
    loadout: { screenshot, frame },
  };
  if (o.matchSkinKey) row.matchSkinKey = o.matchSkinKey;
  if (o.matchVariantName) row.matchVariantName = o.matchVariantName;
  return row;
}

const asc5 = {
  masteryRank: 5,
  requiresAscensionPass: true,
  source: 'ascension',
  displayText: 'Ascension reward — requires Mastery rank V',
};
const asc10 = {
  masteryRank: 10,
  requiresAscensionPass: true,
  source: 'ascension',
  prismNote: true,
  displayText: 'Ascension reward — requires Mastery rank X (Radiant)',
};
const shadowUnlock = {
  source: 'ascension',
  requiresAscensionPass: true,
  rarityNote: 'Rare',
  displayText: 'Ascension reward — instantly unlocked with Ascension Pass',
};
const goTo = { currency: null, amount: null, navigateOnly: true };
const mb5 = { type: 'masteryRank', rank: 5, label: 'V' };
const mb10 = { type: 'masteryRank', rank: 10, label: 'X' };
const prismGrid = { type: 'prism', rank: null, label: 'prism' };

const gods = [
  {
    folder: 'ah puch',
    godName: 'Ah Puch',
    extractions: [
      ex('ah puch', 'Screenshot (127).png', 'Ah Puch', {
        displayName: 'Base',
        cost: { currency: 'diamonds', amount: '0', owned: true },
        unlock: { source: 'base', displayText: 'Default god skin' },
        grid: { selectedIndex: 0, badge: null },
      }),
      ex('ah puch', 'Screenshot (128).png', 'Ah Puch', {
        displayName: 'Shadow',
        matchSkinKey: 'Shadow',
        tier: 'Classic',
        cost: { currency: 'diamonds', amount: '900', owned: false },
        unlock: shadowUnlock,
        grid: { selectedIndex: 1, badge: null },
      }),
      ex('ah puch', 'Screenshot (129).png', 'Ah Puch', {
        displayName: 'Onyx',
        matchVariantName: 'Mastery Onyx',
        tier: 'Heroic',
        cost: goTo,
        unlock: asc5,
        grid: { selectedIndex: 2, badge: mb5 },
      }),
      ex('ah puch', 'Screenshot (130).png', 'Ah Puch', {
        displayName: 'Opal',
        matchVariantName: 'Mastery Opal',
        tier: 'Heroic',
        cost: goTo,
        unlock: asc5,
        grid: { selectedIndex: 3, badge: mb5 },
      }),
      ex('ah puch', 'Screenshot (131).png', 'Ah Puch', {
        displayName: 'Radiant',
        matchVariantName: 'Mastery Radiant',
        tier: 'Heroic',
        cost: goTo,
        unlock: asc10,
        grid: { selectedIndex: 4, badge: mb10 },
      }),
    ],
  },
  {
    folder: 'awilix',
    godName: 'Awilix',
    extractions: [
      ex('awilix', 'Screenshot (264).png', 'Awilix', {
        displayName: 'Base',
        cost: { currency: 'diamonds', amount: '0', owned: true },
        unlock: { source: 'base', displayText: 'Default god skin' },
        grid: { selectedIndex: 0, badge: null },
      }),
      ex('awilix', 'Screenshot (265).png', 'Awilix', {
        displayName: 'Feline Fashion 1',
        matchSkinKey: 'FelinefashionSplash1015',
        tier: 'Classic',
        cost: { currency: 'diamonds', amount: '2400', owned: false },
        unlock: { source: 'traveler', classicNote: true, prismNote: true, displayText: 'Traveler Collection — Classic skin with Prisms' },
        grid: { selectedIndex: 1, badge: prismGrid },
      }),
      ex('awilix', 'Screenshot (266).png', 'Awilix', {
        displayName: 'Feline Fashion - Snowfall Chic',
        parentSkinName: 'Feline Fashion 1',
        variantName: 'Prism 1',
        matchSkinKey: 'FelinefashionSplash1015',
        matchVariantName: 'Prism 1',
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: 2, total: 5 },
      }),
      ex('awilix', 'Screenshot (267).png', 'Awilix', {
        displayName: 'Feline Fashion - Purr-ple Passion',
        parentSkinName: 'Feline Fashion 1',
        variantName: 'Prism 2',
        matchSkinKey: 'FelinefashionSplash1015',
        matchVariantName: 'Prism 2',
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: 3, total: 5 },
      }),
      ex('awilix', 'Screenshot (268).png', 'Awilix', {
        displayName: 'Feline Fashion - Cat Burglar',
        parentSkinName: 'Feline Fashion 1',
        variantName: 'Prism 3',
        matchSkinKey: 'FelinefashionSplash1015',
        matchVariantName: 'Prism 3',
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: 4, total: 5 },
      }),
      ex('awilix', 'Screenshot (269).png', 'Awilix', {
        displayName: 'Feline Fashion - Spectral Stripes',
        parentSkinName: 'Feline Fashion 1',
        variantName: 'Prism 4',
        matchSkinKey: 'FelinefashionSplash1015',
        matchVariantName: 'Prism 4',
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: 5, total: 5 },
      }),
      ex('awilix', 'Screenshot (270).png', 'Awilix', {
        displayName: 'Cyberclaw',
        matchSkinKey: 'Cyberclaw',
        tier: 'Epic',
        cost: { currency: 'diamonds', amount: '1200', owned: false },
        unlock: { source: 'event', rarityNote: 'Rare', displayText: 'Special event' },
        grid: { selectedIndex: 2, badge: null },
      }),
      ex('awilix', 'Screenshot (271).png', 'Awilix', {
        displayName: 'Shadow',
        matchSkinKey: 'Shadow',
        tier: 'Classic',
        cost: { currency: 'diamonds', amount: '900', owned: false },
        unlock: shadowUnlock,
        grid: { selectedIndex: 3, badge: null },
      }),
      ex('awilix', 'Screenshot (272).png', 'Awilix', {
        displayName: 'Onyx',
        matchVariantName: 'Mastery Onyx',
        tier: 'Heroic',
        cost: goTo,
        unlock: asc5,
        grid: { selectedIndex: 4, badge: mb5 },
      }),
      ex('awilix', 'Screenshot (273).png', 'Awilix', {
        displayName: 'Opal',
        matchVariantName: 'Mastery Opal',
        tier: 'Heroic',
        cost: goTo,
        unlock: asc5,
        grid: { selectedIndex: 5, badge: mb5 },
      }),
      ex('awilix', 'Screenshot (274).png', 'Awilix', {
        displayName: 'Radiant',
        matchVariantName: 'Mastery Radiant',
        tier: 'Heroic',
        cost: goTo,
        unlock: asc10,
        grid: { selectedIndex: 6, badge: mb10 },
      }),
    ],
  },
];

// Continue in part 2 - cabrakan through xbalanque appended below via require pattern
// For maintainability the rest is inline

const cabrakanPrisms = [
  ['Screenshot (323).png', 'Fat Loki - Joki', 'Prism 1', 2, 4],
  ['Screenshot (324).png', 'Fat Loki - Grim Mariachi', 'Prism 2', 3, 4],
  ['Screenshot (325).png', 'Fat Loki - Loki Charms', 'Prism 3', 4, 4],
];
const nerdPrisms = [
  ['Screenshot (327).png', 'Nerd Rage - Assistant', 'Prism A', 2, 5],
  ['Screenshot (328).png', 'Nerd Rage - Neowave', 'Prism B', 3, 5],
  ['Screenshot (329).png', 'Nerd Rage - Lo-Rez', 'Prism C', 4, 5],
  ['Screenshot (330).png', 'Nerd Rage - Data Logger', 'Prism D', 5, 5],
];

gods.push({
  folder: 'cabrakan',
  godName: 'Cabrakan',
  extractions: [
    ex('cabrakan', 'Screenshot (321).png', 'Cabrakan', {
      displayName: 'Base',
      cost: { currency: 'diamonds', amount: '0', owned: true },
      unlock: { source: 'base', displayText: 'Default god skin' },
      grid: { selectedIndex: 0, badge: null },
    }),
    ex('cabrakan', 'Screenshot (322).png', 'Cabrakan', {
      displayName: 'Fat Loki',
      matchSkinKey: 'FatLoki',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '2400', owned: false },
      unlock: { source: 'traveler', classicNote: true, prismNote: true, displayText: 'Traveler Collection — Classic skin with Prisms' },
      grid: { selectedIndex: 1, badge: prismGrid },
    }),
    ...cabrakanPrisms.map(([file, name, variant, idx, total]) =>
      ex('cabrakan', file, 'Cabrakan', {
        displayName: name,
        parentSkinName: 'Fat Loki',
        variantName: variant,
        matchSkinKey: 'FatLoki',
        matchVariantName: variant,
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: idx, total },
      })
    ),
    ex('cabrakan', 'Screenshot (326).png', 'Cabrakan', {
      displayName: 'Nerd Rage 014',
      matchSkinKey: 'NerdRage014',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '2400', owned: false },
      unlock: { source: 'traveler', classicNote: true, prismNote: true, displayText: 'Traveler Collection — Classic skin with Prisms' },
      grid: { selectedIndex: 2, badge: prismGrid },
      carousel: { index: 1, total: 5 },
    }),
    ...nerdPrisms.map(([file, name, variant, idx, total]) =>
      ex('cabrakan', file, 'Cabrakan', {
        displayName: name,
        parentSkinName: 'Nerd Rage 014',
        variantName: variant,
        matchSkinKey: 'NerdRage014',
        matchVariantName: variant,
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 2, badge: prismGrid },
        carousel: { index: idx, total },
      })
    ),
    ex('cabrakan', 'Screenshot (331).png', 'Cabrakan', {
      displayName: 'Shadow',
      matchSkinKey: 'Shadow',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '900', owned: false },
      unlock: shadowUnlock,
      grid: { selectedIndex: 3, badge: null },
    }),
    ex('cabrakan', 'Screenshot (332).png', 'Cabrakan', {
      displayName: 'Onyx',
      matchVariantName: 'Mastery Onyx',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 4, badge: mb5 },
    }),
    ex('cabrakan', 'Screenshot (333).png', 'Cabrakan', {
      displayName: 'Opal',
      matchVariantName: 'Mastery Opal',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 5, badge: mb5 },
    }),
    ex('cabrakan', 'Screenshot (334).png', 'Cabrakan', {
      displayName: 'Radiant',
      matchVariantName: 'Mastery Radiant',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc10,
      grid: { selectedIndex: 6, badge: mb10 },
    }),
  ],
});

const slaughterPrisms = [
  ['Screenshot (357).png', 'Slaughterhouse - Smiley Time', 'Prism 1', 2],
  ['Screenshot (358).png', 'Slaughterhouse - Infernal Rider', 'Prism 2', 3],
  ['Screenshot (359).png', 'Slaughterhouse - Carnival Carnage', 'Prism 3', 4],
  ['Screenshot (360).png', 'Slaughterhouse - Gilded Gore', 'Prism 4', 5],
];

gods.push({
  folder: 'chaac',
  godName: 'Chaac',
  extractions: [
    ex('chaac', 'Screenshot (355).png', 'Chaac', {
      displayName: 'Base',
      cost: { currency: 'diamonds', amount: '0', owned: true },
      unlock: { source: 'base', displayText: 'Default god skin' },
      grid: { selectedIndex: 0, badge: null },
    }),
    ex('chaac', 'Screenshot (356).png', 'Chaac', {
      displayName: 'Slaughterhouse Splash 1',
      matchSkinKey: 'SlaughterhouseSplash1',
      tier: 'Legendary',
      cost: { currency: 'diamonds', amount: '1200', owned: false },
      unlock: { source: 'event', displayText: 'Special event' },
      grid: { selectedIndex: 1, badge: prismGrid },
      carousel: { index: 1, total: 5 },
    }),
    ...slaughterPrisms.map(([file, name, variant, idx]) =>
      ex('chaac', file, 'Chaac', {
        displayName: name,
        parentSkinName: 'Slaughterhouse Splash 1',
        variantName: variant,
        matchSkinKey: 'SlaughterhouseSplash1',
        matchVariantName: variant,
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: idx, total: 5 },
      })
    ),
    ex('chaac', 'Screenshot (361).png', 'Chaac', {
      displayName: 'Demon',
      matchSkinKey: 'Demon',
      tier: 'Epic',
      cost: { currency: 'diamonds', amount: '1600', owned: false },
      unlock: { source: 'event', rarityNote: 'Rare', displayText: 'Special event' },
      grid: { selectedIndex: 2, badge: null },
    }),
    ex('chaac', 'Screenshot (362).png', 'Chaac', {
      displayName: 'Infernal Mace',
      matchSkinKey: 'TSkincardAbyssalhunter',
      tier: 'Legacy',
      cost: { currency: 'diamonds', amount: '1750', owned: false },
      unlock: { source: 'legacy', rarityNote: 'Rare', displayText: 'SMITE 1 Divine Legacy' },
      grid: { selectedIndex: 4, badge: null },
    }),
    ex('chaac', 'Screenshot (363).png', 'Chaac', {
      displayName: 'Necrotic Divinity',
      matchSkinKey: 'NecroticDivinity',
      tier: 'Legendary',
      cost: { currency: 'diamonds', amount: '3200', owned: false },
      unlock: { source: 'event', displayText: 'Special event' },
      grid: { selectedIndex: 5, badge: null },
    }),
    ex('chaac', 'Screenshot (364).png', 'Chaac', {
      displayName: 'Shadow',
      matchSkinKey: 'Shadow',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '900', owned: false },
      unlock: shadowUnlock,
      grid: { selectedIndex: 6, badge: null },
    }),
    ex('chaac', 'Screenshot (365).png', 'Chaac', {
      displayName: 'Onyx',
      matchVariantName: 'Mastery Onyx',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 7, badge: mb5 },
    }),
    ex('chaac', 'Screenshot (366).png', 'Chaac', {
      displayName: 'Opal',
      matchVariantName: 'Mastery Opal',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 8, badge: mb5 },
    }),
    ex('chaac', 'Screenshot (367).png', 'Chaac', {
      displayName: 'Radiant',
      matchVariantName: 'Mastery Radiant',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc10,
      grid: { selectedIndex: 8, badge: mb10 },
    }),
  ],
});

gods.push({
  folder: 'hun batz',
  godName: 'Hun Batz',
  extractions: [
    ex('hun batz', 'Screenshot (544).png', 'Hun Batz', {
      displayName: 'Base',
      cost: { currency: 'diamonds', amount: '0', owned: true },
      unlock: { source: 'base', displayText: 'Default god skin' },
      grid: { selectedIndex: 0, badge: null },
    }),
    ex('hun batz', 'Screenshot (545).png', 'Hun Batz', {
      displayName: 'Shadow Howler',
      matchSkinKey: 'ShadowHowler',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '2400', owned: false },
      unlock: { source: 'event', displayText: 'Special event' },
      grid: { selectedIndex: 1, badge: null },
    }),
    ex('hun batz', 'Screenshot (546).png', 'Hun Batz', {
      displayName: 'Arcane Ape',
      matchSkinKey: 'ArcaneApe',
      tier: 'Epic',
      cost: goTo,
      unlock: { source: 'event', displayText: 'Special event' },
      grid: { selectedIndex: 2, badge: null },
    }),
    ex('hun batz', 'Screenshot (547).png', 'Hun Batz', {
      displayName: 'Shadow',
      matchSkinKey: 'Shadow',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '900', owned: false },
      unlock: shadowUnlock,
      grid: { selectedIndex: 3, badge: null },
    }),
    ex('hun batz', 'Screenshot (548).png', 'Hun Batz', {
      displayName: 'Onyx',
      matchVariantName: 'Mastery Onyx',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 4, badge: mb5 },
    }),
    ex('hun batz', 'Screenshot (549).png', 'Hun Batz', {
      displayName: 'Opal',
      matchVariantName: 'Mastery Opal',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 5, badge: mb5 },
    }),
    ex('hun batz', 'Screenshot (550).png', 'Hun Batz', {
      displayName: 'Radiant',
      matchVariantName: 'Mastery Radiant',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc10,
      grid: { selectedIndex: 6, badge: mb10 },
    }),
  ],
});

function dragonLordPrism(file, displayName, variant, carouselIndex, gridIndex) {
  return ex('kukulkan', file, 'Kukulkan', {
    displayName,
    parentSkinName: 'Dragon Lord Form 1',
    variantName: variant,
    matchSkinKey: 'DragonLordForm01',
    matchVariantName: variant,
    tier: 'Prisms',
    cost: goTo,
    unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
    grid: { selectedIndex: gridIndex, badge: prismGrid },
    carousel: { index: carouselIndex, total: 5 },
  });
}

const voidPrisms = [
  ['Screenshot (627).png', 'Void Wyrm - Brightscale White', 'Prism 1', 2],
  ['Screenshot (628).png', 'Void Wyrm - Venomspite Black', 'Prism 2', 3],
  ['Screenshot (629).png', 'Void Wyrm - Emberglow Gold', 'Prism 3', 4],
];

const wickedKing = [
  ['Screenshot (632).png', 'Archfiend - Wicked King', null, 1],
  ['Screenshot (633).png', 'Wicked King - Toxic Wings', 'Prism P1', 2],
  ['Screenshot (634).png', 'Wicked King - Gilded Fangs', 'Prism P2', 3],
  ['Screenshot (635).png', 'Wicked King - Molten Breath', 'Prism P3', 4],
  ['Screenshot (636).png', 'Wicked King - Shadow Claws', 'Prism P4', 5],
];

const crimsonMajesty = [
  ['Screenshot (637).png', 'Archfiend - Crimson Majesty', null, 1],
  ['Screenshot (638).png', 'Crimson Majesty - Toxic Wings', 'Prism P1', 2],
  ['Screenshot (639).png', 'Crimson Majesty - Gilded Fangs', 'Prism P2', 3],
  ['Screenshot (640).png', 'Crimson Majesty - Molten Breath', 'Prism P3', 4],
  ['Screenshot (641).png', 'Crimson Majesty - Shadow Claws', 'Prism P4', 5],
];

const necroticTyrant = [
  ['Screenshot (642).png', 'Archfiend - Necrotic Tyrant', null, 1],
  ['Screenshot (643).png', 'Necrotic Tyrant - Toxic Wings', 'Prism P1', 2],
  ['Screenshot (644).png', 'Necrotic Tyrant - Gilded Fangs', 'Prism P2', 3],
  ['Screenshot (645).png', 'Necrotic Tyrant - Molten Breath', 'Prism P3', 4],
  ['Screenshot (646).png', 'Necrotic Tyrant - Shadow Claws', 'Prism P4', 5],
];

function sagaRow(file, displayName, variant, carouselIndex, gridIndex = 4) {
  if (!variant) {
    return ex('kukulkan', file, 'Kukulkan', {
      displayName,
      matchSkinKey: 'DragonLordForm01',
      tier: 'Legendary',
      cost: goTo,
      unlock: { source: 'event', displayText: 'Archfiend Saga' },
      grid: { selectedIndex: gridIndex, badge: prismGrid },
      carousel: { index: carouselIndex, total: 5 },
    });
  }
  return dragonLordPrism(file, displayName, variant, carouselIndex, gridIndex);
}

gods.push({
  folder: 'kukulkan',
  godName: 'Kukulkan',
  extractions: [
    ex('kukulkan', 'Screenshot (625).png', 'Kukulkan', {
      displayName: 'Base',
      cost: { currency: 'diamonds', amount: '0', owned: true },
      unlock: { source: 'base', displayText: 'Default god skin' },
      grid: { selectedIndex: 0, badge: prismGrid },
    }),
    ex('kukulkan', 'Screenshot (626).png', 'Kukulkan', {
      displayName: 'Void Wyrm',
      matchSkinKey: 'VoidWyrm',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '2400', owned: false },
      unlock: { source: 'traveler', classicNote: true, prismNote: true, displayText: 'Traveler Collection — Classic skin with Prisms' },
      grid: { selectedIndex: 1, badge: prismGrid },
      carousel: { index: 1, total: 4 },
    }),
    ...voidPrisms.map(([file, name, variant, idx]) =>
      ex('kukulkan', file, 'Kukulkan', {
        displayName: name,
        parentSkinName: 'Void Wyrm',
        variantName: variant,
        matchSkinKey: 'VoidWyrm',
        matchVariantName: variant,
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: idx, total: 4 },
      })
    ),
    ex('kukulkan', 'Screenshot (630).png', 'Kukulkan', {
      displayName: 'Cosmicmoth',
      matchSkinKey: 'Smite2F2pOb1SocialCosmicmoth1920x1080Notag',
      tier: 'Epic',
      cost: { currency: 'diamonds', amount: '1600', owned: false },
      unlock: { source: 'event', displayText: 'Special event' },
      grid: { selectedIndex: 2, badge: null },
    }),
    ex('kukulkan', 'Screenshot (631).png', 'Kukulkan', {
      displayName: 'Prismatic Dragon',
      matchSkinKey: 'PrismaticDragon',
      tier: 'Legendary',
      cost: { currency: 'diamonds', amount: '3200', owned: false },
      unlock: { source: 'event', displayText: 'Special event' },
      grid: { selectedIndex: 3, badge: null },
    }),
    ...wickedKing.map(([file, name, variant, idx]) => sagaRow(file, name, variant, idx, 4)),
    ...crimsonMajesty.map(([file, name, variant, idx]) => sagaRow(file, name, variant, idx, 5)),
    ...necroticTyrant.map(([file, name, variant, idx]) => sagaRow(file, name, variant, idx, 4)),
    ex('kukulkan', 'Screenshot (647).png', 'Kukulkan', {
      displayName: 'Shadow',
      matchSkinKey: 'Shadow',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '900', owned: false },
      unlock: shadowUnlock,
      grid: { selectedIndex: 1, badge: null },
    }),
    ex('kukulkan', 'Screenshot (648).png', 'Kukulkan', {
      displayName: 'Onyx',
      matchVariantName: 'Mastery Onyx',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 5, badge: mb5 },
    }),
    ex('kukulkan', 'Screenshot (649).png', 'Kukulkan', {
      displayName: 'Opal',
      matchVariantName: 'Mastery Opal',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 5, badge: mb5 },
    }),
    ex('kukulkan', 'Screenshot (650).png', 'Kukulkan', {
      displayName: 'Radiant',
      matchVariantName: 'Mastery Radiant',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc10,
      grid: { selectedIndex: 6, badge: mb10 },
    }),
  ],
});

const darkestPrisms = [
  ['Screenshot (994).png', 'Darkest Knight - Scaleveil', 'Prism 1', 2],
  ['Screenshot (995).png', 'Darkest Knight - Ivory Oath', 'Prism 2', 3],
  ['Screenshot (996).png', 'Darkest Knight - Wrathborn', 'Prism 3', 4],
  ['Screenshot (997).png', 'Darkest Knight - Black Mirage', 'Prism 4', 5],
];

gods.push({
  folder: 'xbalanque',
  godName: 'Xbalanque',
  extractions: [
    ex('xbalanque', 'Screenshot (992).png', 'Xbalanque', {
      displayName: 'Base',
      cost: { currency: 'diamonds', amount: '0', owned: true },
      unlock: { source: 'base', displayText: 'Default god skin' },
      grid: { selectedIndex: 0, badge: prismGrid },
    }),
    ex('xbalanque', 'Screenshot (993).png', 'Xbalanque', {
      displayName: 'Darkest Knight',
      matchSkinKey: 'DarkestKnight',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '2400', owned: false },
      unlock: { source: 'traveler', classicNote: true, prismNote: true, displayText: 'Traveler Collection — Classic skin with Prisms' },
      grid: { selectedIndex: 1, badge: prismGrid },
      carousel: { index: 1, total: 5 },
    }),
    ...darkestPrisms.map(([file, name, variant, idx]) =>
      ex('xbalanque', file, 'Xbalanque', {
        displayName: name,
        parentSkinName: 'Darkest Knight',
        variantName: variant,
        matchSkinKey: 'DarkestKnight',
        matchVariantName: variant,
        tier: 'Prisms',
        cost: goTo,
        unlock: { prismNote: true, source: 'prism', displayText: 'Prism variant' },
        grid: { selectedIndex: 1, badge: prismGrid },
        carousel: { index: idx, total: 5 },
      })
    ),
    ex('xbalanque', 'Screenshot (998).png', 'Xbalanque', {
      displayName: 'Shadow',
      matchSkinKey: 'Shadow',
      tier: 'Classic',
      cost: { currency: 'diamonds', amount: '900', owned: false },
      unlock: shadowUnlock,
      grid: { selectedIndex: 2, badge: null },
    }),
    ex('xbalanque', 'Screenshot (999).png', 'Xbalanque', {
      displayName: 'Onyx',
      matchVariantName: 'Mastery Onyx',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 3, badge: mb5 },
    }),
    ex('xbalanque', 'Screenshot (1000).png', 'Xbalanque', {
      displayName: 'Opal',
      matchVariantName: 'Mastery Opal',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc5,
      grid: { selectedIndex: 4, badge: mb5 },
    }),
    ex('xbalanque', 'Screenshot (1001).png', 'Xbalanque', {
      displayName: 'Radiant',
      matchVariantName: 'Mastery Radiant',
      tier: 'Heroic',
      cost: goTo,
      unlock: asc10,
      grid: { selectedIndex: 5, badge: mb10 },
    }),
  ],
});

const out = { gods };
const outPath = path.join(__dirname, '.vision-tag-batch-b-data.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('Wrote', outPath, 'shots=', gods.reduce((n, g) => n + g.extractions.length, 0));
