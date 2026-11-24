// Blooket Enhanced v2 — Blooks, blook maker, Market (packs) and Bazaar pages.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, get, post, put, del } from '../api.js';
import { html, raw, render, $, $$, blook, icon, coin, gem, scoreStar, lockSvg, toast, modal, confirmBox, fmt, rarityColor, on, toStr } from '../ui.js';
import { BLOOKS, PACKS, STARTERS, RARITIES, SCORE_POINTS } from '../data.js';
import { ART_OPTIONS } from '../blookart.js';

const RARITY_ORDER = Object.keys(RARITIES).filter(r => r !== 'Starter');
const label = s => s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

function blookStats(me) {
  let score = 0, total = 0, value = 0;
  const byRarity = Object.fromEntries(RARITY_ORDER.map(r => [r, 0]));
  for (const [id, n] of Object.entries(me.blooks)) {
    const b = BLOOKS[id];
    if (!b || !n) continue;
    score += SCORE_POINTS[b.rarity] || 0;
    total += n;
    value += RARITIES[b.rarity].sell * n;
    if (b.rarity in byRarity) byRarity[b.rarity] += n;
  }
  return { score, total, value, byRarity };
}

// ---- My Blooks --------------------------------------------------------------------------------
export function blooksPage(el) {
  let showLocked = true, showPacks = true, selected = null;

  const tile = id => {
    const b = BLOOKS[id];
    const n = state.me.blooks[id] || 0;
    if (!n) return showLocked ? html`<div class="tile locked" title="Locked">${lockSvg()}</div>` : '';
    return html`<div class="tile ${selected === id ? 'selected' : ''}" data-blook="${id}" title="${b.name}">${blook(id, 54)}
      <span class="count" style="background:${rarityColor(b.rarity)}">${n}</span></div>`;
  };

  const sections = () => {
    const me = state.me;
    const customs = me.customs || [];
    const custom = html`<div class="pack-row"><div class="section-title">Custom Blooks</div><div class="blook-tiles">
      ${customs.map(c => html`<div class="tile ${selected === 'custom:' + c.id ? 'selected' : ''}" data-custom="${c.id}" title="${c.name}">${blook(c, 54)}</div>`)}
      ${customs.length < 12 ? html`<div class="tile add" data-newcustom><span class="plus">+</span>New Blook</div>` : ''}
    </div></div>`;
    if (!showPacks) {
      const all = Object.keys(BLOOKS).sort((a, b) => RARITIES[BLOOKS[a].rarity].order - RARITIES[BLOOKS[b].rarity].order);
      return html`<div class="pack-row"><div class="section-title">All Blooks</div><div class="blook-tiles">${all.map(tile)}</div></div>${custom}`;
    }
    return html`
      <div class="pack-row"><div class="section-title">Starter Blooks</div><div class="blook-tiles">${STARTERS.map(s => tile(s.id))}</div></div>
      ${PACKS.map(p => html`<div class="pack-row"><div class="section-title">${p.name}</div><div class="blook-tiles">${p.blooks.map(b => tile(b.id))}</div></div>`)}
      ${custom}`;
  };

  const side = () => {
    const me = state.me;
    if (selected) {
      const isCustom = selected.startsWith('custom:');
      if (isCustom) {
        const c = (me.customs || []).find(x => x.id === selected.slice(7));
        if (!c) { selected = null; return side(); }
        return html`<div class="panel blook-detail">
          <div class="art">${blook(c, 170)}</div><h2 style="font-size:28px">${c.name}</h2><div class="rarity-label" style="color:#ffd6ff">Custom</div>
          <div class="stack" style="margin-top:14px">
            <button class="btn block yellow" data-act="avatar">${me.avatarRef === selected ? '✓ Your Avatar' : 'Set as Avatar'}</button>
            <button class="btn block" data-act="editcustom">Edit</button>
            <button class="btn block red" data-act="delcustom">Delete</button>
            <button class="btn block ghost" data-act="back">Back</button>
          </div></div>`;
      }
      const b = BLOOKS[selected];
      const n = me.blooks[selected] || 0;
      const sell = RARITIES[b.rarity].sell;
      return html`<div class="panel blook-detail">
        <div class="art">${blook(selected, 170)}</div>
        <h2 style="font-size:28px">${b.name}</h2>
        <div class="rarity-label" style="color:${rarityColor(b.rarity)}">${b.rarity}</div>
        <div style="margin:6px 0">Owned: <b>${n}</b>${b.pack ? html` · ${PACKS.find(p => p.id === b.pack).name}` : ''}</div>
        ${sell ? html`<div class="row" style="justify-content:center">${coin(20)} Sells for ${fmt(sell)}</div>` : ''}
        <div class="stack" style="margin-top:14px">
          <button class="btn block yellow" data-act="avatar">${me.avatarRef === selected ? '✓ Your Avatar' : 'Set as Avatar'}</button>
          ${sell ? html`<button class="btn block" data-act="sell1">Sell 1</button>${n > 1 ? html`<button class="btn block" data-act="selldupes">Sell ${n - 1} Duplicates</button>` : ''}
          <button class="btn block purple" style="background:var(--purple-d)" data-act="list">List on Bazaar</button>` : ''}
          <button class="btn block ghost" data-act="back">Back</button>
        </div></div>`;
    }
    const s = blookStats(me);
    return html`<div class="panel score-panel">
      <div class="star-wrap">${scoreStar()}<div class="score">${fmt(s.score)}<small>Blook Score</small></div></div>
      <div class="gems">${RARITY_ORDER.map(r => html`<div class="gem" title="${r}">${gem(r)}<span>${s.byRarity[r]}</span></div>`)}</div>
      <div class="score-totals"><div><b>${fmt(s.total)}</b><span>Blooks</span></div><div><b>${fmt(s.value)}</b><span>Value</span></div></div>
      <div style="margin-top:10px;font-size:13px;opacity:.85">${Object.keys(me.blooks).length} / ${Object.keys(BLOOKS).length} unlocked</div>
    </div>`;
  };

  const draw = () => {
    render(el, html`<div class="blooks-layout">
      <div class="panel">
        <div class="row" style="justify-content:flex-end;margin-bottom:6px">
          <label class="check"><input type="checkbox" id="locked" ${showLocked ? 'checked' : ''}> Show Locked</label>
          <label class="check"><input type="checkbox" id="packs" ${showPacks ? 'checked' : ''}> Show Packs</label>
        </div>
        <div class="blook-scroll">${sections()}</div>
      </div>
      <div id="side">${side()}</div>
    </div>`);
    $('#locked', el).onchange = e => { showLocked = e.target.checked; draw(); };
    $('#packs', el).onchange = e => { showPacks = e.target.checked; draw(); };
  };
  const redrawKeepScroll = () => { const sc = $('.blook-scroll', el)?.scrollTop; draw(); const n = $('.blook-scroll', el); if (n) n.scrollTop = sc; };

  on(el, '[data-blook]', 'click', (e, t) => { selected = t.dataset.blook; redrawKeepScroll(); });
  on(el, '[data-custom]', 'click', (e, t) => { selected = 'custom:' + t.dataset.custom; redrawKeepScroll(); });
  on(el, '[data-newcustom]', 'click', () => blookMaker(null, c => { selected = 'custom:' + c.id; redrawKeepScroll(); }));
  on(el, '[data-act]', 'click', async (e, t) => {
    const act = t.dataset.act;
    try {
      if (act === 'back') selected = null;
      if (act === 'avatar') { await post('/api/me/profile', { avatar: selected }); toast('Avatar updated!', 'good'); }
      if (act === 'sell1' || act === 'selldupes') {
        const n = act === 'sell1' ? 1 : state.me.blooks[selected] - 1;
        const b = BLOOKS[selected];
        if (!(await confirmBox('Sell blooks?', `Sell ${n} ${b.name} for ${fmt(n * RARITIES[b.rarity].sell)} tokens?`, 'Sell', 'yellow'))) return;
        const r = await post('/api/blooks/sell', { blook: selected, count: n });
        toast(`+${fmt(r.earned)} tokens`, 'good');
        if (!state.me.blooks[selected]) selected = null;
      }
      if (act === 'list') return listModal(selected);
      if (act === 'editcustom') { const c = state.me.customs.find(x => x.id === selected.slice(7)); return blookMaker(c, () => redrawKeepScroll()); }
      if (act === 'delcustom') {
        if (!(await confirmBox('Delete custom blook?', 'This cannot be undone.', 'Delete', 'red'))) return;
        await del(`/api/me/customs/${selected.slice(7)}`); selected = null;
      }
      redrawKeepScroll();
    } catch (err) { toast(err.message, 'bad'); }
  });
  draw();
}

