// Blooket Enhanced v2 — Clubs: browse, create, join, club chat.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, get, post, put, del, liveSocket } from '../api.js';
import { html, render, $, $$, blook, toast, modal, confirmBox, fmt, ago, on, toStr, clubTag, icon } from '../ui.js';
import { BLOOKS, PACKS, STARTERS } from '../data.js';

const COLORS = ['#9a49aa', '#e63946', '#0bc2cf', '#4bc22e', '#ffa31e', '#3d8ee8', '#e44c8d', '#2b2d42', '#14b37d', '#ff7b00'];

function clubForm(c = {}) {
  const emblems = [...STARTERS.map(s => s.id), ...PACKS.flatMap(p => p.blooks.map(b => b.id))];
  let emblem = c.emblem || 'blip', color = c.color || COLORS[0];
  return {
    html: html`<label class="field"><span>Club name</span><input class="input" id="cn" maxlength="30" value="${c.name || ''}" placeholder="e.g. Quiz Wizards"></label>
      <label class="field"><span>Tag (2–5 letters, shown next to members' names)</span><input class="input" id="ct" maxlength="5" value="${c.tag || ''}" placeholder="QWZ" style="text-transform:uppercase"></label>
      <label class="field"><span>Description</span><textarea class="input" id="cd" maxlength="300">${c.desc || ''}</textarea></label>
      <span style="font-size:14px">Color</span><div class="row" style="margin:6px 0 12px">${COLORS.map(x => html`<button class="swatch ${x === color ? 'on' : ''}" data-ccolor="${x}" style="background:${x}"></button>`)}</div>
      <span style="font-size:14px">Emblem</span><div class="blook-tiles" style="max-height:150px;overflow:auto;margin:6px 0 12px;background:#f3e9f6;padding:8px;border-radius:10px">${emblems.map(id => html`<div class="tile ${id === emblem ? 'selected' : ''}" data-emblem="${id}" style="width:50px;height:50px;background:#fff">${blook(id, 42)}</div>`)}</div>
      <label class="check" style="background:#f3e9f6;color:var(--ink);border-color:#e4d6e8"><input type="checkbox" id="co" ${c.open === false ? '' : 'checked'}> Anyone can join</label>`,
    bind(root) {
      on(root, '[data-ccolor]', 'click', (e, b) => { color = b.dataset.ccolor; $$('[data-ccolor]', root).forEach(x => x.classList.toggle('on', x === b)); });
      on(root, '[data-emblem]', 'click', (e, t) => { emblem = t.dataset.emblem; $$('[data-emblem]', root).forEach(x => x.classList.toggle('selected', x === t)); });
    },
    value: root => ({ name: $('#cn', root).value, tag: $('#ct', root).value, desc: $('#cd', root).value, color, emblem, open: $('#co', root).checked }),
  };
}

