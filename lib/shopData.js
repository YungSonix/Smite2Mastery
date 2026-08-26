/**
 * Shop data: rarities, challenges, and item pool.
 * All currency is Gold (earned via daily login + challenges). No real money.
 */

// Smite-themed rarities — achievable, not punishing
export const SHOP_RARITIES = {
  common: {
    key: 'common',
    label: 'Common',
    color: '#9ca3af',
    borderColor: '#64748b',
    bgGlow: 'rgba(148, 163, 184, 0.16)',
    weight: 40,
  },
  uncommon: {
    key: 'uncommon',
    label: 'Uncommon',
    color: '#4ade80',
    borderColor: '#16a34a',
    bgGlow: 'rgba(34, 197, 94, 0.18)',
    weight: 30,
  },
  rare: {
    key: 'rare',
    label: 'Rare',
    color: '#38bdf8',
    borderColor: '#0ea5e9',
    bgGlow: 'rgba(56, 189, 248, 0.20)',
    weight: 18,
  },
  epic: {
    key: 'epic',
    label: 'Epic',
    color: '#c084fc',
    borderColor: '#9333ea',
    bgGlow: 'rgba(192, 132, 252, 0.22)',
    weight: 9,
  },
  legendary: {
    key: 'legendary',
    label: 'Legendary',
    color: '#fbbf24',
    borderColor: '#d97706',
    bgGlow: 'rgba(251, 191, 36, 0.28)',
    weight: 3,
  },
};

export const CHALLENGES = [
  { id: 'daily_login', name: 'Daily Login', description: 'Log in to the app today', goldReward: 50, condition: 'daily_login', repeatable: true },
  { id: 'wordle_win', name: 'God Wordle Win', description: 'Win a game of God Wordle', goldReward: 75, condition: 'wordle_win', repeatable: true },
  { id: 'ability_win', name: 'Guess the Ability Win', description: 'Win a game of Guess the Ability', goldReward: 75, condition: 'ability_win', repeatable: true },
  { id: 'vgs_win', name: 'Learn the VGS Win', description: 'Get a VGS command right in Learn the VGS', goldReward: 75, condition: 'vgs_win', repeatable: true },
  { id: 'emoji_guess_win', name: 'Guess the Emoji Correct', description: 'Correctly guess a god from emoji clues', goldReward: 50, condition: 'emoji_guess_win', repeatable: true },
  { id: 'save_build', name: 'Save a Build', description: 'Save a build from Custom Builder', goldReward: 100, condition: 'save_build', repeatable: true },
  { id: 'first_build', name: 'First Build', description: 'Save your first build ever', goldReward: 150, condition: 'first_build', repeatable: false },
  { id: 'profile_theme', name: 'Customize Profile', description: 'Set a profile color or name effect', goldReward: 50, condition: 'profile_theme', repeatable: false },
  { id: 'share_profile', name: 'Share Profile', description: 'Share your profile link', goldReward: 25, condition: 'share_profile', repeatable: true },
];

// —— In-game titles (sourced from SMITE 2 title string table) ——
function titleSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function makeTitles(defs, groupPrefix) {
  return defs.map(([value, rarity, cost]) => ({
    id: `title_${groupPrefix}_${titleSlug(value)}`,
    type: 'title',
    value,
    name: `Title: ${value}`,
    description: 'Under your name',
    rarity,
    cost,
  }));
}

// Founders, events, seasons, and community titles from the game
const SPECIAL_TITLE_DEFS = [
  ['SMIITER', 'legendary', 600], ['GodChamp', 'legendary', 600], ['Mega Fan', 'epic', 360],
  ['Alpha', 'epic', 320], ['Rider of Rohan', 'epic', 340], ["Founder's ACE", 'legendary', 650],
  ['Minion Wrangler', 'uncommon', 120], ["It's Giving", 'uncommon', 110], ['SMITE 1 World Champion', 'legendary', 700],
  ["Founder's Champion", 'legendary', 650], ['Titan Forge', 'epic', 380], ['Beta', 'rare', 200],
  ['Demigod', 'epic', 360], ['Speedrunner', 'rare', 210], ['OP', 'uncommon', 120],
  ['Button Masher', 'uncommon', 110], ['Vanguard', 'rare', 220], ['Dusty', 'common', 70],
  ['Certified Clean', 'common', 80], ['Cottontail', 'rare', 190], ['Creepy Clown', 'rare', 190],
  ["Bee's Knees", 'uncommon', 120], ['Adventurer', 'uncommon', 120], ['Game Master', 'epic', 340],
  ['Deity Winter Season 0', 'epic', 360], ['Deity Spring Season 0', 'epic', 360],
  ['Deity Summer Season 0', 'epic', 360], ['Deity Fall Season 0', 'epic', 360], ['Venomous', 'rare', 210],
  ['Guandolf', 'epic', 330], ['Trophy Hunter', 'rare', 220], ['CHEF', 'uncommon', 130],
  ['Forged in Fire', 'epic', 350], ['Ultimate Lord', 'legendary', 520], ['Nerd', 'common', 80],
  ['Geek', 'common', 80], ['Silver Open Beta', 'uncommon', 120], ['Gold Open Beta', 'rare', 180],
  ['Platinum Open Beta', 'rare', 220], ['Diamond Open Beta', 'epic', 300], ['Obsidian Open Beta', 'epic', 360],
  ['Master Open Beta', 'epic', 420], ['Demigod Open Beta', 'legendary', 480], ['Deity Open Beta', 'legendary', 520],
  ['Rainbow Warrior', 'legendary', 500], ['SMITE Prime Champion', 'legendary', 600], ['Two-Heads', 'uncommon', 120],
  ['Three-Heads', 'uncommon', 130], ['Miss', 'common', 70], ['Survivor', 'uncommon', 120],
  ['Vampiress', 'rare', 200], ['Racer', 'uncommon', 130], ['Frostwarden', 'epic', 330],
  ['Sentai', 'rare', 210], ['Dark Lord', 'epic', 360], ['Darkest Knight', 'epic', 360],
  ['King', 'epic', 340], ['Noble', 'rare', 190], ['Dark', 'uncommon', 120], ['Soul Piercer', 'epic', 330],
  ['Queen', 'epic', 340], ['Festive', 'uncommon', 130], ['Ninja', 'rare', 200], ['Archfiend', 'epic', 350],
  ['Dragon Disciple', 'epic', 360], ['Bestfriend', 'uncommon', 120], ['Wicked King', 'epic', 350],
  ['The Magnificent', 'epic', 360], ['Corrupt Beast', 'epic', 340], ['Mastermind', 'epic', 340],
  ['Tracker Master', 'rare', 220], ['Empyrean', 'legendary', 500], ['Commander', 'epic', 360],
  ['Dusk Glimmer', 'epic', 330], ['Fire Lord', 'epic', 350], ['Spotted', 'common', 80],
];

// Pantheon reward titles (all rare)
const PANTHEON_TITLE_NAMES = [
  'Rule Maker', 'Mad Herald', 'Wildborn', 'Valhallan', 'Legionnaire', 'Grave Caller', 'Story Teller',
  'Knight Errant', 'Jade Guard', 'Oasis Seeker', 'Glory Seeker', 'Dharmic', 'Bushido Bound', 'Omen Reader',
  'Wildrunner', 'Wave Rider', 'Hex Shaper', 'Tide Caller',
];

