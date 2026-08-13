/**
 * Conquest jungle camp reward scaling + boss curve interpolation.
 */

import {
  formatBuffInfamyLevelsBlock,
  getNonBuffHelpKeys,
  getPrimaryBuffHelpText,
} from './conquestBuffInfamy';
import { joinHelpTips } from './conquestMapHelpText';

/** +1 stack every 3 minutes of match time. */
export function getScalingStacks(gameTimeMinutes) {
  const minutes = Math.max(0, Number(gameTimeMinutes) || 0);
  return Math.floor(minutes / 3);
}

/** NPC level from match time (curve tables use level as Time axis). */
export function getNpcLevelFromMinutes(gameTimeMinutes, maxLevel = 25) {
  const stacks = getScalingStacks(gameTimeMinutes);
  return Math.min(maxLevel, 1 + stacks);
}

/** Linear interpolate curve [[time, value], ...] at time T. */
export function interpolateCurve(curve, time) {
  if (!curve?.length) return 0;
  const t = Number(time);
  if (t <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < curve.length - 1; i += 1) {
    const [t0, v0] = curve[i];
    const [t1, v1] = curve[i + 1];
    if (t >= t0 && t <= t1) {
      const ratio = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * ratio;
    }
  }
  return last[1];
}

export function scaleCampReward(base, gameTimeMinutes, { xpPct = 0.08, goldPct = 0.02 } = {}) {
  const stacks = getScalingStacks(gameTimeMinutes);
  const xp = Math.floor(base * (1 + xpPct * stacks));
  const gold = Math.floor(base * (1 + goldPct * stacks));
  return { xp, gold, stacks };
}

/**
 * @param {import('../app/data/Gamemodes/Conquest/conquestNpcStats').ConquestNpcProfile|null} profile
 * @param {number} gameTimeMinutes
 */
export function computeConquestPoiStats(profile, gameTimeMinutes) {
  if (!profile) return null;
  if (profile.scaling === 'objective') return { mode: 'objective', level: 0, stacks: 0 };

  const level = getNpcLevelFromMinutes(gameTimeMinutes);
  const curves = profile.curves || {};
  const hp = Math.round(interpolateCurve(curves.MaxHealth, level));
  const power = Math.round(interpolateCurve(curves.PhysicalPower, level));
  const prot = Math.round(interpolateCurve(curves.PhysicalProtection, level));

  if (profile.scaling === 'boss_curve') {
    const teamXp = Math.round(interpolateCurve(curves.TeamXPReward, level));
    const teamGold = Math.round(interpolateCurve(curves.TeamGoldReward, level));
    return {
      mode: profile.scaling,
      level,
      stacks: getScalingStacks(gameTimeMinutes),
      hp,
      power,
      prot,
      teamXp,
      teamGold,
      killerXp: 0,
      killerGold: 0,
    };
  }

  if (profile.scaling === 'static') {
    const teamGold = Math.round(interpolateCurve(curves.TeamGoldReward, level));
    const killerXp = Math.round(interpolateCurve(curves.KillerXPReward, level));
    return {
      mode: profile.scaling,
      level,
      stacks: getScalingStacks(gameTimeMinutes),
      hp,
      power,
      prot,
      teamGold: teamGold || profile.base.teamGold,
      killerXp: killerXp || profile.base.xp,
      killerGold: profile.base.gold,
    };
  }

  const killerXp = scaleCampReward(profile.base.xp, gameTimeMinutes).xp;
  const killerGold = scaleCampReward(profile.base.gold, gameTimeMinutes).gold;

  return {
    mode: 'camp_reward',
    level,
    stacks: getScalingStacks(gameTimeMinutes),
    hp,
    power,
    prot,
    killerXp,
    killerGold,
    baseXp: profile.base.xp,
    baseGold: profile.base.gold,
  };
}

export function formatConquestStatsBlock(stats, profile) {
  if (!stats) return '';
  if (stats.mode === 'objective') return '';

  const lines = [];
  if (stats.hp > 0) lines.push(`HP: ${stats.hp.toLocaleString()}`);
  if (stats.power > 0) lines.push(`Power: ${stats.power}`);
  if (stats.prot > 0) lines.push(`Protections: ${stats.prot}`);

  if (stats.mode === 'boss_curve') {
    if (stats.teamXp > 0) lines.push(`Team XP: ${stats.teamXp}`);
    if (stats.teamGold > 0) lines.push(`Team Gold: ${stats.teamGold}`);
  } else if (stats.mode === 'static') {
    if (stats.killerXp > 0) lines.push(`XP: ${stats.killerXp}`);
    if (stats.teamGold > 0) lines.push(`Team Gold: ${stats.teamGold}`);
  } else {
    lines.push(`XP: ${stats.killerXp} (base ${stats.baseXp})`);
    lines.push(`Gold: ${stats.killerGold} (base ${stats.baseGold})`);
  }

  return lines.join('\n');
}

