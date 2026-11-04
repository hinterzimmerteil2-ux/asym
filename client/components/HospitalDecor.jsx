'use client';

import { useMemo, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, MeshBasicMaterial } from 'three';

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TRIM = '#1c2523';
const SIGNS = [['URGENCIAS', '#7a1f1f'], ['QUIRÓFANO', '#1f4f5c'], ['RADIOLOGÍA', '#2c3f66'], ['UCI', '#7a1f1f'], ['PISO 1', '#3b4a40'], ['PISO 2', '#3b4a40'], ['PISO 3', '#3b4a40'], ['PISO 4', '#3b4a40'], ['PISO 5', '#3b4a40'], ['MORGUE', '#2a2a2a'], ['ESCALERA →', '#4a4a1f'], ['← SALIDA', '#1f5c34']];
const texCache = new Map();

function signTexture(text, bg) {
  const key = text + bg;
  if (texCache.has(key)) return texCache.get(key);
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 80);
  g.strokeStyle = 'rgba(230,230,210,0.55)';
  g.lineWidth = 4;
  g.strokeRect(4, 4, 248, 72);
  g.fillStyle = '#dcd9c4';
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 42);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`;
    g.fillRect(Math.random() * 256, Math.random() * 80, 2, 2);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

function Sign({ idx, u, y }) {
  const [text, bg] = SIGNS[idx % SIGNS.length];
  const map = useMemo(() => signTexture(text, bg), [text, bg]);
  return (
    <group position={[u, y, 0.08]}>
      <mesh><boxGeometry args={[2.5, 0.84, 0.05]} /><meshStandardMaterial color="#14191a" /></mesh>
      <mesh position={[0, 0, 0.03]}><planeGeometry args={[2.4, 0.75]} /><meshBasicMaterial map={map} color={map ? '#ffffff' : bg} /></mesh>
    </group>
  );
}

function Box({ p, s, c, r = 0.85, m }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      {m || <meshStandardMaterial color={c} roughness={r} />}
    </mesh>
  );
}

function Furniture({ kind, x, detail }) {
  if (kind === 'bed') {
    return (
      <group position={[x, 0, 0.55]}>
        <Box p={[0, 0.45, 0]} s={[2.1, 0.12, 0.9]} c="#4a5550" />
        <Box p={[0, 0.62, 0]} s={[2.0, 0.2, 0.82]} c="#a9ab9c" r={1} />
        {detail && <Box p={[-1.0, 0.85, 0]} s={[0.08, 0.7, 0.9]} c="#3a4440" />}
        {detail && <Box p={[0.3, 0.85, 0.44]} s={[1.4, 0.05, 0.04]} c="#8a9590" />}
        {detail && <Box p={[0.3, 0.3, 0.42]} s={[1.9, 0.3, 0.04]} c="#2a312e" />}
        {detail && <mesh position={[1.3, 0.9, 0.2]}><cylinderGeometry args={[0.025, 0.025, 1.8, 5]} /><meshStandardMaterial color="#8a9590" /></mesh>}
        {detail && <Box p={[1.3, 1.7, 0.2]} s={[0.14, 0.22, 0.04]} c="#a9c4b5" />}
      </group>
    );
  }
  if (kind === 'lockers') {
    return (
      <group position={[x, 0, 0.28]}>
        {[-0.55, 0, 0.55].map((o, i) => <Box key={i} p={[o, 0.95, 0]} s={[0.52, 1.9, 0.5]} c={i === 1 ? '#4c6358' : '#56655d'} />)}
      </group>
    );
  }
  if (kind === 'desk') {
    return (
      <group position={[x, 0, 0.35]}>
        <Box p={[0, 0.74, 0]} s={[1.5, 0.06, 0.65]} c="#5c4a36" />
        <Box p={[-0.65, 0.37, 0]} s={[0.08, 0.74, 0.6]} c="#3a3026" />
        <Box p={[0.65, 0.37, 0]} s={[0.08, 0.74, 0.6]} c="#3a3026" />
        {detail && <Box p={[0.1, 1.0, -0.1]} s={[0.5, 0.36, 0.05]} c="#0e1311" />}
        {detail && <Box p={[0.1, 0.84, -0.1]} s={[0.1, 0.12, 0.1]} c="#1b2220" />}
      </group>
    );
  }
  if (kind === 'shelf') {
    return (
      <group position={[x, 0, 0.22]}>
        <Box p={[0, 1.0, 0]} s={[1.3, 2.0, 0.4]} c="#4a4f4b" />
        {detail && [0.5, 1.0, 1.5].map((y) => <Box key={y} p={[0, y, 0.12]} s={[1.2, 0.04, 0.2]} c="#2e3430" />)}
        {detail && [-0.4, 0, 0.35].map((o) => <Box key={o} p={[o, 1.1, 0.14]} s={[0.12, 0.2, 0.12]} c="#6b8a78" />)}
      </group>
    );
  }
  if (kind === 'vending') {
    return (
      <group position={[x, 0, 0.45]}>
        <Box p={[0, 0.95, 0]} s={[0.95, 1.9, 0.85]} c="#33423c" />
        <mesh position={[0, 1.1, 0.43]}><planeGeometry args={[0.7, 1.0]} /><meshBasicMaterial color="#6e9a86" /></mesh>
      </group>
    );
  }
  if (kind === 'bench') {
    return (
      <group position={[x, 0, 0.3]}>
        <Box p={[0, 0.45, 0.05]} s={[1.8, 0.07, 0.5]} c="#52483b" />
        <Box p={[0, 0.8, -0.15]} s={[1.8, 0.5, 0.06]} c="#52483b" />
        <Box p={[-0.8, 0.22, 0.05]} s={[0.06, 0.44, 0.45]} c="#222826" />
        <Box p={[0.8, 0.22, 0.05]} s={[0.06, 0.44, 0.45]} c="#222826" />
      </group>
    );
  }
  if (kind === 'sink') {
    return (
      <group position={[x, 0, 0.3]}>
        <Box p={[0, 0.45, 0]} s={[1.6, 0.9, 0.55]} c="#6f7b74" />
        {detail && <Box p={[0, 0.92, 0.05]} s={[0.55, 0.04, 0.35]} c="#14191a" />}
        {detail && <Box p={[0, 1.15, -0.2]} s={[0.05, 0.3, 0.05]} c="#9aa7a0" />}
      </group>
    );
  }
  if (kind === 'board') {
    return (
      <group position={[x, 1.8, 0.05]}>
        <Box p={[0, 0, 0]} s={[1.5, 1.0, 0.05]} c="#6b5a3a" />
        {detail && [[-0.4, 0.2], [0.1, -0.15], [0.45, 0.25]].map(([a, b], i) => <Box key={i} p={[a, b, 0.04]} s={[0.35, 0.45, 0.01]} c="#bdb9a6" />)}
      </group>
    );
  }
  if (kind === 'xray') {
    return (
      <group position={[x, 1.7, 0.05]}>
        <Box p={[0, 0, 0]} s={[1.2, 0.9, 0.08]} c="#1b2220" />
        <mesh position={[0, 0, 0.05]}><planeGeometry args={[1.05, 0.75]} /><meshBasicMaterial color="#9fb8b0" /></mesh>
      </group>
    );
  }
  if (kind === 'wheelchair') {
    return (
      <group position={[x, 0, 0.45]}>
        <Box p={[0, 0.5, 0]} s={[0.55, 0.06, 0.5]} c="#1b2220" />
        <Box p={[0, 0.85, -0.22]} s={[0.55, 0.6, 0.05]} c="#1b2220" />
        {detail && [-0.3, 0.3].map((o) => <mesh key={o} position={[o, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.05, 10]} /><meshStandardMaterial color="#2a312e" /></mesh>)}
      </group>
    );
  }
  return (
    <group position={[x, 0, 0.1]}>
      <Box p={[0, 0.7, 0]} s={[1.3, 0.7, 0.12]} c="#6f7b74" />
      {detail && <Box p={[-0.3, 0.7, 0.08]} s={[0.1, 0.1, 0.05]} c="#4f8f6a" />}
      {detail && <Box p={[0.3, 0.7, 0.08]} s={[0.1, 0.1, 0.05]} c="#4f6f9f" />}
    </group>
  );
}

const FURN = ['bed', 'lockers', 'desk', 'shelf', 'bench', 'sink', 'wheelchair', 'radiator', 'board', 'xray', 'vending', 'bed', 'desk', 'bench'];

function Window({ w }) {
  return (
    <group position={[w.u, w.y, 0]}>
      <mesh><boxGeometry args={[1.9, 1.7, 0.14]} /><meshStandardMaterial color={TRIM} roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.08]}><planeGeometry args={[1.6, 1.4]} /><meshBasicMaterial color={w.lit ? '#d9d2a4' : '#101a20'} transparent opacity={w.broken ? 0.55 : 0.92} /></mesh>
      <mesh position={[0, 0, 0.1]}><boxGeometry args={[0.07, 1.4, 0.05]} /><meshStandardMaterial color={TRIM} /></mesh>
      {w.broken && <mesh position={[0.3, 0.15, 0.11]} rotation={[0, 0, 0.4]}><coneGeometry args={[0.4, 0.8, 3]} /><meshBasicMaterial color="#05080a" /></mesh>}
      <mesh position={[0, -0.95, 0.14]}><boxGeometry args={[2.1, 0.1, 0.3]} /><meshStandardMaterial color="#2b3532" /></mesh>
    </group>
  );
}

function WallFace({ p, side, mats, seed, full, outer }) {
  const alongX = p.hx >= p.hz;
  const len = (alongX ? p.hx : p.hz) * 2;
  const thick = alongX ? p.hz : p.hx;
  const outward = alongX ? Math.sign(p.z) || 1 : Math.sign(p.x) || 1;
  const exterior = outer && side === outward;
  const flip = alongX ? (side > 0 ? 1 : -1) : side > 0 ? -1 : 1;
  const items = useMemo(() => {
    const rand = rng(seed);
    const wins = [];
    const pil = [];
    const lamps = [];
    const furn = [];
    const signs = [];
    if (exterior) {
      const n = Math.max(0, Math.floor(len / 5));
      for (let i = 0; i < n; i++) {
        const u = -len / 2 + (i + 0.5) * (len / n);
        for (const y of [1.9, 4.9, 7.8, 10.8, 13.8, 16.8]) wins.push({ u: u * flip, y, lit: rand() < 0.22, broken: rand() < 0.25 });
      }
      return { wins, pil, lamps, furn, signs };
    }
    const n = Math.max(0, Math.floor(len / 7));
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + (i + 0.5) * (len / n);
      pil.push((u - len / n / 2) * flip);
      lamps.push({ u: (u + len / n / 2) * flip, m: rand() });
    }
    const slots = Math.floor((len - 2) / 3.2);
    for (let i = 0; i < slots; i++) {
      if (!full && i % 2) continue;
      const u = -len / 2 + 1.6 + (i + 0.5) * ((len - 3.2) / slots);
      furn.push({ kind: FURN[Math.floor(rand() * FURN.length)], x: u * flip });
    }
    if (len >= 14) signs.push({ u: (rand() - 0.5) * len * 0.4 * flip, y: p.h > 7 ? 4.9 : 4.1, i: Math.floor(rand() * 100) });
    return { wins, pil, lamps, furn, signs };
  }, [len, seed, p.h, full, exterior, flip]);
  const rot = alongX ? (side > 0 ? 0 : Math.PI) : side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const origin = alongX ? [p.x, 0, p.z + side * (thick + 0.01)] : [p.x + side * (thick + 0.01), 0, p.z];
  return (
    <group position={origin} rotation={[0, rot, 0]}>
      {items.wins.map((w, i) => <Window key={i} w={w} />)}
      {items.pil.map((u, i) => (
        <group key={i} position={[u, 0, 0.17]}>
          <mesh position={[0, p.h / 2, 0]}><boxGeometry args={[0.55, p.h, 0.35]} /><meshStandardMaterial color="#6e7770" roughness={0.95} /></mesh>
          <mesh position={[0, 0.25, 0.02]}><boxGeometry args={[0.8, 0.5, 0.45]} /><meshStandardMaterial color="#2a312e" /></mesh>
          <mesh position={[0, p.h - 0.25, 0.02]}><boxGeometry args={[0.8, 0.5, 0.45]} /><meshStandardMaterial color="#2a312e" /></mesh>
        </group>
      ))}
      {items.lamps.map((l, i) => (
        <mesh key={`l${i}`} position={[l.u, Math.min(5.2, p.h - 1.5), 0.16]} material={l.m < 0.2 ? mats.dead : l.m < 0.5 ? mats.flicker : mats.steady}>
          <boxGeometry args={[0.28, 0.9, 0.16]} />
        </mesh>
      ))}
      {items.furn.map((f, i) => <Furniture key={`f${i}`} kind={f.kind} x={f.x} detail={full} />)}
      {items.signs.map((sg, i) => <Sign key={`s${i}`} idx={sg.i} u={sg.u} y={sg.y} />)}
      {p.h > 7 && [3.2, 6.2].map((y) => (
        <mesh key={`b${y}`} position={[0, y, 0.05]}><boxGeometry args={[len, exterior ? 0.35 : 0.16, 0.1]} /><meshStandardMaterial color="#1b2220" /></mesh>
      ))}
      {!exterior && <mesh position={[0, 0.6, 0.06]}><boxGeometry args={[len, 0.14, 0.12]} /><meshStandardMaterial color="#1b2220" /></mesh>}
      <mesh position={[0, p.h - 0.2, 0.2]}><boxGeometry args={[len + 0.2, 0.4, 0.45]} /><meshStandardMaterial color="#222a28" roughness={0.9} /></mesh>
    </group>
  );
}

function floorName(top) {
  if (top >= 10.5) return 'PISO 5';
  if (top >= 7.5) return 'PISO 4';
  if (top >= 5) return 'PISO 3';
  if (top >= 2.5) return 'PISO 2';
  return null;
}

function Tiers({ platforms, full }) {
  const list = useMemo(
    () => (platforms || []).filter((p) => (p.kind === 'tower' || p.kind === 'roof' || p.kind === 'mezzanine') && !p.ramp && floorName((p.y0 || 0) + p.h)),
    [platforms]
  );
  return (
    <group>
      {list.map((p) => {
        const top = (p.y0 || 0) + p.h;
        const name = floorName(top);
        const idx = SIGNS.findIndex(([t]) => t === name);
        const sx = Math.sign(p.x) || 1;
        const faceX = p.x - sx * p.hx - sx * 0.04;
        const inset = 0.35;
        const line = (pos, size) => (
          <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={size} /><meshBasicMaterial color="#b8a23a" transparent opacity={0.8} depthWrite={false} /></mesh>
        );
        return (
          <group key={p.id}>
            {line([p.x, top + 0.012, p.z - p.hz + inset], [p.hx * 2 - inset * 2, 0.16])}
            {line([p.x, top + 0.012, p.z + p.hz - inset], [p.hx * 2 - inset * 2, 0.16])}
            {line([p.x - p.hx + inset, top + 0.012, p.z], [0.16, p.hz * 2 - inset * 2])}
            {line([p.x + p.hx - inset, top + 0.012, p.z], [0.16, p.hz * 2 - inset * 2])}
            {name && (
              <group position={[faceX, (p.y0 || 0) + p.h - 0.9, p.z]} rotation={[0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
                <Sign idx={idx >= 0 ? idx : 4} u={0} y={0} />
              </group>
            )}
            {full && (
              <mesh position={[p.x, top - 0.05, p.z]}>
                <boxGeometry args={[p.hx * 2 + 0.25, 0.14, p.hz * 2 + 0.25]} />
                <meshStandardMaterial color="#1c2523" roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function CeilingInfra({ half }) {
  const span = half * 0.62;
  const rows = [-span * 0.8, -span * 0.3, span * 0.3, span * 0.8];
  return (
    <group>
      {rows.map((z, i) => (
        <group key={i}>
          <mesh position={[0, 15.4, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, span * 2, 8]} /><meshStandardMaterial color="#444c47" roughness={0.7} /></mesh>
          <mesh position={[0, 15.1, z + 0.6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, span * 2, 6]} /><meshStandardMaterial color="#6b3f33" roughness={0.7} /></mesh>
          {i % 2 === 0 && <mesh position={[0, 15.0, z - 0.8]}><boxGeometry args={[span * 2, 0.5, 0.7]} /><meshStandardMaterial color="#363d39" roughness={0.9} /></mesh>}
        </group>
      ))}
      {[[-span * 0.5, -span * 0.5], [span * 0.5, span * 0.5], [-span * 0.5, span * 0.5]].map(([x, z], i) => (
        <group key={`sl${i}`} position={[x, 14.2, z]}>
          <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.04, 0.04, 1.6, 5]} /><meshStandardMaterial color="#555" /></mesh>
          <mesh><cylinderGeometry args={[0.7, 0.9, 0.2, 14]} /><meshStandardMaterial color="#6f7b74" roughness={0.5} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Beams({ half }) {
  const list = useMemo(() => {
    const out = [];
    const n = 8;
    for (let i = 0; i < n; i++) out.push(-half + ((i + 0.5) * 2 * half) / n);
    return out;
  }, [half]);
  return (
    <group>
      {list.map((x, i) => (
        <group key={i}>
          <mesh position={[x, 16.6, 0]}><boxGeometry args={[0.3, 0.4, half * 2]} /><meshStandardMaterial color="#1a201e" roughness={0.9} /></mesh>
          {[-0.3, 0.3].map((f) => (
            <group key={f} position={[x + 1.2, 0, half * f]}>
              <mesh position={[0, 13.6, 0]}><cylinderGeometry args={[0.015, 0.015, 1.8, 4]} /><meshBasicMaterial color="#0d1110" /></mesh>
              <mesh position={[0, 12.6, 0]}><boxGeometry args={[0.2, 0.9, 0.2]} /><meshStandardMaterial color="#8fb7a0" emissive="#6fa08a" emissiveIntensity={i % 3 === 0 ? 0 : 0.6} /></mesh>
            </group>
          ))}
          {i % 3 === 1 && <mesh position={[x - 1.5, 8.4, half * 0.1]} rotation={[0.4, 0.3, 0.2]}><dodecahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color="#444b47" flatShading roughness={1} /></mesh>}
          {i % 2 === 0 && (
            <mesh position={[x, 4.8, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[2.6, 9, half * 1.8]} />
              <meshBasicMaterial color="#8fb7d6" transparent opacity={0.035} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      {[-half * 0.5, 0, half * 0.5].map((z) => (
        <mesh key={z} position={[0, 11.2, z]}><boxGeometry args={[half * 2, 0.3, 0.3]} /><meshStandardMaterial color="#1a201e" roughness={0.9} /></mesh>
      ))}
    </group>
  );
}

function Litter({ half, seed }) {
  const data = useMemo(() => {
    const r = rng(seed);
    const span = half * 0.62;
    const rnd = (k) => (r() * 2 - 1) * span * k;
    return {
      stains: Array.from({ length: 18 }, () => ({ x: rnd(1), z: rnd(1), s: 1 + r() * 3.2, o: 0.18 + r() * 0.25, c: r() < 0.25 ? '#3a0f0d' : '#0d1311' })),
      papers: Array.from({ length: 46 }, () => ({ x: rnd(1), z: rnd(1), a: r() * 6.28, s: 0.25 + r() * 0.2 })),
      rubble: Array.from({ length: 34 }, () => ({ x: rnd(1), z: rnd(1), s: 0.08 + r() * 0.16, a: r() * 6 })),
    };
  }, [half, seed]);
  return (
    <group>
      {data.stains.map((s, i) => (
        <mesh key={`s${i}`} position={[s.x, 0.025 + i * 0.0003, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[s.s, 18]} />
          <meshBasicMaterial color={s.c} transparent opacity={s.o} depthWrite={false} />
        </mesh>
      ))}
      {data.papers.map((s, i) => (
        <mesh key={`p${i}`} position={[s.x, 0.03 + i * 0.0002, s.z]} rotation={[-Math.PI / 2, 0, s.a]}>
          <planeGeometry args={[s.s, s.s * 1.3]} />
          <meshStandardMaterial color="#b9b5a2" roughness={1} />
        </mesh>
      ))}
      {data.rubble.map((s, i) => (
        <mesh key={`r${i}`} position={[s.x, s.s * 0.4, s.z]} rotation={[s.a, s.a * 0.7, 0]}>
          <dodecahedronGeometry args={[s.s, 0]} />
          <meshStandardMaterial color="#555c57" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[half * 0.2, half * 0.205, 64]} />
        <meshBasicMaterial color="#6f3a36" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[half * 0.06, half * 0.3]} />
        <meshBasicMaterial color="#6f3a36" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[half * 0.3, half * 0.06]} />
        <meshBasicMaterial color="#6f3a36" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FloorLines({ half }) {
  const span = half * 0.62;
  const dashes = useMemo(() => {
    const out = [];
    for (let z = -span; z <= span; z += 3) out.push(z);
    return out;
  }, [span]);
  return (
    <group>
      {dashes.map((z) => (
        <group key={z}>
          <mesh position={[-1.2, 0.023, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.22, 1.8]} /><meshBasicMaterial color="#8a3a34" transparent opacity={0.7} depthWrite={false} /></mesh>
          <mesh position={[1.2, 0.023, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.22, 1.8]} /><meshBasicMaterial color="#3f7f58" transparent opacity={0.7} depthWrite={false} /></mesh>
        </group>
      ))}
    </group>
  );
}

function HangingLights({ half, mats }) {
  const list = useMemo(() => {
    const r = rng(404);
    const span = half * 0.6;
    return Array.from({ length: 18 }, () => ({ x: (r() * 2 - 1) * span, z: (r() * 2 - 1) * span, tilt: (r() - 0.5) * 0.5, m: r() }));
  }, [half]);
  return (
    <group>
      {list.map((l, i) => (
        <group key={i} position={[l.x, 10.8, l.z]} rotation={[0, 0, l.tilt]}>
          <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.02, 0.02, 0.7, 4]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, -0.05, 0]} material={l.m < 0.35 ? mats.dead : l.m < 0.7 ? mats.flicker : mats.steady}><boxGeometry args={[1.8, 0.12, 0.3]} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Wires({ half }) {
  const list = useMemo(() => {
    const r = rng(909);
    const span = half * 0.6;
    return Array.from({ length: 14 }, () => ({ x: (r() * 2 - 1) * span, z: (r() * 2 - 1) * span, len: 2 + r() * 3, a: r() * 3 }));
  }, [half]);
  return (
    <group>
      {list.map((w, i) => (
        <mesh key={i} position={[w.x, 10.8 - w.len / 2, w.z]} rotation={[Math.sin(w.a) * 0.12, 0, Math.cos(w.a) * 0.12]}>
          <cylinderGeometry args={[0.025, 0.025, w.len, 4]} />
          <meshStandardMaterial color="#0d0f0f" />
        </mesh>
      ))}
    </group>
  );
}

function Props({ half }) {
  const data = useMemo(() => {
    const r = rng(2024);
    const span = half * 0.62;
    const pt = () => [(r() * 2 - 1) * span, (r() * 2 - 1) * span];
    return {
      piles: Array.from({ length: 10 }, () => { const [x, z] = pt(); return { x, z, n: 4 + Math.floor(r() * 5), a: r() * 6 }; }),
      pots: Array.from({ length: 9 }, () => { const [x, z] = pt(); return { x, z }; }),
      bags: Array.from({ length: 12 }, () => { const [x, z] = pt(); return { x, z, a: r() * 6 }; }),
    };
  }, [half]);
  return (
    <group>
      {data.piles.map((p, i) => (
        <group key={`p${i}`} position={[p.x, 0, p.z]} rotation={[0, p.a, 0]}>
          {Array.from({ length: p.n }, (_, k) => (
            <mesh key={k} position={[(k % 3) * 0.5 - 0.5, 0.05 + Math.floor(k / 3) * 0.1, Math.floor(k / 3) * 0.4 - 0.2]} rotation={[0.1 * k, 0.5 * k, 0.05 * k]}>
              <boxGeometry args={[0.6, 0.06, 0.6]} />
              <meshStandardMaterial color="#b0ad98" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      {data.pots.map((p, i) => (
        <group key={`t${i}`} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.22, 0.17, 0.4, 8]} /><meshStandardMaterial color="#5a3a2a" roughness={1} /></mesh>
          <mesh position={[0, 0.5, 0]}><coneGeometry args={[0.2, 0.5, 5]} /><meshStandardMaterial color="#3a3a22" roughness={1} /></mesh>
        </group>
      ))}
      {data.bags.map((b, i) => (
        <mesh key={`b${i}`} position={[b.x, 0.12, b.z]} rotation={[0, b.a, 0]}>
          <sphereGeometry args={[0.28, 6, 5]} />
          <meshStandardMaterial color="#1a1f1e" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ half, count }) {
  const ref = useRef();
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() * 2 - 1) * half * 0.7;
      a[i * 3 + 1] = 0.4 + Math.random() * 8;
      a[i * 3 + 2] = (Math.random() * 2 - 1) * half * 0.7;
    }
    return a;
  }, [half, count]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.set(Math.sin(t * 0.07) * 1.6, Math.sin(t * 0.11) * 0.4, Math.cos(t * 0.05) * 1.6);
  });
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" array={pos} count={pos.length / 3} itemSize={3} /></bufferGeometry>
      <pointsMaterial color="#cfd8c8" size={2.2} sizeAttenuation={false} transparent opacity={0.35} depthWrite={false} />
    </points>
  );
}

export default function HospitalDecor({ half, platforms, level = 'full', dust = 260 }) {
  const mats = useMemo(() => ({
    steady: new MeshBasicMaterial({ color: '#d6efd9' }),
    flicker: new MeshBasicMaterial({ color: '#d6efd9' }),
    dead: new MeshBasicMaterial({ color: '#1a2220' }),
  }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const on = Math.sin(t * 17) * Math.sin(t * 5.3 + 1) > -0.25 && Math.sin(t * 2.1) > -0.6;
    mats.flicker.color.set(on ? '#d6efd9' : '#223029');
  });
  const walls = useMemo(() => (platforms || []).filter((p) => p.kind === 'wall' || p.kind === 'partition'), [platforms]);
  return (
    <group>
      {level !== 'none' && <Tiers platforms={platforms} full={level === 'full'} />}
      {walls.map((p, i) => {
        const len = (p.hx >= p.hz ? p.hx : p.hz) * 2;
        if (len < 7) return null;
        return [-1, 1].map((side) => <WallFace key={`${p.id}${side}`} p={p} side={side} mats={mats} seed={i * 31 + (side > 0 ? 7 : 3)} full={level === 'full'} outer={String(p.id).startsWith('w_')} />);
      })}
      {level === 'full' && <Beams half={half * 0.667} />}
      {level === 'full' && <CeilingInfra half={half} />}
      {level === 'full' && dust > 0 && <Dust half={half} count={dust} />}
      {level === 'full' && <pointLight position={[0, 6, 0]} intensity={2.5} distance={40} color="#b7d9c9" />}
    </group>
  );
}
