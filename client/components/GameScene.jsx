'use client';

import { useRef, useEffect, useState, useMemo, memo, Suspense } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Shape, Path, ShapeGeometry, BoxGeometry, BufferGeometry, Float32BufferAttribute, EdgesGeometry, Vector3, Matrix4, Quaternion, Euler, TextureLoader, DoubleSide, SRGBColorSpace, Color } from 'three';
import { itemOf } from '../lib/cosmetics';
import { getTexture, setTextureQuality } from '../lib/textures';
import { matches } from '../lib/keybinds';
import { createModeKey } from '../lib/modeKey';
import HospitalDecor from './HospitalDecor';
import StaticMerge from './StaticMerge';
import { useSettings, gfx, isBoard } from '../lib/settings';
import { setListener } from '../lib/sfx';
import { setPolyScale, installLowPoly } from '../lib/lowpoly';

const LOBBY_HALF_SIZE = 15;
const MATCH_HALF_SIZE = 60;

const COLOR_SELF_DAMAGE_OBJECT = '#e0555f';
const COLOR_CURADOR = '#f2a154';
const COLOR_PACIENTE = '#5fd58c';
const COLOR_UNASSIGNED = '#8a8da3';

const COLOR_FLOOR_MATCH = '#4f5a56';
const COLOR_METAL = '#8a8674';
const COLOR_WALL_TINT = '#bcd6ea';
const COLOR_EMERGENCY_LIGHT = '#5468ff';

const FACING = new Map();
export function facingOf(id) {
  const y = FACING.get(id);
  return y === undefined ? null : { x: Math.round(Math.sin(y) * 100) / 100, z: Math.round(Math.cos(y) * 100) / 100 };
}
const HAND_ANIMS = new Map();
const ANIM_DURATION = { swing: 650, swingL: 650, consume: 1700, throw: 750, cast: 850, shout: 1200, stumble: 900, roll: 600, plant: 900, vanish: 1000, pulse: 900, point: 750, pull: 900 };
const IMPACT_MS = { swing: 260, swingL: 260, consume: 1500, throw: 340, cast: 380, shout: 350, stumble: 250, roll: 150, plant: 520, vanish: 400, pulse: 350, point: 300, pull: 450 };
const HOLD_MS = { card_tropiezo: 1200, card_paraguayizador: 1000, card_acetilcolina: 1300, card_tajo_carmesi: 800, card_red_mist: 800, skill_melee_stun: 800, skill_golpe_aturdidor: 650, card_rodar: 650 };
const durOf = (h) => (h && (h.ms || ANIM_DURATION[h.anim])) || 1;
const STATE_HELD = new Set(['card_chicharron', 'card_goyslop', 'card_astral_claw', 'card_grito_animo']);
const ANIM_BY_KIND = {
  skill_melee_stun: 'swingL',
  skill_golpe_aturdidor: 'swingL',
  card_tajo_carmesi: 'swing',
  card_red_mist: 'swing',
  card_tropiezo: 'stumble',
  card_rodar: 'roll',
  card_racion_compartida: 'consume',
  card_acetilcolina: 'consume',
  skill_tonico_reforzado: 'consume',
  card_agua_rimac: 'throw',
  card_rimac_sin_filtrar: 'throw',
  card_humo_yodo: 'throw',
  card_humo_toxico: 'throw',
  card_cascara_platano: 'throw',
  card_lanza_quijote: 'plant',
  card_platano_podrido: 'throw',
  card_regalo_envenenado: 'throw',
  skill_somnifero_valeriana: 'throw',
  skill_ronda_suero: 'throw',
  skill_desinfectante: 'throw',
  skill_pulso_hierbas: 'pulse',
  skill_pulse: 'pulse',
  skill_anestesia: 'point',
  skill_stun: 'point',
  skill_camilla_magnetica: 'pull',
  skill_pull: 'pull',
  skill_raiz_atrayente: 'plant',
  skill_boost: 'consume',
  skill_purge: 'throw',
  card_grito_animo: 'cast',
  card_risa_enlatada: 'cast',
  card_risa_macabra: 'cast',
  card_paraguayizador: 'vanish',
};

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function HeldItem({ held }) {
  const groupRef = useRef();
  useFrame(() => {
    const group = groupRef.current;
    if (!group || !held) return;
    const t = Math.min(1, (Date.now() - held.startedAt) / durOf(held));
    group.visible = t < 1;
    const e = easeOut(t);
    if (held.anim === 'swingL') {
      group.position.set(-0.55, 1.45, 0.15);
      group.rotation.set(-2.4 + 2.6 * e, 0, 0);
      group.children[0].position.set(0, -0.75, 0);
      group.scale.setScalar(1.35);
    } else if (held.anim === 'swing') {
      group.position.set(0.55, 1.45, 0.1);
      group.rotation.set(-Math.PI + 2.9 * e, 0, 0);
      group.children[0].position.set(0, -0.9, 0);
      group.scale.setScalar(1.2);
    } else if (held.anim === 'shout') {
      group.position.set(0.1, 1.62, 0.4);
      group.rotation.set(0, 0, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(0.9 + 0.12 * Math.sin(t * 40));
    } else if (held.anim === 'vanish') {
      group.visible = t < 0.45;
      group.position.set(0.1, 1.2 + t * 0.6, 0.55);
      group.rotation.set(0, t * 14, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(Math.max(0.01, 1.2 * (1 - t / 0.45)));
    } else if (held.anim === 'pulse') {
      group.position.set(0, 1.35, 0.5 + 0.5 * easeOut(t));
      group.rotation.set(0, t * 8, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(Math.max(0.01, (0.7 + 0.8 * easeOut(t)) * (1 - t * 0.6)));
    } else if (held.anim === 'point') {
      const go = t < 0.4 ? 0 : (t - 0.4) / 0.6;
      group.position.set(0.5, 1.15, 0.5 + 2.4 * go);
      group.rotation.set(0, 0, go * 6);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(Math.max(0.01, 1.0 * (1 - go * 0.7)));
    } else if (held.anim === 'pull') {
      const back = t < 0.35 ? 0 : (t - 0.35) / 0.65;
      group.position.set(0, 1.2, 1.8 - 1.4 * easeOut(back));
      group.rotation.set(0, t * 6, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(Math.max(0.01, 1.2 * (1 - back * 0.6)));
    } else if (held.anim === 'stumble' || held.anim === 'roll') {
      group.position.set(0, 2.5 + 0.12 * Math.sin(t * 14), 0);
      group.rotation.set(0, 0, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(1.1 * Math.min(1, t * 6));
    } else if (held.anim === 'consume') {
      const toMouth = Math.min(1, t / 0.45);
      const bites = t < 0.55 ? 1 : Math.max(0.15, 1 - (t - 0.55) * 2.2);
      group.position.set(0.5 - 0.5 * easeOut(toMouth), 1.0 + 0.8 * easeOut(toMouth), 0.35);
      group.rotation.set(0, 0, -0.6 * easeOut(toMouth));
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(1.3 * bites);
    } else if (held.anim === 'plant') {
      const up = Math.min(1, t / 0.4);
      const down = t < 0.4 ? 0 : Math.min(1, (t - 0.4) / 0.2);
      group.position.set(0, 2.3 * easeOut(up) - 2.0 * down, 0.5 + 0.7 * down);
      group.rotation.set(0.2 * down, 0, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(t < 0.7 ? 1.3 : Math.max(0.01, 1.3 - (t - 0.7) * 4));
    } else if (held.anim === 'throw') {
      const wind = Math.min(1, t / 0.3);
      const fly = t < 0.3 ? 0 : (t - 0.3) / 0.7;
      group.position.set(0.5, 1.2 + 0.6 * wind - 1.0 * fly + Math.sin(fly * Math.PI) * 0.8, 0.2 - 0.3 * wind + fly * 3);
      group.rotation.set(fly * 9, 0, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(1.2);
    } else {
      const lift = Math.min(1, t / 0.5);
      group.position.set(0.5 - 0.5 * easeOut(lift), 1.0 + 1.4 * easeOut(lift), 0.3);
      group.rotation.set(0, t * 10, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(1.3 + 0.3 * Math.sin(t * 12));
    }
  });
  if (!held || !held.prop) return null;
  return (
    <group ref={groupRef}>
      <group>
        <PropMesh kind={held.prop} color={held.color} />
      </group>
    </group>
  );
}

const EAT_MS = { eat_chicharron: 1500, eat_goyslop: 1800 };

function StateHeld({ holdRef }) {
  const claw = useRef();
  const orb = useRef();
  const talons = useRef();
  const motes = useRef([]);
  const food = useRef();
  const horn = useRef();
  const aura = useRef();
  const last = useRef({ key: null, at: 0 });
  useFrame(({ clock }) => {
    const hold = holdRef.current || null;
    const l = last.current;
    if (hold !== l.key) { l.key = hold; l.at = Date.now(); }
    const el = Date.now() - l.at;
    const T = clock.elapsedTime;
    if (claw.current) {
      const on = hold === 'claw' || hold === 'claw_ready';
      claw.current.visible = on;
      if (on) {
        const ready = hold === 'claw_ready';
        const emerge = easeOut(Math.min(1, el / 700));
        const charge = ready ? 1 : Math.min(1, el / 5000);
        if (ready) {
          claw.current.position.set(0.54, 2.0, 0.5);
          claw.current.rotation.set(-1.2, 0, 0);
        } else {
          claw.current.position.set(0.54, 1.3 + Math.sin(T * 3) * 0.015, 0.66 * emerge);
          claw.current.rotation.set(0, 0, 0);
        }
        claw.current.scale.setScalar(Math.max(0.01, emerge * (ready ? 1.25 : 1)));
        if (orb.current) {
          const pulse = 1 + (ready ? 0.1 : 0.05 + 0.1 * charge) * Math.sin(T * (8 + 10 * charge));
          orb.current.scale.setScalar((0.03 + 0.15 * charge) * pulse);
          orb.current.material.color.setRGB(0.72 + 0.28 * charge, 0.5 + 0.45 * charge, 1 - 0.55 * charge);
        }
        const rate = 0.7 + 1.5 * charge;
        motes.current.forEach((m, i) => {
          if (!m) return;
          const ph = (T * rate + i / motes.current.length) % 1;
          const r = 0.75 * (1 - ph) + 0.02;
          const a = i * 2.4 + T * (2 + 3 * charge);
          m.position.set(Math.cos(a) * r, -0.64 + Math.sin(i * 1.7) * r * 0.7, Math.sin(a) * r);
          m.scale.setScalar((0.022 + 0.03 * ph) * (0.4 + charge));
          m.visible = ph > 0.05;
        });
      }
    }
    if (food.current) {
      const on = hold && hold.startsWith('eat_');
      food.current.visible = Boolean(on);
      if (on) {
        const t = Math.min(1, el / (EAT_MS[hold] || 1600));
        const up = easeOut(Math.min(1, t / 0.3));
        const bites = t < 0.35 ? 1 : Math.max(0.12, 1 - (t - 0.35) * 1.5);
        const chew = t > 0.35 ? Math.sin(t * 60) * 0.04 : 0;
        const bite = t > 0.2 ? Math.max(0, Math.sin(T * 11)) : 0;
        food.current.position.set(0.5 - 0.5 * up, 0.95 + 0.8 * up + chew - 0.08 * bite, 0.35 + 0.15 * up);
        food.current.rotation.set(0.5 * up, 0, -0.6 * up + (t > 0.35 ? Math.sin(t * 40) * 0.12 : 0));
        food.current.scale.setScalar(1.2 * bites);
        food.current.children[0].visible = hold === 'eat_chicharron';
        food.current.children[1].visible = hold !== 'eat_chicharron';
      }
    }
    if (horn.current) {
      const on = hold === 'horn';
      horn.current.visible = on;
      if (on) {
        const blow = Math.max(0, Math.sin(T * 7));
        horn.current.position.set(0.12, 1.72, 0.5 + 0.08 * blow);
        horn.current.rotation.set(Math.PI / 2, 0, 0);
        horn.current.scale.setScalar(1 + 0.18 * blow);
      }
    }
  });
  return (
    <>
      <group ref={claw} visible={false}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.1, 0.16, 0.1]} /><meshStandardMaterial color="#2b2e3d" metalness={0.8} roughness={0.35} /></mesh>
        <mesh position={[0, 0.12, 0]}><sphereGeometry args={[0.07, 8, 6]} /><meshStandardMaterial color="#1c1e29" metalness={0.8} roughness={0.4} /></mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, -0.12 - i * 0.16, 0]}><boxGeometry args={[0.07 - i * 0.008, 0.15, 0.07 - i * 0.008]} /><meshStandardMaterial color={i % 2 ? '#3a3f55' : '#242736'} metalness={0.9} roughness={0.3} emissive="#4a30b0" emissiveIntensity={0.25} /></mesh>
        ))}
        <group ref={talons} position={[0, -0.64, 0]}>
          <group rotation={[0, 0, -0.62]}>
            <mesh><torusGeometry args={[0.15, 0.032, 8, 20, 4.4]} /><meshStandardMaterial color="#2c2f40" metalness={1} roughness={0.22} emissive="#6a4cff" emissiveIntensity={0.4} /></mesh>
            <mesh position={[0.15, 0, 0]}><sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial color="#b85a2a" metalness={0.6} roughness={0.5} emissive="#ff8a3a" emissiveIntensity={0.5} /></mesh>
            <mesh position={[Math.cos(4.4) * 0.15, Math.sin(4.4) * 0.15, 0]}><sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial color="#b85a2a" metalness={0.6} roughness={0.5} emissive="#ff8a3a" emissiveIntensity={0.5} /></mesh>
          </group>
        </group>
        <mesh ref={orb} position={[0, -0.64, 0]}><sphereGeometry args={[1, 14, 10]} /><meshBasicMaterial color="#b88cff" transparent opacity={0.9} depthWrite={false} /></mesh>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} ref={(el) => { motes.current[i] = el; }} visible={false}><octahedronGeometry args={[1, 0]} /><meshBasicMaterial color={i % 2 ? '#ffe9a8' : '#b88cff'} transparent opacity={0.9} depthWrite={false} /></mesh>
        ))}
      </group>
      <group ref={food} visible={false}>
        <group><PropMesh kind="img_chicharron" color="#c98a3a" /></group>
        <group><PropMesh kind="img_goyslop" color="#8f8f4a" /></group>
      </group>
      <group ref={horn} visible={false}><PropMesh kind="megaphone" color="#f2d154" /></group>
    </>
  );
}

const R6_UP = new Vector3(0, 1, 0);
const R6_DOWN = new Vector3(0, -1, 0);
const SKIN = '#f2d27a';

function RagdollR6({ entityState, color }) {
  const torso = useRef();
  const head = useRef();
  const parts = useRef([]);
  const cur = useRef(null);
  const tmp = useMemo(() => ({ a: new Vector3(), b: new Vector3(), c: new Vector3(), r: new Vector3(), u: new Vector3(), f: new Vector3(), m: new Matrix4(), q: new Quaternion() }), []);

  useFrame((_, delta) => {
    const target = entityState.rag && entityState.rag.p;
    if (!target || !torso.current) return;
    if (!cur.current) cur.current = target.slice();
    const k = Math.min(1, delta * 18);
    for (let i = 0; i < target.length; i++) cur.current[i] += (target[i] - cur.current[i]) * k;
    const P = (i, out) => out.set(cur.current[i * 3], cur.current[i * 3 + 1], cur.current[i * 3 + 2]);
    const { a, b, c, r, u, f, m, q } = tmp;
    P(0, a); P(1, b);
    r.copy(b).sub(a).normalize();
    P(2, a); P(3, c);
    P(0, f); P(1, b);
    u.copy(f).add(b).multiplyScalar(0.5).sub(a.add(c).multiplyScalar(0.5)).normalize();
    f.crossVectors(r, u).normalize();
    r.crossVectors(u, f).normalize();
    m.makeBasis(r, u, f);
    q.setFromRotationMatrix(m);
    torso.current.quaternion.copy(q);
    P(0, a); P(1, b); P(2, c); P(3, f);
    torso.current.position.copy(a).add(b).add(c).add(f).multiplyScalar(0.25);
    head.current.quaternion.copy(q);
    P(5, head.current.position);
    [[0, 6, -1], [1, 7, 1], [2, 8, 0], [3, 9, 0]].forEach(([from, to, side], i) => {
      const mesh = parts.current[i];
      if (!mesh) return;
      P(from, a); P(to, b);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      if (side) mesh.position.addScaledVector(r, side * 0.18);
      c.copy(b).sub(a).normalize();
      mesh.quaternion.setFromUnitVectors(R6_DOWN, c);
    });
  });

  return (
    <group>
      <mesh ref={torso}><boxGeometry args={[0.72, 0.72, 0.36]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh ref={head}><cylinderGeometry args={[0.18, 0.18, 0.36, 14]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
      {[SKIN, SKIN, '#3a3d52', '#3a3d52'].map((col, i) => (
        <mesh key={i} ref={(el) => { parts.current[i] = el; }}><boxGeometry args={[0.36, 0.72, 0.36]} /><meshStandardMaterial color={col} roughness={0.6} /></mesh>
      ))}
    </group>
  );
}

export function CosmeticPieces({ slot, cosmetics }) {
  const item = itemOf(slot, cosmetics);
  if (!item) return null;
  return (
    <>
      {item.def.pieces.map((piece, i) => {
        const col = piece.c === 'main' ? item.color : piece.c;
        const args = piece.t === 'box' ? piece.s : piece.t === 'cyl' ? [piece.s[0], piece.s[1], piece.s[2], 14] : [piece.s[0], piece.s[1], 10];
        return (
          <mesh key={i} position={piece.p} rotation={piece.r || [0, 0, 0]}>
            {piece.t === 'box' ? <boxGeometry args={args} /> : piece.t === 'cyl' ? <cylinderGeometry args={args} /> : <coneGeometry args={args} />}
            <meshStandardMaterial color={col} roughness={0.7} />
          </mesh>
        );
      })}
    </>
  );
}

function HerbStaff() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 2.2) * 0.05;
  });
  const leaves = [[0, 0.1, 0, 0], [0.12, 0.0, 0.06, 0.7], [-0.12, 0.02, -0.05, -0.7], [0.06, 0.12, -0.1, 0.3], [-0.07, 0.14, 0.1, -0.4]];
  return (
    <group ref={ref} position={[0, -0.72, 0.28]}>
      <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.035, 0.05, 1.9, 6]} /><meshStandardMaterial color="#6b4a2a" roughness={0.9} /></mesh>
      <mesh position={[0, 1.18, 0]}><cylinderGeometry args={[0.07, 0.07, 0.1, 8]} /><meshStandardMaterial color="#c9b27a" roughness={0.8} /></mesh>
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, 1.42 + y, z]} rotation={[0, 0, r]}><coneGeometry args={[0.09, 0.42, 5]} /><meshStandardMaterial color={i % 2 ? '#4fa86a' : '#6fd58c'} roughness={0.7} /></mesh>
      ))}
      <mesh position={[0.1, 1.2, 0.05]}><sphereGeometry args={[0.07, 6, 5]} /><meshStandardMaterial color="#e0555f" roughness={0.6} /></mesh>
    </group>
  );
}

const EMOTE_MS = { fue_el: 1.8, schadenfreude: 2.2, costenas: 2.6, su_majestad: 1.8, ya_pues: 2.0, ni_me_mires: 2.0, ni_idea: 1.4, yo_me_encargo: 1.8, pulso: 1.8 };
const lerpK = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const EMOTE_POSES = {
  fue_el: (t) => {
    const wind = lerpK(t, 0, 0.3);
    const slap = Math.max(0, Math.sin(lerpK(t, 0.3, 0.55) * Math.PI));
    const point = lerpK(t, 0.55, 0.85);
    const hand = t < 0.55 ? -2.2 + 0.3 * slap : -2.2 + 0.65 * point;
    return { rax: hand * Math.max(wind, 1) + (t > 0.85 ? Math.sin(t * 14) * 0.08 : 0), raz: -0.85 * (1 - point), lax: -0.3 * point, pitch: 0.1 * point, hy: t > 0.3 && t < 0.7 ? Math.sin((t - 0.3) * 22) * 0.7 * (1 - lerpK(t, 0.5, 0.7)) : 0, yaw: slap * 0.25 };
  },
  schadenfreude: (t) => {
    const k = Math.sin(t * 18);
    const on = Math.min(1, t / 0.2);
    return { lax: -1.5 + k * 0.15, rax: -1.5 - k * 0.15, laz: -0.15, raz: 0.15, pitch: (0.35 + k * 0.1) * on, hx: -0.4 * on, offY: Math.abs(k) * 0.04 };
  },
  costenas: (t) => {
    const k = Math.sin(t * 5);
    return { lax: -2.6 + k * 0.4, rax: -2.6 - k * 0.4, laz: -0.4, raz: 0.4, legL: k * 0.35, legR: -k * 0.35, roll: k * 0.12, yaw: k * 0.25, offY: Math.abs(k) * 0.05 };
  },
  su_majestad: (t) => {
    const b = Math.sin(lerpK(t, 0, 0.6) * Math.PI / 2) * (1 - lerpK(t, 1.2, 1.8));
    return { pitch: 0.9 * b, rax: -1.2, raz: -1.1, lax: 0.6, hx: 0.2 * b };
  },
  ya_pues: (t) => {
    const k = Math.sin(t * 20) * 0.12;
    const down = Math.min(1, t / 0.25);
    return { offY: -0.35 * down, legL: -0.4 * down, legR: -1.4 * down, lax: -1.4 + k, rax: -1.4 - k, laz: -0.35, raz: 0.35, pitch: 0.15 * down, hx: 0.2 * down };
  },
  ni_me_mires: (t) => {
    const down = Math.min(1, t / 0.2);
    return { offY: -0.3 * down, pitch: 0.5 * down, lax: -2.9, rax: -2.9, laz: -0.5, raz: 0.5, roll: Math.sin(t * 30) * 0.03, legL: -0.5 * down, legR: -0.5 * down };
  },
  ni_idea: (t) => {
    const up = Math.min(1, t / 0.25) * (1 - lerpK(t, 1.1, 1.4));
    return { lax: -0.2, rax: -0.2, laz: -0.9 * up, raz: 0.9 * up, offY: 0.05 * Math.sin(up * Math.PI), hz: 0.3 * Math.sin(t * 6) * up };
  },
  yo_me_encargo: (t) => {
    const on = Math.min(1, t / 0.25) * (1 - lerpK(t, 1.6, 1.8));
    return { lax: -0.15 * on, rax: -0.15 * on, laz: -0.65 * on, raz: 0.65 * on, pitch: -0.12 * on, hx: -0.2 * on, lz: -0.18 * on, rz: 0.18 * on };
  },
  pulso: (t) => {
    const on = Math.min(1, t / 0.3) * (1 - lerpK(t, 1.5, 1.8));
    return { lax: -1.4 * on, laz: 0.2 * on, rax: -1.35 * on, raz: -0.9 * on, hx: 0.3 * on + (t > 1.2 ? Math.sin((t - 1.2) * 12) * 0.12 : 0) };
  },
};

const JEFFREY_URL = '/models/jeffrey/scene.gltf';
const JEFFREY_SCALE = 9;
const JEFFREY_HIP = 4.4;
const SCREEN_COLS = ['#2f58ff', '#f2f4ff', '#15151c'];
const _eul = new Euler();
const _q = new Quaternion();

function rot(b, x, y, z) {
  if (!b) return;
  _eul.set(x, y, z);
  _q.setFromEuler(_eul);
  b.quaternion.multiply(_q);
}

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const env = (t, d) => Math.sin(Math.PI * Math.max(0, Math.min(1, t / d)));

function armPose(P, side, fwd, up) {
  if (side === 'R') rot(P.rU, 0, -up, fwd);
  else rot(P.lU, 0, up, fwd);
}

