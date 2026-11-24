// Blooket Enhanced v2 — achievements, worked out from a player's public stats. GPL-3.0-or-later.
import { BLOOKS } from './data.js';

const owned = u => Object.keys(u.blooks || {}).filter(id => BLOOKS[id]);
const hasRarity = (u, ...r) => owned(u).some(id => r.includes(BLOOKS[id].rarity));

export const ACHIEVEMENTS = [
  { id: 'first', em: '🎮', name: 'First Steps', desc: 'Play your first live game', test: u => (u.stats?.gamesPlayed || 0) >= 1 },
  { id: 'veteran', em: '🎯', name: 'Veteran', desc: 'Play 25 live games', test: u => (u.stats?.gamesPlayed || 0) >= 25 },
  { id: 'win', em: '🏆', name: 'Champion', desc: 'Win a live game', test: u => (u.stats?.wins || 0) >= 1 },
  { id: 'win10', em: '👑', name: 'Unstoppable', desc: 'Win 10 live games', test: u => (u.stats?.wins || 0) >= 10 },
  { id: 'correct100', em: '🧠', name: 'Quiz Whiz', desc: 'Answer 100 questions correctly', test: u => (u.stats?.correct || 0) >= 100 },
  { id: 'correct1000', em: '🎓', name: 'Big Brain', desc: 'Answer 1,000 questions correctly', test: u => (u.stats?.correct || 0) >= 1000 },
  { id: 'packs10', em: '📦', name: 'Pack Opener', desc: 'Open 10 packs', test: u => (u.stats?.packsOpened || 0) >= 10 },
  { id: 'packs100', em: '🎁', name: 'Pack Fanatic', desc: 'Open 100 packs', test: u => (u.stats?.packsOpened || 0) >= 100 },
  { id: 'unique20', em: '📚', name: 'Collector', desc: 'Own 20 different blooks', test: u => owned(u).length >= 20 },
  { id: 'all', em: '💯', name: 'Completionist', desc: 'Own every blook', test: u => owned(u).length >= Object.keys(BLOOKS).length },
  { id: 'legend', em: '⭐', name: 'Legendary Pull', desc: 'Own a Legendary blook', test: u => hasRarity(u, 'Legendary', 'Chroma', 'Mystical') },
  { id: 'mystic', em: '✨', name: 'Out of This World', desc: 'Own a Chroma or Mystical blook', test: u => hasRarity(u, 'Chroma', 'Mystical') },
  { id: 'creator', em: '🎨', name: 'Creator', desc: 'Make a custom blook', test: u => (u.customs || []).length >= 1 },
  { id: 'club', em: '🤝', name: 'Team Player', desc: 'Join a club', test: u => !!u.club },
  { id: 'lv10', em: '🚀', name: 'Rising Star', desc: 'Reach level 10', test: u => (u.level || 1) >= 10 },
  { id: 'lv25', em: '🌟', name: 'Superstar', desc: 'Reach level 25', test: u => (u.level || 1) >= 25 },
];

export const achievementsFor = u => ACHIEVEMENTS.map(a => ({ ...a, unlocked: !!a.test(u) }));
