// Blooket Enhanced v2 — end-to-end smoke test against a running dev server.
//   node dev-server.mjs &   then   BASE=http://localhost:8888 node tests/smoke.mjs
// Uses only Node built-ins (fetch + WebSocket, Node 22+).

import assert from 'node:assert/strict';

const BASE = process.env.BASE || 'http://localhost:8888';
const WS = BASE.replace(/^http/, 'ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function client() {
  let cookie = '';
  const api = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method, headers: { 'content-type': 'application/json', cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const data = await res.json();
    return { status: res.status, ...data };
  };
  return { api, get cookie() { return cookie; } };
}

function socket(path, cookie) {
  const ws = new WebSocket(WS + path, { headers: cookie ? { cookie } : {} });
  const msgs = [];
  const waiters = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    msgs.push(m);
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.res(m); }
  });
  const wait = (t, pred = () => true, ms = 4000) => {
    const found = msgs.find(m => m.t === t && pred(m) && !m._seen);
    if (found) { found._seen = true; return Promise.resolve(found); }
    return new Promise((res, rej) => {
      const w = { pred: m => m.t === t && pred(m), res: m => { m._seen = true; clearTimeout(timer); res(m); } };
      const timer = setTimeout(() => rej(new Error(`timeout waiting for ${t} on ${path}`)), ms);
      waiters.push(w);
    });
  };
  const opened = new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  return { ws, msgs, wait, opened, send: o => ws.send(JSON.stringify(o)) };
}

const ok = (r, msg) => assert.ok(r.status < 300, `${msg}: ${r.status} ${r.error}`);

