/**
 * God specialization tags (role-style labels + melee/ranged + physical/magical).
 * Mirror `public/god-specializations.txt` — after editing that file, update the `JSON.parse(...)`
 * payload here (or run a small script to stringify the file) so the app bundle stays in sync.
 */
const GOD_SPECIALIZATION_TEXT = JSON.parse(
  '"Achilles: Tank, Brawler, Lockdown, Execute | Melee | Physical\\r\\nAgni: Nuker, Burst Damage, Sniper | Ranged | Magical\\r\\nAladdin: Slayer, Mobility, Burst Damage | Melee | Magical\\r\\nAmaterasu: Tank, Buffs, Brawler | Melee | Physical\\r\\nAnhur: Sharpshooter | Ranged | Physical\\r\\nAnubis: Nuker | Ranged | Magical\\r\\nAphrodite: Buffs, Healing, Sustain | Ranged | Magical\\r\\nApollo: Global, Constant Damage | Ranged | Physical\\r\\nAres: Tank, Buffs, Lockdown | Melee | Magical\\r\\nArtemis: Sharpshooter, Lockdown | Ranged | Physical\\r\\nArtio: Brawler, Lockdown | Melee | Magical\\r\\nAthena: Tank, Lockdown, Global | Melee | Magical\\r\\nAwilix: Slayer, Mobile | Melee | Physical\\r\\nBacchus: Tank, Lockdown, Mobile | Melee | Magical\\r\\nBaron Samedi: Healing | Ranged | Magical\\r\\nBellona: Tank, Brawler, Lockdown | Melee | Physical\\r\\nCabrakan: Tank, Area Control, Lockdown | Melee | Magical\\r\\nCerberus: Tank, Area Control, Pressure | Melee | Magical\\r\\nChaac: Tank, Nuker, Lockdown | Melee | Physical\\r\\nCharon: Tank, Global, Mobility | Ranged | Magical\\r\\nCernunnos: Sharpshooter, Nuker, Lockdown | Ranged | Physical\\r\\nChiron: Sharpshooter, Nuker | Ranged | Physical\\r\\nCupid: Healing | Ranged | Physical\\r\\nDa Ji: Mobility, Burst Damage | Melee | Physical\\r\\nDanzaburou: Sharpshooter, Nuker, Lockdown, Slayer | Ranged | Physical\\r\\nDiscordia: Nuker, Burst Damage | Ranged | Magical\\r\\nEset: Nuker, Buffs, Burst Damage | Ranged | Magical\\r\\nFenrir: Slayer, Lockdown, Mobile | Melee | Physical\\r\\nGanesha: Tank, Buffs, Area Control | Melee | Magical\\r\\nGeb: Tank, Area Control | Melee | Magical\\r\\nGilgamesh: Brawler, Constant Damage | Melee | Physical\\r\\nGuan Yu: Brawler, Pressure, Healing | Melee | Physical\\r\\nHades: Nuker, Lockdown, Mobile | Ranged | Magical\\r\\nHecate: Nuker, Buffs, Lockdown | Ranged | Magical\\r\\nHercules: Tank, Brawler, Lockdown | Melee | Physical\\r\\nHua Mulan: Tank, Brawler, Pressure | Melee | Physical\\r\\nHou Yi: Constant Damage | Ranged | Physical\\r\\nHun Batz: Slayer, Mobile | Melee | Physical\\r\\nIzanami: Constant Damage, Pressure, Burst Damage | Ranged | Physical\\r\\nIshtar: Sharpshooter, Constant Damage | Ranged | Physical\\r\\nJanus: Burst Damage | Ranged | Magical\\r\\nJing Wei: Sharpshooter, Mobile | Ranged | Physical\\r\\nJormungandr: Tank, Area Control, Global, Constant Damage | Melee | Magical\\r\\nKali: Pressure, Constant Damage, Sustain | Melee | Physical\\r\\nKhepri: Tank, Buffs, Lockdown | Melee | Magical\\r\\nKukulkan: Nuker | Ranged | Magical\\r\\nLoki: Slayer, Stealth | Melee | Physical\\r\\nMedusa: Lockdown, Pressure, Burst Damage | Ranged | Physical\\r\\nMercury: Mobile, Burst Damage | Melee | Physical\\r\\nMerlin: Nuker, Burst Damage | Ranged | Magical\\r\\nMorgan Le Fay: Nuker, Burst Damage | Ranged | Magical\\r\\nNemesis: Constant Damage, Mobile | Melee | Physical\\r\\nNeith: Sharpshooter, Nuker, Global | Ranged | Physical\\r\\nNu Wa: Nuker, Global, Stealth | Ranged | Magical\\r\\nNut: Sharpshooter, Nuker, Area Control | Ranged | Physical\\r\\nOdin: Tank, Mobile | Melee | Physical\\r\\nOsiris: Brawler, Constant Damage | Melee | Physical\\r\\nPele: Slayer, Mobile, Burst Damage | Melee | Physical\\r\\nPoseidon: Nuker, Area Control | Ranged | Magical\\r\\nPrincess Bari: Sharpshooter, Constant Damage, Mobile | Ranged | Physical\\r\\nRa: Buffs, Healing, Sniper | Ranged | Magical\\r\\nRama: Sharpshooter, Global, Sniper | Ranged | Physical\\r\\nRatatoskr: Slayer, Global, Mobile | Melee | Physical\\r\\nScylla: Nuker, Burst Damage | Ranged | Magical\\r\\nSobek: Tank, Lockdown, Execute | Melee | Magical\\r\\nSol: Sharpshooter, Nuker | Ranged | Magical\\r\\nSun Wukong: Pressure | Melee | Physical\\r\\nSusano: Slayer, Lockdown, Mobile | Melee | Physical\\r\\nSylvanus: Tank, Healing | Ranged | Magical\\r\\nThe Morrigan: Nuker, Slayer, Stealth | Ranged | Magical\\r\\nThanatos: Slayer, Global, Execute, Mobile | Melee | Physical\\r\\nThor: Slayer, Global, Mobile | Melee | Physical\\r\\nTsukuyomi: Slayer, Constant Damage, Mobile | Melee | Physical\\r\\nUllr: Lockdown, Pressure, Burst Damage | Ranged | Physical\\r\\nVulcan: Nuker, Pressure, Burst Damage | Ranged | Magical\\r\\nXbalanque: Global, Constant Damage, Mobile | Ranged | Physical\\r\\nYemoja: Tank, Healing | Ranged | Magical\\r\\nYmir: Tank, Brawler, Lockdown | Melee | Magical\\r\\nZeus: Sharpshooter, Nuker | Ranged | Magical\\r\\n"'
);

