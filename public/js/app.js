// Blooket Enhanced v2 — app shell, router, landing/auth/home pages.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, get, post, onMe, ApiError } from './api.js';
import { html, raw, render, $, $$, blook, icon, coin, toast, fmt, bannerCss, ago, toStr, on } from './ui.js';
import { WHEEL, GAME_MODES, THEMES, ANSWER_SCHEMES } from './data.js';
import * as clubs from './pages/clubs.js';
import { sfx } from './sfx.js';
import * as sets from './pages/sets.js';
import * as blooks from './pages/blooks.js';
import * as social from './pages/social.js';
import * as play from './pages/play.js';
import * as host from './pages/host.js';
import * as solo from './pages/solo.js';

const root = document.getElementById('app');
let cleanup = null;

// ---- Routes ----------------------------------------------------------------------------------
// layout: 'app' (sidebar), 'full' (game screens), 'landing'
const ROUTES = [
  ['/', { layout: 'landing', render: landing, guestOnly: true }],
  ['/login', { layout: 'landing', render: authPage('login'), guestOnly: true }],
  ['/register', { layout: 'landing', render: authPage('register'), guestOnly: true }],
  ['/play', { layout: 'full', render: play.joinPage }],
  ['/play/:code', { layout: 'full', render: play.joinPage }],
  ['/game/:code', { layout: 'full', render: play.gamePage }],
  ['/host/:code', { layout: 'full', render: host.hostPage, auth: true }],
  ['/solo/:id', { layout: 'full', render: solo.soloPage, auth: true }],
  ['/hw/:id', { layout: 'app', title: 'Homework', render: sets.homeworkStudent, auth: true }],
  ['/home', { layout: 'app', title: 'Stats', render: home, auth: true }],
  ['/discover', { layout: 'app', title: 'Discover', render: sets.discover, auth: true }],
  ['/my-sets', { layout: 'app', title: 'My Sets', render: sets.mySets, auth: true }],
  ['/favorites', { layout: 'app', title: 'Favorites', render: sets.favorites, auth: true }],
  ['/set/:id', { layout: 'app', title: 'Set', render: sets.setPage, auth: true }],
  ['/create', { layout: 'app', title: 'Create a Set', render: sets.editor, auth: true }],
  ['/edit/:id', { layout: 'app', title: 'Edit Set', render: sets.editor, auth: true }],
  ['/history', { layout: 'app', title: 'History', render: sets.history, auth: true }],
  ['/history/:id', { layout: 'app', title: 'Game Report', render: sets.historyDetail, auth: true }],
  ['/homework', { layout: 'app', title: 'Homework', render: sets.homeworkList, auth: true }],
  ['/homework/:id', { layout: 'app', title: 'Homework', render: sets.homeworkDetail, auth: true }],
  ['/blooks', { layout: 'app', title: 'My Blooks', render: blooks.blooksPage, auth: true }],
  ['/market', { layout: 'app', title: 'Market', render: blooks.market, auth: true }],
  ['/bazaar', { layout: 'app', title: 'Bazaar', render: blooks.bazaar, auth: true }],
  ['/leaderboard', { layout: 'app', title: 'Leaderboard', render: social.leaderboard, auth: true }],
  ['/chat', { layout: 'app', title: 'Chat', render: social.chat, auth: true }],
  ['/news', { layout: 'app', title: 'News', render: social.news, auth: true }],
  ['/u/:name', { layout: 'app', title: 'Profile', render: social.profile, auth: true }],
  ['/settings', { layout: 'app', title: 'Settings', render: social.settingsPage, auth: true }],
  ['/admin', { layout: 'app', title: 'Admin', render: social.admin, auth: true, staff: true }],
  ['/clubs', { layout: 'app', title: 'Clubs', render: clubs.clubsPage, auth: true }],
  ['/club/:id', { layout: 'app', title: 'Club', render: clubs.clubPage, auth: true }],
].map(([pattern, r]) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  return { pattern, re, keys, ...r };
});

export const go = path => { if (location.hash !== '#' + path) location.hash = path; else route(); };