function listModal(id) {
  const b = BLOOKS[id];
  const m = modal('List on Bazaar', html`<div class="center">${blook(id, 120)}<h2 style="color:var(--purple)">${b.name}</h2>
    <div style="color:${rarityColor(b.rarity)}" class="title-font">${b.rarity}</div></div>
    <label class="field"><span>Price in tokens</span><input class="input" type="number" min="1" id="price" value="${RARITIES[b.rarity].sell * 2 || 10}"></label>
    <button class="btn big block yellow" id="ok">List It</button>`);
  $('#ok', m.el).onclick = async () => {
    try { await post('/api/bazaar', { blook: id, price: Number($('#price', m.el).value) }); m.close(); toast('Listed on the Bazaar!', 'good'); }
    catch (e) { toast(e.message, 'bad'); }
  };
}

// ---- Custom blook maker ---------------------------------------------------------------------------
const MAKER_COLORS = ['#9b5de5', '#f15bb5', '#fee440', '#00bbf9', '#00f5d4', '#ff595e', '#ff924c', '#8ac926', '#1982c4', '#6a4c93', '#f1f1f6', '#2d2a32', '#c98b4b', '#ffc8dd'];
export function blookMaker(existing, done) {
  const st = existing ? { name: existing.name, art: { ...existing.art, x: [...existing.art.x] } } : { name: '', art: { s: 'round', c: '#9b5de5', e: 'dot', m: 'smile', x: [], k: 1 } };
  const m = modal(existing ? 'Edit Blook' : 'New Custom Blook', html`<div class="maker">
      <div><div class="preview" id="pv"></div><label class="field" style="margin-top:12px"><span>Name</span><input class="input" id="nm" maxlength="20" value="${st.name}" placeholder="My Blook"></label>
      <button class="btn big block yellow" id="save">${existing ? 'Save' : 'Create'}</button></div>
      <div id="opts"></div></div>`, { wide: true });
  const opts = () => render($('#opts', m.el), html`
    <b>Body</b><div class="opt-row">${ART_OPTIONS.shapes.map(s => html`<button class="opt ${st.art.s === s ? 'on' : ''}" data-k="s" data-v="${s}">${label(s)}</button>`)}</div>
    <b>Color</b><div class="opt-row" style="align-items:center">${MAKER_COLORS.map(c => html`<button class="swatch ${st.art.c === c ? 'on' : ''}" data-k="c" data-v="${c}" style="background:${c}"></button>`)}<input type="color" id="cc" value="${st.art.c}" style="width:40px;height:34px;border:0;background:none"></div>
    <b>Eyes</b><div class="opt-row">${ART_OPTIONS.eyes.map(s => html`<button class="opt ${st.art.e === s ? 'on' : ''}" data-k="e" data-v="${s}">${label(s)}</button>`)}</div>
    <b>Mouth</b><div class="opt-row">${ART_OPTIONS.mouths.map(s => html`<button class="opt ${st.art.m === s ? 'on' : ''}" data-k="m" data-v="${s}">${label(s)}</button>`)}</div>
    <b>Extras</b> <span class="muted" style="font-size:13px">(up to 5)</span><div class="opt-row">${ART_OPTIONS.extras.map(s => html`<button class="opt ${st.art.x.includes(s) ? 'on' : ''}" data-k="x" data-v="${s}">${label(s)}</button>`)}</div>
    <label class="check" style="background:#f3e9f6;color:var(--ink);border-color:#e4d6e8"><input type="checkbox" id="ck" ${st.art.k ? 'checked' : ''}> Rosy cheeks</label>`);
  const pv = () => render($('#pv', m.el), blook({ name: st.name || 'Blook', art: st.art }, 190));
  opts(); pv();
  on(m.el, '[data-k]', 'click', (e, b) => {
    const { k, v } = b.dataset;
    if (k === 'x') {
      const i = st.art.x.indexOf(v);
      if (i >= 0) st.art.x.splice(i, 1); else if (st.art.x.length < 5) st.art.x.push(v); else toast('Up to 5 extras');
    } else st.art[k] = v;
    opts(); pv();
  });
  m.el.addEventListener('input', e => {
    if (e.target.id === 'cc') { st.art.c = e.target.value; pv(); }
    if (e.target.id === 'ck') { st.art.k = e.target.checked ? 1 : 0; pv(); }
    if (e.target.id === 'nm') st.name = e.target.value;
  });
  m.el.addEventListener('change', e => { if (e.target.id === 'ck') { st.art.k = e.target.checked ? 1 : 0; pv(); } });
  $('#save', m.el).onclick = async () => {
    try {
      const body = { name: $('#nm', m.el).value, art: st.art };
      const r = existing ? await put(`/api/me/customs/${existing.id}`, body) : await post('/api/me/customs', body);
      m.close(); toast('Blook saved!', 'good'); done?.(r.custom || existing);
    } catch (e) { toast(e.message, 'bad'); }
  };
}

