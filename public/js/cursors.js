// Blooket Enhanced v2 — original custom cursors (SVG). GPL-3.0-or-later.
const ARROW = 'M3 2 L3 25 L9.5 19.5 L14 29 L18.5 27 L14 17.6 L22.5 17.6 Z';
const arrow = (fill, line = '#2b1a3a', extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="${ARROW}" fill="${fill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/><path d="M6 8 L6 15" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>${extra}</svg>`;
const sparkle = '<path d="M25 3 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4z" fill="#ffd60a" stroke="#2b1a3a" stroke-width="1"/>';
const starPath = (cx, cy, r) => { let p = ''; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; p += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `; } return p + 'Z'; };
const star = (fill, r = 13) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="${starPath(16, 16, r)}" fill="${fill}" stroke="#7a4b00" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="#fff" opacity=".8"/></svg>`;
const sword = (blade, rot = -45) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><g transform="rotate(${rot} 16 16)"><path d="M16 1 L19.5 6 L19.5 20 L12.5 20 L12.5 6 Z" fill="${blade}" stroke="#2b2d42" stroke-width="2" stroke-linejoin="round"/><rect x="8" y="20" width="16" height="4" rx="2" fill="#ffb703" stroke="#2b2d42" stroke-width="1.6"/><rect x="14" y="24" width="4" height="6" rx="1.5" fill="#7f5539" stroke="#2b2d42" stroke-width="1.4"/></g></svg>`;
const paw = fill => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><g fill="${fill}" stroke="#4a2b3a" stroke-width="1.8"><ellipse cx="16" cy="21" rx="7.5" ry="6.5"/><ellipse cx="7" cy="13" rx="3.2" ry="4"/><ellipse cx="12.5" cy="7.5" rx="3.2" ry="4"/><ellipse cx="19.5" cy="7.5" rx="3.2" ry="4"/><ellipse cx="25" cy="13" rx="3.2" ry="4"/></g></svg>`;
const pixel = (fill) => { const rows = ['X', 'XX', 'XOX', 'XOOX', 'XOOOX', 'XOOOOX', 'XOOOOOX', 'XOOOOOOX', 'XOOOOXXXX', 'XOOXOX', 'XOX XOX', 'XX  XOX', 'X    XX']; let r = ''; rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== ' ') r += `<rect x="${2 + x * 2.2}" y="${1 + y * 2.2}" width="2.3" height="2.3" fill="${c === 'X' ? '#111' : fill}"/>`; })); return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">${r}</svg>`; };
const rainbow = () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><defs><linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff595e"/><stop offset=".3" stop-color="#ffca3a"/><stop offset=".6" stop-color="#8ac926"/><stop offset="1" stop-color="#1982c4"/></linearGradient></defs><path d="${ARROW}" fill="url(#r)" stroke="#2b1a3a" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

// name: [label, normal svg, pointer svg, hotspot]
export const CURSORS = {
  blob: ['Blob', arrow('#b06ef0'), arrow('#ffd60a', '#2b1a3a', sparkle), [3, 2]],
  star: ['Star', star('#ffd60a', 12), star('#ffea70', 14.5), [16, 16]],
  sword: ['Sword', sword('#dfe7f0'), sword('#bde0fe', -60), [5, 5]],
  paw: ['Paw', paw('#ffc8dd'), paw('#ff8fab'), [16, 16]],
  pixel: ['Pixel', pixel('#fff'), pixel('#7cf'), [2, 1]],
  rainbow: ['Rainbow', rainbow(), arrow('#ffd60a', '#2b1a3a', sparkle), [3, 2]],
  classic: ['Normal', null, null, [0, 0]],
};

const url = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const CLICKABLE = 'a,button,label,select,summary,[data-continue],.tile,.chip,.choice,.set-card,.pack,.chest,.choice-card,.club-card,.rec-blook,.lrow,.user-pill,.role-card,.swatch,[data-pick],[data-chest],[data-target],.plaza-floor,.plaza-obj';

export function applyCursor(name = 'blob') {
  let tag = document.getElementById('cursor-style');
  if (!tag) { tag = document.createElement('style'); tag.id = 'cursor-style'; document.head.append(tag); }
  const c = CURSORS[name] || CURSORS.blob;
  if (!c[1]) { tag.textContent = ''; return; }
  const [x, y] = c[3];
  tag.textContent = `html, html * { cursor: ${url(c[1])} ${x} ${y}, auto; }
html :is(${CLICKABLE}), html :is(${CLICKABLE}) * { cursor: ${url(c[2])} ${x} ${y}, pointer; }
html :is(input:not([type=checkbox]):not([type=radio]):not([type=color]), textarea) { cursor: text; }
html :is(button:disabled, .tile.locked) { cursor: not-allowed; }`;
}
