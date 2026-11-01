'use client';

import { useMemo, useRef } from 'react';
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

function WallFace({ p, side, mats, seed }) {
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
    return { wins, pil, lamps, rand };
  }, [len, seed, p.h]);
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
          <mesh position={[x, 9.7, 0]}><boxGeometry args={[0.5, 0.7, half * 2]} /><meshStandardMaterial color="#1a201e" roughness={0.9} /></mesh>
          {i % 2 === 0 && (
            <mesh position={[x, 4.8, 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[2.6, 9, half * 1.8]} />
              <meshBasicMaterial color="#8fb7d6" transparent opacity={0.035} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
      {[-half * 0.5, 0, half * 0.5].map((z) => (
        <mesh key={z} position={[0, 9.2, z]}><boxGeometry args={[half * 2, 0.4, 0.4]} /><meshStandardMaterial color="#1a201e" roughness={0.9} /></mesh>
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
      {walls.map((p, i) => {
        const len = (p.hx >= p.hz ? p.hx : p.hz) * 2;
        if (len < 7) return null;
        return [-1, 1].map((side) => <WallFace key={`${p.id}${side}`} p={p} side={side} mats={mats} seed={i * 31 + (side > 0 ? 7 : 3)} />);
      })}
      {level === 'full' && <Beams half={half * 0.667} />}
      {level === 'full' && <Litter half={half} seed={77} />}
      {level === 'full' && dust > 0 && <Dust half={half} count={dust} />}
      {level === 'full' && <pointLight position={[0, 6, 0]} intensity={2.5} distance={40} color="#b7d9c9" />}
    </group>
  );
}
