// Blooket Enhanced v2 — leaderboard, chat, news, profiles, settings & admin pages.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, get, post, del, liveSocket } from '../api.js';
import { html, raw, render, $, $$, blook, coin, toast, modal, confirmBox, fmt, ago, bannerCss, on, toStr } from '../ui.js';
import { BANNERS, TITLES, BLOOKS, SCORE_POINTS } from '../data.js';

const roleBadge = r => (r && r !== 'student' ? html`<span class="badge ${r}">${r.toUpperCase()}</span>` : '');

// ---- Leaderboard ----------------------------------------------------------------------------
export async function leaderboard(el) {
  const data = await get('/api/leaderboard');
  let tab = 'tokens';
  const LABEL = { tokens: 'Tokens', xp: 'Level', blooks: 'Unique Blooks', wins: 'Wins' };
  const val = (r, t) => (t === 'tokens' ? fmt(r.tokens) : t === 'xp' ? `Lv ${r.level}` : t === 'blooks' ? r.unique : r.wins);
  const draw = () => render(el, html`<div class="tabs">${Object.entries(LABEL).map(([k, v]) => html`<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`)}</div>
    <div class="leader" style="width:100%;max-width:820px">${data[tab].map((r, i) => html`<a class="lrow ${r.username === state.me.username ? 'me' : ''}" href="#/u/${r.username}">
      <span class="rank">${i + 1}</span>${blook(r.avatar, 46)}<span class="nm">${r.username} <span class="muted" style="font-size:13px">${r.title}</span></span>
      <span class="sc">${tab === 'tokens' ? coin(20) : ''} ${val(r, tab)}</span></a>`)}</div>`);
  on(el, '[data-tab]', 'click', (e, b) => { tab = b.dataset.tab; draw(); });
  draw();
}

// ---- Chat -------------------------------------------------------------------------------------
export async function chat(el) {
  const { messages, enabled } = await get('/api/chat');
  const staff = ['admin', 'mod'].includes(state.me.role);
  const msgHtml = m => html`<div class="chat-msg" data-id="${m.id}">${blook(m.avatar, 40)}<div style="flex:1;min-width:0">
      <div><a class="who" href="#/u/${m.username}">${m.username}</a> ${roleBadge(m.role)}<span class="when">${ago(m.ts)}</span>
      ${staff ? html`<button class="btn small red" data-del="${m.id}" style="padding:0 8px 3px;font-size:12px;margin-left:6px">x</button>` : ''}</div>
      <div class="text">${m.text}</div></div></div>`;
  render(el, html`<div class="panel chat-box">
    ${!enabled ? html`<div class="announcement" style="margin:0 0 8px">Chat is turned off by an admin.</div>` : ''}
    <div class="chat-log" id="log">${messages.length ? messages.map(msgHtml) : html`<p class="muted center">No messages yet — say hi!</p>`}</div>
    <form class="chat-form" id="f"><input class="input" id="t" maxlength="300" placeholder="${state.me.muted ? 'You are muted' : 'Send a message (be kind!)'}" ${state.me.muted ? 'disabled' : ''} autocomplete="off"><button class="btn">Send</button></form>
    <div id="status" class="muted" style="font-size:12px;margin-top:4px"></div>
  </div>`);
  const log = $('#log', el);
  log.scrollTop = log.scrollHeight;
  const sock = liveSocket('/api/ws?chat=1', {
    onStatus: s => { $('#status', el).textContent = s === 'open' ? '' : 'Reconnecting…'; },
    onMessage: m => {
      if (m.t === 'msg') {
        const near = log.scrollHeight - log.scrollTop - log.clientHeight < 120;
        if (log.querySelector('p.muted')) log.innerHTML = '';
        log.insertAdjacentHTML('beforeend', toStr(msgHtml(m.msg)));
        if (near) log.scrollTop = log.scrollHeight;
      }
      if (m.t === 'delete') log.querySelector(`[data-id="${CSS.escape(m.id)}"]`)?.remove();
    },
  });
  $('#f', el).onsubmit = async e => {
    e.preventDefault();
    const t = $('#t', el);
    if (!t.value.trim()) return;
    try { await post('/api/chat', { text: t.value }); t.value = ''; } catch (err) { toast(err.message, 'bad'); }
  };
  on(el, '[data-del]', 'click', async (e, b) => { await del(`/api/chat/${b.dataset.del}`); });
  return () => sock.close();
}

