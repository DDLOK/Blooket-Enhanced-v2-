// Blooket Enhanced v2 — HTTP API and WebSocket routing.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Exports:
//   handle(request)                  -> Response   (every /api/* HTTP request)
//   openSocket(conn, url, cookies)   -> void       (every /api/ws WebSocket)
// The same code runs on Netlify Server and in the local dev server (dev-server.mjs).

import { store, storeInfo, initStore } from './store.mjs';
import {
  HttpError, fail, json, readJson, parseCookies, newId, hashPassword, verifyPassword,
  cleanText, makeFilter, rateLimit, today, levelFromXp,
} from './util.mjs';
import { games, createGame, gameInfo, joinGame, attachHost, attachPlayer } from './games.mjs';
import { BLOOKS, PACKS, PACK_BY_ID, STARTERS, RARITIES, GAME_MODES, BANNERS, TITLES } from '../public/js/data.js';
import { ART_OPTIONS } from '../public/js/blookart.js';

const COOKIE = 'be_sid';
const SESSION_DAYS = 30;

// ---- Settings -------------------------------------------------------------------------------
const DEFAULT_SETTINGS = {
  siteName: 'Blooket Enhanced',
  announcement: '',
  signupsOpen: true,
  signupCode: '',
  chatEnabled: true,
  dailyReward: 500,
  startingTokens: 1000,
  dailyGameTokenCap: 1500,
  dailySoloTokenCap: 300,
  hostRole: 'anyone', // 'anyone' | 'teacher'
  bannedWords: [],
};
function settings() {
  return { ...DEFAULT_SETTINGS, ...(store.get('meta', 'settings') || {}) };
}
let filterCache = { key: null, f: null };
function filter() {
  const words = settings().bannedWords || [];
  const key = words.join('|');
  if (filterCache.key !== key) filterCache = { key, f: makeFilter(words) };
  return filterCache.f;
}

// ---- Users -----------------------------------------------------------------------------------
const isStaff = u => u && (u.role === 'admin' || u.role === 'mod');
const canTeach = u => u && (u.role === 'admin' || u.role === 'teacher');

function resolveBlook(u, ref) {
  if (typeof ref === 'string' && ref.startsWith('custom:')) {
    const c = (u.customs || []).find(x => x.id === ref.slice(7));
    return c ? { name: c.name, art: c.art, custom: true } : 'blip';
  }
  return BLOOKS[ref] ? ref : 'blip';
}

function publicUser(u) {
  return {
    id: u.id, username: u.username, role: u.role, avatar: resolveBlook(u, u.avatar),
    banner: u.banner || 'grape', title: u.title || 'Newbie',
    level: levelFromXp(u.xp), xp: u.xp || 0, created: u.created, stats: u.stats || {},
    blooks: u.blooks || {}, customs: (u.customs || []).map(c => ({ id: c.id, name: c.name, art: c.art })),
  };
}
function meView(u) {
  return {
    ...publicUser(u), avatarRef: u.avatar, tokens: u.tokens, favorites: u.favorites || [],
    canClaimDaily: u.lastDaily !== today(), muted: !!u.muted,
  };
}

function sessionUser(cookies) {
  const sid = cookies[COOKIE];
  if (!sid) return null;
  const s = store.get('sessions', sid);
  if (!s) return null;
  if (s.expires < Date.now()) { store.del('sessions', sid); return null; }
  const u = store.get('users', s.userId);
  if (!u || u.banned) return null;
  return u;
}

function sessionCookie(req, sid, maxAge) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function startSession(req, u) {
  const sid = newId(24);
  store.put('sessions', sid, { id: sid, userId: u.id, created: Date.now(), expires: Date.now() + SESSION_DAYS * 864e5 });
  return sessionCookie(req, sid, SESSION_DAYS * 86400);
}

const validUsername = n => /^[A-Za-z0-9_]{3,16}$/.test(n);

// ---- Validation ---------------------------------------------------------------------------------
function validateSet(body) {
  const title = cleanText(body.title, 80);
  if (!title) fail(400, 'Give your set a title');
  const description = cleanText(body.description, 300);
  if (!Array.isArray(body.questions) || !body.questions.length) fail(400, 'Add at least one question');
  if (body.questions.length > 150) fail(400, 'Sets can have up to 150 questions');
  const questions = body.questions.map((q, n) => {
    const text = cleanText(q?.q, 300);
    if (!text) fail(400, `Question ${n + 1} is empty`);
    const answers = (Array.isArray(q.answers) ? q.answers : []).map(a => cleanText(a, 120)).filter(Boolean).slice(0, 4);
    if (answers.length < 2) fail(400, `Question ${n + 1} needs at least 2 answers`);
    const correct = [...new Set((Array.isArray(q.correct) ? q.correct : [q.correct]).map(Number))].filter(i => Number.isInteger(i) && i >= 0 && i < answers.length);
    if (!correct.length) fail(400, `Pick the correct answer for question ${n + 1}`);
    const time = Math.min(120, Math.max(5, Math.round(Number(q.time) || 20)));
    return { q: text, answers, correct, time };
  });
  const f = filter();
  if (f.isBad(title) || f.isBad(description)) fail(400, 'Please keep titles and descriptions school-friendly');
  return { title, description, questions, public: body.public !== false, color: /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : '#0bc2cf' };
}

