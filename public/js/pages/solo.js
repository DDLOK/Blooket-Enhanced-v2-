// Blooket Enhanced v2 — solo practice & homework (answers are checked on the server).
// Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

import { state, post } from '../api.js';
import { html, render, $, blook, toast, on } from '../ui.js';
import { answerButtons } from './play.js';

export async function soloPage(el, { id }, { go }) {
  const hw = id.startsWith('hw-') ? id.slice(3) : null;
  document.body.style.background = 'linear-gradient(160deg,#3d8ee8,#9a49aa)';
  const session = await post('/api/solo/start', hw ? { homeworkId: hw } : { setId: id });
  let i = 0, correct = 0, busy = false, timer = null;
  const qs = session.questions;

  const frame = body => render(el, html`<div class="game-screen"><div class="game-top">${blook(state.me.avatar, 40)}<span class="title-font">${session.title}</span><span class="spacer"></span>
    <span class="title-font" style="background:rgba(0,0,0,.25);padding:4px 14px;border-radius:8px;font-size:20px">${correct} / ${qs.length} correct</span>
    <a class="btn small ghost" href="#/home">Quit</a></div><div class="game-body">${body}</div></div>`);

  const show = () => {
    clearInterval(timer);
    document.body.classList.remove('screen-correct', 'screen-wrong');
    const q = qs[i];
    const end = Date.now() + q.time * 1000;
    frame(html`<div class="row" style="width:min(1000px,100%)"><div class="timer-ring" id="t">${q.time}</div><span class="spacer"></span><span class="title-font" style="font-size:22px">Question ${i + 1} of ${qs.length}</span></div>
      <div class="question-box">${q.q}</div>${answerButtons(q.answers)}`);
    timer = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      const t = $('#t', el); if (t) t.textContent = s;
      if (s <= 0) { clearInterval(timer); answer(-1); }
    }, 250);
  };

  const answer = async choice => {
    if (busy) return;
    busy = true;
    clearInterval(timer);
    const q = qs[i];
    try {
      const r = await post(`/api/solo/${session.session}/answer`, { qi: q.qi, choice });
      if (r.correct) correct++;
      document.body.classList.add(r.correct ? 'screen-correct' : 'screen-wrong');
      frame(html`<div class="feedback ${r.correct ? 'good' : 'bad'}">${r.correct ? 'Correct!' : choice < 0 ? "Time's up!" : 'Incorrect'}</div>
        ${!r.correct ? html`<div class="question-box" style="font-size:22px">Answer: <b>${r.correctIdx.map(k => q.answers[k]).join(' / ')}</b></div>` : ''}
        <button class="btn big white" id="next">${i + 1 < qs.length ? 'Next' : 'Finish'}</button>`);
    } catch (e) { toast(e.message, 'bad'); }
    busy = false;
  };

  const finish = async () => {
    document.body.classList.remove('screen-correct', 'screen-wrong');
    const r = await post(`/api/solo/${session.session}/finish`);
    const pct = r.total ? Math.round(r.correct / r.total * 100) : 0;
    frame(html`${blook(pct >= 80 ? 'sunpetal' : pct >= 50 ? 'sprout' : 'pebble', 140)}
      <h1 style="font-size:50px;text-shadow:0 4px rgba(0,0,0,.2)">${pct}%</h1>
      <div class="title-font" style="font-size:24px">${r.correct} of ${r.total} correct</div>
      ${r.tokens ? html`<div class="title-font" style="font-size:22px;color:#fff6a0">+${r.tokens} tokens</div>` : html`<div style="opacity:.85">Daily solo token limit reached — keep practicing!</div>`}
      ${session.homework ? html`<p>Your homework was submitted. Your teacher sees your best try.</p>` : ''}
      <div class="row"><button class="btn big yellow" id="again">Play Again</button><a class="btn big white" href="#/home">Done</a></div>`);
  };

  on(el, '[data-ans]', 'click', (e, b) => { el.querySelectorAll('[data-ans]').forEach(x => { x.disabled = true; if (x !== b) x.classList.add('dim'); }); answer(Number(b.dataset.ans)); });
  on(el, '#next', 'click', () => { i++; if (i < qs.length) show(); else finish(); });
  on(el, '#again', 'click', () => go(`/solo/${id}`));
  show();
  return () => { clearInterval(timer); document.body.style.background = ''; document.body.className = ''; };
}