// ---- Market (packs) ------------------------------------------------------------------------------
export function market(el) {
  render(el, html`<div class="panel" style="margin-bottom:16px"><div class="row">${coin(32)}<span class="title-font" style="font-size:22px">Every pack is free to open with tokens you earn by playing — no real money, ever.</span></div></div>
    <div class="pack-grid">${PACKS.map(p => {
      const best = p.blooks[p.blooks.length - 1];
      return html`<div class="pack" data-pack="${p.id}" style="background:linear-gradient(160deg,${p.color},${p.color2})">
        <h3>${p.name}</h3><div class="art">${blook(best.id, 100)}</div>
        <span class="price">${coin(20)} ${p.price}</span>
        <div class="chances">${p.blooks.length} blooks · up to ${best.rarity}</div></div>`;
    })}</div>`);
  on(el, '[data-pack]', 'click', (e, t) => packModal(PACKS.find(p => p.id === t.dataset.pack)));
}

function packModal(pack) {
  const m = modal(pack.name, html`<div class="center" style="margin-bottom:10px"><span class="price title-font" style="font-size:22px;color:var(--purple)">${coin(24)} ${pack.price} tokens</span></div>
    <table class="table"><thead><tr><th></th><th>Blook</th><th>Rarity</th><th>Chance</th><th>Owned</th></tr></thead><tbody>
    ${pack.blooks.map(b => html`<tr><td>${state.me.blooks[b.id] ? blook(b.id, 40) : html`<div class="tile locked" style="width:40px;height:40px">${lockSvg()}</div>`}</td><td>${b.name}</td><td style="color:${rarityColor(b.rarity)}" class="title-font">${b.rarity}</td><td>${b.chance}%</td><td>${state.me.blooks[b.id] || 0}</td></tr>`)}
    </tbody></table>
    <div class="row" style="margin-top:14px;justify-content:center"><button class="btn big yellow" id="o1">Open 1</button><button class="btn big" id="o10">Open 10 (${pack.price * 10})</button></div>`, { wide: true });
  $('#o1', m.el).onclick = () => { m.close(); openPacks(pack, 1); };
  $('#o10', m.el).onclick = () => { m.close(); openPacks(pack, 10); };
}