function validateArt(a) {
  if (!a || typeof a !== 'object') fail(400, 'Invalid blook');
  const s = ART_OPTIONS.shapes.includes(a.s) ? a.s : fail(400, 'Pick a body shape');
  const c = /^#[0-9a-f]{6}$/i.test(a.c) ? a.c : fail(400, 'Pick a color');
  const e = ART_OPTIONS.eyes.includes(a.e) ? a.e : fail(400, 'Pick eyes');
  const m = ART_OPTIONS.mouths.includes(a.m) ? a.m : fail(400, 'Pick a mouth');
  const x = [...new Set(Array.isArray(a.x) ? a.x : [])].filter(v => ART_OPTIONS.extras.includes(v)).slice(0, 5);
  return { s, c, e, m, x, k: a.k ? 1 : 0 };
}

const setSummary = (s, u) => ({
  id: s.id, title: s.title, description: s.description, color: s.color, questionCount: s.questions.length,
  ownerName: store.get('users', s.ownerId)?.username || 'unknown', ownerId: s.ownerId, public: s.public,
  plays: s.plays || 0, created: s.created, updated: s.updated, favorite: !!u?.favorites?.includes(s.id),
});

function rollPack(pack) {
  const total = pack.blooks.reduce((s, b) => s + b.chance, 0);
  let r = Math.random() * total;
  for (const b of pack.blooks) if ((r -= b.chance) < 0) return b;
  return pack.blooks[0];
}

// ---- Solo / homework sessions (graded on the server) -------------------------------------
const soloSessions = new Map();
setInterval(() => {
  const cut = Date.now() - 3 * 3600_000;
  for (const [k, s] of soloSessions) if (s.started < cut) soloSessions.delete(k);
}, 600_000).unref?.();

// ---- Chat ------------------------------------------------------------------------------------------
const chatConns = new Set();
function chatLog() {
  return store.get('meta', 'chat')?.messages || [];
}
function broadcastChat(msg) {
  const s = JSON.stringify(msg);
  for (const c of chatConns) c.send(s);
}

// ---- Router -----------------------------------------------------------------------------------------
const routes = [];
const route = (method, pattern, fn, opts = {}) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ method, re, keys, fn, ...opts });
};

function need(u) { if (!u) fail(401, 'Please log in first'); return u; }
function needStaff(u) { need(u); if (!isStaff(u)) fail(403, 'Admins only'); return u; }
function needAdmin(u) { need(u); if (u.role !== 'admin') fail(403, 'Admins only'); return u; }

// Health & settings
route('GET', '/api/health', () => json({ ok: true, storage: storeInfo.kind, warning: storeInfo.warning, games: games.size }));
route('GET', '/api/settings', () => {
  const s = settings();
  return json({ siteName: s.siteName, announcement: s.announcement, signupsOpen: s.signupsOpen, needsCode: !!s.signupCode, chatEnabled: s.chatEnabled, dailyReward: s.dailyReward, hostRole: s.hostRole, warning: storeInfo.warning });
});

// Auth
route('POST', '/api/auth/register', async ({ req, body, ip }) => {
  if (!rateLimit(`reg:${ip}`, 5, 600_000)) fail(429, 'Too many sign-ups, try again later');
  const s = settings();
  const username = cleanText(body.username, 16);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!validUsername(username)) fail(400, 'Usernames are 3-16 letters, numbers or _');
  if (filter().isBad(username)) fail(400, 'Pick a different username');
  if (password.length < 6 || password.length > 100) fail(400, 'Passwords need at least 6 characters');
  const first = store.count('users') === 0;
  if (!first) {
    if (!s.signupsOpen) fail(403, 'Sign-ups are closed right now');
    if (s.signupCode && body.code !== s.signupCode) fail(403, 'Wrong school code');
  }
  if (store.find('users', u => u.usernameLower === username.toLowerCase())) fail(409, 'That username is taken');
  const id = newId(9);
  const u = {
    id, username, usernameLower: username.toLowerCase(), pass: await hashPassword(password),
    role: first ? 'admin' : 'student', tokens: Number(s.startingTokens) || 1000, xp: 0,
    blooks: Object.fromEntries(STARTERS.map(b => [b.id, 1])), avatar: 'blip', banner: 'grape', title: 'Newbie',
    customs: [], favorites: [], stats: { packsOpened: 0, gamesPlayed: 0, wins: 0, correct: 0, answered: 0 },
    created: Date.now(), lastDaily: null, banned: false, muted: false,
  };
  store.put('users', id, u);
  return json({ user: meView(u) }, 201, { 'set-cookie': startSession(req, u) });
});

