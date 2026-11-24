// Blooket Enhanced v2 — joining a game and the player's game screens (Blooket-style, self-paced).
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, get, post, liveSocket } from '../api.js';
import { html, raw, render, $, blook, toast, fmt, chestSvg, on, toStr, currencyIcon, fishSvg, rarityColor } from '../ui.js';
import { BLOOKS, STARTERS, GAME_MODES, RARITIES } from '../data.js';
import { sfx, sfxState, toggleMute } from '../sfx.js';

export const modeBg = mode => GAME_MODES[mode]?.bg || GAME_MODES.goldrush.bg;
export const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

export function podium(list, mode) {
  const icon = GAME_MODES[mode]?.icon;
  const order = [list[1], list[0], list[2]];
  return html`<div class="podium">${order.map((p, i) => p ? html`<div class="place p${[2, 1, 3][i]}">${blook(p.blook, [84, 120, 74][i], i === 1 ? 'dance' : '')}<div class="nm">${p.name}</div>
    <div class="title-font row" style="justify-content:center;gap:5px;font-size:17px">${icon ? currencyIcon(icon, 20) : ''}${fmt(p.score)}</div><div class="block">${[2, 1, 3][i]}</div></div>` : html`<div class="place"></div>`)}</div>`;
}

export function answerButtons(answers, extra = () => '') {
  return html`<div class="q-answers ${answers.length === 3 ? 'three' : ''}">${answers.map((a, i) => html`<button class="answer" data-ans="${i}">${a}${extra(i)}</button>`)}</div>`;
}

// ---- Join ----------------------------------------------------------------------------------------
export async function joinPage(el, { code }, { go }) {
  if (!code) {
    render(el, html`<div class="game-screen" style="background:${raw(GAME_MODES.goldrush.bg)}"><div class="g-top"><a href="#/${state.me ? 'home' : ''}" class="who">${state.settings.siteName}</a></div>
      <div class="g-center"><div class="big-word" style="font-size:64px">Join a Game</div>
      <form class="join-card" id="f"><input class="input" id="code" inputmode="numeric" maxlength="6" placeholder="Game ID" autocomplete="off" autofocus><button class="btn big block" style="margin-top:10px">Join</button></form>
      <div class="parade">${['bumble', 'squidlet', 'zorp', 'witchy-cat', 'bot-9'].map(b => blook(b, 64))}</div></div></div>`);
    $('#f', el).onsubmit = e => { e.preventDefault(); const c = $('#code', el).value.replace(/\D/g, ''); if (c.length === 6) go(`/play/${c}`); else toast('Game IDs are 6 digits', 'bad'); };
    return;
  }
  let info;
  try { info = (await get(`/api/games/${code}`)).game; }
  catch (e) {
    render(el, html`<div class="game-screen" style="background:${raw(GAME_MODES.goldrush.bg)}"><div class="g-center">${blook('pebble', 110)}<div class="mid-word">${e.message}</div><a class="btn big" href="#/play">Try another ID</a></div></div>`);
    return;
  }
  const me = state.me;
  const choices = me
    ? [...STARTERS.map(s => s.id), ...Object.keys(me.blooks).filter(id => BLOOKS[id] && BLOOKS[id].rarity !== 'Starter').sort((a, b) => RARITIES[BLOOKS[b].rarity].order - RARITIES[BLOOKS[a].rarity].order), ...(me.customs || []).map(c => 'custom:' + c.id)]
    : STARTERS.map(s => s.id);
  let pick = me?.avatarRef && choices.includes(me.avatarRef) ? me.avatarRef : choices[0];
  const refToBlook = r => (r.startsWith('custom:') ? me.customs.find(c => 'custom:' + c.id === r) : r);
  const M = GAME_MODES[info.mode];
  render(el, html`<div class="game-screen" style="background:${raw(M.bg)}"><div class="g-top"><span class="who">${M.name}</span><span class="spacer"></span><span>${info.title}</span></div>
    <div class="g-center">
      <form class="join-card" id="f" style="width:min(660px,100%)">
        <h2 style="color:var(--purple);text-align:center;font-size:28px">Choose your blook</h2>
        <div class="row" style="justify-content:center;margin:6px 0" id="preview">${blook(refToBlook(pick), 110, 'dance')}</div>
        <div class="blook-tiles" style="max-height:190px;overflow:auto;justify-content:center;margin:6px 0 10px;padding:4px">${choices.map(r => html`<div class="tile ${r === pick ? 'selected' : ''}" data-pick="${r}" style="background:#f3e9f6">${blook(refToBlook(r), 54)}</div>`)}</div>
        ${!me ? html`<p class="center muted" style="font-size:13px;margin:0 0 8px"><a href="#/login" style="color:var(--purple)">Log in</a> to use your own blooks and earn tokens.</p>` : ''}
        <input class="input" id="name" maxlength="15" placeholder="Nickname" value="${me?.username || ''}" autocomplete="off" required style="text-align:center;font-size:22px">
        <button class="btn big block yellow" style="margin-top:10px">Join Game</button>
      </form></div></div>`);
  on(el, '[data-pick]', 'click', (e, t) => {
    pick = t.dataset.pick;
    el.querySelectorAll('[data-pick]').forEach(x => x.classList.toggle('selected', x === t));
    render($('#preview', el), blook(refToBlook(pick), 110, 'dance'));
  });
  $('#f', el).onsubmit = async e => {
    e.preventDefault();
    try {
      const r = await post(`/api/games/${code}/join`, { name: $('#name', el).value, blook: pick });
      sessionStorage.setItem(`game:${code}`, JSON.stringify({ pid: r.pid, token: r.token }));
      go(`/game/${code}`);
    } catch (err) { toast(err.message, 'bad'); }
  };
}

