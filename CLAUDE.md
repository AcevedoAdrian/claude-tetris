# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris implemented in vanilla JavaScript with HTML5 Canvas and CSS. No dependencies, no build step, no `package.json`. The entire game logic lives in a single file, `game.js` (~300 lines).

## Running

No install or build required — just serve/open `index.html`.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
# or simply
xdg-open index.html
```

There is no test suite, linter, or bundler in this repo. Verify changes by loading `index.html` in a browser and playing.

## Architecture

Three files cooperate directly, no modules/imports:

- **`index.html`** — DOM structure: `<canvas id="board">` (300×600, the 10×20 grid rendered at `BLOCK`=30px/cell) plus `<canvas id="next-canvas">` for the next-piece preview, a HUD panel (score/lines/level), and a shared overlay div used for both the pause and game-over states.
- **`style.css`** — dark/retro arcade visual theme as CSS variables in `:root`, redeclared per skin under `body[data-skin="neon|pastel|pixel"]` (retro uses the `:root` defaults).
- **`game.js`** — all game state and logic as top-level functions operating on module-level `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.). No classes, no state management library.

### Key mechanics in `game.js`

- **Board**: a `ROWS × COLS` matrix where each cell is `0` (empty) or a piece-color index `1–7` (see `COLORS`/`PIECES`).
- **Pieces**: defined as square matrices in `PIECES`; rotation is `rotateCW` (transpose + reverse rows), with basic wall-kick offsets tried in `tryRotate` (`[0, -1, 1, -2, 2]` column shifts).
- **Collision**: `collide(shape, ox, oy)` checks board bounds and existing fixed cells.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulates elapsed time in `dropAccum`, and advances the piece by one row once `dropInterval` is exceeded — otherwise calls `lockPiece()`.
- **Locking/clearing**: `lockPiece()` → `merge()` writes the piece into `board`, then `clearLines()` removes completed rows bottom-up and unshifts empty rows at the top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 pts/row dropped, soft drop adds 1 pt/row. **Combo**: consecutive `lockPiece()` calls that each clear at least one line increment `combo` (tracked via `registerCombo()`), adding `50 * (combo - 1) * level` bonus points per lock past the first; a lock that clears nothing resets `combo` to 0, while `maxCombo` retains the run's peak.
- **Records**: a local top-5 high-score table and best-combo/best-lines marks persist in `localStorage` (`tetris-records`, `tetris-best`) via the `storeGet`/`storeSet` helpers, shown on the start screen and game-over overlay.
- **Level/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level-1)*90)` ms.
- **Ghost piece**: `ghostY()` projects the current piece straight down to its landing row; drawn with `globalAlpha = 0.2` in `draw()`.
- **Skins**: `SKINS` maps `retro|neon|pastel|pixel` to a 15-entry color palette and a draw `style`. `applySkin(key)`/`initSkin()` set `activeSkin`/`activeColors`, toggle `body.dataset.skin` (drives the CSS variable overrides above), and persist to `localStorage` (`tetris-skin`). `drawBlock(context, x, y, colorIndex, size, alpha)` is a dispatcher that keeps its exact signature but delegates the actual fill to `drawFlatBlock`/`drawGlowBlock`/`drawRoundBlock`/`drawPixelBlock` based on `SKINS[activeSkin].style`.
- **Game over**: triggered in `spawn()` when a freshly spawned piece immediately collides.

Flow: `init()` builds the board, seeds `next`, calls `spawn()`, and starts `loop()` via `requestAnimationFrame`. Keyboard input is handled by a single `keydown` listener switching on `e.code` (arrows for move/soft-drop, `ArrowUp`/`KeyX` to rotate, `Space` for hard drop, `KeyP`/`Escape` to open a pause menu with resume/restart/controls/starting-level options). The restart button re-invokes `init()`.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval` (initial). If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS×BLOCK` × `ROWS×BLOCK`).
