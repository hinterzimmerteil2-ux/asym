import { useEffect, useState } from 'react';

const STORE = 'asym_settings';
const DEFAULTS = { quality: 0.5, fps: false, auto: true, shiftMode: 'toggle', slowMode: 'hold' };
const listeners = new Set();
let cache = null;

function load() {
  if (cache) return cache;
  cache = { ...DEFAULTS };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && typeof raw === 'object') {
      const q = Number(raw.quality);
      if (Number.isFinite(q)) cache.quality = Math.max(0.05, Math.min(4, q));
      cache.fps = Boolean(raw.fps);
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
  cache.quality = Math.round(Math.max(0.05, Math.min(4, Number(cache.quality) || 1)) * 20) / 20;
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
  const q = Math.max(0.05, Math.min(4, quality));
  const minimal = q < 0.5;
  const poly = q < 0.1 ? 0.35 : q < 0.5 ? 0.5 : q < 1 ? 0.75 : 1;
  return {
    q,
    minimal,
    poly,
    decor: minimal ? 'none' : q < 1 ? 'light' : 'full',
    dpr: q < 0.1 ? 0.25 : q <= 1 ? 0.3 + 0.7 * q : 1 + (q - 1) / 3,
    antialias: q >= 1.5,
    textures: !minimal,
    aniso: q >= 3 ? 16 : q >= 2 ? 8 : q >= 1 ? 4 : 1,
    lights: !minimal,
    dust: q < 1 ? 0 : Math.round(120 * q),
    stars: q >= 0.5,
    fogFar: q < 0.1 ? 45 : minimal ? 70 : q < 1 ? 100 : 140,
  };
}
