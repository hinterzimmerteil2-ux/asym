'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BoxGeometry, EdgesGeometry, Vector3, TextureLoader, DoubleSide, SRGBColorSpace } from 'three';

const LOBBY_HALF_SIZE = 15;
const MATCH_HALF_SIZE = 30;

const COLOR_SELF_DAMAGE_OBJECT = '#e0555f';
const COLOR_CURADOR = '#f2a154';
const COLOR_PACIENTE = '#5fd58c';
const COLOR_UNASSIGNED = '#8a8da3';

const COLOR_FLOOR_MATCH = '#e8e4d8';
const COLOR_METAL = '#8a8674';
const COLOR_WALL_TINT = '#3d4a42';
const COLOR_EMERGENCY_LIGHT = '#5468ff';

const FACING = new Map();
const HAND_ANIMS = new Map();
const ANIM_DURATION = { swing: 650, consume: 950, throw: 750, cast: 850 };
const IMPACT_MS = { swing: 260, consume: 560, throw: 340, cast: 380 };
const ANIM_BY_KIND = {
  skill_melee_stun: 'swing',
  card_tajo_carmesi: 'swing',
  card_red_mist: 'swing',
  card_tropiezo: 'swing',
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

function PlayerCapsule({ playerId, entityState, color, isMe, stunned, ragdoll }) {
  const bodyRef = useRef();
  const lastPos = useRef([entityState.x, entityState.z]);
  const yaw = useRef(0);
  const [held, setHeld] = useState(null);
  const heldId = useRef(null);
  const groupRef = useRef();
  const rag = useRef({ on: false });
  const limbRefs = useRef([]);
  const targetPos = useRef([entityState.x, entityState.y, entityState.z]);

  useEffect(() => {
    targetPos.current = [entityState.x, entityState.y, entityState.z];
  }, [entityState.x, entityState.y, entityState.z]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const mx = entityState.x - lastPos.current[0];
    const mz = entityState.z - lastPos.current[1];
    if (Math.abs(mx) + Math.abs(mz) > 0.01) {
      const target = Math.atan2(mx, mz);
      let diff = target - yaw.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      yaw.current += diff * Math.min(1, delta * 14);
      lastPos.current = [entityState.x, entityState.z];
    }
    FACING.set(playerId, yaw.current);
    if (bodyRef.current) {
      const body = bodyRef.current;
      const rg = rag.current;
      const now = Date.now();
      const sr = entityState.rag;
      if (ragdoll && sr) {
        if (!rg.on) {
          rg.on = true;
          rg.rx = sr.x; rg.ry = sr.y; rg.rz = sr.z;
        }
        const follow = Math.min(1, delta * 20);
        rg.rx += (sr.x - rg.rx) * follow;
        rg.ry += (sr.y - rg.ry) * follow;
        rg.rz += (sr.z - rg.rz) * follow;
        const k = sr.t;
        body.rotation.set(rg.rx, rg.ry, rg.rz);
        const bounce = Math.abs(Math.sin(k * 7)) * 0.5 * Math.exp(-k * 1.4);
        body.position.y += (0.45 + bounce - body.position.y) * Math.min(1, delta * 14);
        limbRefs.current.forEach((limb, i) => {
          if (!limb) return;
          limb.visible = true;
          const amp = 0.6 + 0.9 * Math.exp(-k * 0.5);
          limb.rotation.z = Math.sin(k * 11 + i * 1.7) * amp * (i % 2 ? 1 : -1);
          limb.rotation.x = Math.cos(k * 9 + i * 2.3) * amp * 0.6;
        });
      } else {
        rg.on = false;
        const rt = Math.min(1, delta * 8);
        body.rotation.set(0, yaw.current, 0);
        body.position.y += (0 - body.position.y) * rt;
        limbRefs.current.forEach((limb) => { if (limb) limb.visible = false; });
      }
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
    const t = Math.min(1, delta * 12);
    groupRef.current.position.x += (targetPos.current[0] - groupRef.current.position.x) * t;
    groupRef.current.position.y += (targetPos.current[1] - groupRef.current.position.y) * t;
    groupRef.current.position.z += (targetPos.current[2] - groupRef.current.position.z) * t;
  });

  return (
    <group ref={groupRef} position={targetPos.current}>
      <group ref={bodyRef}>
        <mesh castShadow position={[0, 0.9, 0]}>
          <capsuleGeometry args={[0.4, 1.1, 4, 12]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>
        <mesh position={[0, 1.45, 0.36]}>
          <boxGeometry args={[0.3, 0.12, 0.1]} />
          <meshStandardMaterial color="#12131a" />
        </mesh>
        <mesh position={[0.5, 1.0, 0.3]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
        {[[-0.55, 1.1], [0.55, 1.1], [-0.22, 0.2], [0.22, 0.2]].map(([lx, ly], i) => (
          <group key={i} ref={(el) => { limbRefs.current[i] = el; if (el && !rag.current.on) el.visible = false; }} position={[lx, ly, 0]}>
            <mesh position={[0, -0.25, 0]}>
              <capsuleGeometry args={[0.09, 0.4, 4, 8]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
          </group>
        ))}
        <HeldItem held={held} />
      </group>
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

function Ground({ halfSize, themed }) {
  const floorColor = themed ? COLOR_FLOOR_MATCH : '#1b1d29';
  const gridColorMajor = themed ? '#c9c5b8' : '#3a3d52';
  const gridColorMinor = themed ? '#d8d4c8' : '#2a2d3d';
  const borderColor = themed ? COLOR_EMERGENCY_LIGHT : '#5468ff';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[halfSize * 2, halfSize * 2]} />
        <meshStandardMaterial color={floorColor} roughness={themed ? 0.75 : 0.9} />
      </mesh>
      <gridHelper
        args={[halfSize * 2, Math.round(halfSize * 1.33), gridColorMajor, gridColorMinor]}
        position={[0, 0.01, 0]}
      />
      <lineSegments position={[0, 0.02, 0]}>
        <edgesGeometry args={[new BoxGeometry(halfSize * 2, 0.01, halfSize * 2)]} />
        <lineBasicMaterial color={borderColor} />
      </lineSegments>
    </group>
  );
}

function SelfDamageObject({ position }) {
  const groupRef = useRef();
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
  });

  return (
    <group ref={groupRef} position={targetPos.current}>
      <mesh position={[0, 0.4, 0]} castShadow>
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
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow rotation={[0, 0.15, 0]}>
            <boxGeometry args={[radius * 1.8, 0.15, radius * 0.9]} />
            <meshStandardMaterial color={COLOR_METAL} roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.3, 6]} />
            <meshStandardMaterial color="#2a2d3d" roughness={0.8} />
          </mesh>
        </group>
      );
    case 'shelf':
      return (
        <group rotation={[0, -0.1, 0]}>
          <mesh position={[0, radius * 0.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[radius * 1.2, radius * 1.8, radius * 0.6]} />
            <meshStandardMaterial color={COLOR_METAL} roughness={0.7} metalness={0.3} />
          </mesh>
          {[0.4, 0.9, 1.4].map((h, i) => (
            <mesh key={i} position={[0, h, radius * 0.31]} castShadow>
              <boxGeometry args={[radius * 1.15, 0.04, 0.05]} />
              <meshStandardMaterial color="#12131a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      );
    case 'cart':
      return (
        <group rotation={[0, 0.3, 0]}>
          <mesh position={[0, radius * 0.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[radius * 1.1, radius * 1.6, radius * 0.7]} />
            <meshStandardMaterial color={COLOR_METAL} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, radius * 1.75, 0]} castShadow>
            <boxGeometry args={[radius * 1.2, 0.06, radius * 0.8]} />
            <meshStandardMaterial color="#c9c5b8" roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
      );
    case 'pillar':
    default:
      return (
        <mesh position={[0, radius * 1.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 0.6, radius * 0.7, radius * 3, 8]} />
          <meshStandardMaterial color={COLOR_WALL_TINT} roughness={0.85} />
        </mesh>
      );
  }
}

const ZONE_COLORS = { rimac: '#6b8f3a', puddle: '#5fd58c', trap: '#f2d154' };

function BananaMesh({ color, spotted, ghost }) {
  return (
    <group scale={[2.4, 2.4, 2.4]}>
      {[-0.22, 0, 0.22].map((x, i) => (
        <mesh key={x} position={[x, 0.1 + (i === 1 ? 0.05 : 0), 0]} rotation={[Math.PI / 2, 0, (i - 1) * 0.5 + 1.57]}>
          <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
          <meshStandardMaterial color={color} transparent={Boolean(ghost)} opacity={ghost ? 0.35 : 1} />
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

function ZoneDisc({ zone, ghost }) {
  const color = ZONE_COLORS[zone.kind] || '#ffffff';
  const isTrap = zone.kind === 'trap';
  const bananaColor = zone.cardId === 'platano_podrido' ? '#7a6a2a' : '#f2d154';
  return (
    <group position={[zone.x, 0, zone.z]}>
      {isTrap ? (
        <SquareFrame x={0} z={0} half={zone.radius} color={color} opacity={zone.armed ? 0.6 : 0.25} />
      ) : (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[zone.radius * 2, zone.radius * 2]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}
      {isTrap && <BananaMesh color={bananaColor} spotted={false} ghost={ghost} />}
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
  card_rodar: { shape: 'smoke', color: '#cfd2e0', count: 8, speed: 2, up: 0.5, gravity: 0, prop: 'boot' },
  card_canon_humano: { shape: 'smoke', color: '#cfd2e0', count: 10, speed: 2.5, up: 0.8, gravity: 0, prop: 'can' },
  card_humo_yodo: { shape: 'smoke', color: '#f2a154', count: 12, speed: 2.5, up: 1, gravity: 0, prop: 'smokepot' },
  card_tropiezo: { shape: 'spark', color: '#f2d154', count: 10, speed: 3, up: 3, gravity: 8, prop: 'cone' },
  card_adrenalina: { shape: 'spark', color: '#e0555f', count: 10, speed: 1.5, up: 4, gravity: -2, prop: 'heart' },
  card_chicharron: { shape: 'crumb', color: '#c98a3a', count: 12, speed: 2, up: 3, gravity: 9, prop: 'img_chicharron' },
  card_goyslop: { shape: 'crumb', color: '#8f8f4a', count: 16, speed: 2.5, up: 3, gravity: 9, prop: 'slop' },
  card_aji_picante: { shape: 'crumb', color: '#e0555f', count: 12, speed: 2, up: 3, gravity: 9, prop: 'chili' },
  card_sopa_hirviendo: { shape: 'drop', color: '#f2a154', count: 14, speed: 3, up: 3.5, gravity: 9, prop: 'pot' },
  card_cascara_platano: { shape: 'leaf', color: '#f2d154', count: 6, speed: 2, up: 3, gravity: 8, prop: 'banana' },
  card_platano_podrido: { shape: 'leaf', color: '#7a6a2a', count: 8, speed: 2, up: 3, gravity: 8, prop: 'rotten' },
  card_agua_rimac: { shape: 'shard', color: '#9fe6d0', liquid: '#6b8f3a', count: 16, speed: 4, up: 4, gravity: 12, prop: 'img_agua_rimac' },
  card_rimac_sin_filtrar: { shape: 'shard', color: '#9fe6d0', liquid: '#5f7f20', count: 22, speed: 5, up: 5, gravity: 12, prop: 'bottle' },
  card_red_mist: { shape: 'drop', color: '#e0555f', count: 20, speed: 5, up: 3, gravity: 9, prop: 'img_red_mist' },
  card_tajo_carmesi: { shape: 'drop', color: '#b57cff', count: 10, speed: 4, up: 2, gravity: 9, prop: 'img_tajo_carmesi' },
  card_regalo_envenenado: { shape: 'leaf', color: '#b07cf2', count: 14, speed: 3, up: 3, gravity: 3, prop: 'gift' },
  card_grito_animo: { shape: 'spark', color: '#54d1f2', count: 14, speed: 3, up: 3, gravity: 2, prop: 'horn' },
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
function FollowCamera({ myEntity, yawRef }) {
  const { camera, gl } = useThree();
  const yaw = useRef(Math.PI);
  const pitch = useRef(0.5);
  const distance = useRef(7);
  const dragging = useRef(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const smoothedTarget = useRef(new Vector3(0, 1, 0));

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.touchAction = 'none';

    const sens = e => (e.pointerType === 'touch' ? 0.009 : 0.006);
    function onPointerDown(e) {
      if (dragging.current !== null) return;
      dragging.current = e.pointerId;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e) { if (dragging.current === e.pointerId) dragging.current = null; }
    function onPointerMove(e) {
      if (dragging.current !== e.pointerId) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * sens(e);
      pitch.current = Math.max(0.15, Math.min(1.4, pitch.current - dy * sens(e)));
    }
    function onWheel(e) {
      e.preventDefault();
      distance.current = Math.max(2.5, Math.min(14, distance.current + e.deltaY * 0.01));
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!myEntity) return;
    yawRef.current = yaw.current;

    const t = Math.min(1, delta * 10);
    smoothedTarget.current.x += (myEntity.x - smoothedTarget.current.x) * t;
    smoothedTarget.current.y += (myEntity.y + 1.1 - smoothedTarget.current.y) * t;
    smoothedTarget.current.z += (myEntity.z - smoothedTarget.current.z) * t;

    const horizontalRadius = Math.cos(pitch.current) * distance.current;
    const height = Math.sin(pitch.current) * distance.current;
    camera.position.set(
      smoothedTarget.current.x + Math.sin(yaw.current) * horizontalRadius,
      smoothedTarget.current.y + height,
      smoothedTarget.current.z + Math.cos(yaw.current) * horizontalRadius
    );
    camera.lookAt(smoothedTarget.current);
  });

  return null;
}

const SKILL_KEYS = ['KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyG'];

function useKeyboardInput(sendInput, yawRef, onPulse) {
  const keysPressed = useRef(new Set());

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

      sendInput({ moveX, moveZ, jump, slow });
    }, 50);
    return () => clearInterval(interval);
  }, [sendInput, yawRef]);
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
        <meshBasicMaterial color={color} transparent opacity={0.14} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Platform({ p }) {
  const color = p.ramp ? '#5b6270' : '#464c59';
  if (!p.ramp) {
    return (
      <mesh position={[p.x, p.h / 2, p.z]} castShadow receiveShadow>
        <boxGeometry args={[p.hx * 2, p.h, p.hz * 2]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    );
  }
  const len = p.hx * 2;
  const angle = Math.atan2(p.h, len) * (p.ramp === '+x' ? 1 : -1);
  return (
    <mesh position={[p.x, p.h / 2, p.z]} rotation={[0, 0, angle]} castShadow receiveShadow>
      <boxGeometry args={[Math.hypot(len, p.h), 0.2, p.hz * 2]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}

function Hitboxes({ entities, myPlayerId, collisionObjects, selfDamageObjects, zones, platforms, effects, opacity, cfg }) {
  return (
    <>
      {(effects || []).filter((fx) => fx.boxes && Date.now() - fx.startedAt < 900).flatMap((fx) => fx.boxes.map((b, i) => (
        <SquareFrame key={`${fx.id}_${i}`} x={b.x} z={b.z} y={entities?.[fx.casterId]?.y ?? 0} half={b.half} color="#e0555f" opacity={opacity} />
      )))}
      {(effects || []).filter((fx) => fx.radius && Date.now() - fx.startedAt < 900).map((fx) => (
        <SquareFrame key={fx.id} x={fx.x} z={fx.z} y={entities?.[fx.casterId]?.y ?? 0} half={fx.radius} color="#e0555f" opacity={opacity} />
      ))}
      {(platforms || []).map((p) => (
        <SquareFrame key={p.id} x={p.x} z={p.z} y={p.h / 2} half={p.hx} hy={p.h / 2} hz={p.hz} color="#e0555f" opacity={opacity} />
      ))}
      {Object.entries(entities || {}).map(([id, entity]) => (
        <group key={id}>
          <SquareFrame x={entity.x} z={entity.z} y={entity.y + cfg.height / 2} half={cfg.half} hy={cfg.height / 2} color="#e0555f" opacity={opacity} />
          {id === myPlayerId && <SquareFrame x={entity.x} z={entity.z} y={entity.y} half={cfg.interact} color="#e0555f" opacity={opacity * 0.6} />}
        </group>
      ))}
      {(collisionObjects || []).map((obj) => (
        <SquareFrame key={obj.id} x={obj.x} z={obj.z} y={(obj.height || 1.2) / 2} half={obj.radius} hy={(obj.height || 1.2) / 2} color="#e0555f" opacity={opacity} />
      ))}
      {Object.entries(selfDamageObjects || {}).map(([id, pos]) => (
        <SquareFrame key={id} x={pos.x} z={pos.z} half={cfg.interact} color="#e0555f" opacity={opacity} />
      ))}
      {(zones || []).map((zone) => (
        <SquareFrame key={zone.id} x={zone.x} z={zone.z} half={zone.radius} color="#e0555f" opacity={opacity} />
      ))}
    </>
  );
}

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
  sendInput,
  sendAction,
  onPulse,
  hitboxes,
  hitboxCfg,
  followId,
}) {
  const yawRef = useRef(Math.PI);
  useKeyboardInput(sendInput, yawRef, onPulse);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const areaHalfSize = phase === 'action' ? MATCH_HALF_SIZE : LOBBY_HALF_SIZE;
  const myEntity = entities[followId || myPlayerId];

  return (
    <Canvas shadows={!coarse} dpr={[1, coarse ? 1.5 : 2]} gl={{ antialias: !coarse, powerPreference: 'high-performance' }} camera={{ position: [0, 3, 7], fov: 60 }}>
      <ambientLight intensity={phase === 'action' ? 0.5 : 0.4} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow={!coarse} shadow-mapSize={[1024, 1024]} />

      <FollowCamera myEntity={myEntity} yawRef={yawRef} />

      <Ground halfSize={areaHalfSize} themed={phase === 'action'} />

      {phase === 'action' && (effects || []).map((effect) => <SkillEffect key={effect.id} effect={effect} />)}

      {phase === 'action' && (zones || []).map((zone) => <ZoneDisc key={zone.id} zone={zone} ghost={Boolean(playerById.get(myPlayerId)?.isAsymRole)} />)}

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

      {phase === 'action' && (platforms || []).map((p) => <Platform key={p.id} p={p} />)}

      {phase === 'action' &&
        (collisionObjects || []).map((obj) => <CollisionObject key={obj.id} obj={obj} />)}

      {phase === 'action' &&
        Object.entries(selfDamageObjects || {}).map(([objectId, pos]) => (
          <group
            key={objectId}
            onClick={(e) => {
              e.stopPropagation();
              sendAction('self_damage_action', { objectId });
            }}
          >
            <SelfDamageObject position={pos} />
          </group>
        ))}

      {Object.entries(entities).map(([playerId, entityState]) => {
        const player = playerById.get(playerId);
        if (!player) return null;
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
            />
          </group>
        );
      })}

    </Canvas>
  );
}
