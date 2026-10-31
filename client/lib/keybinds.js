export const ACTIONS = [
  { id: 'forward', label: 'Adelante', def: 'KeyW' },
  { id: 'back', label: 'Atrás', def: 'KeyS' },
  { id: 'left', label: 'Izquierda', def: 'KeyA' },
  { id: 'right', label: 'Derecha', def: 'KeyD' },
  { id: 'jump', label: 'Saltar', def: 'Space' },
  { id: 'slow', label: 'Paso lento', def: 'ShiftLeft' },
  { id: 'skill1', label: 'Habilidad 1 (Curador)', def: 'KeyQ' },
  { id: 'skill2', label: 'Habilidad 2 (Curador)', def: 'KeyE' },
  { id: 'skill3', label: 'Habilidad 3 (Curador)', def: 'KeyR' },
  { id: 'skill4', label: 'Habilidad 4 (Curador)', def: 'KeyF' },
  { id: 'melee', label: 'Golpe aturdidor (Curador)', def: 'KeyG' },
  { id: 'minigame', label: 'Minijuego de auto-daño', def: 'KeyE' },
  { id: 'card1', label: 'Carta 1', def: 'Digit1' },
  { id: 'card2', label: 'Carta 2', def: 'Digit2' },
  { id: 'help', label: 'Ayuda', def: 'KeyH' },
  { id: 'hitboxes', label: 'Hitboxes', def: 'KeyB' },
  { id: 'shiftlock', label: 'Shiftlock', def: 'ControlLeft' },
];

const STORE = 'asym_keybinds';
const listeners = new Set();
let cache = null;

function defaults() {
  const out = {};
  for (const a of ACTIONS) out[a.id] = a.def;
  return out;
}

function load() {
  if (cache) return cache;
  cache = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && typeof raw === 'object') {
      for (const a of ACTIONS) if (typeof raw[a.id] === 'string' && raw[a.id]) cache[a.id] = raw[a.id];
    }
  } catch {}
  return cache;
}

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(cache)); } catch {}
  listeners.forEach((fn) => fn());
}

export function getKey(id) {
  return load()[id];
}

export function getBinds() {
  return { ...load() };
}

const SHARED = [['skill2', 'minigame']];

export function setKey(id, code) {
  const binds = load();
  const shared = SHARED.some((pair) => pair.includes(id));
  if (!shared) {
    for (const a of ACTIONS) {
      if (a.id !== id && binds[a.id] === code && !SHARED.some((pair) => pair.includes(a.id))) binds[a.id] = binds[id];
    }
  }
  binds[id] = code;
  save();
}

export function resetKeys() {
  cache = defaults();
  save();
}

export function subscribeKeys(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function matches(id, code) {
  const key = getKey(id);
  if (code === key) return true;
  if (id === 'forward') return code === 'ArrowUp' && key === 'KeyW';
  if (id === 'back') return code === 'ArrowDown' && key === 'KeyS';
  if (id === 'left') return code === 'ArrowLeft' && key === 'KeyA';
  if (id === 'right') return code === 'ArrowRight' && key === 'KeyD';
  if (id === 'slow') return code === 'ShiftRight' && key === 'ShiftLeft';
  if (id === 'shiftlock') return code === 'ControlRight' && key === 'ControlLeft';
  return false;
}

export function keyLabel(code) {
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = { Space: 'Espacio', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Tab: 'Tab', Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\' };
  return map[code] || code;
}