function applyJeffreyPose(P, S, time) {
  const mv = S.mv;
  const cr = S.cr;
  rot(P.spine1, 0, Math.sin(time * 0.37) * 0.04, Math.sin(time * 1.4) * 0.016 + Math.max(0, Math.sin(time * 7.3)) * 0.01);
  rot(P.rT, 0, 0, -1.9);
  rot(P.lT, 0, 0, -1.9);
  rot(P.rC, 0, 0, 0.8);
  rot(P.lC, 0, 0, 0.8);
  rot(P.head, 0, Math.sin(time * 0.55) * 0.06, -1.12 + Math.sin(time * 0.8) * 0.05);
  rot(P.rH, 0, 0, 1.6);
  rot(P.lH, 0, 0, 1.6);
  armPose(P, 'R', 1.25, 0.05);
  armPose(P, 'L', 1.25, 0.05);
  const sway = 0.05 + 0.04 * mv;
  P.roots.forEach((r) => rot(r.b, 0, 0, 0.6 * r.s));
  P.tents.forEach((b, i) => rot(b, 0, Math.sin(time * 1.3 + i * 0.7) * sway, Math.sin(time * 1.1 + i * 0.5) * sway));
  if (mv > 0.05) {
    const ph = time * (5 + 3 * S.spd);
    const sw = Math.sin(ph);
    rot(P.rT, 0, 0, 0.42 * mv * sw);
    rot(P.lT, 0, 0, -0.42 * mv * sw);
    rot(P.rC, 0, 0, 0.35 * mv * Math.max(0, Math.cos(ph)));
    rot(P.lC, 0, 0, 0.35 * mv * Math.max(0, -Math.cos(ph)));
    rot(P.spine1, 0, 0, 0.03 * mv + Math.sin(ph * 2) * 0.05 * mv);
    armPose(P, 'R', -0.5 * mv * sw, 0.06);
    armPose(P, 'L', 0.5 * mv * sw, 0.06);
  }
  if (cr > 0.01) {
    rot(P.rT, 0, 0, -0.2 * cr);
    rot(P.lT, 0, 0, -0.2 * cr);
    rot(P.rC, 0, 0, 0.4 * cr);
    rot(P.lC, 0, 0, 0.4 * cr);
    rot(P.spine1, 0, 0, 0.12 * cr);
    rot(P.head, 0, 0, -0.25 * cr);
  }
  const fx = S.fx;
  if (!fx) return;
  const t = (performance.now() - fx.t0) / 1000;
  const k = fx.k;
  if (k === 'm1') {
    if (t > 0.5) return;
    const a = t < 0.14 ? lerp(0, -0.9, t / 0.14) : t < 0.28 ? lerp(-0.9, 1.45, (t - 0.14) / 0.14) : lerp(1.45, 0, (t - 0.28) / 0.22);
    const f = t < 0.14 ? 0 : t < 0.28 ? lerp(0, 0.45, (t - 0.14) / 0.14) : lerp(0.45, 0, (t - 0.28) / 0.22);
    armPose(P, 'R', a, 0.1);
    rot(P.rF, 0, 0, f);
    rot(P.spine1, 0, a * 0.12, 0);
    rot(P.lU, 0, 0, -a * 0.25);
  } else if (k === 0) {
    if (t > 1) return;
    const e = env(t, 1);
    armPose(P, 'R', 0.2, 1.1 * e);
    armPose(P, 'L', 0.2, 1.1 * e);
    rot(P.head, 0, 0, -0.25 * e);
  } else if (k === 9) {
    if (t > 0.8) return;
    const e = env(t, 0.8);
    armPose(P, 'R', 0.7 * e, -0.1);
    armPose(P, 'L', 0.7 * e, -0.1);
    rot(P.spine1, 0, 0, 0.2 * e);
  } else if (k === 1) {
    if (t > 1.5) return;
    const e = env(t, 1.5);
    armPose(P, 'R', 1.0 * e, -0.2 * e);
    armPose(P, 'L', 1.0 * e, -0.2 * e);
    rot(P.head, 0, 0, 0.35 * e);
    rot(P.spine1, 0, 0, 0.2 * e);
  } else if (k === 2) {
    if (t > 1.3) return;
    const e = env(t, 1.3);
    armPose(P, 'R', 0.1, 0.95 * e);
    armPose(P, 'L', 0.1, 0.95 * e);
    rot(P.spine1, 0, 0, -0.15 * e);
    rot(P.head, 0, 0, -0.15 * e);
  } else if (k === 3) {
    if (t > 1.3) return;
    const e = env(t, 1.3);
    armPose(P, 'R', 1.2 * e, 0.15);
    rot(P.spine1, 0, 0.15 * e, 0);
  } else if (k === 4) {
    if (t > 1) return;
    const e = env(t, 1);
    armPose(P, 'R', 1.3 * e, 0);
    armPose(P, 'L', -0.2 * e, 0.2 * e);
  } else if (k === 5) {
    if (t > 1.6) return;
    const e = env(t, 1.6);
    armPose(P, 'R', 0.9 + Math.sin(t * 6) * 0.35, 0.5 * e);
    armPose(P, 'L', 0.9 + Math.cos(t * 6) * 0.35, 0.5 * e);
  } else if (k === 6) {
    if (t > 1.2) return;
    const e = env(t, 1.2);
    armPose(P, 'R', 1.3 * e, 0.15);
    armPose(P, 'L', 1.3 * e, -0.15);
    rot(P.spine1, 0, 0, -0.18 * e);
  } else if (k === 7) {
    if (t > 1) return;
    const e = env(t, 1);
    armPose(P, 'R', 1.5 * e, 0);
    rot(P.head, 0, 0.2 * e, -0.15 * e);
  } else if (k === 8) {
    const e = Math.min(1, t / 0.5);
    armPose(P, 'R', 0.5, 1.3 * e);
    armPose(P, 'L', 0.5, 1.3 * e);
    rot(P.head, 0, 0, -0.4 * e);
    const sh = Math.sin(t * 55) * 0.04 * e;
    rot(P.spine1, sh, 0, sh);
  } else if (k === 'ultfire') {
    if (t > 0.9) return;
    const e = env(t, 0.9);
    armPose(P, 'R', 1.1 * e, 0.6 * e);
    armPose(P, 'L', 1.1 * e, 0.6 * e);
    rot(P.head, 0, 0, 0.3 * e);
  }
}

const JF = { tent: null, ents: null };
const GRAB_X = new Vector3(1, 0, 0);
const GRAB_V = new Vector3();
const GRAB_T = new Vector3();
const GRAB_W = new Vector3();
const GRAB_PQ = new Quaternion();
const GRAB_QW = new Quaternion();

function applyGrab(P, S) {
  const tn = JF.tent;
  const chain = P.chain1;
  if (!chain || !chain.length) return;
  const root = chain[0];
  root.scale.set(0.7, 0.7, 0.7);
  if (!tn || !tn.on) return;
  const t = (performance.now() - tn.t0) / 1000;
  if (t > 1.3) return;
  const prog = Math.min(1, t / 0.7);
  const retract = t > 0.7 ? Math.max(0.12, 1 - (t - 0.7) / 0.6 * 0.88) : 1;
  const ease = prog * prog * (3 - 2 * prog);
  chain.forEach((b) => b.quaternion.identity());
  root.scale.set(0.7, 0.7, 0.7);
  root.parent.updateWorldMatrix(true, true);
  root.getWorldPosition(GRAB_W);
  let aim = tn.yaw;
  let dist = tn.len;
  let ty = GRAB_W.y;
  let best = null;
  let bd = 4.5;
  const ents = JF.ents;
  if (ents) {
    if (tn.lock && ents[tn.lock]) best = ents[tn.lock];
    else {
      for (const [id, en] of Object.entries(ents)) {
        if (!en || en.boss || en.corpse || en.gone) continue;
        const d = Math.hypot(en.x - tn.tx, en.z - tn.tz);
        if (d < bd) { bd = d; best = en; tn.lock = id; }
      }
    }
  }
  if (best) {
    GRAB_T.set(best.x, (best.y || 0) + 0.9, best.z);
    ty = GRAB_T.y;
    aim = Math.atan2(GRAB_T.x - GRAB_W.x, GRAB_T.z - GRAB_W.z);
    dist = Math.hypot(GRAB_T.x - GRAB_W.x, GRAB_T.y - GRAB_W.y, GRAB_T.z - GRAB_W.z);
  }
  const hz = Math.max(0.5, Math.hypot(Math.sin(aim) * dist, Math.cos(aim) * dist));
  const pitch = best ? Math.atan2(ty - GRAB_W.y, hz) : 0.12;
  const reach = dist * ease * retract;
  root.parent.getWorldQuaternion(GRAB_PQ);
  GRAB_V.set(Math.sin(aim) * Math.cos(pitch), Math.sin(pitch), Math.cos(aim) * Math.cos(pitch)).normalize();
  GRAB_QW.setFromUnitVectors(GRAB_X, GRAB_V);
  root.quaternion.copy(GRAB_PQ.invert().multiply(GRAB_QW));
  root.updateWorldMatrix(true, true);
  root.getWorldPosition(GRAB_V);
  chain[chain.length - 1].getWorldPosition(GRAB_W);
  const L0 = Math.max(0.5, GRAB_V.distanceTo(GRAB_W));
  const k = Math.max(0.35, reach / L0);
  root.scale.set(0.7 * k, 0.7, 0.7);
}

function JeffreyBody({ poseRef }) {
  const { scene, animations } = useGLTF(JEFFREY_URL);
  const root = useRef();
  const { actions } = useAnimations(animations, root);
  const P = useMemo(() => {
    const p = { tents: [], screens: [], roots: [] };
    scene.traverse((o) => {
      if ((o.isMesh || o.isSkinnedMesh) && /smoke/i.test(o.material?.name || '')) o.visible = false;
      if (o.isMesh || o.isSkinnedMesh) {
        o.frustumCulled = false;
        const m = o.material;
        if (m && /^Screen/.test(m.name) && !p.screens.includes(m)) p.screens.push(m);
      }
      if (!o.isBone) return;
      const n = o.name;
      if (!o.userData.jfx) {
        o.userData.jfx = 1;
        if (/Bip01_(Spine1|Spine2)_/.test(n)) o.position.x *= 2.2;
        else if (/Bip01_[RL]_UpperArm_/.test(n)) o.scale.set(2, 0.82, 0.82);
      }
      if (/Bip01_Spine1_/.test(n)) p.spine1 = o;
      else if (/Bip01_Head1_/.test(n)) p.head = o;
      else if (/Bip01_R_UpperArm_/.test(n)) p.rU = o;
      else if (/Bip01_R_Forearm_/.test(n)) p.rF = o;
      else if (/Bip01_L_UpperArm_/.test(n)) p.lU = o;
      else if (/Bip01_R_Hand_/.test(n)) p.rH = o;
      else if (/Bip01_L_Hand_/.test(n)) p.lH = o;
      else if (/Bip01_R_Thigh_/.test(n)) p.rT = o;
      else if (/Bip01_L_Thigh_/.test(n)) p.lT = o;
      else if (/Bip01_R_Calf_/.test(n)) p.rC = o;
      else if (/Bip01_L_Calf_/.test(n)) p.lC = o;
      else if (/^[12]_Tent0[2-9]_/.test(n)) {
        p.tents.push(o);
        if (/^1_Tent0[2-9]_/.test(n)) (p.chain1 = p.chain1 || []).push(o);
        if (/^[12]_Tent02_/.test(n)) { o.scale.multiplyScalar(0.7); p.roots.push({ b: o, s: n[0] === '1' ? 1 : -1 }); }
      }
    });
    p.bones = [p.spine1, p.head, p.rU, p.rF, p.lU, p.rH, p.lH, p.rT, p.lT, p.rC, p.lC, ...p.tents].filter(Boolean);
    p.bind = p.bones.map((b) => b.quaternion.clone());
    p.screens.forEach((m) => { m.userData.orig = { c: m.color?.clone(), e: m.emissive?.clone(), i: m.emissiveIntensity }; });
    return p;
  }, [scene]);
  useEffect(() => {
    Object.values(actions).forEach((a) => a && a.stop());
  }, [actions]);
  useFrame((state) => {
    const S = poseRef.current;
    P.bones.forEach((b, i) => b.quaternion.copy(P.bind[i]));
    applyJeffreyPose(P, S, state.clock.elapsedTime);
    applyGrab(P, S);
    P.screens.forEach((m) => {
      const o = m.userData.orig;
      if (S.screen) {
        m.color?.set(S.screen);
        m.emissive?.set(S.screen);
        m.emissiveIntensity = S.screen === '#15151c' ? 0.1 : 1.4;
      } else if (o) {
        if (o.c) m.color.copy(o.c);
        if (o.e) m.emissive.copy(o.e);
        m.emissiveIntensity = o.i ?? 1;
      }
    });
  });
  const pivot = useRef();
  useFrame((state) => {
    const S = poseRef.current;
    const t = state.clock.elapsedTime;
    const bob = S.mv > 0.05 ? Math.sin(t * (5 + 3 * S.spd) * 2) * 0.012 * S.mv : 0;
    if (pivot.current) pivot.current.rotation.x = 1.5 + 0.1 * S.cr + bob;
  });
  return (
    <group ref={pivot} position={[0, JEFFREY_HIP + 0.45, -2.6]}>
      <group ref={root} scale={JEFFREY_SCALE} position={[0, -JEFFREY_HIP, 0]}><primitive object={scene} /></group>
    </group>
  );
}

function FallbackCube() {
  return (
    <mesh position={[0, 5, 0]} castShadow>
      <boxGeometry args={[6, 9, 6]} />
      <meshStandardMaterial color="#2b2433" roughness={0.6} />
    </mesh>
  );
}

function FlatBox({ innerRef, color }) {
  return (
    <group ref={innerRef} visible={false}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function SpAura({ e }) {
  const ref = useRef();
  const mat = useRef();
  const mat2 = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const low = Math.max(0, Math.min(1, -(e.sp ?? 0) / 45));
    const sz = Math.max(0.6, e.size || 1);
    ref.current.position.set(e.x, (e.y || 0) + 0.08, e.z);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (2 + 10 * low)) * (0.02 + 0.04 * low);
    ref.current.scale.setScalar((5 + 4 * low) * sz * pulse);
    const c = mat.current.color;
    c.setRGB(0.3 + 0.5 * low, 0.22 * (1 - low), 0.45 * (1 - low) + 0.05);
    mat.current.opacity = 0.18 + 0.35 * low;
    mat2.current.color.copy(c);
    mat2.current.opacity = 0.03 + 0.1 * low;
  });
  if (!e.boss) return null;
  return (
    <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.92, 1, 48]} />
        <meshBasicMaterial ref={mat} transparent depthWrite={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.92, 48]} />
        <meshBasicMaterial ref={mat2} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function BossFx({ e, yawRef }) {
  const ringsRef = useRef([]);
  const rings = useRef([{ on: false }, { on: false }]);
  const beamRef = useRef();
  const beam = useRef({ on: false });
  const boxRef = useRef();
  const box = useRef({ on: false });
  const stripRef = useRef();
  const strip = useRef({ on: false });
  const coneRef = useRef();
  const coneMat = useRef();
  const cone = useRef({ on: false });
  const tentRef = useRef([]);
  const tent = useRef({ on: false });
  const puffRef = useRef([]);
  const puffs = useRef({ on: false, list: [] });
  const lastT = useRef(e.bfx?.t);
  useFrame((state) => {
    const fx = e.bfx;
    const now = performance.now();
    const sk = Math.max(0.6, e.size || 1);
    if (fx && fx.t !== lastT.current) {
      lastT.current = fx.t;
      const k = fx.k;
      const ring = (i, color, maxR, dur) => { rings.current[i] = { on: true, color, maxR, dur, t0: now, x: e.x, z: e.z }; };
      const puff = () => {
        puffs.current = { on: true, t0: now, x: e.x, z: e.z, list: Array.from({ length: 12 }, () => ({ a: Math.random() * Math.PI * 2, d: Math.random(), h: Math.random(), s: 0.7 + Math.random() * 0.8 })) };
      };
      if (k === 'm1') box.current = { on: true, t0: now, x: e.x, z: e.z, yaw: Math.atan2(fx.fx ?? 0, fx.fz ?? 1), L: fx.L || 8, w: fx.w || 4 };
      else if (k === 0) ring(0, '#9aa8ff', 10 * (e.size || 1) + 4, 0.8);
      else if (k === 9) ring(0, '#8a8aa8', 8 * (e.size || 1) + 3, 0.6);
      else if (k === 1 || k === 'tparrive') puff();
      else if (k === 2) cone.current = { on: true, t0: now, x: e.x, z: e.z, yaw: Math.atan2(fx.fx ?? 0, fx.fz ?? 1), r: fx.r || 30, m: fx.m || 0 };
      else if (k === 3 && fx.tx !== undefined) {
        const dx = fx.tx - e.x;
        const dz = fx.tz - e.z;
        strip.current = { on: true, t0: now, x: e.x, z: e.z, yaw: Math.atan2(dx, dz), len: fx.len || Math.hypot(dx, dz), w: fx.w || 4 };
        tent.current = { on: true, t0: now, tx: fx.tx, tz: fx.tz, x: e.x, z: e.z, yaw: Math.atan2(dx, dz), len: fx.len || Math.hypot(dx, dz), sk };
      } else if (k === 4 && fx.tx !== undefined) ring(0, '#14101c', 8, 0.8);
      else if (k === 5) { ring(0, fx.back ? '#4aa8ff' : '#ffd24a', fx.r || 30, 1.1); ring(1, fx.back ? '#a8d8ff' : '#fff0b0', (fx.r || 30) * 0.65, 1.4); }
      else if (k === 6) ring(0, '#ff9a3c', fx.r || 10, 0.9);
      else if (k === 7 && fx.tx !== undefined) beam.current = { on: true, color: '#ff3b3b', x: fx.tx, z: fx.tz, t0: now, dur: 0.8 };
      else if (k === 'ultfire') { ring(0, '#ff2a2a', 60, 0.8); ring(1, '#ffffff', 40, 0.5); }
    }
    const b = box.current;
    const bx = boxRef.current;
    if (bx) {
      const t = (now - b.t0) / 1000 / 0.35;
      if (!b.on || t >= 1) { bx.visible = false; b.on = false; }
      else {
        bx.visible = true;
        bx.position.set(b.x, 0.2, b.z);
        bx.rotation.y = b.yaw;
        bx.children[0].position.z = b.L / 2;
        bx.children[0].scale.set(b.w, b.L, 1);
        bx.children[0].material.opacity = 0.55 * (1 - t);
      }
    }
    const sp = strip.current;
    const sm = stripRef.current;
    if (sm) {
      const t = (now - sp.t0) / 1000;
      if (!sp.on || t > 1.2) { sm.visible = false; sp.on = false; }
      else {
        sm.visible = true;
        sm.position.set(sp.x, 0.2, sp.z);
        sm.rotation.y = sp.yaw;
        sm.children[0].position.z = sp.len / 2;
        sm.children[0].scale.set(sp.w, sp.len, 1);
        sm.children[0].material.opacity = t < 0.7 ? 0.2 + 0.15 * Math.sin(t * 20) : 0.6 * (1 - (t - 0.7) / 0.5);
      }
    }
    const tn = tent.current;
    JF.tent = tn;
    if (tn.on) {
      const t = (now - tn.t0) / 1000;
      if (t > 1.2) tn.on = false;
      const prog = Math.min(1, t / 0.7);
      const retract = t > 0.9 ? 1 - (t - 0.9) / 0.3 : 1;
      tentRef.current.forEach((m, i) => {
        if (!m) return;
        m.visible = false;
        return;
        if (!tn.on) { m.visible = false; return; }
        const u = (i + 1) / tentRef.current.length;
        const along = tn.len * u * prog * retract;
        const wave = Math.sin(u * 7 - state.clock.elapsedTime * 14) * 0.9 * tn.sk * (1 - u * 0.3);
        m.visible = true;
        m.position.set(tn.x + Math.sin(tn.yaw) * along + Math.cos(tn.yaw) * wave, 1.6 * tn.sk + 0.8, tn.z + Math.cos(tn.yaw) * along - Math.sin(tn.yaw) * wave);
        m.scale.setScalar((0.6 - 0.35 * u) * tn.sk * 0.9 + 0.12);
      });
    } else tentRef.current.forEach((m) => { if (m) m.visible = false; });
    const cn = cone.current;
    const cm = coneRef.current;
    if (cm) {
      const t = (now - cn.t0) / 1000;
      if (!cn.on || t > 1.5) { cm.visible = false; cn.on = false; }
      else {
        cm.visible = true;
        cm.position.set(cn.x, 0.18, cn.z);
        cm.rotation.y = cn.yaw;
        cm.scale.setScalar(Math.max(0.5, cn.r * Math.min(1, 0.3 + t / 0.4)));
        if (coneMat.current) {
          coneMat.current.color.set(SCREEN_COLS[cn.m]);
          const boost = cn.m === 2 ? 1.5 : 1;
          coneMat.current.opacity = Math.min(0.8, boost * (t < 0.9 ? 0.18 + 0.12 * Math.sin(t * 12) : 0.5 * (1 - (t - 0.9) / 0.6)));
        }
      }
    }
    const pf = puffs.current;
    puffRef.current.forEach((m, i) => {
      if (!m) return;
      const t = (now - pf.t0) / 1000;
      if (!pf.on || t > 1.6) { m.visible = false; if (i === 0 && t > 1.6) pf.on = false; return; }
      const p = pf.list[i];
      const u = t / 1.6;
      m.visible = true;
      const r = (1.5 + 3.5 * p.d * u) * sk;
      m.position.set(pf.x + Math.cos(p.a) * r, (0.8 + 2.2 * p.h + 3 * u) * sk, pf.z + Math.sin(p.a) * r);
      m.scale.setScalar((1 + 2.2 * u) * p.s * sk);
      m.material.opacity = 0.85 * (1 - u);
    });
    rings.current.forEach((r, i) => {
      const m = ringsRef.current[i];
      if (!m) return;
      if (!r.on) { m.visible = false; return; }
      const t = (now - r.t0) / 1000 / r.dur;
      if (t >= 1) { r.on = false; m.visible = false; return; }
      m.visible = true;
      m.position.set(r.x, 0.2, r.z);
      m.scale.setScalar(Math.max(0.05, t * r.maxR));
      m.material.color.set(r.color);
      m.material.opacity = 0.85 * (1 - t);
    });
    const bm = beamRef.current;
    const bb = beam.current;
    if (bm) {
      if (!bb.on || (now - bb.t0) / 1000 > bb.dur) { bm.visible = false; bb.on = false; }
      else {
        const dx = bb.x - e.x;
        const dz = bb.z - e.z;
        const len = Math.hypot(dx, dz) || 1;
        const t = (now - bb.t0) / 1000 / bb.dur;
        bm.visible = true;
        bm.position.set(e.x + dx / 2, 2 + 2.4 * (e.size || 1), e.z + dz / 2);
        bm.rotation.order = 'YXZ';
        bm.rotation.set(Math.PI / 2, Math.atan2(dx, dz), 0);
        bm.scale.set(Math.max(0.05, 0.35 * (1 - t)), len, Math.max(0.05, 0.35 * (1 - t)));
        bm.material.color.set(bb.color);
        bm.material.opacity = 0.75 * (1 - t * 0.6);
      }
    }
  });
  return (
    <>
      <FlatBox innerRef={boxRef} color="#c8a0ff" />
      <FlatBox innerRef={stripRef} color="#ff4a6a" />
      <group ref={coneRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 1, 56, 1, -Math.PI / 2 - Math.PI * 0.75, Math.PI * 1.5]} />
          <meshBasicMaterial ref={coneMat} transparent depthWrite={false} side={DoubleSide} />
        </mesh>
      </group>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`t${i}`} ref={(m) => { tentRef.current[i] = m; }} visible={false}>
          {i === 13 ? <octahedronGeometry args={[1.6, 0]} /> : <sphereGeometry args={[1, 10, 8]} />}
          <meshStandardMaterial color={i === 13 ? '#9b4dff' : '#120d1a'} emissive={i === 13 ? '#9b4dff' : '#000000'} />
        </mesh>
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`p${i}`} ref={(m) => { puffRef.current[i] = m; }} visible={false}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#07050b" transparent depthWrite={false} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => { ringsRef.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.93, 1, 48]} />
          <meshBasicMaterial transparent depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
      <mesh ref={beamRef} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial transparent depthWrite={false} />
      </mesh>
    </>
  );
}

