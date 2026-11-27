import { useEffect, useState } from 'react';

const STORE = 'asym_touchlayout';
const MIN_SIZE = 0.7;
const MAX_SIZE = 1.8;
const listeners = new Set();
const editListeners = new Set();
let cache = null;
let editing = false;

function empty() {
  return { size: 1, land: {}, port: {} };
}

function clean(raw) {
  const out = empty();
  if (!raw || typeof raw !== 'object') return out;
  if (typeof raw.size === 'number' && Number.isFinite(raw.size)) out.size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, raw.size));
  for (const key of ['land', 'port']) {
    const src = raw[key];
    if (!src || typeof src !== 'object') continue;
    for (const id of Object.keys(src)) {
      const p = src[id];
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) out[key][id] = { x: Math.max(0, Math.min(1, p.x)), y: Math.max(0, Math.min(1, p.y)) };
    }
  }
  return out;
}

function load() {
  if (cache) return cache;
  try {
    cache = clean(JSON.parse(localStorage.getItem(STORE) || 'null'));
  } catch {
    cache = empty();
  }
  return cache;
}

function emit() {
  cache = { size: cache.size, land: { ...cache.land }, port: { ...cache.port } };
  listeners.forEach((fn) => fn());
}

export function commitTouchLayout() {
  try { localStorage.setItem(STORE, JSON.stringify(load())); } catch {}
}

export function getTouchLayout() {
  return load();
}

export function setTouchPos(orient, id, x, y) {
  const lay = load();
  lay[orient][id] = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  emit();
}

export function resetTouchLayout(orient) {
  const lay = load();
  lay[orient] = {};
  lay.size = 1;
  emit();
  commitTouchLayout();
}

export function setTouchSize(size) {
  const lay = load();
  lay.size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));
  emit();
  commitTouchLayout();
}

export function useTouchLayout() {
  const [lay, setLay] = useState(() => load());
  useEffect(() => {
    const fn = () => setLay(load());
    listeners.add(fn);
    fn();
    return () => { listeners.delete(fn); };
  }, []);
  return lay;
}

export function setTouchEdit(on) {
  editing = Boolean(on);
  editListeners.forEach((fn) => fn());
}

export function useTouchEdit() {
  const [on, setOn] = useState(editing);
  useEffect(() => {
    const fn = () => setOn(editing);
    editListeners.add(fn);
    fn();
    return () => { editListeners.delete(fn); };
  }, []);
  return on;
}

export const TOUCH_SIZE_RANGE = [MIN_SIZE, MAX_SIZE];
