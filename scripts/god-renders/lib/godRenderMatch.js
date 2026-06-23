const sharp = require('sharp');
const { listTierBadgePaths } = require('./godRenderTiers');

async function bufferDiffScore(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

async function prepIconBuffer(absPath, size) {
  return sharp(absPath)
    .ensureAlpha()
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer();
}

async function matchTierBadge(cropBuffer, projectRoot, size = 48) {
  const crop = await sharp(cropBuffer)
    .ensureAlpha()
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer();

  let best = null;
  for (const entry of listTierBadgePaths(projectRoot)) {
    if (!require('fs').existsSync(entry.absPath)) continue;
    const ref = await prepIconBuffer(entry.absPath, size);
    const score = await bufferDiffScore(crop, ref);
    if (!best || score < best.score) {
      best = { tierId: entry.tierId, score, relPath: entry.relPath };
    }
  }
  if (!best || best.score > 55) return null;
  return best;
}

function isOrangePixel(r, g, b) {
  return r > 170 && g > 95 && b < 130 && r > g;
}

function isGoldPixel(r, g, b) {
  return r > 190 && g > 150 && b < 110;
}

/** Smite 2 selected skin card outline (pink / gold). */
function isSelectionPixel(r, g, b) {
  if (g > 200 && r < 160 && b < 160) return false;
  if (r > 205 && b > 175 && g > 110 && g < 225) return true;
  if (isOrangePixel(r, g, b)) return true;
  if (isGoldPixel(r, g, b)) return true;
  return false;
}

/** Score orange/gold highlight on the outer ring only (ignores portrait art inside). */
async function cellSelectionScore(imagePath, cell) {
  const inset = Math.max(8, Math.round(Math.min(cell.width, cell.height) * 0.14));
  const inner = {
    left: cell.left + inset,
    top: cell.top + inset,
    width: Math.max(1, cell.width - inset * 2),
    height: Math.max(1, cell.height - inset * 2),
  };

  const strips = [
    { left: cell.left, top: cell.top, width: cell.width, height: inset },
    {
      left: cell.left,
      top: cell.top + cell.height - inset,
      width: cell.width,
      height: inset,
    },
    { left: cell.left, top: inner.top, width: inset, height: inner.height },
    {
      left: cell.left + cell.width - inset,
      top: inner.top,
      width: inset,
      height: inner.height,
    },
  ];

  let score = 0;
  for (const strip of strips) {
    const { data, info } = await sharp(imagePath)
      .extract(strip)
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 205 && b > 175 && g > 110 && g < 225) score += 4;
      else if (isOrangePixel(r, g, b)) score += 3;
      else if (isGoldPixel(r, g, b)) score += 2;
      else if (g > 200 && r < 170 && b < 170) score -= 1;
    }
  }
  return Math.max(0, score);
}

async function pinkBorderCount(imagePath, cell) {
  const inset = Math.max(8, Math.round(Math.min(cell.width, cell.height) * 0.14));
  const inner = {
    left: cell.left + inset,
    top: cell.top + inset,
    width: Math.max(1, cell.width - inset * 2),
    height: Math.max(1, cell.height - inset * 2),
  };
  const strips = [
    { left: cell.left, top: cell.top, width: cell.width, height: inset },
    {
      left: cell.left,
      top: cell.top + cell.height - inset,
      width: cell.width,
      height: inset,
    },
    { left: cell.left, top: inner.top, width: inset, height: inner.height },
    {
      left: cell.left + cell.width - inset,
      top: inner.top,
      width: inset,
      height: inner.height,
    },
  ];
  let pink = 0;
  for (const strip of strips) {
    const { data, info } = await sharp(imagePath)
      .extract(strip)
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 205 && b > 175 && g > 110 && g < 225) pink += 1;
    }
  }
  return pink;
}

async function hasEquippedCheckmark(imagePath, cell) {
  const w = Math.max(1, Math.round(cell.width * 0.22));
  const h = Math.max(1, Math.round(cell.height * 0.2));
  const { data, info } = await sharp(imagePath)
    .extract({ left: cell.left, top: cell.top, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let green = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (g > 175 && r < 150 && b < 150) green += 1;
  }
  return green > Math.max(12, Math.round(w * h * 0.04));
}

async function detectMasteryRankBadge(imagePath, cell) {
  const w = Math.max(1, Math.round(cell.width * 0.32));
  const h = Math.max(1, Math.round(cell.height * 0.26));
  const left = cell.left + Math.round(cell.width * 0.03);
  const top = cell.top + cell.height - h - Math.round(cell.height * 0.05);
  const { data, info } = await sharp(imagePath)
    .extract({ left, top, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let gold = 0;
  let pink = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 200 && g > 150 && b < 100) gold += 1;
    if (r > 180 && b > 160 && g < 200) pink += 1;
  }
  const min = Math.max(10, Math.round(w * h * 0.015));
  if (pink > gold && pink > min) return 10;
  if (gold > min) return 5;
  return null;
}

async function detectSelectedGridIndex(imagePath, imgW, imgH, gridCellRects) {
  const scores = [];
  for (const cell of gridCellRects) {
    scores.push(await cellSelectionScore(imagePath, cell));
  }

  const cell0 = gridCellRects[0];
  if (cell0 && (await hasEquippedCheckmark(imagePath, cell0))) {
    const altMax = Math.max(...scores.slice(1));
    if (altMax < scores[0] * 0.35) return 0;
  }

  let bestIdx = 1;
  let bestScore = scores[1] ?? 0;
  for (let i = 2; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIdx = i;
    }
  }
  if (bestScore < 400) return 0;

  const rankBadges = await Promise.all(
    gridCellRects.map((cell) => detectMasteryRankBadge(imagePath, cell))
  );
  const rank10Cells = rankBadges
    .map((rank, idx) => (rank === 10 ? idx : -1))
    .filter((idx) => idx >= 0);
  if (rank10Cells.length === 1 && scores[rank10Cells[0]] >= 400) {
    return rank10Cells[0];
  }

  const cell4 = gridCellRects[4];
  const cell5 = gridCellRects[5];
  if (cell4 && cell5) {
    const p4 = await pinkBorderCount(imagePath, cell4);
    const p5 = await pinkBorderCount(imagePath, cell5);
    if (p4 > 0 && p5 > 0) return 5;
  }

  return bestIdx;
}

async function detectGridCellBadge(imagePath, cell) {
  const w = Math.max(1, Math.round(cell.width * 0.28));
  const h = Math.max(1, Math.round(cell.height * 0.22));
  const left = cell.left + Math.round(cell.width * 0.04);
  const top = cell.top + cell.height - h - Math.round(cell.height * 0.06);
  const { data, info } = await sharp(imagePath)
    .extract({ left, top, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let gold = 0;
  let pink = 0;
  let rainbow = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 200 && g > 160 && b < 90) gold += 1;
    if (r > 200 && g < 120 && b > 160) pink += 1;
    if (g > 180 && b > 180 && r > 120) rainbow += 1;
  }
  const minHits = Math.max(8, Math.round(w * h * 0.02));
  if (pink > gold && pink > minHits) return { type: 'masteryRank', rank: 10, label: 'X' };
  if (gold > minHits) return { type: 'masteryRank', rank: 5, label: 'V' };
  if (rainbow > minHits) return { type: 'prism', rank: null, label: 'prism' };
  return null;
}

module.exports = {
  matchTierBadge,
  detectSelectedGridIndex,
  detectGridCellBadge,
  cellSelectionScore,
  hasEquippedCheckmark,
  detectMasteryRankBadge,
};
