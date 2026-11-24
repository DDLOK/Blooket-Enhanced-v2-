// Blooket Enhanced v2 — shared game data (used by both the browser and the server).
// Copyright (C) 2026 Blooket Enhanced v2 contributors. Licensed under GPL-3.0-or-later.
//
// Every blook here is an ORIGINAL character. Art is generated from the `art` spec by
// public/js/blookart.js — no images from Blooket are used anywhere in this project.

export const RARITIES = {
  Starter:   { color: '#8b8b9e', sell: 0,    order: 0 },
  Common:    { color: '#a7b1c2', sell: 5,    order: 1 },
  Uncommon:  { color: '#4bc22e', sell: 20,   order: 2 },
  Rare:      { color: '#0a99ff', sell: 75,   order: 3 },
  Epic:      { color: '#be0000', sell: 200,  order: 4 },
  Legendary: { color: '#ff910f', sell: 500,  order: 5 },
  Chroma:    { color: '#00d7d7', sell: 1000, order: 6 },
  Mystical:  { color: '#a945fa', sell: 2500, order: 7 },
};

// art spec: s=shape, c=body color, b=belly/shade color, e=eyes, m=mouth, x=extras, k=cheeks
// shapes: round square tall wide bean drop ghost
// eyes:   dot big sleepy happy angry cyclops three star visor hollow wink
// mouths: smile open cat fang o flat grin none
export const PACKS = [
  {
    id: 'meadow', name: 'Meadow Pack', price: 25, color: '#4bc22e', color2: '#2f8f1b',
    blooks: [
      { id: 'sprout',      name: 'Sprout',       rarity: 'Common',    chance: 22,  art: { s: 'round',  c: '#7ed957', e: 'dot',    m: 'smile', x: ['leaf'], k: 1 } },
      { id: 'pebble',      name: 'Pebble',       rarity: 'Common',    chance: 22,  art: { s: 'wide',   c: '#9aa3ad', e: 'sleepy', m: 'flat',  x: [] } },
      { id: 'bumble',      name: 'Bumble',       rarity: 'Common',    chance: 20,  art: { s: 'round',  c: '#ffd23f', e: 'big',    m: 'smile', x: ['stripes', 'antenna'], k: 1 } },
      { id: 'puddle-frog', name: 'Puddle Frog',  rarity: 'Common',    chance: 16,  art: { s: 'wide',   c: '#3fb950', e: 'big',    m: 'grin',  x: ['frogEyes'] } },
      { id: 'clover-bun',  name: 'Clover Bun',   rarity: 'Uncommon',  chance: 10,  art: { s: 'round',  c: '#c9f2b0', e: 'happy',  m: 'cat',   x: ['bunnyEars', 'clover'], k: 1 } },
      { id: 'mossy-mole',  name: 'Mossy Mole',   rarity: 'Uncommon',  chance: 6,   art: { s: 'bean',   c: '#8a6a4f', e: 'dot',    m: 'o',     x: ['glasses', 'moss'] } },
      { id: 'acorn-knight',name: 'Acorn Knight', rarity: 'Rare',      chance: 3,   art: { s: 'tall',   c: '#c98b4b', e: 'angry',  m: 'flat',  x: ['acornCap', 'sword'] } },
      { id: 'sunpetal',    name: 'Sunpetal',     rarity: 'Epic',      chance: 0.8, art: { s: 'round',  c: '#ffb703', e: 'happy',  m: 'open',  x: ['petals'], k: 1 } },
      { id: 'grand-oak',   name: 'Grand Oak',    rarity: 'Legendary', chance: 0.2, art: { s: 'tall',   c: '#7a5230', e: 'sleepy', m: 'smile', x: ['leafCrown', 'beard'] } },
    ],
  },
  {
    id: 'ocean', name: 'Deep Sea Pack', price: 30, color: '#1fa2ff', color2: '#0b5fa8',
    blooks: [
      { id: 'bubbles',      name: 'Bubbles',      rarity: 'Common',    chance: 24,  art: { s: 'round', c: '#8fd3ff', e: 'big',     m: 'o',     x: ['bubble'], k: 1 } },
      { id: 'krill',        name: 'Krill',        rarity: 'Common',    chance: 22,  art: { s: 'bean',  c: '#ff8fa3', e: 'dot',     m: 'smile', x: ['antenna'] } },
      { id: 'puffy',        name: 'Puffy',        rarity: 'Common',    chance: 18,  art: { s: 'round', c: '#ffe066', e: 'angry',   m: 'o',     x: ['spikes', 'fins'] } },
      { id: 'squidlet',     name: 'Squidlet',     rarity: 'Common',    chance: 16,  art: { s: 'drop',  c: '#b388eb', e: 'big',     m: 'smile', x: ['tentacles'], k: 1 } },
      { id: 'shellby',      name: 'Shellby',      rarity: 'Uncommon',  chance: 10,  art: { s: 'wide',  c: '#ff7f6e', e: 'happy',   m: 'cat',   x: ['shell'] } },
      { id: 'glowfin',      name: 'Glowfin',      rarity: 'Uncommon',  chance: 6,   art: { s: 'round', c: '#2b4c7e', e: 'big',     m: 'fang',  x: ['lure', 'fins'] } },
      { id: 'captain-kelp', name: 'Captain Kelp', rarity: 'Rare',      chance: 3,   art: { s: 'square',c: '#2a9d8f', e: 'wink',    m: 'grin',  x: ['pirateHat'] } },
      { id: 'abyss-eye',    name: 'Abyss Eye',    rarity: 'Epic',      chance: 0.8, art: { s: 'round', c: '#1b1b3a', e: 'cyclops', m: 'none',  x: ['tentacles', 'sparkles'] } },
      { id: 'tidal-king',   name: 'Tidal King',   rarity: 'Legendary', chance: 0.2, art: { s: 'tall',  c: '#00b4d8', e: 'dot',     m: 'smile', x: ['crown', 'trident'] } },
    ],
  },
  {
    id: 'cosmo', name: 'Cosmo Pack', price: 40, color: '#6c4cff', color2: '#3a1fb8',
    blooks: [
      { id: 'stardust',    name: 'Stardust',    rarity: 'Common',    chance: 24,  art: { s: 'round',  c: '#fff3b0', e: 'star',   m: 'smile', x: ['sparkles'], k: 1 } },
      { id: 'moonpie',     name: 'Moonpie',     rarity: 'Common',    chance: 22,  art: { s: 'round',  c: '#c7c9d3', e: 'sleepy', m: 'smile', x: ['craters'] } },
      { id: 'zorp',        name: 'Zorp',        rarity: 'Common',    chance: 18,  art: { s: 'bean',   c: '#9ef01a', e: 'three',  m: 'o',     x: ['alienAntenna'] } },
      { id: 'comet',       name: 'Comet',       rarity: 'Common',    chance: 16,  art: { s: 'drop',   c: '#ff9f1c', e: 'angry',  m: 'grin',  x: ['flame'] } },
      { id: 'rover',       name: 'Rover',       rarity: 'Uncommon',  chance: 10,  art: { s: 'square', c: '#b8c0cc', e: 'visor',  m: 'none',  x: ['antenna', 'bolts'] } },
      { id: 'nebula',      name: 'Nebula',      rarity: 'Uncommon',  chance: 6,   art: { s: 'ghost',  c: '#c77dff', e: 'happy',  m: 'smile', x: ['swirl', 'sparkles'] } },
      { id: 'astro-pup',   name: 'Astro Pup',   rarity: 'Rare',      chance: 3,   art: { s: 'round',  c: '#f4a261', e: 'big',    m: 'open',  x: ['bearEars', 'spaceHelmet'], k: 1 } },
      { id: 'black-hole',  name: 'Black Hole',  rarity: 'Epic',      chance: 0.8, art: { s: 'round',  c: '#14111f', e: 'hollow', m: 'none',  x: ['ring', 'sparkles'] } },
      { id: 'galaxy-queen',name: 'Galaxy Queen',rarity: 'Legendary', chance: 0.2, art: { s: 'tall',   c: '#7b2cbf', e: 'star',   m: 'smile', x: ['crown', 'sparkles'], k: 1 } },
    ],
  },
  {
    id: 'snack', name: 'Snack Attack Pack', price: 35, color: '#ff8c42', color2: '#c4571a',
    blooks: [
      { id: 'toasty',        name: 'Toasty',        rarity: 'Common',    chance: 24,  art: { s: 'square', c: '#e9b872', e: 'dot',    m: 'smile', x: ['crust'], k: 1 } },
      { id: 'jelly',         name: 'Jelly',         rarity: 'Common',    chance: 22,  art: { s: 'drop',   c: '#ff5d8f', e: 'happy',  m: 'o',     x: ['shine'] } },
      { id: 'dumpling',      name: 'Dumpling',      rarity: 'Common',    chance: 18,  art: { s: 'wide',   c: '#fff1d6', e: 'sleepy', m: 'cat',   x: ['pleats'], k: 1 } },
      { id: 'tater',         name: 'Tater',         rarity: 'Common',    chance: 16,  art: { s: 'bean',   c: '#c69c6d', e: 'dot',    m: 'flat',  x: ['spots'] } },
      { id: 'sushi-roll',    name: 'Sushi Roll',    rarity: 'Uncommon',  chance: 10,  art: { s: 'round',  c: '#f8f9fa', e: 'big',    m: 'smile', x: ['nori', 'salmon'] } },
      { id: 'waffle-wizard', name: 'Waffle Wizard', rarity: 'Uncommon',  chance: 6,   art: { s: 'square', c: '#f2c14e', e: 'wink',   m: 'grin',  x: ['waffle', 'wizardHat'] } },
      { id: 'boba-bro',      name: 'Boba Bro',      rarity: 'Rare',      chance: 3,   art: { s: 'tall',   c: '#d4a373', e: 'happy',  m: 'smile', x: ['straw', 'pearls'], k: 1 } },
      { id: 'golden-donut',  name: 'Golden Donut',  rarity: 'Epic',      chance: 0.8, art: { s: 'round',  c: '#ffd60a', e: 'star',   m: 'open',  x: ['frosting', 'sprinkles'] } },
      { id: 'supreme-cake',  name: 'Supreme Cake',  rarity: 'Legendary', chance: 0.2, art: { s: 'square', c: '#ffafcc', e: 'happy',  m: 'smile', x: ['frosting', 'candle', 'sprinkles'], k: 1 } },
    ],
  },
  {
    id: 'spooky', name: 'Spooky Pack', price: 35, color: '#7b2cbf', color2: '#3c096c',
    blooks: [
      { id: 'boo',           name: 'Boo',           rarity: 'Common',    chance: 24,  art: { s: 'ghost',  c: '#f1f1f6', e: 'hollow', m: 'o',     x: [] } },
      { id: 'pumpkin-pal',   name: 'Pumpkin Pal',   rarity: 'Common',    chance: 22,  art: { s: 'wide',   c: '#ff7b00', e: 'angry',  m: 'grin',  x: ['stem', 'ridges'] } },
      { id: 'bat-bit',       name: 'Bat Bit',       rarity: 'Common',    chance: 18,  art: { s: 'round',  c: '#3d3552', e: 'big',    m: 'fang',  x: ['wings', 'catEars'] } },
      { id: 'skully',        name: 'Skully',        rarity: 'Common',    chance: 16,  art: { s: 'round',  c: '#ede6d6', e: 'hollow', m: 'grin',  x: ['crack'] } },
      { id: 'witchy-cat',    name: 'Witchy Cat',    rarity: 'Uncommon',  chance: 10,  art: { s: 'round',  c: '#2d2a32', e: 'big',    m: 'cat',   x: ['catEars', 'witchHat'] } },
      { id: 'mummy-wrap',    name: 'Mummy Wrap',    rarity: 'Uncommon',  chance: 6,   art: { s: 'tall',   c: '#e6dcc3', e: 'dot',    m: 'none',  x: ['bandages'] } },
      { id: 'vampy',         name: 'Vampy',         rarity: 'Rare',      chance: 3,   art: { s: 'square', c: '#d8d4f2', e: 'angry',  m: 'fang',  x: ['cape', 'hairPeak'] } },
      { id: 'phantom',       name: 'Phantom',       rarity: 'Epic',      chance: 0.8, art: { s: 'ghost',  c: '#80ffdb', e: 'hollow', m: 'open',  x: ['chains', 'sparkles'] } },
      { id: 'midnight-lord', name: 'Midnight Lord', rarity: 'Legendary', chance: 0.2, art: { s: 'tall',   c: '#240046', e: 'angry',  m: 'fang',  x: ['horns', 'crown', 'cape'] } },
    ],
  },
  {
    id: 'arcade', name: 'Arcade Pack', price: 40, color: '#ff3cac', color2: '#2b86c5',
    blooks: [
      { id: 'pixel',        name: 'Pixel',        rarity: 'Common',    chance: 24,  art: { s: 'square', c: '#4cc9f0', e: 'dot',   m: 'flat',  x: ['pixels'] } },
      { id: 'coinzy',       name: 'Coinzy',       rarity: 'Common',    chance: 22,  art: { s: 'round',  c: '#ffc300', e: 'happy', m: 'smile', x: ['coinMark'], k: 1 } },
      { id: 'glitch',       name: 'Glitch',       rarity: 'Common',    chance: 18,  art: { s: 'square', c: '#f72585', e: 'three', m: 'o',     x: ['glitch'] } },
      { id: 'joyjoy',       name: 'Joy Joy',      rarity: 'Common',    chance: 16,  art: { s: 'wide',   c: '#e63946', e: 'big',   m: 'smile', x: ['joystick'] } },
      { id: 'bot-9',        name: 'Bot-9',        rarity: 'Uncommon',  chance: 10,  art: { s: 'square', c: '#adb5bd', e: 'visor', m: 'grin',  x: ['antenna', 'bolts'] } },
      { id: 'disco',        name: 'Disco',        rarity: 'Uncommon',  chance: 6,   art: { s: 'round',  c: '#b5179e', e: 'star',  m: 'open',  x: ['shades', 'sparkles'] } },
      { id: 'neon-ninja',   name: 'Neon Ninja',   rarity: 'Rare',      chance: 3,   art: { s: 'tall',   c: '#1d1d2b', e: 'angry', m: 'none',  x: ['ninjaMask', 'headband'] } },
      { id: 'boss-bot',     name: 'Boss Bot',     rarity: 'Epic',      chance: 0.8, art: { s: 'square', c: '#560bad', e: 'visor', m: 'grin',  x: ['horns', 'bolts', 'sparkles'] } },
      { id: 'high-score',   name: 'High Score',   rarity: 'Legendary', chance: 0.2, art: { s: 'round',  c: '#fee440', e: 'star',  m: 'grin',  x: ['crown', 'shades', 'sparkles'] } },
    ],
  },
  {
    id: 'prism', name: 'Prism Pack', price: 100, color: '#00d7d7', color2: '#a945fa',
    blooks: [
      { id: 'prism-sprout', name: 'Prism Sprout', rarity: 'Rare',      chance: 40, art: { s: 'round', c: '#9bf6ff', e: 'happy', m: 'smile', x: ['leaf', 'sparkles'], k: 1 } },
      { id: 'prism-boo',    name: 'Prism Boo',    rarity: 'Rare',      chance: 30, art: { s: 'ghost', c: '#ffc6ff', e: 'hollow',m: 'o',     x: ['sparkles'] } },
      { id: 'prism-pixel',  name: 'Prism Pixel',  rarity: 'Epic',      chance: 18, art: { s: 'square',c: '#caffbf', e: 'star',  m: 'grin',  x: ['pixels', 'sparkles'] } },
      { id: 'aurora',       name: 'Aurora',       rarity: 'Legendary', chance: 8,  art: { s: 'tall',  c: '#a0c4ff', e: 'star',  m: 'smile', x: ['halo', 'sparkles'], k: 1 } },
      { id: 'rainbow-rex',  name: 'Rainbow Rex',  rarity: 'Chroma',    chance: 3.5,art: { s: 'bean',  c: '#80ed99', e: 'big',   m: 'fang',  x: ['spikes', 'sparkles'] } },
      { id: 'cosmic-whale', name: 'Cosmic Whale', rarity: 'Mystical',  chance: 0.5,art: { s: 'wide',  c: '#3a0ca3', e: 'star',  m: 'smile', x: ['spout', 'sparkles', 'halo'] } },
    ],
  },
];

