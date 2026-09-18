// Smoke test (sin navegador) para el sistema de skins de game.js.
// Ejecutar: node tests/smoke-skins.mjs
//
// Simplificación del stub de canvas 2D: no se registra una pila real de
// save()/restore() (son no-ops); solo se recuerda el ÚLTIMO valor asignado
// a cada propiedad (fillStyle, shadowBlur, etc.), lo cual basta para las
// aserciones de este test (verificar que shadowBlur queda en 0 al final de
// drawBlock, y que fillRect no se invoca para colorIndex=0).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamePath = path.join(__dirname, '..', 'game.js');
const source = readFileSync(gamePath, 'utf8');

let failed = false;
function check(name, cond) {
  if (cond) {
    console.log(`PASS: ${name}`);
  } else {
    console.log(`FAIL: ${name}`);
    failed = true;
  }
}

// ---- Fake localStorage ----
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
}

// ---- Fake 2D context ----
// Simplificación: se listan explícitamente los métodos que game.js invoca
// sobre el contexto 2D (no se usa un Proxy que "fabrique" métodos al vuelo,
// porque eso rompería las comprobaciones de verdad sobre propiedades nunca
// asignadas, p. ej. `ctx.shadowBlur` antes de que nada lo haya tocado).
// Las propiedades simples (fillStyle, shadowBlur, globalAlpha, ...) son
// asignables libremente como en cualquier objeto plano, y conservan el
// último valor asignado.
function makeCtx() {
  const ctx = {
    save() {},
    restore() {},
  };
  const methods = ['fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'stroke',
    'fill', 'roundRect', 'clearRect', 'fillText'];
  for (const m of methods) {
    ctx[m] = (...args) => { ctx[`__last_${m}`] = args; ctx[`__calls_${m}`] = (ctx[`__calls_${m}`] || 0) + 1; };
  }
  return ctx;
}

// ---- Fake DOM element ----
function makeEl(tag = 'div') {
  const el = {
    tagName: tag,
    _classes: new Set(),
    dataset: {},
    style: {},
    children: [],
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    width: 300,
    height: 600,
    classList: {
      add: (...cs) => cs.forEach(c => el._classes.add(c)),
      remove: (...cs) => cs.forEach(c => el._classes.delete(c)),
      toggle: (c, force) => {
        const has = el._classes.has(c);
        const want = force === undefined ? !has : force;
        if (want) el._classes.add(c); else el._classes.delete(c);
        return want;
      },
      contains: c => el._classes.has(c),
    },
    addEventListener: () => {},
    appendChild: child => { el.children.push(child); return child; },
    getContext: () => makeCtx(),
  };
  return el;
}

const idElements = {};
const knownIds = [
  'board', 'next-canvas', 'score', 'lines', 'level', 'overlay', 'overlay-title',
  'overlay-score', 'restart-btn', 'skin-select', 'power-indicator', 'freeze-timer',
  'power-flash', 'power-section', 'mode-menu', 'mode-grid', 'play-btn', 'menu-btn',
  'challenge-hud', 'time-left', 'goal-progress', 'mods-badges',
];
for (const id of knownIds) idElements[id] = makeEl();

const body = makeEl('body');

const document = {
  getElementById: id => idElements[id] || makeEl(),
  createElement: tag => makeEl(tag),
  addEventListener: () => {},
  body,
};

const localStorage = makeLocalStorage();

const sandbox = {
  document,
  localStorage,
  performance: { now: () => 0 },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => '#222222' }),
  setTimeout: (...a) => setTimeout(...a),
  clearTimeout: (...a) => clearTimeout(...a),
  confirm: () => true,
  console,
};
sandbox.__TEST__ = {};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'game.js' });
vm.runInContext(
  `Object.assign(globalThis.__TEST__, { applySkin, initSkin, drawBlock, SKINS, get activeSkin(){ return activeSkin; } });`,
  sandbox,
  { filename: 'test-bridge.js' }
);

const T = sandbox.__TEST__;

// ---- Aserciones ----

check('SKINS tiene exactamente retro, neon, pastel, pixel',
  JSON.stringify(Object.keys(T.SKINS).sort()) === JSON.stringify(['neon', 'pastel', 'pixel', 'retro']));

for (const key of ['retro', 'neon', 'pastel', 'pixel']) {
  check(`SKINS.${key}.colors tiene 15 entradas`, T.SKINS[key].colors.length === 15);
}

for (const key of ['retro', 'neon', 'pastel', 'pixel']) {
  let threw = false;
  try { T.applySkin(key); } catch (e) { threw = true; }
  check(`applySkin('${key}') no lanza`, !threw);
  check(`applySkin('${key}') pone body.dataset.skin`, document.body.dataset.skin === key);
  const stored = JSON.parse(localStorage.getItem('tetris-skin'));
  check(`applySkin('${key}') persiste en localStorage`, stored === key);
}

for (const key of ['retro', 'neon', 'pastel', 'pixel']) {
  T.applySkin(key);
  const ctx = makeCtx();
  let threw = false;
  try { T.drawBlock(ctx, 0, 0, 1, 30); } catch (e) { threw = true; }
  check(`drawBlock no lanza con skin '${key}'`, !threw);
  check(`drawBlock deja shadowBlur en 0 con skin '${key}'`, !ctx.shadowBlur || ctx.shadowBlur === 0);
}

// colorIndex 0 = vacío: no debe pintar nada
{
  T.applySkin('retro');
  const ctx = makeCtx();
  let threw = false;
  try { T.drawBlock(ctx, 0, 0, 0, 30); } catch (e) { threw = true; }
  check('drawBlock con colorIndex=0 no lanza', !threw);
  check('drawBlock con colorIndex=0 no llama fillRect', !ctx.__calls_fillRect);
}

// initSkin con valor basura en localStorage -> retro
{
  localStorage.setItem('tetris-skin', '"no-existe"');
  T.initSkin();
  check("initSkin con skin inexistente cae a 'retro'", T.activeSkin === 'retro');

  localStorage.setItem('tetris-skin', 'esto-no-es-json-valido');
  T.initSkin();
  check("initSkin con JSON inválido cae a 'retro'", T.activeSkin === 'retro');
}

process.exitCode = failed ? 1 : 0;
console.log(failed ? '\nRESULTADO: FALLÓ' : '\nRESULTADO: OK');
