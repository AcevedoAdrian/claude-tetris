'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#fff59d', // 8 - comodín (Tinte)
  '#f06292', // 9  - pentominó "+"
  '#4db6ac', // 10 - pentominó "U"
  '#9575cd', // 11 - pentominó "Y"
  '#ffffff', // 12 - single 1×1 (recompensa por Tetris)
  '#a1887f', // 13 - 3×3 hueca
  '#5c5c6e', // 14 - basura (modo desafío)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  null,                                        // 8 - hueco de WILD (no es una pieza)
  [[0,9,0],[9,9,9],[0,9,0]],                  // 9  - pentominó "+" (cruz)
  [[10,0,10],[10,10,10]],                     // 10 - pentominó "U"
  [[0,11],[11,11],[0,11],[0,11]],             // 11 - pentominó "Y"
  [[12]],                                      // 12 - single 1×1
  [[13,13,13],[13,0,13],[13,13,13]],          // 13 - 3×3 hueca
  null,                                        // 14 - basura (no es una pieza jugable)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const WILD = 8;                      // índice de bloque comodín (Tinte)
const SINGLE = 12;                   // pieza 1×1, recompensa exclusiva de un Tetris
const NO_ROTATE = new Set([SINGLE, 9, 13]); // 1×1, cruz "+" y 3×3 hueca: simétricas, no rotan
// Pesos de aparición de cada tipo de pieza (la 12/SINGLE no entra: solo llega como recompensa).
const PIECE_WEIGHTS = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 9: 8, 10: 8, 11: 8, 13: 6 };
const POWERUP_LINE_INTERVAL = 5;     // cada cuántas líneas eliminadas aparece una pieza especial
const POWER_BLOCK_SCORE = 10;        // pts por bloque destruido por un power-up (× level)
const FREEZE_MS = 5000;

const POWERS = ['BOMB', 'LIGHTNING', 'DYE', 'GRAVITY', 'FREEZE'];

const POWER_INFO = {
  BOMB:      { icon: '💣', label: 'BOMBA' },
  LIGHTNING: { icon: '⚡', label: 'RAYO' },
  DYE:       { icon: '🎨', label: 'TINTE' },
  GRAVITY:   { icon: '⬇️', label: 'GRAVEDAD' },
  FREEZE:    { icon: '❄️', label: 'CONGELAR' },
};

// ---- Modo desafío ----
const GARBAGE = 14;
const SPRINT_GOAL = 40;
const SPRINT_MS = 120000;           // 2 minutos
const GARBAGE_INTERVAL = 10000;     // 10 s
const CLASSIC_WEIGHTS = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10 };

// Patrón de obstáculos pre-colocados (de abajo hacia arriba); '#' = bloque fijo, '.' = hueco.
const PREFILL_PATTERN = [
  '.#..####.#',
  '#..#....#.',
  '..#.####..',
  '.####..##.',
  '#....##...',
  '.##.#..##.',
];

const MODS = [
  { key: 'sprint40',   icon: '🏁', title: '40 LÍNEAS',       desc: 'Limpia 40 líneas en 2:00' },
  { key: 'rising',     icon: '🧱', title: 'BASURA',          desc: 'Sube una fila cada 10 s' },
  { key: 'prefill',    icon: '🪨', title: 'TABLERO SUCIO',   desc: 'Empiezas con obstáculos' },
  { key: 'invisible',  icon: '👻', title: 'INVISIBLE',       desc: 'La pieza desaparece al apoyarse' },
  { key: 'reverseRot', icon: '🔄', title: 'ROTACIÓN INVERSA', desc: 'La rotación va al revés' },
];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const powerIndicatorEl = document.getElementById('power-indicator');
const freezeTimerEl = document.getElementById('freeze-timer');
const powerFlashEl = document.getElementById('power-flash');
const powerSectionEl = document.getElementById('power-section');
const modeMenuEl = document.getElementById('mode-menu');
const modeGridEl = document.getElementById('mode-grid');
const playBtn = document.getElementById('play-btn');
const menuBtn = document.getElementById('menu-btn');
const challengeHudEl = document.getElementById('challenge-hud');
const timeLeftEl = document.getElementById('time-left');
const goalProgressEl = document.getElementById('goal-progress');
const modsBadgesEl = document.getElementById('mods-badges');

const THEME_KEY = 'tetris-theme';

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, gridColor;
let linesSincePower, pendingPower, pendingSingle, freezeRemaining, flashTimeout;
let mods, challengeActive, running, timeRemaining, garbageAccum, selectedMods;

