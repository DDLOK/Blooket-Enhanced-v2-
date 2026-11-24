// Blooket Enhanced v2 — live game engine.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Self-paced modes (Blooket style): every player answers at their own speed; after a correct
// answer the mode's mini-game runs (chests, hacking, fishing, hiring workers, racing).
// The host sees a live leaderboard + activity feed. Games end when time runs out or someone hits the goal.
// "classic" (shown as Showdown) is the host-paced mode where everyone answers together.

import { store } from './store.mjs';
import { gameCode, newId, shuffle, today } from './util.mjs';
import { GAME_MODES, BLOOKS, PACKS } from '../public/js/data.js';
import { questProgress } from './quests.mjs';

export const games = new Map(); // code -> game

const rnd = n => Math.floor(Math.random() * n);
const pickWeighted = list => {
  const total = list.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of list) if ((r -= x.w) < 0) return x;
  return list[list.length - 1];
};

const pub = p => ({ id: p.id, name: p.name, blook: p.blook, score: Math.round(p.score), correct: p.correct, answered: p.answered, connected: p.conns.size > 0, done: !!p.finishedAt, extra: p.m?.badge });
const active = g => [...g.players.values()].filter(p => !p.kicked);
const standings = g => active(g).sort((a, b) => b.score - a.score || (a.finishedAt || Infinity) - (b.finishedAt || Infinity)).map(pub);

function send(conns, msg) { const s = JSON.stringify(msg); for (const c of conns) c.send(s); }
const toP = (p, msg) => send(p.conns, msg);
function toPlayers(g, msg) { for (const p of active(g)) send(p.conns, msg); }
function toHost(g, msg) { send(g.hostConns, msg); }
function toAll(g, msg) { toHost(g, msg); toPlayers(g, msg); }
const lobbyMsg = g => ({ t: 'lobby', state: g.state, players: active(g).map(pub) });

function feed(g, text, kind = 'info') {
  const item = { text, kind, ts: Date.now() };
  g.feed.push(item);
  if (g.feed.length > 40) g.feed.shift();
  toHost(g, { t: 'feed', item });
}

function boardSoon(g) {
  if (g.boardTimer) return;
  g.boardTimer = setTimeout(() => {
    g.boardTimer = null;
    if (g.state !== 'playing') return;
    const board = standings(g);
    toHost(g, { t: 'board', players: board });
    const small = board.slice(0, g.mode === 'race' ? 8 : 5);
    for (const p of active(g)) {
      const rank = board.findIndex(r => r.id === p.id) + 1;
      toP(p, { t: 'board', players: small, rank, total: board.length });
    }
  }, 400);
}

function addScore(g, p, delta) {
  p.score = Math.max(0, p.score + delta);
  checkGoal(g, p);
  boardSoon(g);
}
function checkGoal(g, p) {
  if (g.settings.winType === 'goal' && g.state === 'playing' && p.score >= g.settings.goal && !p.finishedAt) {
    p.finishedAt = Date.now();
    feed(g, `${p.name} reached the goal!`, 'big');
    endGame(g);
  }
}

// ---- Creating & joining ---------------------------------------------------------------------

export function createGame({ host, set, mode, settings = {} }) {
  const M = GAME_MODES[mode];
  if (!M) throw Object.assign(new Error('Unknown game mode'), { status: 400 });
  const code = gameCode(games);
  const winType = M.hostPaced ? 'questions' : M.win.includes(settings.winType) ? settings.winType : M.win[0];
  const goalMax = mode === 'race' ? 200 : 100_000_000;
  const g = {
    code, mode, hostId: host.id, hostName: host.username, setId: set.id, title: set.title,
    questions: set.questions.map(q => ({ q: q.q, answers: [...q.answers], correct: [...q.correct], time: q.time || 20 })),
    settings: {
      winType,
      timeLimitMin: Math.min(60, Math.max(1, Number(settings.timeLimitMin) || 7)),
      goal: Math.min(goalMax, Math.max(mode === 'race' ? 3 : 10, Math.round(Number(settings.goal) || M.defaultGoal || 15))),
      shuffle: settings.shuffle !== false,
      lateJoin: settings.lateJoin !== false,
    },
    state: 'lobby', created: Date.now(), startedAt: null, endsAt: null, endedAt: null,
    players: new Map(), hostConns: new Set(), feed: [],
    classic: { index: -1, phase: 'waiting', qStart: 0, timer: null, order: [] },
    endTimer: null, boardTimer: null, tick: null,
  };
  games.set(code, g);
  return g;
}

