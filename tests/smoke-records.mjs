// Smoke test e2e sin navegador: carga game.js en un contexto vm con un DOM y
// localStorage falsos, y ejercita la mecánica de combo + records vía __TEST__.
// Simplificación: __TEST__ se inyecta como objeto vacío ANTES de ejecutar game.js;
// un segundo script (mismo contexto vm) le asigna referencias a las funciones y
// getters de variables module-level que game.js declara con `let` en top level,
// sin tener que modificar game.js para exportarlas.

import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gameSrc = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

let passCount = 0;
let failCount = 0;
function check(label, cond) {
  if (cond) {
    console.log(`PASS: ${label}`);
    passCount++;
  } else {
    console.log(`FAIL: ${label}`);
    failCount++;
  }
}

// ---- classList falso: Set con add/remove/toggle/contains ----
function makeClassList() {
  const set = new Set();
  return {
    add: (...cls) => cls.forEach(c => set.add(c)),
    remove: (...cls) => cls.forEach(c => set.delete(c)),
    toggle(cls, force) {
      if (force === undefined) {
        if (set.has(cls)) { set.delete(cls); return false; }
        set.add(cls); return true;
      }
      if (force) set.add(cls); else set.delete(cls);
      return force;
    },
    contains: cls => set.has(cls),
  };
}

// ---- Proxy que absorbe cualquier método/propiedad, para el contexto 2D del canvas ----
function makeCtxProxy() {
  return new Proxy({}, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'then') return undefined; // evita que se confunda con un thenable
      return (...args) => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

class HTMLInputElement {}

function makeElement(id) {
  const listeners = {};
  const el = {
    id,
    classList: makeClassList(),
    dataset: {},
    style: {},
    textContent: '',
    innerHTML: '',
    value: '',
    checked: false,
    children: [],
    addEventListener(type, handler) {
      (listeners[type] = listeners[type] || []).push(handler);
    },
    dispatch(type, evt) {
      (listeners[type] || []).forEach(h => h(evt));
    },
    appendChild(child) {
      el.children.push(child);
      return child;
    },
    getContext: () => makeCtxProxy(),
    focus() {},
    offsetWidth: 0,
  };
  return el;
}

// player-name debe ser instancia de HTMLInputElement para el `instanceof` del handler de teclado.
function makeInputElement(id) {
  const base = makeElement(id);
  const input = Object.setPrototypeOf(base, HTMLInputElement.prototype);
  return input;
}

const elementIds = [
  'board', 'next-canvas', 'score', 'lines', 'level', 'overlay', 'overlay-title',
  'overlay-score', 'restart-btn', 'theme-toggle', 'power-indicator', 'freeze-timer',
  'power-flash', 'power-section', 'mode-menu', 'mode-grid', 'play-btn', 'menu-btn',
  'challenge-hud', 'time-left', 'goal-progress', 'mods-badges', 'combo-value',
  'records-panel', 'records-list', 'reset-records-btn', 'name-form', 'save-record-btn',
];

const elements = {};
for (const id of elementIds) elements[id] = makeElement(id);
elements['player-name'] = makeInputElement('player-name');

const bodyListeners = {};
const documentListeners = {};
const fakeBody = {
  classList: makeClassList(),
  addEventListener(type, handler) { (bodyListeners[type] = bodyListeners[type] || []).push(handler); },
};

const fakeDocument = {
  body: fakeBody,
  getElementById: id => elements[id] || makeElement(id),
  createElement: () => makeElement('dynamic'),
  addEventListener(type, handler) { (documentListeners[type] = documentListeners[type] || []).push(handler); },
};

// ---- localStorage respaldado por un Map real, para poder inspeccionar lo persistido ----
const storageMap = new Map();
const fakeLocalStorage = {
  getItem: key => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, value) => storageMap.set(key, String(value)),
  removeItem: key => storageMap.delete(key),
};

const sandbox = {
  document: fakeDocument,
  localStorage: fakeLocalStorage,
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 1, // no se reinvoca solo: evita bucle infinito en el test
  cancelAnimationFrame: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => '#222' }),
  setTimeout,
  clearTimeout,
  confirm: () => true,
  console,
  HTMLInputElement,
  __TEST__: {},
};

