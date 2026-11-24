// Blooket Enhanced v2 — API client & shared state. Copyright (C) 2026 Blooket Enhanced v2 contributors. GPL-3.0-or-later.

export const state = {
  me: null,
  settings: { siteName: 'Blooket Enhanced' },
  listeners: new Set(),
};

export function setMe(user) {
  state.me = user;
  for (const fn of state.listeners) fn(user);
}
export const onMe = fn => { state.listeners.add(fn); return () => state.listeners.delete(fn); };

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server — check your connection");
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new ApiError(res.status, data.error || `Error ${res.status}`);
  if (data.user && typeof data.user === 'object' && 'tokens' in data.user) setMe(data.user);
  return data;
}
export const get = p => api('GET', p);
export const post = (p, b = {}) => api('POST', p, b);
export const put = (p, b = {}) => api('PUT', p, b);
export const del = p => api('DELETE', p);

// A WebSocket that reconnects itself and re-sends nothing (servers resend state on connect).
export function liveSocket(path, { onMessage, onStatus } = {}) {
  let ws, closed = false, tries = 0, pingTimer;
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${path}`;
  const connect = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      tries = 0;
      onStatus?.('open');
      clearInterval(pingTimer);
      pingTimer = setInterval(() => { if (ws.readyState === 1) ws.send('{"t":"ping"}'); }, 20000);
    };
    ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.fatal) closed = true; onMessage?.(m); } catch { /* ignore */ } };
    ws.onclose = () => {
      clearInterval(pingTimer);
      if (closed) return;
      onStatus?.('reconnecting');
      setTimeout(connect, Math.min(5000, 400 * 2 ** tries++));
    };
  };
  connect();
  return {
    send: obj => { if (ws?.readyState === 1) ws.send(JSON.stringify(obj)); },
    close: () => { closed = true; clearInterval(pingTimer); ws?.close(); },
  };
}
