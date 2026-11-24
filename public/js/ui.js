// Blooket Enhanced v2 — UI helpers. Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { blookSVG } from './blookart.js';
import { BLOOKS, RARITIES, BANNERS } from './data.js';

// ---- Safe HTML templating: every ${value} is escaped unless it came from html`` or raw() ----
const RAW = Symbol('raw');
export const raw = s => ({ [RAW]: String(s) });
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const part = v => (v == null || v === false ? '' : Array.isArray(v) ? v.map(part).join('') : v[RAW] !== undefined ? v[RAW] : esc(v));
export function html(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += part(v) + strings[i + 1]; });
  return raw(out);
}
export const toStr = h => part(h);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function render(el, h) { el.innerHTML = toStr(h); return el; }
export function on(root, sel, ev, fn) {
  root.addEventListener(ev, e => {
    const t = e.target.closest(sel);
    if (t && root.contains(t)) fn(e, t);
  });
}

// ---- Blooks ----
// A blook reference is a built-in id ("sprout") or a custom blook object ({ name, art }).
export const blook = (ref, size = 56, cls = '') => raw(blookSVG(ref, size, cls));
export const blookName = ref => (typeof ref === 'object' ? ref?.name : BLOOKS[ref]?.name) || 'Blook';
export const rarityColor = r => RARITIES[r]?.color || '#999';
export const bannerCss = id => (BANNERS.find(b => b.id === id) || BANNERS[0]).css;

// ---- Numbers & time ----
export const fmt = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Number(n || 0).toLocaleString());
export function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ---- Toasts & modals ----
export function toast(msg, kind = '') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.remove(), 3200);
}

