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
  if (name === 'tile') {
    g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? '#dedacd' : '#ecebe2';
      g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
    }
    g.strokeStyle = '#a9a595'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
    g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
    noise(200, 0.08);
  } else if (name === 'plaster') {
    g.fillStyle = '#c9d3c4'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#7fa08a'; g.fillRect(0, 84, 128, 44);
    g.fillStyle = '#5d7d68'; g.fillRect(0, 82, 128, 3);
    noise(500, 0.1);
  } else if (name === 'concrete') {
    g.fillStyle = '#8b8f96'; g.fillRect(0, 0, 128, 128);
    noise(900, 0.14);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, 127, 127);
  } else if (name === 'roof') {
    g.fillStyle = '#9a5c48'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#6e3e30'; g.lineWidth = 2;
    for (let y = 0; y < 128; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); for (let x = (y / 16) % 2 ? 0 : 16; x < 128; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } }
    noise(300, 0.1);
  } else if (name === 'ramp') {
    g.fillStyle = '#5f6672'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#d9c24a';
    for (let x = -128; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 16, 128); g.lineTo(x + 48, 0); g.lineTo(x + 32, 0); g.fill(); }
    noise(300, 0.12);
  } else if (name === 'tower') {
    g.fillStyle = '#b79b78'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#7e6a50'; g.lineWidth = 2;
    for (let y = 0; y < 128; y += 21) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); for (let x = (y / 21) % 2 ? 0 : 21; x < 128; x += 42) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 21); g.stroke(); } }
    noise(400, 0.1);
  } else {
    g.fillStyle = '#8a8674'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let y = 0; y < 128; y += 6) g.fillRect(0, y, 128, 2);
    noise(200, 0.1);
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
