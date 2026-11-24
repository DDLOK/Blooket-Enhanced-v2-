// Blooket Enhanced v2 — host (teacher) game screen.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, liveSocket } from '../api.js';
import { html, render, $, blook, toast, fmt, on, confirmBox } from '../ui.js';
import { GAME_MODES } from '../data.js';
import { MODE_BG, podium, answerButtons, ordinal } from './play.js';

export function hostPage(el, { code }, { go }) {
  let game = null, players = [], board = [], st = 'lobby', q = null, answered = { count: 0, total: 0 }, endsAt = null, timer = null, reveal = null;
  const joinUrl = `${location.origin}/#/play`;

  const top = right => html`<div class="game-top"><span class="title-font">${game ? `${GAME_MODES[game.mode].name} · ${game.title}` : ''}</span><span class="spacer"></span>
    ${right}<button class="btn small ghost" id="fs">Fullscreen</button>${st !== 'ended' ? html`<button class="btn small red" id="endBtn">End Game</button>` : ''}</div>`;

  const draw = () => {
    clearInterval(timer);
    if (!game) return render(el, html`<div class="game-screen"><div class="game-body"><div class="spinner"></div></div></div>`);
    document.body.style.background = MODE_BG[game.mode];
    let body;
    if (st === 'lobby') {
      body = html`<div class="row" style="justify-content:center;gap:24px">
          <div class="join-code"><div style="font-size:15px">Go to <b>${joinUrl}</b> and enter</div><div class="code">${code}</div></div>
          <button class="btn big yellow" id="startBtn" ${players.length ? '' : 'disabled'}>Start</button></div>
        <div class="title-font" style="font-size:26px">${players.length} Player${players.length === 1 ? '' : 's'}</div>
        <div class="lobby-players">${players.length ? players.map(p => html`<div class="lobby-player ${p.connected ? '' : 'off'}">${blook(p.blook, 42)}<span>${p.name}</span><button class="kick" data-kick="${p.id}" title="Remove">✕</button></div>`)
          : html`<p style="font-size:20px">Waiting for players to join…</p>`}</div>`;
    } else if (st === 'ended') {
      body = html`<h1 style="font-size:52px;text-shadow:0 4px rgba(0,0,0,.2)">Final Results</h1>${podium(board)}
        <div class="leader" style="margin-top:16px">${board.slice(3, 30).map((p, i) => html`<div class="lrow"><span class="rank">${i + 4}</span>${blook(p.blook, 40)}<span class="nm">${p.name}</span><span class="sc">${fmt(p.score)}</span></div>`)}</div>
        <div class="row"><a class="btn big white" href="#/history">View Full Report</a><a class="btn big yellow" href="#/set/${game.setId || ''}" id="again">Back to Dashboard</a></div>`;
    } else if (game.mode === 'classic') {
      if (reveal) {
        body = html`<div class="question-box">${q.q}</div>
          ${answerButtons(q.answers, i => html`<span class="cnt">${reveal.counts[i]} answered</span>`)}
          <div class="leader">${reveal.top.map((p, i) => html`<div class="lrow"><span class="rank">${i + 1}</span>${blook(p.blook, 40)}<span class="nm">${p.name}</span><span class="sc">${fmt(p.score)}</span></div>`)}</div>
          <button class="btn big yellow" id="nextBtn">${reveal.last ? 'See Results' : 'Next Question'}</button>`;
      } else if (q) {
        body = html`<div class="row" style="width:min(1000px,100%)"><div class="timer-ring" id="qtimer" data-end="${q.endsAt}"></div><span class="spacer"></span>
          <span class="title-font" style="font-size:22px">Question ${q.index + 1} of ${q.total}</span><span class="spacer"></span>
          <span class="title-font" style="font-size:22px">${answered.count} / ${answered.total || players.length} answered</span><button class="btn small" id="skip">Skip</button></div>
          <div class="question-box">${q.q}</div>${answerButtons(q.answers)}`;
      } else body = html`<div class="spinner"></div>`;
    } else if (game.mode === 'race') {
      const goal = game.settings.goal;
      body = html`<h2 style="font-size:30px">First to ${goal} correct answers wins!</h2><div class="track">${board.map(p => html`<div class="lane">
        <div class="runner" style="left:calc(${Math.min(100, p.score / goal * 100)}% * .86)">${blook(p.blook, 50)}<span class="nm">${p.name} · ${p.score}</span></div><span class="flag">🏁</span></div>`)}</div>`;
    } else {
      body = html`<div class="title-font" id="clock" style="font-size:64px;text-shadow:0 4px rgba(0,0,0,.2)"></div>
        <div class="leader">${board.map((p, i) => html`<div class="lrow"><span class="rank">${i + 1}</span>${blook(p.blook, 44)}<span class="nm">${p.name}</span><span class="sc">${fmt(p.score)} 🪙</span></div>`)}</div>`;
    }
    render(el, html`<div class="game-screen">${top('')}<div class="game-body">${body}</div></div>`);
    const clock = $('#clock', el), qt = $('#qtimer', el);
    if (clock || qt) {
      const upd = () => {
        if (clock && endsAt) { const s = Math.max(0, Math.round((endsAt - Date.now()) / 1000)); clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
        if (qt) qt.textContent = Math.max(0, Math.ceil((Number(qt.dataset.end) - Date.now()) / 1000));
      };
      upd(); timer = setInterval(upd, 250);
    }
  };

  const sock = liveSocket(`/api/ws?game=${encodeURIComponent(code)}&host=1`, {
    onStatus: s => { if (s === 'reconnecting') toast('Reconnecting…'); },
    onMessage: m => {
      switch (m.t) {
        case 'hello': game = m.game; st = m.game.state; draw(); break;
        case 'lobby': players = m.players; if (st === 'lobby') draw(); else if (m.state === 'lobby') { st = 'lobby'; draw(); } break;
        case 'start': st = 'playing'; endsAt = m.endsAt; draw(); break;
        case 'question': q = m; reveal = null; answered = { count: 0, total: players.filter(p => p.connected).length }; st = 'playing'; draw(); break;
        case 'answered': answered = m; { const s = el.querySelector('.game-body .row .title-font:last-of-type'); if (s) s.textContent = `${m.count} / ${m.total} answered`; } break;
        case 'reveal':
          reveal = m;
          draw();
          el.querySelectorAll('[data-ans]').forEach((b, i) => { b.classList.add(m.correct.includes(i) ? 'right' : 'dim'); b.disabled = true; });
          break;
        case 'board': board = m.players; if (m.endsAt) endsAt = m.endsAt; if (st === 'playing' && game.mode !== 'classic') draw(); break;
        case 'end': st = 'ended'; board = m.standings; draw(); break;
        case 'error': if (m.fatal) { sock.close(); render(el, html`<div class="game-screen"><div class="game-body">${blook('pebble', 110)}<h2>${m.msg}</h2><a class="btn big white" href="#/home">Back</a></div></div>`); } else toast(m.msg, 'bad'); break;
      }
    },
  });

  on(el, '#startBtn', 'click', () => sock.send({ t: 'start' }));
  on(el, '#nextBtn', 'click', () => sock.send({ t: 'next' }));
  on(el, '#skip', 'click', () => sock.send({ t: 'reveal' }));
  on(el, '[data-kick]', 'click', (e, b) => sock.send({ t: 'kick', pid: b.dataset.kick }));
  on(el, '#endBtn', 'click', async () => { if (await confirmBox('End game?', 'Everyone will see the final results.', 'End Game', 'red')) sock.send({ t: 'end' }); });
  on(el, '#fs', 'click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); });
  on(el, '#again', 'click', e => { e.preventDefault(); go('/home'); });

  draw();
  return () => { sock.close(); clearInterval(timer); document.body.style.background = ''; };
}

export { ordinal };
