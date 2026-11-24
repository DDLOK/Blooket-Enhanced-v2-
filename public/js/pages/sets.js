// Blooket Enhanced v2 — question sets, hosting, history & homework pages.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, get, post, put, del } from '../api.js';
import { html, raw, render, $, $$, blook, icon, toast, modal, confirmBox, fmt, ago, on } from '../ui.js';
import { GAME_MODES, PACKS } from '../data.js';

const COLORS = ['#0bc2cf', '#9a49aa', '#ffa31e', '#4bc22e', '#e44c8d', '#3d8ee8', '#ff5d5d', '#2a9d8f', '#6c4cff', '#f4a261'];
const coverBlook = id => {
  const all = PACKS.flatMap(p => p.blooks.map(b => b.id));
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return all[h % all.length];
};

function setCards(list, emptyText) {
  if (!list.length) return html`<div class="empty">${blook('pebble', 90)}<p>${emptyText}</p></div>`;
  return html`<div class="set-grid">${list.map(s => html`<a class="set-card" href="#/set/${s.id}">
    <div class="cover" style="background:${s.color || '#0bc2cf'}">${blook(coverBlook(s.id), 80)}<span class="qcount">${s.questionCount} Questions</span></div>
    <div class="body"><h3>${s.title}</h3><div class="meta"><span>${s.ownerName}</span><span>${fmt(s.plays)} plays</span>${s.favorite ? html`<span class="fav">★</span>` : ''}${!s.public ? html`<span>🔒 Private</span>` : ''}</div></div>
  </a>`)}</div>`;
}

async function listPage(el, scope, empty, withSearch = false) {
  render(el, html`${withSearch ? html`<form id="search" class="row" style="margin-bottom:16px"><input class="input" name="q" placeholder="Search sets..." style="max-width:420px"><button class="btn">Search</button><a class="btn yellow" href="#/create">${icon('plus')} Create</a></form>` : ''}<div id="list"><div class="spinner"></div></div>`);
  const load = async (q = '') => {
    const { sets } = await get(`/api/sets?scope=${scope}&q=${encodeURIComponent(q)}`);
    render($('#list', el), setCards(sets, empty));
  };
  if (withSearch) $('#search', el).onsubmit = e => { e.preventDefault(); load(new FormData(e.target).get('q')); };
  await load();
}
export const discover = el => listPage(el, 'discover', 'No public sets yet — be the first to create one!', true);
export const mySets = el => listPage(el, 'mine', "You haven't made any sets yet. Hit Create to make one!");
export const favorites = el => listPage(el, 'favorites', 'Tap the star on a set to save it here.');

// ---- Set page ------------------------------------------------------------------------------
export async function setPage(el, { id }, { go, setTitle }) {
  const { set } = await get(`/api/sets/${id}`);
  setTitle(set.title);
  const me = state.me;
  render(el, html`<div class="grid" style="grid-template-columns:minmax(0,1fr) 320px">
    <div class="stack">
      <div class="card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">
        <div style="background:${set.color};border-radius:12px;padding:10px">${blook(coverBlook(set.id), 110)}</div>
        <div style="flex:1;min-width:200px">
          <h2 style="font-size:30px;color:var(--purple)">${set.title}</h2>
          <p style="margin:6px 0;font-weight:600">${set.description || 'No description.'}</p>
          <div class="muted" style="font-size:14px">${set.questionCount} questions · by <a href="#/u/${set.ownerName}" style="color:var(--purple)">${set.ownerName}</a> · ${fmt(set.plays)} plays · ${set.public ? 'Public' : 'Private'}</div>
        </div>
      </div>
      ${set.questions ? html`<div class="panel"><div class="panel-head"><h2>Questions</h2></div>
        ${set.questions.map((q, i) => html`<div style="background:rgba(255,255,255,.12);border-radius:8px;padding:10px;margin-bottom:8px">
          <b>${i + 1}. ${q.q}</b> <span class="muted" style="font-size:12px">${q.time}s</span>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${q.answers.map((a, j) => html`<span style="background:${q.correct.includes(j) ? 'var(--green)' : 'rgba(0,0,0,.2)'};padding:3px 10px;border-radius:6px;font-size:14px">${q.correct.includes(j) ? '✓ ' : ''}${a}</span>`)}</div>
        </div>`)}</div>` : html`<div class="panel center"><p>Answers are hidden — host or play solo to see the questions!</p></div>`}
    </div>
    <div class="stack">
      <button class="btn big yellow block" id="hostBtn">${icon('play')} Host Live</button>
      <button class="btn big block" id="soloBtn">Solo Practice</button>
      <button class="btn big purple block" id="hwBtn">${icon('homework')} Assign Homework</button>
      <button class="btn block white" id="favBtn" style="box-shadow:inset 0 -5px #ddd">${set.favorite ? '★ Favorited' : '☆ Favorite'}</button>
      ${set.mine ? html`<a class="btn block green" href="#/edit/${set.id}">Edit Set</a><button class="btn block red" id="delBtn">Delete Set</button>` : ''}
    </div>
  </div>`);
  $('#hostBtn').onclick = () => hostModal(set, go);
  $('#soloBtn').onclick = () => go(`/solo/${set.id}`);
  $('#hwBtn').onclick = () => assignModal(set, go);
  $('#favBtn').onclick = async e => {
    const r = await post(`/api/sets/${set.id}/favorite`);
    e.target.textContent = r.favorite ? '★ Favorited' : '☆ Favorite';
    toast(r.favorite ? 'Added to favorites' : 'Removed from favorites');
  };
  if (set.mine) $('#delBtn').onclick = async () => {
    if (!(await confirmBox('Delete set?', `"${set.title}" will be deleted forever.`, 'Delete', 'red'))) return;
    await del(`/api/sets/${set.id}`); toast('Set deleted'); go('/my-sets');
  };
}

