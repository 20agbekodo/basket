# Handoff: NBA Universe — Salary-Space Explorer

## Overview
**NBA Universe** is an interactive 3D data-visualization web app. It plots NBA players as labeled, color-coded nodes floating in a dark 3D "universe." Each player is colored by whether they were **underpaid** (green), **overpaid** (red), or **fair value** (white) relative to an era-adjusted market value. Users can rotate/pan/zoom the universe, filter by many dimensions, click any node to inspect a player's profile, and **add themselves** (a "real," persisted, filterable player) by entering stats — getting a fun estimated salary back.

The aesthetic is **retro 1990s NBA / Space Jam nostalgia**: purple→teal gradients (Orlando Magic / Charlotte Hornets palette), neon yellow + hot-pink accents, chunky display fonts, polaroid-style headshots, and a cassette-tape loading screen.

## About the Design Files
The files in this bundle are **design references implemented in HTML/CSS/JS** (a working prototype using React via in-browser Babel + Three.js). They demonstrate the intended look, motion, and behavior — **they are not production code to copy verbatim.**

The task is to **recreate this experience in the target codebase's environment** using its established patterns, build tooling, and libraries. If the target app is React, port the components to real `.jsx`/`.tsx` with a proper bundler (no in-browser Babel) and a real 3D lib binding (e.g. `@react-three/fiber` wrapping Three.js). If no environment exists yet, React + Vite + react-three-fiber + TypeScript is the recommended stack. Keep the visual system pixel-faithful; modernize the implementation.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, motion, and interactions are all specified here and in the source files. Recreate the UI pixel-perfectly. The one approximation is data: stats/salaries are illustrative, and headshots are hotlinked from the public NBA CDN with a generated pixel-art fallback.

---

## Screens / Views

This is a **single-screen app** — one full-viewport 3D canvas with floating UI panels overlaid. There are no route changes; everything is panels, overlays, and modals on top of the persistent 3D scene.

