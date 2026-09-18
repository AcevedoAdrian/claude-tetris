// Smoke test e2e (sin navegador) para el menú de pausa.
// Ejecutar: node --check game.js && node tests/smoke-pause.mjs
//
// Construye un DOM falso mínimo y carga game.js con node:vm para poder
// disparar los mismos handlers (keydown, click) que usaría un navegador real.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamePath = path.join(__dirname, '..', 'game.js');
const source = fs.readFileSync(gamePath, 'utf8');

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`PASS ${name}`);
  } else {
    console.log(`FAIL ${name}`);
    failures++;
  }
}

// ---- classList falso respaldado por un Set ----
function makeClassList(el) {
  const set = new Set();
  return {
    add: (...names) => names.forEach(n => set.add(n)),
    remove: (...names) => names.forEach(n => set.delete(n)),
    toggle: (name, force) => {
      const has = set.has(name);
      const next = force === undefined ? !has : force;
      if (next) set.add(name); else set.delete(name);
      return next;
    },
    contains: name => set.has(name),
    _set: set,
  };
}

// ---- contexto 2D falso: absorbe cualquier método/propiedad ----
function makeFakeCtx() {
  const handler = {
    get(target, prop) {
      if (prop in target) return target[prop];
      return (...args) => {};
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  };
  return new Proxy({}, handler);
}

// ---- elemento falso ----
function makeElement(tag = 'div') {
  const el = {
    tagName: tag,
    dataset: {},
    style: {},
    _listeners: {},
    children: [],
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    width: 300,
    height: 600,
    addEventListener(type, handler) {
      (el._listeners[type] = el._listeners[type] || []).push(handler);
    },
    dispatch(type, evt) {
      (el._listeners[type] || []).forEach(h => h(evt));
    },
    appendChild(child) {
      el.children.push(child);
      return child;
    },
    getContext() {
      return makeFakeCtx();
    },
    focus() { document.activeElement = el; },
    blur() { if (document.activeElement === el) document.activeElement = null; },
  };
  el.classList = makeClassList(el);
  // set innerHTML = '' también vacía children, como en un navegador real
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._innerHTML || ''; },
    set(v) {
      el._innerHTML = v;
      if (v === '') el.children = [];
    },
  });
  return el;
}

// ---- document falso ----
const elementsById = new Map();
function getOrCreate(id) {
  if (!elementsById.has(id)) elementsById.set(id, makeElement());
  return elementsById.get(id);
}

const overlayActionsEl = makeElement('div');
const bodyEl = makeElement('body');

const document = {
  body: bodyEl,
  activeElement: null,
  _listeners: {},
  getElementById(id) {
    return getOrCreate(id);
  },
  querySelector(sel) {
    if (sel === '.overlay-actions') return overlayActionsEl;
    return makeElement();
  },
  createElement(tag) {
    return makeElement(tag);
  },
  addEventListener(type, handler) {
    (document._listeners[type] = document._listeners[type] || []).push(handler);
  },
  dispatch(type, evt) {
    (document._listeners[type] || []).forEach(h => h(evt));
  },
};

// canvas necesita width/height numéricos para next-canvas / board
getOrCreate('board').width = 300;
getOrCreate('board').height = 600;
getOrCreate('next-canvas').width = 120;
getOrCreate('next-canvas').height = 120;

// ---- localStorage falso respaldado por un Map ----
const store = new Map();
const localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};

// ---- otros stubs globales ----
let rafId = 1;
const performanceStub = { now: () => Date.now() };
const requestAnimationFrame = () => rafId++; // no vuelve a invocarse solo: evita loop infinito
const cancelAnimationFrame = () => {};
const getComputedStyle = () => ({ getPropertyValue: () => '#222222' });
const confirmStub = () => true;

const sandbox = {
  document,
  localStorage,
  performance: performanceStub,
  requestAnimationFrame,
  cancelAnimationFrame,
  getComputedStyle,
  setTimeout,
  clearTimeout,
  confirm: confirmStub,
  console,
  Math,
  __TEST__: {},
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'game.js' });

// Expone lo mínimo necesario para las aserciones, ejecutado en el MISMO
// contexto vm (sin tocar game.js): segunda llamada a runInContext.
// NOTA: Object.assign() invocaría los getters de inmediato y copiaría el
// valor resultante como propiedad estática (no un accessor en vivo), así
// que usamos Object.defineProperties para conservar el binding en vivo con
// las variables module-level de game.js.
vm.runInContext(`
Object.assign(__TEST__, { togglePause, startGame, init, showMenu });
Object.defineProperties(__TEST__, {
  current: { get() { return current; }, enumerable: true },
  paused: { get() { return paused; }, enumerable: true },
  running: { get() { return running; }, enumerable: true },
  level: { get() { return level; }, enumerable: true },
  dropInterval: { get() { return dropInterval; }, enumerable: true },
  startLevel: {
    get() { return startLevel; },
    set(v) { startLevel = v; },
    enumerable: true,
  },
});
`, sandbox);

const T = sandbox.__TEST__;

// 1. Arranca una partida.
T.startGame();
check('running=true tras startGame()', T.running === true);

// 2. togglePause() abre el menú de pausa.
T.togglePause();
const pauseMenuEl = document.getElementById('pause-menu');
const overlayTitleEl = document.getElementById('overlay-title');
check('#pause-menu visible tras togglePause()', !pauseMenuEl.classList.contains('hidden'));
check('#overlay-title oculto tras togglePause()', overlayTitleEl.classList.contains('hidden'));

// 3. Mientras está en pausa, ArrowLeft no debe mover la pieza.
const xBeforePause = T.current.x;
document.dispatch('keydown', { code: 'ArrowLeft', repeat: false, preventDefault() {} });
check('ArrowLeft en pausa no mueve la pieza', T.current.x === xBeforePause);

// 4. Reanuda.
T.togglePause();
check('paused=false tras reanudar', T.paused === false);

// 5. Justo después de reanudar, el input queda bloqueado ~150ms (inputLockUntil).
const xAfterResume = T.current.x;
document.dispatch('keydown', { code: 'ArrowLeft', repeat: false, preventDefault() {} });
check('ArrowLeft justo tras reanudar no mueve la pieza (inputLockUntil)', T.current.x === xAfterResume);

// 6. Cambiar el nivel inicial y reiniciar debe aplicar el nuevo nivel/velocidad.
T.startLevel = 5;
T.startGame();
check('level=5 tras reiniciar con startLevel=5', T.level === 5);
check('dropInterval=640 con startLevel=5', T.dropInterval === Math.max(100, 1000 - (5 - 1) * 90));

console.log(failures === 0 ? '\nTodos los checks pasaron.' : `\n${failures} check(s) fallaron.`);
process.exitCode = failures === 0 ? 0 : 1;