function BossCube({ e }) {
  const ref = useRef();
  const body = useRef();
  const pose = useRef({ fx: null, mv: 0, cr: 0, spd: 0, screen: null });
  const last = useRef({ x: e.x, z: e.z, yaw: 0, bt: undefined, scr: null });
  const yawRef = useRef(0);
  const size = e.size || 1;
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.visible = !e.invis;
    const k = Math.min(1, delta * 12);
    g.position.x += (e.x - g.position.x) * k;
    g.position.y += ((e.y || 0) - g.position.y) * k;
    g.position.z += (e.z - g.position.z) * k;
    g.scale.setScalar(g.scale.x + (size - g.scale.x) * Math.min(1, delta * 4));
    const L = last.current;
    const P = pose.current;
    const dx = e.x - L.x;
    const dz = e.z - L.z;
    const sp = Math.hypot(dx, dz) / Math.max(delta, 0.001);
    P.mv += ((sp > 0.4 ? 1 : 0) - P.mv) * Math.min(1, delta * 6);
    P.spd = Math.min(1, sp / 8);
    P.cr += ((e.cr ? 1 : 0) - P.cr) * Math.min(1, delta * 6);
    if (dx * dx + dz * dz > 0.0004) {
      let d = Math.atan2(dx, dz) - L.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      L.yaw += d * Math.min(1, delta * 7);
    }
    L.x = e.x; L.z = e.z;
    yawRef.current = L.yaw;
    if (body.current) {
      body.current.rotation.y = L.yaw;
      body.current.position.y = -0.13 * JEFFREY_SCALE * P.cr;
    }
    const now = performance.now();
    if (e.bfx && e.bfx.t !== L.bt) {
      L.bt = e.bfx.t;
      if (e.bfx.k !== 'tparrive') P.fx = { k: e.bfx.k, t0: now };
      if (e.bfx.k === 2) L.scr = { c: SCREEN_COLS[e.bfx.m || 0], until: now + 3200 };
      if (e.bfx.k === 'ultfire') L.scr = { c: '#ff2a2a', until: now + 3000 };
    }
    if (e.ult) {
      if (!P.fx || P.fx.k !== 8) P.fx = { k: 8, t0: now };
      L.scr = { c: '#ff2a2a', until: now + 400 };
    } else if (P.fx && P.fx.k === 8) P.fx = null;
    P.screen = L.scr && L.scr.until > now ? L.scr.c : null;
  });
  return (
    <>
      <group ref={ref} position={[e.x, e.y || 0, e.z]} scale={size} visible={!e.bhold}>
        <group ref={body}>
          <Suspense fallback={<FallbackCube />}>
            <JeffreyBody poseRef={pose} />
          </Suspense>
        </group>
      </group>
      {!e.bhold && <BossFx e={e} yawRef={yawRef} />}
      {!e.bhold && <SpAura e={e} />}
      {e.shadow && (
        <mesh position={[e.shadow.x, 1.2, e.shadow.z]}>
          <sphereGeometry args={[1.6, 16, 12]} />
          <meshBasicMaterial color="#14101c" transparent opacity={0.8} />
        </mesh>
      )}
      {e.tpMark && (
        <mesh position={[e.tpMark.x, 0.1, e.tpMark.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 2, 24]} />
          <meshBasicMaterial color="#9aa8ff" />
        </mesh>
      )}
    </>
  );
}

const WIG = '#ffe066';
const WIG_LIGHT = '#fff4b0';
const WIG_SHADE = '#e6b93a';
const WIG_TIE = '#b3343f';
const BANGS = [[-0.16, 0.11], [-0.08, 0.15], [0, 0.09], [0.08, 0.14], [0.16, 0.12]];
const BACK = [[0.44, 0.4, 0.1, -0.24, 0.04, WIG], [0.4, 0.3, 0.09, -0.3, -0.2, WIG_SHADE], [0.3, 0.22, 0.08, -0.34, -0.4, WIG_LIGHT]];
const LOCKS = [[-0.235, WIG], [0.235, WIG], [-0.265, WIG_SHADE], [0.265, WIG_SHADE]];

function WigPieces() {
  const m = (c) => <meshStandardMaterial color={c} roughness={0.75} />;
  return (
    <group>
      <mesh position={[0, 0.23, -0.01]}><boxGeometry args={[0.46, 0.1, 0.46]} />{m(WIG)}</mesh>
      <mesh position={[0, 0.29, -0.02]}><boxGeometry args={[0.34, 0.05, 0.38]} />{m(WIG_LIGHT)}</mesh>
      {BANGS.map(([x, h], i) => <mesh key={`b${i}`} position={[x, 0.2 - h / 2 + 0.02, 0.215]}><boxGeometry args={[0.085, h, 0.06]} />{m(i % 2 ? WIG_LIGHT : WIG)}</mesh>)}
      {LOCKS.map(([x, c], i) => <mesh key={`l${i}`} position={[x, i < 2 ? -0.03 : -0.16, i < 2 ? 0.0 : 0.04]}><boxGeometry args={[0.07, i < 2 ? 0.36 : 0.22, i < 2 ? 0.4 : 0.2]} />{m(c)}</mesh>)}
      {BACK.map(([w, h, d, z, y, c], i) => <mesh key={`k${i}`} position={[0, y, z]}><boxGeometry args={[w, h, d]} />{m(c)}</mesh>)}
      {[-1, 1].map((sd) => (
        <group key={`t${sd}`} position={[sd * 0.31, 0.1, -0.12]} rotation={[0, 0, -sd * 0.12]}>
          <mesh><boxGeometry args={[0.07, 0.07, 0.07]} />{m(WIG_TIE)}</mesh>
          <mesh position={[0, -0.26, 0]}><boxGeometry args={[0.13, 0.42, 0.12]} />{m(WIG)}</mesh>
          <mesh position={[sd * 0.01, -0.56, 0]}><boxGeometry args={[0.09, 0.22, 0.09]} />{m(WIG_LIGHT)}</mesh>
        </group>
      ))}
      <mesh position={[0.05, 0.4, 0.04]} rotation={[0, 0, -0.45]}><boxGeometry args={[0.025, 0.2, 0.025]} />{m(WIG_LIGHT)}</mesh>
      <mesh position={[-0.12, 0.31, -0.08]}><boxGeometry args={[0.1, 0.07, 0.05]} />{m(WIG_TIE)}</mesh>
      <mesh position={[-0.03, 0.31, -0.08]}><boxGeometry args={[0.1, 0.07, 0.05]} />{m(WIG_TIE)}</mesh>
    </group>
  );
}

function RifleBayonet({ live }) {
  const glow = useRef();
  const ring = useRef();
  useFrame(() => {
    if (ring.current) ring.current.rotation.z += 0.12;
    if (glow.current) glow.current.scale.setScalar(live ? 1 + Math.sin(Date.now() / 40) * 0.2 : 0.01);
  });
  return (
    <group position={[0.5, 1.1, 0.35]}>
      <mesh position={[0, -0.02, -0.28]}><boxGeometry args={[0.1, 0.17, 0.5]} /><meshStandardMaterial color="#6b4423" roughness={0.8} /></mesh>
      <mesh position={[0, 0.02, 0.08]}><boxGeometry args={[0.11, 0.13, 0.36]} /><meshStandardMaterial color="#2c2f3a" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.04, 0.62]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.028, 0.028, 0.9, 10]} /><meshStandardMaterial color="#3a3f4e" metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, 0.04, 1.08]}><boxGeometry args={[0.07, 0.07, 0.06]} /><meshStandardMaterial color="#d9b54a" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 0.0, 1.38]}><boxGeometry args={[0.025, 0.07, 0.55]} /><meshStandardMaterial color="#cfd8e3" metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 0.0, 1.68]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.035, 0.12, 6]} /><meshStandardMaterial color="#cfd8e3" metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[0, 0.07, 1.38]}><boxGeometry args={[0.012, 0.012, 0.5]} /><meshBasicMaterial color="#ffe14a" /></mesh>
      <mesh position={[0, -0.08, 0.2]}><boxGeometry args={[0.04, 0.05, 0.5]} /><meshStandardMaterial color="#b3343f" /></mesh>
      <mesh position={[0, 0.1, 0.1]}><boxGeometry args={[0.05, 0.05, 0.2]} /><meshStandardMaterial color="#d9b54a" metalness={0.6} roughness={0.3} /></mesh>
      <mesh ref={glow} position={[0, 0.04, 1.14]}><sphereGeometry args={[0.1, 10, 8]} /><meshBasicMaterial color="#ffe14a" transparent opacity={0.85} /></mesh>
      <mesh ref={ring} position={[0, 0.04, 1.3]}><torusGeometry args={[0.22, 0.012, 6, 28]} /><meshBasicMaterial color="#ffe14a" transparent opacity={0.8} /></mesh>
    </group>
  );
}

function ShieldDisc() {
  const hex = useRef();
  const grp = useRef();
  const born = useRef(Date.now());
  useFrame(() => {
    if (hex.current) hex.current.rotation.z -= 0.02;
    if (grp.current) grp.current.scale.setScalar(1.4 * Math.min(1, 0.2 + (Date.now() - born.current) / 220));
  });
  const ticks = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <group ref={grp} position={[0, 1.2, 1.0]} scale={1.4}>
      <mesh><circleGeometry args={[1.05, 40]} /><meshBasicMaterial color="#7fd8ff" transparent opacity={0.2} side={DoubleSide} depthWrite={false} /></mesh>
      <mesh><ringGeometry args={[0.97, 1.05, 40]} /><meshBasicMaterial color="#c8f1ff" transparent opacity={0.9} side={DoubleSide} depthWrite={false} /></mesh>
      <mesh ref={hex}><ringGeometry args={[0.5, 0.56, 6]} /><meshBasicMaterial color="#7fd8ff" transparent opacity={0.8} side={DoubleSide} depthWrite={false} /></mesh>
      <mesh><ringGeometry args={[0.74, 0.76, 40]} /><meshBasicMaterial color="#7fd8ff" transparent opacity={0.55} side={DoubleSide} depthWrite={false} /></mesh>
      {ticks.map((i) => <mesh key={i} position={[Math.cos((i * Math.PI) / 4) * 0.86, Math.sin((i * Math.PI) / 4) * 0.86, 0]} rotation={[0, 0, (i * Math.PI) / 4]}><boxGeometry args={[0.1, 0.03, 0.01]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.5, -0.1, -0.7]}><sphereGeometry args={[0.09, 8, 6]} /><meshBasicMaterial color="#c8f1ff" transparent opacity={0.8} /></mesh>)}
    </group>
  );
}

function ManaAura() {
  const ref = useRef();
  useFrame(() => { if (ref.current) ref.current.scale.setScalar(1 + Math.sin(Date.now() / 90) * 0.07); });
  return <mesh ref={ref} position={[0, 1.1, 0]}><sphereGeometry args={[0.95, 14, 10]} /><meshBasicMaterial color="#ffd86b" transparent opacity={0.16} depthWrite={false} /></mesh>;
}

function GlideFx() {
  const r = useRef();
  useFrame(() => { if (r.current) r.current.rotation.z += 0.18; });
  return (
    <group>
      <mesh ref={r} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.7, 0.03, 6, 28]} /><meshBasicMaterial color="#9fe8ff" transparent opacity={0.8} /></mesh>
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.5, 1.5, -0.3]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color="#ffe14a" /></mesh>)}
    </group>
  );
}

function useLife(effect, dur) {
  const mats = useRef(new Set());
  const grp = useRef();
  const reg = (m) => { if (m) mats.current.add(m); };
  useFrame(() => {
    const t = Math.min(1, (Date.now() - effect.startedAt) / dur);
    for (const m of mats.current) m.opacity = Math.max(0, 1 - t * t);
    if (grp.current) grp.current.userData.t = t;
  });
  return { reg, grp, t: () => Math.min(1, (Date.now() - effect.startedAt) / dur) };
}

function Mat({ reg, color, side }) {
  return <meshBasicMaterial ref={reg} color={color} transparent depthWrite={false} side={side} />;
}

function Ring({ life, color, y = 0.1, r0 = 0.2, r1 = 3, flat = true, spin = 0, dur }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const t = life.t();
    const sc = r0 + (r1 - r0) * t;
    ref.current.scale.set(sc, sc, sc);
    ref.current.rotation.z = spin * t;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <ringGeometry args={[0.9, 1, 40]} />
      <Mat reg={life.reg} color={color} side={DoubleSide} />
    </mesh>
  );
}

function Clock({ life, color, y, dir = 1 }) {
  const a = useRef();
  const b = useRef();
  useFrame(() => {
    const t = life.t();
    if (a.current) a.current.rotation.z = dir * t * 9;
    if (b.current) b.current.rotation.z = dir * t * 3;
  });
  return (
    <group position={[0, y, 0]}>
      <mesh><ringGeometry args={[0.8, 0.9, 32]} /><Mat reg={life.reg} color={color} side={DoubleSide} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => <mesh key={i} position={[Math.sin((i * Math.PI) / 6) * 0.7, Math.cos((i * Math.PI) / 6) * 0.7, 0]} rotation={[0, 0, -(i * Math.PI) / 6]}><boxGeometry args={[0.04, 0.12, 0.01]} /><Mat reg={life.reg} color={color} /></mesh>)}
      <group ref={a}><mesh position={[0, 0.32, 0]}><boxGeometry args={[0.04, 0.64, 0.01]} /><Mat reg={life.reg} color={color} /></mesh></group>
      <group ref={b}><mesh position={[0, 0.2, 0]}><boxGeometry args={[0.07, 0.4, 0.01]} /><Mat reg={life.reg} color={color} /></mesh></group>
    </group>
  );
}

function Sparks({ life, color, n = 8, speed = 3, up = 1.5, size = 0.07 }) {
  const refs = useRef([]);
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({ a: (i / n) * Math.PI * 2 + Math.random(), s: 0.6 + Math.random() * 0.8, u: Math.random() })), [n]);
  useFrame(() => {
    const t = life.t();
    seeds.forEach((sd, i) => {
      const m = refs.current[i];
      if (m) m.position.set(Math.cos(sd.a) * speed * sd.s * t, up * sd.u * t * (2 - t), Math.sin(sd.a) * speed * sd.s * t);
    });
  });
  return seeds.map((_, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }}><boxGeometry args={[size, size, size]} /><Mat reg={life.reg} color={color} /></mesh>);
}

function SuperFx({ effect }) {
  const kind = effect.kind;
  const dur = kind === 'sup_bayoneta' || kind === 'sup_parry' ? 520 : kind === 'sup_vuelva' || kind === 'sup_anulacion' ? 1300 : 1100;
  const life = useLife(effect, dur);
  const yaw = Math.atan2(effect.dx || 0, effect.dz || 1);
  const stamp = useRef();
  useFrame(() => {
    if (stamp.current) {
      const t = life.t();
      stamp.current.position.y = 4.2 - Math.min(1, t * 2.4) * 2.7;
      stamp.current.rotation.y = t * 7;
    }
  });
  if (kind === 'sup_bayoneta') {
    const len = effect.len || 3;
    const mx = (effect.x || 0) + (effect.dx || 0) * 1.7;
    const mz = (effect.z || 0) + (effect.dz || 0) * 1.7;
    return (
      <group position={[mx, (effect.y || 0) + 1.2, mz]} rotation={[0, yaw, 0]}>
        {effect.shot ? (
          <>
            <mesh position={[0, 0, len / 2]}><boxGeometry args={[0.07, 0.07, len]} /><Mat reg={life.reg} color="#ffe14a" /></mesh>
            <mesh position={[0, 0, len / 2]}><boxGeometry args={[0.025, 0.025, len]} /><Mat reg={life.reg} color="#ffffff" /></mesh>
            <group position={[0, 0, 0.15]}><Ring life={life} color="#ffe14a" y={0} r0={0.2} r1={1} flat={false} spin={5} /></group>
            <group position={[0, 0, 0.5]}><Ring life={life} color="#fff3b0" y={0} r0={0.1} r1={0.7} flat={false} spin={-5} /></group>
            <Sparks life={life} color="#ffe14a" n={7} speed={1.2} up={0.8} />
            {effect.hit && <group position={[0, 0, len]}><Sparks life={life} color="#ffffff" n={9} speed={1.6} up={1.2} size={0.09} /><Ring life={life} color="#ffe14a" y={0} r0={0.2} r1={1.2} flat={false} /></group>}
          </>
        ) : (
          <group position={[0, 0, 0.5]}>
            <mesh rotation={[0, 0, 0.6]}><ringGeometry args={[0.7, 0.85, 20, 1, 0, 2.2]} /><Mat reg={life.reg} color="#ffe14a" side={DoubleSide} /></mesh>
            <Sparks life={life} color="#ffffff" n={8} speed={1.4} up={0.9} />
          </group>
        )}
      </group>
    );
  }
  if (kind === 'sup_parry') {
    return (
      <group position={[effect.x, effect.y || 0, effect.z]}>
        <Ring life={life} color="#ffffff" y={1.2} r0={0.3} r1={3.4} flat={false} spin={3} />
        <Ring life={life} color="#7fd8ff" y={0.15} r0={0.4} r1={3.8} />
        <Sparks life={life} color="#ffffff" n={14} speed={2.4} up={2} size={0.1} />
      </group>
    );
  }
  if (kind === 'sup_barrera') {
    return (
      <group position={[effect.x, (effect.y || 0), effect.z]}>
        <Ring life={life} color="#7fd8ff" r0={0.5} r1={3} />
        <Ring life={life} color="#c8f1ff" y={0.4} r0={0.3} r1={2.2} />
        <Sparks life={life} color="#c8f1ff" n={10} speed={1.8} up={2.4} />
      </group>
    );
  }
  if (kind === 'sup_senuelo') {
    return (
      <group position={[effect.x, (effect.y || 0), effect.z]}>
        <Ring life={life} color="#b9a4ff" r0={0.4} r1={2.2} spin={4} />
        <Sparks life={life} color="#d8d8e8" n={12} speed={1.5} up={2.2} size={0.16} />
      </group>
    );
  }
  if (kind === 'sup_notificacion') {
    return (
      <group position={[effect.tx || 0, 0, effect.tz || 0]}>
        <Ring life={life} color="#e0555f" r0={0.4} r1={2.2} />
        <group ref={stamp} position={[0, 4, 0]}>
          <mesh><boxGeometry args={[0.9, 0.12, 0.9]} /><Mat reg={life.reg} color="#e0555f" /></mesh>
          <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.3, 0.3, 0.3]} /><Mat reg={life.reg} color="#7a1e28" /></mesh>
        </group>
        <Sparks life={life} color="#ffffff" n={6} speed={1.1} up={1.4} />
      </group>
    );
  }
  if (kind === 'sup_vuelva') {
    return (
      <>
        <group position={[effect.fx || 0, 0, effect.fz || 0]}>
          <Ring life={life} color="#b07cf2" r0={2} r1={0.2} spin={-6} />
          <Clock life={life} color="#d6b9ff" y={1.4} dir={-1} />
        </group>
        <group position={[effect.tx || 0, 0, effect.tz || 0]}>
          <Ring life={life} color="#b07cf2" r0={0.3} r1={2.4} spin={6} />
          <Sparks life={life} color="#e9d9ff" n={9} speed={1.4} up={2.2} />
        </group>
      </>
    );
  }
  if (kind === 'sup_anulacion') {
    return (
      <>
        <group position={[effect.fx || 0, 0, effect.fz || 0]}>
          <Ring life={life} color="#f2d154" r0={0.3} r1={2.2} />
          <Clock life={life} color="#ffe9a0" y={1.5} dir={-1} />
        </group>
        <group position={[effect.tx || 0, 0, effect.tz || 0]}>
          <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[0.5, 0.5, 3.6, 16, 1, true]} /><Mat reg={life.reg} color="#ffe9a0" side={DoubleSide} /></mesh>
          <Ring life={life} color="#f2d154" r0={2.2} r1={0.3} />
          <Sparks life={life} color="#fff3c4" n={10} speed={1.2} up={3} />
        </group>
      </>
    );
  }
  return null;
}

