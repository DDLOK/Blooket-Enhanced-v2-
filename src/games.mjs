// Blooket Enhanced v2 — live game engine (Classic, Gold Rush, Blook Race).
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.

import { store } from './store.mjs';
import { gameCode, newId, shuffle, today } from './util.mjs';
import { GAME_MODES } from '../public/js/data.js';

export const games = new Map(); // code -> game

const pub = p => ({ id: p.id, name: p.name, blook: p.blook, score: Math.round(p.score), correct: p.correct, answered: p.answered, connected: p.conns.size > 0, done: !!p.finishedAt });
const standings = g => [...g.players.values()].filter(p => !p.kicked).sort((a, b) => b.score - a.score || (a.finishedAt || Infinity) - (b.finishedAt || Infinity)).map(pub);

function send(conns, msg) {
  const s = JSON.stringify(msg);
  for (const c of conns) c.send(s);
}
function toPlayers(g, msg) { for (const p of g.players.values()) if (!p.kicked) send(p.conns, msg); }
function toHost(g, msg) { send(g.hostConns, msg); }
function toAll(g, msg) { toHost(g, msg); toPlayers(g, msg); }

function lobbyMsg(g) {
  return { t: 'lobby', state: g.state, players: [...g.players.values()].filter(p => !p.kicked).map(pub) };
}

// Live scoreboards are throttled so 30+ players answering at once doesn't flood anyone.
function boardSoon(g) {
  if (g.boardTimer) return;
  g.boardTimer = setTimeout(() => {
    g.boardTimer = null;
    if (g.state !== 'playing') return;
    const board = standings(g);
    toHost(g, { t: 'board', players: board, endsAt: g.endsAt });
    if (g.mode === 'race') toPlayers(g, { t: 'board', players: board, goal: g.settings.goal });
    else toPlayers(g, { t: 'board', players: board.slice(0, 5) });
  }, 400);
}

export function createGame({ host, set, mode, settings = {} }) {
  if (!GAME_MODES[mode]) throw Object.assign(new Error('Unknown game mode'), { status: 400 });
  const code = gameCode(games);
  const g = {
    code, mode,
    hostId: host.id, hostName: host.username,
    setId: set.id, title: set.title,
    questions: set.questions.map(q => ({ q: q.q, answers: [...q.answers], correct: [...q.correct], time: q.time || 20 })),
    settings: {
      timeLimitMin: Math.min(30, Math.max(1, Number(settings.timeLimitMin) || 7)),
      goal: Math.min(100, Math.max(3, Number(settings.goal) || Math.min(15, Math.max(5, set.questions.length)))),
      shuffle: settings.shuffle !== false,
      lateJoin: settings.lateJoin !== false,
    },
    state: 'lobby', created: Date.now(), startedAt: null, endsAt: null, endedAt: null,
    players: new Map(), hostConns: new Set(),
    classic: { index: -1, phase: 'waiting', qStart: 0, timer: null, order: [] },
    endTimer: null, boardTimer: null,
  };
  games.set(code, g);
  return g;
}

export function gameInfo(g) {
  return { code: g.code, mode: g.mode, modeName: GAME_MODES[g.mode].name, title: g.title, state: g.state, hostName: g.hostName, players: g.players.size, lateJoin: g.settings.lateJoin };
}

export function joinGame(g, { name, blook, userId }) {
  if (g.state === 'ended') throw Object.assign(new Error('This game has ended'), { status: 410 });
  if (g.state === 'playing' && !g.settings.lateJoin) throw Object.assign(new Error('This game has already started'), { status: 409 });
  if (g.players.size >= 200) throw Object.assign(new Error('Game is full'), { status: 409 });
  const lower = name.toLowerCase();
  for (const p of g.players.values()) if (p.name.toLowerCase() === lower && !p.kicked) throw Object.assign(new Error('That name is taken in this game'), { status: 409 });
  const p = {
    id: newId(6), token: newId(16), name, blook, userId: userId || null,
    score: 0, correct: 0, answered: 0, conns: new Set(), kicked: false,
    order: [], ptr: 0, current: null, chests: null, pendingTarget: null, finishedAt: null, lastAnswer: 0,
    classicAnswer: null, rewarded: null,
  };
  g.players.set(p.id, p);
  toHost(g, lobbyMsg(g));
  toPlayers(g, lobbyMsg(g));
  return p;
}

