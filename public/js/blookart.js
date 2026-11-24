// Blooket Enhanced v2 — original procedural blook art.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Draws every blook as an SVG from the small `art` spec in data.js, so all character art
// in this project is original and needs no image files.

import { BLOOKS } from './data.js';

let uid = 0;

const SHAPES = {
  round:  { d: 'M50 24 A34 34 0 1 1 49.99 24 Z', top: 24, bottom: 92, ey: 54, es: 13, my: 68, left: 16, right: 84 },
  square: { d: 'M34 26 H66 Q84 26 84 44 V74 Q84 92 66 92 H34 Q16 92 16 74 V44 Q16 26 34 26 Z', top: 26, bottom: 92, ey: 52, es: 14, my: 68, left: 16, right: 84 },
  tall:   { d: 'M48 16 H52 Q76 16 76 40 V72 Q76 94 54 94 H46 Q24 94 24 72 V40 Q24 16 48 16 Z', top: 16, bottom: 94, ey: 46, es: 11, my: 60, left: 24, right: 76 },
  wide:   { d: 'M50 40 C76 40 92 50 92 66 C92 82 74 92 50 92 C26 92 8 82 8 66 C8 50 24 40 50 40 Z', top: 40, bottom: 92, ey: 61, es: 15, my: 73, left: 8, right: 92 },
  bean:   { d: 'M50 26 C78 24 86 44 84 64 C82 86 66 94 48 92 C26 90 14 78 16 58 C18 38 28 27 50 26 Z', top: 26, bottom: 93, ey: 54, es: 13, my: 68, left: 16, right: 85 },
  drop:   { d: 'M50 16 C60 34 84 48 84 68 C84 85 68 94 50 94 C32 94 16 85 16 68 C16 48 40 34 50 16 Z', top: 34, bottom: 94, ey: 63, es: 13, my: 76, left: 16, right: 84 },
  ghost:  { d: 'M18 56 C18 34 32 22 50 22 C68 22 82 34 82 56 V88 Q77 96 71 88 Q65 80 60 88 Q55 96 50 88 Q45 80 40 88 Q35 96 29 88 Q23 80 18 88 Z', top: 22, bottom: 92, ey: 50, es: 12, my: 64, left: 18, right: 82 },
};

function hexToRgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(h, amt) {
  const [r, g, b] = hexToRgb(h);
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function lum(h) {
  const [r, g, b] = hexToRgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const INK = '#1d1d2b';

function star(cx, cy, r, fill, outline) {
  let p = '';
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    p += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `;
  }
  return `<path d="${p}Z" fill="${fill}"${outline ? ` stroke="${outline}" stroke-width="2" stroke-linejoin="round"` : ''}/>`;
}

function eyes(type, A, ink, line) {
  const L = 50 - A.es, R = 50 + A.es, y = A.ey;
  const dark = ink !== INK; // dark body: give pupils a white backing so they pop
  const glint = (x, yy, s = 1) => `<circle cx="${x + 2.3 * s}" cy="${yy - 2.8 * s}" r="${2.5 * s}" fill="#fff"/><circle cx="${x - 1.9 * s}" cy="${yy + 2.6 * s}" r="${1.1 * s}" fill="#fff" opacity=".9"/>`;
  const dot = x => (dark ? `<ellipse cx="${x}" cy="${y}" rx="8.6" ry="10" fill="#fff" stroke="${line}" stroke-width="2"/>` : '') +
    `<ellipse cx="${x}" cy="${y + (dark ? 0.8 : 0)}" rx="6.4" ry="7.8" fill="${INK}"/>` + glint(x, y);
  const big = x => `<ellipse cx="${x}" cy="${y}" rx="10" ry="11" fill="#fff" stroke="${line}" stroke-width="2.2"/><ellipse cx="${x + 1}" cy="${y + 1.5}" rx="6" ry="7" fill="${INK}"/>` + glint(x + 1, y + 1.2, 0.95);
  const arc = (x, up) => `<path d="M${x - 6.5} ${y + (up ? 2.5 : 0)} Q${x} ${y + (up ? -6.5 : 6)} ${x + 6.5} ${y + (up ? 2.5 : 0)}" stroke="${dark ? '#fff' : INK}" stroke-width="3.8" fill="none" stroke-linecap="round"/>`;
  switch (type) {
    case 'big': return big(L) + big(R);
    case 'sleepy': return arc(L, false) + arc(R, false);
    case 'happy': return arc(L, true) + arc(R, true);
    case 'wink': return dot(L) + arc(R, true);
    case 'angry':
      return dot(L) + dot(R) +
        `<path d="M${L - 8} ${y - 12} L${L + 6} ${y - 7} M${R + 8} ${y - 12} L${R - 6} ${y - 7}" stroke="${dark ? '#fff' : INK}" stroke-width="3.6" stroke-linecap="round"/>`;
    case 'cyclops':
      return `<circle cx="50" cy="${y}" r="15" fill="#fff" stroke="${line}" stroke-width="2.4"/><circle cx="51" cy="${y + 1}" r="8.5" fill="#e63946"/><circle cx="51" cy="${y + 1}" r="4.4" fill="${INK}"/>` + glint(51, y, 1.2);
    case 'three':
      return [50 - 14, 50, 50 + 14].map((x, i) => {
        const yy = y - (i === 1 ? 4 : 0);
        return (dark ? `<circle cx="${x}" cy="${yy}" r="7" fill="#fff" stroke="${line}" stroke-width="1.8"/>` : '') + `<circle cx="${x}" cy="${yy}" r="5.2" fill="${INK}"/><circle cx="${x + 1.8}" cy="${yy - 2}" r="1.8" fill="#fff"/>`;
      }).join('');
    case 'star': return star(L, y, 9, '#ffd60a', INK) + star(R, y, 9, '#ffd60a', INK);
    case 'visor':
      return `<rect x="${L - 11}" y="${y - 8}" width="${R - L + 22}" height="16" rx="8" fill="${INK}" stroke="${line}" stroke-width="2"/>` +
        `<ellipse cx="${L}" cy="${y}" rx="4.5" ry="4" fill="#00f5d4"/><ellipse cx="${R}" cy="${y}" rx="4.5" ry="4" fill="#00f5d4"/><rect x="${L - 7}" y="${y - 5}" width="9" height="2.4" rx="1.2" fill="#fff" opacity=".5"/>`;
    case 'hollow':
      return `<ellipse cx="${L}" cy="${y}" rx="7" ry="9.5" fill="${dark ? '#fff' : INK}"/><ellipse cx="${R}" cy="${y}" rx="7" ry="9.5" fill="${dark ? '#fff' : INK}"/>` +
        (dark ? '' : `<circle cx="${L + 2}" cy="${y - 3}" r="2" fill="#fff" opacity=".8"/><circle cx="${R + 2}" cy="${y - 3}" r="2" fill="#fff" opacity=".8"/>`);
    default: return dot(L) + dot(R);
  }
}

function mouth(type, A, ink) {
  const y = A.my;
  switch (type) {
    case 'smile': return `<path d="M43.5 ${y} Q50 ${y + 7} 56.5 ${y}" stroke="${ink}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    case 'open': return `<path d="M42.5 ${y - 1.5} Q50 ${y + 13} 57.5 ${y - 1.5} Z" fill="#5b1a2a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="50" cy="${y + 5.5}" rx="4" ry="2.4" fill="#ff6b81"/>`;
    case 'cat': return `<path d="M42 ${y} Q46 ${y + 5} 50 ${y} Q54 ${y + 5} 58 ${y}" stroke="${ink}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    case 'fang': return `<path d="M43 ${y} Q50 ${y + 6} 57 ${y}" stroke="${ink}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M45 ${y + 2} L46.5 ${y + 6.5} L48 ${y + 2.6} Z M55 ${y + 2} L53.5 ${y + 6.5} L52 ${y + 2.6} Z" fill="#fff" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`;
    case 'o': return `<ellipse cx="50" cy="${y + 1}" rx="4" ry="4.8" fill="#5b1a2a" stroke="${INK}" stroke-width="2"/>`;
    case 'flat': return `<path d="M44.5 ${y + 1} H55.5" stroke="${ink}" stroke-width="3.6" stroke-linecap="round"/>`;
    case 'grin': return `<path d="M40 ${y - 2} Q50 ${y + 13} 60 ${y - 2} Z" fill="#5b1a2a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M42 ${y - 1.4} H58 L57 ${y + 2} H43 Z" fill="#fff"/><ellipse cx="50" cy="${y + 6}" rx="4" ry="2" fill="#ff6b81"/>`;
    default: return '';
  }
}

// Extras are split into layers: drawn behind the body, painted onto the body (clipped), or on top.
const BACK = {
  bunnyEars: (A, c, d) => `<ellipse cx="38" cy="${A.top - 6}" rx="7" ry="18" fill="${c}" transform="rotate(-12 38 ${A.top})"/><ellipse cx="62" cy="${A.top - 6}" rx="7" ry="18" fill="${c}" transform="rotate(12 62 ${A.top})"/><ellipse cx="38" cy="${A.top - 5}" rx="3.5" ry="12" fill="#ffb3c6" transform="rotate(-12 38 ${A.top})"/><ellipse cx="62" cy="${A.top - 5}" rx="3.5" ry="12" fill="#ffb3c6" transform="rotate(12 62 ${A.top})"/>`,
  catEars: (A, c, d) => `<path d="M24 ${A.top + 16} L28 ${A.top - 8} L44 ${A.top + 6} Z M76 ${A.top + 16} L72 ${A.top - 8} L56 ${A.top + 6} Z" fill="${c}"/><path d="M29 ${A.top + 10} L30 ${A.top - 1} L38 ${A.top + 6} Z M71 ${A.top + 10} L70 ${A.top - 1} L62 ${A.top + 6} Z" fill="${d}"/>`,
  bearEars: (A, c, d) => `<circle cx="27" cy="${A.top + 8}" r="10" fill="${c}"/><circle cx="73" cy="${A.top + 8}" r="10" fill="${c}"/><circle cx="27" cy="${A.top + 8}" r="5" fill="${d}"/><circle cx="73" cy="${A.top + 8}" r="5" fill="${d}"/>`,
  horns: (A) => `<path d="M30 ${A.top + 10} Q20 ${A.top - 6} 26 ${A.top - 16} Q32 ${A.top - 2} 42 ${A.top + 4} Z M70 ${A.top + 10} Q80 ${A.top - 6} 74 ${A.top - 16} Q68 ${A.top - 2} 58 ${A.top + 4} Z" fill="#e9ecef"/>`,
  wings: (A, c, d) => `<path d="M${A.left + 4} 56 Q2 40 4 26 Q12 36 18 34 Q14 46 ${A.left + 4} 66 Z M${A.right - 4} 56 Q98 40 96 26 Q88 36 82 34 Q86 46 ${A.right - 4} 66 Z" fill="${d}"/>`,
  cape: (A) => `<path d="M${A.left + 2} ${A.top + 22} Q50 ${A.top + 6} ${A.right - 2} ${A.top + 22} L${A.right + 8} 98 L${A.left - 8} 98 Z" fill="#9d0208"/>`,
  fins: (A, c, d) => `<path d="M${A.left + 4} 62 L${A.left - 10} 54 L${A.left - 8} 72 Z M${A.right - 4} 62 L${A.right + 10} 54 L${A.right + 8} 72 Z" fill="${d}"/>`,
  spikes: (A, c, d) => {
    let s = '';
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + i * 0.11);
      const x1 = 50 + 30 * Math.cos(a), y1 = 60 + 30 * Math.sin(a);
      const x2 = 50 + 44 * Math.cos(a), y2 = 60 + 44 * Math.sin(a);
      s += `<path d="M${(x1 - 5 * Math.sin(a)).toFixed(1)} ${(y1 + 5 * Math.cos(a)).toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${(x1 + 5 * Math.sin(a)).toFixed(1)} ${(y1 - 5 * Math.cos(a)).toFixed(1)} Z" fill="${d}"/>`;
    }
    return s;
  },
  petals: (A) => {
    let s = '';
    for (let i = 0; i < 12; i++) s += `<ellipse cx="50" cy="${58 - 40}" rx="7" ry="13" fill="${i % 2 ? '#ff8800' : '#ffd000'}" transform="rotate(${i * 30} 50 58)"/>`;
    return s;
  },
  flame: (A) => `<path d="M30 78 Q4 70 2 40 Q16 58 26 56 Q12 38 18 18 Q30 46 40 50 Z" fill="#ffd166"/><path d="M32 74 Q14 66 12 48 Q22 60 30 58 Q22 44 26 32 Q34 52 42 54 Z" fill="#ef476f"/>`,
  tentacles: (A, c, d) => [26, 38, 50, 62, 74].map((x, i) => `<path d="M${x - 4} ${A.bottom - 10} Q${x - 6 + (i % 2) * 8} ${A.bottom + 4} ${x + (i % 2 ? 4 : -4)} ${A.bottom + 6} Q${x + 2} ${A.bottom} ${x + 4} ${A.bottom - 10} Z" fill="${d}"/>`).join(''),
  ring: () => `<ellipse cx="50" cy="60" rx="48" ry="11" fill="none" stroke="#9d4edd" stroke-width="5" transform="rotate(-14 50 60)"/>`,
  straw: (A) => `<rect x="54" y="${A.top - 22}" width="7" height="34" rx="2" fill="#ff006e" transform="rotate(12 57 ${A.top})"/>`,
  trident: () => `<path d="M88 96 V30 M80 34 V22 M88 30 V16 M96 34 V22 M80 34 H96" stroke="#ffd60a" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  sword: () => `<path d="M90 92 L86 38" stroke="#ced4da" stroke-width="5" stroke-linecap="round"/><path d="M80 78 H96" stroke="#7f5539" stroke-width="5" stroke-linecap="round"/>`,
  frogEyes: (A, c) => `<circle cx="${50 - A.es}" cy="${A.ey - 6}" r="12" fill="${c}"/><circle cx="${50 + A.es}" cy="${A.ey - 6}" r="12" fill="${c}"/>`,
  spout: (A) => `<path d="M50 ${A.top} Q44 ${A.top - 14} 36 ${A.top - 18} M50 ${A.top} Q56 ${A.top - 14} 64 ${A.top - 18} M50 ${A.top} V${A.top - 20}" stroke="#90e0ef" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  joystick: (A) => `<rect x="47" y="${A.top - 18}" width="6" height="22" fill="#343a40"/><circle cx="50" cy="${A.top - 20}" r="8" fill="#e63946"/><circle cx="47" cy="${A.top - 23}" r="2.5" fill="#fff" opacity=".7"/>`,
};

const CLIP = {
  stripes: (A) => `<path d="M0 50 H100 M0 66 H100 M0 82 H100" stroke="${INK}" stroke-width="7" opacity=".85"/>`,
  craters: (A, c, d) => `<circle cx="34" cy="44" r="6" fill="${d}"/><circle cx="68" cy="76" r="8" fill="${d}"/><circle cx="72" cy="42" r="4" fill="${d}"/>`,
  spots: (A, c, d) => `<circle cx="30" cy="48" r="3" fill="${d}"/><circle cx="70" cy="80" r="3.5" fill="${d}"/><circle cx="66" cy="44" r="2.5" fill="${d}"/><circle cx="34" cy="82" r="2.5" fill="${d}"/>`,
  crust: (A, c, d) => `<path d="${SHAPES.square.d}" fill="none" stroke="${d}" stroke-width="9"/>`,
  ridges: (A, c, d) => `<path d="M34 42 Q28 66 34 92 M50 40 V92 M66 42 Q72 66 66 92" stroke="${d}" stroke-width="3" fill="none"/>`,
  bandages: () => `<path d="M10 30 L90 40 M10 52 L90 44 M10 70 L90 78 M10 88 L90 82" stroke="#cbbf9f" stroke-width="5"/>`,
  nori: () => `<path d="M0 28 H100 V100 H0 Z M50 40 A26 26 0 1 0 50.01 40 Z" fill="#1b4332" fill-rule="evenodd"/>`,
  salmon: () => `<path d="M10 82 H90" stroke="#ff8fa3" stroke-width="10"/>`,
  pixels: (A, c, d) => `<rect x="20" y="30" width="8" height="8" fill="${d}"/><rect x="72" y="80" width="8" height="8" fill="${d}"/><rect x="64" y="30" width="6" height="6" fill="#fff" opacity=".5"/>`,
  glitch: () => `<rect x="10" y="40" width="80" height="4" fill="#4cc9f0" opacity=".8"/><rect x="10" y="78" width="80" height="3" fill="#f9f871" opacity=".8"/>`,
  moss: () => `<path d="M10 34 Q30 44 50 32 Q70 44 90 34 V20 H10 Z" fill="#6a994e"/>`,
  waffle: (A, c, d) => `<path d="M30 26 V92 M50 26 V92 M70 26 V92 M16 44 H84 M16 62 H84 M16 80 H84" stroke="${d}" stroke-width="3"/>`,
  frosting: (A) => `<path d="M0 0 H100 V${A.top + 22} Q92 ${A.top + 30} 84 ${A.top + 22} Q76 ${A.top + 32} 68 ${A.top + 22} Q60 ${A.top + 30} 52 ${A.top + 22} Q44 ${A.top + 32} 36 ${A.top + 22} Q28 ${A.top + 30} 20 ${A.top + 22} Q12 ${A.top + 32} 0 ${A.top + 22} Z" fill="#ff70a6"/>`,
  sprinkles: (A) => ['#ffd60a', '#4cc9f0', '#ffffff', '#80ed99', '#ffd60a', '#4cc9f0'].map((col, i) => `<rect x="${24 + i * 10}" y="${A.top + 6 + (i % 3) * 5}" width="5" height="2" rx="1" fill="${col}" transform="rotate(${i * 50} ${26 + i * 10} ${A.top + 7 + (i % 3) * 5})"/>`).join(''),
  pleats: (A, c, d) => `<path d="M30 46 Q34 42 36 48 M44 42 Q48 38 50 44 M58 42 Q62 38 64 44 M70 48 Q72 42 76 46" stroke="${d}" stroke-width="2.5" fill="none"/>`,
  crack: () => `<path d="M60 26 L56 34 L62 38 L58 46" stroke="#adb5bd" stroke-width="2" fill="none"/>`,
  coinMark: (A, c, d) => `<circle cx="50" cy="58" r="27" fill="none" stroke="${d}" stroke-width="3"/>`,
  swirl: () => `<path d="M30 70 Q30 40 56 42 Q74 46 68 62 Q60 74 48 64" stroke="#fff" stroke-width="3" fill="none" opacity=".5"/>`,
  shine: () => `<ellipse cx="66" cy="76" rx="6" ry="3" fill="#fff" opacity=".4"/>`,
  ninjaMask: (A) => `<rect x="0" y="${A.ey - 10}" width="100" height="20" fill="#2b2d42"/><rect x="0" y="${A.ey - 10}" width="100" height="20" fill="#7209b7" opacity=".3"/>`,
  pearls: (A) => [30, 42, 56, 68, 36, 62].map((x, i) => `<circle cx="${x}" cy="${86 - (i > 3 ? 6 : 0)}" r="4" fill="#3d2c2e"/>`).join(''),
  ridgesDark: () => '',
};

const FRONT = {
  leaf: (A) => `<path d="M50 ${A.top + 2} Q48 ${A.top - 8} 52 ${A.top - 12}" stroke="#2d6a4f" stroke-width="3" fill="none"/><path d="M52 ${A.top - 10} Q64 ${A.top - 22} 74 ${A.top - 14} Q64 ${A.top - 4} 52 ${A.top - 10} Z" fill="#52b788"/>`,
  antenna: (A) => `<path d="M42 ${A.top + 2} L36 ${A.top - 12} M58 ${A.top + 2} L64 ${A.top - 12}" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><circle cx="36" cy="${A.top - 13}" r="3.5" fill="${INK}"/><circle cx="64" cy="${A.top - 13}" r="3.5" fill="${INK}"/>`,
  alienAntenna: (A) => `<path d="M50 ${A.top + 2} V${A.top - 14}" stroke="#70e000" stroke-width="3"/><circle cx="50" cy="${A.top - 16}" r="5" fill="#ccff33"/>`,
  crown: (A) => `<path d="M34 ${A.top + 4} L32 ${A.top - 14} L42 ${A.top - 6} L50 ${A.top - 18} L58 ${A.top - 6} L68 ${A.top - 14} L66 ${A.top + 4} Z" fill="#ffd60a" stroke="#e85d04" stroke-width="1.5"/><circle cx="50" cy="${A.top - 4}" r="2.8" fill="#e63946"/>`,
  wizardHat: (A) => `<path d="M28 ${A.top + 6} L50 ${A.top - 30} L72 ${A.top + 6} Z" fill="#5a189a"/><ellipse cx="50" cy="${A.top + 6}" rx="28" ry="5" fill="#3c096c"/>${star(52, A.top - 10, 5, '#ffd60a')}`,
  witchHat: (A) => `<ellipse cx="50" cy="${A.top + 4}" rx="30" ry="5" fill="#10002b"/><path d="M34 ${A.top + 4} L54 ${A.top - 30} L66 ${A.top + 4} Z" fill="#240046"/><path d="M36 ${A.top} H65" stroke="#ff9e00" stroke-width="3"/>`,
  pirateHat: (A) => `<path d="M20 ${A.top + 8} Q50 ${A.top - 26} 80 ${A.top + 8} Q50 ${A.top - 2} 20 ${A.top + 8} Z" fill="#212529"/><circle cx="50" cy="${A.top - 4}" r="4" fill="#fff"/><path d="M46 ${A.top + 1} L54 ${A.top - 7} M46 ${A.top - 7} L54 ${A.top + 1}" stroke="#fff" stroke-width="1.6"/>`,
  acornCap: (A) => `<path d="M22 ${A.top + 18} Q22 ${A.top - 6} 50 ${A.top - 6} Q78 ${A.top - 6} 78 ${A.top + 18} Z" fill="#7f5539"/><path d="M30 ${A.top + 6} H70 M26 ${A.top + 12} H74" stroke="#9c6644" stroke-width="2"/><path d="M50 ${A.top - 6} V${A.top - 14}" stroke="#583101" stroke-width="3" stroke-linecap="round"/>`,
  partyHat: (A) => `<path d="M38 ${A.top + 4} L50 ${A.top - 24} L62 ${A.top + 4} Z" fill="#f72585"/><circle cx="50" cy="${A.top - 24}" r="3" fill="#ffd60a"/>`,
  glasses: (A) => `<circle cx="${50 - A.es}" cy="${A.ey}" r="9" fill="none" stroke="${INK}" stroke-width="2.6"/><circle cx="${50 + A.es}" cy="${A.ey}" r="9" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M${50 - A.es + 9} ${A.ey} H${50 + A.es - 9}" stroke="${INK}" stroke-width="2.6"/>`,
  shades: (A) => `<path d="M${50 - A.es - 11} ${A.ey - 6} H${50 + A.es + 11} L${50 + A.es + 8} ${A.ey + 6} Q${50 + A.es} ${A.ey + 9} ${50 + 3} ${A.ey + 2} H${50 - 3} Q${50 - A.es} ${A.ey + 9} ${50 - A.es - 8} ${A.ey + 6} Z" fill="${INK}"/><path d="M${50 - A.es - 4} ${A.ey - 3} L${50 - A.es + 2} ${A.ey - 3}" stroke="#fff" stroke-width="1.5" opacity=".7"/>`,
  spaceHelmet: () => `<circle cx="50" cy="58" r="44" fill="#caf0f8" opacity=".25" stroke="#fff" stroke-width="3"/><ellipse cx="32" cy="34" rx="8" ry="4" fill="#fff" opacity=".7" transform="rotate(-35 32 34)"/>`,
  bubble: () => `<circle cx="82" cy="26" r="8" fill="#fff" opacity=".35" stroke="#fff" stroke-width="2"/><circle cx="90" cy="12" r="4" fill="#fff" opacity=".35" stroke="#fff" stroke-width="1.5"/>`,
  shell: (A) => `<path d="M30 ${A.top + 8} Q50 ${A.top - 26} 70 ${A.top + 8} Z" fill="#ffd6a5"/><path d="M50 ${A.top + 8} V${A.top - 14} M40 ${A.top + 8} L44 ${A.top - 10} M60 ${A.top + 8} L56 ${A.top - 10}" stroke="#e5989b" stroke-width="2"/>`,
  lure: (A) => `<path d="M50 ${A.top + 2} Q52 ${A.top - 18} 66 ${A.top - 16}" stroke="#adb5bd" stroke-width="2.5" fill="none"/><circle cx="67" cy="${A.top - 14}" r="6" fill="#fee440"/><circle cx="67" cy="${A.top - 14}" r="10" fill="#fee440" opacity=".3"/>`,
  sparkles: () => star(12, 20, 6, '#ffd60a') + star(88, 22, 4.5, '#ffd60a') + star(90, 80, 5, '#ffd60a') + star(10, 84, 3.5, '#ffd60a'),
  halo: (A) => `<ellipse cx="50" cy="${A.top - 12}" rx="20" ry="5" fill="none" stroke="#ffd60a" stroke-width="4"/>`,
  leafCrown: (A) => [30, 40, 50, 60, 70].map((x, i) => `<ellipse cx="${x}" cy="${A.top - 2 - (i === 2 ? 6 : i % 2 ? 3 : 0)}" rx="6" ry="10" fill="${i % 2 ? '#40916c' : '#52b788'}" transform="rotate(${(x - 50) * 1.2} ${x} ${A.top})"/>`).join(''),
  beard: (A) => `<path d="M34 ${A.my + 4} Q50 ${A.my + 2} 66 ${A.my + 4} Q64 ${A.my + 26} 50 ${A.my + 30} Q36 ${A.my + 26} 34 ${A.my + 4} Z" fill="#d8f3dc"/>`,
  clover: (A) => `<circle cx="66" cy="${A.top + 2}" r="4.5" fill="#2d6a4f"/><circle cx="72" cy="${A.top - 2}" r="4.5" fill="#2d6a4f"/><circle cx="72" cy="${A.top + 5}" r="4.5" fill="#2d6a4f"/>`,
  stem: (A) => `<path d="M50 ${A.top + 2} Q48 ${A.top - 8} 56 ${A.top - 12}" stroke="#386641" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  hairPeak: (A) => `<path d="M16 ${A.top + 20} V${A.top + 10} Q16 ${A.top} 30 ${A.top} H70 Q84 ${A.top} 84 ${A.top + 10} V${A.top + 20} Q66 ${A.top + 10} 50 ${A.top + 22} Q34 ${A.top + 10} 16 ${A.top + 20} Z" fill="#14213d"/>`,
  headband: (A) => `<path d="M${A.left} ${A.top + 12} H${A.right}" stroke="#f72585" stroke-width="6"/><path d="M${A.right} ${A.top + 12} L${A.right + 12} ${A.top + 4} M${A.right} ${A.top + 12} L${A.right + 12} ${A.top + 20}" stroke="#f72585" stroke-width="4" stroke-linecap="round"/>`,
  candle: (A) => `<rect x="46" y="${A.top - 20}" width="8" height="20" rx="2" fill="#a0c4ff"/><path d="M50 ${A.top - 30} Q45 ${A.top - 24} 50 ${A.top - 21} Q55 ${A.top - 24} 50 ${A.top - 30} Z" fill="#ffb703"/>`,
  chains: () => `<path d="M10 70 Q50 90 90 70" stroke="#adb5bd" stroke-width="3" fill="none" stroke-dasharray="5 3"/>`,
  bolts: () => `<circle cx="13" cy="60" r="4" fill="#6c757d"/><circle cx="87" cy="60" r="4" fill="#6c757d"/>`,
};

// What the custom blook maker can pick from (also used by the server to validate custom blooks).
export const ART_OPTIONS = {
  shapes: Object.keys(SHAPES),
  eyes: ['dot', 'big', 'sleepy', 'happy', 'angry', 'wink', 'cyclops', 'three', 'star', 'visor', 'hollow'],
  mouths: ['smile', 'open', 'cat', 'fang', 'o', 'flat', 'grin', 'none'],
  extras: [...Object.keys(BACK), ...Object.keys(CLIP).filter(k => k !== 'ridgesDark'), ...Object.keys(FRONT)],
};

export function blookSVG(idOrBlook, size = 96, extraClass = '') {
  const blook = typeof idOrBlook === 'string' ? BLOOKS[idOrBlook] : idOrBlook;
  if (!blook) return `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="55" r="34" fill="#ccc"/><text x="50" y="66" text-anchor="middle" font-size="32" fill="#666">?</text></svg>`;
  const a = blook.art;
  const A = SHAPES[a.s] || SHAPES.round;
  const c = a.c, d = shade(c, -0.22);
  const line = shade(c, -0.62);             // thick outline in a deep shade of the body color
  const ink = lum(c) < 0.32 ? '#ffffff' : INK;
  const id = `bk${++uid}`;
  const xs = a.x || [];
  const back = xs.filter(x => BACK[x]).map(x => BACK[x](A, c, d)).join('');
  const clip = xs.filter(x => CLIP[x]).map(x => CLIP[x](A, c, d)).join('');
  const NO_LINE = ['sparkles', 'spaceHelmet', 'bubble', 'halo', 'glasses', 'chains', 'spout', 'shades', 'headband'];
  const front = xs.filter(x => FRONT[x] && !NO_LINE.includes(x)).map(x => FRONT[x](A, c, d)).join('');
  const frontPlain = xs.filter(x => FRONT[x] && NO_LINE.includes(x)).map(x => FRONT[x](A, c, d)).join('');
  const cheeks = a.k ? `<ellipse cx="${50 - A.es - 8.5}" cy="${A.ey + 10}" rx="5.5" ry="3.2" fill="#ff5d8f" opacity=".55"/><ellipse cx="${50 + A.es + 8.5}" cy="${A.ey + 10}" rx="5.5" ry="3.2" fill="#ff5d8f" opacity=".55"/>` : '';
  const hasFeet = a.s !== 'ghost' && !xs.includes('tentacles');
  const fx = a.s === 'wide' ? 20 : a.s === 'tall' ? 12 : 14;
  const feet = hasFeet ? [50 - fx, 50 + fx].map(x => `<ellipse cx="${x}" cy="${A.bottom - 1}" rx="${a.s === 'wide' ? 11 : 9.5}" ry="6" fill="${d}" stroke="${line}" stroke-width="3"/>`).join('') : '';
  const outlined = inner => (inner ? `<g stroke="${line}" stroke-width="2.6" stroke-linejoin="round">${inner}</g>` : '');
  return `<svg class="blook-svg ${extraClass}" viewBox="-6 -10 112 112" width="${size}" height="${size}" role="img" aria-label="${blook.name}">` +
    `<defs><clipPath id="${id}"><path d="${A.d}"/></clipPath></defs>` +
    `<ellipse cx="50" cy="${A.bottom + 5}" rx="30" ry="4.5" fill="#000" opacity=".16"/>` +
    outlined(back) + feet +
    `<path d="${A.d}" fill="${c}"/>` +
    `<g clip-path="url(#${id})">${clip}` +
      `<ellipse cx="50" cy="${A.bottom + 6}" rx="66" ry="20" fill="#000" opacity=".16"/>` +
      `<path d="${A.d}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="5" transform="translate(-1.5 -2)"/>` +
      `<ellipse cx="35" cy="${A.top + 13}" rx="11" ry="5.5" fill="#fff" opacity=".45" transform="rotate(-25 35 ${A.top + 13})"/>` +
      `<circle cx="48" cy="${A.top + 8}" r="2.2" fill="#fff" opacity=".45"/>` +
    `</g>` +
    `<path d="${A.d}" fill="none" stroke="${line}" stroke-width="3.6" stroke-linejoin="round"/>` +
    cheeks + eyes(a.e, A, ink, line) + mouth(a.m, A, ink) + outlined(front) + frontPlain +
    `</svg>`;
}
