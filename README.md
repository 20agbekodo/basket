# NBA Universe

A 3D interactive visualization of NBA players across all eras. Explore 254 players mapped in space by stats, salary value, or era — click any player to dive into their profile, compare two players head-to-head, and bookmark your favorites.

## Features

- **3D player universe** — players rendered as glowing orbs in Three.js, orbitable with mouse/touch
- **Multiple layouts** — Stat Space (PPG × PER × Year), Era Clusters, Salary Tiers, or Random
- **Custom axis mapping** — remap X/Y/Z to any stat (PPG, RPG, APG, FG%, PER, WS, BPM, Salary…)
- **Player profiles** — side panel with career stats, salary vs. market value, and 5 similar players
- **Compare mode** — radar chart comparison between any two players across 6 dimensions
- **Favorites** — bookmark players with ★, filter the universe to favorites only
- **Similar player lines** — visual connections from a selected player to their 5 closest peers
- **Add your own players** — create custom entries with stats, photo, and salary
- **Shareable URLs** — layout, palette, and selected player encoded in the URL hash
- **254 built-in players** — from Pete Maravich and Kareem to Wembanyama and Stephon Castle

## Stack

- React 19 + TypeScript + Vite
- Three.js (plain, no R3F) for the 3D scene
- All data computed client-side — no backend, no API calls
- `localStorage` for favorites and added players

## Getting started

```bash
npm install
npm run dev
```

## Build & deploy

```bash
npm run build   # outputs to dist/
```

Deploy to **Cloudflare Pages**: connect the repo and set build command `npm run build`, output directory `dist`.

## Adding players

Player data lives in `data/players.ts`. Each entry covers peak-season stats (PPG, RPG, APG, FG%, 3P%, FT%, PER, WS, BPM), career accolades (All-Star selections, MVPs, rings), and salary vs. today's estimated market value.

To add a player, append a row to `ROWS`, a salary entry to `SAL`, and optionally an NBA.com person ID to `NBA_ID` for the headshot. KNN similarity is recomputed automatically at module load.