// God mastery "Disciple of X" titles (all uncommon)
const DISCIPLE_GODS = [
  'Bacchus', 'Anhur', 'Anubis', 'Bellona', 'Cernunnos', 'Chaac', 'Loki', 'Odin', 'Ymir', 'Kukulkan',
  'Athena', 'Fenrir', 'Hades', 'Hecate', 'Neith', 'The Morrigan', 'Zeus', 'Thanatos', 'Ares', 'Achilles',
  'Agni', 'Ah Muzen Cab', 'Ah Puch', 'Amaterasu', 'Ao Kuang', 'Aphrodite', 'Apollo', 'Arachne', 'Artemis',
  'Aladdin', 'Artio', 'Atlas', 'Awilix', 'Baba Yaga', 'Bakasura', 'Bake Kujira', 'Baron Samedi', 'Bastet',
  'Cabrakan', 'Camazotz', 'Cerberus', "Chang'e", 'Charon', 'Charybdis', 'Chernobog', 'Chiron', 'Chronos',
  'Cliodhna', 'Cthulhu', 'Cu Chulainn', 'Cupid', 'Da Ji', 'Danzaburou', 'Discordia', 'Erlang Shen', 'Eset',
  'Fafnir', 'Freya', 'Ganesha', 'Geb', 'Gilgamesh', 'Guan Yu', 'Hachiman', 'He Bo', 'Heimdallr', 'Hel',
  'Hera', 'Hercules', 'Horus', 'Hou Yi', 'Hun Batz', 'Ishtar', 'Ix Chel', 'Izanami', 'Janus', 'Jing Wei',
  'Jormungandr', 'Kali', 'Khepri', 'King Arthur', 'Kumbhakarna', 'Kuzenbo', 'Lancelot', 'Maman Brigitte',
  'Martichoras', 'Maui', 'Medusa', 'Mercury', 'Merlin', 'Morgan Le Fay', 'Mulan', 'Ne Zha', 'Nemesis',
  'Nike', 'Nox', 'Nu Wa', 'Olorun', 'Osiris', 'Pele', 'Persephone', 'Poseidon', 'Ra', 'Raijin', 'Rama',
  'Ratatoskr', 'Ravana', 'Scylla', 'Serqet', 'Set', 'Shiva', 'Skadi', 'Sobek', 'Sol', 'Sun Wukong',
  'Surtr', 'Susano', 'Sylvanus', 'Terra', 'Thor', 'Thoth', 'Tiamat', 'Tsukuyomi', 'Tyr', 'Ullr', 'Vamana',
  'Vulcan', 'Xbalanque', 'Xing Tian', 'Yemoja', 'Yu Huang', 'Zhong Kui',
];

const SPECIAL_TITLES = makeTitles(SPECIAL_TITLE_DEFS, 'ingame');
const PANTHEON_TITLES = makeTitles(PANTHEON_TITLE_NAMES.map((n) => [n, 'rare', 240]), 'pantheon');
const DISCIPLE_TITLES = makeTitles(DISCIPLE_GODS.map((g) => [`Disciple of ${g}`, 'uncommon', 120]), 'disciple');

// —— Fonts: curated Google Fonts loaded at runtime (lib/appFonts.js) so BOTH web
// and native render the SAME typeface (no platform-specific fallbacks). `family`
// is the loaded fontFamily; `file` is the jsDelivr path under google/fonts.
export const CURATED_FONTS = [
  { key: 'bebas', family: 'BebasNeue', label: 'Bebas', file: 'ofl/bebasneue/BebasNeue-Regular.ttf', rarity: 'common', cost: 60, defaultUnlocked: true },
  { key: 'fjalla', family: 'FjallaOne', label: 'Fjalla', file: 'ofl/fjallaone/FjallaOne-Regular.ttf', rarity: 'common', cost: 70, defaultUnlocked: true },
  { key: 'anton', family: 'Anton', label: 'Anton', file: 'ofl/anton/Anton-Regular.ttf', rarity: 'uncommon', cost: 90 },
  { key: 'dmserif', family: 'DMSerifDisplay', label: 'DM Serif', file: 'ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf', rarity: 'uncommon', cost: 110, defaultUnlocked: true },
  { key: 'yeseva', family: 'YesevaOne', label: 'Yeseva', file: 'ofl/yesevaone/YesevaOne-Regular.ttf', rarity: 'uncommon', cost: 110 },
  { key: 'lobster', family: 'Lobster', label: 'Lobster', file: 'ofl/lobster/Lobster-Regular.ttf', rarity: 'uncommon', cost: 120 },
  { key: 'titanone', family: 'TitanOne', label: 'Titan (Rounded)', file: 'ofl/titanone/TitanOne-Regular.ttf', rarity: 'uncommon', cost: 120 },
  { key: 'vt323', family: 'VT323', label: 'Terminal', file: 'ofl/vt323/VT323-Regular.ttf', rarity: 'uncommon', cost: 120 },
  { key: 'indie', family: 'IndieFlower', label: 'Indie Flower', file: 'ofl/indieflower/IndieFlower-Regular.ttf', rarity: 'uncommon', cost: 120 },
  { key: 'bangers', family: 'Bangers', label: 'Bangers (Comic)', file: 'ofl/bangers/Bangers-Regular.ttf', rarity: 'uncommon', cost: 130 },
  { key: 'marker', family: 'PermanentMarker', label: 'Marker', file: 'apache/permanentmarker/PermanentMarker-Regular.ttf', rarity: 'uncommon', cost: 130 },
  { key: 'pacifico', family: 'Pacifico', label: 'Pacifico', file: 'ofl/pacifico/Pacifico-Regular.ttf', rarity: 'uncommon', cost: 130 },
  { key: 'abril', family: 'AbrilFatface', label: 'Abril Fatface', file: 'ofl/abrilfatface/AbrilFatface-Regular.ttf', rarity: 'rare', cost: 170 },
  { key: 'sacramento', family: 'Sacramento', label: 'Sacramento', file: 'ofl/sacramento/Sacramento-Regular.ttf', rarity: 'rare', cost: 175 },
  { key: 'kaushan', family: 'KaushanScript', label: 'Kaushan', file: 'ofl/kaushanscript/KaushanScript-Regular.ttf', rarity: 'rare', cost: 175 },
  { key: 'greatvibes', family: 'GreatVibes', label: 'Great Vibes', file: 'ofl/greatvibes/GreatVibes-Regular.ttf', rarity: 'rare', cost: 180 },
  { key: 'blackops', family: 'BlackOpsOne', label: 'Black Ops', file: 'ofl/blackopsone/BlackOpsOne-Regular.ttf', rarity: 'rare', cost: 190 },
  { key: 'audiowide', family: 'Audiowide', label: 'Audiowide', file: 'ofl/audiowide/Audiowide-Regular.ttf', rarity: 'rare', cost: 190 },
  { key: 'luckiest', family: 'LuckiestGuy', label: 'Luckiest Guy', file: 'apache/luckiestguy/LuckiestGuy-Regular.ttf', rarity: 'rare', cost: 190 },
  { key: 'bungee', family: 'Bungee', label: 'Bungee', file: 'ofl/bungee/Bungee-Regular.ttf', rarity: 'rare', cost: 200 },
  { key: 'rubikmono', family: 'RubikMonoOne', label: 'Rubik Mono', file: 'ofl/rubikmonoone/RubikMonoOne-Regular.ttf', rarity: 'rare', cost: 200 },
  { key: 'wallpoet', family: 'Wallpoet', label: 'Wallpoet', file: 'ofl/wallpoet/Wallpoet-Regular.ttf', rarity: 'rare', cost: 200 },
  { key: 'rye', family: 'Rye', label: 'Rye (Western)', file: 'ofl/rye/Rye-Regular.ttf', rarity: 'rare', cost: 200 },
  { key: 'cinzel', family: 'CinzelDecorative', label: 'Cinzel', file: 'ofl/cinzeldecorative/CinzelDecorative-Regular.ttf', rarity: 'epic', cost: 280 },
  { key: 'fasterone', family: 'FasterOne', label: 'Faster', file: 'ofl/fasterone/FasterOne-Regular.ttf', rarity: 'epic', cost: 290 },
  { key: 'pirata', family: 'PirataOne', label: 'Pirata (Gothic)', file: 'ofl/pirataone/PirataOne-Regular.ttf', rarity: 'epic', cost: 290 },
  { key: 'bungeeshade', family: 'BungeeShade', label: 'Bungee Shade', file: 'ofl/bungeeshade/BungeeShade-Regular.ttf', rarity: 'epic', cost: 300 },
  { key: 'pressstart', family: 'PressStart2P', label: 'Pixel', file: 'ofl/pressstart2p/PressStart2P-Regular.ttf', rarity: 'epic', cost: 300 },
  { key: 'creepster', family: 'Creepster', label: 'Creepster (Spooky)', file: 'ofl/creepster/Creepster-Regular.ttf', rarity: 'epic', cost: 300 },
  { key: 'monoton', family: 'Monoton', label: 'Monoton (Neon)', file: 'ofl/monoton/Monoton-Regular.ttf', rarity: 'epic', cost: 300 },
];