function PlayerCapsule({ playerId, entityState, color, isMe, isCurator, stunned, ragdoll, ghost, ghostOpacity = 0.65, cosmetics }) {
  const bodyRef = useRef();
  const lastPos = useRef([entityState.x, entityState.z]);
  const yaw = useRef(0);
  const [held, setHeld] = useState(null);
  const heldId = useRef(null);
  const holdRef = useRef(null);
  const holdStart = useRef({ key: null, at: 0 });
  holdRef.current = entityState.hold || null;
  const groupRef = useRef();
  const rag = useRef({ on: false });
  const limbRefs = useRef([]);
  const rig = useRef({});
  const headRef = useRef();
  const emo = useRef({ id: null, start: 0 });
  const walk = useRef({ phase: 0, amp: 0, px: entityState.x, pz: entityState.z, py: entityState.y, air: 0, t: 0 });
  const targetPos = useRef([entityState.x, entityState.y, entityState.z]);

  const lead = useRef({ t: 0, x: entityState.x, z: entityState.z, vx: 0, vz: 0 });
  useEffect(() => {
    const now = performance.now();
    const l = lead.current;
    const dt = (now - l.t) / 1000;
    if (isMe && dt > 0.02 && dt < 0.3) {
      l.vx = (entityState.x - l.x) / dt;
      l.vz = (entityState.z - l.z) / dt;
    } else if (!isMe || dt >= 0.3) {
      l.vx = 0;
      l.vz = 0;
    }
    l.t = now; l.x = entityState.x; l.z = entityState.z;
    const ahead = isMe ? 0.06 : 0;
    targetPos.current = [entityState.x + l.vx * ahead, entityState.y, entityState.z + l.vz * ahead];
  }, [entityState.x, entityState.y, entityState.z]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const wantOp = ghost ? ghostOpacity : entityState.invis ? 0.28 : 1;
    if (groupRef.current.userData.ghostOp !== wantOp && (wantOp !== 1 || groupRef.current.userData.ghostOp !== undefined)) {
      groupRef.current.userData.ghostOp = wantOp;
      groupRef.current.traverse((o) => {
        const m = o.material;
        if (m) {
          if (!m.userData.ghosted) { m.transparent = true; m.depthWrite = false; m.userData.ghosted = true; m.needsUpdate = true; }
          m.opacity = wantOp;
        }
      });
    }
    const mx = entityState.x - lastPos.current[0];
    const mz = entityState.z - lastPos.current[1];
    if (isMe && CAMERA_LOCK.on) {
      let diff = CAMERA_LOCK.yaw + Math.PI - yaw.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      yaw.current += diff * Math.min(1, delta * 14);
      lastPos.current = [entityState.x, entityState.z];
    } else if (Math.abs(mx) + Math.abs(mz) > 0.01) {
      const target = Math.atan2(mx, mz);
      let diff = target - yaw.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      yaw.current += diff * Math.min(1, delta * 14);
      lastPos.current = [entityState.x, entityState.z];
    }
    FACING.set(playerId, yaw.current);
    if (bodyRef.current) {
      const body = bodyRef.current;
      const w = walk.current;
      const speed = delta > 0 ? Math.hypot(entityState.x - w.px, entityState.z - w.pz) / delta : 0;
      w.px = entityState.x;
      w.pz = entityState.z;
      w.amp += (Math.min(1, speed / 3) - w.amp) * Math.min(1, delta * 10);
      w.phase += speed * delta * 1.8;
      const vy = delta > 0 ? (entityState.y - w.py) / delta : 0;
      w.py = entityState.y;
      w.air += ((Math.abs(vy) > 0.6 ? 1 : 0) - w.air) * Math.min(1, delta * 12);
      w.t += delta;
      const swing = Math.sin(w.phase) * (0.7 + 0.5 * Math.min(1, speed / 5)) * w.amp;
      const idle = Math.sin(w.t * 1.8) * 0.06 * (1 - w.amp);
      const flail = Math.sin(w.t * 18) * 0.35;
      let lax = -swing + idle;
      let rax = swing - idle;
      let laz = -0.06 - 0.3 * Math.abs(swing);
      let raz = 0.06 + 0.3 * Math.abs(swing);
      lax = lax * (1 - w.air) + (-2.4 + flail) * w.air;
      rax = rax * (1 - w.air) + (-2.4 - flail) * w.air;
      laz -= 0.5 * w.air;
      raz += 0.5 * w.air;
      const ha = HAND_ANIMS.get(playerId);
      if (ha && durOf(ha) > 1) {
        const ht = Math.min(1, (Date.now() - ha.startedAt) / durOf(ha));
        if (ha.anim === 'swingL') {
          lax = -2.4 + 2.6 * easeOut(ht);
          laz = -0.1;
        } else if (ha.anim === 'swing') {
          rax = -Math.PI + 2.9 * easeOut(ht);
          raz = 0.1;
        } else if (ha.anim === 'shout') {
          const up = easeOut(Math.min(1, ht / 0.3));
          rax = -1.9 * up;
          lax = -0.4 * up;
          raz = 0.2;
        } else if (ha.anim === 'stumble') {
          lax = -1.4 * Math.sin(ht * 14);
          rax = 1.4 * Math.sin(ht * 14);
          laz = -0.8;
          raz = 0.8;
        } else if (ha.anim === 'vanish') {
          const wr = easeOut(Math.min(1, ht / 0.3));
          lax = rax = -0.9 * wr;
          laz = 0.65 * wr;
          raz = -0.65 * wr;
        } else if (ha.anim === 'pulse') {
          const fw = easeOut(Math.min(1, ht / 0.3));
          const sp = ht < 0.3 ? 0 : easeOut(Math.min(1, (ht - 0.3) / 0.4));
          lax = rax = -1.5 * fw;
          laz = -0.1 - 0.9 * sp;
          raz = 0.1 + 0.9 * sp;
        } else if (ha.anim === 'point') {
          const up = easeOut(Math.min(1, ht / 0.35));
          rax = -1.55 * up;
          lax = -0.3 * up;
        } else if (ha.anim === 'pull') {
          const ex = easeOut(Math.min(1, ht / 0.35));
          const rt = ht < 0.35 ? 0 : easeOut(Math.min(1, (ht - 0.35) / 0.5));
          lax = rax = -1.6 * ex + 1.0 * rt;
          laz = -0.15;
          raz = 0.15;
        } else if (ha.anim === 'roll') {
          lax = -2.8;
          rax = -2.8;
          laz = -0.15;
          raz = 0.15;
        } else if (ha.anim === 'plant') {
          const up = easeOut(Math.min(1, ht / 0.4));
          const dn = ht < 0.4 ? 0 : easeOut(Math.min(1, (ht - 0.4) / 0.2));
          lax = rax = -3.0 * up + 2.3 * dn;
          laz = -0.12;
          raz = 0.12;
        } else if (ha.anim === 'consume') {
          const mouth = easeOut(Math.min(1, ht / 0.35));
          rax = -2.1 * mouth + (ht > 0.5 ? Math.sin(ht * 70) * 0.1 : 0);
          lax = -0.5 * mouth;
          raz = -0.25 * mouth;
        } else if (ha.anim === 'throw') {
          const wind = Math.min(1, ht / 0.3);
          const fly = ht < 0.3 ? 0 : (ht - 0.3) / 0.7;
          rax = 0.9 * wind - 2.8 * easeOut(fly);
          raz = 0.15;
        } else {
          const up = easeOut(Math.min(1, ht / 0.5));
          lax = -2.6 * up;
          rax = -2.6 * up;
          laz = -0.35 * up;
          raz = 0.35 * up;
        }
      }
      const hold = entityState.hold || null;
      const hs = holdStart.current;
      if (hold !== hs.key) { if (hs.key === 'claw_ready' && !hold) hs.throwAt = Date.now(); hs.key = hold; hs.at = Date.now(); }
      if (!hold && hs.throwAt && Date.now() - hs.throwAt < 450) {
        const tt = (Date.now() - hs.throwAt) / 450;
        rax = -2.3 + 3.0 * easeOut(tt);
        raz = 0.12;
        lax = -0.9 * (1 - tt);
      }
      if (hold) {
        const hel = Date.now() - hs.at;
        if (hold === 'claw') {
          const em = easeOut(Math.min(1, hel / 700));
          const tremor = Math.min(1, hel / 5000);
          rax = -1.15 * em + Math.sin(w.t * 22) * 0.012 * tremor;
          raz = 0.12 * em;
          lax = -0.45 * em;
          laz = -0.25 * em;
        } else if (hold === 'claw_ready') {
          rax = -2.3 + Math.sin(w.t * 9) * 0.04;
          raz = 0.12;
          lax = -0.9;
          laz = -0.3;
        } else if (hold === 'module') {
          lax = -1.25; rax = -1.25; laz = -0.15; raz = 0.15;
        } else if (hold === 'horn') {
          rax = -1.8; raz = 0.1; lax = -0.5 + Math.sin(w.t * 7) * 0.1;
        } else if (hold.startsWith('eat_')) {
          const up = easeOut(Math.min(1, hel / 380));
          const bite = hel > 500 ? Math.max(0, Math.sin(w.t * 11)) : 0;
          rax = -2.15 * up + bite * 0.35;
          raz = -0.3 * up;
          lax = -0.45 * up;
        }
      }
      const r6 = rig.current;
      let stompLeg = null;
      const eid = entityState.emote ? entityState.emote.id : null;
      if (eid !== emo.current.id) emo.current = { id: eid, start: performance.now() };
      let ep = null;
      let ew = 0;
      if (eid && EMOTE_POSES[eid]) {
        const et = (performance.now() - emo.current.start) / 1000;
        ew = Math.max(0, Math.min(1, et / 0.15, (EMOTE_MS[eid] + 0.1 - et) / 0.15));
        ep = EMOTE_POSES[eid](Math.min(et, EMOTE_MS[eid]));
      }
      const mix = (a, b) => (b === undefined ? a : a * (1 - ew) + b * ew);
      if (ha && ha.anim === 'stumble') {
        const st = Math.min(1, (Date.now() - ha.startedAt) / durOf(ha));
        stompLeg = st < 0.3 ? -1.5 * easeOut(st / 0.3) : -1.5 * Math.max(0, 1 - (st - 0.3) / 0.08);
        lax = -0.6 * Math.sin(Math.min(1, st / 0.3) * Math.PI / 2) + 0.6 * Math.max(0, (st - 0.3) / 0.7);
        rax = lax;
        laz = -0.5;
        raz = 0.5;
      }
      if (r6.legL) {
        const lLeg = swing * 1.1 + 0.5 * w.air;
        const rLeg = stompLeg !== null ? stompLeg : -swing * 1.1 - 0.3 * w.air;
        r6.legL.rotation.x = ep ? mix(lLeg, ep.legL) : lLeg;
        r6.legR.rotation.x = ep ? mix(rLeg, ep.legR) : rLeg;
        r6.legL.rotation.z = ep ? mix(0, ep.lz) : 0;
        r6.legR.rotation.z = ep ? mix(0, ep.rz) : 0;
        r6.armL.rotation.x = ep ? mix(lax, ep.lax) : lax;
        r6.armR.rotation.x = ep ? mix(rax, ep.rax) : rax;
        r6.armL.rotation.z = ep ? mix(laz, ep.laz) : laz;
        r6.armR.rotation.z = ep ? mix(raz, ep.raz) : raz;
      }
      if (headRef.current) headRef.current.rotation.set(ep ? mix(0, ep.hx) : 0, ep ? mix(0, ep.hy) : 0, ep ? mix(0, ep.hz) : 0);
      const showRag = Boolean(ragdoll && entityState.rag && entityState.rag.p);
      body.visible = !showRag;
      const pa = HAND_ANIMS.get(playerId);
      const pt = pa && durOf(pa) > 1 ? Math.min(1, (Date.now() - pa.startedAt) / durOf(pa)) : 1;
      let pitch = 0;
      let offY = 0;
      let offF = 0;
      if (pa && pt < 1) {
        if (pa.anim === 'roll') {
          pitch = pt * Math.PI * 2;
          offY = 0.9 - 0.9 * Math.cos(pitch);
          offF = -0.9 * Math.sin(pitch);
        } else if (pa.anim === 'stumble') {
          pitch = pt < 0.3 ? -0.18 * (pt / 0.3) : 0.2 * Math.max(0, 1 - (pt - 0.3) / 0.25);
          offY = pt >= 0.3 && pt < 0.4 ? -0.08 : 0;
        } else if (pa.anim === 'vanish') {
          offY = -0.12 * Math.sin(Math.min(1, pt / 0.4) * Math.PI / 2);
          pitch = 0.15 * Math.sin(Math.min(1, pt / 0.4) * Math.PI / 2);
        } else if (pa.anim === 'pull') {
          pitch = pt < 0.35 ? 0.1 * (pt / 0.35) : 0.1 - 0.35 * Math.min(1, (pt - 0.35) / 0.5);
        } else if (pa.anim === 'point') {
          pitch = 0.12 * Math.sin(Math.min(1, pt / 0.5) * Math.PI);
        } else if (pa.anim === 'shout') {
          pitch = -0.3 * Math.sin(Math.min(1, pt * 3) * Math.PI / 2) * (1 - Math.max(0, pt - 0.7) / 0.3);
        }
      }
      if (ep) {
        pitch = mix(pitch, ep.pitch === undefined ? pitch : pitch + ep.pitch);
        offY = mix(offY, ep.offY === undefined ? offY : offY + ep.offY);
      }
      body.rotation.order = 'YXZ';
      body.rotation.set(pitch, yaw.current + (ep && ep.yaw ? ep.yaw * ew : 0), ep && ep.roll ? ep.roll * ew : 0);
      body.position.set(Math.sin(yaw.current) * offF, offY, Math.cos(yaw.current) * offF);
      limbRefs.current.forEach((limb) => { if (limb) limb.visible = false; });
    }
    const anim = HAND_ANIMS.get(playerId);
    if (anim && anim.id !== heldId.current) {
      heldId.current = anim.id;
      setHeld(anim);
    } else if (!anim && heldId.current) {
      heldId.current = null;
      setHeld(null);
    } else if (anim && Date.now() - anim.startedAt > durOf(anim)) {
      HAND_ANIMS.delete(playerId);
    }
    groupRef.current.visible = !(CAMERA_LOCK.fp && CAMERA_LOCK.fpId === playerId);
    const t = Math.min(1, delta * (isMe ? 24 : 16));
    groupRef.current.position.x += (targetPos.current[0] - groupRef.current.position.x) * t;
    groupRef.current.position.y += (targetPos.current[1] - groupRef.current.position.y) * t;
    groupRef.current.position.z += (targetPos.current[2] - groupRef.current.position.z) * t;
  });

  return (
    <group ref={groupRef} position={targetPos.current} scale={entityState.scl || 1}>
      {entityState.chg && <ManaAura />}
      {entityState.gld && <GlideFx />}
      <group ref={bodyRef}>
        {entityState.wpn && <RifleBayonet live />}
        {entityState.bar && <ShieldDisc />}
        <mesh position={[0, 1.08, 0]}><boxGeometry args={[0.72, 0.72, 0.36]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
        <group ref={headRef} position={[0, 1.62, 0]}>
          <mesh><cylinderGeometry args={[0.18, 0.18, 0.36, 14]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
          <mesh position={[-0.07, 0.04, 0.175]}><boxGeometry args={[0.04, 0.06, 0.02]} /><meshBasicMaterial color="#12131a" /></mesh>
          <mesh position={[0.07, 0.04, 0.175]}><boxGeometry args={[0.04, 0.06, 0.02]} /><meshBasicMaterial color="#12131a" /></mesh>
          <mesh position={[0, -0.06, 0.175]}><boxGeometry args={[0.12, 0.025, 0.02]} /><meshBasicMaterial color="#12131a" /></mesh>
          <mesh position={[0, 0.2, -0.01]}><boxGeometry args={[0.4, 0.1, 0.4]} /><meshStandardMaterial color="#2a2320" roughness={0.9} /></mesh>
          <mesh position={[-0.07, 0.115, 0.178]}><boxGeometry args={[0.07, 0.015, 0.02]} /><meshBasicMaterial color="#2a2320" /></mesh>
          <mesh position={[0.07, 0.115, 0.178]}><boxGeometry args={[0.07, 0.015, 0.02]} /><meshBasicMaterial color="#2a2320" /></mesh>
          {entityState.wig && <WigPieces />}
          <CosmeticPieces slot="head" cosmetics={cosmetics} />
        </group>
        <mesh position={[0, 0.78, 0]}><boxGeometry args={[0.76, 0.08, 0.4]} /><meshStandardMaterial color="#1b1d29" roughness={0.8} /></mesh>
        <mesh position={[0, 1.4, 0.19]}><boxGeometry args={[0.3, 0.06, 0.02]} /><meshStandardMaterial color="#e4c9a8" roughness={0.7} /></mesh>
        <CosmeticPieces slot="torso" cosmetics={cosmetics} />
        <CosmeticPieces slot="back" cosmetics={cosmetics} />
        {[['armL', -0.54, 1.44, SKIN], ['armR', 0.54, 1.44, SKIN], ['legL', -0.18, 0.72, '#3a3d52'], ['legR', 0.18, 0.72, '#3a3d52']].map(([key, px, py, col]) => (
          <group key={key} ref={(el) => { rig.current[key] = el; }} position={[px, py, 0]}>
            <mesh position={[0, -0.36, 0]}><boxGeometry args={[0.36, 0.72, 0.36]} /><meshStandardMaterial color={col} roughness={0.6} /></mesh>
            {key.startsWith('leg') && <mesh position={[0, -0.68, 0.05]}><boxGeometry args={[0.4, 0.14, 0.5]} /><meshStandardMaterial color="#1b1d29" roughness={0.7} /></mesh>}
            {key.startsWith('arm') && <mesh position={[0, -0.7, 0]}><boxGeometry args={[0.38, 0.1, 0.38]} /><meshStandardMaterial color="#e4c9a8" roughness={0.6} /></mesh>}
            {key === 'armR' && isCurator && <HerbStaff />}
          </group>
        ))}
        <HeldItem held={held} />
        <StateHeld holdRef={holdRef} />
      </group>
      {ragdoll && entityState.rag && entityState.rag.p && <RagdollR6 entityState={entityState} color={color} />}
      {stunned && <StunHalo />}
      {isMe && (
        <mesh position={[0, 2.1, 0]}>
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function LobbyDecor() {
  const glow = useRef([]);
  const cross = useRef();
  useFrame(({ clock }) => {
    if (cross.current) { cross.current.rotation.y = clock.elapsedTime * 0.6; cross.current.position.y = Math.sin(clock.elapsedTime) * 0.15; }
    glow.current.forEach((m, i) => { if (m) m.position.y = 3.2 + Math.sin(clock.elapsedTime * 1.5 + i) * 0.25; });
  });
  const posts = Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * Math.PI * 2) * 11, Math.sin((i / 8) * Math.PI * 2) * 11]);
  const colors = ['#e0555f', '#f2a154', '#f2d154', '#5fd58c', '#54d1f2', '#5468ff', '#b07cf2', '#e8e9f0'];
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.6, 48]} />
        <meshBasicMaterial color="#54d1f2" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.2, 48]} />
        <meshBasicMaterial color="#1b1d29" transparent opacity={0.35} />
      </mesh>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.12, 0.16, 3, 8]} /><meshStandardMaterial color="#3a3d52" roughness={0.8} /></mesh>
          <mesh ref={(el) => { glow.current[i] = el; }} position={[0, 3.2, 0]}>
            <octahedronGeometry args={[0.32, 0]} />
            <meshBasicMaterial color={colors[i]} />
          </mesh>
        </group>
      ))}
      <group ref={cross}>
        <mesh position={[0, 4.6, 0]}><boxGeometry args={[0.5, 1.7, 0.2]} /><meshBasicMaterial color="#e0555f" /></mesh>
        <mesh position={[0, 4.6, 0]}><boxGeometry args={[1.7, 0.5, 0.2]} /><meshBasicMaterial color="#e0555f" /></mesh>
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={`r${i}`} position={[0, 0.03 + i * 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5 + i * 1.6, 5.08 + i * 1.6, 64]} />
          <meshBasicMaterial color="#54d1f2" transparent opacity={0.22 - i * 0.06} />
        </mesh>
      ))}
      <mesh position={[11.5, 5.2, 0.6]}><octahedronGeometry args={[0.45, 0]} /><meshBasicMaterial color="#f2d154" /></mesh>
      {[[-6, -6], [6, -6], [-6, 6], [6, 6]].map(([x, z], i) => (
        <mesh key={`b${i}`} position={[x, 0.3, z]}><boxGeometry args={[1.6, 0.6, 0.6]} /><meshStandardMaterial color="#4a4f66" roughness={0.9} /></mesh>
      ))}
    </group>
  );
}

function PitMesh({ p, pits }) {
  const joined = (s) => (pits || []).some((q) => q !== p && Math.abs(q.z - p.z) < 0.01 && Math.abs((q.x + (q.hx * (q.x < p.x ? 1 : -1))) - (p.x + s * p.hx)) < 0.01);
  const len = p.hx * 2;
  const wall = useMemo(() => getTexture('concrete', Math.max(1, Math.round(len / 3)), Math.max(1, Math.round(p.h / 3))), [len, p.h]);
  const floor = useMemo(() => getTexture('tile', Math.max(1, Math.round(len / 4)), Math.max(1, Math.round(p.hz * 2 / 4))), [len, p.hz]);
  const mat = <meshStandardMaterial map={wall} roughness={0.9} side={DoubleSide} />;
  const angle = p.ramp ? Math.atan2(p.h, len) * (p.ramp === '+x' ? 1 : -1) : 0;
  return (
    <group position={[p.x, 0, p.z]}>
      {p.ramp ? (
        <mesh position={[0, -p.h / 2, 0]} rotation={[0, 0, angle]}>
          <boxGeometry args={[Math.hypot(len, p.h), 0.1, p.hz * 2]} />
          <meshStandardMaterial map={floor} roughness={0.8} />
        </mesh>
      ) : (
        <mesh position={[0, -p.h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[len, p.hz * 2]} />
          <meshStandardMaterial map={floor} roughness={0.8} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, -p.h / 2, s * p.hz]}>
          <planeGeometry args={[len, p.h]} />
          {mat}
        </mesh>
      ))}
      {!p.ramp && [-1, 1].filter((s) => !joined(s)).map((s) => (
        <mesh key={`e${s}`} position={[s * p.hx, -p.h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[p.hz * 2, p.h]} />
          {mat}
        </mesh>
      ))}
    </group>
  );
}

function Ground({ halfSize, themed, pits }) {
  const tex = useMemo(() => (themed ? getTexture('tile', 0.25, 0.25) : null), [themed]);
  const groundGeo = useMemo(() => {
    const s = new Shape();
    s.moveTo(-halfSize, -halfSize); s.lineTo(halfSize, -halfSize); s.lineTo(halfSize, halfSize); s.lineTo(-halfSize, halfSize); s.closePath();
    for (const p of pits || []) {
      const h = new Path();
      h.moveTo(p.x - p.hx, -(p.z - p.hz)); h.lineTo(p.x + p.hx, -(p.z - p.hz)); h.lineTo(p.x + p.hx, -(p.z + p.hz)); h.lineTo(p.x - p.hx, -(p.z + p.hz)); h.closePath();
      s.holes.push(h);
    }
    return new ShapeGeometry(s);
  }, [halfSize, pits]);
  const floorColor = themed ? COLOR_FLOOR_MATCH : '#1b1d29';
  const gridColorMajor = themed ? '#c9c5b8' : '#3a3d52';
  const gridColorMinor = themed ? '#d8d4c8' : '#2a2d3d';
  const borderColor = themed ? COLOR_EMERGENCY_LIGHT : '#5468ff';
  const borderGeo = useMemo(() => new BoxGeometry(halfSize * 2, 0.01, halfSize * 2), [halfSize]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={groundGeo} attach="geometry" />
        <meshStandardMaterial color={tex ? '#ffffff' : floorColor} map={tex} roughness={themed ? 0.75 : 0.9} />
      </mesh>
      {!themed && <gridHelper
        args={[halfSize * 2, Math.round(halfSize * 1.33), gridColorMajor, gridColorMinor]}
        position={[0, 0.01, 0]}
      />}
      <lineSegments position={[0, 0.02, 0]}>
        <edgesGeometry args={[borderGeo]} />
        <lineBasicMaterial color={borderColor} />
      </lineSegments>
    </group>
  );
}

const SD_COLORS = { rhythm: '#ffd166', needle: '#54d1f2', mash: '#e07cf2', meter: '#7dff8a', lock: '#c8a2ff', keys: '#ff9a5a', pulso: '#ff6b81', termometro: '#6be3a0', pelota: '#ff9ecb', ampolla: '#ffb347', xilofono: '#6bb6ff', tambores: '#ffd166', boton: '#ff4d4d', manometro: '#a0e0ff', turbina: '#b0ffe0' };
const SD_TIER = { meter: '#7dff8a', rhythm: '#f2d154', needle: '#f2d154', mash: '#f2d154', lock: '#ff4a4a', keys: '#ff4a4a', pulso: '#7dff8a', termometro: '#7dff8a', pelota: '#7dff8a', ampolla: '#f2d154', xilofono: '#f2d154', tambores: '#f2d154', boton: '#f2d154', manometro: '#f2d154', turbina: '#f2d154' };