async function openPacks(pack, count) {
  if (state.me.tokens < pack.price * count) return toast('Not enough tokens — play games or claim your daily reward!', 'bad');
  const ov = document.createElement('div');
  ov.className = 'overlay dark';
  ov.innerHTML = toStr(html`<div class="unbox"><div class="box" style="background:${pack.color}">?</div></div>`);
  document.body.append(ov);
  const results = [];
  try {
    for (let i = 0; i < count; i++) results.push(await post('/api/packs/open', { pack: pack.id }));
  } catch (e) { toast(e.message, 'bad'); if (!results.length) { ov.remove(); return; } }
  await new Promise(r => setTimeout(r, count === 1 ? 900 : 600));
  const close = () => ov.remove();
  if (results.length === 1) {
    const r = results[0], b = BLOOKS[r.blook];
    const glow = rarityColor(b.rarity);
    render(ov, html`<div class="unbox reveal">
      <div class="glow" style="background:radial-gradient(circle,${glow}cc 0%,${glow}33 55%,transparent 70%)">${blook(r.blook, 200)}</div>
      <h2>${b.name}</h2><div class="title-font" style="font-size:26px;color:${glow};text-shadow:0 2px 0 #000">${b.rarity}</div>
      ${r.isNew ? html`<div class="new-tag">NEW!</div>` : ''}
      <div class="row" style="justify-content:center;margin-top:18px"><button class="btn big yellow" id="again">Open Another</button><button class="btn big white" id="done">Done</button></div></div>`);
    $('#again', ov).onclick = () => { close(); openPacks(pack, 1); };
  } else {
    const best = [...results].sort((a, b) => RARITIES[b.rarity].order - RARITIES[a.rarity].order)[0];
    render(ov, html`<div class="unbox reveal" style="max-width:760px">
      <h2>You got ${results.length} blooks!</h2>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:14px 0">${results.map(r => html`<div style="background:rgba(255,255,255,.12);border-radius:10px;padding:6px;border-bottom:5px solid ${rarityColor(r.rarity)};position:relative">${blook(r.blook, 80)}${r.isNew ? html`<span class="new-tag" style="position:absolute;top:-8px;right:-8px;font-size:11px;padding:1px 6px">NEW</span>` : ''}</div>`)}</div>
      <div class="title-font" style="font-size:22px">Best pull: <span style="color:${rarityColor(best.rarity)}">${BLOOKS[best.blook].name} (${best.rarity})</span></div>
      <div class="row" style="justify-content:center;margin-top:18px"><button class="btn big yellow" id="again">Open 10 More</button><button class="btn big white" id="done">Done</button></div></div>`);
    $('#again', ov).onclick = () => { close(); openPacks(pack, 10); };
  }
  $('#done', ov).onclick = close;
}

