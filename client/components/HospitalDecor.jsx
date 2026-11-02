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
const SIGNS = [['URGENCIAS', '#7a1f1f'], ['QUIRÓFANO', '#1f4f5c'], ['RADIOLOGÍA', '#2c3f66'], ['UCI', '#7a1f1f'], ['PISO 1', '#3b4a40'], ['PISO 2', '#3b4a40'], ['PISO 3', '#3b4a40'], ['MORGUE', '#2a2a2a'], ['ESCALERA →', '#4a4a1f'], ['← SALIDA', '#1f5c34']];
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

function Extinguisher({ u }) {
  return (
    <group position={[u, 1.2, 0.2]}>
      <mesh><cylinderGeometry args={[0.13, 0.13, 0.55, 10]} /><meshStandardMaterial color="#8c2a26" roughness={0.6} /></mesh>
      <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.05, 0.05, 0.14, 8]} /><meshStandardMaterial color="#1b1f20" /></mesh>
      <mesh position={[0, 0, -0.13]}><boxGeometry args={[0.5, 0.9, 0.04]} /><meshStandardMaterial color="#2a312e" /></mesh>
    </group>
  );
}

function Cabinet({ u }) {
  return (
    <group position={[u, 1.9, 0.18]}>
      <mesh><boxGeometry args={[1.1, 1.3, 0.3]} /><meshStandardMaterial color="#59635d" roughness={0.8} /></mesh>
      <mesh position={[0.28, 0, 0.16]} rotation={[0, 0.5, 0]}><boxGeometry args={[0.5, 1.2, 0.03]} /><meshStandardMaterial color="#6f7b74" /></mesh>
    </group>
  );
}
const GLASS = '#9fb9b4';

function Window({ w, rand }) {
  const broken = rand() < 0.35;
  const curtain = rand() < 0.25;
  return (
    <group position={[w.u, w.y, 0]}>
      <mesh><boxGeometry args={[1.9, 2.5, 0.12]} /><meshStandardMaterial color={TRIM} roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[1.6, 2.2]} />
        <meshBasicMaterial color={w.lit ? '#cfe0d4' : '#16242b'} transparent opacity={broken ? 0.55 : 0.9} />
      </mesh>
      <mesh position={[0, 0, 0.09]}><boxGeometry args={[0.07, 2.2, 0.05]} /><meshStandardMaterial color={TRIM} /></mesh>
      <mesh position={[0, 0.2, 0.09]}><boxGeometry args={[1.6, 0.07, 0.05]} /><meshStandardMaterial color={TRIM} /></mesh>
      {broken && (
        <mesh position={[0.3, 0.2, 0.1]} rotation={[0, 0, 0.4]}>
          <coneGeometry args={[0.55, 1.1, 3]} />
          <meshBasicMaterial color="#05080a" />
        </mesh>
      )}
      {curtain && (
        <mesh position={[-0.55, 0.35, 0.12]}>
          <boxGeometry args={[0.45, 1.9, 0.04]} />
          <meshStandardMaterial color="#4b4036" roughness={1} />
        </mesh>
      )}
      <mesh position={[0, -1.35, 0.12]}><boxGeometry args={[2.1, 0.12, 0.3]} /><meshStandardMaterial color="#2b3532" /></mesh>
    </group>
  );
}

