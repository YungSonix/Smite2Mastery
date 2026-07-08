import { tightenMultilineGameText } from './alignedBulletText';
import { ABILITY_TOOLTIP_DETAIL, DEFAULT_ABILITY_TOOLTIP_DETAIL } from './abilityTooltipDetail';
import { getAbilityTooltipDescription, getGodTalentInfo } from './stringTableLookup';
import { splitTooltipProseAndBullets } from './tooltipTextSplit';
import {
  getGodKitAbility,
  listChangedTalentSlots,
  normalizeTalentLineupSlot,
} from './godTalentLineups';

function normalizeDetailLevel(detailLevel) {
  return detailLevel === ABILITY_TOOLTIP_DETAIL.MINIMAL
    ? ABILITY_TOOLTIP_DETAIL.MINIMAL
    : ABILITY_TOOLTIP_DETAIL.DESCRIPTIVE;
}

function cleanAspectName(name) {
  return String(name || '')
    .replace(/\*\*__|__\*\*/g, '')
    .trim();
}

function readAbilityBodies(god, ability, slot, levelIndex) {
  if (!ability) return null;
  const withSlot = { ...ability, abilitySlot: normalizeTalentLineupSlot(slot) || slot };
  const opts = { forceTalent: true, useTalent: true };
  const short =
    getAbilityTooltipDescription(
      god,
      withSlot,
      ABILITY_TOOLTIP_DETAIL.MINIMAL,
      levelIndex,
      opts
    ) || '';
  const full =
    getAbilityTooltipDescription(
      god,
      withSlot,
      ABILITY_TOOLTIP_DETAIL.DESCRIPTIVE,
      levelIndex,
      opts
    ) || short;
  const split = splitTooltipProseAndBullets(short);
  return {
    minimal: tightenMultilineGameText(split.minimal),
    descriptive: tightenMultilineGameText(full),
  };
}

function summaryForDetail(summary, detailLevel) {
  const mode = normalizeDetailLevel(detailLevel);
  const text = tightenMultilineGameText(summary);
  if (!text) return '';
  if (mode === ABILITY_TOOLTIP_DETAIL.MINIMAL) {
    return splitTooltipProseAndBullets(text).minimal;
  }
  return text;
}

/**
 * One-card talent tooltip: summary from Talents.json + changed abilities from lineup.
 */
export function buildKitTalentTooltipPackage(
  god,
  aspect = null,
  detailLevel = DEFAULT_ABILITY_TOOLTIP_DETAIL,
  levelIndex = 0
) {
  const mode = normalizeDetailLevel(detailLevel);
  const talentInfo = getGodTalentInfo(god);
  const fallbackName = aspect?.name ? cleanAspectName(aspect.name) : 'Talent';
  const fallbackSummary = aspect?.description ? String(aspect.description).trim() : '';

  const name = talentInfo?.name || fallbackName;
  const summaryRaw = talentInfo?.description || fallbackSummary;
  const summary = summaryForDetail(summaryRaw, mode);

  const changedAbilities = listChangedTalentSlots(god)
    .map((slot) => {
      const ability = getGodKitAbility(god, slot);
      const bodies = readAbilityBodies(god, ability, slot, levelIndex);
      if (!bodies) return null;
      const body = mode === ABILITY_TOOLTIP_DETAIL.MINIMAL ? bodies.minimal : bodies.descriptive;
      if (!body) return null;
      return {
        slot,
        name: ability?.name || slot,
        icon: ability?.icon || null,
        body,
      };
    })
    .filter(Boolean);

  return {
    name,
    summary,
    changedAbilities,
  };
}

/** Flat string fallback when structured sections are not rendered. */
export function buildKitTalentTooltipBody(god, aspect, detailLevel, levelIndex = 0) {
  const pkg = buildKitTalentTooltipPackage(god, aspect, detailLevel, levelIndex);
  if (!pkg) return 'No description available.';

  const parts = [];
  if (pkg.summary) parts.push(pkg.summary);
  pkg.changedAbilities.forEach((entry) => {
    parts.push(`${entry.name}\n${entry.body}`);
  });

  const text = parts.join('\n\n').trim();
  return text || 'No description available.';
}