const NAV = [
  ['/home', 'Stats', 'home'], ['/discover', 'Discover', 'compass'], ['/my-sets', 'My Sets', 'sets'],
  ['/favorites', 'Favorites', 'star'], ['/history', 'History', 'history'], ['/homework', 'Homework', 'homework'],
  ['/play', 'Play', 'play'], 'sep',
  ['/blooks', 'Blooks', 'blooks'], ['/market', 'Market', 'market'], ['/bazaar', 'Bazaar', 'bazaar'],
  ['/clubs', 'Clubs', 'club'], ['/leaderboard', 'Leaderboard', 'trophy'], ['/chat', 'Chat', 'chat'], ['/news', 'News', 'news'], 'sep',
  ['/settings', 'Settings', 'gear'],
];

function shell(title) {
  const me = state.me;
  const staff = me && (me.role === 'admin' || me.role === 'mod');
  const s = state.settings;
  return html`<div class="layout">
    <aside class="sidebar" id="sidebar">
      <a href="#/home" class="logo">${s.siteName}<small>v2 · ALL FREE</small></a>
      <a href="#/create" class="btn create">${icon('plus')} Create</a>
      <nav class="nav">
        ${NAV.map(n => n === 'sep' ? raw('<div class="sep"></div>') : html`<a href="#${n[0]}" data-path="${n[0]}">${icon(n[2])}${n[1]}</a>`)}
        ${staff ? html`<a href="#/admin" data-path="/admin">${icon('shield')}Admin</a>` : ''}
      </nav>
      <div class="foot">Free &amp; open source (GPL-3.0).<br>Not affiliated with Blooket.<br><a href="https://github.com/DDLOK/Blooket-Enhanced-v2-" target="_blank" rel="noopener">Source code</a></div>
    </aside>
    <div class="main">
      ${s.warning ? html`<div class="warning-bar">⚠ ${s.warning}</div>` : ''}
      ${s.announcement ? html`<div class="announcement">📣 ${s.announcement}</div>` : ''}
      <div class="topbar">
        <button class="btn purple small mobile-bar" id="menuBtn" aria-label="Menu">${icon('menu')}</button>
        <h1 class="page-title" id="pageTitle">${title}</h1>
        <a href="#/market" class="tokens token-pill" id="tokenPill">${coin()}<span>${fmt(me?.tokens || 0)}</span></a>
        <div class="user-pill" id="userPill">${blook(me?.avatar || 'blip', 38)}<span>${me?.username}</span>
          <div class="menu" id="userMenu" hidden>
            <a href="#/u/${me?.username}">My Profile</a><a href="#/settings">Settings</a>
            <button id="logoutBtn">Log Out</button>
          </div>
        </div>
      </div>
      <div id="page"></div>
    </div>
  </div>`;
}

function bindShell() {
  $('#userPill').onclick = e => { if (!e.target.closest('.menu')) $('#userMenu').hidden = !$('#userMenu').hidden; };
  document.addEventListener('click', e => { if (!e.target.closest('#userPill')) { const m = $('#userMenu'); if (m) m.hidden = true; } });
  $('#logoutBtn').onclick = async () => { await post('/api/auth/logout'); state.me = null; go('/'); };
  $('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
}

// Keep the token counter & avatar fresh whenever the user object changes.
export function applyPrefs(p = {}) {
  const t = THEMES[p.theme] || THEMES.grape;
  const r = document.documentElement.style;
  r.setProperty('--purple', t.main); r.setProperty('--purple-d', t.dark); r.setProperty('--purple-l', t.light);
  r.setProperty('--bg1', t.bg1); r.setProperty('--bg2', t.bg2);
  (ANSWER_SCHEMES[p.answers] || ANSWER_SCHEMES.classic).colors.forEach((c, i) => r.setProperty(`--a${i + 1}`, c));
  const b = document.body.classList;
  for (const c of [...b]) if (c.startsWith('bg-')) b.remove(c);
  if (p.bg && p.bg !== 'shapes') b.add(`bg-${p.bg}`);
  b.toggle('reduce-motion', !!p.reduceMotion);
  b.toggle('big-text', !!p.bigText);
  b.toggle('compact', !!p.compact);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.main);
}

onMe(me => {
  applyPrefs(me?.prefs);
  const pill = $('#tokenPill span');
  if (pill && me) pill.textContent = fmt(me.tokens);
  const up = $('#userPill');
  if (up && me) { const svg = $('svg', up); if (svg) svg.outerHTML = toStr(blook(me.avatar, 38)); }
});