### 1. Loading screen
- **Purpose:** Brand moment while Three.js + fonts initialize.
- **Layout:** Full-viewport flex column, centered. Title, subtitle, a CSS cassette graphic with two spinning reels, a gradient progress bar, and a sub-caption.
- **Components:**
  - Title "NBA UNIVERSE" — `Bungee`, clamp(28–58px), color `--neon` (#eaff2b), layered text-shadow (`4px 4px 0 #ff2d9b, 8px 8px 0 rgba(123,47,247,.6)`).
  - Cassette: 320×200 rounded card, two `.reel` circles spinning via `@keyframes reel-spin` (1.1s / 1.8s linear infinite), conic-gradient "tape" fill.
  - Progress bar: 320×16 pill, fill is `linear-gradient(90deg, teal, neon, pink)`, width driven 0→100% by JS over ~1.5s, then the loader fades out (`opacity .55s`) and is removed.
- **Behavior:** A `setInterval` increments width ~6–18% every 130ms; at 100% it adds `.hide` (opacity 0) after 280ms.

### 2. The Universe (3D canvas)
- **Purpose:** The core visualization — every player is a node.
- **Layout:** Fixed full-viewport `<canvas>` (z-index 0) with a radial vignette overlay (z-index 1) and a DOM label layer (z-index 2) above it.
- **Player representation:** There is **no visible dot** — each player IS a floating DOM "name box" (see Floating label). Hit-testing uses invisible Three.js sphere meshes; picking is **screen-space** (the box under the cursor, front-most by depth wins) so hover/click always matches the visible label.
- **Camera/controls:**
  - Auto-rotation (slow) when idle; pauses on hover/drag/selection/focus.
  - **Left-drag** = orbit (trackball via quaternion premultiply). **Shift- or right-drag** = pan. **Two-finger** = pinch-zoom + pan. **Scroll** = zoom (aggressive: step ×0.32, camera Z range 12–240, dolly lerp 0.18).
  - Selecting a node slerps it to face camera (+Z), dollies in (camZ→44), and pans scene left (so the right panel doesn't cover it).

### 3. Left sidebar — Filters (two sliding pages)
- **Purpose:** Filter which players are shown.
- **Layout:** Fixed panel, left:18 top:18 bottom:18, **width 308px**, radius 16, translucent dark (`--panel`, backdrop-blur 14px), 2px border `rgba(0,224,199,.35)`. Contains a 200%-wide flex track of two **pages** that slide horizontally (`transform: translateX(-50%)`, transition 0.36s).
- **Basic page components (top→bottom):**
  - `«` collapse button (absolute top-right; only rendered on the basic page).
  - **Search** input (autofocuses when the panel is expanded from collapsed). Enter = focus the matching node.
  - **Top Players** single range slider (5…N) — ranks by PER, shows the top N.
  - **Positions** — 5 toggle pills PG/SG/SF/PF/C (multi-select). Must fit on one row (this is why width is 308px).
  - **Source** — 3 single-select pills: All / Original / Added.
  - **Era** — two number steppers (from / to year).
  - **⚙ More filters ›** button → slides to advanced page.
  - **Legend** — 3 rows (green underpaid / red overpaid / white fair).
  - **↺ Reset Filters** button.
  - **Count line:** "<b>N</b> of M players in view".
- **Advanced page components:**
  - **‹ Back to basic filters** button (slides back).
  - **9 stat range rows** — PPG, RPG, APG, FG%, 3P%, FT%, PER, WS, BPM. Each row = label + two number steppers (lower/upper) + a **dual-handle slider**. Both controls are bound together. Granularity: **whole numbers for percentages (step 1), tenths for everything else (step 0.1)**.
  - Reset all + count line.
- **Collapsed state:** panel slides off-left (`translateX(calc(-100% - 28px))`, opacity 0). A floating **"≡ FILTERS"** button appears top-left (left:18 top:18) to re-open; re-opening focuses Search.

### 4. Right sidebar — Player profile
- **Purpose:** Detail view when a node is clicked. Slides in from the right (`transform: translateX(0)`, transition 0.38s cubic-bezier(.2,.8,.2,1)).
- **Layout:** Fixed, right:18 top:18 bottom:18, width 360px, same panel chrome.
- **Components:**
  - `✕` close button (top-right).
  - **Polaroid headshot** — see Polaroid spec below. Caption = team name.
  - Player name (`Bungee`, 23px, text-shadow `2px 2px 0 --purple`).
  - Meta tags row: position (teal pill), era (purple pill), team (translucent pill).
  - For **original** players only: **"View on NBA.com ↗"** link (blue pill) → `https://www.nba.com/player/{id}/{slug}`.
  - **Career Stats** — 3×3 grid (PPG, RPG, APG / FG%, 3P%, FT% / PER, WS, BPM). Hovering a cell for **500ms** pops a custom tooltip (portaled to `<body>`) showing the full stat name (e.g. "Points Per Game"), styled with `--panel-2` bg, 2px `--neon` border, `Archivo` font, rounded, with a downward arrow.
  - **Salary Reality Check** — card bordered by category color: "Best-year salary" + "Today's market value" rows, plus a delta badge ("Underpaid by $XM" / "Overpaid by $XM" / "Paid about right" / "Estimated market value" for user-added).
  - **Hardware** — All-Star / MVP / rings badges (only shown when count > 0; "No hardware yet" otherwise). *Note: render All-Star at most once.*
  - **Similar Players** — 5 clickable rows (nearest by stat vector), each with avatar chip + name + pos·era. Clicking selects that player.
  - For **added** players only: **"🗑 Delete this player"** button (removes node + localStorage entry).

### 5. Hover card (tooltip)
- **Purpose:** Quick preview above a hovered node. Fixed, 230px, `--panel-2` bg, 2px `--neon` border, upward arrow. Clamped to stay fully on-screen.
- **Content:** circular headshot + name + (era·pos·team), a PPG/RPG/APG row, salary + over/under badge, achievement pills.

### 6. Orange FAB
- Fixed bottom-right (right:26 bottom:26), 64×64, radius 18, `linear-gradient(150deg, #ff7a18, #e85d00)`, 3px `#ffce8a` border, orange glow. Hover: `rotate(90deg) scale(1.06)`. "+" icon. Opens the Add Player modal. Shifts left (right:396) when a profile is open.

### 7. Brand mark
- Fixed bottom-right, **right:104 bottom:22** (between the centered command-hint pill and the FAB). "🏀 NBA UNIVERSE" (`Bungee` 20px, pink shadow) + tagline "How much are YOU worth" (`VT323` 15px, teal). Fades out (`opacity 0`) while a profile is open.

### 8. Nav hint pill
- Fixed bottom-center, `VT323` 16px: "DRAG **rotate** · SHIFT / RIGHT-DRAG **pan** · SCROLL **zoom**" (bold parts in teal).

### 9. Live orientation compass
- Fixed top-right (right:20 top:16), 116px. SVG with three colored axes that rotate live with the universe quaternion: **X = pink, Y = neon-yellow, Z = teal**, plus a center ring + hub. Below it a 3-line legend mapping each axis to its current meaning, and a "⟲ reset view" hint.
- **Clicking the compass** snaps orientation back to identity (X→right, Y→up, Z→toward viewer) via quaternion slerp. Shifts left (right:396) when a profile is open.

### 10. Add Player modal
- Centered modal (max-width 600), `--neon` border, pop-in animation.
- Header: title + **🎲 Randomize** button (teal) + ✕.
- Fields: circular photo upload (drag/click), Name*, Position (PG/SG/SF/PF/C), Level (Recreational…Superstar), **Birth year*** (required; derives era as birthYear+25), Height (ft+in), Weight, optional Stats (PPG/FG%/3P%/FT%), optional Athleticism (Vertical/Wingspan/100m). All numeric fields use the custom stepper (native arrows hidden).
- **Randomize** fills all fields with coherent random values (position-appropriate height, derived weight, in-range stats, normal name) and a random cute-animal photo.
- Submit ("🏀 Add to Universe", disabled until Name + valid Birth year) → computes estimate → Salary Result modal.

### 11. Salary Result modal
- Animated staggered reveal: polaroid identity card (name, pos·level·height·era), a 3-segment **Low / Estimate / High** range display (green/neon/pink), a comparison line ("right around what {real player} pulled in…"), an optional fun disclaimer for Recreational/High-School levels, and a **"✨ View in the Graph"** CTA that adds the player as an orange ★ node and focuses it.

---

## Interactions & Behavior
- **Filtering** is reactive: any filter change re-runs `applyFilter(state)` which sets per-node `visible[id]`; the render loop fades/hides labels accordingly and updates the count.
- **Layout/Arrangement** (a Tweak): players animate (lerp 0.07/frame) between spatial layouts — **Stat Space** (default: X=PPG, Y=PER, Z=birth year; younger = forward), Galaxy (even sphere), Positions (clustered rings), Eras (year axis), Pay Tiers (underpaid float up, overpaid sink).
- **Motion/Energy** (a Tweak slider): scales auto-rotate speed + node pulse (currently tuned to half-speed feel).
- **Palette** (a Tweak): 4 retro colorways recolor CSS variables, starfield, and fog.
- **Add → persist → delete:** added players are saved to `localStorage` (`nba_universe_added_v2`), restored on load, counted in the total, fully filterable, and individually deletable.
- **Entrance/exit transitions:** panels slide (0.35–0.38s ease), modals pop (`cubic-bezier(.2,1.1,.3,1)`), labels fade by depth. Respect `prefers-reduced-motion` when porting.

## State Management
Top-level state (React `useState` in the prototype):
- `filters`: `{ query, topN, positions:Set, eraFrom, eraTo, source:'all'|'original'|'added', statRanges:{ field:[min,max] } }`
- `selected` (player|null), `hover` (player|null), `count` (number)
- `modal`: `null | 'add' | 'result'`, `result` (estimate object)
- `leftOpen` (bool), `leftPage`: `'basic'|'advanced'`
- Tweaks: `{ palette:[4 hex], arrangement, energy }` (persisted by the tweaks host)
- The 3D engine is an imperative controller (`Universe` class) the UI calls into (`applyFilter`, `setLayout`, `setEnergy`, `setPalette`, `selectById`, `addRealPlayer`, `removePlayer`, `recalibrate`, `recenter`, `focusOnSearch`) and which calls back (`onHover`, `onSelect`). When porting to react-three-fiber, this becomes a scene component + a store (zustand/context).
- **Data fetching:** none server-side. Headshots are `<img>` hotlinks to `https://cdn.nba.com/headshots/nba/latest/1040x760/{personId}.png` with `onError` → generated pixel-art avatar. Random photos use placeholder services (placedog.net / cataas.com).

## Design Tokens
Defined as CSS custom properties (see `styles.css` `:root`). Default "Magic '95" palette:
- **Purple** `#7b2ff7` · **Teal** `#00e0c7` · **Neon yellow** `#eaff2b` · **Hot pink** `#ff2d9b` · **Orange** `#ff7a18` (FAB/user)
- Category: **underpaid/green** `#00e37d` · **overpaid/red** `#ff3b5c` · **fair/white** `#ffffff`
- Space/bg: `#0a0518` (deepest) → `#140a2e` → `#1b1140`; panel `rgba(20,10,46,.82)`, panel-2 `rgba(30,16,64,.92)`
- Alt palettes (Tweak): Showtime gold `[#5b2a9e,#ffcf33,#ff7a18,#ff2d9b]`, Hornets teal `[#1d8a8a,#7b2ff7,#7dffd0,#ff2d9b]`, Night game `[#2a3fff,#00caff,#eef4ff,#ff2d9b]`
- **Radii:** sm 4 / md 8 / lg 16 / pill 999. Cards/pills mostly 7–16px.
- **Spacing:** 8px-based; panel padding 18px; field gaps ~7px.
- **Shadows:** panels `0 0 0 2px rgba(0,0,0,.5), 0 18px 50px rgba(0,0,0,.55)`; glows via `box-shadow` in currentColor.

## Typography
Google Fonts: **Bungee** (display/logo/headers), **Lilita One** (chunky buttons/names — `--font-chunky`), **Archivo** 400–800 (body/UI — `--font-body`), **VT323** (pixel/mono numbers, counters, labels — `--font-pixel`), **Permanent Marker** (polaroid caption).
Scale highlights: logo 20–25px, slide/section labels 12–13px uppercase, stat values 26px (VT323), body 13–14px, tooltips 12px.

## Polaroid spec (the headshot frame)
- Card: `linear-gradient(168deg,#fffefb,#f4f0e4)`, padding `11px 11px 34px` (wide bottom frame), radius 3px, `transform: rotate(-2.5deg)`, border `1px solid rgba(0,0,0,.12)`, shadow `0 16px 32px rgba(0,0,0,.62), 0 2px 4px rgba(0,0,0,.3), inset 0 0 0 1px rgba(255,255,255,.8)`, width 168px.
- Photo well: 146×146, radius 2, dark bg `#15131c`, inset shadow `inset 0 0 0 1px rgba(0,0,0,.35), inset 0 2px 8px rgba(0,0,0,.45)`, photo `object-fit: cover`.
- Caption: `Permanent Marker`, 14px, `#34302a`, `rotate(-0.6deg)`.

## Assets
- **Player headshots:** official NBA CDN, hotlinked by person ID — no files bundled. Map of ~52 player→ID is in `players.js` (`NBA_ID`). Profile links derive from ID + slug.
- **Random photos (Randomize):** placeholder services placedog.net (`?id=N`) and cataas.com — see `ANIMAL_PICS` in `modals.jsx`. *These are dev placeholders; swap for a licensed source if needed. The "animal in a jersey" intent isn't guaranteed by these services.*
- **Pixel-art avatars:** generated client-side on `<canvas>` (`avatars.js`) as a deterministic fallback — no image files.
- **Icons:** inline SVG (search, plus, hamburger) + a few emoji (🏀💍🏆⭐🎲) used as brand iconography.
- No proprietary fonts; all via Google Fonts.

## Files (in this bundle)
- `NBA Universe.html` — entry point; loads fonts, Three.js (r128), React 18 + Babel, then the scripts below.
- `players.js` — the player dataset, salary/era-fair overrides, category logic, NBA IDs → photo/profile URLs, similar-player computation.
- `universe.js` — the `Universe` Three.js controller: scene, starfield, nodes, raycast/screen-space picking, orbit/pan/zoom, layouts, projection of DOM labels, compass, add/remove player.
- `avatars.js` — deterministic pixel-art avatar generator (fallback headshots).
- `modals.jsx` — Add Player + Salary Result modals, the toy salary estimator, `PlayerImg` (photo+fallback), `NumStepper` (custom number stepper), randomize data.
- `app.jsx` — React overlay: left/right sidebars (incl. advanced dual-range filters), hover card, compass, FAB, brand mark, Tweaks panel, persistence, state wiring.
- `styles.css` — all visual styling and tokens.
- `tweaks-panel.jsx` — the in-design Tweaks panel shell (palette / arrangement / energy).

> When porting: replace the in-browser Babel + global-script setup with a real build; wrap the Three.js scene in your framework's idiomatic 3D binding; and move the imperative `Universe` API behind a store. Keep `styles.css` tokens as the source of truth for the visual system.
