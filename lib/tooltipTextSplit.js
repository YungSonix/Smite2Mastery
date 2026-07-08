import { tightenMultilineGameText } from './alignedBulletText';
import { ABILITY_TOOLTIP_DETAIL } from './abilityTooltipDetail';

function isBulletLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;
  return (
    /^[\u2022•]\s/.test(trimmed) ||
    /^-\s+/.test(trimmed) ||
    /^\*\s+/.test(trimmed) ||
    /^\s{2,}[\u2022•]/.test(String(line || ''))
  );
}

/** Split game tooltip copy into opening prose vs bullet/detail lines. */
export function splitTooltipProseAndBullets(text) {
  const tightened = tightenMultilineGameText(text);
  if (!tightened) {
    return { prose: '', bullets: [], minimal: '', descriptive: '' };
  }

  const lines = tightened.split('\n');
  const proseParts = [];
  const bulletLines = [];
  let inBullets = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (isBulletLine(line)) {
      inBullets = true;
      bulletLines.push(trimmed.replace(/^[\u2022•\-*]\s*/, '').trim());
    } else if (!inBullets) {
      proseParts.push(trimmed);
    } else {
      bulletLines.push(trimmed);
    }
  });

  const prose = proseParts.join(' ');
  const minimal = prose || lines.find((l) => l.trim())?.trim() || tightened;
  const descriptive =
    bulletLines.length > 0
      ? [prose, ...bulletLines.map((b) => `• ${b}`)].filter(Boolean).join('\n')
      : tightened;

  return { prose, bullets: bulletLines, minimal, descriptive };
}

export function formatTooltipTextForDetail(text, detailLevel) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const isMinimal = detailLevel === ABILITY_TOOLTIP_DETAIL.MINIMAL;
  if (!isMinimal) return raw;
  return splitTooltipProseAndBullets(raw).minimal;
}