function hostModal(set, go) {
  let mode = 'classic';
  const m = modal('Host a Game', html`
    <p style="margin-top:0">Pick a game mode for <b>${set.title}</b>:</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px" id="modes">
      ${Object.entries(GAME_MODES).map(([id, g]) => html`<button class="choice ${id === mode ? 'on' : ''}" data-mode="${id}" style="background:${g.color};color:#fff;text-align:left;padding:12px">
        <div class="title-font" style="font-size:22px">${g.name}</div><div style="font-size:13px;font-weight:600;margin-top:4px">${g.desc}</div></button>`)}
    </div>
    <div id="opts" style="margin-top:14px"></div>
    <label class="check" style="background:#f3e9f6;color:var(--ink);border-color:#e4d6e8"><input type="checkbox" id="shuffle" checked> Shuffle questions</label>
    <label class="check" style="background:#f3e9f6;color:var(--ink);border-color:#e4d6e8"><input type="checkbox" id="late" checked> Allow late joining</label>
    <button class="btn big block yellow" id="go" style="margin-top:14px">Host Now</button>`, { wide: true });
  const opts = () => render($('#opts', m.el), mode === 'goldrush'
    ? html`<label class="field"><span>Time limit (minutes)</span><input class="input" type="number" id="time" min="1" max="30" value="7"></label>`
    : mode === 'race' ? html`<label class="field"><span>Correct answers to win</span><input class="input" type="number" id="goal" min="3" max="100" value="${Math.min(15, Math.max(5, set.questionCount))}"></label>` : '');
  opts();
  on(m.el, '[data-mode]', 'click', (e, b) => { mode = b.dataset.mode; $$('[data-mode]', m.el).forEach(x => x.classList.toggle('on', x === b)); opts(); });
  $('#go', m.el).onclick = async () => {
    try {
      const r = await post('/api/games', {
        setId: set.id, mode,
        settings: { timeLimitMin: $('#time', m.el)?.value, goal: $('#goal', m.el)?.value, shuffle: $('#shuffle', m.el).checked, lateJoin: $('#late', m.el).checked },
      });
      m.close(); go(`/host/${r.code}`);
    } catch (e) { toast(e.message, 'bad'); }
  };
}

function assignModal(set, go) {
  const m = modal('Assign Homework', html`
    <p style="margin-top:0">Students open the link, log in and play <b>${set.title}</b> on their own. You'll see everyone's best score.</p>
    <label class="field"><span>Title</span><input class="input" id="t" value="${set.title}" maxlength="80"></label>
    <label class="field"><span>Due date (optional)</span><input class="input" type="datetime-local" id="due"></label>
    <button class="btn big block" id="ok">Create Homework</button>`);
  $('#ok', m.el).onclick = async () => {
    try {
      const due = $('#due', m.el).value;
      const r = await post('/api/homework', { setId: set.id, title: $('#t', m.el).value, dueAt: due ? new Date(due).toISOString() : null });
      m.close(); toast('Homework created!', 'good'); go(`/homework/${r.homework.id}`);
    } catch (e) { toast(e.message, 'bad'); }
  };
}