export function setTitle(t) { const el = $('#pageTitle'); if (el) el.textContent = t; document.title = `${t} | ${state.settings.siteName}`; }

async function route() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  let match, params = {};
  for (const r of ROUTES) {
    const m = path.match(r.re);
    if (m) { match = r; params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])); break; }
  }
  if (!match) return go(state.me ? '/home' : '/');
  if (match.auth && !state.me) { sessionStorage.setItem('afterLogin', path); return go('/login'); }
  if (match.guestOnly && state.me) return go('/home');
  if (match.staff && !(state.me.role === 'admin' || state.me.role === 'mod')) return go('/home');

  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* */ } }
  cleanup = null;
  document.body.classList.remove('screen-correct', 'screen-wrong');
  document.body.style.background = '';
  window.scrollTo(0, 0);

  let target;
  if (match.layout === 'app') {
    render(root, shell(match.title));
    bindShell();
    $$('.nav a').forEach(a => a.classList.toggle('active', path === a.dataset.path || path.startsWith(a.dataset.path + '/')));
    target = $('#page');
    document.title = `${match.title} | ${state.settings.siteName}`;
  } else {
    // A fresh container per page, so event listeners from the previous page can't pile up.
    target = document.createElement('div');
    root.replaceChildren(target);
    document.title = state.settings.siteName;
  }
  try {
    cleanup = await match.render(target, params, { go, setTitle });
  } catch (e) {
    console.error(e);
    render(target, html`<div class="empty">${blook('pebble', 90)}<p>${e instanceof ApiError ? e.message : 'Something went wrong loading this page.'}</p><a class="btn" href="#/home">Go Home</a></div>`);
  }
}

// ---- Landing --------------------------------------------------------------------------------
function landing(el, params, { go }) {
  const s = state.settings;
  render(el, html`<div class="landing">
    <header><span class="logo">${s.siteName}</span><span class="spacer"></span>
      <a class="btn white small" href="#/login">Log In</a><a class="btn small" href="#/register">Sign Up</a></header>
    <div class="hero">
      <h1>${s.siteName}</h1>
      <p>Host live quiz games, collect original blooks, open packs and trade with your class. Everything is free — no paywalls, ever.</p>
      <form class="join-card" id="joinForm">
        <input class="input" id="code" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="Game ID" aria-label="Game ID">
        <button class="btn block big" style="margin-top:10px">Join a Game</button>
      </form>
      <div class="parade">${['sprout', 'bumble', 'squidlet', 'zorp', 'boba-bro', 'witchy-cat', 'bot-9', 'astro-pup'].map(b => blook(b, 74))}</div>
    </div>
  </div>`);
  $('#joinForm').onsubmit = e => { e.preventDefault(); const c = $('#code').value.replace(/\D/g, ''); if (c.length === 6) go(`/play/${c}`); else toast('Game IDs are 6 digits', 'bad'); };
}

function authPage(kind) {
  return (el, params, { go }) => {
    const s = state.settings;
    const reg = kind === 'register';
    render(el, html`<div class="landing">
      <header><a href="#/" class="logo">${s.siteName}</a></header>
      <div class="auth-card card">
        <h2 style="color:var(--purple);font-size:32px;text-align:center">${reg ? 'Sign Up' : 'Log In'}</h2>
        <form id="authForm" style="margin-top:14px">
          <label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" required maxlength="16"></label>
          <label class="field"><span>Password</span><input class="input" type="password" name="password" autocomplete="${reg ? 'new-password' : 'current-password'}" required></label>
          ${reg && s.needsCode ? html`<label class="field"><span>School code (ask your teacher)</span><input class="input" name="code" required></label>` : ''}
          ${reg && !s.signupsOpen ? html`<p class="error-text">Sign-ups are closed right now.</p>` : ''}
          <p class="error-text" id="err"></p>
          <button class="btn block big">${reg ? 'Create Account' : 'Log In'}</button>
        </form>
        <p class="center" style="margin-bottom:0">${reg ? html`Have an account? <a href="#/login" style="color:var(--purple)">Log in</a>` : html`New here? <a href="#/register" style="color:var(--purple)">Sign up free</a>`}</p>
      </div></div>`);
    $('#authForm').onsubmit = async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        await post(`/api/auth/${kind}`, f);
        toast(reg ? `Welcome, ${f.username}!` : 'Welcome back!', 'good');
        const next = sessionStorage.getItem('afterLogin');
        sessionStorage.removeItem('afterLogin');
        go(next || '/home');
      } catch (err) { $('#err').textContent = err.message; }
    };
  };
}