export function modal(title, body, { wide = false, onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'overlay';
  wrap.innerHTML = toStr(html`<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="modal-head"><h2>${title}</h2><button class="x" aria-label="Close">&times;</button></div>
    <div class="modal-body"></div></div>`);
  const close = () => { wrap.remove(); document.removeEventListener('keydown', esc); onClose?.(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
  $('.x', wrap).onclick = close;
  document.addEventListener('keydown', esc);
  render($('.modal-body', wrap), body);
  document.body.append(wrap);
  return { el: $('.modal-body', wrap), close };
}

export function confirmBox(title, text, okLabel = 'Yes', kind = '') {
  return new Promise(resolve => {
    const m = modal(title, html`<p style="font-size:17px;margin-top:0">${text}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn white" data-no style="box-shadow:inset 0 -5px #ddd">Cancel</button><button class="btn ${kind}" data-yes>${okLabel}</button></div>`,
      { onClose: () => resolve(false) });
    $('[data-yes]', m.el).onclick = () => { resolve(true); m.close(); };
    $('[data-no]', m.el).onclick = () => m.close();
  });
}

// ---- Icons (original, simple shapes) ----
const ICONS = {
  compass: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  sets: '<rect x="3" y="4" width="4" height="4" rx="1"/><rect x="9" y="5" width="12" height="2.4" rx="1.2"/><rect x="3" y="10" width="4" height="4" rx="1"/><rect x="9" y="11" width="12" height="2.4" rx="1.2"/><rect x="3" y="16" width="4" height="4" rx="1"/><rect x="9" y="17" width="12" height="2.4" rx="1.2"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.3l6.6-.8z"/>',
  history: '<path d="M12 3a9 9 0 1 1-8.5 6h2.2A7 7 0 1 0 12 5V3z"/><path d="M2 4l4 1-1 4z"/><rect x="11" y="7" width="2.2" height="6" rx="1"/><rect x="11" y="11" width="5" height="2.2" rx="1"/>',
  homework: '<path d="M5 3h10l4 4v14H5z" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="8" y="10" width="8" height="2" rx="1"/><rect x="8" y="14" width="8" height="2" rx="1"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  blooks: '<rect x="3" y="3" width="8" height="8" rx="2.5"/><rect x="13" y="3" width="8" height="8" rx="2.5"/><rect x="3" y="13" width="8" height="8" rx="2.5"/><circle cx="17" cy="17" r="4"/>',
  market: '<path d="M3 9l2-5h14l2 5z"/><path d="M5 10h14v10H5z" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="10" y="14" width="4" height="6"/>',
  bazaar: '<path d="M4 7h16l-1.5 13h-13z"/><path d="M8 7a4 4 0 0 1 8 0" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  trophy: '<path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H3a4 4 0 0 0 4 5M17 5h4a4 4 0 0 1-4 5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="12" width="2" height="5"/><rect x="7" y="17" width="10" height="3" rx="1"/>',
  chat: '<path d="M4 4h16v12H9l-5 4z"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="6" y="7" width="6" height="5"/><rect x="14" y="7" width="4" height="2"/><rect x="14" y="10" width="4" height="2"/><rect x="6" y="14" width="12" height="2"/>',
  gear: '<path d="M10.3 2h3.4l.5 2.6 2 .9 2.2-1.5 2.4 2.4-1.5 2.2.9 2 2.6.5v3.4l-2.6.5-.9 2 1.5 2.2-2.4 2.4-2.2-1.5-2 .9-.5 2.6h-3.4l-.5-2.6-2-.9-2.2 1.5-2.4-2.4 1.5-2.2-.9-2L2 13.7v-3.4l2.6-.5.9-2L4 5.6 6.4 3.2l2.2 1.5 2-.9z"/><circle cx="12" cy="12" r="3.5" fill="#9a49aa"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/>',
  home: '<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',
  plus: '<rect x="10.5" y="4" width="3" height="16" rx="1.5"/><rect x="4" y="10.5" width="16" height="3" rx="1.5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/>',
  menu: '<rect x="3" y="5" width="18" height="2.6" rx="1.3"/><rect x="3" y="11" width="18" height="2.6" rx="1.3"/><rect x="3" y="17" width="18" height="2.6" rx="1.3"/>',
  user: '<circle cx="12" cy="8" r="4.5"/><path d="M3 21a9 9 0 0 1 18 0z"/>',
};
export const icon = (name, cls = 'icon') => raw(`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`);
export const lockSvg = () => raw(`<svg class="lock" viewBox="0 0 24 24">${ICONS.lock}</svg>`);

export const coin = (size = 22) => raw(`<svg class="coin" viewBox="0 0 32 32" width="${size}" height="${size}" aria-label="tokens"><circle cx="16" cy="16" r="15" fill="#e0a800"/><circle cx="16" cy="14.5" r="13" fill="#ffcd05"/><circle cx="16" cy="14.5" r="9.5" fill="none" stroke="#e0a800" stroke-width="2"/><path d="M16 8.5l1.9 3.9 4.3.6-3.1 3 .7 4.2-3.8-2-3.8 2 .7-4.2-3.1-3 4.3-.6z" fill="#fff6c4"/></svg>`);

// Rarity gems — each rarity gets its own cut, drawn in its color.
const GEM_SHAPES = {
  Starter: 'M16 4l10 6v12l-10 6-10-6V10z',
  Common: 'M16 3l12 13-12 13L4 16z',
  Uncommon: 'M9 5h14l6 9-13 15L3 14z',
  Rare: 'M16 3l11 6v14l-11 6-11-6V9z',
  Epic: 'M10 4h12l7 9-13 16L3 13z',
  Legendary: 'M16 2l5 9 9 2-7 7 2 10-9-5-9 5 2-10-7-7 9-2z',
  Chroma: 'M8 3h16l6 13-6 13H8L2 16z',
  Mystical: 'M16 2l4 8 9 1-6 7 2 10-9-4-9 4 2-10-6-7 9-1z',
};
export function gem(rarity, size = 28) {
  const c = rarityColor(rarity);
  const d = GEM_SHAPES[rarity] || GEM_SHAPES.Common;
  return raw(`<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-label="${rarity}"><path d="${d}" fill="${c}" stroke="#00000040" stroke-width="1.5" stroke-linejoin="round"/><path d="${d}" fill="#fff" opacity=".28" transform="translate(16 16) scale(.55) translate(-16 -19)"/></svg>`);
}

// Big gold score star for the Blooks page.
export const scoreStar = () => raw(`<svg viewBox="0 0 240 200" aria-hidden="true">
  <g transform="rotate(-18 40 110)"><path d="M40 72l9 19 21 3-15 14 4 21-19-10-19 10 4-21-15-14 21-3z" fill="#ffcd05" stroke="#e08e00" stroke-width="4" stroke-linejoin="round"/></g>
  <g transform="rotate(18 200 110)"><path d="M200 72l9 19 21 3-15 14 4 21-19-10-19 10 4-21-15-14 21-3z" fill="#ffcd05" stroke="#e08e00" stroke-width="4" stroke-linejoin="round"/></g>
  <path d="M120 8l27 55 60 9-43 42 10 60-54-28-54 28 10-60-43-42 60-9z" fill="#ffcd05" stroke="#e08e00" stroke-width="6" stroke-linejoin="round"/>
  <path d="M120 22l22 45 49 7-35 34 8 49-44-23" fill="#ffe066" opacity=".7"/>
  <circle cx="120" cy="104" r="44" fill="#c47a00"/><circle cx="120" cy="104" r="44" fill="none" stroke="#a86400" stroke-width="4"/>
</svg>`);

// A treasure chest for Gold Rush.
export const chestSvg = (color = '#b5651d') => raw(`<svg viewBox="0 0 170 150" width="170" height="150"><rect x="15" y="58" width="140" height="82" rx="10" fill="${color}"/><path d="M15 70a70 52 0 0 1 140 0z" fill="${color}"/><path d="M15 70a70 52 0 0 1 140 0" fill="none" stroke="#00000030" stroke-width="5"/><rect x="15" y="66" width="140" height="12" fill="#ffcd05"/><rect x="75" y="62" width="20" height="30" rx="4" fill="#ffcd05" stroke="#d9a900" stroke-width="3"/><rect x="15" y="128" width="140" height="12" rx="6" fill="#00000030"/><rect x="28" y="20" width="12" height="120" fill="#00000018"/><rect x="130" y="20" width="12" height="120" fill="#00000018"/></svg>`);
