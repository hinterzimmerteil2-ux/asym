import { useEffect, useState } from 'react';

const STORE = 'asym_settings';
const DEFAULTS = { quality: 0.5, fps: false, auto: true, shiftMode: 'toggle', slowMode: 'hold', sfx: 0.6, detectTouch: true, inputMode: 'touch' };
const INPUT_MODES = ['touch', 'mixed', 'keyboard'];
const TOUCH_SEEN = 'asym_touch_seen';
const touchListeners = new Set();
let sawTouch = false;
let watching = false;
const listeners = new Set();

function mq(q) {
  try { return window.matchMedia(q).matches; } catch { return false; }
}

function storedPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
}

export function isBoard() {
  if (typeof window === 'undefined') return false;
  try {
    if (Math.max(window.screen.width, window.screen.height) < 1700) return false;
    if (mq('(pointer: coarse)')) return true;
    const r = storedPrefs();
    return r.detectTouch === false && (r.inputMode === 'touch' || r.inputMode === 'mixed');
  } catch { return false; }
}
let cache = null;

function load() {
  if (cache) return cache;
  cache = { ...DEFAULTS };
  try {
    if (isBoard() && !localStorage.getItem(STORE)) cache.quality = 0.35;
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && typeof raw === 'object') {
      const q = Number(raw.quality);
      if (Number.isFinite(q)) cache.quality = Math.max(0.025, Math.min(4, q));
      cache.fps = Boolean(raw.fps);
      const sv = Number(raw.sfx);
      if (Number.isFinite(sv)) cache.sfx = Math.max(0, Math.min(1, sv));
      if (typeof raw.auto === 'boolean') cache.auto = raw.auto;
      if (['hold', 'toggle', 'mixed'].includes(raw.shiftMode)) cache.shiftMode = raw.shiftMode;
      if (['hold', 'toggle', 'mixed'].includes(raw.slowMode)) cache.slowMode = raw.slowMode;
      if (typeof raw.detectTouch === 'boolean') cache.detectTouch = raw.detectTouch;
      if (INPUT_MODES.includes(raw.inputMode)) cache.inputMode = raw.inputMode;
    }
  } catch {}
  return cache;
}

export function getSettings() {
  return typeof window === 'undefined' ? DEFAULTS : load();
}

export function setSettings(patch) {
  cache = { ...load(), ...patch };
  cache.quality = Math.round(Math.max(0.025, Math.min(4, Number(cache.quality) || 1)) * 40) / 40;
  try { localStorage.setItem(STORE, JSON.stringify(cache)); } catch {}
  listeners.forEach((fn) => fn());
}

export function useSettings() {
  const [s, setS] = useState(DEFAULTS);
  useEffect(() => {
    const sync = () => setS({ ...load() });
    sync();
    listeners.add(sync);
    return () => listeners.delete(sync);
  }, []);
  return s;
}

export function detectMode() {
  if (typeof window === 'undefined') return 'keyboard';
  if (mq('(pointer: coarse)')) return 'touch';
  const fine = mq('(any-pointer: fine)') && mq('(any-hover: hover)');
  const hw = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window || mq('(any-pointer: coarse)');
  if (sawTouch) return fine ? 'mixed' : 'touch';
  if (hw && !fine) return 'touch';
  return 'keyboard';
}

export function resolveMode(settings) {
  const st = settings || getSettings();
  return st.detectTouch ? detectMode() : st.inputMode;
}

function applyUrlInput() {
  try {
    const v = new URLSearchParams(window.location.search).get('input');
    if (v === 'auto') setSettings({ detectTouch: true });
    else if (INPUT_MODES.includes(v)) setSettings({ detectTouch: false, inputMode: v });
  } catch {}
}

function watchTouch() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  try { sawTouch = localStorage.getItem(TOUCH_SEEN) === '1'; } catch {}
  const on = (e) => {
    if (sawTouch || (e.pointerType && e.pointerType !== 'touch')) return;
    sawTouch = true;
    try { localStorage.setItem(TOUCH_SEEN, '1'); } catch {}
    touchListeners.forEach((fn) => fn());
  };
  window.addEventListener('pointerdown', on, true);
  window.addEventListener('touchstart', on, { capture: true, passive: true });
  applyUrlInput();
}

export function useInputMode() {
  const s = useSettings();
  const [ready, setReady] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    watchTouch();
    setReady(true);
    const bump = () => setTick((n) => n + 1);
    touchListeners.add(bump);
    const offs = ['(pointer: coarse)', '(any-pointer: fine)', '(any-hover: hover)'].map((q) => watchMedia(window.matchMedia(q), bump));
    return () => { touchListeners.delete(bump); offs.forEach((f) => f()); };
  }, []);
  const mode = ready ? resolveMode(s) : 'keyboard';
  return { mode, touch: mode !== 'keyboard', keys: mode !== 'touch' };
}

export function gfx(quality) {
  const q = Math.max(0.025, Math.min(4, quality));
  const minimal = q < 0.5;
  const poly = q < 0.05 ? 0.25 : q < 0.1 ? 0.35 : q < 0.5 ? 0.5 : q < 1 ? 0.75 : 1;
  return {
    q,
    minimal,
    poly,
    decor: minimal ? 'none' : q < 1 ? 'light' : 'full',
    dpr: q < 0.05 ? 0.15 : q < 0.1 ? 0.25 : q <= 1 ? 0.3 + 0.7 * q : 1 + (q - 1) / 3,
    antialias: q >= 1.5,
    textures: !minimal,
    aniso: q >= 3 ? 16 : q >= 2 ? 8 : q >= 1 ? 4 : 1,
    lights: !minimal,
    lightCount: q < 1 ? 1 : q < 2 ? 2 : 5,
    dust: q < 1 ? 0 : Math.round(120 * q),
    stars: q >= 0.5,
    fogFar: q < 0.05 ? 30 : q < 0.1 ? 45 : minimal ? 70 : q < 1 ? 100 : 140,
  };
}

export function watchMedia(mq, fn) {
  if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  return () => { if (mq.removeEventListener) mq.removeEventListener('change', fn); else if (mq.removeListener) mq.removeListener(fn); };
}