export function gameInfo(g) {
  const M = GAME_MODES[g.mode];
  return { code: g.code, mode: g.mode, modeName: M.name, unit: M.unit, title: g.title, state: g.state, hostName: g.hostName, players: g.players.size, lateJoin: g.settings.lateJoin, setId: g.setId };
}

export function joinGame(g, { name, blook, userId }) {
  if (g.state === 'ended') throw Object.assign(new Error('This game has ended'), { status: 410 });
  if (g.state === 'playing' && !g.settings.lateJoin) throw Object.assign(new Error('This game has already started'), { status: 409 });
  if (g.players.size >= 200) throw Object.assign(new Error('Game is full'), { status: 409 });
  const lower = name.toLowerCase();
  for (const p of active(g)) if (p.name.toLowerCase() === lower) throw Object.assign(new Error('That name is taken in this game'), { status: 409 });
  const p = {
    id: newId(6), token: newId(16), name, blook, userId: userId || null,
    score: 0, correct: 0, answered: 0, conns: new Set(), kicked: false,
    order: [], ptr: 0, current: null, pending: null, finishedAt: null, lastMsg: 0, msgCount: 0, streak: 0,
    classicAnswer: null, rewarded: null, m: {},
  };
  initModeState(g, p);
  g.players.set(p.id, p);
  toAll(g, lobbyMsg(g));
  if (g.state === 'playing') feed(g, `${name} joined the game`);
  return p;
}

function initModeState(g, p) {
  if (g.mode === 'crypto') {
    p.m = { password: null };
    p.pending = { type: 'password', options: shuffle(CRYPTO_WORDS).slice(0, 6) };
  }
  if (g.mode === 'fishing') p.m = { lure: 1, biggest: null, catches: 0 };
  if (g.mode === 'factory') p.m = { workers: [], rate: 0 };
}

// ---- Sockets --------------------------------------------------------------------------------------

export function attachHost(g, conn) {
  g.hostConns.add(conn);
  conn.send(JSON.stringify({ t: 'hello', role: 'host', game: { ...gameInfo(g), settings: g.settings, questionCount: g.questions.length, endsAt: g.endsAt }, feed: g.feed }));
  conn.send(JSON.stringify(lobbyMsg(g)));
  if (g.state === 'playing') {
    conn.send(JSON.stringify({ t: 'start', mode: g.mode, endsAt: g.endsAt, settings: g.settings }));
    conn.send(JSON.stringify({ t: 'board', players: standings(g) }));
    if (g.mode === 'classic') resendClassic(g, conn, null);
  }
  if (g.state === 'ended') conn.send(JSON.stringify(endMsg(g, null)));
  conn.onmessage = msg => hostAction(g, msg);
  conn.onclose = () => g.hostConns.delete(conn);
}

export function attachPlayer(g, p, conn) {
  p.conns.add(conn);
  conn.send(JSON.stringify({ t: 'hello', role: 'player', you: pub(p), game: { ...gameInfo(g), settings: g.settings, endsAt: g.endsAt }, m: playerModeView(g, p) }));
  conn.send(JSON.stringify(lobbyMsg(g)));
  if (p.pending?.type === 'password') conn.send(JSON.stringify({ t: 'password', options: p.pending.options }));
  if (g.state === 'playing') {
    conn.send(JSON.stringify({ t: 'start', mode: g.mode, endsAt: g.endsAt, settings: g.settings, resume: true }));
    if (g.mode === 'classic') resendClassic(g, conn, p);
    else if (p.pending && p.pending.type !== 'password') conn.send(JSON.stringify(pendingMsg(g, p)));
    else if (p.current != null) conn.send(JSON.stringify(questionMsg(g, p.current, p)));
    else if (p.m.password || g.mode !== 'crypto') conn.send(JSON.stringify({ t: 'ready' }));
  }
  if (g.state === 'ended') conn.send(JSON.stringify(endMsg(g, p)));
  toHost(g, lobbyMsg(g));
  conn.onmessage = msg => playerAction(g, p, msg);
  conn.onclose = () => { p.conns.delete(conn); if (!p.conns.size) toHost(g, lobbyMsg(g)); };
}

function playerModeView(g, p) {
  if (g.mode === 'fishing') return { lure: p.m.lure };
  if (g.mode === 'factory') return { workers: p.m.workers, rate: p.m.rate };
  if (g.mode === 'crypto') return { password: p.m.password };
  return {};
}