// ---- Editor -----------------------------------------------------------------------------------
export async function editor(el, { id }, { go }) {
  let data = { title: '', description: '', public: true, color: COLORS[Math.floor(Math.random() * COLORS.length)], questions: [blankQ()] };
  if (id) {
    const { set } = await get(`/api/sets/${id}`);
    if (!set.mine) throw new Error("You can't edit this set");
    data = { title: set.title, description: set.description, public: set.public, color: set.color, questions: set.questions };
  }
  function blankQ() { return { q: '', answers: ['', '', '', ''], correct: [0], time: 20 }; }
  const draw = () => {
    render(el, html`<div class="stack">
      <div class="panel">
        <div class="grid cols-2">
          <div>
            <label class="field"><span>Title</span><input class="input" id="title" maxlength="80" value="${data.title}" placeholder="e.g. Fractions Review"></label>
            <label class="field"><span>Description</span><textarea class="input" id="desc" maxlength="300" placeholder="What's this set about?">${data.description}</textarea></label>
          </div>
          <div>
            <span style="font-size:14px">Cover color</span>
            <div class="row" style="margin:6px 0 14px">${COLORS.map(c => html`<button class="swatch ${c === data.color ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="color"></button>`)}</div>
            <label class="check"><input type="checkbox" id="pub" ${data.public ? 'checked' : ''}> Public (anyone can find &amp; host it)</label>
            <div class="row" style="margin-top:12px"><button class="btn ghost" id="importBtn">Import questions</button></div>
          </div>
        </div>
      </div>
      <div id="qs">${data.questions.map((q, i) => html`<div class="q-editor" data-i="${i}">
        <div class="row"><b class="title-font" style="color:var(--purple);font-size:20px">Question ${i + 1}</b><span class="spacer"></span>
          <label style="font-size:14px">Time <select class="input" data-f="time" style="width:auto;padding:4px 8px">${[5, 10, 15, 20, 30, 45, 60, 90, 120].map(t => html`<option value="${t}" ${q.time === t ? 'selected' : ''}>${t}s</option>`)}</select></label>
          <button class="btn small red" data-del ${data.questions.length < 2 ? 'disabled' : ''}>Delete</button></div>
        <input class="input" data-f="q" value="${q.q}" maxlength="300" placeholder="Type your question" style="margin-top:8px">
        <div class="ans-grid">${[0, 1, 2, 3].map(j => html`<label class="ans-input"><input type="checkbox" data-c="${j}" ${q.correct.includes(j) ? 'checked' : ''} title="Correct answer"><input type="text" data-a="${j}" value="${q.answers[j] || ''}" maxlength="120" placeholder="Answer ${j + 1}${j > 1 ? ' (optional)' : ''}"></label>`)}</div>
      </div>`)}</div>
      <div class="row"><button class="btn green" id="addQ">${icon('plus')} Add Question</button><span class="spacer"></span><p class="error-text" id="err" style="color:#fff;background:${'rgba(230,57,70,.8)'};border-radius:6px;padding:0 8px" hidden></p><button class="btn big yellow" id="save">${id ? 'Save Changes' : 'Create Set'}</button></div>
    </div>`);
    bind();
  };
  const collect = () => {
    data.title = $('#title', el).value;
    data.description = $('#desc', el).value;
    data.public = $('#pub', el).checked;
    data.questions = $$('.q-editor', el).map(box => {
      const answers = [0, 1, 2, 3].map(j => $(`[data-a="${j}"]`, box).value);
      return { q: $('[data-f=q]', box).value, answers, correct: [0, 1, 2, 3].filter(j => $(`[data-c="${j}"]`, box).checked), time: Number($('[data-f=time]', box).value) };
    });
  };
  const bind = () => {
    $('#addQ', el).onclick = () => { collect(); data.questions.push(blankQ()); draw(); $$('.q-editor', el).at(-1).scrollIntoView({ behavior: 'smooth' }); };
    $('#importBtn', el).onclick = () => importModal(qs => { collect(); data.questions = data.questions.filter(q => q.q.trim()).concat(qs); draw(); });
    $('#save', el).onclick = async () => {
      collect();
      // Drop empty answers but keep "correct" indexes pointing at the right answers.
      const questions = data.questions.map(q => {
        const keep = q.answers.map((a, j) => [a.trim(), j]).filter(([a]) => a);
        return { q: q.q, time: q.time, answers: keep.map(([a]) => a), correct: keep.map(([, j], k) => (q.correct.includes(j) ? k : -1)).filter(k => k >= 0) };
      });
      try {
        const body = { ...data, questions };
        const r = id ? await put(`/api/sets/${id}`, body) : await post('/api/sets', body);
        toast('Saved!', 'good'); go(`/set/${r.set.id}`);
      } catch (e) { const er = $('#err', el); er.hidden = false; er.textContent = e.message; toast(e.message, 'bad'); }
    };
  };
  // Delegated handlers are bound once (the page container survives redraws).
  on(el, '[data-color]', 'click', (e, b) => { collect(); data.color = b.dataset.color; draw(); });
  on(el, '[data-del]', 'click', (e, b) => { collect(); data.questions.splice(Number(b.closest('.q-editor').dataset.i), 1); draw(); });
  draw();
}

function importModal(done) {
  const m = modal('Import Questions', html`
    <p style="margin-top:0">One question per line, separated by commas or tabs (you can paste straight from a spreadsheet):</p>
    <pre style="background:#f3e9f6;padding:10px;border-radius:8px;font-size:13px;white-space:pre-wrap">Question, Answer 1, Answer 2, Answer 3, Answer 4, Correct (1-4)
What is 5 x 6?, 30, 11, 56, 35, 1</pre>
    <textarea class="input" id="txt" style="min-height:180px" placeholder="Paste here"></textarea>
    <p class="error-text" id="err"></p>
    <button class="btn big block" id="ok">Import</button>`, { wide: true });
  $('#ok', m.el).onclick = () => {
    const lines = $('#txt', m.el).value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out = [];
    for (const [n, line] of lines.entries()) {
      const cells = (line.includes('\t') ? line.split('\t') : parseCsvLine(line)).map(c => c.trim());
      if (/^question$/i.test(cells[0])) continue;
      const last = cells[cells.length - 1];
      const correctNums = /^[1-4](\s*[;|/ ]\s*[1-4])*$/.test(last) ? last.split(/[;|/ ]+/).map(x => Number(x) - 1) : null;
      const answers = (correctNums ? cells.slice(1, -1) : cells.slice(1)).filter(Boolean).slice(0, 4);
      if (!cells[0] || answers.length < 2) { $('#err', m.el).textContent = `Line ${n + 1} needs a question and at least 2 answers`; return; }
      out.push({ q: cells[0], answers: [...answers, '', '', ''].slice(0, 4), correct: (correctNums || [0]).filter(i => i < answers.length), time: 20 });
    }
    if (!out.length) { $('#err', m.el).textContent = 'Nothing to import'; return; }
    m.close(); toast(`Imported ${out.length} questions`, 'good'); done(out);
  };
}
function parseCsvLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

// ---- History ------------------------------------------------------------------------------------
export async function history(el) {
  const { history } = await get('/api/history');
  render(el, history.length ? html`<div>${history.map(h => html`<a class="list-item" href="#/history/${h.id}">
      <div style="background:${GAME_MODES[h.mode]?.color};color:#fff;border-radius:8px;padding:6px 10px" class="title-font">${GAME_MODES[h.mode]?.name}</div>
      <div style="flex:1"><b style="font-size:18px">${h.title}</b><div class="muted" style="font-size:13px">${new Date(h.date).toLocaleString()} · ${h.players} players · Winner: ${h.winner || '—'}</div></div>
      <span class="btn small">View</span></a>`)}</div>`
    : html`<div class="empty">${blook('moonpie', 90)}<p>Games you host will show up here with full reports.</p></div>`);
}

const csvCell = v => `"${String(v).replace(/"/g, '""')}"`;
function downloadCsv(name, rows) {
  const blob = new Blob([rows.map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function historyDetail(el, { id }, { setTitle }) {
  const { history: h } = await get(`/api/history/${id}`);
  setTitle(h.title);
  render(el, html`<div class="panel">
    <div class="panel-head"><h2>${GAME_MODES[h.mode]?.name} · ${new Date(h.date).toLocaleString()}</h2><button class="btn yellow small" id="csv">Download CSV</button></div>
    <table class="table"><thead><tr><th>#</th><th>Player</th><th>${h.mode === 'goldrush' ? 'Gold' : h.mode === 'race' ? 'Progress' : 'Score'}</th><th>Correct</th><th>Accuracy</th></tr></thead>
    <tbody>${h.players.map((p, i) => html`<tr><td>${i + 1}</td><td>${p.name}</td><td>${fmt(p.score)}</td><td>${p.correct} / ${p.answered}</td><td>${p.answered ? Math.round(p.correct / p.answered * 100) : 0}%</td></tr>`)}</tbody></table>
  </div>`);
  $('#csv').onclick = () => downloadCsv(`${h.title}-report.csv`, [['Rank', 'Player', 'Score', 'Correct', 'Answered', 'Accuracy %'], ...h.players.map((p, i) => [i + 1, p.name, p.score, p.correct, p.answered, p.answered ? Math.round(p.correct / p.answered * 100) : 0])]);
}

// ---- Homework -----------------------------------------------------------------------------------
export async function homeworkList(el) {
  const { homework } = await get('/api/homework');
  render(el, html`<div class="panel" style="margin-bottom:14px">To assign homework, open any set and press <b>Assign Homework</b>. Share the link with your class — they play solo and you see their scores.</div>
    ${homework.length ? homework.map(h => html`<a class="list-item" href="#/homework/${h.id}"><div style="flex:1"><b style="font-size:18px">${h.title}</b><div class="muted" style="font-size:13px">${h.dueAt ? `Due ${new Date(h.dueAt).toLocaleString()}` : 'No due date'} · ${h.submissions} submissions</div></div><span class="btn small">Results</span></a>`)
    : html`<div class="empty">${blook('mossy-mole', 90)}<p>No homework assigned yet.</p></div>`}`);
}

export async function homeworkDetail(el, { id }, { go, setTitle }) {
  const { homework: h } = await get(`/api/homework/${id}`);
  setTitle(h.title);
  const link = `${location.origin}/#/hw/${h.id}`;
  render(el, html`<div class="stack">
    <div class="panel"><div class="panel-head"><h2>${h.setTitle} · ${h.questionCount} questions</h2></div>
      <p style="margin:0 0 8px">${h.dueAt ? `Due ${new Date(h.dueAt).toLocaleString()}` : 'No due date'}</p>
      <div class="row"><input class="input" readonly value="${link}" style="max-width:480px" id="link"><button class="btn yellow" id="copy">Copy Link</button>
      ${h.mine ? html`<button class="btn small red" id="del">Delete</button><button class="btn small" id="csv">Download CSV</button>` : ''}</div></div>
    ${h.mine ? html`<table class="table"><thead><tr><th>Student</th><th>Best score</th><th>Correct</th><th>Attempts</th><th>Last try</th></tr></thead><tbody>
      ${h.results.length ? h.results.map(r => html`<tr><td>${r.username}</td><td><b>${r.pct}%</b></td><td>${r.correct}/${r.total}</td><td>${r.attempts}</td><td>${ago(r.at)}</td></tr>`) : html`<tr><td colspan="5" class="center muted">No submissions yet</td></tr>`}
    </tbody></table>` : ''}
  </div>`);
  $('#copy').onclick = () => { navigator.clipboard?.writeText(link); $('#link').select(); toast('Link copied!', 'good'); };
  if (h.mine) {
    $('#del').onclick = async () => { if (await confirmBox('Delete homework?', 'Students will no longer be able to open it.', 'Delete', 'red')) { await del(`/api/homework/${id}`); go('/homework'); } };
    $('#csv').onclick = () => downloadCsv(`${h.title}-homework.csv`, [['Student', 'Best %', 'Correct', 'Total', 'Attempts'], ...h.results.map(r => [r.username, r.pct, r.correct, r.total, r.attempts])]);
  }
}

export async function homeworkStudent(el, { id }, { go, setTitle }) {
  const { homework: h } = await get(`/api/homework/${id}`);
  setTitle(h.title);
  const late = h.dueAt && Date.now() > h.dueAt;
  render(el, html`<div class="panel center" style="max-width:560px;margin:20px auto">
    ${blook('acorn-knight', 110)}
    <h2 style="font-size:30px">${h.title}</h2>
    <p>From ${h.ownerName} · ${h.questionCount} questions${h.dueAt ? ` · Due ${new Date(h.dueAt).toLocaleString()}` : ''}</p>
    ${h.yourResult ? html`<p class="title-font" style="font-size:22px;color:var(--yellow)">Your best: ${h.yourResult.pct}% (${h.yourResult.correct}/${h.yourResult.total})</p>` : ''}
    ${late ? html`<p class="title-font">This homework is past due.</p>` : html`<button class="btn big yellow" id="start">${h.yourResult ? 'Try Again' : 'Start Homework'}</button>`}
    ${h.mine ? html`<p><a class="btn small ghost" href="#/homework/${h.id}">See class results</a></p>` : ''}
  </div>`);
  $('#start')?.addEventListener('click', () => go(`/solo/hw-${h.id}`));
}