route('POST', '/api/auth/login', async ({ req, body, ip }) => {
  if (!rateLimit(`login:${ip}`, 15, 300_000)) fail(429, 'Too many attempts, wait a few minutes');
  const name = cleanText(body.username, 16).toLowerCase();
  const u = store.find('users', x => x.usernameLower === name);
  if (!u || !(await verifyPassword(String(body.password || ''), u.pass))) fail(401, 'Wrong username or password');
  if (u.banned) fail(403, 'This account is banned');
  return json({ user: meView(u) }, 200, { 'set-cookie': startSession(req, u) });
});

route('POST', '/api/auth/logout', ({ req, cookies }) => {
  if (cookies[COOKIE]) store.del('sessions', cookies[COOKIE]);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(req, '', 0) });
});

// Me
route('GET', '/api/me', ({ user }) => json({ user: user ? meView(user) : null }));

route('POST', '/api/me/profile', ({ user, body }) => {
  need(user);
  if (body.avatar !== undefined) {
    const ref = String(body.avatar);
    if (ref.startsWith('custom:')) { if (!(user.customs || []).some(c => c.id === ref.slice(7))) fail(400, 'Unknown custom blook'); }
    else if (!user.blooks[ref]) fail(400, "You don't own that blook");
    user.avatar = ref;
  }
  if (body.banner !== undefined) { if (!BANNERS.some(b => b.id === body.banner)) fail(400, 'Unknown banner'); user.banner = body.banner; }
  if (body.title !== undefined) { if (!TITLES.includes(body.title)) fail(400, 'Unknown title'); user.title = body.title; }
  store.save('users', user.id);
  return json({ user: meView(user) });
});

route('POST', '/api/me/password', async ({ user, body }) => {
  need(user);
  if (!(await verifyPassword(String(body.old || ''), user.pass))) fail(400, 'Current password is wrong');
  if (typeof body.new !== 'string' || body.new.length < 6) fail(400, 'New password needs at least 6 characters');
  user.pass = await hashPassword(body.new);
  store.save('users', user.id);
  return json({ ok: true });
});

route('POST', '/api/me/daily', ({ user }) => {
  need(user);
  if (user.lastDaily === today()) fail(409, 'Already claimed today — come back tomorrow!');
  const amt = Number(settings().dailyReward) || 500;
  user.lastDaily = today();
  user.tokens += amt;
  store.save('users', user.id);
  return json({ amount: amt, user: meView(user) });
});

route('POST', '/api/me/customs', ({ user, body }) => {
  need(user);
  user.customs ||= [];
  if (user.customs.length >= 12) fail(400, 'You can have up to 12 custom blooks');
  const name = cleanText(body.name, 20);
  if (!name) fail(400, 'Name your blook');
  if (filter().isBad(name)) fail(400, 'Pick a different name');
  const c = { id: newId(6), name, art: validateArt(body.art), created: Date.now() };
  user.customs.push(c);
  store.save('users', user.id);
  return json({ custom: c, user: meView(user) }, 201);
});

route('PUT', '/api/me/customs/:id', ({ user, body, params }) => {
  need(user);
  const c = (user.customs || []).find(x => x.id === params.id) || fail(404, 'Not found');
  if (body.name !== undefined) {
    const name = cleanText(body.name, 20);
    if (!name || filter().isBad(name)) fail(400, 'Pick a different name');
    c.name = name;
  }
  if (body.art) c.art = validateArt(body.art);
  store.save('users', user.id);
  return json({ user: meView(user) });
});

route('DELETE', '/api/me/customs/:id', ({ user, params }) => {
  need(user);
  user.customs = (user.customs || []).filter(x => x.id !== params.id);
  if (user.avatar === `custom:${params.id}`) user.avatar = 'blip';
  store.save('users', user.id);
  return json({ user: meView(user) });
});

// Packs & blooks
route('POST', '/api/packs/open', ({ user, body, ip }) => {
  need(user);
  if (!rateLimit(`pack:${user.id}`, 40, 10_000)) fail(429, 'Slow down a little!');
  const pack = PACK_BY_ID[body.pack] || fail(404, 'Unknown pack');
  if (user.tokens < pack.price) fail(402, 'Not enough tokens');
  user.tokens -= pack.price;
  const b = rollPack(pack);
  const isNew = !user.blooks[b.id];
  user.blooks[b.id] = (user.blooks[b.id] || 0) + 1;
  user.stats.packsOpened = (user.stats.packsOpened || 0) + 1;
  user.xp = (user.xp || 0) + 1;
  store.save('users', user.id);
  return json({ blook: b.id, rarity: b.rarity, isNew, tokens: user.tokens, user: meView(user) });
});