function hostAction(g, m) {
  switch (m.t) {
    case 'start': return startGame(g);
    case 'next': if (g.mode === 'classic') return classicNext(g); return;
    case 'reveal': if (g.mode === 'classic' && g.classic.phase === 'question') return classicReveal(g); return;
    case 'kick': {
      const p = g.players.get(m.pid);
      if (!p) return;
      p.kicked = true;
      toP(p, { t: 'kicked' });
      for (const c of p.conns) c.close();
      g.players.delete(p.id);
      toAll(g, lobbyMsg(g));
      boardSoon(g);
      return;
    }
    case 'end': return endGame(g);
  }
}

function playerAction(g, p, m) {
  if (p.kicked || g.state === 'ended') return;
  // Every action is already guarded by the player's state; this only caps runaway clients.
  const now = Date.now();
  if (now - p.lastMsg > 1000) { p.lastMsg = now; p.msgCount = 0; }
  if (++p.msgCount > 25) return;
  // Crypto Heist password can be chosen in the lobby too.
  if (m.t === 'password' && p.pending?.type === 'password') {
    const w = p.pending.options.includes(m.word) ? m.word : p.pending.options[0];
    p.m.password = w;
    p.pending = null;
    toP(p, { t: 'passwordSet', word: w });
    if (g.state === 'playing') toP(p, { t: 'ready' });
    return;
  }
  if (g.state !== 'playing') return;
  if (g.mode === 'classic') { if (m.t === 'answer') classicAnswer(g, p, m.choice); return; }
  if (m.t === 'next') return nextQuestion(g, p);
  if (m.t === 'answer') return answerQuestion(g, p, m.choice);
  const h = MODES[g.mode]?.actions?.[m.t];
  if (h) h(g, p, m);
}

// ---- Shared flow ---------------------------------------------------------------------------------

function startGame(g) {
  if (g.state !== 'lobby') return;
  if (!active(g).length) { toHost(g, { t: 'error', msg: 'Wait for at least one player to join.' }); return; }
  g.state = 'playing';
  g.startedAt = Date.now();
  if (g.settings.winType === 'time') g.endsAt = g.startedAt + g.settings.timeLimitMin * 60_000;
  else if (g.mode !== 'classic') g.endsAt = null;
  const cap = g.endsAt ? g.endsAt - Date.now() : 60 * 60_000; // hard cap of 1 hour for goal games
  g.endTimer = setTimeout(() => endGame(g), cap);
  toAll(g, { t: 'start', mode: g.mode, endsAt: g.endsAt, settings: g.settings });
  feed(g, 'The game has started!', 'big');
  if (g.mode === 'classic') {
    g.classic.order = g.settings.shuffle ? shuffle(g.questions.map((_, i) => i)) : g.questions.map((_, i) => i);
    classicNext(g);
  }
  if (g.mode === 'factory') g.tick = setInterval(() => factoryTick(g), 1000);
  boardSoon(g);
}

function questionMsg(g, qi, p) {
  const q = g.questions[qi];
  return { t: 'question', qi, q: q.q, answers: q.answers, time: q.time, score: Math.round(p?.score || 0) };
}

function pendingMsg(g, p) {
  const P = p.pending;
  switch (P.type) {
    case 'chests': return { t: 'chests', score: Math.round(p.score) };
    case 'target': return targetMsg(g, p, P.kind, P.amt);
    case 'cryptoChoices': return { t: 'choices', options: P.options.map(o => ({ kind: o.kind, amt: o.amt })), score: Math.round(p.score) };
    case 'hackTarget': return targetMsg(g, p, 'hack', 0);
    case 'hackGuess': return { t: 'hackGuess', target: P.targetName, options: P.options };
    case 'workers': return { t: 'workers', options: P.options, workers: p.m.workers, rate: p.m.rate, score: Math.round(p.score) };
    case 'password': return { t: 'password', options: P.options };
    default: return { t: 'ready' };
  }
}

function nextQuestion(g, p) {
  if (p.pending || p.finishedAt) { if (p.pending) toP(p, pendingMsg(g, p)); return; }
  if (p.current == null) {
    if (p.ptr >= p.order.length) {
      p.order = g.settings.shuffle ? shuffle(g.questions.map((_, i) => i)) : g.questions.map((_, i) => i);
      p.ptr = 0;
    }
    p.current = p.order[p.ptr++];
  }
  toP(p, questionMsg(g, p.current, p));
}