// ---- Bazaar ---------------------------------------------------------------------------------------
export async function bazaar(el) {
  let tab = 'browse', q = '';
  const draw = async () => {
    const { listings } = await get('/api/bazaar');
    const me = state.me;
    const mine = listings.filter(l => l.sellerId === me.id);
    let shown = tab === 'mine' ? mine : listings.filter(l => l.sellerId !== me.id);
    if (q) shown = shown.filter(l => BLOOKS[l.blook]?.name.toLowerCase().includes(q.toLowerCase()));
    render(el, html`<div class="tabs"><button data-tab="browse" class="${tab === 'browse' ? 'on' : ''}">Browse</button><button data-tab="mine" class="${tab === 'mine' ? 'on' : ''}">My Listings (${mine.length})</button><button data-tab="sell" class="${tab === 'sell' ? 'on' : ''}">Sell a Blook</button></div>
      ${tab === 'sell' ? sellGrid(me) : html`
        <input class="input" id="q" placeholder="Search blooks..." value="${q}" style="max-width:360px;margin-bottom:14px">
        ${shown.length ? html`<div class="set-grid">${shown.map(l => {
          const b = BLOOKS[l.blook];
          return html`<div class="card center" style="border-bottom:6px solid ${rarityColor(b.rarity)}">
            ${blook(l.blook, 90)}<h3 style="color:var(--purple)">${b.name}</h3><div class="title-font" style="color:${rarityColor(b.rarity)}">${b.rarity}</div>
            <div class="row" style="justify-content:center;margin:6px 0">${coin(20)}<b style="font-size:20px">${fmt(l.price)}</b></div>
            <div class="muted" style="font-size:13px;margin-bottom:8px">by ${l.sellerName}</div>
            ${l.sellerId === me.id ? html`<button class="btn small red" data-cancel="${l.id}">Remove</button>` : html`<button class="btn small yellow" data-buy="${l.id}" ${me.tokens < l.price ? 'disabled' : ''}>Buy</button>`}
          </div>`;
        })}</div>` : html`<div class="empty">${blook('coinzy', 90)}<p>${tab === 'mine' ? "You aren't selling anything." : 'Nothing for sale right now.'}</p></div>`}`}`);
    const qi = $('#q', el);
    if (qi) qi.oninput = () => { q = qi.value; clearTimeout(qi._t); qi._t = setTimeout(async () => { await draw(); const n = $('#q', el); n.focus(); n.setSelectionRange(q.length, q.length); }, 250); };
  };
  const sellGrid = me => {
    const sellable = Object.entries(me.blooks).filter(([id]) => BLOOKS[id] && BLOOKS[id].rarity !== 'Starter');
    return sellable.length ? html`<p style="color:#fff">Pick a blook to list for other players to buy:</p><div class="blook-tiles" style="background:var(--purple);padding:14px;border-radius:12px">${sellable.map(([id, n]) => html`<div class="tile" data-sell="${id}" title="${BLOOKS[id].name}">${blook(id, 54)}<span class="count" style="background:${rarityColor(BLOOKS[id].rarity)}">${n}</span></div>`)}</div>`
      : html`<div class="empty">${blook('pebble', 90)}<p>Open some packs first!</p></div>`;
  };
  on(el, '[data-tab]', 'click', (e, b) => { tab = b.dataset.tab; draw(); });
  on(el, '[data-sell]', 'click', (e, t) => listModal(t.dataset.sell));
  on(el, '[data-buy]', 'click', async (e, b) => {
    try { await post(`/api/bazaar/${b.dataset.buy}/buy`); toast('Bought!', 'good'); draw(); } catch (err) { toast(err.message, 'bad'); draw(); }
  });
  on(el, '[data-cancel]', 'click', async (e, b) => { await del(`/api/bazaar/${b.dataset.cancel}`); toast('Listing removed'); draw(); });
  await draw();
}
