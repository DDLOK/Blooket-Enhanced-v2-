# Blooket Enhanced v2

A free, open-source, Blooket-style quiz and blook-collecting game for schools. Teachers host live games, students join with a Game ID, everyone collects original blooks — and **nothing is behind a paywall**.

> Not affiliated with or endorsed by Blooket. All art in this project is original (blooks are drawn in code by `public/js/blookart.js`); no Blooket images, sounds or code are used.

## Features

**Games** (Blooket-style: everyone answers at their own pace, the fun happens between questions)
- **Live hosting** with a 6-digit Game ID, blook lobby, kick button, fullscreen host screen with live leaderboard + activity feed, late joining, win by **time** or by **goal**
- **Gold Rush** – answer to open chests: gold, double/triple, swipe gold from a classmate, swap, jackpot…
- **Crypto Heist** – pick a secret password, mine crypto, hack other players by guessing theirs
- **Fish Fest** – every correct answer casts your line; bigger fish as your lure levels up
- **Blook Factory** – hire blook workers that earn cash every second, upgrade them when your factory is full
- **Blook Race** – each correct answer moves your blook along the track; first to the finish wins
- **Showdown** – optional host-paced mode where everyone answers the same question together
- Sound effects (synthesized, no audio files) with a mute button
- **Solo practice** and **Homework** (shareable link, server-graded, teacher sees every student's best score)
- **History** – a report for every game you host, with CSV download
- Guests can play without an account; signed-in players earn tokens & XP

**31 official quizzes** on Discover (Math, Science, Geography, History, English, Spanish/French/Arabic, Technology, Arts, Health, Trivia) with subject filters

**Question sets** – create/edit, subjects, 2–4 answers (multiple correct allowed), per-question timers, public/private, Discover search, Favorites, bulk import (paste from a spreadsheet or CSV)

**Blooks** – 7 packs with 60 original blooks (+ 4 starters) across 8 rarities, pack-opening animation (open 1 or 10), My Blooks page with Blook Score star, rarity gems, locked silhouettes, sell duplicates, set your avatar, **custom blook maker** (12 per player)

**Social** – **Clubs** (create, join, club chat, club tags, club leaderboard), Bazaar (player market), leaderboards, live chat with a swear filter, news posts, profiles with **banners**, **titles** and **achievements**, daily **spin wheel** and **daily quests**

**Accounts** – sign up as a **student** or **teacher**; teacher accounts are approved or rejected by an admin. **Appearance settings**: 8 themes (incl. dark), background patterns, answer-color schemes (incl. colorblind friendly), bigger text, compact layout, reduce animations

**Admin panel** – teacher requests (approve / reject), roles (student / teacher / mod / admin), ban, mute, reset passwords, give tokens/blooks, unlock all, site name, announcement banner, school sign-up code, chat on/off, token rewards & daily caps, extra blocked words, "only teachers can host" switch. **The first account to sign up becomes the admin.**

## Deploying on Netlify

The site needs no build step. Static files are in `public/`, the backend runs on **Netlify Server** (`netlify/server/index.mjs`), and data is stored in **Netlify Database** (Postgres).

1. In Netlify, **Add new project → Import an existing project → GitHub** and pick this repo. The settings come from `netlify.toml` (publish `public`, Node 24).
2. Deploy. Netlify installs `@netlify/database`, which creates the database, and applies `netlify/database/migrations/` before publishing.
3. Open the site and **sign up — the first account becomes admin**. Then go to **Admin** and set a school sign-up code if you only want your school to join.

Notes:
- Netlify Server is in **Early Access** (free while it's in Early Access; it's on Netlify's credit-based plans, including Free). If your team doesn't have it, the deploy log will say so.
- The server is set to **one instance** (`scale.max = 1`) so every live game shares the same memory. It sleeps after 5 minutes with no traffic and wakes on the next visit (all data is saved in the database).
- If the database isn't connected, the site still runs but shows a red warning: data is then temporary.
- Deploying replaces the running server, which ends any live games in progress — don't deploy mid-class.

## Running it locally

Needs Node.js 22+ and **no `npm install`**:

```bash
node dev-server.mjs          # http://localhost:8888, data saved to ./data/db.json
node tests/smoke.mjs         # end-to-end test of the API and all three game modes (server must be running)
```

## Project layout

```
public/              the website (HTML, CSS, ES modules) — served by Netlify's CDN
  js/data.js         blooks, packs, rarities, banners, titles, game modes
  js/blookart.js     original SVG blook art generator + custom blook options
  js/app.js          router & shell; js/pages/* for each page
src/                 backend (shared by Netlify and the dev server)
  app.mjs            HTTP API + WebSocket routing
  games.mjs          live game engine (Classic, Gold Rush, Blook Race)
  store.mjs          in-memory store with Postgres (Netlify) / JSON file (local) persistence
netlify/server/      Netlify Server entry point (WebSockets via upgradeWebSocket)
netlify/database/    database migrations
dev-server.mjs       zero-dependency local server with its own WebSocket implementation
```

## License

Copyright (C) 2026 Blooket Enhanced v2 contributors.

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License v3** (or any later version) — see [`LICENSE`](LICENSE). If you share a modified version, you must share its source code under the same license.

Fonts: [Titan One](https://fonts.google.com/specimen/Titan+One) and [Nunito](https://fonts.google.com/specimen/Nunito), both under the SIL Open Font License, loaded from Google Fonts.