function answerQuestion(g, p, choice) {
  if (p.current == null || p.pending) return;
  const q = g.questions[p.current];
  const i = Number(choice);
  if (!Number.isInteger(i) || i < -1 || i >= q.answers.length) return;
  const correct = q.correct.includes(i);
  p.current = null;
  p.answered++;
  if (correct) { p.correct++; p.streak++; } else p.streak = 0;
  const res = { t: 'result', correct, correctIdx: q.correct, choice: i, streak: p.streak };
  const mode = MODES[g.mode];
  if (correct) mode.onCorrect(g, p, res); else mode.onWrong?.(g, p, res);
  res.score = Math.round(p.score);
  toP(p, res);
  boardSoon(g);
  if (correct) checkGoal(g, p); // after the result, so "Correct!" arrives before the end screen
}

function targetMsg(g, p, action, amt) {
  return {
    t: 'target', action, amt,
    targets: active(g).filter(x => x !== p).map(x => ({ id: x.id, name: x.name, blook: x.blook, score: Math.round(x.score) })).sort((a, b) => b.score - a.score),
  };
}

// ---- Gold Rush ----------------------------------------------------------------------------------------
const GOLD = [10, 15, 20, 25, 30, 40, 50, 75, 100];
const GOLD_OUTCOMES = [
  { kind: 'gold', w: 46 }, { kind: 'double', w: 6 }, { kind: 'triple', w: 2 }, { kind: 'bonus', w: 7 }, { kind: 'lose25', w: 8 },
  { kind: 'lose50', w: 3 }, { kind: 'nothing', w: 7 }, { kind: 'steal', w: 13 }, { kind: 'swap', w: 3 }, { kind: 'jackpot', w: 1 },
];
function rollChest(g, p) {
  let { kind } = pickWeighted(GOLD_OUTCOMES);
  if ((kind === 'steal' || kind === 'swap') && active(g).length < 2) kind = 'gold';
  const amt = kind === 'gold' ? GOLD[rnd(GOLD.length)] * (1 + Math.floor(p.correct / 10)) : kind === 'jackpot' ? 500 : kind === 'steal' ? [10, 20, 25, 30, 50][rnd(5)] : 0;
  return { kind, amt };
}
const chestLabel = o => ({
  gold: `+${o.amt} Gold`, double: 'Double Gold!', triple: 'Triple Gold!', bonus: '+25% Gold', lose25: 'Lose 25%', lose50: 'Lose 50%',
  nothing: 'Nothing!', steal: `Swipe ${o.amt}%`, swap: 'Swap!', jackpot: 'JACKPOT!',
}[o.kind]);

// ---- Crypto Heist ---------------------------------------------------------------------------------------
const CRYPTO_WORDS = ['banana', 'rocket', 'pickle', 'turtle', 'galaxy', 'waffle', 'pixel', 'thunder', 'cookie', 'ninja', 'marble', 'cactus',
  'robot', 'sunny', 'bubble', 'dragon', 'muffin', 'comet', 'lemon', 'panda', 'noodle', 'wizard', 'taco', 'jelly', 'volcano', 'penguin'];
const CRYPTO_AMTS = [{ a: 10, w: 14 }, { a: 20, w: 16 }, { a: 25, w: 14 }, { a: 40, w: 12 }, { a: 50, w: 12 }, { a: 75, w: 9 }, { a: 100, w: 8 }, { a: 150, w: 5 }, { a: 250, w: 3 }, { a: 500, w: 1 }];
function rollCrypto(g, p) {
  const r = Math.random();
  if (r < 0.22 && active(g).some(x => x !== p && x.m.password)) return { kind: 'hack' };
  if (r < 0.27) return { kind: 'double' };
  const mult = 1 + Math.floor(p.correct / 8);
  return { kind: 'gain', amt: pickWeighted(CRYPTO_AMTS.map(x => ({ ...x, w: x.w }))).a * mult };
}

