// Blooket Enhanced v2 — local development server (no npm install needed).
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
//   node dev-server.mjs            -> http://localhost:8888
//
// Serves /public as static files, sends /api/* to the same app code Netlify runs, and includes a
// tiny WebSocket implementation so live games work locally. Data is saved to ./data/db.json.

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle, openSocket } from './src/app.mjs';
import { initStore, store } from './src/store.mjs';
import { makeConn } from './src/conn.mjs';
import { parseCookies } from './src/util.mjs';

const ROOT = resolve(fileURLToPath(new URL('./public', import.meta.url)));
const PORT = Number(process.env.PORT) || 8888;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

await initStore();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
      const response = await handle(request, { ip: req.socket.remoteAddress });
      const headers = {};
      response.headers.forEach((v, k) => { headers[k] = v; });
      res.writeHead(response.status, headers);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    let s = await stat(file).catch(() => null);
    if (s?.isDirectory()) { file = join(file, 'index.html'); s = await stat(file).catch(() => null); }
    if (!s) { file = join(ROOT, '404.html'); res.statusCode = 404; }
    const data = await readFile(file);
    res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream');
    res.setHeader('cache-control', 'no-cache');
    res.end(data);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end('Server error');
  }
});

// ---- Minimal RFC 6455 WebSocket (text frames only) ------------------------------------------
server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const key = req.headers['sec-websocket-key'];
  if (url.pathname !== '/api/ws' || !key) { socket.destroy(); return; }
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);

  const frame = (opcode, payload) => {
    const len = payload.length;
    const head = len < 126 ? Buffer.from([0x80 | opcode, len])
      : len < 65536 ? Buffer.from([0x80 | opcode, 126, len >> 8, len & 255])
      : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | opcode; b[1] = 127; b.writeBigUInt64BE(BigInt(len), 2); return b; })();
    return Buffer.concat([head, payload]);
  };
  const conn = makeConn(
    text => socket.write(frame(1, Buffer.from(text))),
    () => { try { socket.write(frame(8, Buffer.alloc(0))); } catch { /* */ } socket.end(); },
  );
  let buf = Buffer.alloc(0);
  let fragments = [];
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const fin = buf[0] & 0x80, opcode = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) { socket.destroy(); return; }
      const maskOff = off; if (masked) off += 4;
      if (buf.length < off + len) return;
      const payload = Buffer.from(buf.subarray(off, off + len));
      if (masked) for (let i = 0; i < len; i++) payload[i] ^= buf[maskOff + (i % 4)];
      buf = buf.subarray(off + len);
      if (opcode === 8) { conn.close(); return; }
      if (opcode === 9) { socket.write(frame(10, payload)); continue; }
      if (opcode === 10) continue;
      if (opcode === 1 || opcode === 0) {
        fragments.push(payload);
        if (fin) { conn._receive(Buffer.concat(fragments).toString('utf8')); fragments = []; }
      }
    }
  });
  socket.on('close', () => conn._closed());
  socket.on('error', () => conn._closed());
  conn._open();
  openSocket(conn, url, parseCookies(req.headers.cookie)).catch(e => { console.error(e); conn.close(); });
});

server.listen(PORT, () => console.log(`Blooket Enhanced v2 running at http://localhost:${PORT}`));

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await store.flush(); process.exit(0); });