route('POST', '/api/blooks/sell', ({ user, body }) => {
  need(user);
  const b = BLOOKS[body.blook] || fail(404, 'Unknown blook');
  const count = Math.floor(Number(body.count) || 1);
  const have = user.blooks[b.id] || 0;
  if (count < 1 || count > have) fail(400, "You don't have that many");
  if (b.rarity === 'Starter') fail(400, "Starter blooks can't be sold");
  const listed = store.filter('bazaar', l => l.sellerId === user.id && l.blook === b.id).length;
  if (have - count < listed) fail(400, 'Some of these are listed on the Bazaar — remove the listing first');
  const value = RARITIES[b.rarity].sell * count;
  user.blooks[b.id] = have - count;
  if (!user.blooks[b.id]) delete user.blooks[b.id];
  if (user.avatar === b.id && !user.blooks[b.id]) user.avatar = 'blip';
  user.tokens += value;
  store.save('users', user.id);
  return json({ earned: value, user: meView(user) });
});

// Bazaar (player market)
const listingView = l => ({ ...l, sellerName: store.get('users', l.sellerId)?.username || '?' });
route('GET', '/api/bazaar', () => json({ listings: store.all('bazaar').sort((a, b) => b.created - a.created).slice(0, 300).map(listingView) }));
route('POST', '/api/bazaar', ({ user, body }) => {
  need(user);
  const b = BLOOKS[body.blook] || fail(404, 'Unknown blook');
  if (b.rarity === 'Starter') fail(400, "Starter blooks can't be listed");
  const price = Math.floor(Number(body.price));
  if (!(price >= 1 && price <= 1_000_000)) fail(400, 'Price must be between 1 and 1,000,000');
  const listed = store.filter('bazaar', l => l.sellerId === user.id && l.blook === b.id).length;
  if ((user.blooks[b.id] || 0) <= listed) fail(400, "You don't have a spare one to list");
  if (store.filter('bazaar', l => l.sellerId === user.id).length >= 20) fail(400, 'You can have up to 20 listings');
  const id = newId(8);
  store.put('bazaar', id, { id, sellerId: user.id, blook: b.id, price, created: Date.now() });
  return json({ ok: true }, 201);
});
route('POST', '/api/bazaar/:id/buy', ({ user, params }) => {
  need(user);
  const l = store.get('bazaar', params.id) || fail(404, 'That listing is gone');
  if (l.sellerId === user.id) fail(400, "That's your own listing");
  if (user.tokens < l.price) fail(402, 'Not enough tokens');
  const seller = store.get('users', l.sellerId);
  if (!seller || !(seller.blooks[l.blook] > 0)) { store.del('bazaar', l.id); fail(410, 'That listing is no longer available'); }
  store.del('bazaar', l.id);
  seller.blooks[l.blook]--;
  if (!seller.blooks[l.blook]) { delete seller.blooks[l.blook]; if (seller.avatar === l.blook) seller.avatar = 'blip'; }
  seller.tokens += l.price;
  user.tokens -= l.price;
  user.blooks[l.blook] = (user.blooks[l.blook] || 0) + 1;
  store.save('users', seller.id);
  store.save('users', user.id);
  return json({ user: meView(user) });
});
route('DELETE', '/api/bazaar/:id', ({ user, params }) => {
  need(user);
  const l = store.get('bazaar', params.id) || fail(404, 'Not found');
  if (l.sellerId !== user.id && !isStaff(user)) fail(403, 'Not your listing');
  store.del('bazaar', l.id);
  return json({ ok: true });
});

// Leaderboard & profiles
route('GET', '/api/leaderboard', () => {
  const users = store.filter('users', u => !u.banned);
  const row = u => ({ username: u.username, avatar: resolveBlook(u, u.avatar), level: levelFromXp(u.xp), tokens: u.tokens, xp: u.xp || 0, unique: Object.keys(u.blooks || {}).length, wins: u.stats?.wins || 0, title: u.title || 'Newbie' });
  const top = key => [...users].sort((a, b) => (key(b) - key(a))).slice(0, 50).map(row);
  return json({ tokens: top(u => u.tokens), xp: top(u => u.xp || 0), blooks: top(u => Object.keys(u.blooks || {}).length), wins: top(u => u.stats?.wins || 0) });
});
route('GET', '/api/users/:name', ({ params }) => {
  const u = store.find('users', x => x.usernameLower === params.name.toLowerCase());
  if (!u || u.banned) fail(404, 'User not found');
  return json({ user: publicUser(u) });
});

