'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Paleta base (retro, modo oscuro). Los índices 1-7 son piezas, 8 comodín, 9-13 especiales, 14 basura.
const RETRO_COLORS = [
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

// Paleta activa: se reasigna en applyPalette() según skin + modo claro/oscuro.
let COLORS = RETRO_COLORS;

// ---- Skins (temas visuales) ----
// Cada función de bloque recibe (context, px, py, size, color): px/py en píxeles.
function blockRetro(context, px, py, size, color) {
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px + 1, py + 1, size - 2, 4);
}

function blockNeon(context, px, py, size, color) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = size * 0.5;
  context.fillStyle = color;
  context.fillRect(px + 3, py + 3, size - 6, size - 6);
  // núcleo más claro para reforzar el brillo
  context.shadowBlur = 0;
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fillRect(px + 5, py + 5, size - 10, size - 10);
  context.restore();
}

// Traza un rectángulo redondeado (roundRect con fallback manual usando arcTo).
function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, w, h, r);
    return;
  }
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function blockPastel(context, px, py, size, color) {
  const r = size * 0.28;
  roundedRectPath(context, px + 1.5, py + 1.5, size - 3, size - 3, r);
  context.fillStyle = color;
  context.fill();
  // brillo suave arriba
  roundedRectPath(context, px + 4, py + 3.5, size - 8, size * 0.22, size * 0.1);
  context.fillStyle = 'rgba(255,255,255,0.35)';
  context.fill();
}

function blockPixel(context, px, py, size, color) {
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  // textura: rejilla de "píxeles" 5x5 alternando claros y oscuros
  const n = 5;
  const cell = (size - 2) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i + j) % 2 === 0) continue;
      context.fillStyle = (i + j) % 4 === 1 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
      context.fillRect(px + 1 + i * cell, py + 1 + j * cell, cell, cell);
    }
  }
  // borde duro
  context.strokeStyle = 'rgba(0,0,0,0.55)';
  context.lineWidth = 1;
  context.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
}

const SKINS = {
  retro: {
    name: 'Retro',
    dark: RETRO_COLORS,
    light: RETRO_COLORS,
    drawBlock: blockRetro,
  },
  neon: {
    name: 'Neon',
    dark: [
      null,
      '#00f0ff', '#ffee00', '#d500f9', '#39ff14', '#ff1744', '#2979ff', '#ff9100',
      '#ffffaa', '#ff2d95', '#00ffc8', '#b388ff', '#ffffff', '#ff6e40', '#6a6a8a',
    ],
    light: [
      null,
      '#00a5b5', '#c9b800', '#a100c2', '#1fb800', '#d50032', '#1a5fe0', '#e07000',
      '#b8a800', '#d81b78', '#00a884', '#7c4dff', '#555555', '#e64a19', '#7a7a8a',
    ],
    drawBlock: blockNeon,
  },
  pastel: {
    name: 'Pastel',
    dark: [
      null,
      '#a8e6ef', '#fff2b3', '#d7b8e8', '#b8e6bf', '#f5b8b8', '#b8d4f5', '#ffd4a8',
      '#fffbc9', '#f7bcd2', '#a8dcd6', '#c8b8ea', '#ffffff', '#d3c2ba', '#8e8ea0',
    ],
    light: [
      null,
      '#7fcfdc', '#f5d76e', '#c39bd9', '#8fd19b', '#ee9a9a', '#93bdee', '#f7b877',
      '#f0e08a', '#ee9ab8', '#7cc9c1', '#ab96dd', '#e8e8f0', '#bfa89e', '#a6a6b8',
    ],
    drawBlock: blockPastel,
  },
  pixel: {
    name: 'Pixel art',
    dark: [
      null,
      '#29b6f6', '#fbc02d', '#8e44ad', '#43a047', '#e53935', '#3f6fd8', '#fb8c00',
      '#fff176', '#d81b60', '#00897b', '#7e57c2', '#eeeeee', '#8d6e63', '#616161',
    ],
    light: [
      null,
      '#0288d1', '#f9a825', '#7b1fa2', '#2e7d32', '#c62828', '#283593', '#ef6c00',
      '#d4b800', '#ad1457', '#00695c', '#5e35b1', '#9e9e9e', '#6d4c41', '#424242',
    ],
    drawBlock: blockPixel,
  },
};
const SKIN_ORDER = ['retro', 'neon', 'pastel', 'pixel'];

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

const skinSelect = document.getElementById('skin-select');