// ---- Player game screen --------------------------------------------------------------------------
export function gamePage(el, { code }, { go }) {
  const creds = JSON.parse(sessionStorage.getItem(`game:${code}`) || 'null');
  if (!creds) { go(`/play/${code}`); return; }

  const S = { mode: 'goldrush', you: null, score: 0, endsAt: null, settings: {}, board: [], rank: 0, total: 0, view: 'loading', lastQ: null, workers: [], rate: 0, lure: 1, password: null, started: false };
  let clock = null;
  const M = () => GAME_MODES[S.mode];

  const timerText = () => { const s = Math.max(0, Math.round((S.endsAt - Date.now()) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const topBar = () => html`<div class="g-top">
      ${S.you ? blook(S.you.blook, 42) : ''}<span class="who">${S.you?.name || ''}</span><span class="spacer"></span>
      ${S.started && S.endsAt && S.mode !== 'classic' ? html`<span class="g-pill timer" id="timer">⏱ ${timerText()}</span>` : ''}
      ${S.started && S.settings.winType === 'goal' && S.mode !== 'race' ? html`<span class="g-pill" style="font-size:16px">Goal: ${fmt(S.settings.goal)}</span>` : ''}
      ${S.started && S.rank ? html`<span class="g-pill" id="rank" style="font-size:18px">${ordinal(S.rank)}</span>` : ''}
      ${S.mode === 'factory' && S.started ? html`<span class="g-pill" style="font-size:16px" id="rate">+${fmt(S.rate)}/s</span>` : ''}
      <span class="g-pill" id="score">${currencyIcon(M().icon, 26)}<span>${S.mode === 'race' ? `${S.score}/${S.settings.goal || '?'}` : fmt(S.score)}</span></span>
      <button class="icon-btn" id="mute" title="Sound">${sfxState.muted ? '🔇' : '🔊'}</button>
    </div>`;
  const miniTrack = () => S.mode === 'race' && S.started && !['end', 'lobby'].includes(S.view)
    ? html`<div class="track mini-track" id="track" style="width:100%">${S.board.slice(0, 5).map(p => html`<div class="lane"><div class="runner" style="left:calc(${Math.min(100, (p.score / (S.settings.goal || 1)) * 100)}% * .85)">${blook(p.blook, 40)}<span class="nm">${p.name}${p.id === S.you?.id ? ' (you)' : ''}</span></div><span class="flag" style="top:8px">🏁</span></div>`)}</div>` : '';

  const screen = (body, { tint = null, cont = false } = {}) => {
    const bg = tint === 'good' ? 'linear-gradient(160deg,#4bc22e,#2f8f1b)' : tint === 'bad' ? 'linear-gradient(160deg,#e63946,#a4161a)' : M().bg;
    render(el, html`<div class="game-screen ${tint ? 'tinted' : ''}" style="background:${raw(bg)}">${topBar()}${miniTrack()}
      <div class="g-main ${cont ? 'clickable' : ''}" ${cont ? raw('data-continue') : ''}>${body}${cont ? html`<div class="tap-hint center" style="color:#fff">Click anywhere to continue</div>` : ''}</div>
      ${S.mode === 'fishing' ? raw('<div class="water-bg"></div>') : ''}</div>`);
    tick();
  };
  const tick = () => {
    clearInterval(clock);
    clock = setInterval(() => {
      const t = $('#timer', el);
      if (t && S.endsAt) { t.textContent = `⏱ ${timerText()}`; t.classList.toggle('low', S.endsAt - Date.now() < 30_000); }
      const qt = $('#qtimer', el);
      if (qt) qt.textContent = Math.max(0, Math.ceil((Number(qt.dataset.end) - Date.now()) / 1000));
    }, 250);
  };
  const setScore = v => {
    S.score = v;
    const s = $('#score span', el);
    if (s) s.textContent = S.mode === 'race' ? `${S.score}/${S.settings.goal}` : fmt(S.score);
  };
  const banner = (text, good = false) => {
    const b = document.createElement('div');
    b.className = `hit-banner ${good ? 'good' : ''}`;
    b.textContent = text;
    document.body.append(b);
    setTimeout(() => b.remove(), 2800);
  };

  // ---- Views ----
  const passwordPicker = opts => html`<div class="terminal" style="max-width:640px;width:100%">
      <div style="font-size:22px;margin-bottom:6px">&gt; CHOOSE YOUR PASSWORD_</div>
      <div style="font-size:14px;opacity:.8;margin-bottom:12px">Other players will try to guess it to hack you. Keep it secret!</div>
      <div class="pw-grid">${opts.map(w => html`<button class="pw-btn" data-pw="${w}">${w}</button>`)}</div></div>`;

  const lobbyView = (players = S.players || []) => {
    S.view = 'lobby';
    S.players = players;
    const pwPart = S.mode === 'crypto' ? (S.password ? html`<div class="terminal">&gt; PASSWORD SET: <b>${S.password.toUpperCase()}</b></div>` : S.pwOptions ? passwordPicker(S.pwOptions) : '') : '';
    screen(html`<div class="g-center">${blook(S.you?.blook || 'blip', 150, 'dance')}<div class="big-word" style="font-size:clamp(44px,7vw,80px)">You're in!</div>
      <div class="mid-word" style="font-size:24px">See your name on the host's screen? Waiting for the game to start… (${players.length} player${players.length === 1 ? '' : 's'})</div>
      <div style="max-width:560px;font-size:17px;opacity:.95">${M().desc}</div>${pwPart}</div>`);
  };

  const questionView = m => {
    S.view = 'question';
    S.lastQ = m;
    screen(html`${m.endsAt ? html`<div class="row" style="justify-content:center"><div class="timer-ring" id="qtimer" data-end="${m.endsAt}"></div></div>` : ''}
      <div class="q-text">${m.q}</div>${answerButtons(m.answers)}`);
  };

  const resultView = m => {
    S.view = 'result';
    const correctText = S.lastQ ? m.correctIdx.map(i => S.lastQ.answers[i]).join(' / ') : '';
    let extra = '';
    if (m.correct) {
      if (S.mode === 'fishing' && m.fish) {
        extra = html`<div class="fish-card">${m.fish.weight ? fishSvg(m.fish.color, 70) : raw('<div style="font-size:60px">🥾</div>')}
          <div class="title-font" style="font-size:26px">You caught ${m.fish.weight ? 'a' : 'an'} ${m.fish.name}!</div>
          <div class="w">${m.fish.weight} lbs</div><div class="title-font" style="color:${rarityColor(m.fish.rarity) || '#888'}">${m.fish.rarity}</div></div>
          ${m.lureUp ? html`<div class="lure-up">Lure upgraded to level ${m.lure}! Bigger fish ahead</div>` : ''}`;
      } else if (S.mode === 'race') {
        extra = html`<div class="mid-word">Moved forward! ${m.progress} / ${m.goal}</div><div class="race-progress"><div style="width:${Math.min(100, m.progress / m.goal * 100)}%"></div></div>`;
      } else if (S.mode === 'factory') {
        extra = html`<div class="mid-word">+${fmt(m.bonus || 0)} Cash</div><div style="font-size:18px">Next: hire a new worker!</div>`;
      } else if (S.mode === 'goldrush') extra = html`<div class="mid-word" style="font-size:28px">Choose a chest next!</div>`;
      else if (S.mode === 'crypto') extra = html`<div class="mid-word" style="font-size:28px">Choose your reward next!</div>`;
      if (m.streak >= 3) extra = html`${extra}<div class="lure-up">🔥 ${m.streak} in a row!</div>`;
    } else {
      extra = html`<div class="q-text" style="font-size:22px">Correct answer: <b>${correctText}</b></div>${S.mode === 'fishing' ? html`<div class="mid-word" style="font-size:26px">The fish got away!</div>` : ''}`;
    }
    screen(html`<div class="g-center">${blook(S.you.blook, 130, m.correct ? 'dance' : '')}<div class="big-word">${m.correct ? 'Correct!' : 'Incorrect'}</div>${extra}</div>`, { tint: m.correct ? 'good' : 'bad', cont: true });
    sfx(m.correct ? (S.mode === 'fishing' && m.fish ? 'splash' : 'correct') : 'wrong');
    if (m.lureUp) setTimeout(() => sfx('levelup'), 400);
  };

  const chestsView = () => {
    S.view = 'chests';
    screen(html`<div class="g-center"><div class="big-word" style="font-size:clamp(40px,6vw,70px)">Choose a chest!</div>
      <div class="chests">${[0, 1, 2].map(i => html`<button class="chest" data-chest="${i}">${chestSvg(['#b5651d', '#8e5a2a', '#a0522d'][i])}</button>`)}</div></div>`);
  };

  const targetView = m => {
    S.view = 'target';
    const title = m.action === 'steal' ? `Who do you want to swipe ${m.amt}% from?` : m.action === 'swap' ? 'Who do you want to swap with?' : 'Who do you want to hack?';
    const hack = m.action === 'hack';
    screen(html`<div class="g-center"><div class="mid-word">${title}</div>
      <div class="leader" style="max-height:60vh;overflow:auto">${m.targets.length ? m.targets.map(t => html`<button class="lrow" data-target="${t.id}" style="width:100%;border:0;cursor:pointer;font:inherit;${hack ? 'background:#0d1f17;color:#39ff14' : ''}">${blook(t.blook, 44)}<span class="nm" style="text-align:left">${t.name}</span><span class="sc">${currencyIcon(M().icon, 20)} ${fmt(t.score)}</span></button>`) : html`<p>Nobody else to pick!</p>`}</div></div>`);
  };

  const choicesView = m => {
    S.view = 'choices';
    screen(html`<div class="g-center"><div class="big-word" style="font-size:clamp(38px,6vw,64px)">Choose a reward</div><div class="card-choices">${m.options.map((o, i) =>
      o.kind === 'hack' ? html`<button class="choice-card hack" data-choose="${i}"><div style="font-size:56px">💻</div>HACK<span class="sub" style="color:#39ff14">Steal crypto from a player</span></button>`
        : o.kind === 'double' ? html`<button class="choice-card double" data-choose="${i}"><div style="font-size:56px">✖2</div>DOUBLE<span class="sub">Double your crypto</span></button>`
          : html`<button class="choice-card" data-choose="${i}">${currencyIcon('crypto', 64)}+${fmt(o.amt)}<span class="sub">Crypto</span></button>`)}</div></div>`);
  };

  const hackGuessView = m => {
    S.view = 'hackGuess';
    screen(html`<div class="g-center"><div class="terminal" style="max-width:640px;width:100%">
      <div style="font-size:22px;margin-bottom:10px">&gt; HACKING ${m.target.toUpperCase()}…<br>&gt; GUESS THEIR PASSWORD_</div>
      <div class="pw-grid">${m.options.map(w => html`<button class="pw-btn" data-guess="${w}">${w}</button>`)}</div></div></div>`);
    sfx('hack');
  };

  const factoryGrid = () => html`<div class="factory-grid">${Array.from({ length: 10 }, (_, i) => {
    const w = S.workers[i];
    return w ? html`<div class="slot" style="box-shadow:inset 0 -4px ${rarityColor(w.rarity)}">${w.level > 1 ? html`<span class="lv">Lv${w.level}</span>` : ''}${blook(w.blook, 48)}<span>${fmt(w.rate)}/s</span></div>` : html`<div class="slot empty"></div>`;
  })}</div>`;

  const workersView = m => {
    S.view = 'workers';
    S.workers = m.workers; S.rate = m.rate;
    const full = m.options[0]?.kind === 'upgrade';
    screen(html`<div class="g-center">${factoryGrid()}<div class="big-word" style="font-size:clamp(34px,5vw,56px)">${full ? 'Upgrade a worker' : 'Hire a worker'}</div>
      <div class="card-choices">${m.options.map((o, i) => html`<button class="choice-card" data-pick-w="${i}" style="box-shadow:inset 0 -10px ${rarityColor(o.rarity)},0 6px rgba(0,0,0,.2)">${blook(o.blook, 90)}
        <span style="font-size:20px">${BLOOKS[o.blook]?.name}</span><span class="title-font" style="color:${rarityColor(o.rarity)};font-size:16px">${o.rarity}${o.kind === 'upgrade' ? ` · Lv${o.level}` : ''}</span><span style="font-size:22px">+${fmt(o.rate)}/s</span></button>`)}</div></div>`);
  };

  const outcomeView = (text, delta, kind) => {
    S.view = 'outcome';
    const bad = kind === 'fail' || (typeof delta === 'number' && delta < 0);
    screen(html`<div class="g-center">${blook(S.you.blook, 120, bad ? '' : 'dance')}<div class="mid-word" style="font-size:clamp(28px,4vw,46px)">${text}</div>
      ${typeof delta === 'number' && delta !== 0 ? html`<div class="big-word" style="font-size:56px">${delta > 0 ? '+' : ''}${fmt(delta)}</div>` : ''}</div>`, { cont: true });
    sfx(bad ? 'bad' : kind === 'hack' ? 'hack' : 'coin');
  };

  const waitingView = text => { S.view = 'wait'; screen(html`<div class="g-center"><div class="spinner"></div><div class="mid-word">${text}</div></div>`); };

  const endView = m => {
    S.view = 'end';
    clearInterval(clock);
    const y = m.you;
    screen(html`<div class="g-center" style="overflow:auto"><div class="big-word" style="font-size:clamp(44px,7vw,78px)">${y.rank === 1 ? 'You won!' : 'Game over!'}</div>
      ${podium(m.podium, S.mode)}
      <div class="mid-word" style="font-size:26px">You placed ${ordinal(y.rank)} of ${m.total}</div>
      <div class="row" style="justify-content:center"><span class="g-pill">${currencyIcon(M().icon, 26)} ${fmt(y.score)}</span><span class="g-pill">${y.correct}/${y.answered} correct</span>${y.biggest ? html`<span class="g-pill">Biggest: ${y.biggest.name} (${y.biggest.weight} lbs)</span>` : ''}</div>
      ${y.reward ? html`<div class="title-font" style="font-size:24px;color:#fff6a0">+${y.reward.tokens} tokens · +${y.reward.xp} XP</div>` : state.me ? '' : html`<div><a href="#/register" style="text-decoration:underline">Sign up</a> to earn tokens next time!</div>`}
      <div class="row"><a class="btn big white" href="#/${state.me ? 'home' : 'play'}">${state.me ? 'Back to Dashboard' : 'Play Again'}</a></div></div>`);
    sfx(y.rank === 1 ? 'win' : 'start');
    sessionStorage.removeItem(`game:${code}`);
  };

  const next = () => { S.view = 'wait'; sock.send({ t: 'next' }); };

  // ---- Messages ----
  const handle = m => {
    if (S.view === 'end' && m.t !== 'end') return;
    switch (m.t) {
      case 'hello':
        S.you = m.you; S.mode = m.game.mode; S.settings = m.game.settings || {}; S.endsAt = m.game.endsAt; S.score = m.you.score;
        if (m.m?.workers) { S.workers = m.m.workers; S.rate = m.m.rate; }
        if (m.m?.lure) S.lure = m.m.lure;
        if (m.m?.password) S.password = m.m.password;
        break;
      case 'lobby': if (m.state === 'lobby') lobbyView(m.players); break;
      case 'password': S.pwOptions = m.options; if (S.view === 'lobby' || S.view === 'loading') lobbyView(); else { S.view = 'password'; screen(html`<div class="g-center">${passwordPicker(m.options)}</div>`); } break;
      case 'passwordSet': S.password = m.word; sfx('hack'); if (S.view === 'lobby') lobbyView(); break;
      case 'start':
        S.started = true; S.endsAt = m.endsAt; S.settings = m.settings || S.settings;
        if (!m.resume) sfx('start');
        if (S.mode === 'classic') { if (!m.resume) waitingView('Get ready!'); }
        else if (!m.resume) next();
        break;
      case 'ready': next(); break;
      case 'question': if (m.score !== undefined) S.score = m.score; questionView(m); break;
      case 'result': S.score = m.score; if (S.mode === 'race' && m.progress) S.score = m.progress; if (m.lure) S.lure = m.lure; resultView(m); break;
      case 'chests': chestsView(); break;
      case 'opened': {
        S.view = 'opened';
        const boxes = el.querySelectorAll('.chest');
        boxes.forEach((b, i) => { b.disabled = true; b.classList.add(i === m.picked ? 'picked' : 'other'); b.insertAdjacentHTML('beforeend', toStr(html`<span class="lbl">${m.all[i]}</span>`)); });
        sfx(['lose25', 'lose50', 'nothing'].includes(m.kind) ? 'bad' : 'chest');
        if (m.kind === 'steal' || m.kind === 'swap') break; // a target picker follows
        if (m.score !== undefined) setScore(m.score);
        setTimeout(() => { if (S.view === 'opened') outcomeView(m.label, m.delta, m.delta < 0 ? 'fail' : ''); }, 1100);
        break;
      }
      case 'target': setTimeout(() => targetView(m), S.view === 'opened' ? 1000 : 0); break;
      case 'choices': choicesView(m); break;
      case 'hackGuess': hackGuessView(m); break;
      case 'outcome': S.score = m.score; outcomeView(m.text, m.delta, m.kind); break;
      case 'workers': workersView(m); break;
      case 'factory': S.workers = m.workers; S.rate = m.rate; S.score = m.score; sfx('coin'); next(); break;
      case 'cash': { S.rate = m.rate; setScore(m.score); const r = $('#rate', el); if (r) r.textContent = `+${fmt(m.rate)}/s`; break; }
      case 'hit': setScore(m.score); banner(m.text, m.good); sfx(m.good ? 'coin' : 'bad'); break;
      case 'board': {
        S.board = m.players; S.rank = m.rank; S.total = m.total;
        const r = $('#rank', el); if (r) r.textContent = ordinal(S.rank);
        const tr = $('#track', el); if (tr) tr.outerHTML = toStr(miniTrack());
        break;
      }
      case 'locked': waitingView('Answer locked in! Waiting for everyone…'); break;
      case 'reveal': {
        S.view = 'reveal';
        S.score = m.you.score;
        screen(html`<div class="g-center">${blook(S.you.blook, 120, m.you.correct ? 'dance' : '')}<div class="big-word">${m.you.correct ? 'Correct!' : m.you.choice == null ? "Time's up!" : 'Incorrect'}</div>
          ${m.you.correct ? html`<div class="mid-word">+${fmt(m.you.points)}</div>` : ''}<div class="mid-word" style="font-size:26px">You're in ${ordinal(m.you.rank)} place</div>
          <div>${m.last ? 'Final results coming up…' : 'Waiting for the host…'}</div></div>`, { tint: m.you.correct ? 'good' : 'bad' });
        sfx(m.you.correct ? 'correct' : 'wrong');
        break;
      }
      case 'end': endView(m); break;
      case 'kicked': S.view = 'end'; sock.close(); screen(html`<div class="g-center"><div class="mid-word">You were removed from the game.</div><a class="btn big white" href="#/play">OK</a></div>`); break;
      case 'error':
        if (m.fatal) { S.view = 'end'; sock.close(); sessionStorage.removeItem(`game:${code}`); screen(html`<div class="g-center">${blook('pebble', 110)}<div class="mid-word">${m.msg}</div><a class="btn big white" href="#/play/${code}">Rejoin</a></div>`); }
        else toast(m.msg, 'bad');
        break;
    }
  };

  const sock = liveSocket(`/api/ws?game=${encodeURIComponent(code)}&pid=${encodeURIComponent(creds.pid)}&token=${encodeURIComponent(creds.token)}`, {
    onMessage: handle,
    onStatus: s => { if (s === 'reconnecting') toast('Reconnecting…'); },
  });

  // ---- Input ----
  on(el, '[data-ans]', 'click', (e, b) => {
    if (S.view !== 'question') return;
    S.view = 'answered';
    el.querySelectorAll('[data-ans]').forEach(x => { x.disabled = true; if (x !== b) x.classList.add('dim'); });
    sock.send({ t: 'answer', choice: Number(b.dataset.ans) });
  });
  on(el, '[data-continue]', 'click', () => { if (['result', 'outcome'].includes(S.view)) { sfx('click'); next(); } });
  on(el, '[data-chest]', 'click', (e, b) => { if (S.view !== 'chests') return; S.view = 'picking'; sock.send({ t: 'chest', i: Number(b.dataset.chest) }); });
  on(el, '[data-target]', 'click', (e, b) => { if (S.view !== 'target') return; S.view = 'wait'; sock.send({ t: 'target', pid: b.dataset.target }); });
  on(el, '[data-choose]', 'click', (e, b) => { if (S.view !== 'choices') return; S.view = 'wait'; sock.send({ t: 'choose', i: Number(b.dataset.choose) }); });
  on(el, '[data-guess]', 'click', (e, b) => { if (S.view !== 'hackGuess') return; S.view = 'wait'; sock.send({ t: 'guess', word: b.dataset.guess }); });
  on(el, '[data-pick-w]', 'click', (e, b) => { if (S.view !== 'workers') return; S.view = 'wait'; sock.send({ t: 'pick', i: Number(b.dataset.pickW) }); });
  on(el, '[data-pw]', 'click', (e, b) => sock.send({ t: 'password', word: b.dataset.pw }));
  on(el, '#mute', 'click', (e, b) => { b.textContent = toggleMute() ? '🔇' : '🔊'; });

  screen(html`<div class="g-center"><div class="spinner"></div></div>`);
  return () => { sock.close(); clearInterval(clock); document.querySelectorAll('.hit-banner').forEach(b => b.remove()); };
}