// Question sets
route('GET', '/api/sets', ({ user, url }) => {
  const scope = url.searchParams.get('scope') || 'discover';
  const q = (url.searchParams.get('q') || '').toLowerCase().slice(0, 60);
  let list;
  if (scope === 'mine') { need(user); list = store.filter('sets', s => s.ownerId === user.id); }
  else if (scope === 'favorites') { need(user); list = (user.favorites || []).map(id => store.get('sets', id)).filter(s => s && (s.public || s.ownerId === user.id)); }
  else list = store.filter('sets', s => s.public);
  if (q) list = list.filter(s => s.title.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q));
  list.sort((a, b) => scope === 'discover' ? (b.plays || 0) - (a.plays || 0) || b.updated - a.updated : b.updated - a.updated);
  return json({ sets: list.slice(0, 200).map(s => setSummary(s, user)) });
});
route('GET', '/api/sets/:id', ({ user, params }) => {
  const s = store.get('sets', params.id) || fail(404, 'Set not found');
  const mine = user && (s.ownerId === user.id || isStaff(user));
  if (!s.public && !mine) fail(404, 'Set not found');
  // Answers are only sent to the owner (for editing); players get questions through games/solo.
  return json({ set: { ...setSummary(s, user), questions: mine ? s.questions : undefined, mine: !!mine } });
});
route('POST', '/api/sets', ({ user, body }) => {
  need(user);
  if (store.filter('sets', s => s.ownerId === user.id).length >= 200) fail(400, 'You have too many sets');
  const id = newId(8);
  const s = { id, ownerId: user.id, ...validateSet(body), plays: 0, created: Date.now(), updated: Date.now() };
  store.put('sets', id, s);
  return json({ set: setSummary(s, user) }, 201);
});
route('PUT', '/api/sets/:id', ({ user, body, params }) => {
  need(user);
  const s = store.get('sets', params.id) || fail(404, 'Set not found');
  if (s.ownerId !== user.id && !isStaff(user)) fail(403, 'Not your set');
  Object.assign(s, validateSet(body), { updated: Date.now() });
  store.save('sets', s.id);
  return json({ set: setSummary(s, user) });
});
route('DELETE', '/api/sets/:id', ({ user, params }) => {
  need(user);
  const s = store.get('sets', params.id) || fail(404, 'Set not found');
  if (s.ownerId !== user.id && !isStaff(user)) fail(403, 'Not your set');
  store.del('sets', s.id);
  return json({ ok: true });
});
route('POST', '/api/sets/:id/favorite', ({ user, params }) => {
  need(user);
  if (!store.get('sets', params.id)) fail(404, 'Set not found');
  user.favorites ||= [];
  const i = user.favorites.indexOf(params.id);
  if (i >= 0) user.favorites.splice(i, 1); else user.favorites.unshift(params.id);
  store.save('users', user.id);
  return json({ favorite: i < 0 });
});

// Solo practice & homework (server-graded)
route('POST', '/api/solo/start', ({ user, body }) => {
  need(user);
  let set, hw = null;
  if (body.homeworkId) {
    hw = store.get('homework', body.homeworkId) || fail(404, 'Homework not found');
    if (hw.dueAt && Date.now() > hw.dueAt) fail(410, 'This homework is past its due date');
    set = store.get('sets', hw.setId) || fail(404, 'The set for this homework was deleted');
  } else {
    set = store.get('sets', body.setId) || fail(404, 'Set not found');
    if (!set.public && set.ownerId !== user.id) fail(404, 'Set not found');
  }
  const id = newId(10);
  const order = set.questions.map((_, i) => i).sort(() => Math.random() - 0.5);
  soloSessions.set(id, { id, userId: user.id, setId: set.id, homeworkId: hw?.id || null, order, answers: {}, started: Date.now(), finished: false });
  return json({
    session: id, title: hw?.title || set.title, homework: !!hw,
    questions: order.map(i => ({ qi: i, q: set.questions[i].q, answers: set.questions[i].answers, time: set.questions[i].time })),
  });
});
route('POST', '/api/solo/:sid/answer', ({ user, body, params }) => {
  need(user);
  const s = soloSessions.get(params.sid);
  if (!s || s.userId !== user.id || s.finished) fail(404, 'Session expired — start again');
  const set = store.get('sets', s.setId) || fail(404, 'Set not found');
  const qi = Number(body.qi);
  const q = set.questions[qi] || fail(400, 'Bad question');
  if (s.answers[qi] !== undefined) fail(409, 'Already answered');
  const choice = Number(body.choice);
  const correct = q.correct.includes(choice);
  s.answers[qi] = correct;
  return json({ correct, correctIdx: q.correct });
});
route('POST', '/api/solo/:sid/finish', ({ user, params }) => {
  need(user);
  const s = soloSessions.get(params.sid);
  if (!s || s.userId !== user.id || s.finished) fail(404, 'Session expired');
  s.finished = true;
  soloSessions.delete(s.id);
  const correct = Object.values(s.answers).filter(Boolean).length;
  const total = s.order.length;
  const answered = Object.keys(s.answers).length;
  const d = today();
  if (user.soloEarned?.date !== d) user.soloEarned = { date: d, amount: 0 };
  const tokens = Math.max(0, Math.min(correct * 3, (Number(settings().dailySoloTokenCap) || 300) - user.soloEarned.amount));
  user.soloEarned.amount += tokens;
  user.tokens += tokens;
  user.xp = (user.xp || 0) + correct;
  user.stats.correct = (user.stats.correct || 0) + correct;
  user.stats.answered = (user.stats.answered || 0) + answered;
  store.save('users', user.id);
  if (s.homeworkId) {
    const hw = store.get('homework', s.homeworkId);
    if (hw) {
      hw.results ||= {};
      const prev = hw.results[user.id];
      const pct = total ? Math.round(correct / total * 100) : 0;
      if (!prev || pct > prev.pct) hw.results[user.id] = { username: user.username, correct, total, pct, at: Date.now(), attempts: (prev?.attempts || 0) + 1 };
      else prev.attempts = (prev.attempts || 1) + 1;
      store.save('homework', hw.id);
    }
  }
  return json({ correct, total, tokens, user: meView(user) });
});

