// Blooket Enhanced v2 — host (teacher) game screen.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { liveSocket } from '../api.js';
import { html, raw, render, $, blook, toast, fmt, on, confirmBox, currencyIcon, ago } from '../ui.js';
import { GAME_MODES } from '../data.js';
import { podium, answerButtons, modeBg } from './play.js';
import { sfx, sfxState, toggleMute, music, musicState } from '../sfx.js';

export function hostPage(el, { code }, { go }) {
  let game = null, players = [], board = [], st = 'lobby', q = null, answered = { count: 0, total: 0 }, endsAt = null, clock = null, reveal = null, feed = [];
  const joinHost = location.host;
  const M = () => GAME_MODES[game?.mode] || GAME_MODES.goldrush;

  const timerText = () => { const s = Math.max(0, Math.round((endsAt - Date.now()) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const top = () => html`<div class="g-top"><span class="who">${M().name}</span><span style="opacity:.85">· ${game?.title || ''}</span><span class="spacer"></span>
    ${st === 'playing' && endsAt && game.mode !== 'classic' ? html`<span class="g-pill timer" id="timer">⏱ ${timerText()}</span>` : ''}
    ${st === 'playing' && game?.settings?.winType === 'goal' ? html`<span class="g-pill" style="font-size:18px">${currencyIcon(M().icon, 22)} Goal: ${fmt(game.settings.goal)}</span>` : ''}
    <button class="icon-btn" id="musicBtn" title="Music">${musicState.on ? '🎵' : '⏸'}</button>
    <button class="icon-btn" id="mute" title="Sound effects">${sfxState.muted ? '🔇' : '🔊'}</button>
    <button class="btn small ghost" id="fs">Fullscreen</button>
    ${st !== 'ended' ? html`<button class="btn small red" id="endBtn">${st === 'lobby' ? 'Cancel' : 'End Game'}</button>` : ''}</div>`;

  const rows = () => {
    const max = Math.max(1, game.settings.winType === 'goal' ? game.settings.goal : board[0]?.score || 1);
    return board.map((p, i) => html`<div class="h-row"><span class="rank">${i + 1}</span>${blook(p.blook, 50)}
      <div class="nm"><b>${p.name}</b><div class="bar"><div style="width:${Math.min(100, p.score / max * 100)}%;background:${M().color}"></div></div></div>
      ${p.extra ? html`<span class="muted" style="font-size:13px">${p.extra}</span>` : ''}
      <span class="val">${currencyIcon(M().icon, 24)}${fmt(p.score)}</span></div>`);
  };

  const mainHtml = () => (game.mode === 'race'
    ? html`<div class="track" style="width:100%">${board.map(p => html`<div class="lane"><div class="runner" style="left:calc(${Math.min(100, p.score / game.settings.goal * 100)}% * .85)">${blook(p.blook, 50)}<span class="nm">${p.name} · ${p.score}</span></div><span class="flag">🏁</span></div>`)}</div>`
    : html`<div class="h-board">${rows()}</div>`);

  const draw = () => {
    clearInterval(clock);
    if (!game) return render(el, html`<div class="game-screen" style="background:${raw(GAME_MODES.goldrush.bg)}"><div class="g-center"><div class="spinner"></div></div></div>`);
    let body;
    if (st === 'lobby') {
      const s = game.settings;
      body = html`<div class="h-wrap">
        <div class="row" style="justify-content:center;gap:22px">
          <div class="h-join"><div class="url">Go to<b>${joinHost}/#/play</b></div><div class="id"><small>Game ID</small><span class="code">${code}</span></div></div>
          <button class="btn big yellow" id="startBtn" ${players.length ? '' : 'disabled'}>Start</button>
        </div>
        <div class="row" style="justify-content:center"><span class="g-pill" style="font-size:18px">${players.length} Player${players.length === 1 ? '' : 's'}</span>
          <span class="g-pill" style="font-size:18px">${s.winType === 'time' ? `⏱ ${s.timeLimitMin} min` : s.winType === 'goal' ? html`${currencyIcon(M().icon, 20)} First to ${fmt(s.goal)}` : `${game.questionCount} questions`}</span></div>
        <div class="h-players">${players.length ? players.map(p => html`<div class="h-player ${p.connected ? '' : 'off'}">${blook(p.blook, 70)}<div>${p.name}</div><button class="kick" data-kick="${p.id}" title="Remove">✕</button></div>`)
          : html`<div class="mid-word" style="grid-column:1/-1;text-align:center;font-size:26px">Waiting for players…</div>`}</div></div>`;
    } else if (st === 'ended') {
      body = html`<div class="h-wrap" style="overflow:auto"><div class="big-word" style="font-size:64px">Final Results</div>${podium(board, game.mode)}
        <div class="leader" style="margin-top:10px">${board.slice(3, 40).map((p, i) => html`<div class="lrow"><span class="rank">${i + 4}</span>${blook(p.blook, 40)}<span class="nm">${p.name}</span><span class="sc">${fmt(p.score)}</span></div>`)}</div>
        <div class="row"><a class="btn big white" href="#/history">View Full Report</a><a class="btn big yellow" href="#/set/${game.setId}">Back to Set</a></div></div>`;
    } else if (game.mode === 'classic') {
      if (reveal) {
        body = html`<div class="g-main"><div class="q-text">${q.q}</div>
          ${answerButtons(q.answers, i => html`<span class="cnt">${reveal.counts[i]} answered</span>`)}
          <div class="row" style="justify-content:center"><div class="leader">${reveal.top.map((p, i) => html`<div class="lrow"><span class="rank">${i + 1}</span>${blook(p.blook, 40)}<span class="nm">${p.name}</span><span class="sc">${fmt(p.score)}</span></div>`)}</div></div>
          <div class="row" style="justify-content:center"><button class="btn big yellow" id="nextBtn">${reveal.last ? 'See Results' : 'Next Question'}</button></div></div>`;
      } else if (q) {
        body = html`<div class="g-main"><div class="row"><div class="timer-ring" id="qtimer" data-end="${q.endsAt}"></div><span class="spacer"></span>
          <span class="g-pill">Question ${q.index + 1} of ${q.total}</span><span class="spacer"></span><span class="g-pill" id="answered">${answered.count} / ${answered.total || players.length} answered</span><button class="btn small" id="skip">Skip</button></div>
          <div class="q-text">${q.q}</div>${answerButtons(q.answers)}</div>`;
      } else body = html`<div class="g-center"><div class="spinner"></div></div>`;
    } else {
      body = html`<div class="h-wrap"><div class="h-game"><div id="hmain">${mainHtml()}</div>
        <div class="feed"><h3>Activity</h3><div id="feed">${feed.slice().reverse().map(f => html`<div class="feed-item ${f.kind}">${f.text}</div>`)}</div></div></div></div>`;
    }
    if (st === 'lobby') music.play('lobby'); else music.stopSoon();
    render(el, html`<div class="game-screen" style="background:${raw(modeBg(game.mode))}">${top()}${body}${game.mode === 'fishing' ? raw('<div class="water-bg"></div>') : ''}</div>`);
    clock = setInterval(() => {
      const t = $('#timer', el);
      if (t && endsAt) { t.textContent = `⏱ ${timerText()}`; t.classList.toggle('low', endsAt - Date.now() < 30_000); }
      const qt = $('#qtimer', el);
      if (qt) qt.textContent = Math.max(0, Math.ceil((Number(qt.dataset.end) - Date.now()) / 1000));
    }, 250);
  };

  const sock = liveSocket(`/api/ws?game=${encodeURIComponent(code)}&host=1`, {
    onStatus: s => { if (s === 'reconnecting') toast('Reconnecting…'); },
    onMessage: m => {
      switch (m.t) {
        case 'hello': game = m.game; st = m.game.state; endsAt = m.game.endsAt; feed = m.feed || []; draw(); break;
        case 'lobby': {
          const before = players.length;
          players = m.players;
          if (st === 'lobby') { draw(); if (players.length > before) sfx('click'); }
          break;
        }
        case 'start': st = 'playing'; endsAt = m.endsAt; if (m.settings) game.settings = m.settings; sfx('start'); draw(); break;
        case 'question': q = m; reveal = null; answered = { count: 0, total: players.filter(p => p.connected).length }; st = 'playing'; draw(); break;
        case 'answered': answered = m; { const s = $('#answered', el); if (s) s.textContent = `${m.count} / ${m.total} answered`; } break;
        case 'reveal':
          reveal = m;
          draw();
          el.querySelectorAll('[data-ans]').forEach((b, i) => { b.classList.add(m.correct.includes(i) ? 'right' : 'dim'); b.disabled = true; });
          break;
        case 'board': {
          board = m.players;
          if (st !== 'playing' || game.mode === 'classic') break;
          const hm = $('#hmain', el);
          if (hm) render(hm, mainHtml()); else draw();
          break;
        }
        case 'feed': {
          feed.push(m.item); if (feed.length > 40) feed.shift();
          const f = $('#feed', el);
          if (f) f.insertAdjacentHTML('afterbegin', `<div class="feed-item ${m.item.kind}">${m.item.text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)}</div>`);
          if (m.item.kind === 'big') sfx('coin');
          break;
        }
        case 'end': st = 'ended'; board = m.standings; sfx('win'); draw(); break;
        case 'error':
          if (m.fatal) { sock.close(); render(el, html`<div class="game-screen" style="background:${raw(GAME_MODES.goldrush.bg)}"><div class="g-center">${blook('pebble', 110)}<div class="mid-word">${m.msg}</div><a class="btn big white" href="#/home">Back</a></div></div>`); }
          else toast(m.msg, 'bad');
          break;
      }
    },
  });

  on(el, '#startBtn', 'click', () => sock.send({ t: 'start' }));
  on(el, '#nextBtn', 'click', () => sock.send({ t: 'next' }));
  on(el, '#skip', 'click', () => sock.send({ t: 'reveal' }));
  on(el, '[data-kick]', 'click', (e, b) => sock.send({ t: 'kick', pid: b.dataset.kick }));
  on(el, '#endBtn', 'click', async () => {
    if (st === 'lobby') { if (await confirmBox('Cancel game?', 'Players in the lobby will be sent home.', 'Cancel Game', 'red')) { sock.send({ t: 'end' }); go('/home'); } return; }
    if (await confirmBox('End game?', 'Everyone will see the final results.', 'End Game', 'red')) sock.send({ t: 'end' });
  });
  on(el, '#mute', 'click', (e, b) => { b.textContent = toggleMute() ? '🔇' : '🔊'; });
  on(el, '#musicBtn', 'click', (e, b) => { const onNow = music.toggle(st === 'lobby' ? 'lobby' : null); b.textContent = onNow ? '🎵' : '⏸'; if (st !== 'lobby') music.stop(); });
  on(el, '#fs', 'click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); });

  draw();
  return () => { sock.close(); clearInterval(clock); music.stopSoon(); };
}

export { ago };
