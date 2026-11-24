// Blooket Enhanced v2 — joining a game and the player's game screens.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, get, post, liveSocket } from '../api.js';
import { html, raw, render, $, blook, blookName, toast, fmt, chestSvg, on, toStr } from '../ui.js';
import { BLOOKS, STARTERS, GAME_MODES, RARITIES } from '../data.js';

export const MODE_BG = {
  classic: 'linear-gradient(160deg,#5b5bd6,#9a49aa)',
  goldrush: 'linear-gradient(160deg,#ffb703,#fb8500)',
  race: 'linear-gradient(160deg,#4bc22e,#2a9d8f)',
};

export function podium(list) {
  const order = [list[1], list[0], list[2]];
  return html`<div class="podium">${order.map((p, i) => p ? html`<div class="place p${[2, 1, 3][i]}">${blook(p.blook, [80, 110, 70][i])}<div class="nm">${p.name}</div><div class="title-font" style="font-size:16px">${fmt(p.score)}</div><div class="block">${[2, 1, 3][i]}</div></div>` : html`<div class="place"></div>`)}</div>`;
}

export function answerButtons(answers, extra = () => '') {
  return html`<div class="answers">${answers.map((a, i) => html`<button class="answer" data-ans="${i}">${a}${extra(i)}</button>`)}</div>`;
}

// ---- Join ----------------------------------------------------------------------------------------
export async function joinPage(el, { code }, { go }) {
  document.body.style.background = MODE_BG.classic;
  const cleanup = () => { document.body.style.background = ''; };
  if (!code) {
    render(el, html`<div class="game-screen"><div class="game-top"><a href="#/${state.me ? 'home' : ''}" class="title-font" style="font-size:24px">${state.settings.siteName}</a></div>
      <div class="game-body"><h1 style="font-size:54px;text-shadow:0 5px rgba(0,0,0,.2)">Join a Game</h1>
      <form class="join-card" id="f"><input class="input" id="code" inputmode="numeric" maxlength="6" placeholder="Game ID" autocomplete="off" autofocus><button class="btn big block" style="margin-top:10px">Join</button></form>
      </div></div>`);
    $('#f', el).onsubmit = e => { e.preventDefault(); const c = $('#code', el).value.replace(/\D/g, ''); if (c.length === 6) go(`/play/${c}`); else toast('Game IDs are 6 digits', 'bad'); };
    return cleanup;
  }
  let info;
  try { info = (await get(`/api/games/${code}`)).game; }
  catch (e) {
    render(el, html`<div class="game-screen"><div class="game-body">${blook('pebble', 110)}<h2>${e.message}</h2><a class="btn" href="#/play">Try another ID</a></div></div>`);
    return cleanup;
  }
  const me = state.me;
  const choices = me
    ? [...STARTERS.map(s => s.id), ...Object.keys(me.blooks).filter(id => BLOOKS[id] && BLOOKS[id].rarity !== 'Starter').sort((a, b) => RARITIES[BLOOKS[b].rarity].order - RARITIES[BLOOKS[a].rarity].order), ...(me.customs || []).map(c => 'custom:' + c.id)]
    : STARTERS.map(s => s.id);
  let pick = me?.avatarRef && choices.includes(me.avatarRef) ? me.avatarRef : choices[0];
  const refToBlook = r => (r.startsWith('custom:') ? me.customs.find(c => 'custom:' + c.id === r) : r);
  render(el, html`<div class="game-screen"><div class="game-top"><span class="title-font">${info.modeName} · ${info.title}</span></div>
    <div class="game-body">
      <form class="join-card" id="f" style="width:min(640px,100%)">
        <h2 style="color:var(--purple);text-align:center;font-size:28px">Pick your blook</h2>
        <div class="blook-tiles" style="max-height:220px;overflow:auto;justify-content:center;margin:10px 0;padding:4px">${choices.map(r => html`<div class="tile ${r === pick ? 'selected' : ''}" data-pick="${r}" style="background:#f3e9f6">${blook(refToBlook(r), 54)}</div>`)}</div>
        ${!me ? html`<p class="center muted" style="font-size:13px;margin:0 0 8px"><a href="#/login" style="color:var(--purple)">Log in</a> to use your own blooks and earn tokens.</p>` : ''}
        <input class="input" id="name" maxlength="15" placeholder="Nickname" value="${me?.username || ''}" autocomplete="off" required>
        <button class="btn big block yellow" style="margin-top:10px">Join Game</button>
      </form></div></div>`);
  on(el, '[data-pick]', 'click', (e, t) => { pick = t.dataset.pick; el.querySelectorAll('[data-pick]').forEach(x => x.classList.toggle('selected', x === t)); });
  $('#f', el).onsubmit = async e => {
    e.preventDefault();
    try {
      const r = await post(`/api/games/${code}/join`, { name: $('#name', el).value, blook: pick });
      sessionStorage.setItem(`game:${code}`, JSON.stringify({ pid: r.pid, token: r.token }));
      go(`/game/${code}`);
    } catch (err) { toast(err.message, 'bad'); }
  };
  return cleanup;
}