// ---- Socket entry points ----------------------------------------------------------------

export function attachHost(g, conn) {
  g.hostConns.add(conn);
  conn.send(JSON.stringify({ t: 'hello', role: 'host', game: { ...gameInfo(g), settings: g.settings, questionCount: g.questions.length } }));
  conn.send(JSON.stringify(lobbyMsg(g)));
  if (g.state === 'playing') {
    conn.send(JSON.stringify({ t: 'board', players: standings(g), endsAt: g.endsAt }));
    if (g.mode === 'classic') resendClassic(g, conn, null);
  }
  if (g.state === 'ended') conn.send(JSON.stringify(endMsg(g, null)));
  conn.onmessage = msg => hostAction(g, msg);
  conn.onclose = () => g.hostConns.delete(conn);
}

export function attachPlayer(g, p, conn) {
  p.conns.add(conn);
  conn.send(JSON.stringify({ t: 'hello', role: 'player', you: pub(p), game: { ...gameInfo(g), goal: g.settings.goal, endsAt: g.endsAt } }));
  conn.send(JSON.stringify(lobbyMsg(g)));
  if (g.state === 'playing') {
    conn.send(JSON.stringify({ t: 'start', mode: g.mode, endsAt: g.endsAt, goal: g.settings.goal }));
    if (g.mode === 'classic') resendClassic(g, conn, p);
    else if (p.chests) conn.send(JSON.stringify({ t: 'chests', count: 3, score: Math.round(p.score) }));
    else if (p.pendingTarget) conn.send(JSON.stringify(targetMsg(g, p)));
    else if (p.current != null) conn.send(JSON.stringify(questionMsg(g, p.current, p)));
  }
  if (g.state === 'ended') conn.send(JSON.stringify(endMsg(g, p)));
  toHost(g, lobbyMsg(g));
  conn.onmessage = msg => playerAction(g, p, msg);
  conn.onclose = () => { p.conns.delete(conn); if (!p.conns.size) toHost(g, lobbyMsg(g)); };
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
      send(p.conns, { t: 'kicked' });
      for (const c of p.conns) c.close();
      g.players.delete(p.id);
      toAll(g, lobbyMsg(g));
      return;
    }
    case 'end': return endGame(g);
  }
}

function playerAction(g, p, m) {
  if (p.kicked || g.state !== 'playing') return;
  const now = Date.now();
  if (now - p.lastAnswer < 150) return; // ignore spam
  p.lastAnswer = now;
  if (g.mode === 'classic') { if (m.t === 'answer') classicAnswer(g, p, m.choice); return; }
  if (m.t === 'next') return selfPacedNext(g, p);
  if (m.t === 'answer') return selfPacedAnswer(g, p, m.choice);
  if (g.mode === 'goldrush' && m.t === 'chest') return pickChest(g, p, m.i);
  if (g.mode === 'goldrush' && m.t === 'target') return pickTarget(g, p, m.pid);
}

// ---- Shared -----------------------------------------------------------------------------------

function startGame(g) {
  if (g.state !== 'lobby') return;
  if (![...g.players.values()].some(p => !p.kicked)) {
    toHost(g, { t: 'error', msg: 'Wait for at least one player to join.' });
    return;
  }
  g.state = 'playing';
  g.startedAt = Date.now();
  if (g.mode === 'goldrush') {
    g.endsAt = g.startedAt + g.settings.timeLimitMin * 60_000;
    g.endTimer = setTimeout(() => endGame(g), g.endsAt - Date.now());
  }
  if (g.mode === 'race') {
    g.endsAt = g.startedAt + 30 * 60_000; // safety cap
    g.endTimer = setTimeout(() => endGame(g), g.endsAt - Date.now());
  }
  toAll(g, { t: 'start', mode: g.mode, endsAt: g.endsAt, goal: g.settings.goal });
  if (g.mode === 'classic') {
    g.classic.order = g.settings.shuffle ? shuffle(g.questions.map((_, i) => i)) : g.questions.map((_, i) => i);
    classicNext(g);
  }
  boardSoon(g);
}

function questionMsg(g, qi, p) {
  const q = g.questions[qi];
  return { t: 'question', qi, q: q.q, answers: q.answers, time: q.time, score: p ? Math.round(p.score) : undefined, progress: p?.correct, goal: g.settings.goal };
}

