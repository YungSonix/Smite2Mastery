/**
 * Smite 2 loadout screenshot UI regions (reference resolution 1920×1080).
 * Fractions are relative to width/height so other resolutions can scale.
 */
const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;

/** Loadout viewport: 586×940 centered crop from 1920×1080 loadout screenshots. */
const CARD_FRAME = {
  aspectWidth: 586,
  aspectHeight: 940,
  cropWidth: 586,
  cropHeight: 940,
  defaultFocalX: 50,
  defaultFocalY: 50,
  /** Uniform zoom — 940px tall crop; frame crops width (no stretch). */
  defaultZoom: REF_HEIGHT / 940,
};

function loadoutFrameDefaults(overrides = {}) {
  return {
    focalX: overrides.focalX ?? CARD_FRAME.defaultFocalX,
    focalY: overrides.focalY ?? CARD_FRAME.defaultFocalY,
    zoom: overrides.zoom ?? overrides.zoomY ?? CARD_FRAME.defaultZoom,
    aspectWidth: CARD_FRAME.aspectWidth,
    aspectHeight: CARD_FRAME.aspectHeight,
    cropWidth: CARD_FRAME.cropWidth,
    cropHeight: CARD_FRAME.cropHeight,
  };
}

const REGIONS = {
  godName: { left: 0.038, top: 0.038, width: 0.34, height: 0.095 },
  skinName: { left: 0.718, top: 0.168, width: 0.26, height: 0.095 },
  tierLine: { left: 0.718, top: 0.258, width: 0.28, height: 0.075 },
  unlockBlurb: { left: 0.718, top: 0.335, width: 0.26, height: 0.32 },
  costButton: { left: 0.768, top: 0.828, width: 0.19, height: 0.115 },
  carousel: { left: 0.805, top: 0.792, width: 0.08, height: 0.045 },
  skinGrid: { left: 0.112, top: 0.262, width: 0.295, height: 0.465 },
};

/** 3×2 skin thumbnail grid inside skinGrid (fractions of skinGrid box). */
const GRID = {
  cols: 3,
  rows: 2,
  padX: 0.04,
  padY: 0.04,
  gapX: 0.03,
  gapY: 0.04,
};

function scaleRegion(region, width, height) {
  return {
    left: Math.round(region.left * width),
    top: Math.round(region.top * height),
    width: Math.round(region.width * width),
    height: Math.round(region.height * height),
  };
}

function absRegion(region, imgW, imgH) {
  const r = scaleRegion(region, imgW, imgH);
  return {
    ...r,
    right: r.left + r.width,
    bottom: r.top + r.height,
  };
}

/** Pixel rects for each cell in the skin grid. */
function gridCellRects(imgW, imgH) {
  const grid = absRegion(REGIONS.skinGrid, imgW, imgH);
  const innerW = grid.width * (1 - GRID.padX * 2);
  const innerH = grid.height * (1 - GRID.padY * 2);
  const cellW = (innerW - GRID.gapX * (GRID.cols - 1) * grid.width) / GRID.cols;
  const cellH = (innerH - GRID.gapY * (GRID.rows - 1) * grid.height) / GRID.rows;
  const gapPxX = GRID.gapX * grid.width;
  const gapPxY = GRID.gapY * grid.height;
  const startX = grid.left + grid.width * GRID.padX;
  const startY = grid.top + grid.height * GRID.padY;
  const cells = [];
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const left = Math.round(startX + col * (cellW + gapPxX));
      const top = Math.round(startY + row * (cellH + gapPxY));
      cells.push({
        index: row * GRID.cols + col,
        row,
        col,
        left,
        top,
        width: Math.round(cellW),
        height: Math.round(cellH),
      });
    }
  }
  return cells;
}

module.exports = {
  REF_WIDTH,
  REF_HEIGHT,
  CARD_FRAME,
  REGIONS,
  GRID,
  scaleRegion,
  absRegion,
  gridCellRects,
  loadoutFrameDefaults,
};