// ---- Player game screen --------------------------------------------------------------------------
export function gamePage(el, { code }, { go }) {
  const creds = JSON.parse(sessionStorage.getItem(`game:${code}`) || 'null');
  if (!creds) { go(`/play/${code}`); return; }
  let mode = 'classic', you = null, game = null, score = 0, endsAt = null, goal = 0, board = [], timer = null, view = 'lobby', lastQuestion = null;
  const setBg = cls => { document.body.style.background = MODE_BG[mode]; document.body.classList.remove('screen-correct', 'screen-wrong'); if (cls) document.body.classList.add(cls); };
  const scoreLabel = () => (mode === 'goldrush' ? `${fmt(score)} Gold` : mode === 'race' ? `${score} / ${goal}` : `${fmt(score)} pts`);

  const frame = (body, opts = {}) => {
    render(el, html`<div class="game-screen">
      <div class="game-top">${you ? blook(you.blook, 40) : ''}<span class="title-font">${you?.name || ''}</span><span class="spacer"></span>
        ${endsAt && mode === 'goldrush' ? html`<span class="title-font" id="clock" style="font-size:22px"></span>` : ''}
        <span class="title-font" style="background:rgba(0,0,0,.25);padding:4px 14px;border-radius:8px;font-size:22px">${scoreLabel()}</span></div>
      ${mode === 'race' && opts.track !== false && view !== 'lobby' && view !== 'end' ? raceTrack(true) : ''}
      <div class="game-body">${body}</div></div>`);
    tickClock();
  };
  const tickClock = () => {
    clearInterval(timer);
    const c = $('#clock', el);
    const qt = $('#qtimer', el);
    if (!c && !qt) return;
    const upd = () => {
      if (c && endsAt) { const s = Math.max(0, Math.round((endsAt - Date.now()) / 1000)); c.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
      if (qt) qt.textContent = Math.max(0, Math.ceil((Number(qt.dataset.end) - Date.now()) / 1000));
    };
    upd(); timer = setInterval(upd, 250);
  };
  const raceTrack = small => html`<div class="track" style="margin:12px auto 0;${small ? 'transform:scale(.85);transform-origin:top' : ''}">${board.slice(0, small ? 6 : 50).map(p => html`<div class="lane">
      <div class="runner" style="left:calc(${Math.min(100, (p.score / goal) * 100)}% * .86)">${blook(p.blook, 50)}<span class="nm">${p.name}${p.id === you?.id ? ' (you)' : ''}</span></div><span class="flag">🏁</span></div>`)}</div>`;

  const showLobby = players => {
    view = 'lobby';
    frame(html`${blook(you?.blook || 'blip', 150)}<h1 style="font-size:46px;text-shadow:0 4px rgba(0,0,0,.2)">You're in!</h1>
      <p class="title-font" style="font-size:22px">Waiting for the host to start… (${players.length} player${players.length === 1 ? '' : 's'})</p>
      <p style="opacity:.85">${GAME_MODES[mode].desc}</p>`);
  };

  const showQuestion = m => {
    view = 'question';
    lastQuestion = m;
    setBg();
    frame(html`${m.endsAt ? html`<div class="timer-ring" id="qtimer" data-end="${m.endsAt}"></div>` : ''}
      <div class="question-box">${m.q}</div>${answerButtons(m.answers)}`);
  };

  const showWaiting = text => { view = 'wait'; frame(html`<div class="spinner"></div><h2 style="font-size:32px">${text}</h2>`); };

  const showChests = () => {
    view = 'chests';
    setBg();
    frame(html`<h2 style="font-size:40px;text-shadow:0 4px rgba(0,0,0,.2)">Choose a chest!</h2><div class="chests">${[0, 1, 2].map(i => html`<button class="chest" data-chest="${i}">${chestSvg(['#b5651d', '#8e5a2a', '#a0522d'][i])}</button>`)}</div>`);
  };

  const next = () => sock.send({ t: 'next' });

  const handle = m => {
    switch (m.t) {
      case 'hello': you = m.you; game = m.game; mode = game.mode; goal = game.goal; endsAt = game.endsAt; score = you.score; setBg(); break;
      case 'lobby': if (m.state === 'lobby') showLobby(m.players); break;
      case 'start':
        endsAt = m.endsAt; goal = m.goal;
        if (mode !== 'classic') next(); else showWaiting('Get ready!');
        break;
      case 'question': if (m.score !== undefined) score = m.score; showQuestion(m); break;
      case 'locked': showWaiting('Answer locked in! Waiting for everyone…'); break;
      case 'reveal': {
        view = 'reveal';
        score = m.you.score;
        setBg(m.you.correct ? 'screen-correct' : 'screen-wrong');
        frame(html`<div class="feedback ${m.you.correct ? 'good' : 'bad'}">${m.you.correct ? 'Correct!' : m.you.choice == null ? "Time's up!" : 'Incorrect'}</div>
          ${m.you.correct ? html`<div class="title-font" style="font-size:30px">+${fmt(m.you.points)}</div>` : ''}
          <div class="title-font" style="font-size:24px">You're in ${ordinal(m.you.rank)} place</div>
          <p>${m.last ? 'Final results coming up…' : 'Waiting for the host to continue…'}</p>`);
        break;
      }
      case 'result': {
        view = 'result';
        if (m.score !== undefined) score = m.score;
        if (mode === 'race') score = m.progress;
        setBg(m.correct ? 'screen-correct' : 'screen-wrong');
        const correctText = lastQuestion ? m.correctIdx.map(i => lastQuestion.answers[i]).join(' / ') : '';
        frame(html`<div class="feedback ${m.correct ? 'good' : 'bad'}">${m.correct ? 'Correct!' : 'Incorrect'}</div>
          ${!m.correct ? html`<div class="question-box" style="font-size:22px">Answer: <b>${correctText}</b></div>` : ''}
          ${mode === 'race' && m.correct ? html`<div class="title-font" style="font-size:28px">Moved forward! ${m.progress} / ${m.goal}</div>` : ''}
          ${!m.correct || mode === 'race' ? html`<button class="btn big white" id="nextBtn">Next</button>` : ''}`);
        if (m.chests) setTimeout(() => { if (view === 'result') showChests(); }, 750);
        else if (mode === 'race' && m.correct) setTimeout(() => { if (view === 'result') next(); }, 900);
        break;
      }
      case 'chests': showChests(); break;
      case 'opened': {
        view = 'opened';
        if (m.score !== undefined) score = m.score;
        const boxes = el.querySelectorAll('.chest');
        boxes.forEach((b, i) => {
          b.disabled = true;
          b.classList.add(i === m.picked ? 'picked' : 'other');
          b.insertAdjacentHTML('beforeend', toStr(html`<span class="lbl">${m.all[i]}</span>`));
        });
        const body = el.querySelector('.game-body');
        const delta = m.delta ?? null;
        setTimeout(() => {
          if (m.kind === 'steal' || m.kind === 'swap') return; // a target picker follows
          body?.insertAdjacentHTML('beforeend', toStr(html`<div class="title-font" style="font-size:30px;margin-top:30px">${delta !== null ? (delta >= 0 ? `+${fmt(delta)} Gold` : `${fmt(delta)} Gold`) : ''}</div><button class="btn big white" id="nextBtn">Next Question</button>`));
          const sc = el.querySelector('.game-top .title-font:last-child'); if (sc) sc.textContent = scoreLabel();
        }, 700);
        break;
      }
      case 'target':
        view = 'target';
        setTimeout(() => frame(html`<h2 style="font-size:36px">${m.action === 'steal' ? `Who do you want to swipe ${m.amt}% from?` : 'Who do you want to swap gold with?'}</h2>
          <div class="leader">${m.targets.map(t => html`<button class="lrow" data-target="${t.id}" style="width:100%;border:0;cursor:pointer;font:inherit">${blook(t.blook, 44)}<span class="nm" style="text-align:left">${t.name}</span><span class="sc">${fmt(t.score)}</span></button>`)}</div>`), 900);
        break;
      case 'targetDone': score = m.score; view = 'opened'; frame(html`<h2 style="font-size:36px">${m.text}</h2><button class="btn big white" id="nextBtn">Next Question</button>`); break;
      case 'hit': score = m.score; toast(m.text, 'bad'); { const sc = el.querySelector('.game-top .title-font:last-child'); if (sc) sc.textContent = scoreLabel(); } break;
      case 'board':
        board = m.players;
        if (m.goal) goal = m.goal;
        if (mode === 'race' && view !== 'lobby' && view !== 'end') {
          const tr = el.querySelector('.track');
          if (tr) tr.outerHTML = toStr(raceTrack(true));
        }
        break;
      case 'end': {
        view = 'end';
        clearInterval(timer);
        setBg();
        endsAt = null;
        const y = m.you;
        frame(html`<h1 style="font-size:48px;text-shadow:0 4px rgba(0,0,0,.2)">${y.rank === 1 ? 'You won!' : 'Game over!'}</h1>
          ${podium(m.podium)}
          <div class="title-font" style="font-size:26px">You placed ${ordinal(y.rank)} of ${m.total} · ${scoreLabel()}</div>
          <div>${y.correct} / ${y.answered} correct</div>
          ${y.reward ? html`<div class="title-font" style="font-size:24px;color:#fff6a0">+${y.reward.tokens} tokens · +${y.reward.xp} XP</div>` : state.me ? '' : html`<div><a href="#/register" style="text-decoration:underline">Sign up</a> to earn tokens next time!</div>`}
          <div class="row"><a class="btn big white" href="#/${state.me ? 'home' : 'play'}">${state.me ? 'Back to Dashboard' : 'Play Again'}</a></div>`, { track: false });
        sessionStorage.removeItem(`game:${code}`);
        break;
      }
      case 'kicked': view = 'end'; sock.close(); frame(html`<h2 style="font-size:36px">You were removed from the game.</h2><a class="btn big white" href="#/play">OK</a>`); break;
      case 'error':
        if (m.fatal) { sock.close(); sessionStorage.removeItem(`game:${code}`); frame(html`${blook('pebble', 110)}<h2>${m.msg}</h2><a class="btn big white" href="#/play/${code}">Rejoin</a>`); }
        else toast(m.msg, 'bad');
        break;
    }
  };

  const sock = liveSocket(`/api/ws?game=${encodeURIComponent(code)}&pid=${encodeURIComponent(creds.pid)}&token=${encodeURIComponent(creds.token)}`, {
    onMessage: handle,
    onStatus: s => { if (s === 'reconnecting') toast('Reconnecting…'); },
  });

  on(el, '[data-ans]', 'click', (e, b) => {
    if (view !== 'question') return;
    view = 'answered';
    el.querySelectorAll('[data-ans]').forEach(x => { x.disabled = true; if (x !== b) x.classList.add('dim'); });
    sock.send({ t: 'answer', choice: Number(b.dataset.ans) });
  });
  on(el, '[data-chest]', 'click', (e, b) => { if (view !== 'chests') return; view = 'picking'; sock.send({ t: 'chest', i: Number(b.dataset.chest) }); });
  on(el, '[data-target]', 'click', (e, b) => { if (view !== 'target') return; view = 'wait'; sock.send({ t: 'target', pid: b.dataset.target }); });
  on(el, '#nextBtn', 'click', () => { view = 'wait'; next(); });

  frame(html`<div class="spinner"></div>`);
  return () => { sock.close(); clearInterval(timer); document.body.style.background = ''; document.body.className = ''; };
}

export const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export { blookName };
