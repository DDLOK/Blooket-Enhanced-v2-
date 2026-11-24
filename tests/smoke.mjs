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
  r = await alice.api('POST', '/api/me/daily'); ok(r, 'daily'); assert.equal(r.user.tokens, 1500);
  r = await alice.api('POST', '/api/me/daily'); assert.equal(r.status, 409);
  let last;
  for (let i = 0; i < 10; i++) { last = await alice.api('POST', '/api/packs/open', { pack: 'meadow' }); ok(last, 'open pack'); }
  assert.equal(last.user.tokens, 1500 - 250);
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

  // ---- Gold Rush ----
  r = await admin.api('POST', '/api/games', { setId, mode: 'goldrush', settings: { timeLimitMin: 1 } }); ok(r, 'host goldrush');
  code = r.code;
  host = socket(`/api/ws?game=${code}&host=1`, admin.cookie); await host.opened;
  const ja = await alice.api('POST', `/api/games/${code}/join`, { name: 'Alice', blook: owned });
  const jb = await bob.api('POST', `/api/games/${code}/join`, { name: 'Bob', blook: 'dot' });
  const ga = socket(`/api/ws?game=${code}&pid=${ja.pid}&token=${ja.token}`, alice.cookie);
  const gb = socket(`/api/ws?game=${code}&pid=${jb.pid}&token=${jb.token}`, bob.cookie);
  await ga.opened; await gb.opened;
  await host.wait('lobby', m => m.players.length === 2);
  host.send({ t: 'start' });
  await ga.wait('start');
  const correctFor = { 'H2O is?': 0, '2+2?': 1, 'Sun is a?': 1 };
  let opened = 0, targeted = 0;
  for (let i = 0; i < 8; i++) {
    ga.send({ t: 'next' });
    const q = await ga.wait('question');
    await sleep(160);
    ga.send({ t: 'answer', choice: correctFor[q.q] });
    const res = await ga.wait('result');
    assert.equal(res.correct, true);
    await sleep(160);
    ga.send({ t: 'chest', i: i % 3 });
    const op = await ga.wait('opened');
    opened++;
    if (op.kind === 'steal' || op.kind === 'swap') {
      const t = await ga.wait('target');
      await sleep(160);
      ga.send({ t: 'target', pid: t.targets[0].id });
      await ga.wait('targetDone');
      targeted++;
    }
    await sleep(160);
  }
  await host.wait('board');
  host.send({ t: 'end' });
  const gEnd = await ga.wait('end');
  console.log(`✓ gold rush: ${opened} chests opened (${targeted} steal/swap), alice gold ${gEnd.you.score}`);

  // ---- Blook Race ----
  r = await admin.api('POST', '/api/games', { setId, mode: 'race', settings: { goal: 3 } }); ok(r, 'host race');
  code = r.code;
  host = socket(`/api/ws?game=${code}&host=1`, admin.cookie); await host.opened;
  const ra = await bob.api('POST', `/api/games/${code}/join`, { name: 'Bob', blook: 'dot' });
  const rb = socket(`/api/ws?game=${code}&pid=${ra.pid}&token=${ra.token}`, bob.cookie); await rb.opened;
  await host.wait('lobby', m => m.players.length === 1);
  host.send({ t: 'start' });
  await rb.wait('start');
  for (let i = 0; i < 3; i++) {
    rb.send({ t: 'next' });
    const q = await rb.wait('question');
    await sleep(160);
    rb.send({ t: 'answer', choice: correctFor[q.q] });
    await rb.wait('result');
    await sleep(160);
  }
  const rEnd = await rb.wait('end');
  assert.equal(rEnd.you.rank, 1);
  console.log('✓ blook race: finished at goal 3');

  // History
  r = await admin.api('GET', '/api/history'); assert.equal(r.history.length, 3);
  console.log('✓ history');

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
  for (const s of [host, pa, pg, ga, gb, rb, chat]) s.ws.close();
  console.log('\nALL SMOKE TESTS PASSED');
  process.exit(0);
};

run().catch(e => { console.error('✗', e); process.exit(1); });