// ---- Fish Fest --------------------------------------------------------------------------------------------
const FISH = [
  { name: 'Old Boot', min: 0, max: 0, color: '#6d4c41', rarity: 'Junk', w: 6 },
  { name: 'Minnow', min: 1, max: 3, color: '#a7b1c2', rarity: 'Common', w: 30 },
  { name: 'Sunny Perch', min: 3, max: 8, color: '#ffd166', rarity: 'Common', w: 24 },
  { name: 'Bluegill Bop', min: 5, max: 12, color: '#4cc9f0', rarity: 'Uncommon', w: 18 },
  { name: 'Puffer Pal', min: 8, max: 18, color: '#ffe066', rarity: 'Uncommon', w: 10 },
  { name: 'Rainbow Trout', min: 12, max: 25, color: '#ff8fab', rarity: 'Rare', w: 6 },
  { name: 'Swordtail', min: 20, max: 40, color: '#4361ee', rarity: 'Rare', w: 3 },
  { name: 'Glow Squid', min: 30, max: 60, color: '#b5179e', rarity: 'Epic', w: 2 },
  { name: 'Golden Koi', min: 60, max: 120, color: '#ffb703', rarity: 'Legendary', w: 0.8 },
  { name: 'Moby Blook', min: 150, max: 300, color: '#3a0ca3', rarity: 'Mystical', w: 0.2 },
];
const LURE_AT = [0, 4, 9, 15, 22]; // correct answers needed for lure levels 1..5
function castLine(p) {
  const lure = p.m.lure;
  const pool = FISH.map((f, i) => ({ ...f, w: f.w * (i >= 3 ? 1.45 ** (lure - 1) : i === 0 ? 1 / lure : 1) }));
  const f = pickWeighted(pool);
  const weight = f.max ? Math.round(f.min + Math.random() * (f.max - f.min)) * (1 + (lure - 1) * 0.15) : 0;
  return { name: f.name, color: f.color, rarity: f.rarity, weight: Math.round(weight) };
}

// ---- Blook Factory ------------------------------------------------------------------------------------------
const FACTORY_RATES = { Common: 1, Uncommon: 3, Rare: 8, Epic: 20, Legendary: 50, Chroma: 100, Mystical: 200 };
const FACTORY_ROLL = [{ r: 'Common', w: 46 }, { r: 'Uncommon', w: 28 }, { r: 'Rare', w: 15 }, { r: 'Epic', w: 7 }, { r: 'Legendary', w: 3 }, { r: 'Chroma', w: 0.8 }, { r: 'Mystical', w: 0.2 }];
const BY_RARITY = {};
for (const p of PACKS) for (const b of p.blooks) (BY_RARITY[b.rarity] ||= []).push(b.id);
const MAX_WORKERS = 10;
function rollWorker(p) {
  const r = pickWeighted(FACTORY_ROLL.map(x => ({ ...x, w: x.w }))).r;
  const list = BY_RARITY[r] || BY_RARITY.Common;
  return { blook: list[rnd(list.length)], rarity: r, rate: FACTORY_RATES[r], level: 1 };
}
function workerOptions(p) {
  if (p.m.workers.length < MAX_WORKERS) return [rollWorker(p), rollWorker(p), rollWorker(p)].map(w => ({ kind: 'hire', ...w }));
  // Factory full: offer upgrades of existing workers instead.
  const idx = shuffle(p.m.workers.map((_, i) => i)).slice(0, 3);
  return idx.map(i => ({ kind: 'upgrade', slot: i, blook: p.m.workers[i].blook, rarity: p.m.workers[i].rarity, rate: p.m.workers[i].rate * 2, level: p.m.workers[i].level + 1 }));
}
function factoryTick(g) {
  if (g.state !== 'playing') return;
  let changed = false;
  for (const p of active(g)) {
    if (!p.m.rate) continue;
    p.score += p.m.rate;
    changed = true;
    toP(p, { t: 'cash', score: Math.round(p.score), rate: p.m.rate });
    checkGoal(g, p);
    if (g.state !== 'playing') return;
  }
  if (changed) boardSoon(g);
}

