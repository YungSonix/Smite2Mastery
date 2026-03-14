/**
 * Prophecy card battle — leaders and units from Smite 2 gods.
 * id = godName for icon lookup via getRemoteGodIconByName.
 */

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const GOLD_PER_RARITY = { common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8 };

export const PROPHECY_LEADERS = [
  { id: 'Zeus', name: 'Zeus', pantheon: 'Greek', cls: 'Mage', hp: 120, atk: 18, ability: 'Lightning Surge: Zap a random enemy for 15 each turn.' },
  { id: 'Thor', name: 'Thor', pantheon: 'Norse', cls: 'Fighter', hp: 160, atk: 25, ability: 'Hammer Strike: Fighters deal +20% damage.' },
  { id: 'Athena', name: 'Athena', pantheon: 'Greek', cls: 'Guardian', hp: 200, atk: 15, ability: 'Divine Shield: Start with 30 bonus max HP.' },
  { id: 'Loki', name: 'Loki', pantheon: 'Norse', cls: 'Assassin', hp: 130, atk: 30, ability: 'Trickster: 25% chance to deal 1.5x damage.' },
  { id: 'Poseidon', name: 'Poseidon', pantheon: 'Greek', cls: 'Mage', hp: 140, atk: 16, ability: 'Tsunami: On turn 3, deal 10 to ALL enemies.' },
  { id: 'Odin', name: 'Odin', pantheon: 'Norse', cls: 'Fighter', hp: 170, atk: 22, ability: 'All-Father: Deployed units gain +10% HP.' },
  { id: 'Susano', name: 'Susano', pantheon: 'Japanese', cls: 'Assassin', hp: 140, atk: 28, ability: 'Storm Kata: Each attack this turn +5 damage.' },
  { id: 'Thanatos', name: 'Thanatos', pantheon: 'Greek', cls: 'Assassin', hp: 135, atk: 32, ability: 'Soul Reap: Heal 8 HP when you kill a unit.' },
  { id: 'Bellona', name: 'Bellona', pantheon: 'Roman', cls: 'Fighter', hp: 165, atk: 24, ability: 'War Goddess: Fighter units gain +2 ATK per rank.' },
  { id: 'Merlin', name: 'Merlin', pantheon: 'Arthurian', cls: 'Mage', hp: 135, atk: 20, ability: 'Arcane Mastery: Mages cost 1 less mana (min 1).' },
];

/** Unit cards: id = godName, rarity, class, cost (mana), bHp (base HP), bAtk (base ATK). */
export const PROPHECY_UNITS = [
  { id: 'Anhur', name: 'Anhur', rarity: 'common', cls: 'Hunter', cost: 1, bHp: 80, bAtk: 12 },
  { id: 'Chaac', name: 'Chaac', rarity: 'common', cls: 'Warrior', cost: 1, bHp: 110, bAtk: 9 },
  { id: 'Hades', name: 'Hades', rarity: 'common', cls: 'Mage', cost: 1, bHp: 75, bAtk: 11 },
  { id: 'Neith', name: 'Neith', rarity: 'common', cls: 'Hunter', cost: 1, bHp: 72, bAtk: 12 },
  { id: 'Ymir', name: 'Ymir', rarity: 'common', cls: 'Guardian', cost: 1, bHp: 130, bAtk: 7 },
  { id: 'Apollo', name: 'Apollo', rarity: 'uncommon', cls: 'Hunter', cost: 2, bHp: 85, bAtk: 15 },
  { id: 'Artio', name: 'Artio', rarity: 'uncommon', cls: 'Guardian', cost: 2, bHp: 120, bAtk: 10 },
  { id: 'Jing Wei', name: 'Jing Wei', rarity: 'uncommon', cls: 'Hunter', cost: 2, bHp: 84, bAtk: 16 },
  { id: 'Kali', name: 'Kali', rarity: 'uncommon', cls: 'Assassin', cost: 2, bHp: 78, bAtk: 18 },
  { id: 'Sobek', name: 'Sobek', rarity: 'uncommon', cls: 'Guardian', cost: 2, bHp: 140, bAtk: 10 },
  { id: 'Sun Wukong', name: 'Sun Wukong', rarity: 'uncommon', cls: 'Warrior', cost: 2, bHp: 100, bAtk: 14 },

  { id: 'Da Ji', name: 'Da Ji', rarity: 'rare', cls: 'Assassin', cost: 3, bHp: 90, bAtk: 24 },
  { id: 'Izanami', name: 'Izanami', rarity: 'rare', cls: 'Hunter', cost: 3, bHp: 98, bAtk: 21 },
  { id: 'Medusa', name: 'Medusa', rarity: 'rare', cls: 'Hunter', cost: 3, bHp: 102, bAtk: 20 },
  { id: 'Sol', name: 'Sol', rarity: 'rare', cls: 'Mage', cost: 3, bHp: 96, bAtk: 22 },
  { id: 'Achilles', name: 'Achilles', rarity: 'epic', cls: 'Warrior', cost: 4, bHp: 140, bAtk: 28 },
  { id: 'Amaterasu', name: 'Amaterasu', rarity: 'epic', cls: 'Warrior', cost: 4, bHp: 145, bAtk: 26 },
  { id: 'Artemis', name: 'Artemis', rarity: 'epic', cls: 'Hunter', cost: 4, bHp: 125, bAtk: 30 },
  { id: 'Merlin', name: 'Merlin', rarity: 'epic', cls: 'Mage', cost: 4, bHp: 118, bAtk: 34 },
  { id: 'Agni', name: 'Agni', rarity: 'legendary', cls: 'Mage', cost: 5, bHp: 160, bAtk: 40 },
  { id: 'Cerberus', name: 'Cerberus', rarity: 'legendary', cls: 'Guardian', cost: 5, bHp: 220, bAtk: 28 },
  { id: 'Guan Yu', name: 'Guan Yu', rarity: 'legendary', cls: 'Warrior', cost: 5, bHp: 200, bAtk: 36 },
  { id: 'Kukulkan', name: 'Kukulkan', rarity: 'legendary', cls: 'Mage', cost: 5, bHp: 155, bAtk: 44 },
];

export function getUnitsByRarity(maxRarityIndex) {
  const r = RARITY_ORDER.slice(0, (maxRarityIndex ?? 4) + 1);
  return PROPHECY_UNITS.filter((u) => r.includes(u.rarity));
}

export function getLeadersForSelect() {
  return PROPHECY_LEADERS;
}