const THEME_KEY = 'tetris-theme';
const SKIN_KEY = 'tetris-skin';
const SCORES_KEY = 'tetris-highscores';
const LAST_NAME_KEY = 'tetris-last-name';
const MAX_SCORES = 5;
const COMBO_BONUS = 50;             // pts extra = COMBO_BONUS × (combo - 1) × level, desde combo >= 2

const comboEl = document.getElementById('combo');
const menuScoresEl = document.getElementById('menu-scores');
const gameoverExtraEl = document.getElementById('gameover-extra');
const gameoverScoresEl = document.getElementById('gameover-scores');
const nameEntryEl = document.getElementById('name-entry');
const nameInputEl = document.getElementById('name-input');
const START_LEVEL_KEY = 'tetris-start-level';
const MAX_START_LEVEL = 15;

// Elementos del menú de pausa
const pauseMenuEl = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsToggleBtn = document.getElementById('controls-toggle-btn');
const pauseControlsEl = document.getElementById('pause-controls');
const startLevelSelect = document.getElementById('start-level-select');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, gridColor, currentSkin;
let startLevel = 1;          // nivel inicial de la partida en curso
let selectedStartLevel = 1;  // nivel elegido para la PRÓXIMA partida
let linesSincePower, pendingPower, pendingSingle, freezeRemaining, flashTimeout;
let gameRecordFlags = {};
let combo, maxCombo, lockCleared, pendingEntry, lastSavedIndex;
let mods, challengeActive, running, timeRemaining, garbageAccum, selectedMods;

// ---- Tabla de récords (localStorage) ----
function emptyRecords() {
  return { entries: [], bestCombo: 0, maxLines: 0 };
}

function isValidEntry(e) {
  return e && typeof e === 'object' && typeof e.name === 'string' &&
    Number.isFinite(e.score) && Number.isFinite(e.lines) &&
    Number.isFinite(e.level) && Number.isFinite(e.maxCombo) && Array.isArray(e.mods);
}

// Lectura defensiva: JSON corrupto, forma inesperada o localStorage no disponible -> tabla vacía.
function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(SCORES_KEY));
    if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) return emptyRecords();
    const entries = data.entries.filter(isValidEntry)
      .map(e => ({ ...e, mods: e.mods.filter(k => typeof k === 'string') }))
      .sort((a, b) => b.score - a.score).slice(0, MAX_SCORES);
    return {
      entries,
      bestCombo: Number.isFinite(data.bestCombo) ? data.bestCombo : 0,
      maxLines: Number.isFinite(data.maxLines) ? data.maxLines : 0,
    };
  } catch (err) {
    return emptyRecords();
  }
}

function saveRecords(rec) {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(rec)); } catch (err) { /* sin almacenamiento */ }
}

function loadLastName() {
  try { return localStorage.getItem(LAST_NAME_KEY) || ''; } catch (err) { return ''; }
}

// Posición (0-based) que ocuparía la puntuación en el top, o -1 si no entra (o es 0).
function scoreRank(rec, s) {
  if (s <= 0) return -1;
  let idx = rec.entries.findIndex(e => s > e.score);
  if (idx === -1) idx = rec.entries.length;
  return idx < MAX_SCORES ? idx : -1;
}

function activeModKeys() {
  return challengeActive ? MODS.filter(m => mods[m.key]).map(m => m.key) : [];
}

// Renderiza la tabla en un contenedor. Solo createElement/textContent (los nombres son entrada de usuario).
function renderScores(container, highlightIdx = -1, newRecords = {}) {
  const rec = loadRecords();
  container.textContent = '';
  const title = document.createElement('p');
  title.className = 'scores-title';
  title.textContent = 'MEJORES PUNTUACIONES';
  container.appendChild(title);

  if (!rec.entries.length) {
    const empty = document.createElement('p');
    empty.className = 'scores-empty';
    empty.textContent = 'Aún no hay récords';
    container.appendChild(empty);
  } else {
    const table = document.createElement('table');
    table.className = 'scores-table';
    rec.entries.forEach((e, i) => {
      const tr = document.createElement('tr');
      if (i === highlightIdx) tr.className = 'highlight';
      const badges = e.mods.map(k => (MODS.find(m => m.key === k) || {}).icon).filter(Boolean).join('');
      const cells = [`${i + 1}.`, e.name, e.score.toLocaleString(), `${e.lines}L`, `x${e.maxCombo}`, badges];
      cells.forEach((text, j) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (j === 1) td.className = 'scores-name';
        tr.appendChild(td);
      });
      tr.title = `Nivel ${e.level}`;
      table.appendChild(tr);
    });
    container.appendChild(table);
  }

  const glob = document.createElement('p');
  glob.className = 'scores-global';
  glob.textContent = `Mejor combo: ${rec.bestCombo}${newRecords.combo ? ' ★' : ''} · Líneas máx: ${rec.maxLines}${newRecords.lines ? ' ★' : ''}`;
  container.appendChild(glob);

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'scores-reset';
  reset.textContent = 'Resetear récords';
  reset.addEventListener('click', () => {
    if (!confirm('¿Borrar todos los récords?')) return;
    try { localStorage.removeItem(SCORES_KEY); } catch (err) { /* nada */ }
    pendingEntry = null;
    nameEntryEl.classList.add('hidden');
    renderScores(menuScoresEl);
    renderScores(gameoverScoresEl);
  });
  container.appendChild(reset);
}

