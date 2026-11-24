// Blooket Enhanced v2 — transport-neutral WebSocket connection wrapper.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Both Netlify's upgradeWebSocket() socket and the local dev WebSocket are wrapped in this,
// so the game code only ever sees: conn.send(string), conn.close(), conn.onmessage(obj), conn.onclose().

export function makeConn(rawSend, rawClose) {
  let open = false;
  let closed = false;
  const queue = [];
  const conn = {
    onmessage: () => {},
    onclose: () => {},
    send(text) {
      if (closed) return;
      if (!open) { queue.push(text); return; }
      try { rawSend(text); } catch { /* socket went away */ }
    },
    close() {
      if (closed) return;
      try { rawClose(); } catch { /* ignore */ }
      conn._closed();
    },
    _open() {
      if (open || closed) return;
      open = true;
      for (const t of queue.splice(0)) { try { rawSend(t); } catch { /* ignore */ } }
    },
    _receive(text) {
      if (closed || typeof text !== 'string' || text.length > 8192) return;
      let msg;
      try { msg = JSON.parse(text); } catch { return; }
      if (!msg || typeof msg !== 'object' || msg.t === 'ping') return;
      try { conn.onmessage(msg); } catch (e) { console.error('[ws] handler error', e); }
    },
    _closed() {
      if (closed) return;
      closed = true;
      try { conn.onclose(); } catch (e) { console.error('[ws] close handler error', e); }
    },
  };
  return conn;
}
