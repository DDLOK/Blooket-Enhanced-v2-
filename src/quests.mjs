// Blooket Enhanced v2 — daily quests.
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Every player gets 3 quests a day (picked from the pool below, different for each player),
// plus a bonus for finishing all three. Progress is counted on the server.

import { today } from './util.mjs';

export const QUEST_POOL = [
  { id: 'correct20', type: 'correct', goal: 20, text: 'Answer 20 questions correctly', reward: 150 },
  { id: 'correct50', type: 'correct', goal: 50, text: 'Answer 50 questions correctly', reward: 300 },
  { id: 'games2', type: 'games', goal: 2, text: 'Play 2 live games', reward: 150 },
  { id: 'games4', type: 'games', goal: 4, text: 'Play 4 live games', reward: 250 },
  { id: 'win1', type: 'wins', goal: 1, text: 'Win a live game', reward: 250 },
  { id: 'packs3', type: 'packs', goal: 3, text: 'Open 3 packs', reward: 100 },
  { id: 'packs10', type: 'packs', goal: 10, text: 'Open 10 packs', reward: 250 },
  { id: 'solo1', type: 'solo', goal: 1, text: 'Finish a solo practice or homework', reward: 120 },
  { id: 'solo3', type: 'solo', goal: 3, text: 'Finish 3 solo practices', reward: 250 },
  { id: 'gold', type: 'mode:goldrush', goal: 1, text: 'Play a game of Gold Rush', reward: 120 },
  { id: 'crypto', type: 'mode:crypto', goal: 1, text: 'Play a game of Crypto Heist', reward: 120 },
  { id: 'fish', type: 'mode:fishing', goal: 1, text: 'Play a game of Fish Fest', reward: 120 },
  { id: 'factory', type: 'mode:factory', goal: 1, text: 'Play a game of Blook Factory', reward: 120 },
  { id: 'race', type: 'mode:race', goal: 1, text: 'Play a game of Blook Race', reward: 120 },
  { id: 'sell3', type: 'sell', goal: 3, text: 'Sell 3 blooks', reward: 100 },
  { id: 'bazaar1', type: 'bazaarBuy', goal: 1, text: 'Buy a blook on the Bazaar', reward: 120 },
  { id: 'custom1', type: 'custom', goal: 1, text: 'Create or edit a custom blook', reward: 100 },
];
export const QUEST_BONUS = 300;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function ensureQuests(u) {
  const d = today();
  if (u.quests?.date === d) return u.quests;
  // Pick 3 quests of different types, seeded by user + day so it's stable all day.
  let seed = hash(u.id + d);
  const pool = [...QUEST_POOL];
  const list = [];
  const usedTypes = new Set();
  while (list.length < 3 && pool.length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const q = pool.splice(seed % pool.length, 1)[0];
    const family = q.type.startsWith('mode:') ? 'mode' : q.type;
    if (usedTypes.has(family)) continue;
    usedTypes.add(family);
    list.push({ ...q, progress: 0, claimed: false });
  }
  u.quests = { date: d, list, bonusClaimed: false };
  return u.quests;
}

export function questProgress(u, type, n = 1) {
  if (!u || !n) return;
  const qs = ensureQuests(u);
  for (const q of qs.list) if (q.type === type && !q.claimed) q.progress = Math.min(q.goal, q.progress + n);
}