function applyTheme(isLight) {
  document.body.classList.toggle('light-mode', isLight);
  themeToggle.checked = isLight;
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  gridColor = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light');
}

themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked));

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type, power = null) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0, power };
}

function randomType() {
  const entries = Object.entries(challengeActive ? CLASSIC_WEIGHTS : PIECE_WEIGHTS);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll < 0) return Number(type);
  }
  return Number(entries[entries.length - 1][0]);
}

function randomPiece(power = null) {
  return makePiece(randomType(), power);
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[cols - 1 - c][r] = shape[r][c];
  return result;
}

function tryRotate() {
  if (NO_ROTATE.has(current.type)) return; // 1×1, cruz "+" y 3×3 hueca no rotan
  const rotated = mods.reverseRot ? rotateCCW(current.shape) : rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function pieceCenter() {
  let sumX = 0, sumY = 0, n = 0;
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c]) {
        sumX += current.x + c;
        sumY += current.y + r;
        n++;
      }
  return { cx: Math.round(sumX / n), cy: Math.round(sumY / n) };
}

function clearCells(cells) {
  let n = 0;
  for (const [r, c] of cells) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (board[r][c]) {
      board[r][c] = 0;
      n++;
    }
  }
  return n;
}

function applyBomb() {
  const { cx, cy } = pieceCenter();
  const cells = [];
  for (let r = cy - 1; r <= cy + 1; r++)
    for (let c = cx - 1; c <= cx + 1; c++)
      cells.push([r, c]);
  return clearCells(cells);
}

function applyLightning() {
  const { cx, cy } = pieceCenter();
  const cells = [];
  for (let c = 0; c < COLS; c++) cells.push([cy, c]);
  for (let r = 0; r < ROWS; r++) cells.push([r, cx]);
  return clearCells(cells);
}

function applyDye() {
  const targetType = current.type;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === targetType) board[r][c] = WILD;
  return 0;
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    const values = [];
    for (let r = 0; r < ROWS; r++) if (board[r][c]) values.push(board[r][c]);
    const empty = ROWS - values.length;
    for (let r = 0; r < ROWS; r++) board[r][c] = r < empty ? 0 : values[r - empty];
  }
  return 0;
}

function applyFreeze() {
  freezeRemaining = FREEZE_MS;
  return 0;
}

function applyPower() {
  let destroyed = 0;
  switch (current.power) {
    case 'BOMB': destroyed = applyBomb(); break;
    case 'LIGHTNING': destroyed = applyLightning(); break;
    case 'DYE': destroyed = applyDye(); break;
    case 'GRAVITY': destroyed = applyGravity(); break;
    case 'FREEZE': destroyed = applyFreeze(); break;
  }
  if (destroyed) score += destroyed * POWER_BLOCK_SCORE * level;
  flashPower(current.power);
}

function pushGarbage() {
  if (board[0].some(v => v)) {
    endGame('lose');
    return;
  }
  const gapCol = Math.floor(Math.random() * COLS);
  const row = new Array(COLS).fill(GARBAGE);
  row[gapCol] = 0;
  board.shift();
  board.push(row);

  current.y--;
  const pushedOffTop = current.shape.some((row, r) =>
    row.some((v, c) => v && current.y + r < 0));
  if (pushedOffTop || collide(current.shape, current.x, current.y)) {
    endGame('lose');
  }
}

