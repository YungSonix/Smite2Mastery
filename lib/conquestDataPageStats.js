/**
 * Conquest NPC stat helpers for Database → Game Modes → Conquest sections.
 * Values from Hemingway CT exports via conquestNpcStats + conquestMapScaling.
 */
import { CONQUEST_NPC_PROFILES } from '../app/data/Gamemodes/Conquest/conquestNpcStats';
import { computeConquestPoiStats } from './conquestMapScaling';

/** stackLevel 0 = 0:00, 1 = 3:00, … (matches existing campLevel / bossLevel UI). */
export function getConquestProfileDisplayStats(profileKey, stackLevel = 0) {
  const profile = CONQUEST_NPC_PROFILES[profileKey];
  if (!profile) return null;
  const gameTimeMinutes = Math.max(0, stackLevel) * 3;
  const stats = computeConquestPoiStats(profile, gameTimeMinutes);
  if (!stats) return null;

  const rows = [];
  if (stats.mode === 'boss_curve' || stats.mode === 'static') {
    if (stats.teamXp > 0) rows.push({ label: 'XP Reward', value: `${stats.teamXp} (Global)` });
    else if (stats.killerXp > 0) rows.push({ label: 'XP Reward', value: `${stats.killerXp}` });
    if (stats.teamGold > 0) rows.push({ label: 'Gold Reward', value: `${stats.teamGold} (Global)` });
    else if (stats.killerGold > 0) rows.push({ label: 'Gold Reward', value: `${stats.killerGold}` });
  } else if (stats.mode === 'camp_reward') {
    rows.push({ label: 'XP Reward', value: String(stats.killerXp) });
    rows.push({ label: 'Gold Reward', value: String(stats.killerGold) });
  }

  if (stats.hp > 0) rows.push({ label: 'Health', value: stats.hp.toLocaleString() });
  if (stats.prot > 0) rows.push({ label: 'Protections', value: String(stats.prot) });
  if (stats.power > 0) rows.push({ label: 'Power', value: String(stats.power) });

  return { profile, stats, rows, gameTimeMinutes, npcLevel: stats.level };
}

/** Database jungle-camp cards → CT profile keys (where export data exists). */
export const CONQUEST_DATA_JUNGLE_CAMP_PROFILES = {
  'alpha-buff': { key: 'camp_blue', label: 'Alpha Monster (Buff Camp)' },
  'alpha-mid': { key: 'camp_red', label: 'Alpha Monster (Mid Camp)' },
  oracle: { key: 'oracle', label: 'Oracle' },
  cyclops: { key: 'camp_cyclops', label: 'Cyclops Warrior' },
  scorpion: { key: 'camp_scorpion', label: 'Scorpion' },
  'rogue-cyclops': { key: 'camp_rogues', label: 'Rogue Cyclops' },
  'elder-harpy': { key: 'camp_trinket', label: 'Elder Harpy' },
};

export const CONQUEST_DATA_BOSS_PROFILES = {
  pyromancer: { key: 'pyromancer', label: 'Pyromancer' },
  'gold-fury': { key: 'gold_fury', label: 'Gold Fury' },
  'ancient-fury': { key: 'gold_fury', label: 'Ancient Fury' },
  'fire-giant': { key: 'fire_giant', label: 'Fire Giant' },
  'moonlight-queen': { key: 'moonlight_queen', label: 'Moonlight Queen' },
};

export const CONQUEST_DATA_STRUCTURE_PROFILES = {
  phoenix: { key: 'phoenix', label: 'Phoenix' },
  'tower-t1': { key: 'tower_t1', label: 'Tier 1 Tower' },
  'tower-t2': { key: 'tower_t2', label: 'Tier 2 Tower' },
  titan: { key: 'titan', label: 'Titan' },
};