// ---- Mode table --------------------------------------------------------------------------------------------
const MODES = {
  goldrush: {
    onCorrect(g, p, res) { p.pending = { type: 'chests', chests: [rollChest(g, p), rollChest(g, p), rollChest(g, p)] }; res.next = 'chests'; },
    actions: {
      chest(g, p, m) {
        if (p.pending?.type !== 'chests') return;
        const i = Number(m.i);
        if (!Number.isInteger(i) || i < 0 || i > 2) return;
        const chests = p.pending.chests, o = chests[i];
        const all = chests.map(chestLabel);
        p.pending = null;
        const before = p.score;
        switch (o.kind) {
          case 'gold': case 'jackpot': p.score += o.amt; break;
          case 'double': p.score = Math.max(p.score * 2, p.score + 25); break;
          case 'triple': p.score = Math.max(p.score * 3, p.score + 50); break;
          case 'bonus': p.score = Math.max(Math.round(p.score * 1.25), p.score + 15); break;
          case 'lose25': p.score = Math.round(p.score * 0.75); break;
          case 'lose50': p.score = Math.round(p.score * 0.5); break;
          case 'steal': case 'swap':
            p.pending = { type: 'target', kind: o.kind, amt: o.amt };
            toP(p, { t: 'opened', picked: i, all, label: chestLabel(o), kind: o.kind });
            toP(p, targetMsg(g, p, o.kind, o.amt));
            return;
        }
        if (o.kind === 'jackpot') feed(g, `${p.name} hit the JACKPOT! +500`, 'big');
        if (o.kind === 'triple') feed(g, `${p.name} tripled their gold!`);
        toP(p, { t: 'opened', picked: i, all, label: chestLabel(o), kind: o.kind, delta: Math.round(p.score - before), score: Math.round(p.score) });
        checkGoal(g, p);
        boardSoon(g);
      },
      target(g, p, m) {
        const P = p.pending;
        if (P?.type !== 'target') return;
        const other = g.players.get(m.pid);
        if (!other || other === p || other.kicked) return;
        p.pending = null;
        let text;
        if (P.kind === 'steal') {
          const taken = Math.round(other.score * P.amt / 100);
          other.score -= taken; p.score += taken;
          text = `You swiped ${taken} gold from ${other.name}!`;
          toP(other, { t: 'hit', text: `${p.name} swiped ${taken} of your gold!`, score: Math.round(other.score) });
          feed(g, `${p.name} swiped ${taken} gold from ${other.name}`, 'steal');
        } else {
          [p.score, other.score] = [other.score, p.score];
          text = `You swapped gold with ${other.name}!`;
          toP(other, { t: 'hit', text: `${p.name} swapped gold with you!`, score: Math.round(other.score) });
          feed(g, `${p.name} swapped gold with ${other.name}`, 'steal');
        }
        toP(p, { t: 'outcome', text, score: Math.round(p.score) });
        checkGoal(g, p);
        boardSoon(g);
      },
    },
  },
  crypto: {
    onCorrect(g, p, res) { p.pending = { type: 'cryptoChoices', options: [rollCrypto(g, p), rollCrypto(g, p), rollCrypto(g, p)] }; res.next = 'choices'; },
    actions: {
      choose(g, p, m) {
        if (p.pending?.type !== 'cryptoChoices') return;
        const o = p.pending.options[Number(m.i)];
        if (!o) return;
        p.pending = null;
        if (o.kind === 'hack') {
          p.pending = { type: 'hackTarget' };
          toP(p, targetMsg(g, p, 'hack', 0));
          return;
        }
        const before = p.score;
        if (o.kind === 'double') p.score = Math.max(p.score * 2, p.score + 50);
        else p.score += o.amt;
        toP(p, { t: 'outcome', text: o.kind === 'double' ? 'Crypto doubled!' : `+${o.amt} Crypto`, delta: Math.round(p.score - before), score: Math.round(p.score) });
        checkGoal(g, p);
        boardSoon(g);
      },
      target(g, p, m) {
        if (p.pending?.type !== 'hackTarget') return;
        const other = g.players.get(m.pid);
        if (!other || other === p || other.kicked) return;
        if (!other.m.password) { toP(p, { t: 'error', msg: `${other.name} hasn't picked a password yet — choose someone else` }); return; }
        const decoys = shuffle(CRYPTO_WORDS.filter(w => w !== other.m.password)).slice(0, 2);
        p.pending = { type: 'hackGuess', targetId: other.id, targetName: other.name, options: shuffle([other.m.password, ...decoys]) };
        toP(p, pendingMsg(g, p));
      },
      guess(g, p, m) {
        const P = p.pending;
        if (P?.type !== 'hackGuess') return;
        p.pending = null;
        const other = g.players.get(P.targetId);
        if (!other || other.kicked) { toP(p, { t: 'outcome', text: 'They left the game!', score: Math.round(p.score) }); return; }
        if (m.word !== other.m.password) {
          toP(p, { t: 'outcome', text: `Wrong password! ${other.name}'s system locked you out.`, kind: 'fail', score: Math.round(p.score) });
          toP(other, { t: 'hit', text: `${p.name} tried to hack you but failed!`, good: true, score: Math.round(other.score) });
          return;
        }
        const pct = 15 + rnd(21);
        const taken = Math.round(other.score * pct / 100);
        other.score -= taken; p.score += taken;
        toP(p, { t: 'outcome', text: `Hacked ${other.name} for ${taken} Crypto!`, kind: 'hack', delta: taken, score: Math.round(p.score) });
        toP(other, { t: 'hit', text: `${p.name} hacked you for ${taken} Crypto!`, score: Math.round(other.score) });
        feed(g, `${p.name} hacked ${other.name} for ${taken} Crypto`, 'steal');
        checkGoal(g, p);
        boardSoon(g);
      },
    },
  },
  fishing: {
    onCorrect(g, p, res) {
      const fish = castLine(p);
      p.score += fish.weight;
      p.m.catches++;
      if (!p.m.biggest || fish.weight > p.m.biggest.weight) p.m.biggest = fish;
      let lureUp = false;
      const lvl = LURE_AT.filter(n => p.correct >= n).length;
      if (lvl > p.m.lure) { p.m.lure = lvl; lureUp = true; }
      p.m.badge = `Lure ${p.m.lure}`;
      res.next = 'catch';
      res.fish = fish;
      res.lure = p.m.lure;
      res.lureUp = lureUp;
      if (['Legendary', 'Mystical', 'Epic'].includes(fish.rarity)) feed(g, `${p.name} caught a ${fish.name} (${fish.weight} lbs)!`, 'big');
    },
    onWrong(g, p, res) { res.fish = null; },
  },
  factory: {
    onCorrect(g, p, res) {
      const bonus = 10 + p.m.rate * 3;
      p.score += bonus;
      res.bonus = bonus;
      p.pending = { type: 'workers', options: workerOptions(p) };
      res.next = 'workers';
    },
    actions: {
      pick(g, p, m) {
        if (p.pending?.type !== 'workers') return;
        const o = p.pending.options[Number(m.i)];
        if (!o) return;
        p.pending = null;
        if (o.kind === 'hire' && p.m.workers.length < MAX_WORKERS) {
          p.m.workers.push({ blook: o.blook, rarity: o.rarity, rate: o.rate, level: 1 });
          if (['Legendary', 'Chroma', 'Mystical'].includes(o.rarity)) feed(g, `${p.name} hired a ${o.rarity} ${BLOOKS[o.blook]?.name}!`, 'big');
        } else if (o.kind === 'upgrade' && p.m.workers[o.slot]) {
          const w = p.m.workers[o.slot];
          w.rate *= 2; w.level++;
        }
        p.m.rate = p.m.workers.reduce((s, w) => s + w.rate, 0);
        p.m.badge = `${p.m.rate}/s`;
        toP(p, { t: 'factory', workers: p.m.workers, rate: p.m.rate, score: Math.round(p.score) });
      },
    },
  },
  race: {
    onCorrect(g, p, res) { p.score = p.correct; res.progress = p.correct; res.goal = g.settings.goal; },
  },
};