export async function clubsPage(el, params, { go }) {
  const me = state.me;
  const draw = async (q = '') => {
    const { clubs } = await get(`/api/clubs?q=${encodeURIComponent(q)}`);
    const mine = me.club ? clubs.find(c => c.id === me.club.id) : null;
    render($('#list', el), clubs.length ? html`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${clubs.map((c, i) => html`<a class="club-card" href="#/club/${c.id}" style="${mine?.id === c.id ? 'outline:4px solid var(--yellow)' : ''}">
        <div class="club-emblem" style="background:${c.color}">${blook(c.emblem, 60)}</div>
        <div style="flex:1;min-width:0"><div class="title-font" style="font-size:20px;color:var(--purple)">${clubTag(c.tag, c.color)}${c.name}</div>
          <div style="font-size:13px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.desc || 'No description'}</div>
          <div style="font-size:13px;margin-top:4px">#${i + 1} · ${c.memberCount} member${c.memberCount === 1 ? '' : 's'} · ${fmt(c.xp)} XP${c.open ? '' : ' · 🔒 Invite only'}</div></div></a>`)}</div>`
      : html`<div class="empty">${blook('bat-bit', 90)}<p>No clubs yet — start the first one!</p></div>`);
  };
  render(el, html`<div class="panel" style="margin-bottom:16px"><div class="row">
      <div style="flex:1;min-width:220px"><h2 style="font-size:24px">Clubs</h2><div style="font-size:14px">Team up with friends, chat together and climb the club leaderboard.</div></div>
      ${me.club ? html`<a class="btn yellow" href="#/club/${me.club.id}">${icon('club')} My Club: ${me.club.name}</a>` : html`<button class="btn yellow" id="create">${icon('plus')} Create a Club</button>`}
    </div></div>
    <form id="s" class="row" style="margin-bottom:14px"><input class="input" name="q" placeholder="Search clubs…" style="max-width:360px"><button class="btn">Search</button></form>
    <div id="list"><div class="spinner"></div></div>`);
  $('#s', el).onsubmit = e => { e.preventDefault(); draw(new FormData(e.target).get('q')); };
  $('#create', el)?.addEventListener('click', () => {
    const f = clubForm();
    const m = modal('Create a Club', html`${f.html}<button class="btn big block yellow" id="ok" style="margin-top:12px">Create Club</button>`, { wide: true });
    f.bind(m.el);
    $('#ok', m.el).onclick = async () => {
      try { const r = await post('/api/clubs', f.value(m.el)); m.close(); toast('Club created!', 'good'); go(`/club/${r.club.id}`); }
      catch (err) { toast(err.message, 'bad'); }
    };
  });
  await draw();
}