// ---- Home / Stats ---------------------------------------------------------------------------
async function home(el) {
  const me = state.me;
  const [{ news }] = await Promise.all([get('/api/news')]);
  const lvl = me.level;
  const cur = 40 * (lvl - 1) ** 2, nxt = 40 * lvl ** 2;
  const pct = Math.min(100, Math.round((me.xp - cur) / (nxt - cur) * 100));
  const st = me.stats || {};
  render(el, html`
  <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(260px,1fr)">
    <div class="stack">
      <div class="profile-card">
        <div class="banner" style="background:${raw(bannerCss(me.banner))}">
          <div class="avatar">${blook(me.avatar, 96)}</div>
          <div class="who"><h2>${me.username} ${me.role !== 'student' ? html`<span class="badge ${me.role}">${me.role.toUpperCase()}</span>` : ''}</h2><div class="ttl">${me.title}</div></div>
        </div>
        <div class="info">
          <div><div style="font-family:var(--title);color:var(--purple);font-size:20px">Level ${lvl}</div><div class="levelbar"><div style="width:${pct}%"></div></div><div style="font-size:12px;opacity:.6">${fmt(me.xp)} / ${fmt(nxt)} XP</div></div>
          <div class="stat"><b>${fmt(me.tokens)}</b><span>Tokens</span></div>
          <div class="stat"><b>${Object.keys(me.blooks).length}</b><span>Unique Blooks</span></div>
          <div class="stat"><b>${fmt(st.gamesPlayed || 0)}</b><span>Games Played</span></div>
          <div class="stat"><b>${fmt(st.wins || 0)}</b><span>Wins</span></div>
          <div class="stat"><b>${st.answered ? Math.round(st.correct / st.answered * 100) : 0}%</b><span>Accuracy</span></div>
          <div class="stat"><b>${fmt(st.packsOpened || 0)}</b><span>Packs Opened</span></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Quick Play</h2></div>
        <div class="row">
          <a class="btn big yellow" href="#/play">${icon('play')} Join Game</a>
          <a class="btn big" href="#/discover">${icon('compass')} Find a Set</a>
          <a class="btn big purple" style="background:var(--purple-d)" href="#/market">${icon('market')} Open Packs</a>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Game Modes</h2><span style="font-size:13px;opacity:.85">Host any set in any mode</span></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px">
          ${Object.values(GAME_MODES).map(g => html`<a href="#/discover" style="background:${raw(g.bg)};border-radius:12px;padding:12px;min-height:96px;box-shadow:inset 0 -6px rgba(0,0,0,.2)">
            <div class="title-font" style="font-size:20px;text-shadow:0 2px rgba(0,0,0,.25)">${g.name}${g.tag ? html`<span class="mode-tag">${g.tag}</span>` : ''}</div>
            <div style="font-size:12.5px;margin-top:4px;text-shadow:0 1px 2px rgba(0,0,0,.35)">${g.desc}</div></a>`)}
        </div>
      </div>
    </div>
    <div class="stack">
      <div class="panel center">
        <h2 style="font-size:24px">Daily Spin</h2>
        <div class="wheel-wrap"><div class="pointer"></div>${wheelSvg(state.settings.dailyReward || 500)}</div>
        <button class="btn yellow block" id="daily" ${me.canClaimDaily ? '' : 'disabled'}>${me.canClaimDaily ? 'Spin!' : 'Come back tomorrow!'}</button>
      </div>
      <div class="panel" id="quests">${questsHtml(me)}</div>
      <div class="panel">
        <div class="panel-head"><h2>News</h2><a href="#/news" class="btn small ghost">All</a></div>
        ${news.length ? news.slice(0, 3).map(n => html`<div style="background:rgba(255,255,255,.12);border-radius:8px;padding:10px;margin-bottom:8px"><b class="title-font">${n.title}</b><div style="font-size:12px;opacity:.75">${ago(n.date)} · ${n.author}</div><div style="font-weight:600;margin-top:4px;white-space:pre-wrap">${n.text.length > 220 ? n.text.slice(0, 220) + '…' : n.text}</div></div>`) : html`<p class="muted">No news yet.</p>`}
      </div>
    </div>
  </div>`);
  $('#daily').onclick = async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const r = await post('/api/me/daily');
      const turn = 360 * 6 - (r.slice * (360 / WHEEL.length) + 180 / WHEEL.length);
      const w = $('.wheel', el);
      w.style.transform = `rotate(${turn}deg)`;
      let ticks = 0; const t = setInterval(() => { sfx('tick'); if (++ticks > 22) clearInterval(t); }, 170);
      setTimeout(() => { sfx('coin'); toast(`You won ${fmt(r.amount)} tokens!`, 'good'); btn.textContent = 'Come back tomorrow!'; }, 4300);
    } catch (err) { toast(err.message, 'bad'); }
  };
  on(el, '[data-claim]', 'click', async (e, b) => {
    try {
      const r = await post(`/api/me/quests/${b.dataset.claim}/claim`);
      sfx('coin'); toast(`+${r.amount} tokens!`, 'good');
      render($('#quests', el), questsHtml(state.me));
    } catch (err) { toast(err.message, 'bad'); }
  });
}