// ---- Ending -------------------------------------------------------------------------------------------------

function endMsg(g, p) {
  const board = standings(g);
  const you = p ? { rank: board.findIndex(x => x.id === p.id) + 1, score: Math.round(p.score), correct: p.correct, answered: p.answered, reward: p.rewarded, biggest: p.m?.biggest } : undefined;
  return { t: 'end', mode: g.mode, podium: board.slice(0, 3), standings: p ? board.slice(0, 10) : board, total: board.length, you };
}

export function endGame(g) {
  if (g.state === 'ended') return;
  clearTimeout(g.endTimer); clearTimeout(g.classic.timer); clearTimeout(g.boardTimer); clearInterval(g.tick);
  g.state = 'ended';
  g.endedAt = Date.now();
  const board = standings(g);
  const settingsDoc = store.get('meta', 'settings') || {};
  board.forEach((row, i) => {
    const p = g.players.get(row.id);
    if (!p?.userId || g.startedAt == null) return;
    const u = store.get('users', p.userId);
    if (!u) return;
    const place = board.length >= 3 ? [100, 60, 40][i] || 0 : 0;
    let tokens = 25 + Math.min(p.correct * 3, 150) + place;
    const d = today();
    if (u.earned?.date !== d) u.earned = { date: d, amount: 0 };
    const cap = Number(settingsDoc.dailyGameTokenCap) || 1500;
    tokens = Math.max(0, Math.min(tokens, cap - u.earned.amount));
    u.earned.amount += tokens;
    u.tokens += tokens;
    const xp = 10 + p.correct * 2;
    u.xp = (u.xp || 0) + xp;
    u.stats ||= {};
    u.stats.gamesPlayed = (u.stats.gamesPlayed || 0) + 1;
    u.stats.correct = (u.stats.correct || 0) + p.correct;
    u.stats.answered = (u.stats.answered || 0) + p.answered;
    const won = i === 0 && board.length > 1;
    if (won) u.stats.wins = (u.stats.wins || 0) + 1;
    questProgress(u, 'games', 1);
    questProgress(u, 'correct', p.correct);
    if (won) questProgress(u, 'wins', 1);
    if (g.mode !== 'classic') questProgress(u, `mode:${g.mode}`, 1);
    store.save('users', u.id);
    p.rewarded = { tokens, xp };
  });
  if (g.startedAt) {
    const id = newId(9);
    store.put('history', id, {
      id, hostId: g.hostId, setId: g.setId, title: g.title, mode: g.mode, date: g.endedAt,
      players: board.map(r => ({ name: r.name, score: r.score, correct: r.correct, answered: r.answered })),
    });
    const set = store.get('sets', g.setId);
    if (set) { set.plays = (set.plays || 0) + 1; store.save('sets', set.id); }
  }
  toHost(g, endMsg(g, null));
  for (const p of g.players.values()) toP(p, endMsg(g, p));
}