/** Sample reward rows for tooltip (0, 3, 6, 9 min). */
export function sampleCampRewardRows(baseXp, baseGold, minutes = [0, 3, 6, 9, 12]) {
  return minutes.map((m) => {
    const xp = scaleCampReward(baseXp, m).xp;
    const gold = scaleCampReward(baseGold, m).gold;
    return `${m} min — ${xp} XP, ${gold} Gold`;
  });
}

export function formatRewardScalingLegend() {
  return (
    'Jungle camps scale rewards over time (+8% XP and +2% Gold per 3 minutes).\n' +
    'Gold Fury and Fire Giant use their own curve-table scaling instead.'
  );
}

export function formatStatsSection(stats, profile, gameTimeMinutes) {
  if (!stats) return '';
  const header = `Stats @ ${gameTimeMinutes} min (NPC level ${stats.level})`;
  const body = formatConquestStatsBlock(stats, profile);
  return `${header}\n${body}`;
}

/** @param {ReturnType<typeof computeConquestPoiStats>} stats */
export function formatHoverStatLine(stats, blueprintMeta) {
  if (blueprintMeta?.pickup || blueprintMeta?.objective) {
    return blueprintMeta.buff ? `${blueprintMeta.buff} · ${blueprintMeta.colorLabel || 'Objective'}` : 'Objective';
  }
  if (!stats || stats.mode === 'objective') return blueprintMeta?.roleNote || '';
  if (stats.mode === 'boss_curve') {
    return `${stats.hp.toLocaleString()} HP · ${stats.teamGold} team gold`;
  }
  if (stats.mode === 'static') {
    const bits = [];
    if (stats.hp) bits.push(`${stats.hp.toLocaleString()} HP`);
    if (stats.killerXp) bits.push(`${stats.killerXp} XP`);
    if (stats.teamGold) bits.push(`${stats.teamGold} team gold`);
    return bits.join(' · ');
  }
  return `${stats.killerXp} XP · ${stats.killerGold} gold · ${stats.hp.toLocaleString()} HP`;
}

/**
 * Short "what it does" summary: buff name, tier-1 buff description, and the
 * current reward line. The Descriptive view uses buildConquestTooltipBody.
 */
export function buildConquestTooltipMinimalBody({ stats, gameTimeMinutes, blueprintMeta, helpTipKeys }) {
  const parts = [];
  if (blueprintMeta?.buff) {
    parts.push(`Buff: ${blueprintMeta.buff}${blueprintMeta.colorLabel ? ` (${blueprintMeta.colorLabel})` : ''}`);
  }
  const buffText = getPrimaryBuffHelpText(helpTipKeys);
  if (buffText) parts.push(buffText);
  else if (blueprintMeta?.description) parts.push(blueprintMeta.description);
  else if (blueprintMeta?.roleNote) parts.push(blueprintMeta.roleNote);
  const statLine = formatHoverStatLine(stats, blueprintMeta);
  if (statLine && stats && stats.mode !== 'objective') {
    parts.push(`At ${gameTimeMinutes} min: ${statLine}`);
  }
  return parts.filter(Boolean).join('\n\n') || 'No summary available yet.';
}

export function buildConquestTooltipBody({ point, profile, stats, gameTimeMinutes, helpText, descriptionExtra, blueprintMeta }) {
  const parts = [];
  if (blueprintMeta?.roleNote) parts.push(blueprintMeta.roleNote);
  if (blueprintMeta?.description) parts.push(blueprintMeta.description);

  const buffLevels = formatBuffInfamyLevelsBlock(point?.helpTipKeys);
  if (buffLevels) {
    parts.push(buffLevels);
    const extraHelp = joinHelpTips(getNonBuffHelpKeys(point?.helpTipKeys));
    if (extraHelp) parts.push(extraHelp);
  } else if (helpText) {
    parts.push(helpText);
  }

  if (descriptionExtra) parts.push(descriptionExtra);
  const statSection = formatStatsSection(stats, profile, gameTimeMinutes);
  if (statSection) parts.push(statSection);
  return parts.filter(Boolean).join('\n\n') || 'No description available yet.';
}
