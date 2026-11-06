import { getSettings } from './settings';

let ctx = null;
let master = null;
let noiseBuf = null;
const L = { x: 0, y: 0, z: 0, yaw: 0 };
const MAX_DIST = 28;
const stepAcc = new Map();
const lastPos = new Map();

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  ensure();
}

export function setListener(x, y, z, yaw) {
  L.x = x; L.y = y; L.z = z; L.yaw = yaw;
}

function spatial(x, y, z, own) {
  const dx = x - L.x;
  const dz = z - L.z;
  const dist = Math.hypot(dx, dz);
  if (!own && dist > MAX_DIST) return null;
  const rx = -Math.cos(L.yaw);
  const rz = Math.sin(L.yaw);
  const pan = own || dist < 0.01 ? 0 : Math.max(-1, Math.min(1, (dx * rx + dz * rz) / dist));
  const dy = Math.abs((y || 0) - L.y);
  const floors = Math.round(dy / 4);
  const near = own ? 1 : Math.pow(1 - dist / MAX_DIST, 2);
  return { pan, vol: near * (floors > 0 ? 0.55 : 1), muffle: floors > 0, floor: Math.round((y || 0) / 4) };
}

function chain(sp, vol) {
  const g = ctx.createGain();
  g.gain.value = 0;
  let node = g;
  if (sp.muffle) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    g.connect(f);
    node = f;
  }
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = sp.pan;
    node.connect(p);
    p.connect(master);
  } else {
    node.connect(master);
  }
  const v = Math.max(0.0001, vol * sp.vol);
  return { g, v };
}

function envelope(g, v, t0, attack, decay) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(v, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(c, g, type, f0, f1, t0, dur) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  o.connect(g);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(c, g, freq, q, t0, dur) {
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  s.connect(f);
  f.connect(g);
  s.start(t0);
  s.stop(t0 + dur);
}

export function play(kind, x, y, z, own = false) {
  const level = getSettings().sfx;
  if (!(level > 0)) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const sp = spatial(x, y, z, own);
  if (!sp || sp.vol < 0.01) return;
  master.gain.value = level;
  const t0 = c.currentTime;
  if (kind === 'step') {
    const { g, v } = chain(sp, 0.5);
    envelope(g, v, t0, 0.005, 0.1);
    noise(c, g, 500 + 120 * sp.floor + Math.random() * 120, 1.2, t0, 0.12);
    tone(c, g, 'sine', 90 + 18 * sp.floor, 55, t0, 0.09);
  } else if (kind === 'spear') {
    const { g, v } = chain(sp, 0.9);
    envelope(g, v, t0, 0.004, 0.5);
    tone(c, g, 'triangle', 140, 50, t0, 0.2);
    tone(c, g, 'square', 1250, 1180, t0 + 0.02, 0.45);
    noise(c, g, 1800, 2, t0, 0.08);
  } else if (kind === 'cure') {
    const { g, v } = chain(sp, 0.7);
    envelope(g, v, t0, 0.01, 0.45);
    tone(c, g, 'sine', 523, 0, t0, 0.2);
    tone(c, g, 'sine', 784, 0, t0 + 0.12, 0.3);
  }
}

export function trackSteps(entities, myId) {
  for (const [id, e] of Object.entries(entities || {})) {
    if (id === myId || e.corpse || e.gone) continue;
    const prev = lastPos.get(id);
    lastPos.set(id, { x: e.x, z: e.z });
    if (!prev || (e.y || 0) > L.y + 40) continue;
    const d = Math.hypot(e.x - prev.x, e.z - prev.z);
    if (d > 3 || d < 0.01) continue;
    const acc = (stepAcc.get(id) || 0) + d;
    if (acc >= 1.5) {
      stepAcc.set(id, acc - 1.5);
      play('step', e.x, e.y || 0, e.z);
    } else {
      stepAcc.set(id, acc);
    }
  }
}