const run = async () => {
  const suffix = Math.random().toString(36).slice(2, 6);
  const admin = client(), alice = client(), bob = client();
  let r = await admin.api('POST', '/api/auth/register', { username: `admin_${suffix}`, password: 'secret123' });
  ok(r, 'register admin');
  const firstUser = r.user.role;
  r = await alice.api('POST', '/api/auth/register', { username: `alice_${suffix}`, password: 'secret123' });
  ok(r, 'register alice');
  assert.equal(r.user.tokens, 1000);
  r = await bob.api('POST', '/api/auth/register', { username: `bob_${suffix}`, password: 'secret123' });
  ok(r, 'register bob');
  r = await bob.api('POST', '/api/auth/register', { username: `ali ce`, password: 'secret123' });
  assert.equal(r.status, 400, 'bad username rejected');
  r = await bob.api('POST', '/api/auth/login', { username: `bob_${suffix}`, password: 'nope' });
  assert.equal(r.status, 401);
  r = await bob.api('POST', '/api/auth/login', { username: `bob_${suffix}`, password: 'secret123' });
  ok(r, 'login bob');
  console.log('✓ auth (first user role:', firstUser + ')');

  // Daily + packs + sell + avatar
  r = await alice.api('POST', '/api/me/daily'); ok(r, 'daily'); assert.equal(r.user.tokens, 1000 + r.amount);
  const afterDaily = r.user.tokens;
  r = await alice.api('POST', '/api/me/daily'); assert.equal(r.status, 409);
  let last;
  for (let i = 0; i < 10; i++) { last = await alice.api('POST', '/api/packs/open', { pack: 'meadow' }); ok(last, 'open pack'); }
  assert.equal(last.user.tokens, afterDaily - 250);
  const owned = Object.keys(last.user.blooks).find(id => !['blip', 'dot', 'mochi', 'pip'].includes(id));
  r = await alice.api('POST', '/api/me/profile', { avatar: owned, banner: 'ocean', title: 'Quiz Whiz' }); ok(r, 'profile');
  console.log('✓ daily reward, packs, profile');

  // Custom blook
  r = await alice.api('POST', '/api/me/customs', { name: 'Zappy', art: { s: 'round', c: '#ff0000', e: 'big', m: 'grin', x: ['crown', 'notreal'] } });
  ok(r, 'custom blook'); assert.deepEqual(r.custom.art.x, ['crown']);
  r = await alice.api('POST', '/api/me/profile', { avatar: `custom:${r.custom.id}` }); ok(r, 'custom avatar');
  assert.equal(typeof r.user.avatar, 'object');
  console.log('✓ custom blooks');

  // Bazaar
  const sellable = Object.entries(last.user.blooks).find(([id, n]) => n >= 1 && !['blip', 'dot', 'mochi', 'pip'].includes(id))[0];
  r = await alice.api('POST', '/api/bazaar', { blook: sellable, price: 50 }); ok(r, 'list');
  r = await bob.api('GET', '/api/bazaar'); const listing = r.listings.find(l => l.blook === sellable);
  r = await bob.api('POST', `/api/bazaar/${listing.id}/buy`); ok(r, 'buy'); assert.equal(r.user.tokens, 950);
  console.log('✓ bazaar');

  // Sets
  const set = {
    title: 'Science Basics', description: 'Test set', public: true,
    questions: [
      { q: 'H2O is?', answers: ['Water', 'Salt', 'Gold', 'Air'], correct: [0], time: 10 },
      { q: '2+2?', answers: ['3', '4'], correct: [1], time: 10 },
      { q: 'Sun is a?', answers: ['Planet', 'Star', 'Moon'], correct: [1], time: 10 },
    ],
  };
  r = await admin.api('POST', '/api/sets', set); ok(r, 'create set');
  const setId = r.set.id;
  r = await alice.api('GET', `/api/sets/${setId}`); assert.equal(r.set.questions, undefined, 'answers hidden from non-owners');
  r = await alice.api('POST', `/api/sets/${setId}/favorite`); assert.equal(r.favorite, true);
  r = await alice.api('GET', '/api/sets?scope=favorites'); assert.equal(r.sets.length, 1);
  console.log('✓ sets & favorites');

  // Solo + homework
  r = await admin.api('POST', '/api/homework', { setId, title: 'HW 1' }); ok(r, 'homework');
  const hwId = r.homework.id;
  r = await alice.api('POST', '/api/solo/start', { homeworkId: hwId }); ok(r, 'solo start');
  const sid = r.session;
  const answers = { 0: 0, 1: 1, 2: 0 };
  for (const q of r.questions) { const a = await alice.api('POST', `/api/solo/${sid}/answer`, { qi: q.qi, choice: answers[q.qi] }); ok(a, 'solo answer'); }
  r = await alice.api('POST', `/api/solo/${sid}/finish`); ok(r, 'finish'); assert.equal(r.correct, 2);
  r = await admin.api('GET', `/api/homework/${hwId}`); assert.equal(r.homework.results[0].pct, 67);
  console.log('✓ solo practice & homework grading');

  // ---- Classic live game ----
  r = await admin.api('POST', '/api/games', { setId, mode: 'classic' }); ok(r, 'host classic');
  let code = r.code;
  let host = socket(`/api/ws?game=${code}&host=1`, admin.cookie); await host.opened; await host.wait('hello');
  r = await alice.api('POST', `/api/games/${code}/join`, { name: 'Alice', blook: owned }); ok(r, 'alice join');
  const pa = socket(`/api/ws?game=${code}&pid=${r.pid}&token=${r.token}`, alice.cookie);
  const guest = client();
  r = await guest.api('POST', `/api/games/${code}/join`, { name: 'Guesty', blook: 'pip' }); ok(r, 'guest join');
  const pg = socket(`/api/ws?game=${code}&pid=${r.pid}&token=${r.token}`);
  r = await guest.api('POST', `/api/games/${code}/join`, { name: 'guesty' }); assert.equal(r.status, 409, 'dup name');
  await pa.opened; await pg.opened;
  await host.wait('lobby', m => m.players.length === 2);
  host.send({ t: 'start' });
  for (let i = 0; i < 3; i++) {
    const qa = await pa.wait('question');
    const qh = await host.wait('question');
    await pg.wait('question');
    pa.send({ t: 'answer', choice: qh.correct[0] });
    await sleep(200);
    pg.send({ t: 'answer', choice: (qh.correct[0] + 1) % qa.answers.length });
    const rev = await pa.wait('reveal');
    assert.equal(rev.you.correct, true);
    await host.wait('reveal');
    await sleep(160);
    host.send({ t: 'next' });
  }
  const endA = await pa.wait('end');
  assert.equal(endA.you.rank, 1);
  assert.ok(endA.you.reward.tokens > 0);
  const endG = await pg.wait('end');
  assert.equal(endG.you.reward, null);
  console.log('✓ classic game: 3 questions, scoring, rewards (alice', endA.you.score, 'pts, +' + endA.you.reward.tokens, 'tokens)');

  // Helper: play N correct answers in a self-paced mode, running each mode's mini-game.
  const correctFor = { 'H2O is?': 0, '2+2?': 1, 'Sun is a?': 1 };
  async function selfPaced(mode, settings, players, rounds, onPending) {
    const r = await admin.api('POST', '/api/games', { setId, mode, settings }); ok(r, `host ${mode}`);
    const code = r.code;
    const h = socket(`/api/ws?game=${code}&host=1`, admin.cookie); await h.opened;
    const socks = [];
    for (const [c, name, blookId] of players) {
      const j = await c.api('POST', `/api/games/${code}/join`, { name, blook: blookId }); ok(j, 'join');
      const s = socket(`/api/ws?game=${code}&pid=${j.pid}&token=${j.token}`, c.cookie); await s.opened; socks.push(s);
    }
    if (mode === 'crypto') for (const s of socks) { const pw = await s.wait('password'); s.send({ t: 'password', word: pw.options[0] }); await s.wait('passwordSet'); }
    await h.wait('lobby', m => m.players.length === players.length);
    h.send({ t: 'start' });
    const me = socks[0];
    await me.wait('start');
    let ended = null;
    for (let i = 0; i < rounds && !ended; i++) {
      await sleep(130); me.send({ t: 'next' });
      const q = await me.wait('question');
      await sleep(130); me.send({ t: 'answer', choice: correctFor[q.q] });
      const res = await me.wait('result');
      assert.equal(res.correct, true);
      if (onPending) ended = await onPending(me, res, i);
      if (!ended) ended = me.msgs.find(m => m.t === 'end');
    }
    return { h, me, socks, code };
  }

  // ---- Gold Rush ----
  let opened = 0, targeted = 0;
  let gr = await selfPaced('goldrush', { winType: 'time', timeLimitMin: 1 }, [[alice, 'Alice', owned], [bob, 'Bob', 'dot']], 8, async (me) => {
    await sleep(130); me.send({ t: 'next' });
    await me.wait('chests');
    await sleep(130); me.send({ t: 'chest', i: opened % 3 });
    const op = await me.wait('opened'); opened++;
    if (op.kind === 'steal' || op.kind === 'swap') {
      const t = await me.wait('target'); await sleep(130);
      me.send({ t: 'target', pid: t.targets[0].id }); await me.wait('outcome'); targeted++;
    }
  });
  await gr.h.wait('board'); await gr.h.wait('feed');
  gr.h.send({ t: 'end' });
  let e = await gr.me.wait('end');
  console.log(`✓ gold rush: ${opened} chests (${targeted} steal/swap), gold ${e.you.score}`);

  // ---- Crypto Heist ----
  let hacks = 0, gains = 0;
  const cr = await selfPaced('crypto', { winType: 'time', timeLimitMin: 2 }, [[alice, 'Alice', owned], [bob, 'Bob', 'dot']], 12, async (me) => {
    await sleep(130); me.send({ t: 'next' });
    const ch = await me.wait('choices');
    const hi = ch.options.findIndex(o => o.kind === 'hack');
    await sleep(130);
    if (hi >= 0) {
      me.send({ t: 'choose', i: hi });
      const t = await me.wait('target'); await sleep(130);
      me.send({ t: 'target', pid: t.targets[0].id });
      const gq = await me.wait('hackGuess'); await sleep(130);
      me.send({ t: 'guess', word: gq.options[0] });
      await me.wait('outcome'); hacks++;
    } else { me.send({ t: 'choose', i: 0 }); await me.wait('outcome'); gains++; }
  });
  cr.h.send({ t: 'end' });
  e = await cr.me.wait('end');
  console.log(`✓ crypto heist: ${gains} gains, ${hacks} hack attempts, crypto ${e.you.score}`);

  // ---- Fish Fest (goal win) ----
  let catches = 0;
  const fi = await selfPaced('fishing', { winType: 'goal', goal: 30 }, [[bob, 'Bob', 'dot']], 60, async (me, res) => {
    assert.ok(res.fish && typeof res.fish.weight === 'number'); catches++;
    await sleep(60);
    return me.msgs.find(m => m.t === 'end');
  });
  e = await fi.me.wait('end');
  assert.ok(e.you.score >= 30);
  console.log(`✓ fish fest: ${catches} catches, won with ${e.you.score} lbs (biggest: ${e.you.biggest?.name})`);

  // ---- Blook Factory ----
  const fa = await selfPaced('factory', { winType: 'time', timeLimitMin: 1 }, [[alice, 'Alice', owned]], 4, async (me) => {
    await sleep(130); me.send({ t: 'next' });
    const w = await me.wait('workers');
    assert.equal(w.options.length, 3);
    await sleep(130); me.send({ t: 'pick', i: 0 });
    await me.wait('factory');
  });
  const cash = await fa.me.wait('cash', m => m.rate > 0, 3000);
  fa.h.send({ t: 'end' });
  e = await fa.me.wait('end');
  console.log(`✓ blook factory: ${cash.rate}/s, cash ${e.you.score}`);

  // ---- Blook Race ----
  const ra = await selfPaced('race', { goal: 3 }, [[bob, 'Bob', 'dot']], 3);
  e = await ra.me.wait('end');
  assert.equal(e.you.rank, 1);
  console.log('✓ blook race: finished at goal 3');

  // Quests & wheel
  r = await alice.api('GET', '/api/me');
  assert.equal(r.user.quests.list.length, 3);
  r = await bob.api('POST', '/api/me/daily'); ok(r, 'wheel'); assert.ok(typeof r.slice === 'number' && r.amount > 0);
  console.log(`✓ quests (${r.user.quests.list.map(q => `${q.text} ${q.progress}/${q.goal}`).join('; ')}) & wheel (+${r.amount})`);

  // History
  r = await admin.api('GET', '/api/history'); assert.equal(r.history.length, 6);
  console.log('✓ history');

  // Official sets, teacher approval, prefs, clubs
  r = await alice.api('GET', '/api/sets?scope=discover&source=official');
  assert.ok(r.sets.length >= 30, 'official sets seeded');
  r = await alice.api('GET', '/api/sets?scope=discover&subject=Math');
  assert.ok(r.sets.length >= 5 && r.sets.every(x => x.subject === 'Math'));
  const teach = client();
  r = await teach.api('POST', '/api/auth/register', { username: `teach_${suffix}`, password: 'secret123', accountType: 'teacher', school: 'Room 12' });
  ok(r, 'teacher register'); assert.equal(r.user.role, 'student'); assert.equal(r.user.teacherRequest.status, 'pending');
  r = await admin.api('GET', '/api/admin/teacher-requests'); const req = r.requests.find(x => x.username === `teach_${suffix}`); assert.ok(req);
  r = await admin.api('POST', `/api/admin/teacher-requests/${req.id}`, { approve: true }); ok(r, 'approve');
  r = await teach.api('GET', '/api/me'); assert.equal(r.user.role, 'teacher');
  r = await alice.api('POST', '/api/me/account-type', { type: 'student' }); ok(r, 'account type');
  r = await alice.api('POST', '/api/me/prefs', { theme: 'midnight', bg: 'stars', answers: 'cb', bigText: true }); ok(r, 'prefs');
  assert.equal(r.user.prefs.theme, 'midnight');
  r = await alice.api('POST', '/api/clubs', { name: 'Quiz Wizards', tag: 'qwz', desc: 'We love quizzes', emblem: 'sprout', color: '#e63946' }); ok(r, 'create club');
  const clubId = r.club.id; assert.equal(r.user.club.tag, 'QWZ');
  r = await bob.api('POST', `/api/clubs/${clubId}/join`); ok(r, 'join club');
  const cws = socket(`/api/ws?club=${clubId}`, alice.cookie); await cws.opened; await cws.wait('ready');
  r = await bob.api('POST', `/api/clubs/${clubId}/chat`, { text: 'hi club' }); ok(r, 'club chat');
  const cmsg = await cws.wait('msg'); assert.equal(cmsg.msg.text, 'hi club');
  r = await bob.api('GET', '/api/leaderboard'); assert.equal(r.clubs[0].memberCount, 2);
  r = await bob.api('POST', `/api/clubs/${clubId}/leave`); ok(r, 'leave');
  r = await alice.api('GET', `/api/clubs/${clubId}`); assert.equal(r.club.memberCount, 1);
  cws.ws.close();
  console.log('✓ 30+ official sets, teacher approval, appearance prefs, clubs');

  // Chat
  const chat = socket('/api/ws?chat=1', bob.cookie); await chat.opened; await chat.wait('ready');
  r = await alice.api('POST', '/api/chat', { text: 'hello what the fuck' }); ok(r, 'chat');
  const cm = await chat.wait('msg');
  assert.ok(!cm.msg.text.includes('fuck'), 'filtered');
  r = await alice.api('POST', '/api/chat', { text: 'I love the scrap pile at Dickens' });
  const cm2 = await chat.wait('msg');
  assert.equal(cm2.msg.text, 'I love the scrap pile at Dickens');
  console.log('✓ chat + filter:', JSON.stringify(cm.msg.text));

  // Admin
  r = await admin.api('GET', '/api/admin/users');
  if (firstUser === 'admin') {
    ok(r, 'admin users');
    const bobRow = r.users.find(u => u.username === `bob_${suffix}`);
    r = await admin.api('POST', `/api/admin/users/${bobRow.id}`, { role: 'teacher', unlockAll: true }); ok(r, 'admin edit');
    r = await alice.api('GET', '/api/admin/users'); assert.equal(r.status, 403);
    console.log('✓ admin panel');
  }
  r = await alice.api('POST', '/api/auth/logout'); ok(r, 'logout');
  r = await alice.api('GET', '/api/me'); assert.equal(r.user, null);
  for (const s of [host, pa, pg, chat]) s.ws.close();
  console.log('\nALL SMOKE TESTS PASSED');
  process.exit(0);
};

run().catch(e => { console.error('✗', e); process.exit(1); });