function submitScore(e) {
  e.preventDefault();
  if (!pendingEntry) return;
  const name = nameInputEl.value.trim().slice(0, 12) || 'Jugador';
  try { localStorage.setItem(LAST_NAME_KEY, name); } catch (err) { /* nada */ }
  const rec = loadRecords();
  const entry = { ...pendingEntry, name };
  let idx = rec.entries.findIndex(x => entry.score > x.score);
  if (idx === -1) idx = rec.entries.length;
  rec.entries.splice(idx, 0, entry);
  rec.entries = rec.entries.slice(0, MAX_SCORES);
  saveRecords(rec);
  pendingEntry = null;
  nameEntryEl.classList.add('hidden');
  renderScores(gameoverScoresEl, idx < MAX_SCORES ? idx : -1, gameRecordFlags);
  renderScores(menuScoresEl);
}

// Lee/guarda localStorage sin romper si está bloqueado (modo privado, etc.).
function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* sin persistencia */ }
}

// Reasigna la paleta y el color de la rejilla según skin + tema, y fuerza el redibujado.
function applyPalette() {
  const isLight = document.body.classList.contains('light-mode');
  const skin = SKINS[currentSkin] || SKINS.retro;
  COLORS = isLight ? skin.light : skin.dark;
  gridColor = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  redrawAll();
}

// Redibuja tablero y preview solo si hay partida con estado válido.
function redrawAll() {
  if (!running || !board || !current) return;
  draw();
  if (next) drawNext();
}

function applyTheme(isLight) {
  document.body.classList.toggle('light-mode', isLight);
  themeToggle.checked = isLight;
  storageSet(THEME_KEY, isLight ? 'light' : 'dark');
  applyPalette();
}

function applySkin(name) {
  if (!SKINS[name]) name = 'retro';
  currentSkin = name;
  document.body.dataset.skin = name;
  skinSelect.value = name;
  storageSet(SKIN_KEY, name);
  applyPalette();
}

function initTheme() {
  currentSkin = 'retro';
  const savedSkin = storageGet(SKIN_KEY);
  applySkin(SKINS[savedSkin] ? savedSkin : 'retro');
  applyTheme(storageGet(THEME_KEY) === 'light');
}

themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked));
skinSelect.addEventListener('change', () => applySkin(skinSelect.value));

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
    level = startLevel + Math.floor(lines / 10);
    // Combo: +1 una sola vez por bloqueo (GRAVITY llama dos veces a clearLines).
    // Bonus = COMBO_BONUS × (combo - 1) × level: el 2.º bloqueo consecutivo con línea da 50 × level.
    if (!lockCleared) {
      lockCleared = true;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      if (combo >= 2) score += COMBO_BONUS * (combo - 1) * level;
    }
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
  lockCleared = false;
  merge();
  if (current.power) applyPower();   // bomba/rayo/tinte/gravedad actúan sobre el board ya fusionado
  clearLines();                      // incluye la cadena de comodines
  if (current.power === 'GRAVITY') clearLines(); // la compactación puede haber formado líneas nuevas
  if (!lockCleared) combo = 0;       // bloqueo sin líneas: se rompe el combo
  updateHUD();
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
  comboEl.textContent = combo;

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
  // save/restore aísla shadowBlur y demás estados que ponga la skin
  context.save();
  context.globalAlpha = a;
  (SKINS[currentSkin] || SKINS.retro).drawBlock(context, x * size, y * size, size, color);
  context.restore();
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
  // Récords: globales (combo/líneas) y posible entrada en el top 5.
  const rec = loadRecords();
  gameRecordFlags = { combo: maxCombo > rec.bestCombo, lines: lines > rec.maxLines };
  if (gameRecordFlags.combo) rec.bestCombo = maxCombo;
  if (gameRecordFlags.lines) rec.maxLines = lines;
  const rank = scoreRank(rec, score);
  if (gameRecordFlags.combo || gameRecordFlags.lines) saveRecords(rec);
  gameoverExtraEl.classList.remove('hidden');
  if (rank >= 0) {
    pendingEntry = { score, lines, level, maxCombo, mods: activeModKeys() };
    nameInputEl.value = loadLastName();
    nameEntryEl.classList.remove('hidden');
    renderScores(gameoverScoresEl, -1, gameRecordFlags); // la fila propia se resalta al guardar
    setTimeout(() => { nameInputEl.focus(); nameInputEl.select(); }, 0);
  } else {
    pendingEntry = null;
    nameEntryEl.classList.add('hidden');
    renderScores(gameoverScoresEl, -1, gameRecordFlags);
  }
  menuBtn.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

