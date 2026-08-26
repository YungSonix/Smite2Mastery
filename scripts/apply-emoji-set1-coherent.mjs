/**
 * Apply coherent Set-1 overrides (Easy/Hard) after Model A + Model B review.
 * Rules:
 * - Each trio = one theme (kit family OR one lore beat), all 3 related
 * - Easy vs Hard share at most 1 token
 * - No wrong weapons; no modern helmet / Styx-water / sword for Achilles
 * - Game uses Set 1 only for now
 *
 * Run: node scripts/apply-emoji-set1-coherent.mjs
 * Then: npm run minigame:emoji-clues  (optional full regen) OR this patches JSON directly
 * Prefer: this script patches emoji-clues.json Set[0] in place, then refresh HTML via gen or local rewrite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLUES_PATH = path.join(ROOT, 'app/data/Minigames/god-emoji-guess/emoji-clues.json');
const ASSETS_PATH = path.join(ROOT, 'app/data/Minigames/god-emoji-guess/clue-assets.json');
const OUT = path.join(ROOT, 'app/data/Minigames/god-emoji-guess');

/** Final Set 1 after A↔B debate. Theme noted in comment keys. */
const SET1 = {
  Achilles: {
    easy: ['spear', 'shield', 'strength'],
    hard: ['heel', 'leg', 'execute'],
  },
  Agni: {
    easy: ['fire', 'smoke', 'comet'],
    hard: ['wave', 'hand', 'spark'],
  },
  'Ah Puch': {
    easy: ['skull', 'bone', 'fly'],
    hard: ['coffin', 'zombie', 'explosion'],
  },
  Aladdin: {
    easy: ['genie', 'lamp', 'sparkle'],
    hard: ['wall', 'shoes', 'three'],
  },
  Amaterasu: {
    easy: ['sun', 'mirror', 'sword'],
    hard: ['reload', 'shoes', 'crystal'],
  },
  Anhur: {
    easy: ['lion', 'spear', 'rock'],
    hard: ['desert', 'sand', 'spear'],
  },
  Anubis: {
    easy: ['dog', 'scales', 'urn'],
    hard: ['swarm', 'beam', 'hand'],
  },
  Aphrodite: {
    easy: ['kiss', 'heart', 'swan'],
    hard: ['bird', 'pluck', 'sparkle'],
  },
  Apollo: {
    easy: ['music', 'sun', 'bow'],
    hard: ['horse', 'dance', 'wings'],
  },
  Ares: {
    easy: ['chain', 'fire', 'pluck'],
    hard: ['shield', 'strength', 'flame'],
  },
  Artemis: {
    easy: ['boar', 'bow', 'stop'],
    hard: ['deer', 'moon', 'arrow'],
  },
  Artio: {
    easy: ['bear', 'leaf', 'two'],
    hard: ['heal', 'paw', 'tree'],
  },
  Athena: {
    easy: ['shield', 'spear', 'people'],
    hard: ['owl', 'wall', 'helmet'],
  },
  Atlas: {
    easy: ['galaxy', 'lift', 'earth'],
    hard: ['pluck', 'beam', 'strength'],
  },
  Awilix: {
    easy: ['leopard', 'moon', 'pluck'],
    hard: ['feather', 'shoes', 'lift'],
  },
  Bacchus: {
    easy: ['wine', 'grape', 'nausea'],
    hard: ['feast', 'wave', 'yawn'],
  },
  'Baron Samedi': {
    easy: ['hat', 'skull', 'cocktail'],
    hard: ['coffin', 'snake', 'whirl'],
  },
  Bastet: {
    easy: ['cat', 'whip', 'paw'],
    hard: ['shoes', 'blood', 'clone'],
  },
  Bellona: {
    easy: ['shield', 'hammer', 'whip'],
    hard: ['flag', 'bird', 'helmet'],
  },
  Cabrakan: {
    easy: ['earth', 'wall', 'shield'],
    hard: ['tremor', 'rock', 'mountain'],
  },
  Cerberus: {
    easy: ['dog', 'three', 'maw'],
    hard: ['poison', 'ghost', 'lift'],
  },
  Cernunnos: {
    easy: ['deer', 'leaf', 'bow'],
    hard: ['snow', 'sun', 'boar'],
  },
  Chaac: {
    easy: ['rain', 'axe', 'lightning'],
    hard: ['heal', 'storm', 'cloud'],
  },
  Charon: {
    easy: ['ship', 'coin', 'ghost'],
    hard: ['wave', 'fog', 'skull'],
  },
  Chiron: {
    easy: ['horse', 'bow', 'teacher'],
    hard: ['heal', 'star', 'arrow'],
  },
  Chronos: {
    easy: ['clock', 'gear', 'hourglass'],
    hard: ['reload', 'freeze', 'rift'],
  },
  Cupid: {
    easy: ['heart', 'bow', 'angel'],
    hard: ['bomb', 'heal', 'sleep'],
  },
  'Da Ji': {
    easy: ['fox', 'chain', 'blood'],
    hard: ['nine', 'fire', 'paw'],
  },
  Danzaburou: {
    easy: ['raccoon', 'money', 'leaf'],
    hard: ['clone', 'bomb', 'wine'],
  },
  Discordia: {
    easy: ['apple', 'masks', 'game'],
    hard: ['orb', 'invisible', 'sparkle'],
  },
  Eset: {
    easy: ['wings', 'staff', 'bird'],
    hard: ['orb', 'silence', 'crystal'],
  },
  Fenrir: {
    easy: ['wolf', 'chain', 'maw'],
    hard: ['giant', 'rage', 'moon'],
  },
  Ganesha: {
    easy: ['elephant', 'stop', 'lotus'],
    hard: ['prayer', 'wall', 'silence'],
  },
  Geb: {
    easy: ['earth', 'rock', 'shield'],
    hard: ['tremor', 'ball', 'pluck'],
  },
  Gilgamesh: {
    easy: ['leg', 'sword', 'brick'],
    hard: ['wind', 'shoes', 'strength'],
  },
  'Guan Yu': {
    easy: ['horse', 'spear', 'heal'],
    hard: ['green', 'dragon', 'strength'],
  },
  Hades: {
    easy: ['skull', 'whirl', 'dark'],
    hard: ['silence', 'heal', 'crown'],
  },
  Hecate: {
    easy: ['moon', 'three', 'wand'],
    hard: ['portal', 'dog', 'glyph'],
  },
  Hercules: {
    easy: ['strength', 'club', 'rock'],
    hard: ['heal', 'pluck', 'lion'],
  },
  Horus: {
    easy: ['bird', 'eye', 'shield'],
    hard: ['heal', 'lift', 'people'],
  },
  'Hou Yi': {
    easy: ['bow', 'sun', 'nine'],
    hard: ['rabbit', 'bird', 'arrow'],
  },
  'Hua Mulan': {
    easy: ['sword', 'spear', 'bow'],
    hard: ['flower', 'helmet', 'horse'],
  },
  'Hun Batz': {
    easy: ['monkey', 'wood', 'masks'],
    hard: ['ghost', 'lift', 'staff'],
  },
  Ishtar: {
    easy: ['star', 'bow', 'crown'],
    hard: ['lightning', 'sword', 'storm'],
  },
  Izanami: {
    easy: ['boomerang', 'ghost', 'scythe'],
    hard: ['invisible', 'portal', 'skull'],
  },
  Janus: {
    easy: ['door', 'portal', 'two'],
    hard: ['rift', 'wall', 'galaxy'],
  },
  'Jing Wei': {
    easy: ['bird', 'wave', 'rock'],
    hard: ['wind', 'bow', 'wings'],
  },
  Jormungandr: {
    easy: ['snake', 'poison', 'earth'],
    hard: ['wave', 'maw', 'ocean'],
  },
  Kali: {
    easy: ['tongue', 'dagger', 'skull'],
    hard: ['four', 'dance', 'blood'],
  },
  Khepri: {
    easy: ['bug', 'sun', 'recycle'],
    hard: ['shield', 'pluck', 'heal'],
  },
  Kukulkan: {
    easy: ['snake', 'wind', 'cyclone'],
    hard: ['wings', 'whirl', 'storm'],
  },
  Loki: {
    easy: ['dagger', 'invisible', 'clone'],
    hard: ['masks', 'snake', 'dark'],
  },
  Medusa: {
    easy: ['snake', 'eye', 'statue'],
    hard: ['bow', 'poison', 'arrow'],
  },
  Mercury: {
    easy: ['shoes', 'wind', 'wings'],
    hard: ['fist', 'bag', 'pluck'],
  },
  Merlin: {
    easy: ['fire', 'freeze', 'staff'],
    hard: ['three', 'wizard', 'crystal'],
  },
  Mordred: {
    easy: ['two', 'sword', 'blood'],
    hard: ['rage', 'execute', 'helmet'],
  },
  'Morgan Le Fay': {
    easy: ['dragon', 'wand', 'fire'],
    hard: ['sword', 'fog', 'witch'],
  },
  Neith: {
    easy: ['thread', 'bow', 'web'],
    hard: ['heal', 'galaxy', 'arrow'],
  },
  Nemesis: {
    easy: ['scales', 'sword', 'mirror'],
    hard: ['execute', 'shield', 'dark'],
  },
  'Ne Zha': {
    easy: ['ring', 'spear', 'lotus'],
    hard: ['fire', 'wind', 'shoes'],
  },
  'Nu Wa': {
    easy: ['fog', 'people', 'rock'],
    hard: ['snake', 'fire', 'crystal'],
  },
  Nut: {
    easy: ['galaxy', 'star', 'night'],
    hard: ['comet', 'rift', 'two'],
  },
  Odin: {
    easy: ['raven', 'spear', 'ring'],
    hard: ['wall', 'eye', 'shield'],
  },
  Osiris: {
    easy: ['zombie', 'scythe', 'wheat'],
    hard: ['whip', 'thread', 'bone'],
  },
  Pele: {
    easy: ['volcano', 'fire', 'hibiscus'],
    hard: ['lightning', 'shoes', 'rock'],
  },
  Poseidon: {
    easy: ['wave', 'trident', 'octopus'],
    hard: ['whirl', 'tide', 'pluck'],
  },
  'Princess Bari': {
    easy: ['bell', 'heal', 'flower'],
    hard: ['ghost', 'dance', 'people'],
  },
  Ra: {
    easy: ['sun', 'bird', 'beam'],
    hard: ['heal', 'eye', 'light'],
  },
  Rama: {
    easy: ['bow', 'crown', 'monkey'],
    hard: ['star', 'three', 'shoes'],
  },
  Ratatoskr: {
    easy: ['squirrel', 'nut', 'tree'],
    hard: ['dart', 'shoes', 'three'],
  },
  Scylla: {
    easy: ['girl', 'dog', 'wave'],
    hard: ['monster', 'maw', 'four'],
  },
  Sobek: {
    easy: ['crocodile', 'wave', 'pluck'],
    hard: ['heal', 'tide', 'strength'],
  },
  Sol: {
    easy: ['sun', 'fire', 'spark'],
    hard: ['heal', 'explosion', 'dance'],
  },
  'Sun Wukong': {
    easy: ['monkey', 'staff', 'cloud'],
    hard: ['clone', 'masks', 'bird'],
  },
  Susano: {
    easy: ['sword', 'cyclone', 'storm'],
    hard: ['pluck', 'three', 'snake'],
  },
  Sylvanus: {
    easy: ['tree', 'leaf', 'pluck'],
    hard: ['heal', 'flower', 'frog'],
  },
  Thanatos: {
    easy: ['scythe', 'wings', 'execute'],
    hard: ['blood', 'silence', 'heal'],
  },
  'The Morrigan': {
    easy: ['raven', 'masks', 'clone'],
    hard: ['invisible', 'fog', 'three'],
  },
  Thor: {
    easy: ['hammer', 'lightning', 'wall'],
    hard: ['boomerang', 'cyclone', 'storm'],
  },
  Tsukuyomi: {
    easy: ['moon', 'ninja', 'star'],
    hard: ['chain', 'scythe', 'dark'],
  },
  Ullr: {
    easy: ['bow', 'axe', 'snow'],
    hard: ['two', 'shoes', 'arrow'],
  },
  Vulcan: {
    easy: ['hammer', 'gear', 'fire'],
    hard: ['bomb', 'robot', 'explosion'],
  },
  Xbalanque: {
    easy: ['night', 'dart', 'poison'],
    hard: ['ball', 'two', 'moon'],
  },
  Yemoja: {
    easy: ['water', 'wave', 'heal'],
    hard: ['ring', 'wall', 'moon'],
  },
  Ymir: {
    easy: ['ice', 'wall', 'freeze'],
    hard: ['club', 'giant', 'snow'],
  },
  Zeus: {
    easy: ['lightning', 'cloud', 'spark'],
    hard: ['chain', 'three', 'explosion'],
  },
};

