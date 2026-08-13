/** Jungle buff colors — match Database → Conquest buff list. */
export const CONQUEST_BUFF_COLORS = {
  primal: '#3b82f6',
  blight: '#ef4444',
  inspiration: '#a855f7',
  pathfinder: '#eab308',
  goldFury: '#f59e0b',
  fireGiant: '#ef4444',
  tower: '#fb923c',
  phoenix: '#fb923c',
  titan: '#cbd5e1',
  camp: '#eab308',
  boss: '#f59e0b',
  objective: '#a78bfa',
  trinkets: '#94a3b8',
};

const BUFF_NAME_COLOR = {
  Primal: CONQUEST_BUFF_COLORS.primal,
  Blight: CONQUEST_BUFF_COLORS.blight,
  Inspiration: CONQUEST_BUFF_COLORS.inspiration,
  Pathfinder: CONQUEST_BUFF_COLORS.pathfinder,
  Trinkets: CONQUEST_BUFF_COLORS.trinkets,
};

const COLOR_LABEL_COLOR = {
  Blue: CONQUEST_BUFF_COLORS.primal,
  Red: CONQUEST_BUFF_COLORS.blight,
  Purple: CONQUEST_BUFF_COLORS.inspiration,
  Yellow: CONQUEST_BUFF_COLORS.pathfinder,
};

/**
 * @param {{ icon?: string } | null} point
 * @param {{ buff?: string, colorLabel?: string } | null} blueprintMeta
 */
export function getConquestBuffColor(point, blueprintMeta) {
  if (blueprintMeta?.buff && BUFF_NAME_COLOR[blueprintMeta.buff]) {
    return BUFF_NAME_COLOR[blueprintMeta.buff];
  }
  if (blueprintMeta?.colorLabel && COLOR_LABEL_COLOR[blueprintMeta.colorLabel]) {
    return COLOR_LABEL_COLOR[blueprintMeta.colorLabel];
  }
  if (point?.icon && CONQUEST_BUFF_COLORS[point.icon]) {
    return CONQUEST_BUFF_COLORS[point.icon];
  }
  return null;
}