export const STARTERS = [
  { id: 'blip',  name: 'Blip',  rarity: 'Starter', art: { s: 'round',  c: '#9b5de5', e: 'dot',   m: 'smile', x: [], k: 1 } },
  { id: 'dot',   name: 'Dot',   rarity: 'Starter', art: { s: 'square', c: '#00bbf9', e: 'big',   m: 'smile', x: [] } },
  { id: 'mochi', name: 'Mochi', rarity: 'Starter', art: { s: 'wide',   c: '#ffc8dd', e: 'happy', m: 'cat',   x: [], k: 1 } },
  { id: 'pip',   name: 'Pip',   rarity: 'Starter', art: { s: 'drop',   c: '#fee440', e: 'dot',   m: 'o',     x: [] } },
];

export const BLOOKS = {};
for (const s of STARTERS) BLOOKS[s.id] = { ...s, pack: null };
for (const p of PACKS) for (const b of p.blooks) BLOOKS[b.id] = { ...b, pack: p.id };

export const PACK_BY_ID = Object.fromEntries(PACKS.map(p => [p.id, p]));

export const GAME_MODES = {
  classic: {
    name: 'Classic', color: '#0a99ff',
    desc: 'Everyone answers the same question at the same time. Faster correct answers score more. You control the pace.',
    selfPaced: false,
  },
  goldrush: {
    name: 'Gold Rush', color: '#ffb703',
    desc: 'Answer questions to open treasure chests. Find gold, double it, or swipe it from other players!',
    selfPaced: true, timed: true,
  },
  race: {
    name: 'Blook Race', color: '#4bc22e',
    desc: 'Every correct answer moves your blook forward. First to the finish line wins!',
    selfPaced: true,
  },
};