vm.createContext(sandbox);
vm.runInContext(gameSrc, sandbox, { filename: 'game.js' });

// Expone estado interno vía getters, sin modificar game.js.
// IMPORTANTE: usamos Object.defineProperties/getOwnPropertyDescriptors en vez de
// Object.assign — Object.assign invocaría cada getter UNA VEZ al copiar y dejaría
// un valor congelado (snapshot), no un accessor vivo. defineProperties preserva
// los getters/setters como propiedades de acceso reales sobre __TEST__.
const exposeScript = `
Object.defineProperties(globalThis.__TEST__, Object.getOwnPropertyDescriptors({
  registerCombo, clearLines, lockPiece, loadRecords, saveRecord, qualifies,
  resetRecords, loadBest, updateBest, init, startGame,
  get combo() { return combo; },
  get maxCombo() { return maxCombo; },
  get score() { return score; },
  set score(v) { score = v; },
  get lines() { return lines; },
  set lines(v) { lines = v; },
  get board() { return board; },
  get current() { return current; },
  get level() { return level; },
}));
`;
vm.runInContext(exposeScript, sandbox, { filename: 'expose.js' });

const T = sandbox.__TEST__;

// ---- Arranca una partida ----
T.startGame();
check('startGame() deja el juego corriendo (hay pieza actual)', !!T.current);

// ---- Combo ----
const scoreBeforeCombo = (T.score = 1000);
T.registerCombo(1);
check('registerCombo(1) primera vez -> combo === 1', T.combo === 1);
const scoreBeforeSecond = T.score;
T.registerCombo(1);
check('registerCombo(1) segunda vez seguida -> combo === 2', T.combo === 2);
check('el score aumentó por el bonus de combo', T.score > scoreBeforeSecond);

T.registerCombo(0);
check('registerCombo(0) resetea combo a 0', T.combo === 0);
check('maxCombo conserva el pico (2) tras resetear combo', T.maxCombo === 2);

// ---- Records ----
T.score = 500;
T.lines = 10;
T.saveRecord('AAA');
let records = T.loadRecords();
check('saveRecord() -> loadRecords() devuelve 1 elemento', records.length === 1);
check('localStorage tiene la clave tetris-records', fakeLocalStorage.getItem('tetris-records') !== null);

// Guarda 7 records con distintos scores.
T.resetRecords();
const scores = [100, 250, 900, 50, 700, 300, 1500];
for (const s of scores) {
  T.score = s;
  T.saveRecord('P' + s);
}
records = T.loadRecords();
check('tras guardar 7 records, loadRecords().length === 5', records.length === 5);
const sortedDesc = records.every((r, i) => i === 0 || records[i - 1].score >= r.score);
check('los records quedan ordenados desc por score', sortedDesc);
check('el record de mayor score (1500) está primero', records[0].score === 1500);

T.resetRecords();
check('resetRecords() -> loadRecords().length === 0', T.loadRecords().length === 0);

// ---- qualifies() ----
check('qualifies() es true con menos de 5 records', T.qualifies(10) === true);
for (const s of [100, 200, 300, 400, 500]) {
  T.score = s;
  T.saveRecord('Q');
}
check('con 5 records, qualifies(50) (menor que el mínimo) es false', T.qualifies(50) === false);
check('con 5 records, qualifies(1000) (mayor que el mínimo) es true', T.qualifies(1000) === true);

// ---- updateBest() ----
T.resetRecords();
T.score = 0;
T.lines = 42;
// Simula un combo alto llamando registerCombo varias veces seguidas.
for (let i = 0; i < 5; i++) T.registerCombo(1);
const maxComboBefore = T.maxCombo;
T.updateBest();
const best = T.loadBest();
check('updateBest() guarda bestCombo === maxCombo alcanzado', best.bestCombo === maxComboBefore);
check('updateBest() guarda bestLines === lines de la partida', best.bestLines === 42);

// Una partida peor no debe bajar las mejores marcas.
T.lines = 1;
T.registerCombo(0); // resetea combo a 0
T.updateBest();
const best2 = T.loadBest();
check('updateBest() no empeora bestLines con una partida peor', best2.bestLines === 42);

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exitCode = 1;