// ---- News -------------------------------------------------------------------------------------
export async function news(el) {
  const { news } = await get('/api/news');
  const staff = ['admin', 'mod'].includes(state.me.role);
  render(el, html`${staff ? html`<form class="panel" id="f" style="margin-bottom:16px"><div class="panel-head"><h2>Post News</h2></div>
      <input class="input" name="title" placeholder="Title" maxlength="100" style="margin-bottom:8px"><textarea class="input" name="text" placeholder="What's new?" maxlength="2000"></textarea>
      <button class="btn yellow" style="margin-top:8px">Post</button></form>` : ''}
    ${news.length ? news.map(n => html`<div class="card" style="margin-bottom:14px"><div class="row"><h2 style="color:var(--purple);font-size:24px;flex:1">${n.title}</h2>
      ${staff ? html`<button class="btn small red" data-del="${n.id}">Delete</button>` : ''}</div>
      <div class="muted" style="font-size:13px">${new Date(n.date).toLocaleString()} · ${n.author}</div><p style="white-space:pre-wrap;font-weight:600">${n.text}</p></div>`)
    : html`<div class="empty">${blook('stardust', 90)}<p>No news yet.</p></div>`}`);
  $('#f', el)?.addEventListener('submit', async e => {
    e.preventDefault();
    try { await post('/api/news', Object.fromEntries(new FormData(e.target))); toast('Posted!', 'good'); news(el); } catch (err) { toast(err.message, 'bad'); }
  });
  on(el, '[data-del]', 'click', async (e, b) => { if (await confirmBox('Delete post?', 'This removes it for everyone.', 'Delete', 'red')) { await del(`/api/news/${b.dataset.del}`); news(el); } });
}

// ---- Profile ----------------------------------------------------------------------------------
export async function profile(el, { name }, { setTitle }) {
  const { user: u } = await get(`/api/users/${encodeURIComponent(name)}`);
  setTitle(u.username);
  const owned = Object.keys(u.blooks).filter(id => BLOOKS[id]);
  const score = owned.reduce((s, id) => s + (SCORE_POINTS[BLOOKS[id].rarity] || 0), 0);
  const best = owned.sort((a, b) => (SCORE_POINTS[BLOOKS[b].rarity] || 0) - (SCORE_POINTS[BLOOKS[a].rarity] || 0)).slice(0, 12);
  render(el, html`<div class="profile-card" style="max-width:900px">
    <div class="banner" style="background:${raw(bannerCss(u.banner))}"><div class="avatar">${blook(u.avatar, 96)}</div>
      <div class="who"><h2>${u.username} ${roleBadge(u.role)}</h2><div class="ttl">${u.title}</div></div></div>
    <div class="info">
      <div class="stat"><b>${u.level}</b><span>Level</span></div><div class="stat"><b>${fmt(score)}</b><span>Blook Score</span></div>
      <div class="stat"><b>${owned.length}</b><span>Unique Blooks</span></div><div class="stat"><b>${fmt(u.stats.gamesPlayed || 0)}</b><span>Games</span></div>
      <div class="stat"><b>${fmt(u.stats.wins || 0)}</b><span>Wins</span></div><div class="stat"><b>${new Date(u.created).toLocaleDateString()}</b><span>Joined</span></div>
    </div></div>
    <div class="panel" style="max-width:900px;margin-top:16px"><div class="panel-head"><h2>Showcase</h2></div>
      <div class="blook-tiles">${best.map(id => html`<div class="tile" title="${BLOOKS[id].name}">${blook(id, 54)}</div>`)}${u.customs.map(c => html`<div class="tile" title="${c.name}">${blook(c, 54)}</div>`)}</div></div>`);
}

