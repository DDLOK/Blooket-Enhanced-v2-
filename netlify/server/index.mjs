// Blooket Enhanced v2 — Netlify Server entry point.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Netlify serves everything in /public from its CDN; only /api/* reaches this server.
// Live games and chat use WebSockets via upgradeWebSocket() from @netlify/server.

import { upgradeWebSocket, onShutdown, getWebSockets } from '@netlify/server';
import { handle, openSocket } from '../../src/app.mjs';
import { initStore, store } from '../../src/store.mjs';
import { makeConn } from '../../src/conn.mjs';
import { parseCookies } from '../../src/util.mjs';

await initStore();

onShutdown(async ({ drained }) => {
  for (const socket of getWebSockets()) socket.close(1012, 'Server restarting');
  await drained;
  await store.flush();
});

export default async (req, context) => {
  const url = new URL(req.url);
  if (url.pathname === '/api/ws' && req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    const { socket, response } = upgradeWebSocket(req, { idleTimeout: 30 });
    const conn = makeConn(text => socket.send(text), () => socket.close(1000));
    if (socket.readyState === 1) conn._open();
    socket.addEventListener('open', () => conn._open());
    socket.addEventListener('message', e => conn._receive(typeof e.data === 'string' ? e.data : ''));
    socket.addEventListener('close', () => conn._closed());
    socket.addEventListener('error', () => conn._closed());
    openSocket(conn, url, parseCookies(req.headers.get('cookie'))).catch(err => {
      console.error('[ws] open failed', err);
      conn.close();
    });
    return response;
  }
  return handle(req, context);
};

export const config = {
  path: '/api/*',
  // One instance keeps every live game in the same memory (Free/Personal plans only allow 1 anyway).
  scale: { max: 1 },
};