function WallFace({ p, side, mats, seed, full }) {
  const alongX = p.hx >= p.hz;
  const len = (alongX ? p.hx : p.hz) * 2;
  const thick = alongX ? p.hz : p.hx;
  const items = useMemo(() => {
    const rand = rng(seed);
    const wins = [];
    const pil = [];
    const lamps = [];
    const n = Math.max(0, Math.floor(len / 7));
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + (i + 0.5) * (len / n);
      pil.push(u - len / n / 2);
      for (const y of p.h > 7 ? [3.3, 6.5] : [3.3]) wins.push({ u, y, lit: rand() < 0.3 });
      lamps.push({ u: u + len / n / 2, m: rand() });
    }
    const extra = [];
    if (len >= 14) {
      extra.push({ k: 'sign', u: (rand() - 0.5) * len * 0.5, y: p.h > 7 ? 4.9 : 3.8, i: Math.floor(rand() * 100) });
      extra.push({ k: 'ext', u: (rand() - 0.5) * len * 0.7 });
      if (full) extra.push({ k: 'cab', u: (rand() - 0.5) * len * 0.7 });
    }
    return { wins, pil, lamps, rand, extra };
  }, [len, seed, p.h, full]);
  const rot = alongX ? (side > 0 ? 0 : Math.PI) : side > 0 ? Math.PI / 2 : -Math.PI / 2;
  const origin = alongX ? [p.x, 0, p.z + side * (thick + 0.01)] : [p.x + side * (thick + 0.01), 0, p.z];
  return (
    <group position={origin} rotation={[0, rot, 0]}>
      <group>
        {len >= 7 && items.wins.map((w, i) => <Window key={i} w={{ ...w, u: alongX ? w.u * (side > 0 ? 1 : -1) : w.u * (side > 0 ? -1 : 1) }} rand={items.rand} />)}
        {items.pil.map((u, i) => (
          <group key={i} position={[(alongX ? u * (side > 0 ? 1 : -1) : u * (side > 0 ? -1 : 1)), 0, 0.17]}>
            <mesh position={[0, p.h / 2, 0]}><boxGeometry args={[0.55, p.h, 0.35]} /><meshStandardMaterial color="#6e7770" roughness={0.95} /></mesh>
            <mesh position={[0, 0.25, 0.02]}><boxGeometry args={[0.8, 0.5, 0.45]} /><meshStandardMaterial color="#2a312e" /></mesh>
            <mesh position={[0, p.h - 0.25, 0.02]}><boxGeometry args={[0.8, 0.5, 0.45]} /><meshStandardMaterial color="#2a312e" /></mesh>
          </group>
        ))}
        {items.lamps.map((l, i) => (
          <mesh key={`l${i}`} position={[(alongX ? l.u * (side > 0 ? 1 : -1) : l.u * (side > 0 ? -1 : 1)), Math.min(5.2, p.h - 1.5), 0.16]} material={l.m < 0.2 ? mats.dead : l.m < 0.5 ? mats.flicker : mats.steady}>
            <boxGeometry args={[0.28, 0.9, 0.16]} />
          </mesh>
        ))}
        {p.h > 7 && <mesh position={[0, 4.75, 0.12]}><boxGeometry args={[len, 0.35, 0.3]} /><meshStandardMaterial color="#232b28" roughness={0.9} /></mesh>}
        {p.h > 7 && <mesh position={[0, 4.95, 0.04]}><boxGeometry args={[len, 0.04, 0.06]} /><meshStandardMaterial color="#6f3a36" /></mesh>}
        {items.pil.map((u, i) => (i % 2 === 0 ? (
          <group key={`d${i}`} position={[(alongX ? (u + 3.2) * (side > 0 ? 1 : -1) : (u + 3.2) * (side > 0 ? -1 : 1)), 0, 0.07]}>
            <mesh position={[0, 1.15, 0]}><boxGeometry args={[1.5, 2.3, 0.1]} /><meshStandardMaterial color="#10171a" roughness={1} /></mesh>
            <mesh position={[0, 1.15, 0.06]}><boxGeometry args={[1.25, 2.1, 0.05]} /><meshStandardMaterial color="#3a2f27" roughness={1} /></mesh>
            <mesh position={[0.45, 1.1, 0.12]}><sphereGeometry args={[0.06, 6, 6]} /><meshStandardMaterial color="#9a8f6a" /></mesh>
            <mesh position={[0, 2.6, 0.05]}><boxGeometry args={[0.7, 0.3, 0.04]} /><meshBasicMaterial color="#2f6a52" /></mesh>
          </group>
        ) : null))}
        {items.extra.map((e, i) => {
          const u = alongX ? e.u * (side > 0 ? 1 : -1) : e.u * (side > 0 ? -1 : 1);
          if (e.k === 'sign') return <Sign key={`x${i}`} idx={e.i} u={u} y={e.y} />;
          if (e.k === 'ext') return <Extinguisher key={`x${i}`} u={u} />;
          return <Cabinet key={`x${i}`} u={u} />;
        })}
        {p.h > 7 && [3.5, 6.2].map((y) => (
          <mesh key={`b${y}`} position={[0, y, 0.05]}><boxGeometry args={[len, 0.16, 0.1]} /><meshStandardMaterial color="#1b2220" /></mesh>
        ))}
        <mesh position={[0, 0.6, 0.06]}><boxGeometry args={[len, 0.14, 0.12]} /><meshStandardMaterial color="#1b2220" /></mesh>
        <mesh position={[0, 1.75, 0.05]}><boxGeometry args={[len, 0.1, 0.1]} /><meshStandardMaterial color="#18201e" /></mesh>
        <mesh position={[0, p.h - 0.2, 0.2]}><boxGeometry args={[len + 0.2, 0.4, 0.45]} /><meshStandardMaterial color="#222a28" roughness={0.9} /></mesh>
      </group>
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
          <mesh position={[x, 11.6, 0]}><boxGeometry args={[0.3, 0.4, half * 2]} /><meshStandardMaterial color="#1a201e" roughness={0.9} /></mesh>
          {[-0.3, 0.3].map((f) => (
            <group key={f} position={[x + 1.2, 0, half * f]}>
              <mesh position={[0, 8.6, 0]}><cylinderGeometry args={[0.015, 0.015, 1.8, 4]} /><meshBasicMaterial color="#0d1110" /></mesh>
              <mesh position={[0, 7.6, 0]}><boxGeometry args={[0.2, 0.9, 0.2]} /><meshStandardMaterial color="#8fb7a0" emissive="#6fa08a" emissiveIntensity={i % 3 === 0 ? 0 : 0.6} /></mesh>
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
      {level !== 'none' && <FloorLines half={half} />}
      {walls.map((p, i) => {
        const len = (p.hx >= p.hz ? p.hx : p.hz) * 2;
        if (len < 7) return null;
        return [-1, 1].map((side) => <WallFace key={`${p.id}${side}`} p={p} side={side} mats={mats} seed={i * 31 + (side > 0 ? 7 : 3)} full={level === 'full'} />);
      })}
      {level === 'full' && <Beams half={half * 0.667} />}
      {level === 'full' && <HangingLights half={half} mats={mats} />}
      {level === 'full' && <Wires half={half} />}
      {level === 'full' && <Props half={half} />}
      {level === 'full' && <Litter half={half} seed={77} />}
      {level === 'full' && dust > 0 && <Dust half={half} count={dust} />}
      {level === 'full' && <pointLight position={[0, 6, 0]} intensity={2.5} distance={40} color="#b7d9c9" />}
    </group>
  );
}
