/** Hex / HSL helpers + expanded tier color palettes for the editor. */

export function normalizeHexColor(input) {
  const raw = String(input || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const h = raw.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex) {
  const n = normalizeHexColor(hex);
  if (!n) return null;
  const v = parseInt(n.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

export function rgbToHex(r, g, b) {
  const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 65, l: 42 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return rgbToHex(v, v, v);
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hk = hh / 360;
  const tc = (n) => {
    let t = n;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return rgbToHex(tc(hk + 1 / 3) * 255, tc(hk) * 255, tc(hk - 1 / 3) * 255);
}

/** Full hue ring × lightness steps — 60+ swatches. */
export function generateTierColorSpectrum() {
  const out = [];
  for (let h = 0; h < 360; h += 15) {
    for (const l of [26, 34, 42, 50, 58]) {
      out.push(hslToHex(h, 68, l));
    }
  }
  return out;
}

export const TIER_THEME_GROUPS = [
  {
    title: 'Rank classic',
    colors: ['#991b1b', '#9a3412', '#a16207', '#166534', '#1e3a5f', '#4c1d95', '#64748b', '#881337'],
  },
  {
    title: 'Smite roles',
    colors: ['#10B981', '#A855F7', '#EF4444', '#3B82F6', '#EA580C', '#06b6d4', '#eab308', '#ec4899'],
  },
  {
    title: 'Neon',
    colors: ['#f43f5e', '#fb7185', '#f97316', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#e879f9'],
  },
  {
    title: 'Deep night',
    colors: ['#450a0a', '#7c2d12', '#713f12', '#14532d', '#0c4a6e', '#312e81', '#3b0764', '#1e293b'],
  },
];

export function randomTierColor() {
  const h = Math.floor(Math.random() * 360);
  return hslToHex(h, 62 + Math.random() * 18, 32 + Math.random() * 22);
}
