/**
 * One-shot: merge hideFromSkinList prism rows into parent skin variants[].
 * Run: node scripts/merge-prism-variants.js --write
 */
const fs = require('fs');
const path = require('path');

const { BUILDS_JSON } = require('../config/dataPaths');
const BUILDS = BUILDS_JSON;
const WRITE = process.argv.includes('--write');

function variantFromRow(row, name) {
  const cardArt = row.cardArt || row.skin || '';
  const skin = row.skin || row.cardArt || '';
  const icon = row.icon || row.thumb || row.thumbnail || skin || cardArt;
  return {
    name: name || row.name || 'Prism',
    cardArt,
    skin,
    ...(icon ? { icon } : {}),
  };
}

/** @type {Array<{ god: string, parent: string, variants: object[] }>} */
const MERGES = [
  {
    god: 'Bellona',
    parent: 'MissSenshi',
    variants: [
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinCard_Bellona_MIssShenshi_Prism_01.png',
          skin: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinCard_Bellona_MIssShenshi_Prism_01.png',
          icon: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinPortrait_Bellona_MIssShenshi_Prism_01.png',
        },
        'Prism 1'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinCard_Bellona_MIssShenshi_Prism_02.png',
          skin: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinCard_Bellona_MIssShenshi_Prism_02.png',
          icon: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinPortrait_Bellona_MIssShenshi_Prism_02.png',
        },
        'Prism 2'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinCard_Bellona_MIssShenshi_Prism_03.png',
          skin: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinCard_Bellona_MIssShenshi_Prism_03.png',
          icon: 'app/data/NewGodSkins/Bellona/Skins/HiveQueen/t_SkinPortrait_Bellona_MIssShenshi_Prism_03.png',
        },
        'Prism 3'
      ),
    ],
  },
  {
    god: 'Aphrodite',
    parent: 'BeachBabe',
    variants: [
      variantFromRow(
        { skin: '/icons/Wallpapers/Aphrodite_beach_babe_aqua_splash.webp' },
        'Aqua Splash'
      ),
      variantFromRow(
        { skin: '/icons/Wallpapers/Aphrodite_beach_babe_midnight_cove_.webp' },
        'Midnight Cove'
      ),
      variantFromRow(
        { skin: '/icons/Wallpapers/Aphrodite_beach_babe_white_sands_.webp' },
        'White Sands'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinCard_Aphrodite_Prisim_B.png',
          skin: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinCard_Aphrodite_Prisim_B.png',
          icon: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinPortrait_Aphrodite_Beach_Prisim_B.png',
        },
        'Prism B'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinCard_Aphrodite_Prisim_C.png',
          skin: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinCard_Aphrodite_Prisim_C.png',
          icon: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinPortrait_Aphrodite_Beach_Prisim_C.png',
        },
        'Prism C'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinCard_Aphrodite_Prisim_D.png',
          skin: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinCard_Aphrodite_Prisim_D.png',
          icon: 'app/data/NewGodSkins/Aphrodite/Skins/Prisims/t_SkinPortrait_Aphrodite_Beach_Prisim_D.png',
        },
        'Prism D'
      ),
    ],
  },
  {
    god: 'Apollo',
    parent: 'BitBlaster',
    variants: [
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_A.png',
          skin: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_A.png',
          icon: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinPortrait_Apollo_BitBlaster_Prisim_A.png',
        },
        'Prism A'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_B.png',
          skin: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_B.png',
          icon: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinPortrait_Apollo_BitBlaster_Prisim_B.png',
        },
        'Prism B'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_C.png',
          skin: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_C.png',
          icon: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinPortrait_Apollo_BitBlaster_Prisim_C.png',
        },
        'Prism C'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_D.png',
          skin: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinCard_Apollo_BitBlaster_Prisim_D.png',
          icon: 'app/data/NewGodSkins/Apollo/Skins/Prisms/t_SkinPortrait_Apollo_BitBlaster_Prisim_D.png',
        },
        'Prism D'
      ),
    ],
  },
  {
    god: 'Cabrakan',
    parent: 'NerdRage014',
    variants: ['A', 'B', 'C', 'D'].map((letter) =>
      variantFromRow(
        {
          cardArt: `app/data/NewGodSkins/Cabrakan/Skins/Prisms/t_SkinCard_Cabrakan_Prisim_${letter}.png`,
          skin: `app/data/NewGodSkins/Cabrakan/Skins/Prisms/t_SkinCard_Cabrakan_Prisim_${letter}.png`,
          icon: `app/data/NewGodSkins/Cabrakan/Skins/Prisms/t_SkinPortrait_Cabrakan_Prisim_${letter}.png`,
        },
        `Prism ${letter}`
      )
    ),
  },
  {
    god: 'Susano',
    parent: 'StumbleBlade',
    variants: [
      variantFromRow(
        { skin: '/icons/Wallpapers/Susano_stumble_blade_with_prisms_.webp' },
        'Prism 1'
      ),
    ],
  },
  {
    god: 'God.Ganesha',
    parent: 'Plushie012',
    variants: [
      variantFromRow({ skin: '/icons/Wallpapers/Ganesha_plushie_green_.webp' }, 'Green'),
      variantFromRow({ skin: '/icons/Wallpapers/Ganesha_plushie_indigo_.webp' }, 'Indigo'),
      variantFromRow({ skin: '/icons/Wallpapers/Ganesha_plushie_orange_.webp' }, 'Orange'),
      variantFromRow({ skin: '/icons/Wallpapers/Ganesha_plushie_red_009.webp' }, 'Red'),
      variantFromRow({ skin: '/icons/Wallpapers/Ganesha_plushie_violet_010.webp' }, 'Violet'),
      variantFromRow({ skin: '/icons/Wallpapers/Ganesha_plushie_yellow_011.webp' }, 'Yellow'),
    ],
  },
  {
    god: 'DaJi',
    parent: 'Devil_Punk',
    variants: [
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism01.png',
          skin: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism01.png',
          icon: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinPortrait_Daji_DevilPunk_Prism01.png',
        },
        'Prism 1'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism02.png',
          skin: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism02.png',
          icon: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinPortrait_Daji_DevilPunk_Prism02.png',
        },
        'Prism 2'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism03.png',
          skin: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism03.png',
          icon: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinPortrait_Daji_DevilPunk_Prism03.png',
        },
        'Prism 3'
      ),
      variantFromRow(
        {
          cardArt: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism04.png',
          skin: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinCard_Daji_DevilPunk_Prism04.png',
          icon: 'app/data/NewGodSkins/DaJi/Skins/DevilPunk/t_SkinPortrait_Daji_DevilPunk_Prism04.png',
        },
        'Prism 4'
      ),
    ],
  },
];

const data = JSON.parse(fs.readFileSync(BUILDS, 'utf8'));
const allGods = data.gods.flat(Infinity);
const report = [];

for (const merge of MERGES) {
  const god = allGods.find((g) => (g.internalName || '').replace(/_Item$/, '') === merge.god);
  const skins = god?.baseInformation?.skins;
  if (!skins?.[merge.parent]) {
    report.push({ god: merge.god, parent: merge.parent, status: 'NOT_FOUND' });
    continue;
  }
  const before = (skins[merge.parent].variants || []).length;
  skins[merge.parent].variants = merge.variants;
  report.push({
    god: merge.god,
    parent: merge.parent,
    before,
    after: merge.variants.length,
    status: 'merged',
  });
}

console.log(JSON.stringify(report, null, 2));

if (WRITE) {
  fs.writeFileSync(BUILDS, JSON.stringify(data, null, 4) + '\n');
  console.log('Wrote', BUILDS);
} else {
  console.log('Dry run — pass --write to apply');
}