// ---- Showdown (host-paced "classic") ---------------------------------------------------------------------------

function classicNext(g) {
  const c = g.classic;
  if (g.state !== 'playing' || c.phase === 'question') return;
  c.index++;
  if (c.index >= c.order.length) return endGame(g);
  const qi = c.order[c.index];
  const q = g.questions[qi];
  c.phase = 'question';
  c.qStart = Date.now();
  for (const p of g.players.values()) p.classicAnswer = null;
  const msg = { ...questionMsg(g, qi), index: c.index, total: c.order.length, endsAt: c.qStart + q.time * 1000 };
  toHost(g, { ...msg, correct: q.correct });
  for (const p of active(g)) toP(p, { ...msg, score: Math.round(p.score) });
  clearTimeout(c.timer);
  c.timer = setTimeout(() => classicReveal(g), q.time * 1000 + 300);
}

function resendClassic(g, conn, p) {
  const c = g.classic;
  if (c.index < 0) return;
  const qi = c.order[c.index];
  const q = g.questions[qi];
  if (c.phase === 'question') {
    const msg = { ...questionMsg(g, qi, p), index: c.index, total: c.order.length, endsAt: c.qStart + q.time * 1000 };
    if (!p) msg.correct = q.correct;
    conn.send(JSON.stringify(msg));
    if (p?.classicAnswer) conn.send(JSON.stringify({ t: 'locked' }));
  } else conn.send(JSON.stringify(revealMsg(g, p)));
}

function classicAnswer(g, p, choice) {
  const c = g.classic;
  if (c.phase !== 'question' || p.classicAnswer) return;
  const q = g.questions[c.order[c.index]];
  const i = Number(choice);
  if (!Number.isInteger(i) || i < 0 || i >= q.answers.length) return;
  const ms = Date.now() - c.qStart;
  const correct = q.correct.includes(i);
  const points = correct ? 500 + Math.round(500 * Math.max(0, 1 - ms / (q.time * 1000))) : 0;
  p.classicAnswer = { choice: i, correct, points };
  p.answered++;
  if (correct) { p.correct++; p.score += points; }
  toP(p, { t: 'locked' });
  const live = active(g).filter(x => x.conns.size);
  const answered = live.filter(x => x.classicAnswer).length;
  toHost(g, { t: 'answered', count: active(g).filter(x => x.classicAnswer).length, total: live.length });
  if (live.length && answered >= live.length) classicReveal(g);
}

function revealMsg(g, p) {
  const c = g.classic;
  const q = g.questions[c.order[c.index]];
  const counts = q.answers.map(() => 0);
  for (const x of g.players.values()) if (x.classicAnswer) counts[x.classicAnswer.choice]++;
  const board = standings(g);
  const msg = { t: 'reveal', index: c.index, total: c.order.length, correct: q.correct, counts, top: board.slice(0, 5), last: c.index >= c.order.length - 1 };
  if (p) msg.you = { ...(p.classicAnswer || { correct: false, points: 0, choice: null }), score: Math.round(p.score), rank: board.findIndex(x => x.id === p.id) + 1 };
  return msg;
}

function classicReveal(g) {
  const c = g.classic;
  if (c.phase !== 'question') return;
  clearTimeout(c.timer);
  c.phase = 'reveal';
  toHost(g, revealMsg(g, null));
  for (const p of active(g)) toP(p, revealMsg(g, p));
}

// ---- Housekeeping -----------------------------------------------------------------------------------------------
setInterval(() => {
  const now = Date.now();
  for (const [code, g] of games) {
    const idle = g.state === 'ended' ? now - g.endedAt > 30 * 60_000 : now - g.created > 4 * 3600_000;
    if (idle) {
      if (g.state !== 'ended') endGame(g);
      for (const c of g.hostConns) c.close();
      for (const p of g.players.values()) for (const c of p.conns) c.close();
      games.delete(code);
    }
  }
}, 60_000).unref?.();