// Lee el nivel inicial guardado (1–MAX_START_LEVEL)
function loadStartLevel() {
  let n = 1;
  try { n = parseInt(localStorage.getItem(START_LEVEL_KEY), 10); } catch (_) { /* sin storage */ }
  selectedStartLevel = Math.min(MAX_START_LEVEL, Math.max(1, n || 1));
}

function buildPauseMenu() {
  for (let i = 1; i <= MAX_START_LEVEL; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    startLevelSelect.appendChild(opt);
  }
  startLevelSelect.value = selectedStartLevel;
}

// Oculta el menú de pausa y restaura el estado normal del overlay
function hidePauseMenu() {
  pauseMenuEl.classList.add('hidden');
  pauseControlsEl.classList.add('hidden');
  controlsToggleBtn.setAttribute('aria-expanded', 'false');
  overlayTitle.classList.remove('hidden');
  overlayScore.classList.remove('hidden');
  restartBtn.classList.remove('hidden');
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (!paused) {
    hidePauseMenu();
    overlay.classList.add('hidden');
    if (document.activeElement) document.activeElement.blur();
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.classList.add('hidden');
    overlayScore.classList.add('hidden');
    restartBtn.classList.add('hidden');
    gameoverExtraEl.classList.add('hidden');
    menuBtn.classList.add('hidden');
    startLevelSelect.value = selectedStartLevel;
    pauseMenuEl.classList.remove('hidden');
    overlay.classList.remove('hidden');
    resumeBtn.focus();
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
  startLevel = selectedStartLevel;
  level = startLevel;
  paused = false;
  gameOver = false;
  running = true;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  linesSincePower = 0;
  pendingPower = false;
  pendingSingle = false;
  freezeRemaining = 0;
  timeRemaining = SPRINT_MS;
  combo = 0;
  maxCombo = 0;
  lockCleared = false;
  pendingEntry = null;
  gameRecordFlags = {};
  gameoverExtraEl.classList.add('hidden');
  nameEntryEl.classList.add('hidden');
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
  hidePauseMenu();
  if (document.activeElement) document.activeElement.blur();
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
  gameoverExtraEl.classList.add('hidden');
  pendingEntry = null;
  renderScores(menuScoresEl);
  pauseMenuEl.classList.add('hidden');
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
  if (e.target && e.target.tagName === 'INPUT') return; // escribiendo el nombre: no capturar teclas
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  if (paused) {
    // Menú abierto: las teclas de juego no actúan ni activan el botón enfocado
    if (e.target !== startLevelSelect &&
        ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyX'].includes(e.code)) {
      e.preventDefault();
    }
    return;
  }
  if (!running || gameOver) return;
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

nameEntryEl.addEventListener('submit', submitScore);
// Evita que Space (keyup) active el botón enfocado con el menú de pausa abierto
document.addEventListener('keyup', e => {
  if (paused && e.code === 'Space' && e.target !== startLevelSelect) e.preventDefault();
});

restartBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', startGame);
controlsToggleBtn.addEventListener('click', () => {
  const open = pauseControlsEl.classList.toggle('hidden') === false;
  controlsToggleBtn.setAttribute('aria-expanded', String(open));
});
startLevelSelect.addEventListener('change', () => {
  selectedStartLevel = parseInt(startLevelSelect.value, 10);
  try { localStorage.setItem(START_LEVEL_KEY, selectedStartLevel); } catch (_) { /* sin storage */ }
  startLevelSelect.blur();
});
playBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', showMenu);

initTheme();
loadStartLevel();
buildPauseMenu();
buildModeMenu();
showMenu();
