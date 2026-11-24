// Blooket Enhanced v2 — storage.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Everything is kept in memory for speed and written through to a persistent backend:
//   * On Netlify: Netlify Database (Postgres), one `docs` table of JSON documents.
//   * Locally:    a JSON file (./data/db.json) so the game runs with zero dependencies.
// The server is configured to run a single instance, so the in-memory copy stays authoritative.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const data = new Map(); // ns -> Map(id -> object)
let backend = null;
export const storeInfo = { kind: 'memory', warning: null };

function nsMap(ns) {
  let m = data.get(ns);
  if (!m) { m = new Map(); data.set(ns, m); }
  return m;
}

// ---- Postgres backend -------------------------------------------------------------------
async function pgBackend() {
  const { getConnectionString } = await import('@netlify/database');
  const pg = (await import('pg')).default;
  const pool = new pg.Pool({
    connectionString: getConnectionString(),
    max: 5,
    idleTimeoutMillis: 30_000, // Netlify closes idle outbound connections after 60s
    ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
  });
  // The table is created by netlify/database/migrations; this is only a safety net for a plain
  // local Postgres. It must never stop startup (the app's role may not be allowed to run DDL).
  await pool.query(`CREATE TABLE IF NOT EXISTS docs (
    ns text NOT NULL, id text NOT NULL, data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (ns, id))`).catch(() => {});
  const chains = new Map();
  const pending = new Set();
  const enqueue = (key, fn) => {
    const prev = chains.get(key) || Promise.resolve();
    const next = prev.then(fn).catch(err => console.error('[store] write failed', key, err.message));
    chains.set(key, next);
    pending.add(next);
    next.finally(() => { pending.delete(next); if (chains.get(key) === next) chains.delete(key); });
  };
  return {
    kind: 'postgres',
    async load() {
      const { rows } = await pool.query('SELECT ns, id, data FROM docs');
      return rows;
    },
    save(ns, id, obj) {
      const body = JSON.stringify(obj);
      enqueue(`${ns}/${id}`, () => pool.query(
        `INSERT INTO docs (ns, id, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (ns, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [ns, id, body]));
    },
    del(ns, id) {
      enqueue(`${ns}/${id}`, () => pool.query('DELETE FROM docs WHERE ns = $1 AND id = $2', [ns, id]));
    },
    async flush() {
      while (pending.size) await Promise.allSettled([...pending]);
    },
  };
}

// ---- JSON file backend --------------------------------------------------------------------
function fileBackend(file) {
  let timer = null;
  let writing = Promise.resolve();
  const writeNow = async () => {
    timer = null;
    const out = {};
    for (const [ns, m] of data) out[ns] = Object.fromEntries(m);
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(out));
    await rename(tmp, file);
  };
  const schedule = () => {
    if (!timer) timer = setTimeout(() => { writing = writing.then(writeNow).catch(e => console.error('[store] file write failed', e)); }, 250);
  };
  return {
    kind: 'file',
    async load() {
      try {
        const raw = JSON.parse(await readFile(file, 'utf8'));
        const rows = [];
        for (const [ns, docs] of Object.entries(raw)) for (const [id, d] of Object.entries(docs)) rows.push({ ns, id, data: d });
        return rows;
      } catch (e) {
        if (e.code !== 'ENOENT') console.error('[store] could not read', file, e.message);
        return [];
      }
    },
    save: schedule,
    del: schedule,
    async flush() {
      if (timer) { clearTimeout(timer); await writeNow(); }
      await writing;
    },
  };
}

let initPromise = null;
export function initStore() {
  if (!initPromise) initPromise = (async () => {
    const onNetlify = !!(process.env.NETLIFY || process.env.NETLIFY_DB_URL || process.env.SITE_ID);
    if (onNetlify || process.env.USE_POSTGRES) {
      try {
        backend = await pgBackend();
      } catch (e) {
        console.error('[store] Netlify Database unavailable, falling back to temporary storage:', e.message);
        storeInfo.warning = 'Database not connected — data is temporary and will be lost when the server sleeps. See README → "Netlify Database".';
        backend = fileBackend(join(tmpdir(), 'blooket-enhanced-db.json'));
      }
    } else {
      backend = fileBackend(process.env.DATA_FILE || join(process.cwd(), 'data', 'db.json'));
    }
    storeInfo.kind = backend.kind;
    for (const row of await backend.load()) {
      nsMap(row.ns).set(row.id, typeof row.data === 'string' ? JSON.parse(row.data) : row.data);
    }
    console.log(`[store] ${backend.kind} storage ready (${[...data.values()].reduce((n, m) => n + m.size, 0)} docs)`);
  })();
  return initPromise;
}

export const store = {
  get: (ns, id) => (id == null ? undefined : nsMap(ns).get(String(id))),
  all: ns => [...nsMap(ns).values()],
  count: ns => nsMap(ns).size,
  find: (ns, fn) => { for (const v of nsMap(ns).values()) if (fn(v)) return v; return undefined; },
  filter: (ns, fn) => [...nsMap(ns).values()].filter(fn),
  put(ns, id, obj) {
    nsMap(ns).set(String(id), obj);
    backend?.save(ns, String(id), obj);
    return obj;
  },
  save(ns, id) {
    const obj = nsMap(ns).get(String(id));
    if (obj) backend?.save(ns, String(id), obj);
  },
  del(ns, id) {
    nsMap(ns).delete(String(id));
    backend?.del(ns, String(id));
  },
  flush: () => backend?.flush(),
};