function SdModel({ kind, active }) {
  const spin = useRef();
  const mover = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (spin.current) spin.current.rotation.y = t * (active ? 3 : 1);
    if (mover.current) {
      if (kind === 'pulso') mover.current.scale.setScalar(1 + Math.max(0, Math.sin(t * 6)) * 0.35);
      else if (kind === 'pelota') mover.current.scale.set(1 + Math.sin(t * 3) * 0.12, 1 - Math.sin(t * 3) * 0.12, 1 + Math.sin(t * 3) * 0.12);
      else if (kind === 'turbina') mover.current.rotation.y = t * 9;
      else if (kind === 'manometro') mover.current.rotation.z = -0.9 + (0.5 + 0.5 * Math.sin(t * 2.2)) * 1.8;
      else if (kind === 'meter') mover.current.position.y = 0.35 + (0.5 + 0.5 * Math.sin(t * 2.4)) * 0.55;
      else if (kind === 'mash') mover.current.position.y = 0.42 + Math.abs(Math.sin(t * 4)) * 0.07;
      else if (kind === 'rhythm') mover.current.rotation.z = Math.sin(t * 8) * 0.35;
    }
  });
  const c = SD_COLORS[kind] || '#ffd166';
  const glow = active ? 0.9 : 0.35;
  if (kind === 'pulso') {
    return (
      <group>
        <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.9, 0.4, 0.6]} /><meshStandardMaterial color="#2a2d3a" roughness={0.6} /></mesh>
        <mesh position={[0, 0.55, -0.05]} rotation={[-0.4, 0, 0]}><boxGeometry args={[0.8, 0.5, 0.05]} /><meshStandardMaterial color="#0e1218" emissive={c} emissiveIntensity={glow * 0.4} /></mesh>
        <group ref={mover} position={[0, 0.58, 0.02]}><mesh position={[-0.06, 0, 0]}><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow + 0.4} /></mesh><mesh position={[0.06, 0, 0]}><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow + 0.4} /></mesh></group>
      </group>
    );
  }
  if (kind === 'termometro') {
    return (
      <group>
        <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.1, 0.1, 1.2, 12]} /><meshStandardMaterial color="#dff3f0" transparent opacity={0.7} /></mesh>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.055, 0.055, 0.7, 10]} /><meshStandardMaterial color="#e0555f" emissive="#e0555f" emissiveIntensity={glow} /></mesh>
        <mesh position={[0, 0.12, 0]}><sphereGeometry args={[0.2, 14, 12]} /><meshStandardMaterial color="#e0555f" emissive="#e0555f" emissiveIntensity={glow} /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.4, 0.45, 0.04, 14]} /><meshStandardMaterial color="#3d3f55" /></mesh>
      </group>
    );
  }
  if (kind === 'pelota') {
    return (
      <group>
        <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.38, 0.45, 0.24, 16]} /><meshStandardMaterial color="#3d3f55" /></mesh>
        <mesh ref={mover} position={[0, 0.5, 0]}><sphereGeometry args={[0.3, 16, 14]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow * 0.6} roughness={0.9} /></mesh>
      </group>
    );
  }
  if (kind === 'ampolla') {
    return (
      <group ref={spin} position={[0, 0.5, 0]}>
        <mesh><coneGeometry args={[0.3, 0.8, 14]} /><meshStandardMaterial color="#e9f4ff" transparent opacity={0.65} roughness={0.15} /></mesh>
        <mesh position={[0, -0.15, 0]}><coneGeometry args={[0.22, 0.45, 14]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow} /></mesh>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.09, 0.09, 0.22, 10]} /><meshStandardMaterial color="#b9b4cc" metalness={0.7} /></mesh>
      </group>
    );
  }
  if (kind === 'xilofono') {
    return (
      <group>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[-0.42 + i * 0.28, 0.25 + i * 0.03, 0]}><boxGeometry args={[0.2, 0.08, 0.7 - i * 0.08]} /><meshStandardMaterial color={['#e0555f', '#f2d154', '#7dff8a', '#6bb6ff'][i]} emissive={c} emissiveIntensity={glow * 0.3} /></mesh>)}
        <mesh position={[0, 0.1, 0.25]}><boxGeometry args={[1.2, 0.06, 0.06]} /><meshStandardMaterial color="#5a4632" /></mesh>
        <mesh position={[0, 0.1, -0.25]}><boxGeometry args={[1.2, 0.06, 0.06]} /><meshStandardMaterial color="#5a4632" /></mesh>
      </group>
    );
  }
  if (kind === 'tambores') {
    return (
      <group>
        <group position={[-0.28, 0, 0]} scale={0.8}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.32, 0.32, 0.5, 16]} /><meshStandardMaterial color={c} roughness={0.55} /></mesh><mesh position={[0, 0.56, 0]}><cylinderGeometry args={[0.33, 0.33, 0.04, 16]} /><meshStandardMaterial color="#f4ecd8" /></mesh></group>
        <group ref={mover} position={[0.3, 0, 0]} scale={0.65}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.32, 0.32, 0.5, 16]} /><meshStandardMaterial color="#e0555f" roughness={0.55} /></mesh><mesh position={[0, 0.56, 0]}><cylinderGeometry args={[0.33, 0.33, 0.04, 16]} /><meshStandardMaterial color="#f4ecd8" /></mesh></group>
      </group>
    );
  }
  if (kind === 'boton') {
    return (
      <group>
        <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.22, 0.4, 0.7, 12]} /><meshStandardMaterial color="#3d3f55" /></mesh>
        <mesh ref={mover} position={[0, 0.42, 0]}><sphereGeometry args={[0.4, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow + 0.2} /></mesh>
        <mesh position={[0, 0.72, 0]}><torusGeometry args={[0.42, 0.05, 8, 20]} /><meshStandardMaterial color="#f2d154" emissive="#f2d154" emissiveIntensity={0.4} /></mesh>
      </group>
    );
  }
  if (kind === 'manometro') {
    return (
      <group>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.1, 0.16, 0.6, 10]} /><meshStandardMaterial color="#3d3f55" /></mesh>
        <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.46, 0.46, 0.12, 24]} /><meshStandardMaterial color="#e8ecf2" metalness={0.3} /></mesh>
        <mesh position={[0, 0.8, 0.07]}><torusGeometry args={[0.4, 0.025, 6, 24, Math.PI]} /><meshStandardMaterial color="#e0555f" /></mesh>
        <group position={[0, 0.8, 0.09]}><group ref={mover}><mesh position={[0, 0.2, 0]}><boxGeometry args={[0.03, 0.4, 0.02]} /><meshStandardMaterial color="#111" /></mesh></group></group>
      </group>
    );
  }
  if (kind === 'turbina') {
    return (
      <group>
        <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.45, 0.5, 0.16, 8]} /><meshStandardMaterial color="#3d3f55" /></mesh>
        <group ref={mover} position={[0, 0.55, 0]}>
          {[0, 1, 2, 3].map((i) => <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0.5]} position={[0.2 * Math.cos((i * Math.PI) / 2), 0, -0.2 * Math.sin((i * Math.PI) / 2)]}><boxGeometry args={[0.4, 0.04, 0.16]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow} /></mesh>)}
        </group>
      </group>
    );
  }
  if (kind === 'lock') {
    return (
      <group>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.5, 0.55, 0.4, 6]} /><meshStandardMaterial color="#2a2438" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[0, 0.62, 0]}><boxGeometry args={[0.62, 0.46, 0.34]} /><meshStandardMaterial color="#8d86a8" metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0, 0.98, 0]}><torusGeometry args={[0.2, 0.06, 8, 18, Math.PI]} /><meshStandardMaterial color="#b9b4cc" metalness={0.9} roughness={0.2} /></mesh>
        <mesh position={[0, 0.62, 0.18]}><boxGeometry args={[0.1, 0.18, 0.04]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow + 0.3} /></mesh>
        <group ref={spin} position={[0, 0.18, 0]}>
          {[0, 1, 2].map((i) => <mesh key={i} position={[0.42 * Math.cos(i * 2.09), 0.2, 0.42 * Math.sin(i * 2.09)]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow + 0.4} /></mesh>)}
        </group>
      </group>
    );
  }
  if (kind === 'keys') {
    return (
      <group>
        <mesh position={[0, 0.14, 0]}><boxGeometry args={[1.1, 0.28, 0.8]} /><meshStandardMaterial color="#2c2a30" roughness={0.6} /></mesh>
        <mesh position={[0, 0.45, -0.15]} rotation={[-0.5, 0, 0]}><boxGeometry args={[1.0, 0.5, 0.06]} /><meshStandardMaterial color="#12141c" emissive={c} emissiveIntensity={glow * 0.5} /></mesh>
        {[[0, 0.18], [-0.26, 0], [0.26, 0], [0, -0.18]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.31, 0.12 + z]}><boxGeometry args={[0.2, 0.06, 0.16]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow + (active ? 0.4 : 0)} /></mesh>
        ))}
      </group>
    );
  }
  if (kind === 'needle') {
    return (
      <group ref={spin} position={[0, 0.55, 0]} rotation={[0, 0, 0.35]}>
        <mesh><cylinderGeometry args={[0.13, 0.13, 0.62, 14]} /><meshStandardMaterial color="#cfeaf5" transparent opacity={0.75} roughness={0.15} /></mesh>
        <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.095, 0.095, 0.34, 12]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow} /></mesh>
        <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.04, 0.04, 0.2, 8]} /><meshStandardMaterial color="#e8e8ee" /></mesh>
        <mesh position={[0, 0.52, 0]}><boxGeometry args={[0.34, 0.05, 0.12]} /><meshStandardMaterial color="#e8e8ee" /></mesh>
        <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.035, 0.38, 8]} /><meshStandardMaterial color="#f2f2f6" metalness={0.6} roughness={0.2} /></mesh>
        <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.3, 0.04, 0.1]} /><meshStandardMaterial color="#f2f2f6" /></mesh>
      </group>
    );
  }
  if (kind === 'mash') {
    return (
      <group>
        <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.5, 0.58, 0.32, 18]} /><meshStandardMaterial color="#3d3f55" roughness={0.5} /></mesh>
        <mesh position={[0, 0.34, 0]}><torusGeometry args={[0.38, 0.04, 8, 24]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={glow} /></mesh>
        <mesh ref={mover} position={[0, 0.42, 0]}><sphereGeometry args={[0.34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e0555f" emissive="#e0555f" emissiveIntensity={glow} roughness={0.3} /></mesh>
      </group>
    );
  }
  if (kind === 'meter') {
    return (
      <group>
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.38, 0.45, 0.12, 14]} /><meshStandardMaterial color="#3d3f55" /></mesh>
        <mesh position={[0, 0.65, 0]}><boxGeometry args={[0.3, 1.25, 0.3]} /><meshStandardMaterial color="#2c3350" /></mesh>
        {[['#e0555f', 0.2], ['#f2d154', 0.45], ['#7dff8a', 0.65], ['#f2d154', 0.85], ['#e0555f', 1.1]].map(([col, y], i) => (
          <mesh key={i} position={[0, y, 0.16]}><boxGeometry args={[0.24, 0.2, 0.02]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.4} /></mesh>
        ))}
        <mesh ref={mover} position={[0, 0.6, 0.2]}><boxGeometry args={[0.5, 0.07, 0.1]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={glow} /></mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.42, 0.42, 0.5, 20]} /><meshStandardMaterial color={c} roughness={0.55} /></mesh>
      <mesh position={[0, 0.56, 0]}><cylinderGeometry args={[0.43, 0.43, 0.04, 20]} /><meshStandardMaterial color="#f4ecd8" roughness={0.8} /></mesh>
      <mesh position={[0, 0.58, 0]}><torusGeometry args={[0.42, 0.03, 8, 24]} /><meshStandardMaterial color="#e0555f" emissive="#e0555f" emissiveIntensity={glow} /></mesh>
      <group ref={mover} position={[0, 0.9, 0]}>
        <mesh position={[-0.2, 0, 0]} rotation={[0, 0, 0.9]}><cylinderGeometry args={[0.025, 0.025, 0.5, 6]} /><meshStandardMaterial color="#8b5a2b" /></mesh>
        <mesh position={[0.2, 0, 0]} rotation={[0, 0, -0.9]}><cylinderGeometry args={[0.025, 0.025, 0.5, 6]} /><meshStandardMaterial color="#8b5a2b" /></mesh>
      </group>
    </group>
  );
}

function SelfDamageObject({ position, near, active, kind }) {
  const groupRef = useRef();
  const ringRef = useRef();
  const targetPos = useRef([position.x, position.y, position.z]);

  useEffect(() => {
    targetPos.current = [position.x, position.y, position.z];
  }, [position.x, position.y, position.z]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const t = Math.min(1, delta * 8);
    groupRef.current.position.x += (targetPos.current[0] - groupRef.current.position.x) * t;
    groupRef.current.position.y += (targetPos.current[1] - groupRef.current.position.y) * t;
    groupRef.current.position.z += (targetPos.current[2] - groupRef.current.position.z) * t;
    if (ringRef.current) {
      const k = 1 + 0.12 * Math.sin(performance.now() / 120);
      ringRef.current.scale.set(k, k, k);
    }
  });

  return (
    <group ref={groupRef} position={targetPos.current}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, kind === 'lock' || kind === 'keys' ? 0.86 : 0.8, 32]} />
        <meshBasicMaterial color={SD_TIER[kind] || '#f2d154'} transparent opacity={0.75} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshBasicMaterial color={SD_COLORS[kind] || '#ffd166'} transparent opacity={0.28} />
      </mesh>
      {(near || active) && (
        <mesh ref={ringRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color={active ? '#ffffff' : SD_COLORS[kind] || '#ffd166'} transparent opacity={active ? 0.95 : 0.7} side={DoubleSide} />
        </mesh>
      )}
      <group scale={active ? 1.2 : near ? 1.1 : 1}>
        <SdModel kind={kind} active={active} />
      </group>
    </group>
  );
}

function CollisionObjectMesh({ type, radius }) {
  switch (type) {
    case 'gurney':
      return (
        <group>
          <mesh position={[0, 0.5, 0]} rotation={[0, 0.15, 0]}>
            <boxGeometry args={[radius * 2, 0.15, radius * 1.7]} />
            <meshStandardMaterial color={COLOR_METAL} roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.3, 6]} />
            <meshStandardMaterial color="#2a2d3d" roughness={0.8} />
          </mesh>
        </group>
      );
    case 'shelf':
      return (
        <group rotation={[0, -0.1, 0]}>
          <mesh position={[0, radius * 0.9, 0]}>
            <boxGeometry args={[radius * 1.95, radius * 1.8, radius * 1.5]} />
            <meshStandardMaterial color={COLOR_METAL} roughness={0.7} metalness={0.3} />
          </mesh>
          {[0.4, 0.9, 1.4].map((h, i) => (
            <mesh key={i} position={[0, h, radius * 0.31]}>
              <boxGeometry args={[radius * 1.9, 0.04, 0.05]} />
              <meshStandardMaterial color="#12131a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    case 'cart':
      return (
        <group rotation={[0, 0.3, 0]}>
          <mesh position={[0, radius * 0.9, 0]}>
            <boxGeometry args={[radius * 1.9, radius * 1.6, radius * 1.5]} />
            <meshStandardMaterial color={COLOR_METAL} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, radius * 1.75, 0]}>
            <boxGeometry args={[radius * 1.9, 0.06, radius * 1.5]} />
            <meshStandardMaterial color="#c9c5b8" roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
      );
    case 'crate':
      return (
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[radius * 1.6, 1.1, radius * 1.6]} />
          <meshStandardMaterial color="#a47c48" roughness={0.9} />
        </mesh>
      );
    case 'desk':
      return (
        <group>
          <mesh position={[0, 0.9, 0]}><boxGeometry args={[radius * 2, 0.12, radius * 1.8]} /><meshStandardMaterial color="#7a5a3a" roughness={0.7} /></mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
            <mesh key={`${a}${b}`} position={[a * radius * 0.9, 0.45, b * radius * 0.8]}><boxGeometry args={[0.1, 0.9, 0.1]} /><meshStandardMaterial color="#5a4129" /></mesh>
          ))}
        </group>
      );
    case 'plant':
      return (
        <group>
          <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[radius * 0.8, radius * 0.7, 0.5, 10]} /><meshStandardMaterial color="#b0603c" roughness={0.9} /></mesh>
          <mesh position={[0, 0.95, 0]}><sphereGeometry args={[radius * 1.0, 10, 8]} /><meshStandardMaterial color="#4f9a5a" roughness={0.9} /></mesh>
        </group>
      );
    case 'tank':
      return (
        <group>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[radius * 0.95, radius * 0.95, 2, 12]} /><meshStandardMaterial color="#5b8fb0" roughness={0.4} metalness={0.5} /></mesh>
          <mesh position={[0, 2.05, 0]}><sphereGeometry args={[radius * 0.95, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#4a7a96" metalness={0.5} roughness={0.4} /></mesh>
        </group>
      );
    case 'bed':
      return (
        <group>
          <mesh position={[0, 0.55, 0]}><boxGeometry args={[radius * 2, 0.18, radius * 1.1]} /><meshStandardMaterial color="#c9d3d0" roughness={0.7} /></mesh>
          <mesh position={[-radius * 0.55, 0.72, 0]}><boxGeometry args={[radius * 0.7, 0.14, radius * 0.9]} /><meshStandardMaterial color="#e8ecea" roughness={0.9} /></mesh>
          <mesh position={[radius * 0.95, 0.85, 0]}><boxGeometry args={[0.1, 0.7, radius * 1.1]} /><meshStandardMaterial color="#6f7b74" roughness={0.6} metalness={0.4} /></mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
            <mesh key={`${a}${b}`} position={[a * radius * 0.85, 0.25, b * radius * 0.45]}><cylinderGeometry args={[0.05, 0.05, 0.5, 6]} /><meshStandardMaterial color="#2a2d3d" /></mesh>
          ))}
        </group>
      );
    case 'vending':
      return (
        <group>
          <mesh position={[0, 1, 0]}><boxGeometry args={[radius * 1.8, 2, radius * 1.4]} /><meshStandardMaterial color="#a33a3a" roughness={0.6} /></mesh>
          <mesh position={[0, 1.2, radius * 0.71]}><boxGeometry args={[radius * 1.2, 1.1, 0.04]} /><meshStandardMaterial color="#9fe3ff" emissive="#3a8fb0" emissiveIntensity={0.7} /></mesh>
        </group>
      );
    case 'mri':
      return (
        <group>
          <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}><torusGeometry args={[radius * 0.75, radius * 0.28, 10, 18]} /><meshStandardMaterial color="#c9d3d6" roughness={0.5} metalness={0.3} /></mesh>
          <mesh position={[0, 0.7, 0]}><boxGeometry args={[radius * 2, 0.2, radius * 0.6]} /><meshStandardMaterial color="#6f7b74" roughness={0.6} /></mesh>
          <mesh position={[0, 0.35, 0]}><boxGeometry args={[radius * 1.4, 0.7, radius * 1.2]} /><meshStandardMaterial color="#8a948f" roughness={0.8} /></mesh>
        </group>
      );
    case 'wheelchair':
      return (
        <group>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[radius * 1.2, 0.1, radius * 1.2]} /><meshStandardMaterial color="#3a3f48" /></mesh>
          <mesh position={[-radius * 0.55, 0.85, 0]}><boxGeometry args={[0.08, 0.7, radius * 1.2]} /><meshStandardMaterial color="#3a3f48" /></mesh>
          {[-1, 1].map((b) => (
            <mesh key={b} position={[0, 0.3, b * radius * 0.7]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.06, 12]} /><meshStandardMaterial color="#1c1f26" /></mesh>
          ))}
        </group>
      );
    case 'iv':
      return (
        <group>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.03, 0.03, 2, 6]} /><meshStandardMaterial color="#9fb0b0" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[radius * 0.9, radius * 0.9, 0.06, 8]} /><meshStandardMaterial color="#555" /></mesh>
          <mesh position={[0.12, 1.85, 0]}><boxGeometry args={[0.16, 0.3, 0.1]} /><meshStandardMaterial color="#cfeaff" transparent opacity={0.85} emissive="#6fa0c0" emissiveIntensity={0.3} /></mesh>
        </group>
      );
    case 'pillar':
    default:
      return (
        <mesh position={[0, radius * 1.5, 0]}>
          <cylinderGeometry args={[radius * 0.97, radius * 0.97, radius * 3, 8]} />
          <meshStandardMaterial color={COLOR_WALL_TINT} roughness={0.85} />
        </mesh>
      );
  }
}

const ZONE_COLORS = { herbs: '#5fd58c', drip: '#54e0c0', gas: '#b07cf2', spear: '#5fd58c', rimac: '#6b8f3a', puddle: '#5fd58c', trap: '#f2d154', serum: '#54e0c0' };

function BananaMesh({ color, spotted, ghost, fade }) {
  return (
    <group scale={[2.4, 2.4, 2.4]}>
      {[-0.22, 0, 0.22].map((x, i) => (
        <mesh key={x} position={[x, 0.1 + (i === 1 ? 0.05 : 0), 0]} rotation={[Math.PI / 2, 0, (i - 1) * 0.5 + 1.57]}>
          <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
          <meshStandardMaterial color={color} transparent={Boolean(ghost || fade)} opacity={ghost ? 0.35 : fade ? 0.5 : 1} />
        </mesh>
      ))}
      {spotted && [-0.15, 0.1, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.2, 0.05]}><sphereGeometry args={[0.03, 6, 4]} /><meshBasicMaterial color="#2a2d3d" /></mesh>
      ))}
    </group>
  );
}

function PuddleRipples({ radius, color }) {
  const refs = useRef([]);
  useFrame(() => {
    const t = (Date.now() % 1800) / 1800;
    refs.current.forEach((group, i) => {
      if (!group) return;
      const phase = (t + i / 3) % 1;
      group.scale.setScalar(Math.max(0.05, phase));
      group.children.forEach((child) => { child.material.opacity = (1 - phase) * 0.6; });
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          {[[0, -1, 2, 0.06], [0, 1, 2, 0.06], [-1, 0, 0.06, 2], [1, 0, 0.06, 2]].map(([ex, ez, w, d], k) => (
            <mesh key={k} position={[ex * radius, 0.06, ez * radius]} rotation={[-Math.PI / 2, 0, 0]} scale={[radius, radius, 1]}>
              <planeGeometry args={[w, d]} />
              <meshBasicMaterial color={color} transparent depthWrite={false} side={2} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function BrokenBottle({ color }) {
  return (
    <group scale={[1.6, 1.6, 1.6]}>
      <mesh position={[0, 0.12, 0]} rotation={[0, 0, 1.2]}><cylinderGeometry args={[0.16, 0.16, 0.45, 10, 1, true]} /><meshBasicMaterial color="#9fe6d0" transparent opacity={0.7} side={2} /></mesh>
      <mesh position={[0.45, 0.1, 0.1]} rotation={[0, 0, 1.4]}><cylinderGeometry args={[0.07, 0.1, 0.3, 8]} /><meshBasicMaterial color="#9fe6d0" transparent opacity={0.8} /></mesh>
      <mesh position={[-0.1, 0.03, 0.4]}><tetrahedronGeometry args={[0.1, 0]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function Embers() {
  const ref = useRef();
  const { camera } = useThree();
  const N = 220;
  const data = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const spd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 1] = Math.random() * 28;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
      spd[i] = 0.6 + Math.random() * 1.6;
    }
    return { pos, spd };
  }, []);
  useFrame((_, dt) => {
    const pts = ref.current;
    if (!pts) return;
    const a = pts.geometry.attributes.position.array;
    const t = performance.now() / 1000;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += data.spd[i] * dt;
      a[i * 3] += Math.sin(t * 0.8 + i) * dt * 0.8;
      if (a[i * 3 + 1] > 28) a[i * 3 + 1] = 0;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    pts.position.set(Math.round(camera.position.x / 35) * 35 - 0, Math.floor(camera.position.y / 28) * 28 - 4, Math.round(camera.position.z / 35) * 35);
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.pos} count={N} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ff8a3d" size={0.12} transparent opacity={0.55} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function SpearMesh({ zone }) {
  const arm = useRef();
  const lance = useRef();
  const ring = useRef();
  const push = zone.mode === 'push';
  const col = push ? '#f2d154' : '#5fd58c';
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (arm.current) arm.current.rotation.y = t * (push ? 3.4 : 1.8);
    if (lance.current) {
      const thrust = Math.max(0, Math.sin(t * (push ? 7 : 4)));
      lance.current.position.y = 0.3 + (push ? thrust * 0.6 : (1 - thrust) * 0.6);
    }
    if (ring.current) {
      const k = 0.55 + 0.45 * Math.abs(Math.sin(t * (push ? 3.5 : 2)));
      ring.current.material.opacity = k;
    }
  });
  const r = zone.radius;
  return (
    <group>
      <mesh ref={ring} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.9, r, 40]} />
        <meshBasicMaterial color={col} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.9, 40]} />
        <meshBasicMaterial color={col} transparent opacity={0.12} />
      </mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#3a3f55" metalness={0.2} roughness={0.6} /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.06, 0.14, 1.06]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.6} /></mesh>
      <group ref={arm} position={[0, 1.0, 0]}>
        <group rotation={[Math.PI / 2 - 0.25, 0, 0]}>
          <group ref={lance} position={[0, 0.3, 0]}>
            <mesh position={[0, r * 0.45, 0]}><cylinderGeometry args={[0.1, 0.12, r * 0.9, 10]} /><meshStandardMaterial color="#8a8f9c" metalness={0.5} roughness={0.5} /></mesh>
            <mesh position={[0, r * 0.9 + 0.35, 0]}><coneGeometry args={[0.2, 0.9, 10]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} /></mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function HerbsField({ radius }) {
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const T = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const ph = (T * 0.35 + i / 14) % 1;
      const a = i * 2.4;
      const r = radius * (0.25 + 0.7 * ((i * 0.37) % 1));
      m.position.set(Math.cos(a) * r, 0.1 + ph * 2.2, Math.sin(a) * r);
      m.rotation.set(T * 2 + i, T * 1.5, 0);
      m.scale.setScalar(Math.sin(ph * Math.PI) * 1.2 + 0.01);
    });
  });
  return (
    <group>
      <PuddleRipples radius={radius} color="#5fd58c" />
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[radius * 0.96, radius, 40]} /><meshBasicMaterial color="#8fffb0" transparent opacity={0.7} side={2} depthWrite={false} /></mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}><boxGeometry args={[0.16, 0.03, 0.09]} /><meshBasicMaterial color={i % 2 ? '#6fd58c' : '#b6f5a0'} transparent opacity={0.85} depthWrite={false} /></mesh>
      ))}
    </group>
  );
}

function DripStand({ radius }) {
  const drop = useRef();
  useFrame(({ clock }) => {
    if (!drop.current) return;
    const ph = (clock.elapsedTime * 1.4) % 1;
    drop.current.position.y = 1.7 - ph * 1.3;
    drop.current.visible = ph < 0.9;
  });
  return (
    <group>
      <PuddleRipples radius={radius} color="#54e0c0" />
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.03, 0.03, 1.8, 6]} /><meshStandardMaterial color="#b8c4c8" metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.4, 0.4, 0.06, 10]} /><meshStandardMaterial color="#4a4f58" /></mesh>
      <mesh position={[0, 2.0, 0]}><boxGeometry args={[0.28, 0.5, 0.12]} /><meshStandardMaterial color="#9fe9d8" transparent opacity={0.8} emissive="#2fd0b0" emissiveIntensity={0.8} /></mesh>
      <mesh ref={drop} position={[0, 1.5, 0]}><sphereGeometry args={[0.05, 8, 6]} /><meshBasicMaterial color="#7ff5d8" /></mesh>
    </group>
  );
}

function GasCloud({ radius }) {
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const T = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const a = i * 1.3 + T * 0.25 * (i % 2 ? 1 : -1);
      const r = radius * 0.55 * (0.5 + ((i * 0.31) % 0.6));
      m.position.set(Math.cos(a) * r, 0.7 + Math.sin(T * 0.8 + i) * 0.25 + (i % 3) * 0.3, Math.sin(a) * r);
      m.scale.setScalar(radius * (0.34 + 0.05 * Math.sin(T * 1.5 + i)));
    });
  });
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}><sphereGeometry args={[1, 12, 9]} /><meshBasicMaterial color={i % 2 ? '#a487e8' : '#c9b2f5'} transparent opacity={0.28} depthWrite={false} /></mesh>
      ))}
    </group>
  );
}