route('GET', '/api/homework', ({ user }) => {
  need(user);
  const list = store.filter('homework', h => h.ownerId === user.id).sort((a, b) => b.created - a.created)
    .map(h => ({ id: h.id, title: h.title, setId: h.setId, dueAt: h.dueAt, created: h.created, submissions: Object.keys(h.results || {}).length }));
  return json({ homework: list });
});
route('POST', '/api/homework', ({ user, body }) => {
  need(user);
  if (settings().hostRole === 'teacher' && !canTeach(user)) fail(403, 'Only teachers can assign homework');
  const set = store.get('sets', body.setId) || fail(404, 'Set not found');
  if (!set.public && set.ownerId !== user.id) fail(404, 'Set not found');
  const id = newId(7);
  const dueAt = body.dueAt ? Number(new Date(body.dueAt)) : null;
  if (dueAt !== null && !(dueAt > Date.now())) fail(400, 'Pick a due date in the future');
  const h = { id, ownerId: user.id, setId: set.id, title: cleanText(body.title, 80) || set.title, dueAt, created: Date.now(), results: {} };
  store.put('homework', id, h);
  return json({ homework: { id } }, 201);
});
route('GET', '/api/homework/:id', ({ user, params }) => {
  const h = store.get('homework', params.id) || fail(404, 'Homework not found');
  const set = store.get('sets', h.setId);
  const owner = user && (h.ownerId === user.id || isStaff(user));
  return json({
    homework: {
      id: h.id, title: h.title, dueAt: h.dueAt, created: h.created, setTitle: set?.title, questionCount: set?.questions.length || 0,
      ownerName: store.get('users', h.ownerId)?.username, mine: !!owner,
      yourResult: user ? h.results?.[user.id] || null : null,
      results: owner ? Object.values(h.results || {}).sort((a, b) => b.pct - a.pct) : undefined,
    },
  });
});
route('DELETE', '/api/homework/:id', ({ user, params }) => {
  need(user);
  const h = store.get('homework', params.id) || fail(404, 'Not found');
  if (h.ownerId !== user.id && !isStaff(user)) fail(403, 'Not yours');
  store.del('homework', h.id);
  return json({ ok: true });
});

// Live games
route('POST', '/api/games', ({ user, body }) => {
  need(user);
  if (settings().hostRole === 'teacher' && !canTeach(user)) fail(403, 'Only teachers can host games');
  if (!rateLimit(`host:${user.id}`, 10, 60_000)) fail(429, 'Slow down a little!');
  const set = store.get('sets', body.setId) || fail(404, 'Set not found');
  if (!set.public && set.ownerId !== user.id) fail(404, 'Set not found');
  if (!GAME_MODES[body.mode]) fail(400, 'Pick a game mode');
  const g = createGame({ host: user, set, mode: body.mode, settings: body.settings || {} });
  return json({ code: g.code }, 201);
});
route('GET', '/api/games/:code', ({ params }) => {
  const g = games.get(params.code) || fail(404, "We couldn't find a game with that ID");
  return json({ game: gameInfo(g) });
});
route('POST', '/api/games/:code/join', ({ user, body, params, ip }) => {
  if (!rateLimit(`join:${ip}`, 30, 60_000)) fail(429, 'Too many tries, wait a minute');
  const g = games.get(params.code) || fail(404, "We couldn't find a game with that ID");
  const name = cleanText(body.name, 15);
  if (name.length < 1) fail(400, 'Enter a nickname');
  if (filter().isBad(name)) fail(400, 'Pick a different nickname');
  let blook = 'blip';
  const ref = String(body.blook || 'blip');
  if (user) {
    if (ref.startsWith('custom:') || user.blooks[ref]) blook = resolveBlook(user, ref);
  } else if (STARTERS.some(s => s.id === ref)) blook = ref;
  try {
    const p = joinGame(g, { name, blook, userId: user?.id });
    return json({ pid: p.id, token: p.token, game: gameInfo(g) });
  } catch (e) { fail(e.status || 400, e.message); }
});

