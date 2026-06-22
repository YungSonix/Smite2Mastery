#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../config/dataPaths');

const DATA_PATH = path.join(PROJECT_ROOT, 'scripts/.vision-tag-mayan-data.json');

/** Vision-read panel titles keyed by screenshot fileName */
const DISPLAY_BY_FILE = {
  'Screenshot (323).png': 'Fat Loki - Joki',
  'Screenshot (324).png': 'Fat Loki - Grim Mariachi',
  'Screenshot (325).png': 'Fat Loki - Loki Charms',
  'Screenshot (326).png': 'Nerd Rage',
  'Screenshot (327).png': 'Nerd Rage - Assistant',
  'Screenshot (328).png': 'Nerd Rage - Neowave',
  'Screenshot (329).png': 'Nerd Rage - Lo-Rez',
  'Screenshot (330).png': 'Nerd Rage - Data Logger',
  'Screenshot (266).png': 'Feline Fashion - Snowfall Chic',
  'Screenshot (267).png': 'Feline Fashion - Purr-ple Passion',
  'Screenshot (268).png': 'Feline Fashion - Cat Burglar',
  'Screenshot (269).png': 'Feline Fashion - Spectral Stripes',
  'Screenshot (265).png': 'Feline Fashion',
  'Screenshot (627).png': 'Void Wyrm - Brightscale White',
  'Screenshot (630).png': 'Cosmic Moth',
  'Screenshot (631).png': 'Prismatic Gust',
  'Screenshot (632).png': 'Archfiend - Wicked King',
  'Screenshot (633).png': 'Wicked King - Toxic Wings',
  'Screenshot (636).png': 'Wicked King - Shadow Claws',
  'Screenshot (637).png': 'Archfiend - Crimson Majesty',
  'Screenshot (641).png': 'Crimson Majesty - Shadow Claws',
  'Screenshot (642).png': 'Archfiend - Necrotic Tyrant',
  'Screenshot (643).png': 'Necrotic Tyrant - Toxic Wings',
};

const COST_PATCH = {
  'Screenshot (630).png': { currency: 'diamonds', amount: '1600', owned: false },
  'Screenshot (631).png': { currency: 'diamonds', amount: '3200', owned: false },
};

function main() {
  const src = path.join(PROJECT_ROOT, 'scripts/.vision-tag-agent-c-mayan-data.json');
  let data = JSON.parse(fs.readFileSync(src, 'utf8'));
  data.generatedAt = new Date().toISOString();
  data.note =
    'Mayan pantheon (7 gods). Vision-verified panel text; 86 PNGs, 0 duplicate recaptures skipped.';

  for (const god of data.gods) {
    for (const row of god.extractions) {
      if (DISPLAY_BY_FILE[row.fileName]) {
        row.displayName = DISPLAY_BY_FILE[row.fileName];
      }
      if (COST_PATCH[row.fileName]) {
        row.cost = COST_PATCH[row.fileName];
      }
      if (row.fileName === 'Screenshot (631).png') {
        row.matchSkinKey = 'PrismaticDragon';
        row.tier = 'Legendary';
        row.information = [
          {
            key: 'crossGen',
            label: 'Cross-Gen',
            text: 'Purchasing this Skin unlocks it in both SMITE 1 and SMITE 2.',
          },
          {
            key: 'standard',
            label: 'Standard',
            text: 'This item is available for direct purchase and may appear in Chests or other special Events.',
          },
        ];
      }
      if (row.fileName === 'Screenshot (632).png') {
        row.matchSkinKey = 'DragonLordForm01';
        row.tier = 'Legendary';
        row.cost = { currency: null, amount: null, navigateOnly: true };
        row.buttonText = 'GO TO';
        row.information = [
          {
            key: 'sagaSkin',
            label: 'Saga Skin',
            text: 'Choose from multiple unlocked forms. Progress through the Wandering Market.',
          },
          {
            key: 'archfiendSaga',
            label: 'Archfiend Saga',
            text: 'Unlocked in the Archfiend Saga.',
          },
          {
            key: 'prismsAvailable',
            label: 'Prisms Available',
            text:
              'This skin supports Prisms, which allow you to customize its appearance. You must own this skin before you can purchase its Prisms.',
          },
        ];
        row.gridBadge = { type: 'prism', rank: null, label: 'prism' };
        row.carousel = { index: 1, total: 5 };
      }
      if (row.fileName === 'Screenshot (642).png') {
        row.displayName = 'Archfiend - Necrotic Tyrant';
        row.matchSkinKey = 'DragonLordForm01';
        row.tier = 'Epic';
        row.cost = { currency: null, amount: null, navigateOnly: true };
        row.buttonText = 'GO TO';
      }
      if (row.fileName === 'Screenshot (326).png') {
        row.displayName = 'Nerd Rage';
        row.matchSkinKey = 'NerdRage014';
        if (row.information) {
          row.information = row.information.map((b) =>
            b.key === 'travelerCollection'
              ? { ...b, text: 'Acquired in the "Nerd" Traveler.' }
              : b
          );
        }
      }
    }
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const total = data.gods.reduce((n, g) => n + g.extractions.length, 0);
  console.log(`Patched ${DATA_PATH} (${data.gods.length} gods, ${total} shots)`);
}

main();
