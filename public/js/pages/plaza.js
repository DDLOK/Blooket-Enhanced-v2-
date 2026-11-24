// Blooket Enhanced v2 — the Plaza: a cozy hangout room where everyone's blooks walk, chat and emote.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, liveSocket } from '../api.js';
import { html, render, $, blook, toast, on, toStr, clubTag, icon } from '../ui.js';
import { sceneSvg } from '../scene.js';
import { music, musicState, sfx } from '../sfx.js';

const EMOTES = { wave: '👋', heart: '❤️', laugh: '😂', dance: '💃', gg: '🎉', wow: '😮', cool: '😎', sleep: '💤' };

export function plazaPage(el, params, { go }) {
  const players = new Map();
  let me = null, chatOn = true;
  render(el, html`<div class="plaza">${sceneSvg({ sign: 'PLAZA' })}
    <div class="plaza-top">
      <a class="btn small white" href="#/home" style="box-shadow:inset 0 -4px #0002">← Back</a>
      <span class="title-font plaza-name">The Plaza</span><span class="g-pill" id="count" style="font-size:16px">0 online</span>
      <span class="spacer"></span>
      <a class="btn small yellow" href="#/play">${icon('play')} Join Game</a>
      <a class="btn small" href="#/market">${icon('market')} Packs</a>
      <a class="btn small purple" href="#/clubs">${icon('club')} Clubs</a>
      <button class="icon-btn" id="mus" title="Music" style="background:#fff">${musicState.on ? '🎵' : '🔇'}</button>
    </div>
    <div class="plaza-floor" id="floor"></div>
    <div class="plaza-hint" id="hint">Click the floor (or use WASD / arrow keys) to walk around!</div>
    <div class="plaza-bar">
      <div class="row" style="gap:6px">${Object.entries(EMOTES).map(([k, e]) => html`<button class="emote-btn" data-emote="${k}" title="${k}">${e}</button>`)}</div>
      <form id="say" class="row" style="gap:6px;flex:1;min-width:220px"><input class="input" id="sayText" maxlength="80" placeholder="Say something nice…" autocomplete="off"><button class="btn">Say</button></form>
    </div>
  </div>`);
  const floor = $('#floor', el);

  const tag = p => html`<div class="pz-name">${p.club ? clubTag(p.club.tag, p.club.color) : ''}${p.name}</div>`;
  const place = (p, animate = true) => {
    const node = p.node;
    const dx = p.x - (p.px ?? p.x), dy = p.y - (p.py ?? p.y);
    const dist = Math.hypot(dx, dy * 0.6);
    node.style.transitionDuration = animate ? `${Math.min(2.4, Math.max(0.25, dist / 380))}s` : '0s';
    node.style.left = `${p.x / 10}%`;
    node.style.top = `${p.y / 10}%`;
    node.style.zIndex = String(10 + Math.round(p.y));
    if (dx) node.classList.toggle('left', dx < 0);
    if (animate && dist > 2) {
      node.classList.add('walking');
      clearTimeout(p.walkT);
      p.walkT = setTimeout(() => node.classList.remove('walking'), parseFloat(node.style.transitionDuration) * 1000);
    }
    p.px = p.x; p.py = p.y;
  };
  const add = p => {
    if (players.has(p.id)) return;
    const node = document.createElement('div');
    node.className = `pz-blook ${p.id === me ? 'me' : ''}`;
    node.innerHTML = toStr(html`<div class="pz-bubble" hidden></div><div class="pz-emote"></div><div class="pz-body">${blook(p.avatar, 78)}</div>${tag(p)}`);
    floor.append(node);
    p.node = node;
    players.set(p.id, p);
    place(p, false);
    $('#count', el).textContent = `${players.size} online`;
  };
  const remove = id => {
    const p = players.get(id);
    if (!p) return;
    p.node.classList.add('poof');
    setTimeout(() => p.node.remove(), 400);
    players.delete(id);
    $('#count', el).textContent = `${players.size} online`;
  };
  const say = (id, text) => {
    const p = players.get(id);
    if (!p) return;
    const b = $('.pz-bubble', p.node);
    b.textContent = text;
    b.hidden = false;
    clearTimeout(p.sayT);
    p.sayT = setTimeout(() => { b.hidden = true; }, 6000);
  };
  const emote = (id, e) => {
    const p = players.get(id);
    if (!p) return;
    const box = $('.pz-emote', p.node);
    const span = document.createElement('span');
    span.textContent = EMOTES[e];
    box.append(span);
    setTimeout(() => span.remove(), 1700);
    if (e === 'dance') { p.node.classList.add('dancing'); clearTimeout(p.danceT); p.danceT = setTimeout(() => p.node.classList.remove('dancing'), 3200); }
  };

  const sock = liveSocket('/api/ws?plaza=1', {
    onMessage: m => {
      switch (m.t) {
        case 'init':
          me = m.you; chatOn = m.chat;
          for (const p of players.values()) p.node.remove();
          players.clear();
          m.players.forEach(add);
          if (!chatOn) { const i = $('#sayText', el); i.disabled = true; i.placeholder = 'Chat is turned off by an admin'; }
          break;
        case 'join': add(m.p); break;
        case 'leave': remove(m.id); break;
        case 'move': { const p = players.get(m.id); if (p) { p.x = m.x; p.y = m.y; place(p); } break; }
        case 'say': say(m.id, m.text); break;
        case 'emote': emote(m.id, m.e); break;
        case 'error': if (m.fatal) { toast(m.msg, 'bad'); go('/home'); } break;
      }
    },
  });

  const moveTo = (x, y) => {
    const p = players.get(me);
    if (!p) return;
    p.x = Math.max(30, Math.min(970, Math.round(x)));
    p.y = Math.max(60, Math.min(970, Math.round(y)));
    place(p);
    sock.send({ t: 'move', x: p.x, y: p.y });
    $('#hint', el)?.remove();
  };
  floor.addEventListener('pointerdown', e => {
    const r = floor.getBoundingClientRect();
    moveTo((e.clientX - r.left) / r.width * 1000, (e.clientY - r.top) / r.height * 1000);
  });
  const onKey = e => {
    if (e.target.closest('input, textarea')) return;
    const p = players.get(me);
    if (!p) return;
    const k = e.key.toLowerCase();
    const d = { arrowleft: [-45, 0], a: [-45, 0], arrowright: [45, 0], d: [45, 0], arrowup: [0, -70], w: [0, -70], arrowdown: [0, 70], s: [0, 70] }[k];
    if (d) { e.preventDefault(); moveTo(p.x + d[0], p.y + d[1]); }
    if (k === 'enter') { e.preventDefault(); $('#sayText', el).focus(); }
  };
  window.addEventListener('keydown', onKey);
  $('#say', el).onsubmit = e => {
    e.preventDefault();
    const i = $('#sayText', el);
    if (!i.value.trim()) return;
    sock.send({ t: 'say', text: i.value });
    i.value = '';
    i.blur();
  };
  on(el, '[data-emote]', 'click', (e, b) => { sock.send({ t: 'emote', e: b.dataset.emote }); sfx('click'); });
  $('#mus', el).onclick = e => { e.currentTarget.textContent = music.toggle('lobby') ? '🎵' : '🔇'; };
  music.play('lobby');

  return () => { sock.close(); window.removeEventListener('keydown', onKey); music.stopSoon(); };
}