// ---- Settings: banners, titles, avatar, password ---------------------------------------------------
export function settingsPage(el) {
  let tab = 'banners';
  const draw = () => {
    const me = state.me;
    render(el, html`<div class="grid" style="grid-template-columns:minmax(0,1fr) 340px">
      <div class="panel">
        <div class="row" style="margin-bottom:14px"><button class="btn ${tab === 'banners' ? 'yellow' : ''}" data-tab="banners">Banners</button><button class="btn ${tab === 'titles' ? 'yellow' : ''}" data-tab="titles">Titles</button><button class="btn ${tab === 'password' ? 'yellow' : ''}" data-tab="password">Password</button></div>
        ${tab === 'banners' ? html`<div class="choice-grid">${BANNERS.map(b => html`<div class="choice ${me.banner === b.id ? 'on' : ''}" data-banner="${b.id}"><div class="banner-strip" style="background:${raw(b.css)}"></div><div style="margin-top:6px">${b.name}</div></div>`)}</div>`
        : tab === 'titles' ? html`<div class="choice-grid">${TITLES.map(t => html`<div class="choice ${me.title === t ? 'on' : ''}" data-title="${t}"><div class="title-chip">${t}</div></div>`)}</div>`
        : html`<form id="pw" style="max-width:380px"><label class="field"><span>Current password</span><input class="input" type="password" name="old" required autocomplete="current-password"></label>
            <label class="field"><span>New password</span><input class="input" type="password" name="new" required minlength="6" autocomplete="new-password"></label><button class="btn yellow">Change Password</button></form>`}
      </div>
      <div class="stack">
        <div class="panel center"><div class="title-font" style="font-size:20px;margin-bottom:8px">Preview</div>
          <div class="banner-strip" style="background:${raw(bannerCss(me.banner))};display:flex;align-items:center;gap:10px;padding:0 10px;height:80px">
            <div style="background:#fff;border-radius:12px;padding:3px">${blook(me.avatar, 56)}</div>
            <div style="text-align:left;color:#fff;text-shadow:0 2px 3px #0008"><div class="title-font" style="font-size:22px">${me.username}</div><div>${me.title}</div></div></div>
          <p style="font-size:13px">Change your avatar on the <a href="#/blooks" style="text-decoration:underline">Blooks</a> page.</p></div>
      </div></div>`);
    $('#pw', el)?.addEventListener('submit', async e => {
      e.preventDefault();
      try { await post('/api/me/password', Object.fromEntries(new FormData(e.target))); toast('Password changed!', 'good'); e.target.reset(); } catch (err) { toast(err.message, 'bad'); }
    });
  };
  on(el, '[data-tab]', 'click', (e, b) => { tab = b.dataset.tab; draw(); });
  on(el, '[data-banner]', 'click', async (e, b) => { await post('/api/me/profile', { banner: b.dataset.banner }); draw(); });
  on(el, '[data-title]', 'click', async (e, b) => { await post('/api/me/profile', { title: b.dataset.title }); draw(); });
  draw();
}