function FieldShot({ zone }) {
  const yaw = Math.atan2(zone.dx || 0, zone.dz || 1);
  if (zone.kind === 'gurney') {
    return (
      <group rotation={[0, yaw, 0]} position={[0, 0.25, 0]}>
        <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.0, 0.12, 2.2]} /><meshStandardMaterial color="#d8dde8" metalness={0.3} roughness={0.5} /></mesh>
        <mesh position={[0, 0.63, -0.5]}><boxGeometry args={[0.9, 0.06, 0.8]} /><meshStandardMaterial color="#e0555f" /></mesh>
        <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.7, 0.35, 1.8]} /><meshStandardMaterial color="#6a7388" metalness={0.6} roughness={0.4} emissive="#3a2aa0" emissiveIntensity={0.5} /></mesh>
        {[[-0.45, 0.75], [0.45, 0.75], [-0.45, -0.75], [0.45, -0.75]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.08, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 0.1, 10]} /><meshStandardMaterial color="#1b1d29" /></mesh>
        ))}
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.8, 1.1, 24]} /><meshBasicMaterial color="#9a7bff" transparent opacity={0.35} side={2} depthWrite={false} /></mesh>
      </group>
    );
  }
  if (zone.kind === 'dart') {
    return (
      <group rotation={[0, yaw, 0]} position={[0, 0.9, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.6, 8]} /><meshStandardMaterial color="#cfeaf2" transparent opacity={0.9} /></mesh>
        <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.05, 0.4, 8]} /><meshStandardMaterial color="#e8eef2" metalness={1} roughness={0.2} /></mesh>
        <mesh position={[0, 0, -0.38]}><boxGeometry args={[0.28, 0.02, 0.2]} /><meshBasicMaterial color="#b07cf2" /></mesh>
        <mesh position={[0, 0, -0.38]}><boxGeometry args={[0.02, 0.28, 0.2]} /><meshBasicMaterial color="#b07cf2" /></mesh>
      </group>
    );
  }
  return (
    <group rotation={[0, yaw, 0]} position={[0, 0.6, 0]}>
      <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.28, 1.3, 7]} /><meshStandardMaterial color="#7a5a32" roughness={0.9} /></mesh>
      <mesh position={[0, 0.05, -0.3]} rotation={[Math.PI / 2 - 0.15, 0.4, 0]}><coneGeometry args={[0.18, 1.0, 6]} /><meshStandardMaterial color="#5a4024" roughness={0.9} /></mesh>
      <mesh position={[0.15, -0.05, -0.8]} rotation={[Math.PI / 2 + 0.2, -0.5, 0]}><coneGeometry args={[0.12, 0.8, 6]} /><meshStandardMaterial color="#6b4a2a" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 1.1]}><sphereGeometry args={[0.1, 6, 5]} /><meshBasicMaterial color="#7ff08a" /></mesh>
    </group>
  );
}

function ZoneDisc({ zone, ghost, platforms }) {
  const ramp = (platforms || []).find((p) => p.ramp && Math.abs(zone.x - p.x) <= p.hx && Math.abs(zone.z - p.z) <= p.hz);
  const tilt = ramp ? Math.atan2(ramp.h, ramp.hx * 2) * (ramp.ramp === '+x' ? 1 : -1) : 0;
  const color = ZONE_COLORS[zone.kind] || '#ffffff';
  const isTrap = zone.kind === 'trap';
  const bananaColor = zone.cardId === 'platano_podrido' ? '#7a6a2a' : '#f2d154';
  return (
    <group position={[zone.x, zone.y || 0, zone.z]} rotation={[0, 0, tilt]}>
      {zone.kind === 'astral' ? (
        <group position={[0, 1.2, 0]}>
          <mesh><sphereGeometry args={[zone.radius, 16, 12]} /><meshBasicMaterial color="#f3e9a6" /></mesh>
          <mesh><sphereGeometry args={[zone.radius * 1.7, 16, 12]} /><meshBasicMaterial color="#f3e9a6" transparent opacity={0.22} depthWrite={false} /></mesh>
        </group>
      ) : isTrap ? (
        <SquareFrame x={0} z={0} half={zone.radius} color={color} opacity={zone.armed ? 0.6 : 0.25} />
      ) : (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[zone.radius * 2, zone.radius * 2]} />
          <meshBasicMaterial color={color} transparent opacity={zone.kind === 'rimac' ? 0.1 + 0.07 * (zone.level || 3) : zone.kind === 'serum' ? (zone.armed ? 0.22 : 0.06) : 0.3} />
        </mesh>
      )}
      {isTrap && <BananaMesh color={bananaColor} spotted={false} ghost={ghost} fade={zone.level > 0 && zone.level <= 2} />}
      {zone.kind === 'rimac' && (
        <>
          <PuddleRipples radius={zone.radius} color={zone.cardId === 'rimac_sin_filtrar' ? '#5f7f20' : '#8fb050'} />
          <BrokenBottle color={color} />
        </>
      )}
      {zone.kind === 'herbs' && <HerbsField radius={zone.radius} />}
      {zone.kind === 'drip' && <DripStand radius={zone.radius} />}
      {zone.kind === 'gas' && <GasCloud radius={zone.radius} />}
      {(zone.kind === 'rootshot' || zone.kind === 'dart' || zone.kind === 'gurney') && <FieldShot zone={zone} />}
      {zone.kind === 'spear' && <SpearMesh zone={zone} />}
      {zone.kind === 'puddle' && <PuddleRipples radius={zone.radius} color="#5fd58c" />}
      {zone.kind === 'serum' && (
        <group>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.03, 0.03, 2, 6]} /><meshStandardMaterial color="#9fb0b0" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.35, 0.35, 0.06, 8]} /><meshStandardMaterial color="#555" /></mesh>
          <mesh position={[0.12, 1.85, 0]}><boxGeometry args={[0.2, 0.34, 0.12]} /><meshStandardMaterial color={zone.armed ? '#7ff5d8' : '#7a8a8a'} transparent opacity={0.9} emissive={zone.armed ? '#2fd0b0' : '#000000'} emissiveIntensity={zone.armed ? 0.9 : 0} /></mesh>
          {zone.armed && <PuddleRipples radius={zone.radius} color="#54e0c0" />}
        </group>
      )}
    </group>
  );
}


const EFFECT_STYLES = {
  skill_pulse: { color: '#5fd58c', mode: 'ring', duration: 900 },
  skill_stun: { color: '#b07cf2', mode: 'ring', duration: 800 },
  skill_pull: { color: '#c28f4a', mode: 'contract', duration: 800 },
  skill_boost: { color: '#f2a154', mode: 'rise', duration: 1100, radius: 1.2 },
  skill_purge: { color: '#54a8f2', mode: 'ring', duration: 900 },
  skill_melee_stun: { color: '#f2d154', mode: 'burst', duration: 500, radius: 2.5 },
  card_acetilcolina: { color: '#54d1f2', mode: 'ring', duration: 900, radius: 3 },
  card_rodar: { color: '#ffffff', mode: 'burst', duration: 400, radius: 1.5 },
  card_humo_yodo: { color: '#f2a154', mode: 'burst', duration: 1000, radius: 7 },
  card_tropiezo: { color: '#f2d154', mode: 'burst', duration: 500, radius: 2.5 },
  card_adrenalina: { color: '#e0555f', mode: 'rise', duration: 900, radius: 1 },
  card_chicharron: { color: '#f2a154', mode: 'rise', duration: 800, radius: 0.9 },
  card_goyslop: { color: '#8f8f4a', mode: 'rise', duration: 1000, radius: 1.2 },
  card_cascara_platano: { color: '#f2d154', mode: 'burst', duration: 500, radius: 1.5 },
  card_platano_podrido: { color: '#7a6a2a', mode: 'burst', duration: 500, radius: 1.5 },
  card_agua_rimac: { color: '#6b8f3a', mode: 'ring', duration: 800, radius: 4 },
  card_rimac_sin_filtrar: { color: '#6b8f3a', mode: 'ring', duration: 900, radius: 6 },
  card_red_mist: { color: '#e0555f', mode: 'burst', duration: 550, radius: 1.3 },
  card_tajo_carmesi: { color: '#b57cff', mode: 'burst', duration: 550, radius: 1.2 },
  card_regalo_envenenado: { color: '#b07cf2', mode: 'ring', duration: 900, radius: 8 },
  card_aji_picante: { color: '#e0555f', mode: 'rise', duration: 800, radius: 0.9 },
  card_sopa_hirviendo: { color: '#f2a154', mode: 'burst', duration: 700, radius: 5 },
  card_pastilla_vencida: { color: '#dcdde8', mode: 'rise', duration: 800, radius: 0.9 },
  card_canon_humano: { color: '#f2d154', mode: 'burst', duration: 500, radius: 2 },
  card_risa_enlatada: { color: '#f2d154', mode: 'ring', duration: 900, radius: 8 },
  card_martillazo: { color: '#8a8da3', mode: 'burst', duration: 500, radius: 3 },
  card_bolsa_cemento: { color: '#8a8da3', mode: 'burst', duration: 900, radius: 6 },
  card_grito_animo: { color: '#54d1f2', mode: 'ring', duration: 900, radius: 8 },
  card_racion_compartida: { color: '#f2a154', mode: 'ring', duration: 900, radius: 8 },
  card_humo_toxico: { color: '#6b8f3a', mode: 'burst', duration: 1000, radius: 9 },
  card_risa_macabra: { color: '#b07cf2', mode: 'ring', duration: 900, radius: 8 },
};

const SIMPLE_PROPS = {
  boot: [['boxGeometry', [0.3, 0.5, 0.6], [0, 0, 0], '#8f6a3a'], ['boxGeometry', [0.34, 0.12, 0.7], [0, -0.3, 0.05], '#2a2d3d']],
  pill: [['capsuleGeometry', [0.12, 0.35, 4, 8], [0, 0, 0], '#dcdde8'], ['sphereGeometry', [0.1, 8, 6], [0, 0.2, 0], '#e0555f']],
  lungs: [['sphereGeometry', [0.22, 10, 8], [-0.2, 0, 0], '#54a8f2'], ['sphereGeometry', [0.22, 10, 8], [0.2, 0, 0], '#54a8f2']],
  syringe: [['cylinderGeometry', [0.1, 0.1, 0.6, 8], [0, 0, 0], '#e0555f'], ['cylinderGeometry', [0.02, 0.02, 0.4, 6], [0, -0.5, 0], '#dcdde8']],
  smokepot: [['sphereGeometry', [0.3, 10, 8], [0, 0, 0], '#f2a154'], ['cylinderGeometry', [0.08, 0.08, 0.2, 8], [0, 0.32, 0], '#6c6f84']],
  cone: [['coneGeometry', [0.25, 0.5, 8], [0, 0, 0], '#f2d154']],
  heart: [['sphereGeometry', [0.2, 10, 8], [-0.14, 0.05, 0], '#e0555f'], ['sphereGeometry', [0.2, 10, 8], [0.14, 0.05, 0], '#e0555f'], ['coneGeometry', [0.3, 0.4, 8], [0, -0.2, 0], '#e0555f']],
  chicharron: [['boxGeometry', [0.5, 0.3, 0.25], [0, 0, 0], '#c98a3a']],
  slop: [['cylinderGeometry', [0.3, 0.22, 0.25, 10], [0, 0, 0], '#8f8f4a']],
  chili: [['coneGeometry', [0.12, 0.6, 8], [0, 0, 0], '#e0555f'], ['cylinderGeometry', [0.04, 0.04, 0.12, 6], [0, 0.34, 0], '#5fd58c']],
  banana: [['capsuleGeometry', [0.1, 0.5, 4, 8], [0, 0, 0], '#f2d154']],
  rotten: [['capsuleGeometry', [0.1, 0.5, 4, 8], [0, 0, 0], '#7a6a2a']],
  energy_blade: [['boxGeometry', [0.16, 0.75, 0.05], [0, 0.3, 0], '#b57cff'], ['boxGeometry', [0.08, 0.5, 0.06], [0, 0.45, 0.03], '#ecdcff'], ['boxGeometry', [0.26, 0.12, 0.14], [0, -0.1, 0], '#1c1a26'], ['boxGeometry', [0.07, 0.34, 0.07], [0, -0.32, 0], '#2a2d3d']],
  blade: [['boxGeometry', [0.1, 0.9, 0.04], [0, 0.1, 0], '#e0555f'], ['boxGeometry', [0.3, 0.06, 0.06], [0, -0.35, 0], '#2a2d3d']],
  gift: [['boxGeometry', [0.5, 0.4, 0.5], [0, 0, 0], '#b07cf2'], ['boxGeometry', [0.08, 0.42, 0.52], [0, 0, 0], '#f2d154']],
  star: [['octahedronGeometry', [0.3, 0], [0, 0, 0], '#f2a154']],
  paper: [['boxGeometry', [0.4, 0.55, 0.03], [0, 0, 0], '#f1f1f6']],
  laugh: [['sphereGeometry', [0.28, 10, 8], [0, 0, 0], '#f2d154']],
  horn: [['coneGeometry', [0.3, 0.6, 10], [0, 0, 0], '#f2d154'], ['sphereGeometry', [0.1, 8, 6], [0, 0.35, 0], '#54d1f2']],
  bowl: [['cylinderGeometry', [0.35, 0.2, 0.25, 12], [0, 0, 0], '#dcdde8'], ['sphereGeometry', [0.12, 8, 6], [0, 0.18, 0], '#c98a3a']],
  molecule: [['sphereGeometry', [0.18, 10, 8], [0, 0, 0], '#54d1f2'], ['sphereGeometry', [0.1, 8, 6], [-0.3, 0.15, 0], '#54d1f2'], ['sphereGeometry', [0.1, 8, 6], [0.3, 0.15, 0], '#54d1f2'], ['sphereGeometry', [0.1, 8, 6], [0, -0.3, 0], '#54d1f2']],
  flag: [['boxGeometry', [0.05, 0.9, 0.05], [-0.35, 0, 0], '#8f6a3a'], ['boxGeometry', [0.6, 0.12, 0.03], [0, 0.34, 0], '#d52b1e'], ['boxGeometry', [0.6, 0.12, 0.03], [0, 0.22, 0], '#f1f1f6'], ['boxGeometry', [0.6, 0.12, 0.03], [0, 0.1, 0], '#0038a8']],
  claw: [['sphereGeometry', [0.18, 10, 8], [0, 0, 0], '#b57cff'], ['coneGeometry', [0.05, 0.4, 5], [-0.15, -0.3, 0], '#ecdcff'], ['coneGeometry', [0.05, 0.4, 5], [0, -0.33, 0], '#ecdcff'], ['coneGeometry', [0.05, 0.4, 5], [0.15, -0.3, 0], '#ecdcff']],
  megaphone: [['coneGeometry', [0.3, 0.55, 12], [0, 0.1, 0], '#f2d154'], ['cylinderGeometry', [0.1, 0.12, 0.3, 10], [0, -0.28, 0], '#2a2d3d'], ['boxGeometry', [0.05, 0.2, 0.05], [0, -0.5, 0.05], '#2a2d3d']],
  can: [['cylinderGeometry', [0.2, 0.2, 0.4, 10], [0, 0, 0], '#c3c5d6']],
};

const FX_DEFAULT = { shape: 'spark', color: '#f2d154', count: 10, speed: 3, up: 3, gravity: 2, prop: 'pill' };

const FX = {
  card_paraguayizador: { shape: 'smoke', color: '#d52b1e', count: 14, speed: 2.5, up: 1, gravity: 0, prop: 'flag' },
  card_astral_claw: { shape: 'spark', color: '#b57cff', count: 14, speed: 3, up: 2, gravity: 0, prop: 'claw' },
  skill_pulso_hierbas: { shape: 'leaf', color: '#5fd58c', count: 18, speed: 3.5, up: 3, gravity: 1, prop: 'herbs' },
  skill_somnifero_valeriana: { shape: 'shard', color: '#d9c8f5', liquid: '#b07cf2', count: 16, speed: 4, up: 4, gravity: 12, prop: 'bottle' },
  skill_raiz_atrayente: { shape: 'leaf', color: '#8f6a3a', count: 16, speed: 3, up: 0.5, gravity: 0, inward: true, prop: 'roots' },
  skill_tonico_reforzado: { shape: 'spark', color: '#f2a154', liquid: '#f2a154', count: 14, speed: 1.5, up: 4, gravity: -3, prop: 'bottle' },
  skill_ronda_suero: { shape: 'drop', color: '#54a8f2', liquid: '#54a8f2', count: 18, speed: 3.5, up: 3, gravity: 9, prop: 'drip' },
  skill_anestesia: { shape: 'spark', color: '#b07cf2', count: 14, speed: 2.5, up: 3, gravity: -2, prop: 'mask' },
  skill_camilla_magnetica: { shape: 'spark', color: '#e0555f', count: 16, speed: 3, up: 0.5, gravity: 0, inward: true, prop: 'magnet' },
  skill_desinfectante: { shape: 'drop', color: '#54a8f2', liquid: '#dcdde8', count: 20, speed: 4, up: 2, gravity: 9, prop: 'bottle' },
  skill_pulse: { shape: 'leaf', color: '#5fd58c', count: 14, speed: 3, up: 2.5, gravity: -1, prop: 'herbs' },
  skill_stun: { shape: 'spark', color: '#b07cf2', count: 12, speed: 2.5, up: 3, gravity: -2, prop: 'mask' },
  skill_pull: { shape: 'leaf', color: '#8f6a3a', count: 14, speed: 3, up: 0.5, gravity: 0, inward: true, prop: 'magnet' },
  skill_boost: { shape: 'spark', color: '#f2a154', count: 12, speed: 1, up: 4, gravity: -3, prop: 'bottle' },
  skill_purge: { shape: 'drop', color: '#54a8f2', count: 14, speed: 3.5, up: 2, gravity: 9, prop: 'drip' },
  skill_melee_stun: { shape: 'leaf', color: '#5fd58c', count: 12, speed: 4, up: 2, gravity: 6, prop: 'img_golpe_aturdidor' },
  card_acetilcolina: { shape: 'spark', color: '#54d1f2', count: 16, speed: 3, up: 2, gravity: 0, prop: 'img_acetilcolina' },
  card_rodar: { shape: 'smoke', color: '#cfd2e0', count: 8, speed: 2, up: 0.5, gravity: 0, prop: 'img_rodar' },
  card_canon_humano: { shape: 'smoke', color: '#cfd2e0', count: 10, speed: 2.5, up: 0.8, gravity: 0, prop: 'can' },
  card_humo_yodo: { shape: 'smoke', color: '#f2a154', count: 12, speed: 2.5, up: 1, gravity: 0, prop: 'smokepot' },
  card_tropiezo: { shape: 'spark', color: '#f2d154', count: 10, speed: 3, up: 3, gravity: 8, prop: 'img_tropiezo' },
  card_adrenalina: { shape: 'spark', color: '#e0555f', count: 10, speed: 1.5, up: 4, gravity: -2, prop: 'heart' },
  card_chicharron: { shape: 'crumb', color: '#c98a3a', count: 12, speed: 2, up: 3, gravity: 9, prop: 'img_chicharron' },
  card_goyslop: { shape: 'crumb', color: '#8f8f4a', count: 16, speed: 2.5, up: 3, gravity: 9, prop: 'img_goyslop' },
  card_aji_picante: { shape: 'crumb', color: '#e0555f', count: 12, speed: 2, up: 3, gravity: 9, prop: 'chili' },
  card_sopa_hirviendo: { shape: 'drop', color: '#f2a154', count: 14, speed: 3, up: 3.5, gravity: 9, prop: 'pot' },
  card_cascara_platano: { shape: 'leaf', color: '#f2d154', count: 6, speed: 2, up: 3, gravity: 8, prop: 'img_cascara_platano' },
  card_platano_podrido: { shape: 'leaf', color: '#7a6a2a', count: 8, speed: 2, up: 3, gravity: 8, prop: 'rotten' },
  card_agua_rimac: { shape: 'shard', color: '#9fe6d0', liquid: '#6b8f3a', count: 16, speed: 4, up: 4, gravity: 12, prop: 'img_agua_rimac' },
  card_rimac_sin_filtrar: { shape: 'shard', color: '#9fe6d0', liquid: '#5f7f20', count: 22, speed: 5, up: 5, gravity: 12, prop: 'bottle' },
  card_red_mist: { shape: 'drop', color: '#e0555f', count: 20, speed: 5, up: 3, gravity: 9, prop: 'img_red_mist' },
  card_tajo_carmesi: { shape: 'drop', color: '#b57cff', count: 10, speed: 4, up: 2, gravity: 9, prop: 'img_tajo_carmesi' },
  card_regalo_envenenado: { shape: 'leaf', color: '#b07cf2', count: 14, speed: 3, up: 3, gravity: 3, prop: 'gift' },
  card_grito_animo: { shape: 'spark', color: '#54d1f2', count: 14, speed: 3, up: 3, gravity: 2, prop: 'img_grito_animo' },
  card_racion_compartida: { shape: 'crumb', color: '#f2a154', count: 14, speed: 3, up: 3, gravity: 9, prop: 'bowl' },
  card_humo_toxico: { shape: 'smoke', color: '#6b8f3a', count: 16, speed: 3, up: 1, gravity: 0, prop: 'smokepot' },
  card_risa_macabra: { shape: 'spark', color: '#b07cf2', count: 14, speed: 3, up: 3, gravity: 2, prop: 'laugh' },
  card_pastilla_vencida: { shape: 'crumb', color: '#f1f1f6', count: 10, speed: 2.5, up: 3, gravity: 9, prop: 'pill' },
  card_risa_enlatada: { shape: 'spark', color: '#f2d154', count: 12, speed: 3, up: 3, gravity: 2, prop: 'laugh' },
  card_martillazo: { shape: 'spark', color: '#c3c5d6', count: 12, speed: 4, up: 2, gravity: 8, prop: 'hammer' },
  card_bolsa_cemento: { shape: 'smoke', color: '#9a9cac', count: 14, speed: 3, up: 1, gravity: 0, prop: 'bag' },
};

