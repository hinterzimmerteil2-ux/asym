import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const base = new Map();
const opts = { off: false, aniso: 4 };

export function setTextureQuality(off, aniso) {
  opts.off = off;
  opts.aniso = aniso;
}

function draw(name) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const R = (a, b) => a + Math.random() * (b - a);
  const noise = (n, a) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.55 ? '0,0,0' : '255,255,255'},${Math.random() * a})`;
      g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  };
  const stains = (n, col, rmax) => {
    for (let i = 0; i < n; i++) {
      const x = R(0, S), y = R(0, S), r = R(8, rmax);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };
  const cracks = (n, col) => {
    g.strokeStyle = col;
    g.lineWidth = 1;
    for (let k = 0; k < n; k++) {
      let x = R(0, S), y = R(0, S), a = R(0, Math.PI * 2);
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 9; i++) {
        a += R(-0.7, 0.7);
        x += Math.cos(a) * R(6, 16);
        y += Math.sin(a) * R(6, 16);
        g.lineTo(x, y);
      }
      g.stroke();
    }
  };
  const drips = (n, col) => {
    for (let i = 0; i < n; i++) {
      const x = R(0, S), len = R(20, 120);
      const gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.save();
      g.translate(x, 0);
      g.fillStyle = gr;
      g.fillRect(0, 0, R(2, 6), len);
      g.restore();
    }
  };
  const vignette = (a) => {
    const gr = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, `rgba(0,0,0,${a})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  };
  if (name === 'tile' || name === 'marble') {
    const cell = S / 4;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
      const dark = (x + y) % 2;
      const l = dark ? R(70, 82) : R(150, 166);
      g.fillStyle = dark ? `rgb(${l * 0.6 | 0},${l * 0.78 | 0},${l * 0.74 | 0})` : `rgb(${l * 0.92 | 0},${l * 0.96 | 0},${l * 0.9 | 0})`;
      g.fillRect(x * cell, y * cell, cell, cell);
    }
    g.strokeStyle = 'rgba(30,38,36,0.7)';
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * cell, 0); g.lineTo(i * cell, S); g.moveTo(0, i * cell); g.lineTo(S, i * cell); g.stroke(); }
    stains(8, 'rgba(40,34,20,0.35)', 60);
    stains(3, 'rgba(70,20,16,0.28)', 34);
    cracks(5, 'rgba(10,12,12,0.55)');
    noise(500, 0.12);
    vignette(0.25);
  } else if (name === 'plaster') {
    g.fillStyle = '#b8bfb2'; g.fillRect(0, 0, S, S);
    stains(10, 'rgba(70,64,40,0.35)', 70);
    g.fillStyle = '#2f5a56'; g.fillRect(0, 150, S, 106);
    g.fillStyle = '#3d6e69';
    for (let i = 0; i < 6; i++) g.fillRect(0, 150 + i * 18, S, 1);
    g.fillStyle = '#d7d9cb'; g.fillRect(0, 144, S, 6);
    g.fillStyle = '#1a2f2d'; g.fillRect(0, 150, S, 2);
    for (let i = 0; i < 14; i++) {
      const x = R(0, S), y = R(0, 140), w = R(8, 34), h = R(6, 26);
      g.fillStyle = 'rgba(86,78,60,0.7)';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + R(-3, 3)); g.lineTo(x + w * 0.7, y + h); g.lineTo(x + R(-3, 3), y + h * 0.8); g.closePath(); g.fill();
    }
    drips(7, 'rgba(60,52,30,0.45)');
    cracks(3, 'rgba(25,24,20,0.5)');
    g.fillStyle = '#101614'; g.fillRect(0, S - 6, S, 6);
    noise(700, 0.12);
  } else if (name === 'concrete') {
    g.fillStyle = '#7c8580'; g.fillRect(0, 0, S, S);
    stains(14, 'rgba(30,34,30,0.35)', 60);
    stains(5, 'rgba(120,130,110,0.25)', 50);
    cracks(5, 'rgba(15,18,16,0.5)');
    g.strokeStyle = 'rgba(20,24,22,0.55)'; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
    noise(900, 0.16);
  } else if (name === 'roof') {
    g.fillStyle = '#58655f'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#2a3330'; g.lineWidth = 3;
    for (let y = 0; y < S; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < S; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
    stains(12, 'rgba(20,24,20,0.4)', 50);
    noise(400, 0.14);
  } else if (name === 'ramp') {
    g.fillStyle = '#6c746d'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#b8a23a';
    for (let x = -S; x < 2 * S; x += 64) { g.beginPath(); g.moveTo(x, S); g.lineTo(x + 28, S); g.lineTo(x + 92, 0); g.lineTo(x + 64, 0); g.fill(); }
    g.fillStyle = 'rgba(20,22,20,0.55)';
    for (let x = -S; x < 2 * S; x += 64) { g.beginPath(); g.moveTo(x + 28, S); g.lineTo(x + 64, S); g.lineTo(x + 128, 0); g.lineTo(x + 92, 0); g.fill(); }
    stains(10, 'rgba(25,26,20,0.45)', 50);
    cracks(3, 'rgba(10,10,10,0.5)');
    noise(600, 0.15);
  } else if (name === 'tower') {
    g.fillStyle = '#8a9088'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#1a2a2e';
    for (let x = 0; x < S; x += 128) g.fillRect(x + 10, 14, 108, 224);
    g.fillStyle = 'rgba(120,150,160,0.25)';
    for (let x = 0; x < S; x += 128) { g.beginPath(); g.moveTo(x + 10, 14); g.lineTo(x + 60, 14); g.lineTo(x + 10, 90); g.fill(); }
    g.fillStyle = '#4a514c'; g.fillRect(0, 0, S, 8); g.fillRect(0, 248, S, 8);
    drips(6, 'rgba(30,26,16,0.5)');
    noise(500, 0.12);
  } else if (name === 'brick') {
    g.fillStyle = '#6d4d44'; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#2c2420'; g.lineWidth = 3;
    for (let y = 0; y < S; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = (y / 42) % 2 ? 0 : 42; x < S; x += 84) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 42); g.stroke(); } }
    stains(12, 'rgba(20,16,12,0.4)', 50);
    noise(700, 0.15);
  } else if (name === 'wood') {
    g.fillStyle = '#5a4128'; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(20,12,6,0.6)'; g.lineWidth = 2;
    for (let y = 0; y < S; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    cracks(6, 'rgba(20,12,6,0.45)');
    stains(8, 'rgba(15,10,6,0.35)', 50);
    noise(400, 0.12);
  } else {
    g.fillStyle = '#6b7570'; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    for (let y = 0; y < S; y += 12) g.fillRect(0, y, S, 3);
    stains(8, 'rgba(25,28,24,0.4)', 50);
    noise(400, 0.14);
  }
  return c;
}

export function getTexture(name, rx = 1, ry = 1) {
  if (typeof document === 'undefined' || opts.off) return null;
  if (!base.has(name)) base.set(name, draw(name));
  const t = new CanvasTexture(base.get(name));
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.repeat.set(rx, ry);
  t.anisotropy = opts.aniso;
  return t;
}