export async function clubPage(el, { id }, { go, setTitle }) {
  let sock = null;
  const load = async () => {
    const { club: c } = await get(`/api/clubs/${id}`);
    setTitle(c.name);
    const me = state.me;
    render(el, html`<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(300px,420px)">
      <div class="stack">
        <div class="card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;border-top:8px solid ${c.color}">
          <div class="club-emblem" style="background:${c.color}">${blook(c.emblem, 100)}</div>
          <div style="flex:1;min-width:200px"><h2 style="font-size:30px;color:var(--purple)">${clubTag(c.tag, c.color)}${c.name}</h2>
            <p style="margin:6px 0;font-weight:600;white-space:pre-wrap">${c.desc || 'No description yet.'}</p>
            <div class="muted" style="font-size:14px">Owner: ${c.ownerName} · ${c.memberCount}/50 members · ${fmt(c.xp)} XP · ${fmt(c.wins)} wins · ${c.open ? 'Open' : 'Invite only'}</div></div>
          <div class="stack" style="min-width:170px">
            ${c.mine ? html`<button class="btn red block" id="leave">Leave Club</button>` : html`<button class="btn yellow block" id="join" ${c.open ? '' : 'disabled'}>${me.club ? 'Switch to this Club' : 'Join Club'}</button>`}
            ${c.isOwner || ['admin', 'mod'].includes(me.role) ? html`<button class="btn block" id="edit">Edit</button><button class="btn block red" id="del" style="background:var(--red-d)">Delete Club</button>` : ''}
          </div>
        </div>
        <div class="panel"><div class="panel-head"><h2>Members</h2></div>
          ${c.members.map((u, i) => html`<div class="lrow" style="display:flex;align-items:center;gap:10px;background:#fff;color:var(--ink);border-radius:10px;padding:6px 12px 6px 6px;margin-bottom:8px">
            <span class="title-font" style="width:26px;text-align:center;color:var(--purple)">${i + 1}</span>${blook(u.avatar, 42)}
            <a href="#/u/${u.username}" style="flex:1"><b>${u.username}</b> ${u.owner ? html`<span class="badge teacher">OWNER</span>` : ''}<div style="font-size:12px;opacity:.7">${u.title} · Lv ${u.level}</div></a>
            <span class="title-font">${fmt(u.xp)} XP</span>
            ${c.isOwner && !u.owner ? html`<button class="btn small red" data-kick="${u.id}">Remove</button>` : ''}</div>`)}
        </div>
      </div>
      <div>${c.mine ? html`<div class="panel chat-box" style="height:calc(100vh - 140px)"><div class="panel-head"><h2>Club Chat</h2></div>
          <div class="chat-log" id="log"><div class="spinner"></div></div>
          <form class="chat-form" id="cf"><input class="input" id="ct" maxlength="300" placeholder="Message your club" autocomplete="off"><button class="btn">Send</button></form></div>`
        : html`<div class="panel center">${blook(c.emblem, 90)}<p>Join this club to chat with its members.</p></div>`}</div>
    </div>`);
    $('#join', el)?.addEventListener('click', async () => {
      if (me.club && !(await confirmBox('Switch clubs?', `You'll leave ${me.club.name}.`, 'Switch', 'yellow'))) return;
      try { await post(`/api/clubs/${id}/join`); toast(`Welcome to ${c.name}!`, 'good'); load(); } catch (err) { toast(err.message, 'bad'); }
    });
    $('#leave', el)?.addEventListener('click', async () => {
      if (!(await confirmBox('Leave club?', c.isOwner ? 'Ownership passes to the next member (or the club is deleted if you are the last one).' : `You can rejoin later${c.open ? '' : ' if it opens again'}.`, 'Leave', 'red'))) return;
      await post(`/api/clubs/${id}/leave`); toast('You left the club'); go('/clubs');
    });
    $('#del', el)?.addEventListener('click', async () => {
      if (!(await confirmBox('Delete club?', 'Everyone will be removed and the chat deleted. This cannot be undone.', 'Delete', 'red'))) return;
      await del(`/api/clubs/${id}`); toast('Club deleted'); state.me.club = null; go('/clubs');
    });
    $('#edit', el)?.addEventListener('click', () => {
      const f = clubForm(c);
      const m = modal('Edit Club', html`${f.html}<button class="btn big block yellow" id="ok" style="margin-top:12px">Save</button>`, { wide: true });
      f.bind(m.el);
      $('#ok', m.el).onclick = async () => { try { await put(`/api/clubs/${id}`, f.value(m.el)); m.close(); toast('Saved!', 'good'); load(); } catch (err) { toast(err.message, 'bad'); } };
    });
    if (c.mine) startChat();
  };

  const msgHtml = m => m.sys ? html`<div class="chat-msg" style="opacity:.8;font-style:italic">${m.text}</div>` : html`<div class="chat-msg">${blook(m.avatar, 36)}<div style="flex:1;min-width:0"><div><a class="who" href="#/u/${m.username}">${m.username}</a><span class="when">${ago(m.ts)}</span></div><div class="text">${m.text}</div></div></div>`;
  const startChat = async () => {
    sock?.close();
    const log = $('#log', el);
    const { messages } = await get(`/api/clubs/${id}/chat`);
    render(log, messages.length ? messages.map(msgHtml) : html`<p class="muted center">Say hi to your club!</p>`);
    log.scrollTop = log.scrollHeight;
    sock = liveSocket(`/api/ws?club=${encodeURIComponent(id)}`, {
      onMessage: m => {
        if (m.t !== 'msg' && m.t !== 'sys') return;
        if (log.querySelector('p.muted')) log.innerHTML = '';
        log.insertAdjacentHTML('beforeend', toStr(msgHtml(m.t === 'sys' ? { sys: true, text: m.text } : m.msg)));
        log.scrollTop = log.scrollHeight;
      },
    });
    $('#cf', el).onsubmit = async e => {
      e.preventDefault();
      const t = $('#ct', el);
      if (!t.value.trim()) return;
      try { await post(`/api/clubs/${id}/chat`, { text: t.value }); t.value = ''; } catch (err) { toast(err.message, 'bad'); }
    };
  };
  on(el, '[data-kick]', 'click', async (e, b) => {
    if (!(await confirmBox('Remove member?', 'They can rejoin if the club is open.', 'Remove', 'red'))) return;
    try { await post(`/api/clubs/${id}/kick`, { userId: b.dataset.kick }); load(); } catch (err) { toast(err.message, 'bad'); }
  });
  await load();
  return () => sock?.close();
}