function rand(seed, i) {
  const x = Math.sin(seed * 0.001 + i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function SimpleProp({ parts }) {
  return (
    <group>
      {parts.map(([geometry, args, position, color], i) => (
        <mesh key={i} position={position}>
          {geometry === 'boxGeometry' && <boxGeometry args={args} />}
          {geometry === 'sphereGeometry' && <sphereGeometry args={args} />}
          {geometry === 'cylinderGeometry' && <cylinderGeometry args={args} />}
          {geometry === 'coneGeometry' && <coneGeometry args={args} />}
          {geometry === 'capsuleGeometry' && <capsuleGeometry args={args} />}
          {geometry === 'octahedronGeometry' && <octahedronGeometry args={args} />}
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

const PROP_IMG = {
  img_rodar: { src: '/props/rodar.png', h: 0.45, aspect: 3.82 },
  img_tropiezo: { src: '/props/tropiezo.png', h: 1.1, aspect: 0.57 },
  img_goyslop: { src: '/props/goyslop.png', h: 0.6, aspect: 1.48 },
  img_cascara_platano: { src: '/props/cascara_platano.png', h: 0.4, aspect: 2.08 },
  img_golpe_aturdidor: { src: '/props/golpe_aturdidor.png', h: 0.95, aspect: 1.03 },
  img_grito_animo: { src: '/props/grito_animo.png', h: 0.7, aspect: 1.04 },
  img_tajo_carmesi: { src: '/props/tajo_carmesi.png', h: 1.1, aspect: 0.34 },
  img_red_mist: { src: '/props/red_mist.png', h: 1.0, aspect: 1.08 },
  img_acetilcolina: { src: '/props/acetilcolina.png', h: 0.4, aspect: 2.48 },
  img_agua_rimac: { src: '/props/agua_rimac.png', h: 0.6, aspect: 1 },
  img_chicharron: { src: '/props/chicharron.png', h: 0.5, aspect: 1 },
};
const texCache = new Map();
function loadTex(src) {
  if (!texCache.has(src)) {
    const tex = new TextureLoader().load(src);
    tex.colorSpace = SRGBColorSpace;
    texCache.set(src, tex);
  }
  return texCache.get(src);
}

function ImageProp({ kind }) {
  const cfg = PROP_IMG[kind];
  const tex = loadTex(cfg.src);
  return (
    <group>
      {[0, Math.PI / 2].map((ry) => (
        <mesh key={ry} position={[0, cfg.h * 0.3, 0]} rotation={[0, ry, 0]}>
          <planeGeometry args={[cfg.h * cfg.aspect, cfg.h]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.05} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function PropMesh({ kind, color }) {
  if (PROP_IMG[kind]) return <ImageProp kind={kind} />;
  if (SIMPLE_PROPS[kind]) return <SimpleProp parts={SIMPLE_PROPS[kind]} />;
  if (kind === 'bottle') {
    return (
      <group>
        <mesh><cylinderGeometry args={[0.18, 0.18, 0.5, 10]} /><meshBasicMaterial color="#9fe6d0" transparent opacity={0.8} /></mesh>
        <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.07, 0.1, 0.2, 10]} /><meshBasicMaterial color="#9fe6d0" transparent opacity={0.8} /></mesh>
        <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.17, 0.17, 0.3, 10]} /><meshBasicMaterial color={color} /></mesh>
      </group>
    );
  }
  if (kind === 'herbs') {
    return (
      <group>
        {[-0.15, 0, 0.15].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, x * 3]}><cylinderGeometry args={[0.03, 0.03, 0.7, 6]} /><meshBasicMaterial color="#5fd58c" /></mesh>
        ))}
        <mesh position={[0, -0.1, 0]}><cylinderGeometry args={[0.2, 0.2, 0.08, 8]} /><meshBasicMaterial color="#8f6a3a" /></mesh>
      </group>
    );
  }
  if (kind === 'roots') {
    return (
      <group>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.05) * 0.5, 0.4, Math.sin(i * 1.05) * 0.5]} rotation={[Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4]}>
            <coneGeometry args={[0.1, 1.2, 6]} /><meshBasicMaterial color="#8f6a3a" />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === 'drip') {
    return (
      <group>
        <mesh><boxGeometry args={[0.4, 0.55, 0.12]} /><meshBasicMaterial color="#dcdde8" /></mesh>
        <mesh position={[0, -0.45, 0]}><cylinderGeometry args={[0.02, 0.02, 0.4, 6]} /><meshBasicMaterial color="#dcdde8" /></mesh>
        <mesh position={[0, -0.7, 0]}><sphereGeometry args={[0.08, 8, 6]} /><meshBasicMaterial color={color} /></mesh>
      </group>
    );
  }
  if (kind === 'mask') {
    return (
      <group>
        <mesh><sphereGeometry args={[0.3, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshBasicMaterial color="#b07cf2" /></mesh>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.3, 6]} /><meshBasicMaterial color="#dcdde8" /></mesh>
      </group>
    );
  }
  if (kind === 'magnet') {
    return (
      <group>
        <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.6, 0.18, 0.2]} /><meshBasicMaterial color="#e0555f" /></mesh>
        <mesh position={[-0.25, -0.1, 0]}><boxGeometry args={[0.18, 0.5, 0.2]} /><meshBasicMaterial color="#e0555f" /></mesh>
        <mesh position={[0.25, -0.1, 0]}><boxGeometry args={[0.18, 0.5, 0.2]} /><meshBasicMaterial color="#e0555f" /></mesh>
        <mesh position={[-0.25, -0.38, 0]}><boxGeometry args={[0.18, 0.12, 0.2]} /><meshBasicMaterial color="#dcdde8" /></mesh>
        <mesh position={[0.25, -0.38, 0]}><boxGeometry args={[0.18, 0.12, 0.2]} /><meshBasicMaterial color="#dcdde8" /></mesh>
      </group>
    );
  }
  if (kind === 'bag') {
    return <mesh><boxGeometry args={[0.7, 0.9, 0.4]} /><meshBasicMaterial color="#8a8da3" /></mesh>;
  }
  if (kind === 'hammer') {
    return (
      <group>
        <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.7, 0.3, 0.3]} /><meshBasicMaterial color="#8a8da3" /></mesh>
        <mesh position={[0, -0.2, 0]}><boxGeometry args={[0.1, 0.8, 0.1]} /><meshBasicMaterial color="#8f6a3a" /></mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh><cylinderGeometry args={[0.35, 0.28, 0.35, 12]} /><meshBasicMaterial color="#6c6f84" /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.3, 0.3, 0.05, 12]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function Particles({ effect, fx }) {
  const refs = useRef([]);
  const propRef = useRef();
  const anim = fx.prop && !STATE_HELD.has(effect.kind) ? ANIM_BY_KIND[effect.kind] || (fx.prop === 'roots' ? 'plant' : 'cast') : null;
  const duration = fx.prop ? 1300 : 900;
  const impact = fx.prop === 'roots' ? 0.25 : anim ? IMPACT_MS[anim] / duration : fx.prop ? 0.4 : 0;
  const yawAtCast = FACING.get(effect.casterId) || 0;
  const originX = anim === 'throw' ? Math.sin(yawAtCast) * 3 : 0;
  const originZ = anim === 'throw' ? Math.cos(yawAtCast) * 3 : 0;

  useEffect(() => {
    if (anim && effect.casterId) {
      HAND_ANIMS.set(effect.casterId, { id: effect.id, anim, ms: HOLD_MS[effect.kind], prop: fx.prop === 'roots' ? null : fx.prop, color: fx.liquid || fx.color, startedAt: effect.startedAt });
    }
  }, []);
  const particles = Array.from({ length: fx.count }, (_, i) => {
    const angle = rand(effect.startedAt, i) * Math.PI * 2;
    const spread = 0.4 + rand(effect.startedAt, i + 50) * 0.8;
    return {
      angle,
      vx: Math.cos(angle) * fx.speed * spread,
      vz: Math.sin(angle) * fx.speed * spread,
      vy: fx.up * (0.5 + rand(effect.startedAt, i + 100) * 0.7),
      spin: (rand(effect.startedAt, i + 150) - 0.5) * 14,
      size: 0.08 + rand(effect.startedAt, i + 200) * 0.09,
      tint: i % 3 === 0 && fx.liquid ? fx.liquid : fx.color,
    };
  });

  useFrame(() => {
    const t = (Date.now() - effect.startedAt) / duration;
    if (propRef.current && (!anim || fx.prop === 'roots')) {
      const fall = Math.max(0, Math.min(1, (t - 0.18) / (impact - 0.18)));
      propRef.current.visible = t < impact;
      if (fx.prop === 'roots') {
        propRef.current.visible = t < 0.7;
        propRef.current.position.y = 0;
        propRef.current.scale.y = Math.min(1, t / 0.25);
      } else {
        propRef.current.position.y = 0.5 + (1 - fall * fall) * 2.1;
        propRef.current.rotation.y = t * 9;
        propRef.current.rotation.z = fall * 2;
        propRef.current.scale.setScalar(1.7 - fall * 0.5);
      }
    }
    const local = t < impact ? -1 : (t - impact) / (1 - impact);
    particles.forEach((p, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      if (local < 0 || local > 1) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const s = local * 0.9;
      const rise = fx.gravity < 0 ? p.vy * s * 0.8 : p.vy * s - 0.5 * fx.gravity * s * s;
      const y = 0.3 + rise;
      mesh.position.set(p.vx * (fx.inward ? 3 * (1 - local) : s), Math.max(0.05, y), p.vz * (fx.inward ? 3 * (1 - local) : s));
      mesh.rotation.set(p.spin * local, p.spin * local, 0);
      const grow = fx.shape === 'smoke' ? 1 + local * 5 : 1 - local * 0.4;
      mesh.scale.setScalar(grow);
      mesh.material.opacity = fx.shape === 'smoke' ? 0.55 * (1 - local) : 1 - local * local;
    });
  });

  return (
    <group position={[effect.x + originX, 0, effect.z + originZ]}>
      {fx.prop && (!anim || fx.prop === 'roots') && <group ref={propRef}><PropMesh kind={fx.prop} color={fx.liquid || fx.color} /></group>}
      {particles.map((p, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          {fx.shape === 'shard' && <tetrahedronGeometry args={[p.size * 1.4, 0]} />}
          {fx.shape === 'spark' && <octahedronGeometry args={[p.size, 0]} />}
          {fx.shape === 'leaf' && <boxGeometry args={[p.size * 2, p.size * 0.3, p.size * 1.2]} />}
          {(fx.shape === 'drop' || fx.shape === 'crumb' || fx.shape === 'smoke') && <sphereGeometry args={[fx.shape === 'smoke' ? p.size * 2.4 : p.size, 8, 6]} />}
          <meshBasicMaterial color={p.tint} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function SkillEffect({ effect }) {
  const style = EFFECT_STYLES[effect.kind] || EFFECT_STYLES[effect.baseKind] || { color: '#ffffff', mode: 'ring', duration: 800 };
  const radius = effect.radius || style.radius || 3;
  const groupRef = useRef();
  const materialRef = useRef();

  useFrame(() => {
    if (!groupRef.current || !materialRef.current) return;
    const t = Math.min(1, (Date.now() - effect.startedAt) / style.duration);
    const fade = 1 - t;
    materialRef.current.opacity = Math.max(0, fade * (FX[effect.kind] || FX[effect.baseKind] ? 0.3 : 0.7));
    if (style.mode === 'ring') {
      const s = Math.max(0.05, t * radius);
      groupRef.current.scale.set(s, s, s);
      groupRef.current.position.y = 0.1;
    } else if (style.mode === 'contract') {
      const s = Math.max(0.05, (1 - t) * radius);
      groupRef.current.scale.set(s, s, s);
      groupRef.current.position.y = 0.1;
    } else if (style.mode === 'burst') {
      const s = Math.max(0.05, Math.sqrt(t) * radius);
      groupRef.current.scale.set(s, s, s);
      groupRef.current.position.y = 0.9;
    } else {
      groupRef.current.scale.set(radius, 1, radius);
      groupRef.current.position.y = 0.2 + t * 2.4;
    }
  });

  const flat = style.mode === 'ring' || style.mode === 'contract';
  const fx = FX[effect.kind] || FX[effect.baseKind] || (String(effect.kind).startsWith('card_') ? FX_DEFAULT : null);
  return (
    <>
    {fx && <Particles effect={effect} fx={fx} />}
    <group position={[effect.x, 0, effect.z]}>
      <group ref={groupRef}>
        {flat && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.88, 1, 48]} />
            <meshBasicMaterial ref={materialRef} color={style.color} transparent side={2} depthWrite={false} />
          </mesh>
        )}
        {style.mode === 'burst' && (
          <mesh>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial ref={materialRef} color={style.color} transparent depthWrite={false} />
          </mesh>
        )}
        {style.mode === 'rise' && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.6, 0.08, 8, 24]} />
            <meshBasicMaterial ref={materialRef} color={style.color} transparent depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
    </>
  );
}

function StunHalo() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 5;
  });
  return (
    <group ref={ref} position={[0, 2.2, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.cos((i * 2 * Math.PI) / 3) * 0.45, 0, Math.sin((i * 2 * Math.PI) / 3) * 0.45]}>
          <octahedronGeometry args={[0.11, 0]} />
          <meshBasicMaterial color="#f2d154" />
        </mesh>
      ))}
    </group>
  );
}

function CollisionObject({ obj }) {
  return (
    <group position={[obj.x, 0, obj.z]}>
      <CollisionObjectMesh type={obj.type} radius={obj.radius} />
    </group>
  );
}

/**
 * Cámara en tercera persona pegada al personaje propio: sigue su
 * posición en vez de quedar libre sobre todo el mapa (era un "god view"
 * con OrbitControls apuntando al centro del escenario). Arrastrar con
 * el mouse orbita alrededor del personaje; la rueda acerca/aleja.
 * Expone el ángulo horizontal actual (yawRef) para que el movimiento
 * WASD sea relativo a hacia dónde mira la cámara, no a los ejes fijos
 * del mundo, así "adelante" siempre es "hacia donde estoy mirando".
 */
function FollowCamera({ myEntity, yawRef, shiftLock, onLockLost, focusId, platforms }) {
  const { camera, gl } = useThree();
  const yaw = useRef(Math.PI);
  const pitch = useRef(0.5);
  const distance = useRef(7);
  const dragging = useRef(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const smoothedTarget = useRef(new Vector3(0, 1, 0));
  const shoulder = useRef(0);
  const lostRef = useRef(onLockLost);
  lostRef.current = onLockLost;

  useEffect(() => {
    const canvas = gl.domElement;
    const canLock = shiftLock && !window.matchMedia('(pointer: coarse)').matches;
    function onLockChange() { if (canLock && document.pointerLockElement !== canvas) lostRef.current?.(); }
    if (canLock && document.pointerLockElement !== canvas) {
      try { Promise.resolve(canvas.requestPointerLock()).catch(() => lostRef.current?.()); } catch { lostRef.current?.(); }
    }
    const noMenu = (e) => e.preventDefault();
    canvas.addEventListener('contextmenu', noMenu);
    document.addEventListener('pointerlockchange', onLockChange);
    canvas.style.touchAction = 'none';

    const sens = e => (e.pointerType === 'touch' ? 0.009 : 0.006);
    const touches = new Map();
    let pinchLast = 0;
    let downAt = null;
    function onPointerDown(e) {
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) {
          const [a, b] = [...touches.values()];
          pinchLast = Math.hypot(a.x - b.x, a.y - b.y);
          dragging.current = null;
          return;
        }
      }
      if (e.pointerType === 'mouse' && e.button === 0) {
        if (document.pointerLockElement === canvas) ATTACK.fn?.();
        else downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
      }
      if (dragging.current !== null) return;
      dragging.current = e.pointerId;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e) {
      touches.delete(e.pointerId);
      if (e.pointerType === 'mouse' && e.button === 0 && downAt && document.pointerLockElement !== canvas) {
        if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && performance.now() - downAt.t < 350) ATTACK.fn?.();
        downAt = null;
      }
      if (dragging.current === e.pointerId) dragging.current = null;
    }
    function onPointerMove(e) {
      if (document.pointerLockElement === canvas) {
        yaw.current -= e.movementX * 0.0025;
        pitch.current = Math.max(-0.3, Math.min(1.4, pitch.current + e.movementY * 0.0025));
        return;
      }
      if (touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touches.size === 2) {
          const [a, b] = [...touches.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          distance.current = Math.max(0, Math.min(14, distance.current - (d - pinchLast) * 0.03));
          pinchLast = d;
          return;
        }
      }
      if (dragging.current !== e.pointerId) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * sens(e);
      pitch.current = Math.max(-0.3, Math.min(1.4, pitch.current + dy * sens(e)));
    }
    function onWheel(e) {
      e.preventDefault();
      distance.current = Math.max(0, Math.min(14, distance.current + e.deltaY * 0.01));
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas.removeEventListener('contextmenu', noMenu);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl, shiftLock]);

  useFrame((_, delta) => {
    if (!myEntity) return;
    yawRef.current = yaw.current;
    setListener(myEntity.x, myEntity.y || 0, myEntity.z, yaw.current + Math.PI);
    CAMERA_LOCK.on = Boolean(shiftLock);
    CAMERA_LOCK.pitch = pitch.current;
    CAMERA_LOCK.yaw = yaw.current;
    shoulder.current += ((shiftLock ? 1 : 0) - shoulder.current) * Math.min(1, delta * 10);
    const rightX = Math.cos(yaw.current) * 1.1 * shoulder.current;
    const rightZ = -Math.sin(yaw.current) * 1.1 * shoulder.current;

    const t = Math.min(1, delta * 10);
    smoothedTarget.current.x += (myEntity.x - smoothedTarget.current.x) * t;
    smoothedTarget.current.y += (myEntity.y + 1.1 - smoothedTarget.current.y) * t;
    smoothedTarget.current.z += (myEntity.z - smoothedTarget.current.z) * t;

    const firstPerson = distance.current < 1;
    CAMERA_LOCK.fp = firstPerson;
    CAMERA_LOCK.fpId = focusId;
    if (firstPerson) {
      const elev = pitch.current - 0.78;
      const ce = Math.cos(elev);
      const hx = myEntity.x;
      const hy = myEntity.y + 1.62;
      const hz = myEntity.z;
      camera.position.set(hx, hy, hz);
      smoothedTarget.current.set(hx, myEntity.y + 1.1, hz);
      camera.lookAt(hx - Math.sin(yaw.current) * ce, hy + Math.sin(elev), hz - Math.cos(yaw.current) * ce);
      return;
    }
    const bossK = myEntity.boss ? Math.max(1, (myEntity.size || 1) * 3) : 1;
    const dist = (shiftLock ? Math.min(distance.current, 5) : distance.current) * bossK;
    const horizontalRadius = Math.cos(pitch.current) * dist;
    const height = Math.sin(pitch.current) * dist;
    camera.position.set(
      smoothedTarget.current.x + rightX + Math.sin(yaw.current) * horizontalRadius,
      smoothedTarget.current.y + height,
      smoothedTarget.current.z + rightZ + Math.cos(yaw.current) * horizontalRadius
    );
    camera.position.y = Math.max(camera.position.y, myEntity.y + 0.35);
    if (platforms && platforms.length) {
      const tx = smoothedTarget.current.x + rightX;
      const ty = smoothedTarget.current.y;
      const tz = smoothedTarget.current.z + rightZ;
      const cx = camera.position.x - tx;
      const cy = camera.position.y - ty;
      const cz = camera.position.z - tz;
      const floorY = myEntity.y + 0.6;
      let hit = -1;
      for (let k = 1; k <= 14 && hit < 0; k++) {
        const f = k / 14;
        const px = tx + cx * f;
        const py = ty + cy * f;
        const pz = tz + cz * f;
        for (let i = 0; i < platforms.length; i++) {
          const q = platforms[i];
          if (q.ramp || q.kind === 'pit' || q.kind === 'gate' || q.kind === 'pgate') continue;
          const top = (q.y0 || 0) + q.h;
          if (top <= floorY) continue;
          const bottom = q.slab ? top - q.slab : (q.y0 || 0);
          if (Math.abs(px - q.x) <= q.hx + 0.2 && Math.abs(pz - q.z) <= q.hz + 0.2 && py > bottom - 0.2 && py < top + 0.2) { hit = k; break; }
        }
      }
      if (hit > 0) {
        const f = Math.max(0.12, (hit - 1.5) / 14);
        camera.position.set(tx + cx * f, ty + cy * f, tz + cz * f);
      }
    }
    const tem = myEntity.tem || 0;
    if (tem > 15) {
      const amp = Math.min(1, tem / 100) * 0.7;
      camera.position.x += (Math.random() - 0.5) * amp;
      camera.position.y += (Math.random() - 0.5) * amp;
      camera.position.z += (Math.random() - 0.5) * amp;
    }
    camera.lookAt(smoothedTarget.current.x + rightX, smoothedTarget.current.y, smoothedTarget.current.z + rightZ);
  });

  return null;
}

const SKILL_ACTIONS = ['skill1', 'skill2', 'skill3', 'skill4', 'melee'];

const ATTACK = { fn: null };

const CAMERA_LOCK = { on: false, yaw: 0, pitch: 0.5, fp: false, fpId: null };

function useKeyboardInput(sendInput, yawRef, onPulse, shiftRef) {
  const keysPressed = useRef(new Set());
  const lastSent = useRef({ key: '', at: 0 });
  const slowOn = useRef(false);
  const slowKey = useRef(null);
  if (!slowKey.current) slowKey.current = createModeKey('slowMode', (v) => { slowOn.current = v; });

  useEffect(() => {
    function handleKeyDown(e) {
      // Disparamos el pulso solo en el flanco de bajada (primera vez que
      // se detecta la tecla apretada), no en cada repeat del navegador -
      // si no, mantener Shift apretado mandaría curator_pulse_action sin
      // parar y el servidor lo rechazaría todas las veces salvo la
      // primera (está en cooldown de todos modos, pero no tiene sentido
      // spamear mensajes).
      const dm = /^Digit([0-9])$/.exec(e.code);
      if (dm && !keysPressed.current.has(e.code) && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) onPulse?.('b' + (dm[1] === '0' ? '10' : dm[1]));
      const skillIndex = SKILL_ACTIONS.findIndex((a) => matches(a, e.code));
      if (skillIndex !== -1 && !keysPressed.current.has(e.code)) {
        onPulse?.(skillIndex === 4 ? 'melee' : skillIndex);
      }
      if (matches('slow', e.code) && !e.repeat) slowKey.current.down();
      keysPressed.current.add(e.code);
    }
    function handleKeyUp(e) {
      if (matches('slow', e.code)) slowKey.current.up();
      keysPressed.current.delete(e.code);
    }
    const onBlur = () => slowKey.current.reset();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [onPulse]);

  useEffect(() => {
    const interval = setInterval(() => {
      const keys = keysPressed.current;
      // Ejes LOCALES a la intención del jugador (adelante/atrás/lateral),
      // rotados después según hacia dónde mira la cámara, así W siempre
      // avanza "hacia adelante en pantalla" en vez de "hacia +Z del mundo",
      // que es lo que hacía que moverse se sintiera desconectado de la
      // cámara libre anterior.
      let inputZ = 0, inputX = 0;
      const held = (action) => [...keys].some((c) => matches(action, c));
      if (held('forward')) inputZ -= 1;
      if (held('back')) inputZ += 1;
      if (held('left')) inputX -= 1;
      if (held('right')) inputX += 1;
      const jump = held('jump');
      const slow = slowOn.current;

      if (inputX !== 0 && inputZ !== 0) {
        const norm = Math.SQRT1_2;
        inputX *= norm;
        inputZ *= norm;
      }

      const yaw = yawRef.current || 0;
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      // Rota el vector de intención por el yaw de la cámara.
      const moveX = inputX * cosY + inputZ * sinY;
      const moveZ = inputZ * cosY - inputX * sinY;

      const face = shiftRef && shiftRef.current ? { x: Math.round(-sinY * 100) / 100, z: Math.round(-cosY * 100) / 100 } : undefined;
      const payload = { moveX: Math.round(moveX * 100) / 100, moveZ: Math.round(moveZ * 100) / 100, jump, slow, face, aim: Math.round((0.5 - CAMERA_LOCK.pitch) * 100) / 100 };
      const key = JSON.stringify(payload);
      const nowMs = performance.now();
      if (key === lastSent.current.key && nowMs - lastSent.current.at < 400) return;
      lastSent.current = { key, at: nowMs };
      sendInput(payload);
    }, 16);
    return () => clearInterval(interval);
  }, [sendInput, yawRef, shiftRef]);
}

function RevealBeacon({ entity }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 2;
  });
  const mat = { transparent: true, depthTest: false, depthWrite: false };
  return (
    <group position={[entity.x, entity.y || 0, entity.z]} renderOrder={999}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} renderOrder={999}>
        <ringGeometry args={[0.7, 0.95, 32]} />
        <meshBasicMaterial color="#f2d154" opacity={0.9} {...mat} />
      </mesh>
      <mesh position={[0, 1.5, 0]} renderOrder={999}>
        <cylinderGeometry args={[0.45, 0.45, 3, 16, 1, true]} />
        <meshBasicMaterial color="#f2d154" opacity={0.18} side={DoubleSide} {...mat} />
      </mesh>
      <mesh ref={ref} position={[0, 3.4, 0]} renderOrder={999}>
        <octahedronGeometry args={[0.28]} />
        <meshBasicMaterial color="#ffe98a" opacity={0.95} {...mat} />
      </mesh>
    </group>
  );
}

function SquareFrame({ x, z, half, color, opacity, y = 0, hy, hz }) {
  const halfY = hy ?? half;
  const halfZ = hz ?? half;
  const geometry = useMemo(() => new EdgesGeometry(new BoxGeometry(half * 2, halfY * 2, halfZ * 2)), [half, halfY, halfZ]);
  return (
    <group position={[x, y, z]}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} transparent opacity={Math.min(1, opacity + 0.2)} depthWrite={false} />
      </lineSegments>
      <mesh>
        <boxGeometry args={[half * 2, halfY * 2, halfZ * 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

const PLAT_TEX = { wall: 'plaster', partition: 'plaster', tower: 'tower', roof: 'roof', ramp: 'ramp', mezzanine: 'concrete' };

function NightDecor({ showStars = true, lights = true, lightCount = 5 }) {
  const stars = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 400; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = 0.15 + Math.random() * 1.2;
      pts.push(Math.cos(a) * Math.cos(e) * 220, Math.sin(e) * 220, Math.sin(a) * Math.cos(e) * 220);
    }
    return new Float32Array(pts);
  }, []);
  return (
    <group>
      {showStars && <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" array={stars} count={stars.length / 3} itemSize={3} /></bufferGeometry>
        <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} fog={false} />
      </points>}
      {showStars && <mesh position={[-90, 120, -140]}>
        <sphereGeometry args={[9, 20, 14]} />
        <meshBasicMaterial color="#f3f0d8" fog={false} />
      </mesh>}
      {lights && (
        <>
          <pointLight position={[0, 4, 0]} intensity={7} distance={30} color="#fff3e0" />
          {lightCount >= 2 && <pointLight position={[20, 4, 20]} intensity={5} distance={26} color="#fff3e0" />}
          {lightCount >= 2 && <pointLight position={[-20, 4, -20]} intensity={5} distance={26} color="#fff3e0" />}
          {lightCount >= 5 && <pointLight position={[-20, 4, 20]} intensity={5} distance={26} color="#fff3e0" />}
          {lightCount >= 5 && <pointLight position={[20, 4, -20]} intensity={5} distance={26} color="#fff3e0" />}
        </>
      )}
    </group>
  );
}

