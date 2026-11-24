// Blooket Enhanced v2 — shared server helpers.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const fail = (status, message) => { throw new HttpError(status, message); };

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export async function readJson(req, maxBytes = 256 * 1024) {
  const type = req.headers.get('content-type') || '';
  // Requiring JSON blocks cross-site form posts (simple CSRF protection alongside SameSite cookies).
  if (!type.includes('application/json')) fail(415, 'Expected JSON');
  const text = await req.text();
  if (text.length > maxBytes) fail(413, 'Request too large');
  if (!text) return {};
  try { return JSON.parse(text); } catch { fail(400, 'Invalid JSON'); }
}

export function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const newId = (bytes = 12) => randomBytes(bytes).toString('base64url');

export function gameCode(existing) {
  for (let i = 0; i < 50; i++) {
    const code = String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
    if (!existing.has(code)) return code;
  }
  fail(503, 'Could not create a game code, try again');
}

export async function hashPassword(pw) {
  const salt = randomBytes(16).toString('base64url');
  const hash = (await scrypt(pw, salt, 64)).toString('base64url');
  return `${salt}:${hash}`;
}

export async function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const want = Buffer.from(hash, 'base64url');
  const got = await scrypt(pw, salt, want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function cleanText(value, max = 200) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮]/g, '').trim().slice(0, max);
}

// ---- Chat / name filter -------------------------------------------------------------
// A starter list of common swear words. Admins can add more words in the admin panel.
const BASE_WORDS = [
  'fuck', 'fuk', 'fck', 'shit', 'sh1t', 'bitch', 'b1tch', 'asshole', 'bastard', 'dick', 'd1ck', 'cock',
  'pussy', 'cunt', 'whore', 'slut', 'fag', 'retard', 'nigger', 'nigga', 'porn', 'penis', 'vagina',
  'boob', 'tits', 'dildo', 'wank', 'twat', 'motherfucker', 'piss',
];

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
const normalize = s => s.toLowerCase().replace(/[013457@$!]/g, c => LEET[c]).replace(/[^a-z]/g, '');

export function makeFilter(extraWords = []) {
  const words = [...new Set([...BASE_WORDS, ...extraWords].map(w => normalize(String(w))).filter(Boolean))];
  // Short words only match a whole word (plus a short ending like "s"/"ed"), so "Dickens" or
  // "scrap" are not blocked. Longer words also match inside other text, e.g. "f.u.c.k" or "xxfuckxx".
  const tokenBad = n => words.some(w => (w.length <= 4 ? n.startsWith(w) && n.length <= w.length + 2 : n.includes(w)));
  return {
    isBad(text) {
      const tokens = String(text).split(/\s+/).map(normalize).filter(Boolean);
      if (tokens.some(tokenBad)) return true;
      const flat = normalize(text);
      return words.some(w => w.length >= 5 && flat.includes(w));
    },
    clean(text) {
      return String(text).split(/(\s+)/).map(tok => {
        const n = normalize(tok);
        return n && tokenBad(n) ? '*'.repeat(Math.min(tok.length, 8)) : tok;
      }).join('');
    },
  };
}

// ---- Rate limiting --------------------------------------------------------------------
const buckets = new Map();
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count++;
  if (buckets.size > 20000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.count <= limit;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const levelFromXp = xp => Math.floor(Math.sqrt((xp || 0) / 40)) + 1;
