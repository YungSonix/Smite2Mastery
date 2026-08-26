/**
 * Builds Guess-the-Emoji clue data (3 rotating sets per god).
 * Reviewed for kit + lore + combo coherence; S1-only from Smite wiki research.
 * Run: node scripts/gen-emoji-guess-clues.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'app/data/Minigames/god-emoji-guess');
const ICONS = path.join(OUT, 'icons');

/** @type {Record<string, string>} */
const GLYPHS = {
  armor: '🛡️',
  arrow: '🏹',
  axe: '🪓',
  bag: '🎒',
  ball: '⚽',
  banner: '🚩',
  bat: '🦇',
  bear: '🐻',
  bee: '🐝',
  bell: '🔔',
  bird: '🐦',
  blood: '🩸',
  boar: '🐗',
  bone: '🦴',
  book: '📖',
  boomerang: '🪃',
  bow: '🏹',
  brick: '🧱',
  brush: '🖌️',
  bug: '🪲',
  candle: '🕯️',
  card: '🎴',
  cat: '🐱',
  chain: '⛓️',
  clock: '⏳',
  cloud: '☁️',
  cocktail: '🍸',
  coffin: '⚰️',
  coin: '🪙',
  clone: '👥',
  comet: '☄️',
  compass: '🧭',
  crocodile: '🐊',
  crown: '👑',
  crystal: '🔮',
  cyclone: '🌪️',
  dagger: '🗡️',
  dance: '💃',
  dark: '🌑',
  deer: '🦌',
  desert: '🏜️',
  door: '🚪',
  dog: '🐕',
  dragon: '🐉',
  drum: '🥁',
  dwarf: '🧔',
  earth: '🌍',
  egg: '🥚',
  elephant: '🐘',
  eye: '👁️',
  feather: '🪶',
  fire: '🔥',
  fist: '👊',
  flag: '🚩',
  flower: '🌸',
  fly: '🪰',
  fog: '🌫️',
  four: '4️⃣',
  fox: '🦊',
  freeze: '❄️',
  frog: '🐸',
  galaxy: '🌌',
  gear: '⚙️',
  genie: '🧞',
  ghost: '👻',
  girl: '👧',
  goat: '🐐',
  grape: '🍇',
  hammer: '🔨',
  hand: '✋',
  hat: '🎩',
  heart: '💕',
  heartbreak: '💔',
  heel: '🦶',
  helmet: '🪖',
  hibiscus: '🌺',
  honey: '🍯',
  hook: '🪝',
  horn: '📯',
  horse: '🐴',
  hourglass: '⌛',
  house: '🏠',
  ice: '🧊',
  invisible: '🫥',
  kiss: '💋',
  lamp: '🪔',
  leaf: '🍃',
  leg: '🦵',
  leopard: '🐆',
  lift: '🏋️',
  light: '💡',
  lightning: '⚡',
  lion: '🦁',
  lotus: '🪷',
  masks: '🎭',
  mirror: '🪞',
  money: '💰',
  monkey: '🐒',
  moon: '🌙',
  moon_face: '🌛',
  mountain: '⛰️',
  music: '🎵',
  nausea: '🤢',
  night: '🌃',
  nine: '9️⃣',
  nurse: '🤱',
  nut: '🥜',
  octopus: '🐙',
  ogre: '👹',
  owl: '🦉',
  paw: '🐾',
  peacock: '🦚',
  people: '👥',
  plant: '🌿',
  poison: '🟢',
  portal: '🌀',
  potion: '🧪',
  prayer: '🙏',
  rabbit: '🐰',
  raccoon: '🦝',
  rage: '😡',
  rain: '🌧️',
  rainbow: '🌈',
  raven: '🐦‍⬛',
  recycle: '♻️',
  reload: '🔄',
  ring: '⭕',
  robot: '🤖',
  rock: '🪨',
  scales: '⚖️',
  scorpion: '🦂',
  scythe: '⚔️',
  shield: '🛡️',
  ship: '⛵',
  shoes: '👟',
  silence: '🤫',
  skull: '💀',
  sleep: '😴',
  snake: '🐍',
  snow: '❄️',
  spark: '💫',
  sparkle: '✨',
  spear: '🗡️',
  spider: '🕷️',
  squirrel: '🐿️',
  staff: '🪄',
  star: '⭐',
  statue: '🗿',
  stop: '🚫',
  storm: '🌩️',
  strength: '💪',
  sun: '☀️',
  sunrise: '🌅',
  swan: '🦢',
  sword: '⚔️',
  teacher: '🧑‍🏫',
  thread: '🧵',
  three: '3️⃣',
  tongue: '👅',
  tree: '🌳',
  trident: '🔱',
  turtle: '🐢',
  two: '2️⃣',
  umbrella: '☂️',
  urn: '⚱️',
  volcano: '🌋',
  wand: '🪄',
  water: '💧',
  wave: '🌊',
  web: '🕸️',
  whale: '🐋',
  wheat: '🌾',
  whip: '🪢',
  wind: '💨',
  wine: '🍷',
  wings: '🪽',
  witch: '🧙‍♀️',
  wizard: '🧙',
  wolf: '🐺',
  wood: '🪵',
  yawn: '🥱',
  zombie: '🧟',
  apple: '🍎',
  ninja: '🥷',
  club: '🏏',
  game: '🎲',
  clothing: '👘',
  wall: '🧱',
  whirl: '🌊',
  pluck: '🤚',
  dart: '🎯',
  execute: '☠️',
  bag_spirit: '🎒',
  hive: '🪺',
  bee_swarm: '🐝',
};

/** Icon files (simple SVGs) for weak unicode — swap with Flaticon free downloads later. */
const ICON_KEYS = ['spear', 'scythe', 'whip', 'wall', 'whirl', 'pluck', 'bow', 'poison', 'honey', 'bat', 'staff'];

function svgIcon(name, paths) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${name}">
  <rect width="128" height="128" rx="16" fill="#0b1220"/>
  ${paths}