function normalizeName(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function parseSpecializationsText(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const c = t.indexOf(':');
    if (c <= 0) continue;
    const label = t.slice(0, c).trim();
    const rest = t.slice(c + 1).trim();
    const parts = rest.split('|').map((p) => p.trim());
    const specs = (parts[0] || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const rangeType = parts[1] || '';
    const damageType = parts[2] || '';
    map.set(normalizeName(label), { label, specs, rangeType, damageType });
  }
  return map;
}

/** App display names that differ from the primary line label in the txt file */
const NAME_ALIASES = {
  mulan: 'hua mulan',
  bari: 'princess bari',
};

let cachedMap = null;
function getMap() {
  if (!cachedMap) cachedMap = parseSpecializationsText(GOD_SPECIALIZATION_TEXT);
  return cachedMap;
}

/**
 * @param {object} god — builds god (name, GodName, title)
 * @returns {{ label: string, specs: string[], rangeType: string, damageType: string } | null}
 */
export function getGodSpecializationEntry(god) {
  if (!god) return null;
  const candidates = [god.name, god.GodName, god.title].filter(Boolean);
  const map = getMap();
  for (const c of candidates) {
    const n = normalizeName(c);
    const aliasTarget = NAME_ALIASES[n];
    const keysToTry = aliasTarget ? [aliasTarget, n] : [n];
    for (const k of keysToTry) {
      if (map.has(k)) return map.get(k);
    }
  }
  return null;
}