route('GET', '/api/history', ({ user }) => {
  need(user);
  const list = store.filter('history', h => h.hostId === user.id).sort((a, b) => b.date - a.date).slice(0, 100)
    .map(h => ({ id: h.id, title: h.title, mode: h.mode, date: h.date, players: h.players.length, winner: h.players[0]?.name }));
  return json({ history: list });
});
route('GET', '/api/history/:id', ({ user, params }) => {
  need(user);
  const h = store.get('history', params.id) || fail(404, 'Not found');
  if (h.hostId !== user.id && !isStaff(user)) fail(403, 'Not yours');
  return json({ history: h });
});

// Chat
route('GET', '/api/chat', ({ user }) => {
  need(user);
  return json({ enabled: settings().chatEnabled, messages: chatLog() });
});
route('POST', '/api/chat', ({ user, body }) => {
  need(user);
  const s = settings();
  if (!s.chatEnabled && !isStaff(user)) fail(403, 'Chat is turned off right now');
  if (user.muted) fail(403, 'You are muted');
  if (!rateLimit(`chat:${user.id}`, 5, 8_000)) fail(429, "You're sending messages too fast");
  const text = cleanText(body.text, 300);
  if (!text) fail(400, 'Type a message');
  const msg = { id: newId(8), userId: user.id, username: user.username, role: user.role, avatar: resolveBlook(user, user.avatar), text: filter().clean(text), ts: Date.now() };
  const log = chatLog().concat(msg).slice(-100);
  store.put('meta', 'chat', { messages: log });
  broadcastChat({ t: 'msg', msg });
  return json({ ok: true });
});
route('DELETE', '/api/chat/:id', ({ user, params }) => {
  needStaff(user);
  store.put('meta', 'chat', { messages: chatLog().filter(m => m.id !== params.id) });
  broadcastChat({ t: 'delete', id: params.id });
  return json({ ok: true });
});

// News
route('GET', '/api/news', () => json({ news: store.all('news').sort((a, b) => b.date - a.date).slice(0, 30) }));
route('POST', '/api/news', ({ user, body }) => {
  needStaff(user);
  const title = cleanText(body.title, 100), text = cleanText(body.text, 2000);
  if (!title || !text) fail(400, 'Add a title and text');
  const id = newId(8);
  store.put('news', id, { id, title, text, author: user.username, date: Date.now() });
  return json({ ok: true }, 201);
});
route('DELETE', '/api/news/:id', ({ user, params }) => { needStaff(user); store.del('news', params.id); return json({ ok: true }); });

