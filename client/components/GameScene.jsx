'use client';

import { useRef, useEffect, useState, useMemo, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Shape, Path, ShapeGeometry, BoxGeometry, BufferGeometry, Float32BufferAttribute, EdgesGeometry, Vector3, Matrix4, Quaternion, TextureLoader, DoubleSide, SRGBColorSpace } from 'three';
import { itemOf } from '../lib/cosmetics';
import { getTexture } from '../lib/textures';

const LOBBY_HALF_SIZE = 15;
const MATCH_HALF_SIZE = 60;

const COLOR_SELF_DAMAGE_OBJECT = '#e0555f';
const COLOR_CURADOR = '#f2a154';
const COLOR_PACIENTE = '#5fd58c';
const COLOR_UNASSIGNED = '#8a8da3';

const COLOR_FLOOR_MATCH = '#f4f7fa';
const COLOR_METAL = '#8a8674';
const COLOR_WALL_TINT = '#bcd6ea';
const COLOR_EMERGENCY_LIGHT = '#5468ff';

const FACING = new Map();
const HAND_ANIMS = new Map();
const ANIM_DURATION = { swing: 650, consume: 950, throw: 750, cast: 850, shout: 1200, stumble: 900, roll: 600 };
const IMPACT_MS = { swing: 260, consume: 560, throw: 340, cast: 380, shout: 350, stumble: 250, roll: 150 };
const ANIM_BY_KIND = {
  skill_melee_stun: 'swing',
  card_tajo_carmesi: 'swing',
  card_red_mist: 'swing',
  card_tropiezo: 'stumble',
  card_rodar: 'roll',
  card_grito_animo: 'shout',
  card_chicharron: 'consume',
  card_goyslop: 'consume',
  card_racion_compartida: 'consume',
  card_acetilcolina: 'consume',
  skill_tonico_reforzado: 'consume',
  card_agua_rimac: 'throw',
  card_rimac_sin_filtrar: 'throw',
  card_humo_yodo: 'throw',
  card_humo_toxico: 'throw',
  card_cascara_platano: 'throw',
  card_platano_podrido: 'throw',
  card_regalo_envenenado: 'throw',
  skill_somnifero_valeriana: 'throw',
  skill_ronda_suero: 'throw',
  skill_desinfectante: 'throw',
  skill_pulso_hierbas: 'cast',
  skill_anestesia: 'cast',
  skill_camilla_magnetica: 'cast',
  card_grito_animo: 'cast',
  card_risa_enlatada: 'cast',
  card_risa_macabra: 'cast',
};

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function HeldItem({ held }) {
  const groupRef = useRef();
  useFrame(() => {
    const group = groupRef.current;
    if (!group || !held) return;
    const t = Math.min(1, (Date.now() - held.startedAt) / ANIM_DURATION[held.anim]);
    group.visible = t < 1;
    const e = easeOut(t);
    if (held.anim === 'swing') {
      group.position.set(0.55, 1.45, 0.1);
      group.rotation.set(-Math.PI + 2.9 * e, 0, 0);
      group.children[0].position.set(0, -0.9, 0);
      group.scale.setScalar(1.2);
    } else if (held.anim === 'shout') {
      group.position.set(0.1, 1.62, 0.4);
      group.rotation.set(0, 0, 0);
      group.children[0].position.set(0, 0, 0);
      group.scale.setScalar(0.9 + 0.12 * Math.sin(t * 40));
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
  if (!held) return null;
  return (
    <group ref={groupRef}>
      <group>
        <PropMesh kind={held.prop} color={held.color} />
      </group>
    </group>
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

function CosmeticPieces({ slot, cosmetics }) {
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

function PlayerCapsule({ playerId, entityState, color, isMe, stunned, ragdoll, ghost, ghostOpacity = 0.65, cosmetics }) {
  const bodyRef = useRef();
  const lastPos = useRef([entityState.x, entityState.z]);
  const yaw = useRef(0);
  const [held, setHeld] = useState(null);
  const heldId = useRef(null);
  const groupRef = useRef();
  const rag = useRef({ on: false });
  const limbRefs = useRef([]);
  const rig = useRef({});
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
    if (ghost && groupRef.current.userData.ghostOp !== ghostOpacity) {
      groupRef.current.userData.ghostOp = ghostOpacity;
      groupRef.current.traverse((o) => {
        const m = o.material;
        if (m) {
          if (!m.userData.ghosted) { m.transparent = true; m.depthWrite = false; m.userData.ghosted = true; m.needsUpdate = true; }
          m.opacity = ghostOpacity;
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
      if (ha && ANIM_DURATION[ha.anim]) {
        const ht = Math.min(1, (Date.now() - ha.startedAt) / ANIM_DURATION[ha.anim]);
        if (ha.anim === 'swing') {
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
        } else if (ha.anim === 'roll') {
          lax = -2.8;
          rax = -2.8;
          laz = -0.15;
          raz = 0.15;
        } else if (ha.anim === 'consume') {
          rax = -1.9 * easeOut(Math.min(1, ht / 0.45));
          raz = 0.2;
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
      const r6 = rig.current;
      if (r6.legL) {
        r6.legL.rotation.x = swing * 1.1 + 0.5 * w.air;
        r6.legR.rotation.x = -swing * 1.1 - 0.3 * w.air;
        r6.armL.rotation.x = lax;
        r6.armR.rotation.x = rax;
        r6.armL.rotation.z = laz;
        r6.armR.rotation.z = raz;
      }
      const showRag = Boolean(ragdoll && entityState.rag && entityState.rag.p);
      body.visible = !showRag;
      const pa = HAND_ANIMS.get(playerId);
      const pt = pa && ANIM_DURATION[pa.anim] ? Math.min(1, (Date.now() - pa.startedAt) / ANIM_DURATION[pa.anim]) : 1;
      let pitch = 0;
      let offY = 0;
      let offF = 0;
      if (pa && pt < 1) {
        if (pa.anim === 'roll') {
          pitch = pt * Math.PI * 2;
          offY = 0.9 - 0.9 * Math.cos(pitch);
          offF = -0.9 * Math.sin(pitch);
        } else if (pa.anim === 'stumble') {
          pitch = 0.55 * Math.sin(pt * Math.PI);
          offF = -0.9 * Math.sin(pitch) * 0.5;
        } else if (pa.anim === 'shout') {
          pitch = -0.3 * Math.sin(Math.min(1, pt * 3) * Math.PI / 2) * (1 - Math.max(0, pt - 0.7) / 0.3);
        }
      }
      body.rotation.order = 'YXZ';
      body.rotation.set(pitch, yaw.current, 0);
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
    } else if (anim && Date.now() - anim.startedAt > ANIM_DURATION[anim.anim]) {
      HAND_ANIMS.delete(playerId);
    }
    groupRef.current.visible = !(CAMERA_LOCK.fp && CAMERA_LOCK.fpId === playerId);
    const t = Math.min(1, delta * (isMe ? 24 : 16));
    groupRef.current.position.x += (targetPos.current[0] - groupRef.current.position.x) * t;
    groupRef.current.position.y += (targetPos.current[1] - groupRef.current.position.y) * t;
    groupRef.current.position.z += (targetPos.current[2] - groupRef.current.position.z) * t;
  });

  return (
    <group ref={groupRef} position={targetPos.current}>
      <group ref={bodyRef}>
        <mesh position={[0, 1.08, 0]}><boxGeometry args={[0.72, 0.72, 0.36]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
        <group position={[0, 1.62, 0]}>
          <mesh><cylinderGeometry args={[0.18, 0.18, 0.36, 14]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh>
          <mesh position={[-0.07, 0.04, 0.175]}><boxGeometry args={[0.04, 0.06, 0.02]} /><meshBasicMaterial color="#12131a" /></mesh>
          <mesh position={[0.07, 0.04, 0.175]}><boxGeometry args={[0.04, 0.06, 0.02]} /><meshBasicMaterial color="#12131a" /></mesh>
          <mesh position={[0, -0.06, 0.175]}><boxGeometry args={[0.12, 0.025, 0.02]} /><meshBasicMaterial color="#12131a" /></mesh>
          <CosmeticPieces slot="head" cosmetics={cosmetics} />
        </group>
        <CosmeticPieces slot="torso" cosmetics={cosmetics} />
        <CosmeticPieces slot="back" cosmetics={cosmetics} />
        {[['armL', -0.54, 1.44, SKIN], ['armR', 0.54, 1.44, SKIN], ['legL', -0.18, 0.72, '#3a3d52'], ['legR', 0.18, 0.72, '#3a3d52']].map(([key, px, py, col]) => (
          <group key={key} ref={(el) => { rig.current[key] = el; }} position={[px, py, 0]}>
            <mesh position={[0, -0.36, 0]}><boxGeometry args={[0.36, 0.72, 0.36]} /><meshStandardMaterial color={col} roughness={0.6} /></mesh>
          </group>
        ))}
        <HeldItem held={held} />
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
  useFrame(({ clock }) => {
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

function SelfDamageObject({ position, near, active }) {
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
      {(near || active) && (
        <mesh ref={ringRef} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color={active ? '#ffffff' : '#ffd166'} transparent opacity={active ? 0.95 : 0.7} side={DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, 0.4, 0]} scale={active ? 1.3 : near ? 1.15 : 1}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color={COLOR_SELF_DAMAGE_OBJECT}
          emissive={COLOR_SELF_DAMAGE_OBJECT}
          emissiveIntensity={0.4}
          roughness={0.3}
        />
      </mesh>
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

const ZONE_COLORS = { rimac: '#6b8f3a', puddle: '#5fd58c', trap: '#f2d154' };

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

function ZoneDisc({ zone, ghost, platforms }) {
  const ramp = (platforms || []).find((p) => p.ramp && Math.abs(zone.x - p.x) <= p.hx && Math.abs(zone.z - p.z) <= p.hz);
  const tilt = ramp ? Math.atan2(ramp.h, ramp.hx * 2) * (ramp.ramp === '+x' ? 1 : -1) : 0;
  const color = ZONE_COLORS[zone.kind] || '#ffffff';
  const isTrap = zone.kind === 'trap';
  const bananaColor = zone.cardId === 'platano_podrido' ? '#7a6a2a' : '#f2d154';
  return (
    <group position={[zone.x, zone.y || 0, zone.z]} rotation={[0, 0, tilt]}>
      {isTrap ? (
        <SquareFrame x={0} z={0} half={zone.radius} color={color} opacity={zone.armed ? 0.6 : 0.25} />
      ) : (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[zone.radius * 2, zone.radius * 2]} />
          <meshBasicMaterial color={color} transparent opacity={zone.kind === 'rimac' ? 0.1 + 0.07 * (zone.level || 3) : 0.3} />
        </mesh>
      )}
      {isTrap && <BananaMesh color={bananaColor} spotted={false} ghost={ghost} fade={zone.level > 0 && zone.level <= 2} />}
      {zone.kind === 'rimac' && (
        <>
          <PuddleRipples radius={zone.radius} color={zone.cardId === 'rimac_sin_filtrar' ? '#5f7f20' : '#8fb050'} />
          <BrokenBottle color={color} />
        </>
      )}
      {zone.kind === 'puddle' && <PuddleRipples radius={zone.radius} color="#5fd58c" />}
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
  can: [['cylinderGeometry', [0.2, 0.2, 0.4, 10], [0, 0, 0], '#c3c5d6']],
};

const FX = {
  skill_pulso_hierbas: { shape: 'leaf', color: '#5fd58c', count: 18, speed: 3.5, up: 3, gravity: 1, prop: 'herbs' },
  skill_somnifero_valeriana: { shape: 'shard', color: '#d9c8f5', liquid: '#b07cf2', count: 16, speed: 4, up: 4, gravity: 12, prop: 'bottle' },
  skill_raiz_atrayente: { shape: 'leaf', color: '#8f6a3a', count: 16, speed: 3, up: 0.5, gravity: 0, inward: true, prop: 'roots' },
  skill_tonico_reforzado: { shape: 'spark', color: '#f2a154', liquid: '#f2a154', count: 14, speed: 1.5, up: 4, gravity: -3, prop: 'bottle' },
  skill_ronda_suero: { shape: 'drop', color: '#54a8f2', liquid: '#54a8f2', count: 18, speed: 3.5, up: 3, gravity: 9, prop: 'drip' },
  skill_anestesia: { shape: 'spark', color: '#b07cf2', count: 14, speed: 2.5, up: 3, gravity: -2, prop: 'mask' },
  skill_camilla_magnetica: { shape: 'spark', color: '#e0555f', count: 16, speed: 3, up: 0.5, gravity: 0, inward: true, prop: 'magnet' },
  skill_desinfectante: { shape: 'drop', color: '#54a8f2', liquid: '#dcdde8', count: 20, speed: 4, up: 2, gravity: 9, prop: 'bottle' },
  skill_pulse: { shape: 'leaf', color: '#5fd58c', count: 14, speed: 3, up: 2.5, gravity: -1 },
  skill_stun: { shape: 'spark', color: '#b07cf2', count: 12, speed: 2.5, up: 3, gravity: -2 },
  skill_pull: { shape: 'leaf', color: '#8f6a3a', count: 14, speed: 3, up: 0.5, gravity: 0, inward: true },
  skill_boost: { shape: 'spark', color: '#f2a154', count: 12, speed: 1, up: 4, gravity: -3 },
  skill_purge: { shape: 'drop', color: '#54a8f2', count: 14, speed: 3.5, up: 2, gravity: 9 },
  skill_melee_stun: { shape: 'spark', color: '#f2d154', count: 12, speed: 4, up: 2, gravity: 6, prop: 'hammer' },
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
  const anim = fx.prop && fx.prop !== 'roots' ? ANIM_BY_KIND[effect.kind] || 'cast' : null;
  const duration = fx.prop ? 1300 : 900;
  const impact = fx.prop === 'roots' ? 0.25 : anim ? IMPACT_MS[anim] / duration : fx.prop ? 0.4 : 0;
  const yawAtCast = FACING.get(effect.casterId) || 0;
  const originX = anim === 'throw' ? Math.sin(yawAtCast) * 3 : 0;
  const originZ = anim === 'throw' ? Math.cos(yawAtCast) * 3 : 0;

  useEffect(() => {
    if (anim && effect.casterId) {
      HAND_ANIMS.set(effect.casterId, { id: effect.id, anim, prop: fx.prop, color: fx.liquid || fx.color, startedAt: effect.startedAt });
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
    if (propRef.current && !anim) {
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
      {fx.prop && !anim && <group ref={propRef}><PropMesh kind={fx.prop} color={fx.liquid || fx.color} /></group>}
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
  const fx = FX[effect.kind] || FX[effect.baseKind];
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
 * del mundo — así "adelante" siempre es "hacia donde estoy mirando".
 */
function FollowCamera({ myEntity, yawRef, shiftLock, onLockLost, focusId }) {
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
      if (dragging.current !== null) return;
      dragging.current = e.pointerId;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e) {
      touches.delete(e.pointerId);
      if (dragging.current === e.pointerId) dragging.current = null;
    }
    function onPointerMove(e) {
      if (document.pointerLockElement === canvas) {
        yaw.current -= e.movementX * 0.0025;
        pitch.current = Math.max(0.15, Math.min(1.4, pitch.current + e.movementY * 0.0025));
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
      pitch.current = Math.max(0.15, Math.min(1.4, pitch.current + dy * sens(e)));
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
    CAMERA_LOCK.on = Boolean(shiftLock);
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
    const dist = shiftLock ? Math.min(distance.current, 5) : distance.current;
    const horizontalRadius = Math.cos(pitch.current) * dist;
    const height = Math.sin(pitch.current) * dist;
    camera.position.set(
      smoothedTarget.current.x + rightX + Math.sin(yaw.current) * horizontalRadius,
      smoothedTarget.current.y + height,
      smoothedTarget.current.z + rightZ + Math.cos(yaw.current) * horizontalRadius
    );
    camera.lookAt(smoothedTarget.current.x + rightX, smoothedTarget.current.y, smoothedTarget.current.z + rightZ);
  });

  return null;
}

const SKILL_KEYS = ['KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyG'];

const CAMERA_LOCK = { on: false, yaw: 0, fp: false, fpId: null };

function useKeyboardInput(sendInput, yawRef, onPulse, shiftRef) {
  const keysPressed = useRef(new Set());
  const lastSent = useRef({ key: '', at: 0 });

  useEffect(() => {
    function handleKeyDown(e) {
      // Disparamos el pulso solo en el flanco de bajada (primera vez que
      // se detecta la tecla apretada), no en cada repeat del navegador —
      // si no, mantener Shift apretado mandaría curator_pulse_action sin
      // parar y el servidor lo rechazaría todas las veces salvo la
      // primera (está en cooldown de todos modos, pero no tiene sentido
      // spamear mensajes).
      const skillIndex = SKILL_KEYS.indexOf(e.code);
      if (skillIndex !== -1 && !keysPressed.current.has(e.code)) {
        onPulse?.(skillIndex === 4 ? 'melee' : skillIndex);
      }
      keysPressed.current.add(e.code);
    }
    function handleKeyUp(e) { keysPressed.current.delete(e.code); }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPulse]);

  useEffect(() => {
    const interval = setInterval(() => {
      const keys = keysPressed.current;
      // Ejes LOCALES a la intención del jugador (adelante/atrás/lateral),
      // rotados después según hacia dónde mira la cámara — así W siempre
      // avanza "hacia adelante en pantalla" en vez de "hacia +Z del mundo",
      // que es lo que hacía que moverse se sintiera desconectado de la
      // cámara libre anterior.
      let inputZ = 0, inputX = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1;
      const jump = keys.has('Space');
      const slow = keys.has('ShiftLeft') || keys.has('ShiftRight');

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
      const payload = { moveX: Math.round(moveX * 100) / 100, moveZ: Math.round(moveZ * 100) / 100, jump, slow, face };
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

const PLAT_TEX = { wall: 'plaster', partition: 'plaster', tower: 'tower', roof: 'roof', ramp: 'ramp', mezzanine: 'marble' };

function WallDecor({ p }) {
  const alongX = p.hx >= p.hz;
  const len = (alongX ? p.hx : p.hz) * 2;
  const thick = alongX ? p.hz : p.hx;
  const items = useMemo(() => {
    const out = [];
    const n = Math.floor(len / 4.5);
    for (let i = 0; i < n; i++) {
      const t = -len / 2 + (i + 0.5) * (len / n);
      for (const y of [3.2, 6.4]) {
        const seed = Math.sin((p.x * 13 + p.z * 7 + i * 3 + y) * 12.9898) * 43758.5453;
        out.push({ t, y, lit: seed - Math.floor(seed) > 0.35 });
      }
    }
    return out;
  }, [len, p.x, p.z]);
  if (len < 6) return null;
  return (
    <group position={[p.x, 0, p.z]}>
      {items.map((w, i) => [-1, 1].map((s) => (
        <mesh key={`${i}${s}`} position={alongX ? [w.t, w.y, s * (thick + 0.02)] : [s * (thick + 0.02), w.y, w.t]} rotation={alongX ? [0, s > 0 ? 0 : Math.PI, 0] : [0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <planeGeometry args={[1.6, 1.4]} />
          <meshBasicMaterial color={w.lit ? '#ffd98a' : '#1d2740'} />
        </mesh>
      )))}
      <mesh position={[0, p.h + 0.15, 0]}>
        <boxGeometry args={[alongX ? len + 0.2 : p.hx * 2 + 0.5, 0.3, alongX ? p.hz * 2 + 0.5 : len + 0.2]} />
        <meshStandardMaterial color="#d4e6f5" roughness={0.8} />
      </mesh>
    </group>
  );
}

const LAMPS = [[8, 8], [-8, 8], [8, -8], [-8, -8], [0, 30], [0, -30], [20, 20], [-20, 20], [20, -20], [-20, -20], [0, 0], [30, 12], [-30, 12], [30, -12], [-30, -12]];

function NightDecor() {
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
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" array={stars} count={stars.length / 3} itemSize={3} /></bufferGeometry>
        <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} fog={false} />
      </points>
      <mesh position={[-90, 120, -140]}>
        <sphereGeometry args={[9, 20, 14]} />
        <meshBasicMaterial color="#f3f0d8" fog={false} />
      </mesh>
      {LAMPS.map(([x, z]) => (
        <group key={`${x}_${z}`} position={[x, 0, z]}>
          <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.07, 0.09, 3.2, 6]} /><meshStandardMaterial color="#e8f1f8" /></mesh>
          <mesh position={[0, 3.3, 0]}><sphereGeometry args={[0.28, 10, 8]} /><meshBasicMaterial color="#ffe6a8" /></mesh>
        </group>
      ))}
      <pointLight position={[0, 4, 0]} intensity={7} distance={30} color="#fff3e0" />
      <pointLight position={[20, 4, 20]} intensity={5} distance={26} color="#fff3e0" />
      <pointLight position={[-20, 4, -20]} intensity={5} distance={26} color="#fff3e0" />
      <pointLight position={[-20, 4, 20]} intensity={5} distance={26} color="#fff3e0" />
      <pointLight position={[20, 4, -20]} intensity={5} distance={26} color="#fff3e0" />
    </group>
  );
}

function GateMesh({ p }) {
  const bars = Math.max(2, Math.round(p.hz * 2 / 0.6));
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, p.h / 2, 0]}>
        <boxGeometry args={[p.hx * 2, p.h, p.hz * 2]} />
        <meshBasicMaterial color="#f2a154" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {Array.from({ length: bars + 1 }, (_, i) => (
        <mesh key={i} position={[0, p.h / 2, -p.hz + (i * p.hz * 2) / bars]}>
          <boxGeometry args={[p.hx * 2 + 0.1, p.h, 0.08]} />
          <meshStandardMaterial color="#f2a154" emissive="#f2a154" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {[0.1, p.h - 0.1].map((y) => (
        <mesh key={y} position={[0, y, 0]}><boxGeometry args={[p.hx * 2 + 0.1, 0.12, p.hz * 2]} /><meshStandardMaterial color="#c97a2e" /></mesh>
      ))}
    </group>
  );
}

function Platform({ p }) {
  if (p.kind === 'gate') return <GateMesh p={p} />;
  const name = p.tex || (p.ramp ? 'ramp' : PLAT_TEX[p.kind] || 'concrete');
  const tint = p.tint || '#ffffff';
  const y0 = p.y0 || 0;
  const len = p.hx * 2;
  const tops = useMemo(() => getTexture(name, Math.max(1, Math.round(len / 3)), Math.max(1, Math.round(p.hz * 2 / 3))), [name, len, p.hz]);
  const sides = useMemo(() => getTexture(name, Math.max(1, Math.round(Math.max(len, p.hz * 2) / 3)), Math.max(1, Math.round(p.h / 3))), [name, len, p.hz, p.h]);
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
          <meshStandardMaterial color="#8fc6ea" roughness={0.7} transparent opacity={0.35} />
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

function Hitboxes({ curatorIds, entities, myPlayerId, collisionObjects, selfDamageObjects, zones, platforms, effects, opacity, cfg }) {
  return (
    <>
      {(effects || []).filter((fx) => fx.boxes && Date.now() - fx.startedAt < 900).flatMap((fx) => fx.boxes.map((b, i) => (
        <SquareFrame key={`${fx.id}_${i}`} x={b.x} z={b.z} y={entities?.[fx.casterId]?.y ?? 0} half={b.half} color="#e0555f" opacity={opacity} />
      )))}
      {(effects || []).filter((fx) => fx.radius && Date.now() - fx.startedAt < 900).map((fx) => (
        <SquareFrame key={fx.id} x={fx.x} z={fx.z} y={entities?.[fx.casterId]?.y ?? 0} half={fx.radius} color="#e0555f" opacity={opacity} />
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
          <SquareFrame x={entity.x} z={entity.z} y={entity.y + cfg.height / 2} half={cfg.half} hy={cfg.height / 2} color="#e0555f" opacity={opacity} />
          {curatorIds?.has(id) && <SquareFrame x={entity.x} z={entity.z} y={entity.y + cfg.height / 2} half={cfg.interact + cfg.half} hy={cfg.height / 2 + 1.5} color="#f2a154" opacity={opacity} />}
        </group>
      ))}
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
const MWallDecor = memo(WallDecor);
const MCollisionObject = memo(CollisionObject);
const MSelfDamageObject = memo(SelfDamageObject, (a, b) => a.position.x === b.position.x && a.position.y === b.position.y && a.position.z === b.position.z && a.near === b.near && a.active === b.active);

export default function GameScene({
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
}) {
  const yawRef = useRef(Math.PI);
  const shiftRef = useRef(false);
  shiftRef.current = Boolean(shiftLock);
  useKeyboardInput(sendInput, yawRef, onPulse, shiftRef);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const areaHalfSize = phase === 'action' ? matchHalf || MATCH_HALF_SIZE : LOBBY_HALF_SIZE;
  const myEntity = ghostMode && ghosts?.[myPlayerId] ? ghosts[myPlayerId] : entities[followId || myPlayerId];
  const curatorIds = useMemo(() => new Set(players.filter((p) => p.isAsymRole).map((p) => p.id)), [players]);
  const pits = useMemo(() => (phase === 'action' ? (platforms || []).filter((p) => p.kind === 'pit') : []), [platforms, phase]);

  return (
    <Canvas dpr={[1, coarse ? 1.25 : 1.5]} gl={{ antialias: !coarse, powerPreference: 'high-performance' }} camera={{ position: [0, 3, 7], fov: 60 }}>
      <ambientLight intensity={phase === 'action' ? 0.62 : 0.4} color={phase === 'action' ? '#cfe0ff' : '#ffffff'} />
      <directionalLight position={phase === 'action' ? [-30, 40, -45] : [8, 12, 6]} intensity={phase === 'action' ? 0.7 : 1.1} color={phase === 'action' ? '#d6e2ff' : '#ffffff'} />
      <hemisphereLight args={phase === 'action' ? ['#8fb4e8', '#4a4f66', 0.6] : ['#bcd4ff', '#8a7a68', 0.35]} />
      {phase === 'action' && <color attach="background" args={['#070b1c']} />}
      {phase === 'action' && <fog attach="fog" args={['#0a1024', 50, 140]} />}
      {phase === 'action' && <NightDecor />}

      <FollowCamera focusId={followId || myPlayerId} myEntity={myEntity} yawRef={yawRef} shiftLock={Boolean(shiftLock) && !followId} onLockLost={onShiftLockLost} />

      <MGround halfSize={areaHalfSize} themed={phase === 'action'} pits={pits} />
      {pits.map((p) => <MPit key={p.id} p={p} pits={pits} />)}
      {phase !== 'action' && <MLobbyDecor />}

      {phase === 'action' && (effects || []).map((effect) => <SkillEffect key={effect.id} effect={effect} />)}

      {phase === 'action' && (zones || []).map((zone) => <ZoneDisc key={zone.id} zone={zone} platforms={platforms} ghost={Boolean(playerById.get(myPlayerId)?.isAsymRole)} />)}

      {hitboxes?.on && (
        <Hitboxes
          curatorIds={curatorIds}
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

      {(platforms || []).filter((p) => p.kind !== 'pit').map((p) => <MPlatform key={p.id} p={p} />)}
      {(platforms || []).filter((p) => p.kind === 'wall').map((p) => <MWallDecor key={`d${p.id}`} p={p} />)}

      {phase === 'action' &&
        (collisionObjects || []).map((obj) => <MCollisionObject key={obj.id} obj={obj} />)}

      {phase === 'action' &&
        Object.entries(selfDamageObjects || {}).map(([objectId, pos]) => (
          <group
            key={objectId}
            onClick={(e) => {
              e.stopPropagation();
              sendAction('self_damage_action', { objectId });
            }}
          >
            <MSelfDamageObject position={pos} near={Boolean(myEntity) && Math.abs(myEntity.x - pos.x) < 2.2 && Math.abs(myEntity.z - pos.z) < 2.2 && Math.abs((myEntity.y || 0) - pos.y) < 2.5} active={sdActiveId === objectId} />
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
            onClick={(e) => {
              if (phase !== 'action' || playerId === myPlayerId) return;
              const myPlayer = playerById.get(myPlayerId);
              if (!myPlayer?.isAsymRole) return;
              e.stopPropagation();
              sendAction('cure_action', { targetPlayerId: playerId });
            }}
          >
            <PlayerCapsule
              playerId={playerId}
              entityState={entityState}
              color={color}
              isMe={playerId === myPlayerId}
              stunned={(stunnedIds || []).includes(playerId)}
              ragdoll={(ragdollIds || []).includes(playerId)}
              cosmetics={player.cosmetics}
            />
          </group>
        );
      })}

    </Canvas>
  );
}
