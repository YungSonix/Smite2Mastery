const path = require('path');
const sharp = require('sharp');
const { CARD_FRAME, REGIONS, absRegion, gridCellRects, loadoutFrameDefaults } = require('./godRenderUiRegions');
const { normalizeTierLabel, tierBadgeRelPath, masteryEmblemRelPath } = require('./godRenderTiers');
const {
  matchTierBadge,
  detectSelectedGridIndex,
  detectGridCellBadge,
  detectMasteryRankBadge,
} = require('./godRenderMatch');
const { ocrCrop } = require('./godRenderOcr');
const { parseSkinInformation, informationSetsCrossGen } = require('./godRenderSkinInformation');

const MASTERY_NAMES = new Set(['light', 'onyx', 'opal', 'shadow', 'radiant']);

function parseCostText(text) {
  const raw = String(text || '').toUpperCase();
  if (/EQUIPPED|DEFAULT\s*SKIN|FREE/i.test(raw)) {
    return { currency: 'diamonds', amount: '0', owned: true };
  }
  if (/GO\s*TO/i.test(raw)) {
    return { currency: null, amount: null, navigateOnly: true };
  }
  const num = raw.replace(/[^\d]/g, '');
  if (num) return { currency: 'diamonds', amount: num, owned: false };
  return null;
}

function parseUnlockBlurb(text) {
  const raw = String(text || '');
  const upper = raw.toUpperCase();
  const unlock = {};
  if (/ASCENSION\s*REWARD|ASCENSION\s*PASS/i.test(upper)) {
    unlock.source = 'ascension';
    unlock.requiresAscensionPass = true;
  }
  if (/TRAVELER\s*COLLECTION/i.test(upper)) {
    unlock.source = unlock.source || 'traveler';
  }
  if (/SPECIAL:/i.test(raw)) unlock.source = unlock.source || 'event';
  if (/RARE:/i.test(raw)) unlock.rarityNote = 'Rare';
  if (/appear on special|special occasion|specific event/i.test(raw)) {
    unlock.rarityNote = 'Rare';
    unlock.source = unlock.source || 'event';
  }
  if (/INSTANTLY UNLOCKED/i.test(upper)) {
    unlock.source = unlock.source || 'ascension';
    unlock.requiresAscensionPass = true;
  }
  if (/PRISM:/i.test(raw)) unlock.prismNote = true;
  if (/CLASSIC:/i.test(raw)) unlock.classicNote = true;
  return Object.keys(unlock).length ? unlock : null;
}

function buildUnlockDisplayText(unlock, cost) {
  if (!unlock || typeof unlock !== 'object') {
    if (cost?.owned) return 'Default god skin';
    return null;
  }
  if (unlock.source === 'base') return 'Default god skin';
  if (unlock.source === 'ascension' && unlock.masteryRank) {
    const rankLabel = unlock.masteryRank === 10 ? 'X (Radiant)' : 'V';
    return `Ascension reward — requires Mastery rank ${rankLabel}`;
  }
  if (unlock.prismNote) return 'Prism variant';
  if (unlock.source === 'traveler') return 'Traveler Collection';
  if (unlock.source === 'event') return 'Special event';
  if (unlock.requiresAscensionPass && unlock.rarityNote === 'Rare') {
    return 'Ascension Pass — rare skin (may appear in events)';
  }
  if (unlock.requiresAscensionPass && !unlock.masteryRank) {
    return 'Unlocked with Ascension Pass';
  }
  return null;
}

function enrichUnlock(unlock, cost, isBaseSkin) {
  const out = unlock && typeof unlock === 'object' ? { ...unlock } : {};
  if (isBaseSkin) {
    out.source = 'base';
  }
  if (out.masteryRank) {
    out.masteryEmblem = masteryEmblemRelPath(out.masteryRank);
  }
  const displayText = buildUnlockDisplayText(out, cost);
  if (displayText) out.displayText = displayText;
  return Object.keys(out).length ? out : null;
}

function enrichGridBadge(gridBadge) {
  if (!gridBadge) return null;
  const badge = { ...gridBadge };
  if (badge.type === 'masteryRank' && badge.rank) {
    badge.emblemPath = masteryEmblemRelPath(badge.rank);
  }
  return badge;
}