// key -> loaded fontFamily (identical on web + native)
export const FONT_FAMILY_BY_KEY = CURATED_FONTS.reduce((acc, f) => {
  acc[f.key] = f.family;
  return acc;
}, {});

const FONT_ITEMS_CATALOG = CURATED_FONTS.map((f) => ({
  id: `font_${f.key}`,
  type: 'font',
  value: f.key,
  name: f.label,
  description: 'Display-name font',
  rarity: f.rarity,
  cost: f.cost,
  ...(f.defaultUnlocked ? { defaultUnlocked: true } : {}),
}));

// —— Bundles: buy a themed pack, get every item inside (cheaper than separately).
// `itemIds` reference real item ids elsewhere in the pool. Buying the pack adds
// the pack id to shop_owned; contents are treated as owned via expandOwnedIds().
// `previewFx` is a name-effect value used to animate the pack card teaser.
export const SHOP_PACKS = [
  {
    id: 'pack_halloween', type: 'pack', name: 'Halloween Pack', description: '2 Name Effects · 1 Font · 1 Title',
    accent: '#f97316', rarity: 'epic', cost: 760, previewFx: 'halloween',
    itemIds: ['name_fx_halloween', 'name_fx_spooky_glow', 'font_creepster', 'title_ingame_creepy_clown'],
  },
  {
    id: 'pack_christmas', type: 'pack', name: 'Christmas Pack', description: '2 Name Effects · 1 Font · 1 Title',
    accent: '#dc2626', rarity: 'epic', cost: 540, previewFx: 'christmas',
    itemIds: ['name_fx_christmas', 'name_fx_candy_cane', 'font_lobster', 'title_ingame_festive'],
  },
  {
    id: 'pack_valentines', type: 'pack', name: 'Valentines Pack', description: '2 Name Effects · 1 Font · 1 Title',
    accent: '#fb7185', rarity: 'epic', cost: 640, previewFx: 'valentines',
    itemIds: ['name_fx_valentines', 'name_fx_heart_letters', 'font_greatvibes', 'title_ingame_bestfriend'],
  },
  {
    id: 'pack_summer', type: 'pack', name: 'Summer Pack', description: '2 Name Effects · 1 Font · 1 Title',
    accent: '#22d3ee', rarity: 'rare', cost: 500, previewFx: 'summer',
    itemIds: ['name_fx_summer', 'name_fx_beach_letters', 'font_pacifico', 'title_ingame_adventurer'],
  },
  {
    id: 'pack_winter', type: 'pack', name: 'Winter Pack', description: '2 Name Effects · 1 Font · 1 Title',
    accent: '#7dd3fc', rarity: 'epic', cost: 720, previewFx: 'winter',
    itemIds: ['name_fx_winter', 'name_fx_snow_letters', 'font_kaushan', 'title_ingame_frostwarden'],
  },
  {
    id: 'pack_neon', type: 'pack', name: 'Neon Arcade Pack', description: '2 Name Effects · 1 Font · 1 Title',
    accent: '#a855f7', rarity: 'legendary', cost: 900, previewFx: 'neon_blue',
    itemIds: ['name_fx_neon_blue', 'name_fx_rgb_split', 'font_pressstart', 'title_ingame_speedrunner'],
  },
  {
    id: 'pack_new_year', type: 'pack', name: 'Celebration Pack', description: '2 Name Effects · 1 Font · 1 Title',
    accent: '#fde047', rarity: 'legendary', cost: 1200, previewFx: 'fireworks',
    itemIds: ['name_fx_fireworks', 'name_fx_new_year', 'font_monoton', 'title_ingame_empyrean'],
  },
  {
    id: 'pack_mystery', type: 'pack', name: 'Mystery Vault', description: 'Contents revealed on unlock',
    accent: '#a855f7', rarity: 'legendary', cost: 899, previewFx: 'holographic', mystery: true,
    itemIds: ['name_fx_disco', 'name_fx_galaxy', 'name_fx_oil_slick', 'font_pressstart', 'title_ingame_empyrean'],
  },
];

// Expand owned ids so items granted by an owned pack count as owned everywhere.
export function expandOwnedIds(ownedIds) {
  const set = new Set(Array.isArray(ownedIds) ? ownedIds : []);
  for (const pack of SHOP_PACKS) {
    if (set.has(pack.id)) {
      for (const id of pack.itemIds) set.add(id);
    }
  }
  return Array.from(set);
}