function wheelSvg(base) {
  const n = WHEEL.length, r = 100, c = 105;
  const pt = (a, rr = r) => `${(c + rr * Math.sin(a)).toFixed(2)} ${(c - rr * Math.cos(a)).toFixed(2)}`;
  let out = '';
  WHEEL.forEach((s, i) => {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI, am = (a0 + a1) / 2;
    out += `<path d="M${c} ${c} L${pt(a0)} A${r} ${r} 0 0 1 ${pt(a1)} Z" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
    const [tx, ty] = pt(am, 66).split(' ');
    out += `<text x="${tx}" y="${ty}" transform="rotate(${(am * 180 / Math.PI).toFixed(1)} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-family="Titan One, sans-serif" font-size="17" fill="#fff" stroke="#0004" stroke-width="3" paint-order="stroke">${Math.round(base * s.m)}</text>`;
  });
  return raw(`<svg class="wheel" viewBox="0 0 210 210">${out}<circle cx="${c}" cy="${c}" r="18" fill="#fff" stroke="#9a49aa" stroke-width="4"/></svg>`);
}

function questsHtml(me) {
  const qs = me.quests;
  if (!qs) return '';
  const all = qs.list.every(q => q.claimed);
  return html`<div class="panel-head"><h2>Daily Quests</h2><span style="font-size:12px;opacity:.8">New quests every day</span></div>
    ${qs.list.map(q => html`<div class="quest ${q.claimed ? 'done' : ''}"><div class="q"><div style="font-size:15px">${q.text}</div>
      <div class="bar"><div style="width:${Math.round(q.progress / q.goal * 100)}%"></div></div><div style="font-size:12px;opacity:.85">${q.progress} / ${q.goal}</div></div>
      ${q.claimed ? html`<span class="title-font">✓</span>` : q.progress >= q.goal ? html`<button class="btn small yellow" data-claim="${q.id}">${coin(16)} ${q.reward}</button>` : html`<span class="row" style="gap:4px;font-family:var(--title)">${coin(16)} ${q.reward}</span>`}</div>`)}
    <div class="quest ${qs.bonusClaimed ? 'done' : ''}" style="background:rgba(255,205,5,.25)"><div class="q">Finish all 3 quests</div>
      ${qs.bonusClaimed ? html`<span class="title-font">✓</span>` : all ? html`<button class="btn small yellow" data-claim="bonus">${coin(16)} ${me.questBonus}</button>` : html`<span class="row" style="gap:4px;font-family:var(--title)">${coin(16)} ${me.questBonus}</span>`}</div>`;
}

// ---- Boot ------------------------------------------------------------------------------------
async function boot() {
  try {
    const [s, m] = await Promise.all([get('/api/settings'), get('/api/me')]);
    state.settings = s;
    state.me = m.user;
    applyPrefs(m.user?.prefs);
  } catch (e) {
    render(root, html`<div class="empty" style="padding-top:20vh">${blook('pebble', 100)}<h2 style="color:#fff">Can't reach the server</h2><p>${e.message}</p><button class="btn" onclick="location.reload()">Try again</button></div>`);
    return;
  }
  window.addEventListener('hashchange', route);
  route();
}
boot();