// Admin
const adminUser = u => ({ id: u.id, username: u.username, role: u.role, tokens: u.tokens, level: levelFromXp(u.xp), banned: !!u.banned, muted: !!u.muted, created: u.created, unique: Object.keys(u.blooks || {}).length });
route('GET', '/api/admin/users', ({ user, url }) => {
  needStaff(user);
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const list = store.filter('users', u => !q || u.usernameLower.includes(q)).sort((a, b) => b.created - a.created).slice(0, 200).map(adminUser);
  return json({ users: list, total: store.count('users') });
});
route('POST', '/api/admin/users/:id', async ({ user, body, params }) => {
  needStaff(user);
  const u = store.get('users', params.id) || fail(404, 'User not found');
  const adminOnly = () => { if (user.role !== 'admin') fail(403, 'Admins only'); };
  if (u.role === 'admin' && user.role !== 'admin') fail(403, "Mods can't change admins");
  if (body.role !== undefined) {
    adminOnly();
    if (!['student', 'teacher', 'mod', 'admin'].includes(body.role)) fail(400, 'Unknown role');
    if (u.id === user.id && body.role !== 'admin') fail(400, "You can't remove your own admin role");
    u.role = body.role;
  }
  if (body.banned !== undefined) {
    if (u.id === user.id) fail(400, "You can't ban yourself");
    u.banned = !!body.banned;
    if (u.banned) for (const s of store.filter('sessions', s => s.userId === u.id)) store.del('sessions', s.id);
  }
  if (body.muted !== undefined) u.muted = !!body.muted;
  if (body.tokens !== undefined) { adminOnly(); const t = Math.floor(Number(body.tokens)); if (!(t >= 0 && t <= 1e9)) fail(400, 'Bad token amount'); u.tokens = t; }
  if (body.giveBlook) { adminOnly(); if (!BLOOKS[body.giveBlook]) fail(400, 'Unknown blook'); u.blooks[body.giveBlook] = (u.blooks[body.giveBlook] || 0) + 1; }
  if (body.unlockAll) { adminOnly(); for (const id of Object.keys(BLOOKS)) u.blooks[id] = Math.max(1, u.blooks[id] || 0); }
  let tempPassword;
  if (body.resetPassword) {
    tempPassword = newId(6);
    u.pass = await hashPassword(tempPassword);
    for (const s of store.filter('sessions', s => s.userId === u.id)) store.del('sessions', s.id);
  }
  store.save('users', u.id);
  return json({ user: adminUser(u), tempPassword });
});
route('GET', '/api/admin/settings', ({ user }) => { needAdmin(user); return json({ settings: settings(), storage: storeInfo }); });
route('POST', '/api/admin/settings', ({ user, body }) => {
  needAdmin(user);
  const s = settings();
  const next = { ...s };
  if (body.siteName !== undefined) next.siteName = cleanText(body.siteName, 40) || s.siteName;
  if (body.announcement !== undefined) next.announcement = cleanText(body.announcement, 300);
  if (body.signupsOpen !== undefined) next.signupsOpen = !!body.signupsOpen;
  if (body.signupCode !== undefined) next.signupCode = cleanText(body.signupCode, 40);
  if (body.chatEnabled !== undefined) next.chatEnabled = !!body.chatEnabled;
  for (const k of ['dailyReward', 'startingTokens', 'dailyGameTokenCap', 'dailySoloTokenCap']) {
    if (body[k] !== undefined) { const n = Math.floor(Number(body[k])); if (n >= 0 && n <= 1e7) next[k] = n; }
  }
  if (body.hostRole !== undefined) next.hostRole = body.hostRole === 'teacher' ? 'teacher' : 'anyone';
  if (body.bannedWords !== undefined) next.bannedWords = String(body.bannedWords).split(/[\s,]+/).map(w => cleanText(w, 40)).filter(Boolean).slice(0, 500);
  store.put('meta', 'settings', next);
  return json({ settings: next });
});

// ---- Entry points ---------------------------------------------------------------------------------
export async function handle(req, context) {
  await initStore();
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const cookies = parseCookies(req.headers.get('cookie'));
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  try {
    const path = url.pathname;
    let matchedPath = false;
    for (const r of routes) {
      const m = path.match(r.re);
      if (!m) continue;
      matchedPath = true;
      if (r.method !== method) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const body = method === 'GET' || method === 'DELETE' ? {} : await readJson(req);
      const user = sessionUser(cookies);
      return await r.fn({ req, url, params, body, user, cookies, ip });
    }
    fail(matchedPath ? 405 : 404, matchedPath ? 'Method not allowed' : 'Not found');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('[api]', method, url.pathname, e);
    return json({ error: 'Something went wrong on our end' }, 500);
  }
}

// conn: { send(string), close(), onmessage: fn(obj), onclose: fn() }
export async function openSocket(conn, url, cookies) {
  await initStore();
  const user = sessionUser(cookies);
  const p = url.searchParams;
  if (p.get('chat')) {
    if (!user) { conn.send(JSON.stringify({ t: 'error', msg: 'Log in to chat' })); return conn.close(); }
    chatConns.add(conn);
    conn.onmessage = () => {};
    conn.onclose = () => chatConns.delete(conn);
    conn.send(JSON.stringify({ t: 'ready' }));
    return;
  }
  const g = games.get(p.get('game') || '');
  if (!g) { conn.send(JSON.stringify({ t: 'error', msg: "We couldn't find a game with that ID", fatal: true })); return conn.close(); }
  if (p.get('host')) {
    if (!user || (user.id !== g.hostId && !isStaff(user))) { conn.send(JSON.stringify({ t: 'error', msg: 'Only the host can open this screen', fatal: true })); return conn.close(); }
    return attachHost(g, conn);
  }
  const player = g.players.get(p.get('pid') || '');
  if (!player || player.token !== p.get('token') || player.kicked) {
    conn.send(JSON.stringify({ t: 'error', msg: 'Your spot in this game expired — join again', fatal: true }));
    return conn.close();
  }
  attachPlayer(g, player, conn);
}
