import { useEffect, useState } from 'react';

const STORE = 'asym_settings';
const DEFAULTS = { quality: 0.5, fps: false, auto: true, shiftMode: 'toggle', slowMode: 'hold', sfx: 0.6 };
const listeners = new Set();

export function isBoard() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches && Math.max(window.screen.width, window.screen.height) >= 1700;
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