function endMsg(g, p) {
  const board = standings(g);
  const you = p ? { rank: board.findIndex(x => x.id === p.id) + 1, score: Math.round(p.score), correct: p.correct, answered: p.answered, reward: p.rewarded } : undefined;
  return { t: 'end', mode: g.mode, podium: board.slice(0, 3), standings: p ? board.slice(0, 10) : board, total: board.length, you };
}

export function endGame(g) {
  if (g.state === 'ended') return;
  clearTimeout(g.endTimer); clearTimeout(g.classic.timer); clearTimeout(g.boardTimer);
  g.state = 'ended';
  g.endedAt = Date.now();
  const board = standings(g);
  // Rewards for signed-in players (guests can play but don't earn tokens).
  board.forEach((row, i) => {
    const p = g.players.get(row.id);
    if (!p?.userId || g.startedAt == null) return;
    const u = store.get('users', p.userId);
    if (!u) return;
    const place = board.length >= 3 ? [100, 60, 40][i] || 0 : 0;
    let tokens = 25 + Math.min(p.correct * 3, 150) + place;
    const d = today();
    if (u.earned?.date !== d) u.earned = { date: d, amount: 0 };
    const cap = Number(store.get('meta', 'settings')?.dailyGameTokenCap) || 1500;
    tokens = Math.max(0, Math.min(tokens, cap - u.earned.amount));
    u.earned.amount += tokens;
    u.tokens += tokens;
    const xp = 10 + p.correct * 2;
    u.xp = (u.xp || 0) + xp;
    u.stats.gamesPlayed = (u.stats.gamesPlayed || 0) + 1;
    u.stats.correct = (u.stats.correct || 0) + p.correct;
    u.stats.answered = (u.stats.answered || 0) + p.answered;
    if (i === 0 && board.length > 1) u.stats.wins = (u.stats.wins || 0) + 1;
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
  for (const p of g.players.values()) send(p.conns, endMsg(g, p));
}

// ---- Classic: host-paced, everyone answers the same question ----------------------------------

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
  for (const p of g.players.values()) send(p.conns, { ...msg, score: Math.round(p.score) });
  clearTimeout(c.timer);
  c.timer = setTimeout(() => classicReveal(g), q.time * 1000 + 300);
}

function resendClassic(g, conn, p) {
  const c = g.classic;
  if (c.index < 0) return;
  const qi = c.order[c.index];
  const q = g.questions[qi];
  if (c.phase === 'question') {
    const msg = { ...questionMsg(g, qi), index: c.index, total: c.order.length, endsAt: c.qStart + q.time * 1000, score: p ? Math.round(p.score) : undefined };
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
  send(p.conns, { t: 'locked' });
  const active = [...g.players.values()].filter(x => !x.kicked && x.conns.size);
  const answered = active.filter(x => x.classicAnswer).length;
  toHost(g, { t: 'answered', count: [...g.players.values()].filter(x => x.classicAnswer).length, total: active.length });
  if (active.length && answered >= active.length) classicReveal(g);
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
  for (const p of g.players.values()) send(p.conns, revealMsg(g, p));
}

// ---- Self-paced modes (Gold Rush, Blook Race) --------------------------------------------------

function selfPacedNext(g, p) {
  if (p.chests || p.pendingTarget || p.finishedAt) return;
  if (p.current == null) {
    if (p.ptr >= p.order.length) {
      p.order = g.settings.shuffle ? shuffle(g.questions.map((_, i) => i)) : g.questions.map((_, i) => i);
      p.ptr = 0;
    }
    p.current = p.order[p.ptr++];
    p.qStart = Date.now();
  }
  send(p.conns, questionMsg(g, p.current, p));
}

function selfPacedAnswer(g, p, choice) {
  if (p.current == null || p.chests || p.pendingTarget) return;
  const q = g.questions[p.current];
  const i = Number(choice);
  if (!Number.isInteger(i) || i < 0 || i >= q.answers.length) return;
  const correct = q.correct.includes(i);
  p.current = null;
  p.answered++;
  const res = { t: 'result', correct, correctIdx: q.correct, choice: i };
  if (correct) p.correct++;
  if (g.mode === 'race') {
    if (correct) p.score = p.correct;
    res.progress = p.correct;
    res.goal = g.settings.goal;
    send(p.conns, res);
    boardSoon(g);
    if (p.correct >= g.settings.goal) {
      p.finishedAt = Date.now();
      endGame(g);
    }
    return;
  }
  // Gold Rush
  if (correct) {
    p.chests = rollChests(g, p);
    res.chests = 3;
  }
  res.score = Math.round(p.score);
  send(p.conns, res);
}

const GOLD = [10, 15, 20, 25, 30, 40, 50, 75, 100];
const OUTCOMES = [
  ['gold', 46], ['double', 6], ['triple', 2], ['bonus', 7], ['lose25', 8], ['lose50', 3],
  ['nothing', 7], ['steal', 13], ['swap', 3], ['jackpot', 1],
];
function rollOne(g, p) {
  const total = OUTCOMES.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  let kind = 'gold';
  for (const [k, w] of OUTCOMES) { if ((r -= w) < 0) { kind = k; break; } }
  const others = [...g.players.values()].filter(x => x !== p && !x.kicked);
  if ((kind === 'steal' || kind === 'swap') && !others.length) kind = 'gold';
  const amt = kind === 'gold' ? GOLD[Math.floor(Math.random() * GOLD.length)] : kind === 'jackpot' ? 500 : kind === 'steal' ? [10, 20, 25, 30, 50][Math.floor(Math.random() * 5)] : 0;
  return { kind, amt };
}
function rollChests(g, p) { return [rollOne(g, p), rollOne(g, p), rollOne(g, p)]; }

const outcomeLabel = o => ({
  gold: `+${o.amt} Gold`, double: 'Double Gold!', triple: 'Triple Gold!', bonus: '+25% Gold', lose25: 'Lose 25%', lose50: 'Lose 50%',
  nothing: 'Nothing!', steal: `Swipe ${o.amt}%`, swap: 'Swap!', jackpot: 'JACKPOT +500',
}[o.kind]);

function targetMsg(g, p) {
  const t = p.pendingTarget;
  return {
    t: 'target', action: t.kind, amt: t.amt,
    targets: [...g.players.values()].filter(x => x !== p && !x.kicked).map(x => ({ id: x.id, name: x.name, blook: x.blook, score: Math.round(x.score) })).sort((a, b) => b.score - a.score),
  };
}

function pickChest(g, p, idx) {
  if (!p.chests) return;
  const i = Number(idx);
  if (!Number.isInteger(i) || i < 0 || i > 2) return;
  const chosen = p.chests[i];
  const all = p.chests.map(outcomeLabel);
  p.chests = null;
  const before = p.score;
  switch (chosen.kind) {
    case 'gold': p.score += chosen.amt; break;
    case 'double': p.score = Math.max(p.score * 2, p.score + 25); break;
    case 'triple': p.score = Math.max(p.score * 3, p.score + 50); break;
    case 'bonus': p.score = Math.max(Math.round(p.score * 1.25), p.score + 15); break;
    case 'lose25': p.score = Math.round(p.score * 0.75); break;
    case 'lose50': p.score = Math.round(p.score * 0.5); break;
    case 'jackpot': p.score += chosen.amt; break;
    case 'steal': case 'swap':
      p.pendingTarget = chosen;
      send(p.conns, { t: 'opened', picked: i, all, label: outcomeLabel(chosen), kind: chosen.kind });
      send(p.conns, targetMsg(g, p));
      return;
  }
  send(p.conns, { t: 'opened', picked: i, all, label: outcomeLabel(chosen), kind: chosen.kind, delta: Math.round(p.score - before), score: Math.round(p.score) });
  boardSoon(g);
}

function pickTarget(g, p, pid) {
  const t = p.pendingTarget;
  if (!t) return;
  const other = g.players.get(pid);
  if (!other || other === p || other.kicked) return;
  p.pendingTarget = null;
  let text;
  if (t.kind === 'steal') {
    const taken = Math.round(other.score * t.amt / 100);
    other.score -= taken; p.score += taken;
    text = `You swiped ${taken} gold from ${other.name}!`;
    send(other.conns, { t: 'hit', text: `${p.name} swiped ${taken} of your gold!`, score: Math.round(other.score) });
  } else {
    [p.score, other.score] = [other.score, p.score];
    text = `You swapped gold with ${other.name}!`;
    send(other.conns, { t: 'hit', text: `${p.name} swapped gold with you!`, score: Math.round(other.score) });
  }
  send(p.conns, { t: 'targetDone', text, score: Math.round(p.score) });
  boardSoon(g);
}

// ---- Housekeeping ---------------------------------------------------------------------------------
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