// Full pool: name_fx value must exist in profile NAME_ANIMATION_OPTIONS. font value = key in FONT_FAMILY_BY_KEY.
export const SHOP_ITEM_POOL = [
  // —— Name FX
  { id: 'name_fx_flame', type: 'name_fx', value: 'flame', name: 'Flame', description: 'Flickering fire', rarity: 'uncommon', cost: 120 },
  { id: 'name_fx_inferno', type: 'name_fx', value: 'inferno', name: 'Inferno', description: 'Intense fire', rarity: 'rare', cost: 200 },
  { id: 'name_fx_ember', type: 'name_fx', value: 'ember', name: 'Ember', description: 'Warm ember glow', rarity: 'common', cost: 80, defaultUnlocked: true },
  { id: 'name_fx_void', type: 'name_fx', value: 'void', name: 'Void', description: 'Dark purple shift', rarity: 'rare', cost: 200 },
  { id: 'name_fx_arcane', type: 'name_fx', value: 'arcane', name: 'Arcane', description: 'Magical pulse', rarity: 'uncommon', cost: 140 },
  { id: 'name_fx_divine', type: 'name_fx', value: 'divine', name: 'Celestial Wrath', description: 'Divine gold', rarity: 'epic', cost: 350 },
  { id: 'name_fx_storm', type: 'name_fx', value: 'storm', name: 'Stormforged Arc', description: 'Storm lightning', rarity: 'epic', cost: 350 },
  { id: 'name_fx_pantheon_greek', type: 'name_fx', value: 'pantheon_greek', name: 'Pantheon: Greek', description: 'Greek theme', rarity: 'rare', cost: 220 },
  { id: 'name_fx_pantheon_norse', type: 'name_fx', value: 'pantheon_norse', name: 'Pantheon: Norse', description: 'Norse theme', rarity: 'rare', cost: 220 },
  { id: 'name_fx_pantheon_egyptian', type: 'name_fx', value: 'pantheon_egyptian', name: 'Pantheon: Egyptian', description: 'Egyptian theme', rarity: 'rare', cost: 220 },
  { id: 'name_fx_gradient', type: 'name_fx', value: 'gradient', name: 'Olympian Flux', description: 'Flowing gradient', rarity: 'common', cost: 90, defaultUnlocked: true },
  { id: 'name_fx_pulse', type: 'name_fx', value: 'pulse', name: 'Godspark Pulse', description: 'Soft pulse', rarity: 'common', cost: 70, defaultUnlocked: true },
  { id: 'name_fx_shimmer', type: 'name_fx', value: 'shimmer', name: 'Aegis Glint', description: 'Shimmer', rarity: 'uncommon', cost: 110, defaultUnlocked: true },
  { id: 'name_fx_neon', type: 'name_fx', value: 'neon', name: 'Neon', description: 'Glowing neon', rarity: 'rare', cost: 220 },
  { id: 'name_fx_comic', type: 'name_fx', value: 'comic', name: 'Comic', description: 'Pop-art style', rarity: 'uncommon', cost: 130 },
  { id: 'name_fx_metallic', type: 'name_fx', value: 'metallic', name: 'Metallic', description: 'Chrome sheen', rarity: 'epic', cost: 340 },
  { id: 'name_fx_ice', type: 'name_fx', value: 'ice', name: 'Ice', description: 'Frosted crystal', rarity: 'rare', cost: 210 },
  { id: 'name_fx_glow', type: 'name_fx', value: 'glow', name: 'Dark Magic', description: 'Purple mystic glow', rarity: 'rare', cost: 200 },
  { id: 'name_fx_lava', type: 'name_fx', value: 'lava', name: 'Lava', description: 'Molten flow', rarity: 'epic', cost: 330 },
  { id: 'name_fx_shadow_dance', type: 'name_fx', value: 'shadow_dance', name: 'Dancing Shadow', description: 'Moving shadow', rarity: 'uncommon', cost: 100 },
  { id: 'name_fx_glow_breath', type: 'name_fx', value: 'glow_breath', name: 'Breathing Glow', description: 'Pulsing glow', rarity: 'rare', cost: 190 },
  { id: 'name_fx_outline_pulse', type: 'name_fx', value: 'outline_pulse', name: 'Outline Pulse', description: 'Pulsing outline', rarity: 'uncommon', cost: 115 },
  { id: 'name_fx_frost', type: 'name_fx', value: 'frost', name: 'Frost', description: 'Frosted glass', rarity: 'rare', cost: 185 },
  // —— Name FX (CSS-inspired flowing color, see FX_FLOW_CONFIG in profile.jsx)
  { id: 'name_fx_rainbow', type: 'name_fx', value: 'rainbow', name: 'Rainbow Warrior', description: 'Full rainbow flow', rarity: 'legendary', cost: 480 },
  { id: 'name_fx_spectrum', type: 'name_fx', value: 'spectrum', name: 'Spectrum', description: 'Fast rainbow', rarity: 'legendary', cost: 500 },
  { id: 'name_fx_disco', type: 'name_fx', value: 'disco', name: 'Disco', description: 'Party colors', rarity: 'legendary', cost: 490 },
  { id: 'name_fx_holographic', type: 'name_fx', value: 'holographic', name: 'Holographic', description: 'Iridescent shift', rarity: 'legendary', cost: 500 },
  { id: 'name_fx_aurora', type: 'name_fx', value: 'aurora', name: 'Aurora', description: 'Northern lights', rarity: 'epic', cost: 340 },
  { id: 'name_fx_galaxy', type: 'name_fx', value: 'galaxy', name: 'Galaxy', description: 'Deep space drift', rarity: 'epic', cost: 360 },
  { id: 'name_fx_nebula', type: 'name_fx', value: 'nebula', name: 'Nebula', description: 'Cosmic clouds', rarity: 'epic', cost: 350 },
  { id: 'name_fx_abyss', type: 'name_fx', value: 'abyss', name: 'Abyss', description: 'Deep ocean blue', rarity: 'epic', cost: 320 },
  { id: 'name_fx_synthwave', type: 'name_fx', value: 'synthwave', name: 'Synthwave', description: '80s neon flow', rarity: 'epic', cost: 345 },
  { id: 'name_fx_vaporwave', type: 'name_fx', value: 'vaporwave', name: 'Vaporwave', description: 'Retro pastel neon', rarity: 'epic', cost: 345 },
  { id: 'name_fx_oil_slick', type: 'name_fx', value: 'oil_slick', name: 'Oil Slick', description: 'Dark iridescence', rarity: 'epic', cost: 355 },
  { id: 'name_fx_plasma', type: 'name_fx', value: 'plasma', name: 'Plasma', description: 'Energy flow', rarity: 'epic', cost: 330 },
  { id: 'name_fx_peacock', type: 'name_fx', value: 'peacock', name: 'Peacock', description: 'Jewel tones', rarity: 'epic', cost: 320 },
  { id: 'name_fx_magma', type: 'name_fx', value: 'magma', name: 'Magma', description: 'Molten core', rarity: 'epic', cost: 330 },
  { id: 'name_fx_gold_shine', type: 'name_fx', value: 'gold_shine', name: 'Gold Shine', description: 'Sweeping gold', rarity: 'epic', cost: 350 },
  { id: 'name_fx_ultraviolet', type: 'name_fx', value: 'ultraviolet', name: 'Ultraviolet', description: 'Purple glow', rarity: 'epic', cost: 320 },
  { id: 'name_fx_matrix', type: 'name_fx', value: 'matrix', name: 'Matrix', description: 'Digital rain green', rarity: 'epic', cost: 330 },
  { id: 'name_fx_radioactive', type: 'name_fx', value: 'radioactive', name: 'Radioactive', description: 'Hazard pulse', rarity: 'epic', cost: 325 },
  { id: 'name_fx_frostbite', type: 'name_fx', value: 'frostbite', name: 'Frostbite', description: 'Icy glow pulse', rarity: 'epic', cost: 305 },
  { id: 'name_fx_sunset', type: 'name_fx', value: 'sunset', name: 'Sunset', description: 'Dusk gradient', rarity: 'rare', cost: 220 },
  { id: 'name_fx_sunrise', type: 'name_fx', value: 'sunrise', name: 'Sunrise', description: 'Dawn gradient', rarity: 'rare', cost: 220 },
  { id: 'name_fx_cotton_candy', type: 'name_fx', value: 'cotton_candy', name: 'Cotton Candy', description: 'Soft pastels', rarity: 'rare', cost: 210 },
  { id: 'name_fx_royal', type: 'name_fx', value: 'royal', name: 'Royal', description: 'Purple & gold', rarity: 'rare', cost: 240 },
  { id: 'name_fx_electric', type: 'name_fx', value: 'electric', name: 'Electric', description: 'Arc flicker', rarity: 'rare', cost: 230 },
  { id: 'name_fx_laser', type: 'name_fx', value: 'laser', name: 'Laser', description: 'Red flicker', rarity: 'rare', cost: 230 },
  { id: 'name_fx_toxic_glow', type: 'name_fx', value: 'toxic_glow', name: 'Toxic', description: 'Radioactive glow', rarity: 'rare', cost: 240 },
  { id: 'name_fx_venom', type: 'name_fx', value: 'venom', name: 'Venom', description: 'Poison green', rarity: 'rare', cost: 220 },
  { id: 'name_fx_mint', type: 'name_fx', value: 'mint', name: 'Mint', description: 'Fresh green gleam', rarity: 'rare', cost: 210 },
  { id: 'name_fx_emerald', type: 'name_fx', value: 'emerald', name: 'Emerald', description: 'Gemstone gleam', rarity: 'rare', cost: 215 },
  { id: 'name_fx_blossom', type: 'name_fx', value: 'blossom', name: 'Blossom', description: 'Rose gleam', rarity: 'rare', cost: 215 },
  { id: 'name_fx_ruby', type: 'name_fx', value: 'ruby', name: 'Ruby', description: 'Gemstone gleam', rarity: 'rare', cost: 215 },
  { id: 'name_fx_sapphire', type: 'name_fx', value: 'sapphire', name: 'Sapphire', description: 'Gemstone gleam', rarity: 'rare', cost: 215 },
  { id: 'name_fx_blood', type: 'name_fx', value: 'blood', name: 'Blood Oath', description: 'Crimson flow', rarity: 'rare', cost: 240 },
  { id: 'name_fx_obsidian', type: 'name_fx', value: 'obsidian', name: 'Obsidian', description: 'Dark stone sheen', rarity: 'rare', cost: 250 },
  { id: 'name_fx_firefly', type: 'name_fx', value: 'firefly', name: 'Firefly', description: 'Warm drifting glow', rarity: 'rare', cost: 200 },
  { id: 'name_fx_sparkle', type: 'name_fx', value: 'sparkle', name: 'Sparkle', description: 'Twinkling shine', rarity: 'rare', cost: 210 },
  { id: 'name_fx_glitch', type: 'name_fx', value: 'glitch', name: 'Glitch', description: 'RGB split jitter', rarity: 'rare', cost: 235 },
  { id: 'name_fx_ghost', type: 'name_fx', value: 'ghost', name: 'Ghost', description: 'Fading phantom', rarity: 'rare', cost: 195 },
  // —— Name FX (motion, see FX_MOTION_CONFIG in profile.jsx)
  { id: 'name_fx_wave', type: 'name_fx', value: 'wave', name: 'Wave', description: 'Bobbing motion', rarity: 'uncommon', cost: 130, defaultUnlocked: true },
  { id: 'name_fx_bounce', type: 'name_fx', value: 'bounce', name: 'Bounce', description: 'Bouncing hop', rarity: 'uncommon', cost: 135 },
  { id: 'name_fx_zoom', type: 'name_fx', value: 'zoom', name: 'Zoom', description: 'Scale pulse', rarity: 'uncommon', cost: 130 },
  { id: 'name_fx_swing', type: 'name_fx', value: 'swing', name: 'Swing', description: 'Rocking tilt', rarity: 'uncommon', cost: 130 },
  { id: 'name_fx_jitter', type: 'name_fx', value: 'jitter', name: 'Jitter', description: 'Shaky nerves', rarity: 'uncommon', cost: 125 },
  { id: 'name_fx_heartbeat', type: 'name_fx', value: 'heartbeat', name: 'Heartbeat', description: 'Double-beat pulse', rarity: 'uncommon', cost: 140 },
  { id: 'name_fx_flash', type: 'name_fx', value: 'flash', name: 'Flash', description: 'Blinking glow', rarity: 'uncommon', cost: 120 },
  // —— Name FX (per-letter: multi-color gradients, per-letter colors, letter waves)
  { id: 'name_fx_rainbow_letters', type: 'name_fx', value: 'rainbow_letters', name: 'Rainbow Letters', description: 'Rainbow across letters', rarity: 'legendary', cost: 520 },
  { id: 'name_fx_wave_rainbow', type: 'name_fx', value: 'wave_rainbow', name: 'Rainbow Wave', description: 'Rainbow + wave', rarity: 'legendary', cost: 540 },
  { id: 'name_fx_confetti_letters', type: 'name_fx', value: 'confetti_letters', name: 'Confetti Letters', description: 'Each letter a color', rarity: 'epic', cost: 360, defaultUnlocked: true },
  { id: 'name_fx_fire_letters', type: 'name_fx', value: 'fire_letters', name: 'Fire Letters', description: 'Fire gradient letters', rarity: 'epic', cost: 340 },
  { id: 'name_fx_ocean_letters', type: 'name_fx', value: 'ocean_letters', name: 'Ocean Letters', description: 'Ocean gradient letters', rarity: 'epic', cost: 330 },
  { id: 'name_fx_sunset_letters', type: 'name_fx', value: 'sunset_letters', name: 'Sunset Letters', description: 'Sunset gradient letters', rarity: 'epic', cost: 330 },
  { id: 'name_fx_candy_letters', type: 'name_fx', value: 'candy_letters', name: 'Candy Letters', description: 'Candy gradient letters', rarity: 'epic', cost: 330 },
  { id: 'name_fx_toxic_letters', type: 'name_fx', value: 'toxic_letters', name: 'Toxic Letters', description: 'Toxic gradient letters', rarity: 'epic', cost: 320 },
  { id: 'name_fx_gold_letters', type: 'name_fx', value: 'gold_letters', name: 'Gold Letters', description: 'Gold gradient letters', rarity: 'epic', cost: 360 },
  { id: 'name_fx_ice_letters', type: 'name_fx', value: 'ice_letters', name: 'Ice Letters', description: 'Ice gradient letters', rarity: 'epic', cost: 320 },
  { id: 'name_fx_wave_letters', type: 'name_fx', value: 'wave_letters', name: 'Wave Letters', description: 'Letters ride a wave', rarity: 'rare', cost: 240 },
  { id: 'name_fx_bounce_letters', type: 'name_fx', value: 'bounce_letters', name: 'Bounce Letters', description: 'Letters bounce in turn', rarity: 'rare', cost: 240 },
  { id: 'name_fx_emerald_letters', type: 'name_fx', value: 'emerald_letters', name: 'Emerald Letters', description: 'Emerald gradient letters', rarity: 'epic', cost: 320 },
  { id: 'name_fx_violet_letters', type: 'name_fx', value: 'violet_letters', name: 'Violet Letters', description: 'Violet gradient letters', rarity: 'epic', cost: 320 },
  { id: 'name_fx_blood_letters', type: 'name_fx', value: 'blood_letters', name: 'Blood Letters', description: 'Crimson gradient letters', rarity: 'epic', cost: 320 },
  { id: 'name_fx_neon_letters', type: 'name_fx', value: 'neon_letters', name: 'Neon Letters', description: 'Neon gradient letters', rarity: 'epic', cost: 340 },
  // —— Name FX (dual gradient — two shades in one name)
  { id: 'name_fx_fire_ice_letters', type: 'name_fx', value: 'fire_ice_letters', name: 'Fire & Ice', description: 'Two gradient shades', rarity: 'legendary', cost: 520 },
  { id: 'name_fx_toxic_void_letters', type: 'name_fx', value: 'toxic_void_letters', name: 'Toxic & Void', description: 'Two gradient shades', rarity: 'legendary', cost: 520 },
  { id: 'name_fx_gold_pink_letters', type: 'name_fx', value: 'gold_pink_letters', name: 'Gold & Rose', description: 'Two gradient shades', rarity: 'legendary', cost: 520 },
  { id: 'name_fx_ocean_sunset_letters', type: 'name_fx', value: 'ocean_sunset_letters', name: 'Ocean & Sunset', description: 'Two gradient shades', rarity: 'legendary', cost: 520 },
  { id: 'name_fx_cyber_letters', type: 'name_fx', value: 'cyber_letters', name: 'Cyber Split', description: 'Two gradient shades', rarity: 'legendary', cost: 520 },
  { id: 'name_fx_frost_fire_wave', type: 'name_fx', value: 'frost_fire_wave', name: 'Frost & Fire Wave', description: 'Two shades + wave', rarity: 'legendary', cost: 560 },
  // —— Name FX (layered text-shadow — neon / 3D / outline)
  { id: 'name_fx_neon_blue', type: 'name_fx', value: 'neon_blue', name: 'Neon Blue', description: 'Flickering neon tube', rarity: 'epic', cost: 340 },
  { id: 'name_fx_neon_pink', type: 'name_fx', value: 'neon_pink', name: 'Neon Pink', description: 'Flickering neon tube', rarity: 'epic', cost: 340 },
  { id: 'name_fx_neon_green', type: 'name_fx', value: 'neon_green', name: 'Neon Green', description: 'Flickering neon tube', rarity: 'epic', cost: 340 },
  { id: 'name_fx_neon_orange', type: 'name_fx', value: 'neon_orange', name: 'Neon Orange', description: 'Flickering neon tube', rarity: 'epic', cost: 340 },
  { id: 'name_fx_fire_glow', type: 'name_fx', value: 'fire_glow', name: 'Fire Glow', description: 'Rising flame halo', rarity: 'epic', cost: 360 },
  { id: 'name_fx_retro_vintage', type: 'name_fx', value: 'retro_vintage', name: 'Retro Vintage', description: 'Offset drop shadow', rarity: 'rare', cost: 220 },
  { id: 'name_fx_board_game', type: 'name_fx', value: 'board_game', name: 'Board Game', description: 'Crisp color stack', rarity: 'rare', cost: 240 },
  { id: 'name_fx_anaglyph_3d', type: 'name_fx', value: 'anaglyph_3d', name: 'Anaglyph 3D', description: 'Cyan / magenta split', rarity: 'epic', cost: 340 },
  { id: 'name_fx_extrude_3d', type: 'name_fx', value: 'extrude_3d', name: 'Extrude 3D', description: 'Stacked depth', rarity: 'epic', cost: 350 },
  { id: 'name_fx_extrude_gold', type: 'name_fx', value: 'extrude_gold', name: 'Gold Extrude', description: 'Stacked gold depth', rarity: 'epic', cost: 360 },
  { id: 'name_fx_long_shadow', type: 'name_fx', value: 'long_shadow', name: 'Long Shadow', description: 'Flat diagonal shadow', rarity: 'rare', cost: 230 },
  { id: 'name_fx_outline_cyan', type: 'name_fx', value: 'outline_cyan', name: 'Cyan Outline', description: 'Stroked letters', rarity: 'rare', cost: 240 },
  { id: 'name_fx_outline_gold', type: 'name_fx', value: 'outline_gold', name: 'Gold Outline', description: 'Stroked letters', rarity: 'rare', cost: 240 },
  { id: 'name_fx_letterpress', type: 'name_fx', value: 'letterpress', name: 'Letterpress', description: 'Pressed-in inset', rarity: 'uncommon', cost: 150, defaultUnlocked: true },
  { id: 'name_fx_rgb_split', type: 'name_fx', value: 'rgb_split', name: 'RGB Split', description: 'Glitchy channel split', rarity: 'legendary', cost: 500 },
  // —— Name FX (themed: holidays & seasons)
  { id: 'name_fx_halloween', type: 'name_fx', value: 'halloween', name: 'Halloween', description: 'Spooky orange & purple', rarity: 'epic', cost: 320 },
  { id: 'name_fx_halloween_letters', type: 'name_fx', value: 'halloween_letters', name: 'Halloween Split', description: 'Orange & purple letters', rarity: 'epic', cost: 320 },
  { id: 'name_fx_pumpkin_letters', type: 'name_fx', value: 'pumpkin_letters', name: 'Pumpkin', description: 'Glowing pumpkin flow', rarity: 'rare', cost: 240 },
  { id: 'name_fx_spooky_glow', type: 'name_fx', value: 'spooky_glow', name: 'Spooky Glow', description: 'Flickering haunt aura', rarity: 'epic', cost: 340 },
  { id: 'name_fx_christmas', type: 'name_fx', value: 'christmas', name: 'Christmas', description: 'Red & green flow', rarity: 'epic', cost: 320 },
  { id: 'name_fx_mistletoe_letters', type: 'name_fx', value: 'mistletoe_letters', name: 'Mistletoe', description: 'Green & red letters', rarity: 'rare', cost: 240 },
  { id: 'name_fx_candy_cane', type: 'name_fx', value: 'candy_cane', name: 'Candy Cane', description: 'Red & white stripes', rarity: 'rare', cost: 220 },
  { id: 'name_fx_snow_letters', type: 'name_fx', value: 'snow_letters', name: 'Snowfall', description: 'Drifting snow letters', rarity: 'epic', cost: 330 },
  { id: 'name_fx_festive_glow', type: 'name_fx', value: 'festive_glow', name: 'Festive Glow', description: 'Red & green aura', rarity: 'epic', cost: 340 },
  { id: 'name_fx_valentines', type: 'name_fx', value: 'valentines', name: 'Valentines', description: 'Rosy pink flow', rarity: 'epic', cost: 320 },
  { id: 'name_fx_heart_letters', type: 'name_fx', value: 'heart_letters', name: 'Sweetheart', description: 'Bouncing heart letters', rarity: 'epic', cost: 330 },
  { id: 'name_fx_love_glow', type: 'name_fx', value: 'love_glow', name: 'Love Glow', description: 'Warm pink aura', rarity: 'rare', cost: 240 },
  { id: 'name_fx_winter', type: 'name_fx', value: 'winter', name: 'Winter', description: 'Icy blue shimmer', rarity: 'rare', cost: 230 },
  { id: 'name_fx_frost_glow', type: 'name_fx', value: 'frost_glow', name: 'Frost Glow', description: 'Frozen aura', rarity: 'rare', cost: 240 },
  { id: 'name_fx_summer', type: 'name_fx', value: 'summer', name: 'Summer', description: 'Sun & sea flow', rarity: 'rare', cost: 230 },
  { id: 'name_fx_beach_letters', type: 'name_fx', value: 'beach_letters', name: 'Beach', description: 'Ocean & sand letters', rarity: 'rare', cost: 240 },
  { id: 'name_fx_spring', type: 'name_fx', value: 'spring', name: 'Spring', description: 'Pastel bloom flow', rarity: 'rare', cost: 230 },
  { id: 'name_fx_autumn', type: 'name_fx', value: 'autumn', name: 'Autumn', description: 'Warm fall flow', rarity: 'rare', cost: 230 },
  { id: 'name_fx_autumn_letters', type: 'name_fx', value: 'autumn_letters', name: 'Autumn Leaves', description: 'Falling-leaf letters', rarity: 'epic', cost: 320 },
  { id: 'name_fx_thanksgiving', type: 'name_fx', value: 'thanksgiving', name: 'Thanksgiving', description: 'Harvest tones', rarity: 'rare', cost: 230 },
  { id: 'name_fx_st_patrick', type: 'name_fx', value: 'st_patrick', name: 'Lucky', description: 'Shamrock green', rarity: 'rare', cost: 230 },
  { id: 'name_fx_easter', type: 'name_fx', value: 'easter', name: 'Easter', description: 'Pastel egg flow', rarity: 'rare', cost: 230 },
  { id: 'name_fx_new_year', type: 'name_fx', value: 'new_year', name: 'New Year', description: 'Celebration sparkle', rarity: 'legendary', cost: 500 },
  { id: 'name_fx_fireworks', type: 'name_fx', value: 'fireworks', name: 'Fireworks', description: 'Bursting color flashes', rarity: 'legendary', cost: 520 },
  { id: 'name_fx_lunar_new_year', type: 'name_fx', value: 'lunar_new_year', name: 'Lunar New Year', description: 'Red & gold fortune', rarity: 'epic', cost: 340 },
  { id: 'name_fx_fourth_july', type: 'name_fx', value: 'fourth_july', name: 'Independence', description: 'Red, white & blue', rarity: 'rare', cost: 240 },
  { id: 'name_fx_diwali', type: 'name_fx', value: 'diwali', name: 'Diwali', description: 'Festival of lights', rarity: 'epic', cost: 340 },
  { id: 'name_fx_birthday', type: 'name_fx', value: 'birthday', name: 'Birthday', description: 'Party confetti glow', rarity: 'epic', cost: 320 },
  { id: 'name_fx_eclipse', type: 'name_fx', value: 'eclipse', name: 'Eclipse', description: 'Solar corona ring', rarity: 'epic', cost: 350 },
  // —— Expansion: extra flowing-color variety
  { id: 'name_fx_twilight', type: 'name_fx', value: 'twilight', name: 'Twilight', description: 'Dusk purple flow', rarity: 'rare', cost: 220 },
  { id: 'name_fx_lagoon', type: 'name_fx', value: 'lagoon', name: 'Lagoon', description: 'Tropical teal', rarity: 'rare', cost: 210 },
  { id: 'name_fx_flamingo', type: 'name_fx', value: 'flamingo', name: 'Flamingo', description: 'Soft pink gleam', rarity: 'rare', cost: 210 },
  { id: 'name_fx_glacier', type: 'name_fx', value: 'glacier', name: 'Glacier', description: 'Icy blue shimmer', rarity: 'rare', cost: 215 },
  { id: 'name_fx_solar_flare', type: 'name_fx', value: 'solar_flare', name: 'Solar Flare', description: 'Sun-hot burst', rarity: 'epic', cost: 330 },
  { id: 'name_fx_cosmic', type: 'name_fx', value: 'cosmic', name: 'Cosmic', description: 'Deep space drift', rarity: 'epic', cost: 350 },
  { id: 'name_fx_jade', type: 'name_fx', value: 'jade', name: 'Jade', description: 'Green gemstone gleam', rarity: 'rare', cost: 215 },
  { id: 'name_fx_amethyst', type: 'name_fx', value: 'amethyst', name: 'Amethyst', description: 'Purple gemstone gleam', rarity: 'rare', cost: 215 },
  { id: 'name_fx_citrine', type: 'name_fx', value: 'citrine', name: 'Citrine', description: 'Golden gemstone gleam', rarity: 'rare', cost: 215 },
  { id: 'name_fx_crimson_tide', type: 'name_fx', value: 'crimson_tide', name: 'Crimson Tide', description: 'Rolling deep red', rarity: 'rare', cost: 225 },
  { id: 'name_fx_bubblegum', type: 'name_fx', value: 'bubblegum', name: 'Bubblegum', description: 'Pink & blue pop', rarity: 'rare', cost: 210 },
  { id: 'name_fx_unicorn', type: 'name_fx', value: 'unicorn', name: 'Unicorn', description: 'Dreamy pastel flow', rarity: 'epic', cost: 320 },
  { id: 'name_fx_midnight', type: 'name_fx', value: 'midnight', name: 'Midnight', description: 'Muted slate drift', rarity: 'uncommon', cost: 140 },
  { id: 'name_fx_rose_gold', type: 'name_fx', value: 'rose_gold', name: 'Rose Gold', description: 'Blush metallic sheen', rarity: 'epic', cost: 330 },
  { id: 'name_fx_steelforge', type: 'name_fx', value: 'steelforge', name: 'Steelforge', description: 'Brushed metal sweep', rarity: 'rare', cost: 225 },
  { id: 'name_fx_lightning', type: 'name_fx', value: 'lightning', name: 'Lightning', description: 'Storm-flash strike', rarity: 'epic', cost: 335 },
  { id: 'name_fx_deep_sea', type: 'name_fx', value: 'deep_sea', name: 'Deep Sea', description: 'Abyssal teal drift', rarity: 'rare', cost: 215 },
  { id: 'name_fx_coral_reef', type: 'name_fx', value: 'coral_reef', name: 'Coral Reef', description: 'Reef color blend', rarity: 'rare', cost: 220 },
  { id: 'name_fx_molten_gold', type: 'name_fx', value: 'molten_gold', name: 'Molten Gold', description: 'Liquid gold sweep', rarity: 'epic', cost: 350 },
  { id: 'name_fx_poison_ivy', type: 'name_fx', value: 'poison_ivy', name: 'Poison Ivy', description: 'Creeping toxic green', rarity: 'rare', cost: 220 },
  // —— Expansion: extra per-letter variety
  { id: 'name_fx_galaxy_letters', type: 'name_fx', value: 'galaxy_letters', name: 'Galaxy Letters', description: 'Space gradient letters', rarity: 'epic', cost: 340 },
  { id: 'name_fx_pastel_letters', type: 'name_fx', value: 'pastel_letters', name: 'Pastel Pop', description: 'Each letter a pastel', rarity: 'epic', cost: 320 },
  { id: 'name_fx_pride_letters', type: 'name_fx', value: 'pride_letters', name: 'Pride', description: 'Rainbow flag letters', rarity: 'epic', cost: 340 },
  { id: 'name_fx_mono_letters', type: 'name_fx', value: 'mono_letters', name: 'Monochrome', description: 'Alternating grays', rarity: 'uncommon', cost: 150 },
  { id: 'name_fx_sunrise_letters', type: 'name_fx', value: 'sunrise_letters', name: 'Sunrise Letters', description: 'Dawn gradient letters', rarity: 'epic', cost: 330 },
  { id: 'name_fx_aurora_letters', type: 'name_fx', value: 'aurora_letters', name: 'Aurora Letters', description: 'Northern-lights letters', rarity: 'epic', cost: 350 },
  { id: 'name_fx_lava_letters', type: 'name_fx', value: 'lava_letters', name: 'Lava Letters', description: 'Molten gradient letters', rarity: 'epic', cost: 340 },
  // —— Expansion: extra neon / 3D / stroke variety
  { id: 'name_fx_neon_purple', type: 'name_fx', value: 'neon_purple', name: 'Neon Purple', description: 'Glowing purple tube', rarity: 'rare', cost: 230 },
  { id: 'name_fx_neon_red', type: 'name_fx', value: 'neon_red', name: 'Neon Red', description: 'Glowing red tube', rarity: 'rare', cost: 230 },
  { id: 'name_fx_gold_glow', type: 'name_fx', value: 'gold_glow', name: 'Gold Glow', description: 'Warm golden halo', rarity: 'rare', cost: 235 },
  { id: 'name_fx_chrome_3d', type: 'name_fx', value: 'chrome_3d', name: 'Chrome 3D', description: 'Stepped metal depth', rarity: 'epic', cost: 320 },
  { id: 'name_fx_comic_pop', type: 'name_fx', value: 'comic_pop', name: 'Comic Pop', description: 'Bold outline + drop', rarity: 'epic', cost: 320 },
  { id: 'name_fx_toon_outline', type: 'name_fx', value: 'toon_outline', name: 'Toon', description: 'Thick cartoon outline', rarity: 'rare', cost: 235 },
  { id: 'name_fx_emboss', type: 'name_fx', value: 'emboss', name: 'Emboss', description: 'Raised pressed look', rarity: 'uncommon', cost: 150 },
  // —— Fonts (curated cross-platform Google Fonts; see CURATED_FONTS)
  ...FONT_ITEMS_CATALOG,
  // —— Titles
  { id: 'title_ascended', type: 'title', value: 'Ascended', name: 'Title: Ascended', description: 'Under your name', rarity: 'common', cost: 60, defaultUnlocked: true },
  { id: 'title_conqueror', type: 'title', value: 'Conqueror', name: 'Title: Conqueror', description: 'Under your name', rarity: 'uncommon', cost: 100 },
  { id: 'title_legend', type: 'title', value: 'Legend', name: 'Title: Legend', description: 'Under your name', rarity: 'rare', cost: 180 },
  { id: 'title_olympian', type: 'title', value: 'Olympian', name: 'Title: Olympian', description: 'Under your name', rarity: 'epic', cost: 320 },
  { id: 'title_divine', type: 'title', value: 'Divine', name: 'Title: Divine', description: 'Under your name', rarity: 'legendary', cost: 500 },
  { id: 'title_master_builder', type: 'title', value: 'Master Builder', name: 'Title: Master Builder', description: 'Under your name', rarity: 'rare', cost: 200 },
  { id: 'title_patch_reader', type: 'title', value: 'Patch Reader', name: 'Title: Patch Reader', description: 'Under your name', rarity: 'common', cost: 50, defaultUnlocked: true },
  { id: 'title_warden', type: 'title', value: 'Warden', name: 'Title: Warden', description: 'Under your name', rarity: 'uncommon', cost: 95 },
  { id: 'title_titan', type: 'title', value: 'Titan', name: 'Title: Titan', description: 'Under your name', rarity: 'epic', cost: 340 },
  { id: 'title_oracle', type: 'title', value: 'Oracle', name: 'Title: Oracle', description: 'Under your name', rarity: 'rare', cost: 210 },
  { id: 'title_phoenix', type: 'title', value: 'Phoenix', name: 'Title: Phoenix', description: 'Under your name', rarity: 'legendary', cost: 520 },
  { id: 'title_dragon_slayer', type: 'title', value: 'Dragon Slayer', name: 'Title: Dragon Slayer', description: 'Under your name', rarity: 'epic', cost: 360 },
  { id: 'title_godspark', type: 'title', value: 'Godspark', name: 'Title: Godspark', description: 'Under your name', rarity: 'rare', cost: 195 },
  { id: 'title_mythic', type: 'title', value: 'Mythic', name: 'Title: Mythic', description: 'Under your name', rarity: 'epic', cost: 330 },
  { id: 'title_arcane', type: 'title', value: 'Arcane', name: 'Title: Arcane', description: 'Under your name', rarity: 'uncommon', cost: 110 },
  { id: 'title_void_walker', type: 'title', value: 'Void Walker', name: 'Title: Void Walker', description: 'Under your name', rarity: 'rare', cost: 220 },
  { id: 'title_stormcaller', type: 'title', value: 'Stormcaller', name: 'Title: Stormcaller', description: 'Under your name', rarity: 'epic', cost: 350 },
  { id: 'title_immortal', type: 'title', value: 'Immortal', name: 'Title: Immortal', description: 'Under your name', rarity: 'legendary', cost: 550 },
  { id: 'title_champion', type: 'title', value: 'Champion', name: 'Title: Champion', description: 'Under your name', rarity: 'rare', cost: 205 },
  { id: 'title_elder', type: 'title', value: 'Elder', name: 'Title: Elder', description: 'Under your name', rarity: 'uncommon', cost: 105, defaultUnlocked: true },
  { id: 'title_adept', type: 'title', value: 'Adept', name: 'Title: Adept', description: 'Under your name', rarity: 'common', cost: 65, defaultUnlocked: true },
  // —— In-game titles (founders/events/pantheon/god mastery)
  ...SPECIAL_TITLES,
  ...PANTHEON_TITLES,
  ...DISCIPLE_TITLES,
  // —— Sponsored
  { id: 'feature_sponsored', type: 'sponsored', value: 'sponsored', name: 'Featured Streamer', description: 'Your Twitch in the featured stream bar', rarity: 'legendary', cost: 800 },
  // —— Packs (bundles) — included so the server catalog can validate their price
  ...SHOP_PACKS,
];

export const FREE_REROLLS_PER_DAY = 5;
export const SHOP_SLOT_COUNT = 6;
export const DAILY_GOLD_AMOUNT = 50;
