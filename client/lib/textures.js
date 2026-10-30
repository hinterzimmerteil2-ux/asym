import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const base = new Map();

function draw(name) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const noise = (n, a) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`;
      g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  };
  const vein = (n, col) => {
    g.lineWidth = 1;
    for (let k = 0; k < n; k++) {
      g.strokeStyle = col;
      g.beginPath();
      let x = Math.random() * 128, y = Math.random() * 128;
      g.moveTo(x, y);
      for (let s = 0; s < 5; s++) { x += (Math.random() - 0.4) * 30; y += (Math.random() - 0.4) * 30; g.lineTo(x, y); }
      g.stroke();
    }
  };
  if (name === 'tile' || name === 'marble') {
    g.fillStyle = '#f4f7fa'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? '#e7eef5' : '#f8fafc';
      g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
    }
    vein(14, 'rgba(120,150,185,0.35)');
    vein(8, 'rgba(90,120,160,0.25)');
    g.strokeStyle = '#9fc4e6'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
    g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
    noise(120, 0.05);
  } else if (name === 'plaster') {
    g.fillStyle = '#f2f7fb'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#8fc6ea'; g.fillRect(0, 80, 128, 48);
    g.fillStyle = '#ffffff'; g.fillRect(0, 77, 128, 4);
    g.fillStyle = '#6aa9d6'; g.fillRect(0, 126, 128, 2);
    noise(350, 0.06);
  } else if (name === 'concrete') {
    g.fillStyle = '#c8d6e2'; g.fillRect(0, 0, 128, 128);
    noise(700, 0.1);
    g.strokeStyle = 'rgba(70,100,130,0.3)'; g.strokeRect(0.5, 0.5, 127, 127);
  } else if (name === 'roof') {
    g.fillStyle = '#9fd0f0'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    for (let y = 0; y < 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); for (let x = (y / 16) % 2 ? 0 : 16; x < 128; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } }
    noise(200, 0.06);
  } else if (name === 'ramp') {
    g.fillStyle = '#eef5fb'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#6fb6e8';
    for (let x = -128; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 16, 128); g.lineTo(x + 48, 0); g.lineTo(x + 32, 0); g.fill(); }
    noise(200, 0.06);
  } else if (name === 'tower') {
    g.fillStyle = '#f6f9fc'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#b9dcf3';
    for (let x = 0; x < 128; x += 64) g.fillRect(x + 4, 6, 56, 116);
    g.fillStyle = '#7fb9e0'; g.fillRect(0, 0, 128, 4); g.fillRect(0, 124, 128, 4);
    noise(200, 0.05);
  } else if (name === 'brick') {
    g.fillStyle = '#d8dfe6'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#98a8b8'; g.lineWidth = 2;
    for (let y = 0; y < 128; y += 21) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); for (let x = (y / 21) % 2 ? 0 : 21; x < 128; x += 42) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 21); g.stroke(); } }
    noise(300, 0.08);
  } else if (name === 'wood') {
    g.fillStyle = '#c99a62'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(90,55,25,0.45)';
    for (let y = 0; y < 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    vein(10, 'rgba(90,55,25,0.3)');
    noise(150, 0.06);
  } else {
    g.fillStyle = '#b4c3d0'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    for (let y = 0; y < 128; y += 6) g.fillRect(0, y, 128, 2);
    noise(150, 0.08);
  }
  return c;
}

export function getTexture(name, rx = 1, ry = 1) {
  if (typeof document === 'undefined') return null;
  if (!base.has(name)) base.set(name, draw(name));
  const t = new CanvasTexture(base.get(name));
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}