function GateMesh({ p }) {
  const c = p.kind === 'pgate' ? '#5fd58c' : '#f2a154';
  const c2 = p.kind === 'pgate' ? '#2e8a55' : '#c97a2e';
  const alongX = p.hx > p.hz;
  const len = (alongX ? p.hx : p.hz) * 2;
  const bars = Math.max(2, Math.round(len / 0.6));
  return (
    <group position={[p.x, p.y0 || 0, p.z]}>
      <mesh position={[0, p.h / 2, 0]}>
        <boxGeometry args={[p.hx * 2, p.h, p.hz * 2]} />
        <meshBasicMaterial color={c} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {Array.from({ length: bars + 1 }, (_, i) => {
        const o = -len / 2 + (i * len) / bars;
        return (
          <mesh key={i} position={alongX ? [o, p.h / 2, 0] : [0, p.h / 2, o]}>
            <boxGeometry args={alongX ? [0.08, p.h, p.hz * 2 + 0.1] : [p.hx * 2 + 0.1, p.h, 0.08]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.5} />
          </mesh>
        );
      })}
      {[0.1, p.h - 0.1].map((y) => (
        <mesh key={y} position={[0, y, 0]}><boxGeometry args={[p.hx * 2 + 0.1, 0.12, p.hz * 2 + 0.1]} /><meshStandardMaterial color={c2} /></mesh>
      ))}
    </group>
  );
}

function ShakeGroup({ on, children }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (on) {
      const t = clock.elapsedTime * 38;
      ref.current.position.set(Math.sin(t) * 0.06, Math.abs(Math.sin(t * 0.7)) * 0.05, Math.cos(t * 1.3) * 0.06);
    } else if (ref.current.position.x !== 0 || ref.current.position.y !== 0) {
      ref.current.position.set(0, 0, 0);
    }
  });
  return <group ref={ref}>{children}</group>;
}

function StairMesh({ p, tops, tint }) {
  const len = p.hx * 2;
  const n = Math.max(2, Math.round(p.h / 0.28));
  const sign = p.ramp === '+x' ? 1 : -1;
  const steps = [];
  for (let i = 0; i < n; i++) {
    const frac = (i + 0.5) / n;
    steps.push({ x: sign * (-p.hx + frac * len), top: frac * p.h });
  }
  const angle = Math.atan2(p.h, len) * sign;
  return (
    <group position={[p.x, p.y0 || 0, p.z]}>
      {steps.map((st, i) => (
        <mesh key={i} position={[st.x, st.top - 0.2, 0]}>
          <boxGeometry args={[len / n + 0.02, 0.4, p.hz * 2 - 0.5]} />
          <meshStandardMaterial map={tops} color={tint} roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, p.h / 2, side * (p.hz - 0.15)]} rotation={[0, 0, angle]}>
          <mesh position={[0, -0.35, 0]}><boxGeometry args={[Math.hypot(len, p.h), 0.5, 0.3]} /><meshStandardMaterial color="#59635e" roughness={0.8} /></mesh>
          <mesh position={[0, 0.85, 0]}><boxGeometry args={[Math.hypot(len, p.h), 0.08, 0.1]} /><meshStandardMaterial color="#9aa5a0" metalness={0.6} roughness={0.4} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Platform({ p }) {
  if (p.kind === 'gate' || p.kind === 'pgate') return <GateMesh p={p} />;
  if (p.ramp === '+z' || p.ramp === '-z') {
    const q = { ...p, x: 0, z: 0, hx: p.hz, hz: p.hx, ramp: '+x' };
    return (
      <group position={[p.x, 0, p.z]} rotation={[0, p.ramp === '+z' ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <Platform p={q} />
      </group>
    );
  }
  const name = p.tex || (p.ramp ? 'ramp' : PLAT_TEX[p.kind] || 'concrete');
  const y0 = p.y0 || 0;
  const len = p.hx * 2;
  const tops = useMemo(() => getTexture(name, Math.max(1, Math.round(len / 3)), Math.max(1, Math.round(p.hz * 2 / 3))), [name, len, p.hz]);
  const sides = useMemo(() => getTexture(name, Math.max(1, Math.round(Math.max(len, p.hz * 2) / 3)), Math.max(1, Math.round(p.h / 3))), [name, len, p.hz, p.h]);
  let tint = p.tint || (tops ? '#ffffff' : p.ramp ? '#9a8f3a' : '#76817b');
  if (p.hp > 0) tint = p.dmg > 0 ? new Color(p.tint || '#d9a679').lerp(new Color('#3a2a1c'), Math.min(0.85, p.dmg)).getStyle() : p.tint || '#d9a679';
  if (p.slab) {
    const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    return (
      <group position={[p.x, y0, p.z]}>
        <mesh position={[0, p.h - p.slab / 2, 0]}>
          <boxGeometry args={[len, p.slab, p.hz * 2]} />
          <meshStandardMaterial map={sides} color={tint} roughness={0.6} />
        </mesh>
        <mesh position={[0, p.h + 0.15, 0]}>
          <boxGeometry args={[len + 0.1, 0.3, p.hz * 2 + 0.1]} />
          <meshStandardMaterial color="#6f9a94" roughness={0.7} transparent opacity={0.3} />
        </mesh>
        {legs.map(([a, b]) => (
          <mesh key={`${a}${b}`} position={[a * (p.hx - 0.3), (p.h - p.slab) / 2, b * (p.hz - 0.3)]}>
            <cylinderGeometry args={[0.18, 0.18, p.h - p.slab, 8]} />
            <meshStandardMaterial color="#e8f1f8" roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }
  if (!p.ramp) {
    return (
      <mesh position={[p.x, y0 + p.h / 2, p.z]}>
        <boxGeometry args={[len, p.h, p.hz * 2]} />
        <meshStandardMaterial map={sides} color={tint} roughness={0.85} />
      </mesh>
    );
  }
  if (p.stairs) return <StairMesh p={p} tops={tops} tint={tint} />;
  const angle = Math.atan2(p.h, len) * (p.ramp === '+x' ? 1 : -1);
  return (
    <group position={[p.x, y0 + p.h / 2, p.z]} rotation={[0, 0, angle]}>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[Math.hypot(len, p.h), 0.4, p.hz * 2]} />
        <meshStandardMaterial map={tops} color={tint} roughness={0.8} />
      </mesh>
    </group>
  );
}

function RampFrame({ p, color, opacity }) {
  const y0 = p.y0 || 0;
  const len = p.hx * 2;
  const angle = Math.atan2(p.h, len) * (p.ramp === '+x' ? 1 : -1);
  const dims = [Math.hypot(len, p.h), 0.4, p.hz * 2];
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(...dims)), [len, p.h, p.hz]);
  return (
    <group position={[p.x, y0 + p.h / 2, p.z]} rotation={[0, 0, angle]}>
      <group position={[0, -0.2, 0]}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={color} transparent opacity={Math.min(1, opacity + 0.2)} depthWrite={false} />
        </lineSegments>
        <mesh>
          <boxGeometry args={dims} />
          <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function bossBox(e) {
  const s = e.size || 1;
  return { half: e.hh ?? Math.max(0.8, 2.2 * s) * (e.cr ? 0.9 : 1), h: e.hv ?? Math.max(2.4, 5.5 * s * (e.cr ? 0.55 : 1)) };
}

function BossM1Frame({ e, opacity }) {
  const ref = useRef();
  const st = useRef({ t: null, at: 0 });
  useFrame(() => {
    const fx = e.bfx;
    if (fx && fx.k === 'm1' && fx.t !== st.current.t) st.current = { t: fx.t, at: performance.now(), fx };
    const on = st.current.fx && performance.now() - st.current.at < 600;
    if (!ref.current) return;
    ref.current.visible = Boolean(on);
    if (on) {
      const f = st.current.fx;
      const L = f.L || 8;
      const w = f.w || 4;
      ref.current.position.set(e.x + (f.fx ?? 0) * L / 2, (e.y || 0) + 2, e.z + (f.fz ?? 1) * L / 2);
      ref.current.rotation.y = Math.atan2(f.fx ?? 0, f.fz ?? 1);
      ref.current.scale.set(w, 4, L);
    }
  });
  return (
    <group ref={ref} visible={false}>
      <lineSegments geometry={M1_EDGES}>
        <lineBasicMaterial color="#e0555f" transparent opacity={Math.min(1, opacity + 0.2)} depthWrite={false} />
      </lineSegments>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#e0555f" transparent opacity={0.16} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}
const M1_EDGES = new EdgesGeometry(new BoxGeometry(1, 1, 1));

function NotifyMarks({ entities }) {
  const list = Object.entries(entities || {}).filter(([, en]) => en.ntf > 0 && !en.corpse && !en.gone);
  if (!list.length) return null;
  return (
    <>
      {list.map(([id, en]) => {
        const k = Math.max(0.1, Math.min(1, en.ntf / 3500));
        return (
          <group key={'ntf' + id} position={[en.x, (en.y || 0) + (en.boss ? 8 : 3.2), en.z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.4 + k, 0.4 + k, 1]} renderOrder={998}>
              <ringGeometry args={[0.8, 1, 24]} />
              <meshBasicMaterial color="#f2e6c0" transparent opacity={0.9} depthTest={false} depthWrite={false} />
            </mesh>
            <mesh renderOrder={998}>
              <boxGeometry args={[0.5, 0.65, 0.05]} />
              <meshBasicMaterial color="#fff6d8" depthTest={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function ScanMarks({ entities, myId }) {
  const me = entities?.[myId];
  if (!me || !me.boss || !me.scn) return null;
  return (
    <>
      {Object.entries(entities).filter(([, en]) => !en.boss && !en.corpse && !en.gone).map(([id, en]) => (
        <group key={'scn' + id} position={[en.x, (en.y || 0), en.z]}>
          <mesh position={[0, 1, 0]} renderOrder={999}>
            <cylinderGeometry args={[0.05, 0.05, 40, 6]} />
            <meshBasicMaterial color="#b36bff" transparent opacity={0.35} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={999}>
            <ringGeometry args={[0.9, 1.2, 28]} />
            <meshBasicMaterial color="#d8a8ff" transparent opacity={0.9} depthTest={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function GlProbe() {
  const gl = useThree((st) => st.gl);
  const n = useRef(0);
  useFrame(() => {
    n.current += 1;
    if (n.current % 30) return;
    const i = gl.info;
    window.__glinfo = { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures };
  });
  return null;
}

function Hitboxes({ entities, myPlayerId, collisionObjects, selfDamageObjects, zones, platforms, effects, opacity, cfg }) {
  return (
    <>
      {(effects || []).filter((fx) => fx.boxes && Date.now() - fx.startedAt < 900).flatMap((fx) => fx.boxes.map((b, i) => (
        <SquareFrame key={`${fx.id}_${i}`} x={b.x} z={b.z} y={b.y ?? (entities?.[fx.casterId]?.y ?? 0) + 0.95} half={b.half} color="#e0555f" opacity={opacity} />
      )))}
      {(effects || []).filter((fx) => fx.radius && Date.now() - fx.startedAt < 900).map((fx) => (
        <SquareFrame key={fx.id} x={fx.x} z={fx.z} y={(entities?.[fx.casterId]?.y ?? 0) + 0.95} half={fx.radius} color="#e0555f" opacity={opacity} />
      ))}
      {(platforms || []).filter((p) => p.kind === 'pit').map((p) => (
        <SquareFrame key={p.id} x={p.x} z={p.z} y={-p.h / 2} half={p.hx} hy={p.h / 2} hz={p.hz} color="#e0555f" opacity={opacity} />
      ))}
      {(platforms || []).filter((p) => p.kind !== 'pit').map((p) => p.ramp ? (
        <RampFrame key={p.id} p={p} color="#e0555f" opacity={opacity} />
      ) : (
        <SquareFrame key={p.id} x={p.x} z={p.z} y={(p.y0 || 0) + (p.slab ? p.h - p.slab / 2 : p.h / 2)} half={p.hx} hy={p.slab ? p.slab / 2 : p.h / 2} hz={p.hz} color="#e0555f" opacity={opacity} />
      ))}
      {Object.entries(entities || {}).filter(([, entity]) => !entity.corpse && !entity.gone).map(([id, entity]) => (
        <group key={id}>
          <SquareFrame x={entity.x} z={entity.z} y={entity.y + (entity.boss ? bossBox(entity).h : cfg.height) / 2} half={entity.boss ? bossBox(entity).half : cfg.half} hy={(entity.boss ? bossBox(entity).h : cfg.height) / 2} color="#e0555f" opacity={opacity} />
        </group>
      ))}
      {Object.entries(entities || {}).filter(([, en]) => en.boss).map(([id, en]) => <BossM1Frame key={'m1' + id} e={en} opacity={opacity} />)}
      {(collisionObjects || []).map((obj) => (
        <SquareFrame key={obj.id} x={obj.x} z={obj.z} y={(obj.height || 1.2) / 2} half={obj.radius} hy={(obj.height || 1.2) / 2} color="#e0555f" opacity={opacity} />
      ))}
      {Object.entries(selfDamageObjects || {}).map(([id, pos]) => (
        <SquareFrame key={id} x={pos.x} z={pos.z} y={(pos.y || 0) + cfg.interact} half={cfg.interact} color="#e0555f" opacity={opacity} />
      ))}
      {(zones || []).map((zone) => (
        <SquareFrame key={zone.id} x={zone.x} z={zone.z} y={zone.y || 0} half={zone.radius} color="#e0555f" opacity={opacity} />
      ))}
    </>
  );
}

const MGround = memo(Ground);
const MLobbyDecor = memo(LobbyDecor);
const MPlatform = memo(Platform);
const MPit = memo(PitMesh);
const MCollisionObject = memo(CollisionObject);
const MSelfDamageObject = memo(SelfDamageObject, (a, b) => a.position.x === b.position.x && a.position.y === b.position.y && a.position.z === b.position.z && a.near === b.near && a.active === b.active && a.kind === b.kind);

const LoosePlatform = memo(function LoosePlatform({ p, dmg, on }) {
  const pp = useMemo(() => (dmg === null ? p : { ...p, dmg }), [p, dmg]);
  return <ShakeGroup on={on}><MPlatform p={pp} /></ShakeGroup>;
});

const PlatformLayer = memo(function PlatformLayer({ platforms, shakeIds, plankHp, blockHp, q }) {
  const zones = useMemo(() => {
    const solid = (platforms || []).filter((p) => p.kind !== 'pit');
    const shaken = new Set(shakeIds || []);
    const isLoose = (p) => p.tex || p.hp > 0 || p.blockMax > 0 || p.kind === 'gate' || p.kind === 'pgate' || shaken.has(p.id);
    const acc = {};
    solid.filter((p) => !isLoose(p)).forEach((p) => { const k = `${Math.floor(p.x / 14)},${Math.floor(p.z / 14)}`; (acc[k] = acc[k] || []).push(p); });
    return { zones: Object.entries(acc), loose: solid.filter(isLoose), shaken };
  }, [platforms, shakeIds]);
  return (
    <>
      {zones.zones.map(([ck, list]) => (
        <StaticMerge key={`${ck}:${list.map((p) => p.id).join(',')}`} enabled={q < 4}>
          {list.map((p) => <MPlatform key={p.id} p={p} />)}
        </StaticMerge>
      ))}
      {zones.loose.map((p) => {
        const hp = plankHp ? plankHp[p.id] : undefined;
        const on = zones.shaken.has(p.id) || (p.hp > 0 && hp !== undefined && hp < p.hp && hp > 0);
        let dmg = null;
        if (p.hp > 0) dmg = 1 - (hp !== undefined ? hp : p.hp) / p.hp;
        else if (p.blockMax > 0) dmg = Math.min(1, ((blockHp && blockHp[p.id] !== undefined ? blockHp[p.id] : p.blockMax * 0.35)) / p.blockMax);
        return <LoosePlatform key={p.id} p={p} dmg={dmg} on={on} />;
      })}
    </>
  );
});

export default function GameScene({
  gameMode,
  lmsActive,
  entities,
  players,
  myPlayerId,
  phase,
  selfDamageObjects,
  zones,
  effects,
  stunnedIds,
  ragdollIds,
  collisionObjects,
  platforms,
  matchHalf,
  sdActiveId,
  sdTypes,
  revealedIds,
  sendInput,
  sendAction,
  onPulse,
  hitboxes,
  hitboxCfg,
  followId,
  ghosts,
  ghostMode,
  shiftLock,
  onShiftLockLost,
  shakeIds,
  plankHp,
  blockHp,
  ghostBlocks,
}) {
  const settings = useSettings();
  const g = gfx(settings.quality);
  installLowPoly();
  setPolyScale(g.poly);
  setTextureQuality(!g.textures, g.aniso);
  const yawRef = useRef(Math.PI);
  const shiftRef = useRef(false);
  shiftRef.current = Boolean(shiftLock);
  useKeyboardInput(sendInput, yawRef, onPulse, shiftRef);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const areaHalfSize = phase === 'action' ? matchHalf || MATCH_HALF_SIZE : LOBBY_HALF_SIZE;
  JF.ents = entities;
  const myEntity = ghostMode && ghosts?.[myPlayerId] ? ghosts[myPlayerId] : entities[followId || myPlayerId];
  ATTACK.fn = phase === 'action' && !ghostMode && (playerById.get(myPlayerId)?.isAsymRole || entities[myPlayerId]?.boss) ? () => sendAction('cure_action', {}) : null;
  const pits = useMemo(() => (phase === 'action' ? (platforms || []).filter((p) => p.kind === 'pit') : []), [platforms, phase]);

  return (
    <Canvas key={`${g.antialias}-${g.textures}-${g.poly}`} dpr={isBoard() ? Math.min(g.dpr, 1) : coarse ? Math.min(g.dpr, 2) : g.dpr} gl={{ antialias: g.antialias, powerPreference: g.minimal ? 'low-power' : 'high-performance' }} camera={{ position: [0, 3, 7], fov: 60 }}>
      <ambientLight intensity={phase === 'action' ? (gameMode === 'lights' ? 0.22 : g.lights ? 0.55 : 0.95) : 0.75} color={phase === 'action' ? '#cfc6c4' : '#cfe0ff'} />
      <directionalLight position={phase === 'action' ? [-30, 40, -45] : [8, 12, 6]} intensity={phase === 'action' ? (gameMode === 'lights' ? 0.12 : 0.7) : 1.1} color={phase === 'action' ? '#ffc0a8' : '#ffffff'} />
      <hemisphereLight args={phase === 'action' ? ['#8f7c8a', '#33262e', gameMode === 'lights' ? 0.12 : 0.6] : ['#bcd4ff', '#8a7a68', 0.35]} />
      <color attach="background" args={[phase === 'action' ? '#090607' : '#12162e']} />
      <fog attach="fog" args={phase === 'action' ? (gameMode === 'lights' ? ['#030203', 2, (playerById.get(myPlayerId)?.isAsymRole ? 34 : 22) * (lmsActive ? 0.6 : 1)] : ['#130b0e', 45, g.fogFar]) : ['#12162e', 45, 130]} />
      <GlProbe />
      <NotifyMarks entities={entities} />
      {phase === 'action' && <ScanMarks entities={entities} myId={myPlayerId} />}
      {phase === 'action' && <Embers />}
      {phase === 'action' && <NightDecor showStars={g.stars} lights={g.lights} lightCount={g.lightCount} />}
      {phase === 'action' && g.decor !== 'none' && <HospitalDecor half={areaHalfSize} platforms={platforms} level={g.decor} dust={g.dust} lightsOn={g.lightCount >= 5} />}

      <FollowCamera platforms={phase === 'action' ? platforms : null} focusId={followId || myPlayerId} myEntity={myEntity} yawRef={yawRef} shiftLock={Boolean(shiftLock) && !followId} onLockLost={onShiftLockLost} />

      <MGround halfSize={areaHalfSize} themed={phase === 'action'} pits={pits} />
      {pits.map((p) => <MPit key={p.id} p={p} pits={pits} />)}
      {phase !== 'action' && <MLobbyDecor />}

      {phase === 'action' && (effects || []).map((effect) => (effect.sup ? <SuperFx key={effect.id} effect={effect} /> : <SkillEffect key={effect.id} effect={effect} />))}

      {phase === 'action' && (zones || []).map((zone) => <ZoneDisc key={zone.id} zone={zone} platforms={platforms} ghost={Boolean(playerById.get(myPlayerId)?.isAsymRole)} />)}

      {hitboxes?.on && (
        <Hitboxes
          entities={entities}
          myPlayerId={myPlayerId}
          collisionObjects={phase === 'action' ? collisionObjects : []}
          selfDamageObjects={phase === 'action' ? selfDamageObjects : {}}
          zones={phase === 'action' ? zones : []}
          platforms={phase === 'action' ? platforms : []}
          effects={phase === 'action' ? effects : []}
          opacity={hitboxes.opacity}
          cfg={hitboxCfg || { half: 0.4, height: 1.8, interact: 1.2 }}
        />
      )}

      {(ghostBlocks || []).map((p) => (
        <mesh key={`gb${p.id}`} position={[p.x, (p.y0 || 0) + p.h / 2, p.z]}>
          <boxGeometry args={[p.hx * 2, p.h, p.hz * 2]} />
          <meshBasicMaterial color="#ff5a6e" transparent opacity={0.22} wireframe />
        </mesh>
      ))}
      <PlatformLayer platforms={platforms} shakeIds={shakeIds} plankHp={plankHp} blockHp={blockHp} q={g.q} />
      

      {phase === 'action' &&
        <StaticMerge key={`co${(collisionObjects || []).length}`}>
          {(collisionObjects || []).map((obj) => <MCollisionObject key={obj.id} obj={obj} />)}
        </StaticMerge>}

      {phase === 'action' &&
        Object.entries(selfDamageObjects || {}).map(([objectId, pos]) => (
          <group
            key={objectId}
            onClick={(e) => {
              e.stopPropagation();
              if (sdActiveId) return;
              sendAction('self_damage_action', { objectId });
            }}
          >
            <MSelfDamageObject position={pos} near={Boolean(myEntity) && Math.abs(myEntity.x - pos.x) < 2.2 && Math.abs(myEntity.z - pos.z) < 2.2 && Math.abs((myEntity.y || 0) - pos.y) < 2.5} active={sdActiveId === objectId} kind={sdTypes?.[objectId]} />
          </group>
        ))}

      {(revealedIds || []).map((rid) => (entities[rid] && !entities[rid].gone ? <RevealBeacon key={`rv_${rid}`} entity={entities[rid]} /> : null))}

      {Object.entries(ghosts || {}).map(([gid, g]) => (
        <PlayerCapsule
          key={`ghost_${gid}`}
          playerId={`ghost_${gid}`}
          entityState={g}
          color={COLOR_PACIENTE}
          isMe={false}
          stunned={false}
          ragdoll={false}
          ghost
          cosmetics={playerById.get(gid)?.cosmetics}
          ghostOpacity={g.visible ? 0.65 : 0.4}
        />
      ))}

      {Object.entries(entities).map(([playerId, entityState]) => {
        const player = playerById.get(playerId);
        if (!player || entityState.gone) return null;
        const color =
          phase === 'action' ? (player.isAsymRole ? COLOR_CURADOR : COLOR_PACIENTE) : COLOR_UNASSIGNED;
        return (
          <group
            key={playerId}
          >
            {entityState.live && !entityState.boss && (
              <mesh position={[entityState.x, (entityState.y || 0) + 3.4, entityState.z]}>
                <coneGeometry args={[0.45, 0.9, 4]} />
                <meshBasicMaterial color="#ff3b3b" depthTest={false} />
              </mesh>
            )}
            {entityState.dec && !entityState.boss && <PlayerCapsule
              playerId={`${playerId}_dec`}
              entityState={{ ...entityState, x: entityState.dec.x, y: entityState.dec.y, z: entityState.dec.z, dec: undefined, wpn: undefined, bar: undefined, chg: undefined, gld: undefined, invis: false, live: false }}
              color={color}
              isMe={false}
              isCurator={false}
              stunned={false}
              ragdoll={false}
              cosmetics={player.cosmetics}
            />}
            {entityState.boss ? <BossCube e={entityState} /> : <PlayerCapsule
              playerId={playerId}
              entityState={entityState}
              color={color}
              isMe={playerId === myPlayerId}
              isCurator={phase === 'action' && Boolean(player.isAsymRole)}
              stunned={(stunnedIds || []).includes(playerId)}
              ragdoll={(ragdollIds || []).includes(playerId)}
              cosmetics={player.cosmetics}
            />}
          </group>
        );
      })}

    </Canvas>
  );
}