function normalizeSkinDisplayName(raw, godName) {
  let name = String(raw || '').trim();
  if (!name) return null;
  name = name.replace(new RegExp(`^${godName}\\s*[-–—]?\\s*`, 'i'), '').trim();
  if (/^DEFAULT\s*SKIN$/i.test(name)) return 'Base';
  return name;
}

function inferMasteryFromName(displayName) {
  const key = String(displayName || '').trim().toLowerCase();
  if (key === 'shadow') return null;
  if (key === 'radiant') return { rank: 10, requiresAscensionPass: true };
  if (MASTERY_NAMES.has(key) && key !== 'radiant') {
    return { rank: 5, requiresAscensionPass: true };
  }
  return null;
}

function cleanOcrText(raw) {
  const s = String(raw || '')
    .replace(/[|]/g, 'I')
    .replace(/[""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length < 2) return null;
  if (/^[^a-zA-Z0-9:–—-]+$/.test(s)) return null;
  return s;
}

function isLikelyGoodSkinOcr(text) {
  const s = cleanOcrText(text);
  if (!s) return false;
  if (/DEFAULT/i.test(s)) return true;
  if (/^(i+|o+|e+|ee|rs|a)\s*$/i.test(s)) return false;
  if (/^(i|o|a)\s+SKIN$/i.test(s)) return false;
  if (!/[A-Za-z]{4,}/.test(s)) return false;
  return true;
}

function inferTierFromContext(tierLineRaw, unlockRaw, tierMatch, cost) {
  if (tierMatch?.tierId) return tierMatch.tierId;
  const fromLabel = normalizeTierLabel(tierLineRaw);
  if (fromLabel) return fromLabel;
  const u = String(unlockRaw || '').toUpperCase();
  const t = String(tierLineRaw || '').toUpperCase();
  if (/PRISM/.test(t) || /PRISM/.test(u)) return 'Prisms';
  if (/CLASSIC|TRAVELER/.test(u) || /TRAVELER/.test(t)) return 'Classic';
  if (/ASCENSION|HEROIC|RARE/.test(u) || /HEROIC|SR\s*EE|HEROI/i.test(t)) return 'Heroic';
  if (/FABLED/.test(t)) return 'Fabled';
  if (/LEGENDARY/.test(t)) return 'Legendary';
  if (/MYTHICAL/.test(t)) return 'Mythical';
  if (/EPIC/.test(t)) return 'Epic';
  if (cost?.amount === '0' && cost?.owned) return null;
  if (cost?.amount && cost.amount !== '0') return 'Classic';
  return null;
}

function inferDisplayNameFromContext(ctx) {
  const {
    skinNameRaw,
    tierLineRaw,
    unlockRaw,
    costRaw,
    selectedIndex,
    carousel,
    godName,
  } = ctx;

  const dashTail = String(skinNameRaw || '').match(/[-–—]\s*(.+)$/);
  const variantTail = dashTail ? dashTail[1].trim() : null;

  if (isLikelyGoodSkinOcr(skinNameRaw)) {
    if (/DEFAULT/i.test(skinNameRaw)) return 'Base';
    const normalized = normalizeSkinDisplayName(skinNameRaw, godName) || skinNameRaw.trim();
    if (variantTail && /Soul Piercer/i.test(normalized)) return normalized;
    if (!variantTail) return normalized;
  }

  if (/DEFAULT/i.test(skinNameRaw || '') || (costRaw && /EQUIPPED/i.test(costRaw) && selectedIndex === 0)) {
    return 'Base';
  }

  if (costRaw && /2,400|2400/.test(String(costRaw))) return 'Soul Piercer';

  if (variantTail && selectedIndex === 1) {
    return `Soul Piercer - ${variantTail.replace(/^[^A-Za-z]+/, '')}`;
  }

  if (carousel && selectedIndex === 1) {
    if (carousel.index === 1) return 'Soul Piercer';
    const names = ['Veil Strider', 'Frigid Warden', 'Golden Wrath'];
    const name = names[carousel.index - 2] || `Prism ${carousel.index}`;
    return `Soul Piercer - ${name}`;
  }

  if (selectedIndex === 1 && /GO TO/i.test(costRaw || '')) {
    if (variantTail) return `Soul Piercer - ${variantTail.replace(/^[^A-Za-z]+/, '')}`;
    return 'Soul Piercer';
  }

  if (selectedIndex === 0) return 'Base';
  if (selectedIndex === 1 && carousel) return 'Soul Piercer';
  if (selectedIndex === 1 && /2,400|2400/.test(String(costRaw || ''))) return 'Soul Piercer';
  if (selectedIndex === 5 || /RADIANT/i.test(skinNameRaw || '')) return 'Radiant';
  if (selectedIndex === 3) return 'Onyx';
  if (selectedIndex === 4) return 'Opal';

  const unlock = String(unlockRaw || '').toUpperCase();
  if (/ONYX/.test(unlock) || /ONYX/i.test(skinNameRaw || '')) return 'Onyx';
  if (/OPAL/.test(unlock) || /OPAL/i.test(skinNameRaw || '')) return 'Opal';
  if (/RADIANT/.test(unlock) || /RADIANT/i.test(skinNameRaw || '')) return 'Radiant';
  if (/LIGHT/i.test(skinNameRaw || '')) return 'Radiant';
  if (/SHADOW/i.test(skinNameRaw || '')) return 'Shadow';
  if (
    selectedIndex === 1 &&
    !carousel &&
    costRaw &&
    /900/.test(String(costRaw)) &&
    !/2,400|2400/.test(String(costRaw))
  ) {
    return 'Shadow';
  }
  if (
    selectedIndex === 1 &&
    !carousel &&
    costRaw &&
    !/2,400|2400/.test(String(costRaw)) &&
    !/GO TO/i.test(String(costRaw)) &&
    (!skinNameRaw || !isLikelyGoodSkinOcr(skinNameRaw))
  ) {
    return 'Shadow';
  }
  if (/CLASSIC/i.test(tierLineRaw || '') && selectedIndex === 1) return 'Soul Piercer';

  return null;
}

function splitPrismVariant(displayName) {
  const m = String(displayName || '').match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (!m) return { parent: displayName, variant: null };
  return { parent: m[1].trim(), variant: m[2].trim() };
}

/**
 * Extract loadout metadata from one 1920×1080 (or scaled) screenshot.
 */
async function extractGodRenderScreenshot(absPath, projectRoot, opts = {}) {
  const meta = await sharp(absPath).metadata();
  const imgW = meta.width || 1920;
  const imgH = meta.height || 1080;

  const godNameRegion = absRegion(REGIONS.godName, imgW, imgH);
  const skinNameRegion = absRegion(REGIONS.skinName, imgW, imgH);
  const tierLineRegion = absRegion(REGIONS.tierLine, imgW, imgH);
  const unlockRegion = absRegion(REGIONS.unlockBlurb, imgW, imgH);
  const costRegion = absRegion(REGIONS.costButton, imgW, imgH);

  const [godNameRaw, skinNameRaw, tierLineRaw, unlockRaw, costRaw, carouselRaw] = await Promise.all([
    ocrCrop(absPath, godNameRegion, { scale: 2, threshold: 155 }),
    ocrCrop(absPath, skinNameRegion, { scale: 3, threshold: 140 }),
    ocrCrop(absPath, tierLineRegion, { scale: 3, threshold: 145 }),
    ocrCrop(absPath, unlockRegion, { scale: 2 }),
    ocrCrop(absPath, costRegion, { scale: 3, threshold: 130 }),
    ocrCrop(absPath, absRegion(REGIONS.carousel, imgW, imgH), { scale: 3, threshold: 140 }),
  ]);

  const godName = (opts.godNameHint || godNameRaw.split(/\|/)[0].trim() || '')
    .replace(/\s+/g, ' ')
    .trim();

  const cells = gridCellRects(imgW, imgH);
  let selectedIndex = await detectSelectedGridIndex(absPath, imgW, imgH, cells);
  const selectedCell = cells[selectedIndex] || cells[0];
  const gridBadge = await detectGridCellBadge(absPath, selectedCell);

  const carouselMatch = String(carouselRaw || '').match(/(\d+)\s*[/\\]\s*(\d+)/);
  const carousel = carouselMatch
    ? { index: Number(carouselMatch[1]), total: Number(carouselMatch[2]) }
    : null;

  const cost = parseCostText(costRaw);

  if (cost?.owned && /EQUIPPED/i.test(String(costRaw || ''))) {
    selectedIndex = 0;
  }

  let displayName =
    inferDisplayNameFromContext({
      skinNameRaw,
      tierLineRaw,
      unlockRaw,
      costRaw,
      selectedIndex,
      carousel,
      godName,
    }) ||
    normalizeSkinDisplayName(skinNameRaw, godName) ||
    skinNameRaw.trim();

  if (cost?.owned && selectedIndex === 0 && !displayName) displayName = 'Base';

  const rank10Cell = await Promise.all(
    cells.map((cell) => detectMasteryRankBadge(absPath, cell))
  ).then((ranks) => ranks.findIndex((r) => r === 10));

  if (rank10Cell >= 0 && /GO TO/i.test(String(costRaw || ''))) {
    selectedIndex = rank10Cell;
    if (!displayName || displayName.length < 3) displayName = 'Radiant';
  }

  const tierIconCrop = await sharp(absPath)
    .extract({
      left: tierLineRegion.left,
      top: tierLineRegion.top,
      width: Math.min(72, tierLineRegion.width),
      height: tierLineRegion.height,
    })
    .png()
    .toBuffer();

  const tierMatch = await matchTierBadge(tierIconCrop, projectRoot);
  let tierId = inferTierFromContext(tierLineRaw, unlockRaw, tierMatch, cost);
  const isBaseSkin = Boolean(cost?.owned && selectedIndex === 0);
  if (isBaseSkin) tierId = null;

  let unlock = parseUnlockBlurb(unlockRaw) || {};
  const masteryFromName = inferMasteryFromName(displayName);
  if (masteryFromName) {
    unlock.masteryRank = masteryFromName.rank;
    unlock.requiresAscensionPass = masteryFromName.requiresAscensionPass;
    if (!unlock.source) unlock.source = 'ascension';
  }
  if (gridBadge?.type === 'masteryRank') {
    unlock.masteryRank = gridBadge.rank;
    unlock.requiresAscensionPass = true;
    if (!unlock.source) unlock.source = 'ascension';
  }
  if (gridBadge?.type === 'prism' || tierId === 'Prisms') {
    unlock.prismNote = true;
    if (!unlock.source && !isBaseSkin) unlock.source = 'prism';
  }

  const enrichedGridBadge = enrichGridBadge(gridBadge);
  unlock = enrichUnlock(unlock, cost, isBaseSkin);

  const relScreenshot = path.relative(projectRoot, absPath).replace(/\\/g, '/');
  const { parent, variant } = splitPrismVariant(displayName);

  if (carousel && selectedIndex === 1 && variant == null && carousel.index > 1) {
    displayName = `${parent || 'Soul Piercer'} - ${displayName.includes('-') ? displayName.split('-').pop().trim() : `Prism ${carousel.index}`}`;
  }

  if (variant && parent && !tierId) tierId = 'Prisms';

  let finalGridBadge = enrichedGridBadge;
  if (!finalGridBadge && unlock?.masteryRank) {
    finalGridBadge = enrichGridBadge({
      type: 'masteryRank',
      rank: unlock.masteryRank,
      label: unlock.masteryRank === 10 ? 'X' : 'V',
    });
  }
  if (!finalGridBadge && tierId === 'Prisms') {
    finalGridBadge = { type: 'prism', rank: null, label: 'prism' };
  }
  if (tierId === 'Prisms' && unlock && !unlock.prismNote) {
    unlock = enrichUnlock({ ...unlock, prismNote: true, source: unlock.source || 'prism' }, cost, isBaseSkin);
  }
  const tierBadge = tierId ? tierBadgeRelPath(tierId) : null;
  const information = parseSkinInformation(unlockRaw);

  return {
    screenshot: relScreenshot,
    godName,
    displayName,
    parentSkinName: parent,
    variantName: variant,
    tier: tierId,
    tierLabel: tierId,
    tierBadge,
    tierMatchScore: tierMatch?.score ?? null,
    cost,
    unlock,
    information,
    grid: {
      selectedIndex,
      badge: finalGridBadge,
    },
    carousel,
    loadout: {
      screenshot: relScreenshot,
      frame: loadoutFrameDefaults(),
    },
    ocr: {
      godNameRaw,
      skinNameRaw,
      tierLineRaw,
      unlockRaw,
      costRaw,
      carouselRaw,
    },
  };
}

module.exports = {
  extractGodRenderScreenshot,
  normalizeSkinDisplayName,
  splitPrismVariant,
  inferMasteryFromName,
  parseSkinInformation,
  informationSetsCrossGen,
};