</svg>
`;
}

const ICON_SVGS = {
  spear: svgIcon(
    'spear',
    `<line x1="24" y1="104" x2="104" y2="24" stroke="#7dd3fc" stroke-width="8" stroke-linecap="round"/>
     <polygon points="104,24 88,28 100,40" fill="#e2e8f0"/>`
  ),
  scythe: svgIcon(
    'scythe',
    `<path d="M36 108 L36 40 Q36 20 70 28 Q100 36 92 56" fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/>
     <path d="M70 28 Q100 20 108 48" fill="none" stroke="#7dd3fc" stroke-width="10" stroke-linecap="round"/>`
  ),
  whip: svgIcon(
    'whip',
    `<path d="M28 96 Q48 40 80 48 Q104 56 96 88" fill="none" stroke="#fbbf24" stroke-width="8" stroke-linecap="round"/>
     <circle cx="28" cy="100" r="8" fill="#e2e8f0"/>`
  ),
  wall: svgIcon(
    'wall',
    `<rect x="24" y="36" width="80" height="56" rx="4" fill="#1e3a5f" stroke="#7dd3fc" stroke-width="4"/>
     <line x1="24" y1="64" x2="104" y2="64" stroke="#7dd3fc" stroke-width="3"/>
     <line x1="64" y1="36" x2="64" y2="92" stroke="#7dd3fc" stroke-width="3"/>`
  ),
  whirl: svgIcon(
    'whirl',
    `<path d="M64 24 C96 24 104 56 64 64 C24 72 32 104 64 104" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
     <circle cx="64" cy="64" r="10" fill="#7dd3fc"/>`
  ),
  pluck: svgIcon(
    'pluck',
    `<path d="M40 88 L56 40 L72 52 L88 36" fill="none" stroke="#f87171" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="40" cy="92" r="10" fill="#e2e8f0"/>`
  ),
  bow: svgIcon(
    'bow',
    `<path d="M40 20 Q88 64 40 108" fill="none" stroke="#a78bfa" stroke-width="8" stroke-linecap="round"/>
     <line x1="40" y1="20" x2="40" y2="108" stroke="#e2e8f0" stroke-width="4"/>`
  ),
  poison: svgIcon(
    'poison',
    `<path d="M64 28 C48 48 40 64 40 80 C40 96 52 108 64 108 C76 108 88 96 88 80 C88 64 80 48 64 28Z" fill="#22c55e" stroke="#86efac" stroke-width="3"/>
     <circle cx="56" cy="76" r="4" fill="#052e16"/><circle cx="72" cy="84" r="3" fill="#052e16"/>`
  ),
  honey: svgIcon(
    'honey',
    `<path d="M40 48 H88 L80 100 H48 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="3"/>
     <ellipse cx="64" cy="48" rx="24" ry="10" fill="#fde68a"/>`
  ),
  bat: svgIcon(
    'bat',
    `<path d="M64 70 C40 40 16 52 20 72 C36 68 48 84 64 78 C80 84 92 68 108 72 C112 52 88 40 64 70Z" fill="#94a3b8"/>
     <circle cx="56" cy="72" r="3" fill="#0b1220"/><circle cx="72" cy="72" r="3" fill="#0b1220"/>`
  ),
  staff: svgIcon(
    'staff',
    `<line x1="64" y1="20" x2="64" y2="108" stroke="#c4b5fd" stroke-width="8" stroke-linecap="round"/>
     <circle cx="64" cy="24" r="12" fill="#7dd3fc"/>`
  ),
};

/**
 * Three rotating sets per god: { easy, hard } × 3.
 * Incorporates Model A (lore) + Model B (kit) review fixes.
 */
const S2 = {
  Achilles: [
    // spear + Shield of Achilles + heel (myth). Never helmet — reads as generic soldier / Athena.
    [
      ['spear', 'shield', 'heel'],
      ['armor', 'water', 'arrow'],
    ],
    [
      ['spear', 'heel', 'armor'],
      ['shield', 'leg', 'sword'],
    ],
    [
      ['shield', 'spear', 'strength'],
      ['water', 'heel', 'armor'],
    ],
  ],
  Agni: [
    [
      ['fire', 'hand', 'comet'],
      ['two', 'fire', 'smoke'],
    ],
    [
      ['fire', 'smoke', 'hand'],
      ['comet', 'two', 'flame'],
    ],
    [
      ['hand', 'fire', 'spark'],
      ['smoke', 'comet', 'two'],
    ],
  ],
  'Ah Puch': [
    [
      ['skull', 'bone', 'fly'],
      ['fly', 'coffin', 'fog'],
    ],
    [
      ['coffin', 'fly', 'skull'],
      ['bone', 'fog', 'poison'],
    ],
    [
      ['fly', 'skull', 'dark'],
      ['coffin', 'poison', 'bone'],
    ],
  ],
  Aladdin: [
    [
      ['genie', 'lamp', 'monkey'],
      ['lamp', 'money', 'sword'],
    ],
    [
      ['lamp', 'genie', 'smoke'],
      ['monkey', 'portal', 'lamp'],
    ],
    [
      ['genie', 'smoke', 'sword'],
      ['money', 'genie', 'wind'],
    ],
  ],
  Amaterasu: [
    [
      ['mirror', 'sunrise', 'sword'],
      ['reload', 'sun', 'mirror'],
    ],
    [
      ['sun', 'mirror', 'sword'],
      ['crystal', 'sunrise', 'sword'],
    ],
    [
      ['mirror', 'sword', 'sparkle'],
      ['sun', 'reload', 'armor'],
    ],
  ],
  Anhur: [
    // Impale / Shifting Sands (obelisk) / Desert Fury spears
    [
      ['lion', 'spear', 'rock'],
      ['desert', 'spear', 'sun'],
    ],
    [
      ['spear', 'desert', 'lion'],
      ['rock', 'lion', 'spear'],
    ],
    [
      ['lion', 'rock', 'desert'],
      ['spear', 'sun', 'desert'],
    ],
  ],
  Anubis: [
    // Always jackal icon — never dog (Cerberus collision).
    [
      ['jackal', 'scales', 'urn'],
      ['ankh', 'scales', 'dark'],
    ],
    [
      ['scales', 'jackal', 'skull'],
      ['dark', 'jackal', 'urn'],
    ],
    [
      ['jackal', 'skull', 'scales'],
      ['ankh', 'fire', 'jackal'],
    ],
  ],
  Aphrodite: [
    [
      ['kiss', 'heart', 'swan'],
      ['kiss', 'swan', 'sparkle'],
    ],
    [
      ['heart', 'kiss', 'bird'],
      ['swan', 'heart', 'flower'],
    ],
    [
      ['kiss', 'swan', 'heart'],
      ['heartbreak', 'kiss', 'swan'],
    ],
  ],
  Apollo: [
    // Serenade / Across the Sky / bow basics
    [
      ['music', 'sun', 'arrow'],
      ['horse', 'music', 'sun'],
    ],
    [
      ['sun', 'arrow', 'music'],
      ['music', 'wings', 'arrow'],
    ],
    [
      ['arrow', 'music', 'bird'],
      ['horse', 'sun', 'music'],
    ],
  ],
  Ares: [
    // Helmet is Ares-only signature among pantheon soldiers; chains = kit.
    [
      ['helmet', 'chain', 'fire'],
      ['chain', 'blood', 'pluck'],
    ],
    [
      ['chain', 'fire', 'strength'],
      ['helmet', 'chain', 'blood'],
    ],
    [
      ['helmet', 'chain', 'sword'],
      ['pluck', 'chain', 'fire'],
    ],
  ],
  Artemis: [
    // Boar + bow/moon — no 🚫 stop.
    [
      ['boar', 'bow', 'moon'],
      ['deer', 'moon', 'arrow'],
    ],
    [
      ['arrow', 'boar', 'moon'],
      ['deer', 'arrow', 'boar'],
    ],
    [
      ['boar', 'moon', 'arrow'],
      ['moon', 'boar', 'bow'],
    ],
  ],
  Artio: [
    [
      ['bear', 'leaf', 'reload'],
      ['bear', 'tree', 'moon'],
    ],
    [
      ['reload', 'bear', 'plant'],
      ['leaf', 'bear', 'snow'],
    ],
    [
      ['bear', 'plant', 'moon'],
      ['tree', 'reload', 'bear'],
    ],
  ],
  Athena: [
    // Owl + aegis/shield + spear (wisdom / kit). No helmet — too generic with Ares/Achilles.
    [
      ['owl', 'shield', 'spear'],
      ['owl', 'people', 'book'],
    ],
    [
      ['shield', 'owl', 'spear'],
      ['people', 'shield', 'owl'],
    ],
    [
      ['owl', 'spear', 'book'],
      ['spear', 'people', 'shield'],
    ],
  ],
  Atlas: [
    [
      ['earth', 'lift', 'galaxy'],
      ['lift', 'galaxy', 'rock'],
    ],
    [
      ['lift', 'earth', 'mountain'],
      ['galaxy', 'earth', 'strength'],
    ],
    [
      ['earth', 'mountain', 'lift'],
      ['rock', 'lift', 'galaxy'],
    ],
  ],
  Awilix: [
    [
      ['leopard', 'moon_face', 'pluck'],
      ['moon_face', 'leopard', 'portal'],
    ],
    [
      ['pluck', 'leopard', 'moon'],
      ['leopard', 'portal', 'moon_face'],
    ],
    [
      ['moon_face', 'pluck', 'paw'],
      ['portal', 'moon', 'leopard'],
    ],
  ],
  Bacchus: [
    [
      ['grape', 'wine', 'nausea'],
      ['nausea', 'wine', 'strength'],
    ],
    [
      ['nausea', 'grape', 'wine'],
      ['wine', 'strength', 'grape'],
    ],
    [
      ['wine', 'nausea', 'dance'],
      ['strength', 'nausea', 'grape'],
    ],
  ],
  'Baron Samedi': [
    [
      ['hat', 'skull', 'cocktail'],
      ['cocktail', 'hat', 'fog'],
    ],
    [
      ['cocktail', 'hat', 'skull'],
      ['fog', 'skull', 'hat'],
    ],
    [
      ['hat', 'cocktail', 'dance'],
      ['skull', 'fog', 'cocktail'],
    ],
  ],
  Bastet: [
    [
      ['cat', 'paw', 'moon'],
      ['cat', 'whip', 'blood'],
    ],
    [
      ['paw', 'cat', 'whip'],
      ['whip', 'moon', 'cat'],
    ],
    [
      ['cat', 'whip', 'paw'],
      ['blood', 'paw', 'moon'],
    ],
  ],
  Bellona: [
    // Shield Bash / Bludgeon / Scourge / Eagle's Rally
    [
      ['shield', 'hammer', 'whip'],
      ['flag', 'bird', 'whip'],
    ],
    [
      ['whip', 'shield', 'bird'],
      ['hammer', 'whip', 'flag'],
    ],
    [
      ['hammer', 'shield', 'bird'],
      ['whip', 'cyclone', 'flag'],
    ],
  ],
  Cabrakan: [
    // Tremors / Tectonic Shift wall / Refraction Shield
    [
      ['earth', 'wall', 'shield'],
      ['volcano', 'wall', 'strength'],
    ],
    [
      ['wall', 'rock', 'earth'],
      ['shield', 'tremor', 'wall'],
    ],
    [
      ['mountain', 'wall', 'rock'],
      ['earth', 'shield', 'volcano'],
    ],
  ],
  Cerberus: [
    // Ghost/soul instead of tooth/maw; keep 3️⃣.
    [
      ['dog', 'three', 'ghost'],
      ['poison', 'ghost', 'lift'],
    ],
    [
      ['three', 'dog', 'skull'],
      ['fire', 'three', 'chain'],
    ],
    [
      ['dog', 'ghost', 'portal'],
      ['skull', 'dog', 'three'],
    ],
  ],
  Cernunnos: [
    [
      ['deer', 'leaf', 'axe'],
      ['snow', 'leaf', 'sun'],
    ],
    [
      ['deer', 'plant', 'bow'],
      ['sun', 'deer', 'snow'],
    ],
    [
      ['leaf', 'deer', 'mushroom'],
      ['axe', 'snow', 'plant'],
    ],
  ],
  Chaac: [
    [
      ['rain', 'axe', 'lightning'],
      ['axe', 'rain', 'storm'],
    ],
    [
      ['axe', 'lightning', 'rain'],
      ['storm', 'axe', 'cloud'],
    ],
    [
      ['lightning', 'rain', 'armor'],
      ['rain', 'storm', 'axe'],
    ],
  ],
  Charon: [
    // Wave not ghost — Styx ferry.
    [
      ['ship', 'coin', 'wave'],
      ['fog', 'skull', 'coin'],
    ],
    [
      ['coin', 'ship', 'skull'],
      ['fog', 'coin', 'wave'],
    ],
    [
      ['ship', 'skull', 'coin'],
      ['wave', 'fog', 'coin'],
    ],
  ],
  Chiron: [
    [
      ['horse', 'arrow', 'book'],
      ['horse', 'teacher', 'bow'],
    ],
    [
      ['arrow', 'horse', 'teacher'],
      ['book', 'bow', 'horse'],
    ],
    [
      ['book', 'arrow', 'horse'],
      ['teacher', 'arrow', 'heal'],
    ],
  ],
  Chronos: [
    [
      ['clock', 'reload', 'gear'],
      ['hourglass', 'gear', 'reload'],
    ],
    [
      ['hourglass', 'clock', 'reload'],
      ['gear', 'clock', 'portal'],
    ],
    [
      ['reload', 'clock', 'spark'],
      ['clock', 'hourglass', 'freeze'],
    ],
  ],
  Cupid: [
    [
      ['heart', 'arrow', 'angel'],
      ['heartbreak', 'arrow', 'heart'],
    ],
    [
      ['arrow', 'heart', 'wings'],
      ['heart', 'bomb', 'arrow'],
    ],
    [
      ['heart', 'wings', 'arrow'],
      ['angel', 'heartbreak', 'arrow'],
    ],
  ],
  'Da Ji': [
    [
      ['fox', 'chain', 'heartbreak'],
      ['chain', 'fox', 'blood'],
    ],
    [
      ['chain', 'fox', 'paw'],
      ['fox', 'blood', 'invisible'],
    ],
    [
      ['fox', 'heartbreak', 'dagger'],
      ['blood', 'chain', 'fox'],
    ],
  ],
  Danzaburou: [
    [
      ['raccoon', 'money', 'leaf'],
      ['money', 'masks', 'leaf'],
    ],
    [
      ['money', 'raccoon', 'masks'],
      ['leaf', 'raccoon', 'portal'],
    ],
    [
      ['raccoon', 'leaf', 'clone'],
      ['masks', 'money', 'raccoon'],
    ],
  ],
  Discordia: [
    // Golden apple + strife/chaos — no drama masks.
    [
      ['apple', 'storm', 'cyclone'],
      ['apple', 'people', 'spark'],
    ],
    [
      ['apple', 'cyclone', 'spark'],
      ['game', 'apple', 'fog'],
    ],
    [
      ['apple', 'people', 'storm'],
      ['cyclone', 'game', 'apple'],
    ],
  ],
  Eset: [
    [
      ['wings', 'wand', 'bird'],
      ['wings', 'crystal', 'sun'],
    ],
    [
      ['bird', 'wings', 'crystal'],
      ['wand', 'wings', 'people'],
    ],
    [
      ['wings', 'sun', 'wand'],
      ['crystal', 'bird', 'wings'],
    ],
  ],
  Fenrir: [
    [
      ['wolf', 'chain', 'dark'],
      ['chain', 'dark', 'blood'],
    ],
    [
      ['wolf', 'pluck', 'rage'],
      ['blood', 'wolf', 'execute'],
    ],
    [
      ['chain', 'wolf', 'strength'],
      ['dark', 'pluck', 'wolf'],
    ],
  ],
  Ganesha: [
    [
      ['elephant', 'stop', 'prayer'],
      ['stop', 'prayer', 'lotus'],
    ],
    [
      ['stop', 'elephant', 'people'],
      ['lotus', 'elephant', 'stop'],
    ],
    [
      ['elephant', 'lotus', 'stop'],
      ['prayer', 'stop', 'shield'],
    ],
  ],
  Geb: [
    // Earth/wall/tremor — no shield.
    [
      ['earth', 'rock', 'wall'],
      ['tremor', 'ball', 'pluck'],
    ],
    [
      ['rock', 'reload', 'earth'],
      ['tremor', 'earth', 'brick'],
    ],
    [
      ['earth', 'mountain', 'wall'],
      ['wave', 'rock', 'earth'],
    ],
  ],
  Gilgamesh: [
    [
      ['brick', 'leg', 'sword'],
      ['leg', 'brick', 'lion'],
    ],
    [
      ['brick', 'sword', 'strength'],
      ['wall', 'leg', 'brick'],
    ],
    [
      ['leg', 'brick', 'armor'],
      ['sword', 'wall', 'leg'],
    ],
  ],
  'Guan Yu': [
    [
      ['horse', 'sword', 'green'],
      ['horse', 'green', 'book'],
    ],
    [
      ['sword', 'horse', 'heal'],
      ['green', 'horse', 'strength'],
    ],
    [
      ['horse', 'green', 'guandao'],
      ['book', 'sword', 'horse'],
    ],
  ],
  Hades: [
    [
      ['portal', 'skull', 'stop'],
      ['portal', 'blood', 'dark'],
    ],
    [
      ['skull', 'portal', 'fire'],
      ['dark', 'stop', 'skull'],
    ],
    [
      ['stop', 'skull', 'portal'],
      ['blood', 'portal', 'fog'],
    ],
  ],
  Hecate: [
    [
      ['moon', 'dog', 'crystal'],
      ['three', 'moon', 'crystal'],
    ],
    [
      ['crystal', 'moon', 'wand'],
      ['dog', 'three', 'moon'],
    ],
    [
      ['moon', 'wand', 'three'],
      ['crystal', 'dog', 'dark'],
    ],
  ],
  Hercules: [
    [
      ['strength', 'lion', 'rock'],
      ['lion', 'rock', 'blood'],
    ],
    [
      ['rock', 'strength', 'pluck'],
      ['strength', 'blood', 'lion'],
    ],
    [
      ['lion', 'strength', 'club'],
      ['pluck', 'rock', 'strength'],
    ],
  ],
  Horus: [
    // Falcon + Eye of Horus — no shield.
    [
      ['bird', 'eye', 'wings'],
      ['heal', 'lift', 'people'],
    ],
    [
      ['eye', 'bird', 'people'],
      ['wings', 'eye', 'heal'],
    ],
    [
      ['wings', 'eye', 'bird'],
      ['people', 'wings', 'eye'],
    ],
  ],
  'Hou Yi': [
    [
      ['arrow', 'sun', 'bird'],
      ['nine', 'sun', 'arrow'],
    ],
    [
      ['sun', 'arrow', 'rabbit'],
      ['rabbit', 'nine', 'sun'],
    ],
    [
      ['arrow', 'nine', 'moon'],
      ['bird', 'arrow', 'sun'],
    ],
  ],
  'Hua Mulan': [
    // Banner/flag + weapon swap (kit), flower (name/lore). No helmet.
    [
      ['banner', 'sword', 'flower'],
      ['reload', 'spear', 'horse'],
    ],
    [
      ['sword', 'banner', 'flower'],
      ['flower', 'flag', 'spear'],
    ],
    [
      ['reload', 'banner', 'sword'],
      ['horse', 'flower', 'reload'],
    ],
  ],
  'Hun Batz': [
    // Monkey + drum/boomerang — no theater masks.
    [
      ['monkey', 'drum', 'boomerang'],
      ['ghost', 'lift', 'staff'],
    ],
    [
      ['monkey', 'wood', 'drum'],
      ['staff', 'drum', 'monkey'],
    ],
    [
      ['boomerang', 'monkey', 'wood'],
      ['ghost', 'boomerang', 'drum'],
    ],
  ],
  Ishtar: [
    [
      ['star', 'arrow', 'sword'],
      ['star', 'crown', 'arrow'],
    ],
    [
      ['arrow', 'star', 'strength'],
      ['sword', 'star', 'moon'],
    ],
    [
      ['star', 'sword', 'bow'],
      ['crown', 'arrow', 'star'],
    ],
  ],
  Izanami: [
    [
      ['boomerang', 'masks', 'dark'],
      ['boomerang', 'invisible', 'masks'],
    ],
    [
      ['ghost', 'boomerang', 'skull'],
      ['invisible', 'ghost', 'blood'],
    ],
    [
      ['masks', 'dark', 'boomerang'],
      ['skull', 'invisible', 'boomerang'],
    ],
  ],
  Janus: [
    [
      ['door', 'portal', 'masks'],
      ['portal', 'masks', 'wind'],
    ],
    [
      ['portal', 'door', 'two'],
      ['masks', 'portal', 'clock'],
    ],
    [
      ['door', 'two', 'portal'],
      ['wind', 'door', 'masks'],
    ],
  ],
  'Jing Wei': [
    [
      ['bird', 'wave', 'rock'],
      ['rock', 'bird', 'wind'],
    ],
    [
      ['bird', 'wind', 'wave'],
      ['wave', 'rock', 'bird'],
    ],
    [
      ['rock', 'bird', 'flower'],
      ['wind', 'wave', 'rock'],
    ],
  ],
  Jormungandr: [
    [
      ['snake', 'earth', 'wave'],
      ['snake', 'poison', 'earth'],
    ],
    [
      ['snake', 'poison', 'wave'],
      ['earth', 'snake', 'fog'],
    ],
    [
      ['wave', 'snake', 'mountain'],
      ['poison', 'wave', 'snake'],
    ],
  ],
  Kali: [
    [
      ['tongue', 'dagger', 'skull'],
      ['four', 'sword', 'skull'],
    ],
    [
      ['skull', 'tongue', 'blood'],
      ['four', 'tongue', 'execute'],
    ],
    [
      ['dagger', 'four', 'tongue'],
      ['blood', 'four', 'skull'],
    ],
  ],
  Khepri: [
    [
      ['bug', 'sunrise', 'recycle'],
      ['bug', 'recycle', 'sun'],
    ],
    [
      ['recycle', 'bug', 'sun'],
      ['sunrise', 'recycle', 'shield'],
    ],
    [
      ['bug', 'recycle', 'people'],
      ['sun', 'bug', 'recycle'],
    ],
  ],
  Kukulkan: [
    [
      ['snake', 'wind', 'cyclone'],
      ['snake', 'storm', 'wings'],
    ],
    [
      ['cyclone', 'snake', 'cloud'],
      ['wind', 'snake', 'lightning'],
    ],
    [
      ['snake', 'cloud', 'wind'],
      ['storm', 'cyclone', 'snake'],
    ],
  ],
  Loki: [
    [
      ['dagger', 'invisible', 'snake'],
      ['invisible', 'masks', 'dagger'],
    ],
    [
      ['invisible', 'dagger', 'clone'],
      ['snake', 'invisible', 'blood'],
    ],
    [
      ['masks', 'dagger', 'invisible'],
      ['clone', 'snake', 'invisible'],
    ],
  ],
  Medusa: [
    [
      ['snake', 'eye', 'statue'],
      ['statue', 'eye', 'arrow'],
    ],
    [
      ['statue', 'snake', 'eye'],
      ['eye', 'snake', 'blood'],
    ],
    [
      ['eye', 'statue', 'snake'],
      ['arrow', 'statue', 'snake'],
    ],
  ],
  Mercury: [
    [
      ['shoes', 'wind', 'wings'],
      ['wings', 'shoes', 'lightning'],
    ],
    [
      ['wings', 'shoes', 'fist'],
      ['wind', 'wings', 'portal'],
    ],
    [
      ['shoes', 'fist', 'wings'],
      ['lightning', 'shoes', 'wind'],
    ],
  ],
  Merlin: [
    [
      ['fire', 'freeze', 'lightning'],
      ['fire', 'freeze', 'staff'],
    ],
    [
      ['wizard', 'fire', 'freeze'],
      ['lightning', 'wizard', 'reload'],
    ],
    [
      ['staff', 'fire', 'freeze'],
      ['reload', 'lightning', 'freeze'],
    ],
  ],
  Mordred: [
    [
      ['blood', 'sword', 'execute'],
      ['blood', 'chain', 'armor'],
    ],
    [
      ['sword', 'blood', 'two'],
      ['execute', 'blood', 'dark'],
    ],
    [
      ['two', 'sword', 'blood'],
      ['armor', 'execute', 'sword'],
    ],
  ],
  'Morgan Le Fay': [
    [
      ['dragon', 'wand', 'fire'],
      ['wand', 'dragon', 'fog'],
    ],
    [
      ['wand', 'dragon', 'crystal'],
      ['fog', 'wand', 'fire'],
    ],
    [
      ['dragon', 'fog', 'wand'],
      ['fire', 'dragon', 'masks'],
    ],
  ],
  Neith: [
    [
      ['thread', 'arrow', 'clothing'],
      ['thread', 'arrow', 'earth'],
    ],
    [
      ['arrow', 'thread', 'bow'],
      ['clothing', 'thread', 'moon'],
    ],
    [
      ['thread', 'bow', 'people'],
      ['earth', 'arrow', 'thread'],
    ],
  ],
  Nemesis: [
    [
      ['scales', 'sword', 'mirror'],
      ['scales', 'mirror', 'blood'],
    ],
    [
      ['mirror', 'scales', 'sword'],
      ['sword', 'scales', 'execute'],
    ],
    [
      ['scales', 'eye', 'sword'],
      ['blood', 'mirror', 'scales'],
    ],
  ],
  'Ne Zha': [
    [
      ['ring', 'fire', 'lotus'],
      ['lotus', 'ring', 'wind'],
    ],
    [
      ['ring', 'lotus', 'spear'],
      ['fire', 'ring', 'wings'],
    ],
    [
      ['lotus', 'ring', 'fire'],
      ['wind', 'lotus', 'ring'],
    ],
  ],
  'Nu Wa': [
    [
      ['snake', 'fog', 'people'],
      ['fog', 'rock', 'cloud'],
    ],
    [
      ['people', 'snake', 'wall'],
      ['cloud', 'people', 'fog'],
    ],
    [
      ['fog', 'snake', 'crystal'],
      ['wall', 'fog', 'snake'],
    ],
  ],
  Nut: [
    [
      ['galaxy', 'star', 'arrow'],
      ['night', 'star', 'comet'],
    ],
    [
      ['star', 'galaxy', 'bow'],
      ['comet', 'night', 'star'],
    ],
    [
      ['galaxy', 'night', 'star'],
      ['arrow', 'galaxy', 'moon'],
    ],
  ],
  Odin: [
    [
      ['raven', 'ring', 'spear'],
      ['raven', 'ring', 'eye'],
    ],
    [
      ['ring', 'raven', 'bird'],
      ['spear', 'raven', 'wall'],
    ],
    [
      ['raven', 'spear', 'eye'],
      ['eye', 'ring', 'raven'],
    ],
  ],
  Osiris: [
    [
      ['zombie', 'wheat', 'scythe'],
      ['wheat', 'zombie', 'scales'],
    ],
    [
      ['scythe', 'zombie', 'reload'],
      ['scales', 'scythe', 'wheat'],
    ],
    [
      ['zombie', 'scythe', 'strength'],
      ['reload', 'wheat', 'zombie'],
    ],
  ],
  Pele: [
    [
      ['volcano', 'dance', 'hibiscus'],
      ['hibiscus', 'volcano', 'fire'],
    ],
    [
      ['fire', 'volcano', 'dance'],
      ['dance', 'hibiscus', 'explosion'],
    ],
    [
      ['volcano', 'hibiscus', 'strength'],
      ['fire', 'dance', 'volcano'],
    ],
  ],
  Poseidon: [
    [
      ['wave', 'trident', 'octopus'],
      ['trident', 'whirl', 'octopus'],
    ],
    [
      ['trident', 'wave', 'whirl'],
      ['whirl', 'wave', 'horse'],
    ],
    [
      ['octopus', 'trident', 'wave'],
      ['horse', 'whirl', 'trident'],
    ],
  ],
  'Princess Bari': [
    [
      ['bell', 'flower', 'wind'],
      ['bell', 'compass', 'flower'],
    ],
    [
      ['flower', 'bell', 'heal'],
      ['compass', 'bell', 'wind'],
    ],
    [
      ['bell', 'wind', 'people'],
      ['flower', 'heal', 'bell'],
    ],
  ],
  Ra: [
    // Celestial Beam / Solar Blessing / Searing Pain
    [
      ['sun', 'bird', 'beam'],
      ['sun', 'eye', 'bird'],
    ],
    [
      ['beam', 'sun', 'heal'],
      ['eye', 'sun', 'fire'],
    ],
    [
      ['sun', 'fire', 'bird'],
      ['heal', 'beam', 'sun'],
    ],
  ],
  Rama: [
    [
      ['arrow', 'crown', 'monkey'],
      ['crown', 'arrow', 'bow'],
    ],
    [
      ['bow', 'arrow', 'crown'],
      ['monkey', 'bow', 'arrow'],
    ],
    [
      ['arrow', 'bow', 'three'],
      ['crown', 'three', 'arrow'],
    ],
  ],
  Ratatoskr: [
    [
      ['squirrel', 'tree', 'nut'],
      ['nut', 'tree', 'dart'],
    ],
    [
      ['nut', 'squirrel', 'portal'],
      ['dart', 'squirrel', 'tree'],
    ],
    [
      ['squirrel', 'dart', 'nut'],
      ['tree', 'portal', 'squirrel'],
    ],
  ],
  Scylla: [
    [
      ['girl', 'dog', 'wave'],
      ['girl', 'four', 'dog'],
    ],
    [
      ['octopus', 'girl', 'dog'],
      ['four', 'octopus', 'girl'],
    ],
    [
      ['girl', 'wave', 'skull'],
      ['dog', 'four', 'wave'],
    ],
  ],
  Sobek: [
    [
      ['crocodile', 'wave', 'pluck'],
      ['crocodile', 'pluck', 'wave'],
    ],
    [
      ['pluck', 'crocodile', 'strength'],
      ['wave', 'hand', 'crocodile'],
    ],
    [
      ['crocodile', 'strength', 'wave'],
      ['hand', 'pluck', 'crocodile'],
    ],
  ],
  Sol: [
    // Radiance / Disapparate trail / Supernova
    [
      ['sun', 'fire', 'spark'],
      ['spark', 'sun', 'explosion'],
    ],
    [
      ['fire', 'sun', 'dance'],
      ['explosion', 'fire', 'sun'],
    ],
    [
      ['sun', 'spark', 'reload'],
      ['dance', 'spark', 'fire'],
    ],
  ],
  'Sun Wukong': [
    [
      ['monkey', 'wood', 'cloud'],
      ['wood', 'cloud', 'masks'],
    ],
    [
      ['monkey', 'clone', 'wood'],
      ['cloud', 'monkey', 'staff'],
    ],
    [
      ['wood', 'monkey', 'portal'],
      ['masks', 'wood', 'cloud'],
    ],
  ],
  Susano: [
    [
      ['cyclone', 'sword', 'wave'],
      ['storm', 'sword', 'wind'],
    ],
    [
      ['sword', 'cyclone', 'storm'],
      ['wind', 'sword', 'wave'],
    ],
    [
      ['storm', 'sword', 'pluck'],
      ['wave', 'cyclone', 'sword'],
    ],
  ],
  Sylvanus: [
    [
      ['tree', 'owl', 'leaf'],
      ['tree', 'flower', 'hand'],
    ],
    [
      ['owl', 'tree', 'plant'],
      ['flower', 'tree', 'pluck'],
    ],
    [
      ['tree', 'plant', 'frog'],
      ['hand', 'owl', 'tree'],
    ],
  ],
  Thanatos: [
    [
      ['wings', 'scythe', 'blood'],
      ['scythe', 'wings', 'dark'],
    ],
    [
      ['scythe', 'execute', 'wings'],
      ['blood', 'scythe', 'skull'],
    ],
    [
      ['wings', 'execute', 'scythe'],
      ['dark', 'execute', 'wings'],
    ],
  ],
  'The Morrigan': [
    [
      ['raven', 'people', 'crystal'],
      ['raven', 'masks', 'fog'],
    ],
    [
      ['masks', 'raven', 'clone'],
      ['crystal', 'raven', 'people'],
    ],
    [
      ['raven', 'clone', 'dark'],
      ['fog', 'masks', 'raven'],
    ],
  ],
  Thor: [
    // Mjolnir's Attunement / Tectonic Rift / Anvil of Dawn
    [
      ['hammer', 'lightning', 'wall'],
      ['hammer', 'storm', 'portal'],
    ],
    [
      ['lightning', 'hammer', 'storm'],
      ['wall', 'hammer', 'goat'],
    ],
    [
      ['hammer', 'cyclone', 'lightning'],
      ['storm', 'hammer', 'cloud'],
    ],
  ],
  Tsukuyomi: [
    [
      ['moon', 'ninja', 'dagger'],
      ['moon', 'ninja', 'sword'],
    ],
    [
      ['ninja', 'moon', 'star'],
      ['dagger', 'moon', 'dark'],
    ],
    [
      ['moon', 'star', 'sword'],
      ['dark', 'ninja', 'moon'],
    ],
  ],
  Ullr: [
    [
      ['arrow', 'axe', 'snow'],
      ['axe', 'snow', 'bow'],
    ],
    [
      ['bow', 'axe', 'reload'],
      ['snow', 'bow', 'arrow'],
    ],
    [
      ['axe', 'arrow', 'reload'],
      ['bow', 'axe', 'ice'],
    ],
  ],
  Vulcan: [
    [
      ['hammer', 'robot', 'volcano'],
      ['robot', 'gear', 'fire'],
    ],
    [
      ['robot', 'hammer', 'fire'],
      ['gear', 'robot', 'volcano'],
    ],
    [
      ['hammer', 'fire', 'gear'],
      ['volcano', 'robot', 'hammer'],
    ],
  ],
  Xbalanque: [
    [
      ['moon', 'night', 'sun'],
      ['night', 'ball', 'dark'],
    ],
    [
      ['sun', 'dark', 'arrow'],
      ['ball', 'moon', 'sun'],
    ],
    [
      ['night', 'sun', 'dart'],
      ['dark', 'dart', 'night'],
    ],
  ],
  Yemoja: [
    // Omi rings / Bouncing Bubble / Mending Waters / River's Rebuke
    [
      ['water', 'ring', 'wave'],
      ['moon', 'ring', 'water'],
    ],
    [
      ['wave', 'water', 'heal'],
      ['ring', 'moon', 'wave'],
    ],
    [
      ['water', 'heal', 'people'],
      ['wave', 'ring', 'moon'],
    ],
  ],
  Ymir: [
    [
      ['ice', 'ogre', 'snow'],
      ['ice', 'wall', 'club'],
    ],
    [
      ['wall', 'ice', 'freeze'],
      ['snow', 'wall', 'ogre'],
    ],
    [
      ['ice', 'freeze', 'strength'],
      ['club', 'ice', 'wall'],
    ],
  ],
  Zeus: [
    // Chain Lightning / Detonate Charge / Lightning Storm
    [
      ['lightning', 'cloud', 'three'],
      ['lightning', 'spark', 'storm'],
    ],
    [
      ['cloud', 'lightning', 'spark'],
      ['three', 'lightning', 'crown'],
    ],
    [
      ['lightning', 'storm', 'cloud'],
      ['spark', 'three', 'lightning'],
    ],
  ],
};

/** S1-only (wiki research; not in Smite2Gods.json). Three rotating sets each. */
const S1 = {
  'Ah Muzen Cab': [
    [
      ['bee', 'honey', 'hive'],
      ['bee', 'dart', 'honey'],
    ],
    [
      ['honey', 'bee', 'arrow'],
      ['hive', 'bee', 'retrieve'],
    ],
    [
      ['bee', 'hive', 'sun'],
      ['honey', 'swarm', 'bee'],
    ],
  ],
  'Ao Kuang': [
    [
      ['dragon', 'sword', 'water'],
      ['execute', 'dragon', 'wave'],
    ],
    [
      ['sword', 'dragon', 'execute'],
      ['water', 'dragon', 'wings'],
    ],
    [
      ['dragon', 'wave', 'sword'],
      ['wings', 'execute', 'dragon'],
    ],
  ],
  Arachne: [
    [
      ['spider', 'web', 'egg'],
      ['web', 'spider', 'cocoon'],
    ],
    [
      ['web', 'egg', 'spider'],
      ['spider', 'poison', 'web'],
    ],
    [
      ['egg', 'spider', 'dark'],
      ['cocoon', 'web', 'spider'],
    ],
  ],
  'Baba Yaga': [
    [
      ['witch', 'house', 'potion'],
      ['house', 'potion', 'fire'],
    ],
    [
      ['potion', 'witch', 'house'],
      ['witch', 'fog', 'potion'],
    ],
    [
      ['house', 'witch', 'crystal'],
      ['potion', 'house', 'masks'],
    ],
  ],
  'Bake Kujira': [
    [
      ['whale', 'ghost', 'wave'],
      ['whale', 'clock', 'wave'],
    ],
    [
      ['ghost', 'whale', 'music'],
      ['wave', 'ghost', 'fog'],
    ],
    [
      ['whale', 'wave', 'skull'],
      ['music', 'whale', 'dark'],
    ],
  ],
  Bakasura: [
    [
      ['ogre', 'tongue', 'feast'],
      ['ogre', 'nausea', 'feast'],
    ],
    [
      ['tongue', 'ogre', 'rage'],
      ['feast', 'ogre', 'poison'],
    ],
    [
      ['ogre', 'rage', 'bone'],
      ['nausea', 'tongue', 'ogre'],
    ],
  ],
  Camazotz: [
    [
      ['bat', 'blood', 'cave'],
      ['bat', 'blood', 'wings'],
    ],
    [
      ['blood', 'bat', 'dark'],
      ['wings', 'bat', 'three'],
    ],
    [
      ['bat', 'wings', 'skull'],
      ['dark', 'blood', 'bat'],
    ],
  ],
  "Chang'e": [
    [
      ['moon', 'rabbit', 'dance'],
      ['rabbit', 'moon', 'dance'],
    ],
    [
      ['dance', 'moon', 'rabbit'],
      ['moon', 'flower', 'rabbit'],
    ],
    [
      ['rabbit', 'dance', 'heal'],
      ['flower', 'moon', 'dance'],
    ],
  ],
  Charybdis: [
    [
      ['whirl', 'wave', 'octopus'],
      ['whirl', 'tide', 'maw'],
    ],
    [
      ['wave', 'whirl', 'monster'],
      ['octopus', 'whirl', 'wave'],
    ],
    [
      ['whirl', 'octopus', 'dark'],
      ['tide', 'wave', 'whirl'],
    ],
  ],
  Chernobog: [
    [
      ['dark', 'crystal', 'wings'],
      ['wall', 'clone', 'crystal'],
    ],
    [
      ['crystal', 'dark', 'wings'],
      ['clone', 'dark', 'three'],
    ],
    [
      ['wings', 'crystal', 'dark'],
      ['wall', 'wings', 'crystal'],
    ],
  ],
  Cliodhna: [
    [
      ['ghost', 'scream', 'wall'],
      ['ghost', 'wall', 'rift'],
    ],
    [
      ['wall', 'ghost', 'scream'],
      ['scream', 'fog', 'wall'],
    ],
    [
      ['ghost', 'fog', 'wall'],
      ['rift', 'ghost', 'scream'],
    ],
  ],
  Cthulhu: [
    [
      ['octopus', 'madness', 'ocean'],
      ['octopus', 'madness', 'wings'],
    ],
    [
      ['madness', 'octopus', 'wave'],
      ['ocean', 'octopus', 'dark'],
    ],
    [
      ['octopus', 'wings', 'skull'],
      ['dark', 'madness', 'octopus'],
    ],
  ],
  'Cu Chulainn': [
    [
      ['spear', 'rage', 'monster'],
      ['rage', 'spear', 'berserk'],
    ],
    [
      ['rage', 'spear', 'strength'],
      ['monster', 'rage', 'blood'],
    ],
    [
      ['spear', 'monster', 'reload'],
      ['berserk', 'spear', 'rage'],
    ],
  ],
  'Erlang Shen': [
    [
      ['dog', 'spear', 'turtle'],
      ['dog', 'reload', 'turtle'],
    ],
    [
      ['spear', 'dog', 'eye'],
      ['turtle', 'dog', 'spear'],
    ],
    [
      ['dog', 'turtle', 'strength'],
      ['eye', 'reload', 'dog'],
    ],
  ],
  Fafnir: [
    [
      ['dwarf', 'dragon', 'coin'],
      ['coin', 'dragon', 'fire'],
    ],
    [
      ['coin', 'dwarf', 'dragon'],
      ['dragon', 'coin', 'greed'],
    ],
    [
      ['dwarf', 'coin', 'hammer'],
      ['fire', 'dragon', 'coin'],
    ],
  ],
  Freya: [
    [
      ['wings', 'sword', 'sparkle'],
      ['wings', 'sword', 'feather'],
    ],
    [
      ['sword', 'wings', 'fire'],
      ['feather', 'wings', 'sword'],
    ],
    [
      ['wings', 'sparkle', 'sword'],
      ['fire', 'feather', 'wings'],
    ],
  ],
  Hachiman: [
    [
      ['horse', 'arrow', 'banner'],
      ['horse', 'arrow', 'sword'],
    ],
    [
      ['arrow', 'horse', 'banner'],
      ['banner', 'horse', 'bow'],
    ],
    [
      ['horse', 'bow', 'banner'],
      ['sword', 'banner', 'horse'],
    ],
  ],
  'He Bo': [
    [
      ['water', 'wave', 'scroll'],
      ['wave', 'water', 'cyclone'],
    ],
    [
      ['wave', 'scroll', 'water'],
      ['scroll', 'wave', 'portal'],
    ],
    [
      ['water', 'cyclone', 'wave'],
      ['portal', 'water', 'scroll'],
    ],
  ],
  Heimdallr: [
    [
      ['horn', 'rainbow', 'eye'],
      ['rainbow', 'horn', 'portal'],
    ],
    [
      ['eye', 'horn', 'rainbow'],
      ['horn', 'eye', 'sword'],
    ],
    [
      ['rainbow', 'eye', 'horn'],
      ['portal', 'rainbow', 'eye'],
    ],
  ],
  Hel: [
    [
      ['masks', 'dark', 'light'],
      ['reload', 'dark', 'light'],
    ],
    [
      ['dark', 'light', 'masks'],
      ['light', 'heal', 'dark'],
    ],
    [
      ['masks', 'reload', 'skull'],
      ['dark', 'masks', 'heal'],
    ],
  ],
  Hera: [
    [
      ['crown', 'peacock', 'robot'],
      ['robot', 'crown', 'peacock'],
    ],
    [
      ['peacock', 'crown', 'wand'],
      ['crown', 'robot', 'people'],
    ],
    [
      ['robot', 'peacock', 'crown'],
      ['wand', 'peacock', 'robot'],
    ],
  ],
  'Ix Chel': [
    [
      ['rainbow', 'moon', 'thread'],
      ['rainbow', 'heal', 'moon'],
    ],
    [
      ['moon', 'rainbow', 'thread'],
      ['thread', 'rainbow', 'crystal'],
    ],
    [
      ['rainbow', 'thread', 'flower'],
      ['heal', 'moon', 'rainbow'],
    ],
  ],
  'King Arthur': [
    [
      ['sword', 'crown', 'armor'],
      ['sword', 'reload', 'crown'],
    ],
    [
      ['crown', 'sword', 'horse'],
      ['armor', 'sword', 'shield'],
    ],
    [
      ['sword', 'shield', 'crown'],
      ['reload', 'sword', 'horse'],
    ],
  ],
  Kumbhakarna: [
    [
      ['sleep', 'ogre', 'yawn'],
      ['sleep', 'ogre', 'fist'],
    ],
    [
      ['yawn', 'sleep', 'ogre'],
      ['ogre', 'yawn', 'strength'],
    ],
    [
      ['ogre', 'sleep', 'pillow'],
      ['fist', 'sleep', 'ogre'],
    ],
  ],
  Kuzenbo: [
    [
      ['turtle', 'shell', 'water'],
      ['turtle', 'shell', 'reflect'],
    ],
    [
      ['shell', 'turtle', 'wave'],
      ['water', 'turtle', 'fist'],
    ],
    [
      ['turtle', 'wave', 'shell'],
      ['reflect', 'shell', 'turtle'],
    ],
  ],
  Lancelot: [
    [
      ['horse', 'spear', 'shield'],
      ['horse', 'spear', 'joust'],
    ],
    [
      ['spear', 'horse', 'armor'],
      ['shield', 'horse', 'spear'],
    ],
    [
      ['horse', 'shield', 'sword'],
      ['joust', 'horse', 'spear'],
    ],
  ],
  'Maman Brigitte': [
    [
      ['ghost', 'snake', 'orb'],
      ['ghost', 'orb', 'snake'],
    ],
    [
      ['orb', 'ghost', 'skull'],
      ['snake', 'ghost', 'explosion'],
    ],
    [
      ['ghost', 'skull', 'orb'],
      ['orb', 'snake', 'dark'],
    ],
  ],
  Martichoras: [
    [
      ['lion', 'wings', 'poison'],
      ['lion', 'poison', 'wings'],
    ],
    [
      ['wings', 'lion', 'dart'],
      ['poison', 'lion', 'grass'],
    ],
    [
      ['lion', 'dart', 'poison'],
      ['wings', 'poison', 'lion'],
    ],
  ],
  Maui: [
    [
      ['hook', 'sun', 'island'],
      ['hook', 'sun', 'wave'],
    ],
    [
      ['sun', 'hook', 'island'],
      ['island', 'hook', 'people'],
    ],
    [
      ['hook', 'wave', 'island'],
      ['sun', 'island', 'hook'],
    ],
  ],
  Nike: [
    [
      ['wings', 'crown', 'shield'],
      ['wings', 'shield', 'banner'],
    ],
    [
      ['shield', 'wings', 'crown'],
      ['crown', 'wings', 'people'],
    ],
    [
      ['wings', 'banner', 'shield'],
      ['shield', 'crown', 'wings'],
    ],
  ],
  Nox: [
    [
      ['night', 'candle', 'silence'],
      ['night', 'silence', 'portal'],
    ],
    [
      ['silence', 'night', 'candle'],
      ['candle', 'dark', 'silence'],
    ],
    [
      ['night', 'dark', 'candle'],
      ['portal', 'night', 'silence'],
    ],
  ],
  Olorun: [
    [
      ['sun', 'clock', 'crown'],
      ['sun', 'clock', 'spark'],
    ],
    [
      ['clock', 'sun', 'star'],
      ['crown', 'sun', 'clock'],
    ],
    [
      ['sun', 'spark', 'clock'],
      ['star', 'clock', 'sun'],
    ],
  ],
  Persephone: [
    [
      ['flower', 'skull', 'plant'],
      ['skull', 'flower', 'plant'],
    ],
    [
      ['plant', 'skull', 'flower'],
      ['flower', 'dark', 'skull'],
    ],
    [
      ['skull', 'plant', 'pomegranate'],
      ['plant', 'skull', 'wave'],
    ],
  ],
  Raijin: [
    [
      ['drum', 'lightning', 'cloud'],
      ['drum', 'lightning', 'four'],
    ],
    [
      ['lightning', 'drum', 'cloud'],
      ['four', 'drum', 'masks'],
    ],
    [
      ['drum', 'cloud', 'storm'],
      ['cloud', 'four', 'drum'],
    ],
  ],
  Ravana: [
    [
      ['fist', 'chain', 'shield'],
      ['fist', 'chain', 'eight'],
    ],
    [
      ['chain', 'fist', 'strength'],
      ['shield', 'fist', 'portal'],
    ],
    [
      ['fist', 'strength', 'chain'],
      ['eight', 'fist', 'chain'],
    ],
  ],
  Serqet: [
    [
      ['scorpion', 'poison', 'dagger'],
      ['scorpion', 'poison', 'three'],
    ],
    [
      ['poison', 'scorpion', 'dagger'],
      ['dagger', 'poison', 'execute'],
    ],
    [
      ['scorpion', 'dagger', 'blood'],
      ['three', 'scorpion', 'poison'],
    ],
  ],
  Set: [
    [
      ['desert', 'spear', 'clone'],
      ['clone', 'desert', 'four'],
    ],
    [
      ['clone', 'spear', 'desert'],
      ['spear', 'clone', 'dark'],
    ],
    [
      ['desert', 'clone', 'sand'],
      ['four', 'spear', 'clone'],
    ],
  ],
  Shiva: [
    [
      ['trident', 'dance', 'fire'],
      ['dance', 'trident', 'drum'],
    ],
    [
      ['dance', 'trident', 'reload'],
      ['fire', 'dance', 'trident'],
    ],
    [
      ['trident', 'fire', 'dance'],
      ['drum', 'trident', 'dance'],
    ],
  ],
  Skadi: [
    [
      ['wolf', 'ice', 'spear'],
      ['wolf', 'ice', 'snow'],
    ],
    [
      ['ice', 'wolf', 'spear'],
      ['spear', 'wolf', 'freeze'],
    ],
    [
      ['wolf', 'snow', 'bow'],
      ['snow', 'spear', 'wolf'],
    ],
  ],
  Surtr: [
    [
      ['fire', 'sword', 'giant'],
      ['fire', 'sword', 'meteor'],
    ],
    [
      ['sword', 'fire', 'volcano'],
      ['meteor', 'fire', 'rock'],
    ],
    [
      ['fire', 'giant', 'sword'],
      ['volcano', 'meteor', 'fire'],
    ],
  ],
  Terra: [
    [
      ['earth', 'rock', 'statue'],
      ['earth', 'wall', 'heal'],
    ],
    [
      ['rock', 'earth', 'wall'],
      ['statue', 'earth', 'flower'],
    ],
    [
      ['earth', 'heal', 'rock'],
      ['wall', 'statue', 'earth'],
    ],
  ],
  Thoth: [
    [
      ['bird', 'book', 'glyph'],
      ['bird', 'book', 'eye'],
    ],
    [
      ['book', 'bird', 'scroll'],
      ['glyph', 'bird', 'arrow'],
    ],
    [
      ['bird', 'scroll', 'book'],
      ['eye', 'book', 'bird'],
    ],
  ],
  Tiamat: [
    [
      ['dragon', 'wave', 'wings'],
      ['dragon', 'reload', 'snake'],
    ],
    [
      ['wings', 'dragon', 'wave'],
      ['snake', 'dragon', 'water'],
    ],
    [
      ['dragon', 'snake', 'fire'],
      ['wave', 'wings', 'dragon'],
    ],
  ],
  Tyr: [
    [
      ['sword', 'scales', 'hand'],
      ['sword', 'reload', 'scales'],
    ],
    [
      ['hand', 'sword', 'scales'],
      ['scales', 'sword', 'shield'],
    ],
    [
      ['sword', 'shield', 'hand'],
      ['reload', 'hand', 'sword'],
    ],
  ],
  Vamana: [
    [
      ['umbrella', 'giant', 'dwarf'],
      ['giant', 'umbrella', 'reload'],
    ],
    [
      ['dwarf', 'umbrella', 'giant'],
      ['umbrella', 'giant', 'strength'],
    ],
    [
      ['giant', 'dwarf', 'umbrella'],
      ['strength', 'giant', 'umbrella'],
    ],
  ],
  'Xing Tian': [
    [
      ['axe', 'rage', 'headless'],
      ['axe', 'rage', 'cyclone'],
    ],
    [
      ['rage', 'axe', 'strength'],
      ['headless', 'axe', 'pluck'],
    ],
    [
      ['axe', 'cyclone', 'rage'],
      ['pluck', 'rage', 'axe'],
    ],
  ],
  'Yu Huang': [
    [
      ['dragon', 'crown', 'cloud'],
      ['dragon', 'crown', 'yin'],
    ],
    [
      ['crown', 'dragon', 'cloud'],
      ['cloud', 'dragon', 'fire'],
    ],
    [
      ['dragon', 'cloud', 'wand'],
      ['yin', 'crown', 'dragon'],
    ],
  ],
  'Zhong Kui': [
    [
      ['ghost', 'bag', 'brush'],
      ['bag', 'ghost', 'brush'],
    ],
    [
      ['brush', 'ghost', 'bag'],
      ['ghost', 'bag', 'fire'],
    ],
    [
      ['bag', 'brush', 'skull'],
      ['brush', 'fire', 'ghost'],
    ],
  ],
};

const EXTRA_GLYPHS = {
  angel: '😇',
  orb: '🔮',
  smoke: '💨',
  flame: '🔥',
  heal: '💚',
  bomb: '💣',
  explosion: '💥',
  trail: '✨',
  beam: '🔆',
  retrieve: '↩️',
  swarm: '🐝',
  cocoon: '🕸️',
  feast: '🍖',
  cave: '🕳️',
  tide: '🌊',
  maw: '🦷',
  scream: '😱',
  rift: '🌀',
  madness: '🤪',
  ocean: '🌊',
  berserk: '👹',
  greed: '🤑',
  joust: '🐎',
  reflect: '↩️',
  eight: '8️⃣',
  sand: '🏜️',
  grass: '🌿',
  island: '🏝️',
  pillow: '🛏️',
  pomegranate: '🍎',
  glyph: '📜',
  scroll: '📜',
  headless: '🫥',
  yin: '☯️',
  shell: '🐢',
  monster: '👹',
  giant: '🗿',
  meteor: '☄️',
  tremor: '🫨',
  mushroom: '🍄',
  green: '💚',
};

Object.assign(GLYPHS, EXTRA_GLYPHS);

function collectKeys(tables) {
  const keys = new Set();
  for (const table of tables) {
    for (const sets of Object.values(table)) {
      for (const set of sets) {
        for (const tier of set) {
          for (const k of tier) keys.add(k);
        }
      }
    }
  }
  return [...keys].sort();
}

function buildAssets(keys) {
  const assets = {};
  const missing = [];
  for (const key of keys) {
    if (ICON_KEYS.includes(key)) {
      assets[key] = {
        kind: 'icon',
        file: `${key}.svg`,
        glyph: GLYPHS[key] || '❓',
        flaticonSearch: key,
      };
    } else {
      const glyph = GLYPHS[key];
      if (!glyph) missing.push(key);
      else assets[key] = { kind: 'emoji', glyph };
    }
  }
  if (missing.length) throw new Error(`Missing glyphs: ${missing.join(', ')}`);
  return assets;
}

function toClueEntry(sets, game) {
  // Gamemode: Set A only (easy + hard). Ignore B/C until we re-enable rotation.
  const first = sets[0] ? [sets[0]] : [];
  return {
    game,
    sets: first.map(([easy, hard]) => ({ easy, hard })),
  };
}

function main() {
  fs.mkdirSync(ICONS, { recursive: true });
  for (const [name, svg] of Object.entries(ICON_SVGS)) {
    fs.writeFileSync(path.join(ICONS, `${name}.svg`), svg);
  }

  const clues = {};
  for (const [name, sets] of Object.entries(S2)) {
    clues[name] = toClueEntry(sets, 'smite2');
  }
  for (const [name, sets] of Object.entries(S1)) {
    clues[name] = toClueEntry(sets, 'smite1');
  }

  const keys = collectKeys([S2, S1]);
  const assets = buildAssets(keys);

  fs.writeFileSync(path.join(OUT, 'emoji-clues.json'), `${JSON.stringify(clues, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'clue-assets.json'), `${JSON.stringify(assets, null, 2)}\n`);

  // Visual catalog: every clue key rendered (emoji glyph + icon preview), plus per-god sets
  const catalogRows = Object.entries(assets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, a]) => {
      if (a.kind === 'icon') {
        return `<div class="asset"><img src="icons/${a.file}" alt="${key}"/><code>${key}</code><span class="tag">icon</span><span class="fallback">fallback ${a.glyph}</span></div>`;
      }
      return `<div class="asset"><div class="glyph">${a.glyph}</div><code>${key}</code><span class="tag">emoji</span></div>`;
    })
    .join('\n');

  const godCards = Object.entries(clues)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, entry]) => {
      const setsHtml = entry.sets
        .map((set, i) => {
          const render = (tier, label) => {
            const cells = tier
              .map((k) => {
                const a = assets[k];
                if (!a) return `<span class="miss">${k}</span>`;
                if (a.kind === 'icon') return `<span class="cell"><img src="icons/${a.file}" alt="${k}"/><small>${k}</small></span>`;
                return `<span class="cell"><span class="g">${a.glyph}</span><small>${k}</small></span>`;
              })
              .join('');
            return `<div class="tier"><b>${label}</b>${cells}</div>`;
          };
          return `<div class="set"><h4>Set ${i + 1}</h4>${render(set.easy, 'Easy')}${render(set.hard, 'Hard')}</div>`;
        })
        .join('');
      return `<article class="god" data-game="${entry.game}"><h3>${name} <span class="game">${entry.game}</span></h3>${setsHtml}</article>`;
    })
    .join('\n');

  const gallery = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Guess the Emoji — visual catalog</title>
  <style>
    body { margin: 0; background: #070b14; color: #e2e8f0; font-family: Segoe UI, system-ui, sans-serif; }
    h1, h2 { letter-spacing: 0.08em; padding: 16px 20px 4px; }
    p { color: #94a3b8; padding: 0 20px 12px; max-width: 56rem; line-height: 1.45; }
    .assets { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; padding: 0 16px 28px; }
    .asset { background: #0b1220; border: 1px solid rgba(125,211,252,0.35); border-radius: 10px; padding: 10px; text-align: center; }
    .glyph { font-size: 2rem; line-height: 1.4; }
    .asset img { width: 48px; height: 48px; }
    .asset code { display: block; font-size: 0.75rem; color: #7dd3fc; margin-top: 6px; word-break: break-all; }
    .tag { display: inline-block; margin-top: 4px; font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
    .fallback { display: block; font-size: 0.7rem; color: #64748b; margin-top: 2px; }
    .gods { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; padding: 0 16px 40px; }
    .god { background: #0b1220; border: 1px solid rgba(125,211,252,0.35); border-radius: 10px; padding: 12px; }
    .god h3 { margin: 0 0 8px; font-size: 1rem; letter-spacing: 0.06em; }
    .game { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
    .set { border-top: 1px solid #1e3a5f; padding-top: 8px; margin-top: 8px; }
    .set h4 { margin: 0 0 6px; color: #7dd3fc; font-size: 0.8rem; }
    .tier { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 6px; }
    .tier b { width: 42px; font-size: 0.7rem; color: #94a3b8; }
    .cell { display: inline-flex; flex-direction: column; align-items: center; min-width: 52px; }
    .cell .g { font-size: 1.6rem; }
    .cell img { width: 36px; height: 36px; }
    .cell small { font-size: 0.6rem; color: #64748b; }
    .miss { color: #f87171; font-size: 0.75rem; }
    .filters { padding: 0 20px 12px; display: flex; gap: 8px; flex-wrap: wrap; }
    .filters button { background: #0b1220; border: 1px solid rgba(125,211,252,0.42); color: #e2e8f0; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
    .filters button.active { background: #1e3a5f; color: #7dd3fc; }
  </style>
</head>
<body>
  <h1>GUESS THE EMOJI — VISUAL CATALOG</h1>
  <p>Open this file in a browser. Icon clues show the SVG preview (not just the filename). Emoji clues show the real glyph. Each god has 3 rotating sets (Easy + Hard).</p>
  <div class="filters">
    <button type="button" class="active" data-filter="all">All gods</button>
    <button type="button" data-filter="smite2">Smite 2</button>
    <button type="button" data-filter="smite1">Smite 1 only</button>
  </div>
  <h2>Clue assets (${Object.keys(assets).length})</h2>
  <div class="assets">
${catalogRows}
  </div>
  <h2>Gods (${Object.keys(clues).length})</h2>
  <div class="gods" id="gods">
${godCards}
  </div>
  <script>
    document.querySelectorAll('.filters button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filters button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        document.querySelectorAll('.god').forEach((el) => {
          el.style.display = f === 'all' || el.dataset.game === f ? '' : 'none';
        });
      });
    });
  </script>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, 'index.html'), gallery);

  // Two Smite-2-only friend-review sheets (A–M / N–Z) for screenshots
  const s2Entries = Object.entries(clues)
    .filter(([, e]) => e.game === 'smite2')
    .sort(([a], [b]) => a.localeCompare(b));
  const mid = Math.ceil(s2Entries.length / 2);
  const parts = [
    { file: 's2-review-part1.html', title: 'Smite 2 Emoji Sets — Part 1 (A–M)', rows: s2Entries.slice(0, mid) },
    { file: 's2-review-part2.html', title: 'Smite 2 Emoji Sets — Part 2 (N–Z)', rows: s2Entries.slice(mid) },
  ];

  function renderGodCard([name, entry]) {
    const setsHtml = entry.sets
      .map((set, i) => {
        const render = (tier, label) => {
          const cells = tier
            .map((k) => {
              const a = assets[k];
              if (!a) return `<span class="miss">${k}</span>`;
              if (a.kind === 'icon') {
                return `<span class="cell"><img src="icons/${a.file}" alt="${k}"/><small>${k}</small></span>`;
              }
              return `<span class="cell"><span class="g">${a.glyph}</span><small>${k}</small></span>`;
            })
            .join('');
          return `<div class="tier"><b>${label}</b>${cells}</div>`;
        };
        return `<div class="set"><h4>Set ${i + 1}</h4>${render(set.easy, 'Easy')}${render(set.hard, 'Hard')}</div>`;
      })
      .join('');
    return `<article class="god"><h3>${name}</h3>${setsHtml}</article>`;
  }

  const reviewCss = `
    body { margin: 0; background: #070b14; color: #e2e8f0; font-family: Segoe UI, system-ui, sans-serif; }
    h1 { font-size: 1.15rem; letter-spacing: 0.1em; padding: 18px 18px 6px; }
    p { color: #94a3b8; padding: 0 18px 14px; margin: 0; font-size: 0.9rem; }
    .gods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 14px 24px; }
    .god { background: #0b1220; border: 1px solid rgba(125,211,252,0.35); border-radius: 10px; padding: 10px; break-inside: avoid; }
    .god h3 { margin: 0 0 6px; font-size: 0.95rem; letter-spacing: 0.05em; }
    .set { border-top: 1px solid #1e3a5f; padding-top: 6px; margin-top: 6px; }
    .set h4 { margin: 0 0 4px; color: #7dd3fc; font-size: 0.72rem; }
    .tier { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 4px; }
    .tier b { width: 36px; font-size: 0.65rem; color: #94a3b8; }
    .cell { display: inline-flex; flex-direction: column; align-items: center; min-width: 44px; }
    .cell .g { font-size: 1.45rem; line-height: 1.2; }
    .cell img { width: 32px; height: 32px; }
    .cell small { font-size: 0.55rem; color: #64748b; }
    .miss { color: #f87171; font-size: 0.7rem; }
    @media (max-width: 1100px) { .gods { grid-template-columns: repeat(2, 1fr); } }
  `;

  for (const part of parts) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${part.title}</title>
  <style>${reviewCss}</style>
</head>
<body>
  <h1>${part.title}</h1>
  <p>${part.rows.length} Smite 2 gods · 3 rotating sets each (Easy + Hard). Icons show SVG preview.</p>
  <div class="gods">
${part.rows.map(renderGodCard).join('\n')}
  </div>
</body>
</html>`;
    fs.writeFileSync(path.join(OUT, part.file), html);
  }

  // Flat JSON for quick review: key -> visible preview string
  const preview = {};
  for (const [key, a] of Object.entries(assets)) {
    preview[key] = a.kind === 'icon' ? { kind: 'icon', file: a.file, preview: a.glyph, note: 'see icons/' + a.file + ' or index.html' } : { kind: 'emoji', glyph: a.glyph };
  }
  fs.writeFileSync(path.join(OUT, 'clue-preview.json'), `${JSON.stringify(preview, null, 2)}\n`);

  fs.writeFileSync(
    path.join(OUT, 'ATTRIBUTION.md'),
    `# Guess the Emoji — asset attribution

## Unicode
Most clues use platform emoji glyphs.

## Kit prop icons (\`icons/*.svg\`)
Placeholder SVGs ship for: ${ICON_KEYS.join(', ')}.

Replace any of these with **free-with-attribution** downloads from [Flaticon](https://www.flaticon.com) (same filename), then add the author credit below.

| File | Suggested Flaticon search | Credit |
|------|---------------------------|--------|
${ICON_KEYS.map((k) => `| \`${k}.svg\` | ${k} | _add Flaticon author after download_ |`).join('\n')}

Do not scrape Flaticon. Manual free download + attribution only.

## Visual review
Open \`index.html\` in a browser to see every emoji glyph and every icon SVG rendered.
`
  );

  const s2 = Object.keys(S2).length;
  const s1 = Object.keys(S1).length;
  console.log(`Wrote ${s2} Smite2 + ${s1} Smite1 gods (${keys.length} clue keys, ${ICON_KEYS.length} icon SVGs).`);
  console.log(`Visual catalog: ${path.join(OUT, 'index.html')}`);
  console.log(`S2 review sheets: ${path.join(OUT, 's2-review-part1.html')} + s2-review-part2.html`);
}

main();