const EXTRA_GLYPHS = {
  bandage: '🩹',
  rocket: '🚀',
  metal: '🔩',
  fan: '🪭',
  maw: '🦷',
  sleep: '😴',
  yawn: '🥱',
  feast: '🍖',
  swarm: '🐝',
  silence: '🤫',
  light: '💡',
  sand: '🏜️',
  ocean: '🌊',
  tide: '🌊',
  fly: '🪰',
  flame: '🔥',
  horn: '📯',
  metal_bar: '🔩',
};

function main() {
  const clues = JSON.parse(fs.readFileSync(CLUES_PATH, 'utf8'));
  const assets = JSON.parse(fs.readFileSync(ASSETS_PATH, 'utf8'));

  for (const [key, glyph] of Object.entries(EXTRA_GLYPHS)) {
    if (!assets[key]) assets[key] = { kind: 'emoji', glyph };
  }

  let patched = 0;
  const missingKeys = new Set();
  for (const [name, pair] of Object.entries(SET1)) {
    if (!clues[name]) {
      console.warn(`Missing god in clues: ${name}`);
      continue;
    }
    const sets = clues[name].sets || [];
    while (sets.length < 1) sets.push({ easy: [], hard: [] });
    sets[0] = { easy: pair.easy, hard: pair.hard };
    clues[name].sets = sets;
    patched += 1;
    for (const k of [...pair.easy, ...pair.hard]) {
      if (!assets[k]) missingKeys.add(k);
    }
  }

  if (missingKeys.size) {
    // Prefer fail loud
    throw new Error(`Missing clue-assets keys: ${[...missingKeys].sort().join(', ')}`);
  }

  // Overlap check: easy/hard should share ≤1
  const badOverlap = [];
  for (const [name, pair] of Object.entries(SET1)) {
    const shared = pair.easy.filter((k) => pair.hard.includes(k));
    if (shared.length > 1) badOverlap.push(`${name}: ${shared.join(',')}`);
  }
  if (badOverlap.length) {
    console.warn('Easy/Hard share >1 token:\n' + badOverlap.join('\n'));
  }

  fs.writeFileSync(CLUES_PATH, `${JSON.stringify(clues, null, 2)}\n`);
  fs.writeFileSync(ASSETS_PATH, `${JSON.stringify(assets, null, 2)}\n`);

  // Set-1-only friend review HTML (2 parts)
  const s2 = Object.entries(clues)
    .filter(([, e]) => e.game === 'smite2')
    .sort(([a], [b]) => a.localeCompare(b));
  const mid = Math.ceil(s2.length / 2);

  function cell(k) {
    const a = assets[k];
    if (!a) return `<span class="miss">${k}</span>`;
    if (a.kind === 'icon') {
      return `<span class="cell"><img src="icons/${a.file}" alt="${k}"/><small>${k}</small></span>`;
    }
    return `<span class="cell"><span class="g">${a.glyph}</span><small>${k}</small></span>`;
  }

  function card([name, entry]) {
    const set = entry.sets[0];
    const easy = set.easy.map(cell).join('');
    const hard = set.hard.map(cell).join('');
    return `<article class="god"><h3>${name}</h3>
      <div class="tier"><b>Easy</b>${easy}</div>
      <div class="tier"><b>Hard</b>${hard}</div>
    </article>`;
  }

  const css = `
    body { margin: 0; background: #070b14; color: #e2e8f0; font-family: Segoe UI, system-ui, sans-serif; }
    h1 { font-size: 1.1rem; letter-spacing: 0.08em; padding: 16px 16px 4px; }
    p { color: #94a3b8; padding: 0 16px 12px; margin: 0; font-size: 0.85rem; }
    .gods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 14px 24px; }
    .god { background: #0b1220; border: 1px solid rgba(125,211,252,0.35); border-radius: 10px; padding: 10px; }
    .god h3 { margin: 0 0 8px; font-size: 0.95rem; }
    .tier { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 6px; }
    .tier b { width: 40px; font-size: 0.65rem; color: #94a3b8; }
    .cell { display: inline-flex; flex-direction: column; align-items: center; min-width: 48px; }
    .cell .g { font-size: 1.5rem; line-height: 1.2; }
    .cell img { width: 32px; height: 32px; }
    .cell small { font-size: 0.55rem; color: #64748b; }
    .miss { color: #f87171; }
  `;

  const parts = [
    { file: 's2-review-part1.html', title: 'Smite 2 — Set 1 only (Part 1)', rows: s2.slice(0, mid) },
    { file: 's2-review-part2.html', title: 'Smite 2 — Set 1 only (Part 2)', rows: s2.slice(mid) },
  ];
  for (const part of parts) {
    fs.writeFileSync(
      path.join(OUT, part.file),
      `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${part.title}</title><style>${css}</style></head>
<body><h1>${part.title}</h1>
<p>${part.rows.length} gods · Set 1 Easy + Hard only · each trio is one coherent theme</p>
<div class="gods">${part.rows.map(card).join('\n')}</div></body></html>`
    );
  }

  console.log(`Patched Set 1 for ${patched} Smite 2 gods.`);
  console.log(`Wrote ${parts.map((p) => p.file).join(' + ')}`);
}

main();