export const STARTING_TOKENS = 1000;

// Blook Score points per unique blook owned.
export const SCORE_POINTS = { Starter: 1, Common: 5, Uncommon: 15, Rare: 40, Epic: 100, Legendary: 250, Chroma: 500, Mystical: 1000 };

// Profile banners — original CSS patterns, all free.
export const BANNERS = [
  { id: 'grape',    name: 'Grape Soda',   css: 'linear-gradient(135deg,#7b2ff7,#b14aed)' },
  { id: 'ocean',    name: 'Ocean Wave',   css: 'repeating-radial-gradient(circle at 0 100%,#0a99ff 0 14px,#30b5ff 14px 28px)' },
  { id: 'kelp',     name: 'Kelp Roll',    css: 'repeating-linear-gradient(100deg,#1b4332 0 10px,#2d6a4f 10px 22px)' },
  { id: 'sunset',   name: 'Sunset',       css: 'linear-gradient(90deg,#ff7b00,#ff006e,#8338ec)' },
  { id: 'candy',    name: 'Candy Stripe', css: 'repeating-linear-gradient(45deg,#ff8fab 0 14px,#fff0f3 14px 28px)' },
  { id: 'night',    name: 'Starry Night', css: 'radial-gradient(#fff 1px,transparent 1.5px) 0 0/18px 18px,radial-gradient(#fff8 1px,transparent 1.5px) 9px 9px/18px 18px,linear-gradient(#10002b,#3c096c)' },
  { id: 'lime',     name: 'Lime Fizz',    css: 'radial-gradient(circle,#ffffff55 3px,transparent 4px) 0 0/16px 16px,linear-gradient(135deg,#70e000,#38b000)' },
  { id: 'arcade',   name: 'Arcade',       css: 'linear-gradient(90deg,#ff3cac55 1px,transparent 1px) 0 0/14px 14px,linear-gradient(#ff3cac55 1px,transparent 1px) 0 0/14px 14px,linear-gradient(135deg,#2b0b3f,#2b86c5)' },
  { id: 'gold',     name: 'Gold Bars',    css: 'repeating-linear-gradient(90deg,#ffb703 0 18px,#ffd60a 18px 36px)' },
  { id: 'spooky',   name: 'Spooky',       css: 'repeating-linear-gradient(-45deg,#240046 0 12px,#3c096c 12px 24px),#240046' },
  { id: 'mint',     name: 'Mint Choc',    css: 'radial-gradient(circle,#3d2c2e 3px,transparent 4px) 0 0/20px 20px,linear-gradient(#b7efc5,#7ae582)' },
  { id: 'prism',    name: 'Prism',        css: 'linear-gradient(90deg,#ff595e,#ffca3a,#8ac926,#1982c4,#6a4c93)' },
];

export const TITLES = [
  'Newbie', 'Blook Collector', 'Quiz Whiz', 'Gold Hoarder', 'Speed Racer', 'Pack Opener', 'Legend in Training',
  'Brainiac', 'Chest Champion', 'Night Owl', 'Homework Hero', 'Top of the Class', 'Blook Hunter', 'Lucky Duck',
  'Trivia Titan', 'Market Mogul', 'Chatterbox', 'Speedy Thinker', 'Certified Genius', 'Big Brain',
];