// ---- Admin --------------------------------------------------------------------------------------
export async function admin(el) {
  const isAdmin = state.me.role === 'admin';
  const s = isAdmin ? (await get('/api/admin/settings')) : null;
  render(el, html`<div class="stack">
    ${isAdmin ? html`<form class="panel" id="sf"><div class="panel-head"><h2>Site Settings</h2><span class="muted" style="font-size:13px">Storage: ${s.storage.kind}</span></div>
      ${s.storage.warning ? html`<div class="warning-bar">${s.storage.warning}</div>` : ''}
      <div class="grid cols-2">
        <div>
          <label class="field"><span>Site name</span><input class="input" name="siteName" value="${s.settings.siteName}" maxlength="40"></label>
          <label class="field"><span>Announcement banner (blank = none)</span><input class="input" name="announcement" value="${s.settings.announcement}" maxlength="300"></label>
          <label class="field"><span>School sign-up code (blank = anyone can sign up)</span><input class="input" name="signupCode" value="${s.settings.signupCode}" maxlength="40"></label>
          <label class="field"><span>Who can host games &amp; homework</span><select class="input" name="hostRole"><option value="anyone" ${s.settings.hostRole === 'anyone' ? 'selected' : ''}>Anyone</option><option value="teacher" ${s.settings.hostRole === 'teacher' ? 'selected' : ''}>Teachers &amp; admins only</option></select></label>
          <div class="row"><label class="check"><input type="checkbox" name="signupsOpen" ${s.settings.signupsOpen ? 'checked' : ''}> Sign-ups open</label><label class="check"><input type="checkbox" name="chatEnabled" ${s.settings.chatEnabled ? 'checked' : ''}> Chat enabled</label></div>
        </div>
        <div>
          <label class="field"><span>Daily reward tokens</span><input class="input" type="number" name="dailyReward" value="${s.settings.dailyReward}"></label>
          <label class="field"><span>Starting tokens for new players</span><input class="input" type="number" name="startingTokens" value="${s.settings.startingTokens}"></label>
          <label class="field"><span>Max tokens per day from live games</span><input class="input" type="number" name="dailyGameTokenCap" value="${s.settings.dailyGameTokenCap}"></label>
          <label class="field"><span>Max tokens per day from solo/homework</span><input class="input" type="number" name="dailySoloTokenCap" value="${s.settings.dailySoloTokenCap}"></label>
          <label class="field"><span>Extra blocked words (comma separated)</span><textarea class="input" name="bannedWords">${s.settings.bannedWords.join(', ')}</textarea></label>
        </div>
      </div>
      <button class="btn yellow">Save Settings</button></form>` : ''}
    <div class="panel"><div class="panel-head"><h2>Users</h2><form id="uq" class="row"><input class="input" name="q" placeholder="Search username" style="width:220px"><button class="btn small">Search</button></form></div>
      <div id="users"><div class="spinner"></div></div></div>
  </div>`);
  $('#sf', el)?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    const body = Object.fromEntries(new FormData(f));
    body.signupsOpen = f.signupsOpen.checked;
    body.chatEnabled = f.chatEnabled.checked;
    try { await post('/api/admin/settings', body); state.settings = await get('/api/settings'); toast('Settings saved!', 'good'); } catch (err) { toast(err.message, 'bad'); }
  });
  const loadUsers = async (q = '') => {
    const { users, total } = await get(`/api/admin/users?q=${encodeURIComponent(q)}`);
    render($('#users', el), html`<p style="margin-top:0">${total} users total</p><div style="overflow-x:auto"><table class="table"><thead><tr><th>User</th><th>Role</th><th>Tokens</th><th>Lv</th><th>Status</th><th></th></tr></thead><tbody>
      ${users.map(u => html`<tr><td><a href="#/u/${u.username}" style="color:var(--purple)">${u.username}</a></td><td>${u.role}</td><td>${fmt(u.tokens)}</td><td>${u.level}</td>
        <td>${u.banned ? html`<span class="badge admin">BANNED</span>` : ''}${u.muted ? html`<span class="badge mod">MUTED</span>` : ''}</td>
        <td><button class="btn small" data-user="${u.id}">Manage</button></td></tr>`)}</tbody></table></div>`);
    userCache = users; lastQ = q;
  };
  let userCache = [], lastQ = '';
  on($('#users', el), '[data-user]', 'click', (e, b) => manage(userCache.find(u => u.id === b.dataset.user), () => loadUsers(lastQ)));
  $('#uq', el).onsubmit = e => { e.preventDefault(); loadUsers(new FormData(e.target).get('q')); };
  const manage = (u, refresh) => {
    const m = modal(`Manage ${u.username}`, html`<div class="stack">
      ${isAdmin ? html`<label class="field"><span>Role</span><select class="input" id="role">${['student', 'teacher', 'mod', 'admin'].map(r => html`<option ${u.role === r ? 'selected' : ''}>${r}</option>`)}</select></label>
      <label class="field"><span>Tokens</span><input class="input" type="number" id="tok" value="${u.tokens}"></label>
      <label class="field"><span>Give blook</span><select class="input" id="gb"><option value="">—</option>${Object.values(BLOOKS).map(b => html`<option value="${b.id}">${b.name} (${b.rarity})</option>`)}</select></label>` : ''}
      <div class="row"><label class="check" style="background:#f3e9f6;color:var(--ink);border-color:#e4d6e8"><input type="checkbox" id="ban" ${u.banned ? 'checked' : ''}> Banned</label>
      <label class="check" style="background:#f3e9f6;color:var(--ink);border-color:#e4d6e8"><input type="checkbox" id="mute" ${u.muted ? 'checked' : ''}> Muted in chat</label></div>
      <div class="row"><button class="btn yellow" id="save">Save</button>${isAdmin ? html`<button class="btn" id="unlock">Unlock All Blooks</button>` : ''}<button class="btn red" id="reset">Reset Password</button></div>
      <p id="out" style="font-weight:800;color:var(--purple)"></p></div>`);
    const send = async body => { try { const r = await post(`/api/admin/users/${u.id}`, body); toast('Saved', 'good'); refresh(); return r; } catch (err) { toast(err.message, 'bad'); } };
    $('#save', m.el).onclick = async () => {
      const body = { banned: $('#ban', m.el).checked, muted: $('#mute', m.el).checked };
      if (isAdmin) { body.role = $('#role', m.el).value; body.tokens = Number($('#tok', m.el).value); if ($('#gb', m.el).value) body.giveBlook = $('#gb', m.el).value; }
      if (await send(body)) m.close();
    };
    $('#unlock', m.el)?.addEventListener('click', () => send({ unlockAll: true }));
    $('#reset', m.el).onclick = async () => {
      if (!(await confirmBox('Reset password?', `${u.username} will be logged out and get a new temporary password.`, 'Reset', 'red'))) return;
      const r = await send({ resetPassword: true });
      if (r?.tempPassword) $('#out', m.el).textContent = `New temporary password: ${r.tempPassword} — give it to ${u.username} privately.`;
    };
  };
  loadUsers();
}