function clearLines() {
  // Filas completas ANTES de tocar los comodines (los WILD cuentan como llenos).
  const fullRows = [];
  for (let r = 0; r < ROWS; r++)
    if (board[r].every(v => v !== 0)) fullRows.push(r);

  if (fullRows.length) {
    // Flood-fill de 4 direcciones desde cada comodín situado en una fila completa:
    // destruye en cadena todos los comodines conectados, aunque se salgan de esa fila.
    const visited = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    const stack = [];
    for (const r of fullRows)
      for (let c = 0; c < COLS; c++)
        if (board[r][c] === WILD) stack.push([r, c]);

    const wildCells = [];
    while (stack.length) {
      const [r, c] = stack.pop();
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || visited[r][c]) continue;
      if (board[r][c] !== WILD) continue;
      visited[r][c] = true;
      wildCells.push([r, c]);
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    if (wildCells.length) {
      const n = clearCells(wildCells);
      if (n) score += n * POWER_BLOCK_SCORE * level;
    }
  }

  // Elimina exactamente las filas detectadas como completas antes de la limpieza de comodines
  // (aunque ahora tengan huecos donde estaban los comodines destruidos).
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (fullRows.includes(r)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (!challengeActive) {
      linesSincePower += cleared;
      if (linesSincePower >= POWERUP_LINE_INTERVAL) {
        linesSincePower -= POWERUP_LINE_INTERVAL;
        pendingPower = true;
      }
      if (cleared === 4) pendingSingle = true; // Tetris: recompensa con la pieza 1×1
    }
    updateHUD();
    if (mods.sprint40 && lines >= SPRINT_GOAL) {
      endGame('win');
    }
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  if (current.power) applyPower();   // bomba/rayo/tinte/gravedad actúan sobre el board ya fusionado
  clearLines();                      // incluye la cadena de comodines
  if (current.power === 'GRAVITY') clearLines(); // la compactación puede haber formado líneas nuevas
  if (gameOver) return;
  spawn();
}

function spawn() {
  current = next;
  if (pendingSingle) {
    // La 1×1 nunca lleva power-up; si también había un power-up pendiente, se conserva
    // para el turno siguiente en vez de perderse.
    next = makePiece(SINGLE);
    pendingSingle = false;
  } else {
    next = randomPiece(pendingPower ? POWERS[Math.floor(Math.random() * POWERS.length)] : null);
    pendingPower = false;
  }
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;

  if (current && current.power) {
    const info = POWER_INFO[current.power];
    powerIndicatorEl.textContent = `${info.icon} ${info.label}`;
    powerIndicatorEl.classList.add('active');
  } else {
    powerIndicatorEl.textContent = '—';
    powerIndicatorEl.classList.remove('active');
  }

  if (freezeRemaining > 0) {
    freezeTimerEl.textContent = `❄️ ${(freezeRemaining / 1000).toFixed(1)}s`;
    freezeTimerEl.classList.remove('hidden');
  } else {
    freezeTimerEl.classList.add('hidden');
  }

  if (mods.sprint40) {
    const s = Math.ceil(timeRemaining / 1000);
    timeLeftEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timeLeftEl.classList.toggle('time-low', timeRemaining <= 30000);
    goalProgressEl.textContent = `${Math.min(lines, SPRINT_GOAL)} / ${SPRINT_GOAL}`;
  }
}

function flashPower(power) {
  const info = POWER_INFO[power];
  powerFlashEl.textContent = `${info.icon} ${info.label}`;
  powerFlashEl.classList.remove('hidden');
  // reinicia la animación CSS
  powerFlashEl.classList.remove('flash-run');
  void powerFlashEl.offsetWidth;
  powerFlashEl.classList.add('flash-run');
  clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => {
    powerFlashEl.classList.add('hidden');
  }, 1200);
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  let a = alpha ?? 1;
  if (colorIndex === WILD) {
    // los comodines "respiran" para distinguirse del resto de bloques
    a *= 0.65 + 0.35 * Math.sin(performance.now() / 220);
  }
  context.globalAlpha = a;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawPowerOverlay(context, shape, ox, oy, size, power) {
  const info = POWER_INFO[power];
  if (!info) return;

  const glow = 6 + 4 * Math.sin(performance.now() / 180);
  context.save();
  context.shadowColor = '#fff8c4';
  context.shadowBlur = glow;
  context.strokeStyle = '#fff8c4';
  context.lineWidth = 2;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c])
        context.strokeRect((ox + c) * size + 1.5, (oy + r) * size + 1.5, size - 3, size - 3);
  context.restore();

  // icono centrado sobre el centro geométrico de la pieza
  let sumX = 0, sumY = 0, n = 0;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) { sumX += c; sumY += r; n++; }
  const cx = (ox + sumX / n + 0.5) * size;
  const cy = (oy + sumY / n + 0.5) * size;

  context.save();
  context.font = `${Math.round(size * 0.7)}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(info.icon, cx, cy);
  context.restore();
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  const gy = ghostY();
  const landed = collide(current.shape, current.x, current.y + 1);
  const hideCurrent = mods.invisible && landed;

  // ghost (oculto en el modo de piezas invisibles: delataría el punto de aterrizaje)
  if (!mods.invisible) {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
  }

  // current piece (oculta en el instante en que toca el suelo, si el modificador está activo)
  if (!hideCurrent) {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

    if (current.power) drawPowerOverlay(ctx, current.shape, current.x, current.y, BLOCK, current.power);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const w = shape[0].length, h = shape.length;
  const NB = Math.min(30, Math.floor(Math.min(nextCanvas.width / w, nextCanvas.height / h)));
  const offX = (nextCanvas.width - w * NB) / 2 / NB;
  const offY = (nextCanvas.height - h * NB) / 2 / NB;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);

  if (next.power) drawPowerOverlay(nextCtx, shape, offX, offY, NB, next.power);
}

function endGame(result = 'lose') {
  gameOver = true;
  running = false;
  cancelAnimationFrame(animId);
  if (result === 'win') {
    overlayTitle.textContent = '¡DESAFÍO SUPERADO!';
    overlayTitle.classList.add('win');
  } else if (result === 'timeout') {
    overlayTitle.textContent = 'TIEMPO AGOTADO';
    overlayTitle.classList.remove('win');
  } else {
    overlayTitle.textContent = 'GAME OVER';
    overlayTitle.classList.remove('win');
  }
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  menuBtn.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayTitle.classList.remove('win');
    overlayScore.textContent = '';
    menuBtn.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;

  if (mods.sprint40) {
    timeRemaining = Math.max(0, timeRemaining - dt);
    if (timeRemaining <= 0) {
      endGame('timeout');
      return;
    }
    updateHUD();
  }

  if (mods.rising) {
    garbageAccum += dt;
    if (garbageAccum >= GARBAGE_INTERVAL) {
      garbageAccum -= GARBAGE_INTERVAL;
      pushGarbage();
      if (gameOver) return;
    }
  }

  if (freezeRemaining > 0) {
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    dropAccum = 0; // Congelar: la pieza no cae sola mientras dure el efecto
    updateHUD();
  } else {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  if (gameOver) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function applyPrefill() {
  const patternRows = PREFILL_PATTERN.length;
  for (let i = 0; i < patternRows; i++) {
    const boardRow = ROWS - patternRows + i;
    const patternRow = PREFILL_PATTERN[i];
    for (let c = 0; c < COLS; c++)
      if (patternRow[c] === '#') board[boardRow][c] = GARBAGE;
  }
}

function init() {
  board = createBoard();
  if (mods.prefill) applyPrefill();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  running = true;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  linesSincePower = 0;
  pendingPower = false;
  pendingSingle = false;
  freezeRemaining = 0;
  timeRemaining = SPRINT_MS;
  garbageAccum = 0;
  clearTimeout(flashTimeout);
  powerFlashEl.classList.add('hidden');
  next = randomPiece();
  spawn();
  overlayTitle.classList.remove('win');
  powerSectionEl.classList.toggle('hidden', challengeActive);
  challengeHudEl.classList.toggle('hidden', !mods.sprint40);
  renderModsBadges();
  updateHUD();
  modeMenuEl.classList.add('hidden');
  overlayTitle.classList.remove('hidden');
  overlayScore.classList.remove('hidden');
  restartBtn.classList.remove('hidden');
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function renderModsBadges() {
  modsBadgesEl.innerHTML = '';
  if (!challengeActive) return;
  for (const mod of MODS) {
    if (!mods[mod.key]) continue;
    const span = document.createElement('span');
    span.className = 'mod-badge';
    span.title = mod.title;
    span.textContent = mod.icon;
    modsBadgesEl.appendChild(span);
  }
}

function buildModeMenu() {
  selectedMods = {};
  modeGridEl.innerHTML = '';
  for (const mod of MODS) {
    selectedMods[mod.key] = false;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'mode-card';
    card.dataset.key = mod.key;
    card.innerHTML = `<span class="mode-card-icon">${mod.icon}</span>
      <span class="mode-card-title">${mod.title}</span>
      <span class="mode-card-desc">${mod.desc}</span>`;
    card.addEventListener('click', () => {
      selectedMods[mod.key] = !selectedMods[mod.key];
      card.classList.toggle('selected', selectedMods[mod.key]);
      updatePlayBtnLabel();
    });
    modeGridEl.appendChild(card);
  }
  updatePlayBtnLabel();
}

function updatePlayBtnLabel() {
  const any = Object.values(selectedMods).some(Boolean);
  playBtn.textContent = any ? 'JUGAR (DESAFÍO)' : 'JUGAR (CLÁSICO)';
}

function showMenu() {
  running = false;
  gameOver = false;
  paused = false;
  cancelAnimationFrame(animId);
  for (const card of modeGridEl.children) {
    const key = card.dataset.key;
    selectedMods[key] = false;
    card.classList.remove('selected');
  }
  updatePlayBtnLabel();
  modeMenuEl.classList.remove('hidden');
  overlayTitle.classList.add('hidden');
  overlayScore.classList.add('hidden');
  restartBtn.classList.add('hidden');
  menuBtn.classList.add('hidden');
  overlay.classList.remove('hidden');
}

function startGame() {
  mods = { ...selectedMods };
  challengeActive = Object.values(mods).some(Boolean);
  init();
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (!running || paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', startGame);
playBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', showMenu);

initTheme();
buildModeMenu();
showMenu();
