// Blooket Enhanced v2 — the cozy "rec room" scene used by the title screen, login pages and Plaza.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later. All art is original.

import { raw } from './ui.js';

const lights = () => {
  let s = '<path d="M0 70 Q200 130 400 78 T800 80 T1200 78 T1600 70" stroke="#3a2a1a" stroke-width="3" fill="none"/>';
  const cols = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#c77dff'];
  for (let i = 0; i < 32; i++) {
    const x = 25 + i * 50;
    const seg = Math.floor(x / 400), t = (x % 400) / 400;
    const y = 74 + Math.sin(t * Math.PI) * (seg === 0 ? 38 : 30);
    s += `<g class="bulb" style="animation-delay:${(i % 5) * 0.35}s"><circle cx="${x}" cy="${y + 9}" r="12" fill="${cols[i % 5]}" opacity=".35"/><ellipse cx="${x}" cy="${y + 9}" rx="5.5" ry="7.5" fill="${cols[i % 5]}"/><rect x="${x - 3}" y="${y}" width="6" height="4" fill="#3a2a1a"/></g>`;
  }
  return s;
};

const stars = () => Array.from({ length: 18 }, (_, i) => `<circle cx="${120 + ((i * 53) % 230)}" cy="${200 + ((i * 37) % 160)}" r="${i % 3 ? 1.6 : 2.6}" fill="#fff" class="twinkle" style="animation-delay:${i * 0.23}s"/>`).join('');

export function sceneSvg({ sign = 'PLAY' } = {}) {
  return raw(`<svg class="rec-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="rr-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb86b"/><stop offset="1" stop-color="#ff8a5c"/></linearGradient>
    <linearGradient id="rr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1446"/><stop offset="1" stop-color="#5a3f9e"/></linearGradient>
    <linearGradient id="rr-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b97a43"/><stop offset="1" stop-color="#8f5a2e"/></linearGradient>
    <radialGradient id="rr-rug" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8e5cf7"/><stop offset=".7" stop-color="#6a3fd8"/><stop offset="1" stop-color="#5329b8"/></radialGradient>
    <filter id="rr-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1600" height="580" fill="url(#rr-wall)"/>
  ${Array.from({ length: 17 }, (_, i) => `<rect x="${i * 100}" y="0" width="50" height="470" fill="#fff" opacity=".06"/>`).join('')}
  <rect y="470" width="1600" height="110" fill="#9c5a2c"/>
  ${Array.from({ length: 33 }, (_, i) => `<rect x="${i * 50}" y="470" width="3" height="110" fill="#7a4420"/>`).join('')}
  <rect y="462" width="1600" height="14" fill="#7a4420"/>
  <rect y="576" width="1600" height="324" fill="url(#rr-floor)"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect y="${600 + i * 36}" width="1600" height="2.5" fill="#6e4220" opacity=".55"/>`).join('')}
  ${Array.from({ length: 30 }, (_, i) => `<rect x="${(i * 173) % 1600}" y="${578 + (i % 9) * 36}" width="3" height="34" fill="#6e4220" opacity=".45"/>`).join('')}
  <ellipse cx="800" cy="760" rx="560" ry="110" fill="url(#rr-rug)"/>
  <ellipse cx="800" cy="760" rx="520" ry="94" fill="none" stroke="#ffd166" stroke-width="5" stroke-dasharray="18 12" opacity=".8"/>
  <!-- window -->
  <rect x="90" y="170" width="300" height="230" rx="14" fill="#7a4420"/>
  <rect x="104" y="184" width="272" height="202" rx="8" fill="url(#rr-sky)"/>
  ${stars()}
  <circle cx="320" cy="230" r="26" fill="#fff6c4"/><circle cx="332" cy="222" r="24" fill="#3a2c74"/>
  <rect x="236" y="184" width="8" height="202" fill="#7a4420"/><rect x="104" y="281" width="272" height="8" fill="#7a4420"/>
  <!-- neon sign -->
  <g filter="url(#rr-glow)" class="neon">
    <rect x="1150" y="170" width="300" height="120" rx="26" fill="none" stroke="#ff4fd8" stroke-width="8"/>
    <text x="1300" y="252" text-anchor="middle" font-family="Titan One, Arial Rounded MT Bold, sans-serif" font-size="66" fill="#fff" stroke="#ff4fd8" stroke-width="3">${sign}</text>
  </g>
  <!-- poster -->
  <rect x="470" y="200" width="150" height="190" rx="8" fill="#fff" transform="rotate(-4 545 295)"/>
  <rect x="482" y="212" width="126" height="120" rx="6" fill="#0bc2cf" transform="rotate(-4 545 295)"/>
  <circle cx="545" cy="270" r="34" fill="#ffd60a" transform="rotate(-4 545 295)"/>
  <rect x="490" y="345" width="110" height="12" rx="6" fill="#9a49aa" transform="rotate(-4 545 295)"/>
  <rect x="505" y="365" width="80" height="9" rx="4" fill="#ddd" transform="rotate(-4 545 295)"/>
  ${lights()}
  <!-- couch -->
  <g>
    <rect x="70" y="520" width="380" height="120" rx="34" fill="#2a9d8f"/>
    <rect x="90" y="470" width="340" height="90" rx="30" fill="#33b3a3"/>
    <rect x="40" y="540" width="80" height="110" rx="30" fill="#238b7e"/>
    <rect x="400" y="540" width="80" height="110" rx="30" fill="#238b7e"/>
    <rect x="125" y="560" width="270" height="56" rx="22" fill="#3fc7b6"/>
    <rect x="80" y="645" width="16" height="22" rx="4" fill="#5c3a1e"/><rect x="424" y="645" width="16" height="22" rx="4" fill="#5c3a1e"/>
    <rect x="300" y="500" width="70" height="56" rx="16" fill="#ffd166" transform="rotate(10 335 528)"/>
  </g>
  <!-- arcade cabinet -->
  <g>
    <path d="M1230 330 h170 l20 40 v300 h-210 v-300 z" fill="#3a0ca3"/>
    <rect x="1250" y="380" width="150" height="120" rx="10" fill="#111"/>
    <rect x="1262" y="392" width="126" height="96" rx="6" fill="#4cc9f0" class="screen"/>
    <rect x="1278" y="410" width="30" height="30" rx="6" fill="#ffd60a"/><rect x="1328" y="440" width="40" height="30" rx="6" fill="#f72585"/>
    <rect x="1230" y="330" width="190" height="42" rx="8" fill="#f72585"/>
    <text x="1325" y="360" text-anchor="middle" font-family="Titan One, sans-serif" font-size="26" fill="#fff">ARCADE</text>
    <rect x="1240" y="520" width="170" height="40" rx="8" fill="#560bad"/>
    <circle cx="1290" cy="540" r="10" fill="#ff595e"/><circle cx="1330" cy="540" r="10" fill="#ffca3a"/><circle cx="1368" cy="540" r="10" fill="#8ac926"/>
  </g>
  <!-- plant -->
  <g>
    <path d="M1500 600 h70 l-10 80 h-50 z" fill="#c8553d"/>
    <path d="M1535 600 C1500 540 1470 520 1450 470 C1500 500 1520 540 1535 600 Z" fill="#40916c"/>
    <path d="M1535 600 C1560 530 1590 500 1600 450 C1610 520 1570 560 1535 600 Z" fill="#52b788"/>
    <path d="M1535 600 C1530 520 1545 470 1560 430 C1575 500 1555 560 1535 600 Z" fill="#2d6a4f"/>
  </g>
</svg>`);
}
