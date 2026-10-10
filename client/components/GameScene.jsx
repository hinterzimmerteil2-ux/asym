'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BoxGeometry, Vector3 } from 'three';

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

function PlayerCapsule({ entityState, color, isMe }) {
  const groupRef = useRef();
  const targetPos = useRef([entityState.x, entityState.y, entityState.z]);

  useEffect(() => {
    targetPos.current = [entityState.x, entityState.y, entityState.z];
  }, [entityState.x, entityState.y, entityState.z]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const t = Math.min(1, delta * 12);
    groupRef.current.position.x += (targetPos.current[0] - groupRef.current.position.x) * t;
    groupRef.current.position.y += (targetPos.current[1] - groupRef.current.position.y) * t;
    groupRef.current.position.z += (targetPos.current[2] - groupRef.current.position.z) * t;
  });

  return (
    <group ref={groupRef} position={targetPos.current}>
      <mesh castShadow position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.4, 1.1, 4, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
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
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const smoothedTarget = useRef(new Vector3(0, 1, 0));

  useEffect(() => {
    const canvas = gl.domElement;

    function onPointerDown(e) {
      dragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp() { dragging.current = false; }
    function onPointerMove(e) {
      if (!dragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * 0.006;
      pitch.current = Math.max(0.15, Math.min(1.4, pitch.current - dy * 0.006));
    }
    function onWheel(e) {
      e.preventDefault();
      distance.current = Math.max(2.5, Math.min(14, distance.current + e.deltaY * 0.01));
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
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

function useKeyboardInput(sendInput, yawRef, onDash) {
  const keysPressed = useRef(new Set());

  useEffect(() => {
    function handleKeyDown(e) {
      // Disparamos el dash solo en el flanco de bajada (primera vez que se
      // detecta la tecla apretada), no en cada repeat del navegador — si
      // no, mantener Shift apretado mandaría curator_dash_action sin
      // parar y el servidor lo rechazaría todas las veces salvo la
      // primera (está en cooldown de todos modos, pero no tiene sentido
      // spamear mensajes).
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !keysPressed.current.has(e.code)) {
        onDash?.();
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
  }, [onDash]);

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

      sendInput({ moveX, moveZ, jump });
    }, 50);
    return () => clearInterval(interval);
  }, [sendInput, yawRef]);
}

export default function GameScene({
  entities,
  players,
  myPlayerId,
  phase,
  selfDamageObjects,
  collisionObjects,
  sendInput,
  sendAction,
  onDash,
}) {
  const yawRef = useRef(Math.PI);
  useKeyboardInput(sendInput, yawRef, onDash);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const areaHalfSize = phase === 'action' ? MATCH_HALF_SIZE : LOBBY_HALF_SIZE;
  const myEntity = entities[myPlayerId];

  return (
    <Canvas shadows camera={{ position: [0, 3, 7], fov: 60 }}>
      <ambientLight intensity={phase === 'action' ? 0.5 : 0.4} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />

      <FollowCamera myEntity={myEntity} yawRef={yawRef} />

      <Ground halfSize={areaHalfSize} themed={phase === 'action'} />

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
            <PlayerCapsule entityState={entityState} color={color} isMe={playerId === myPlayerId} />
          </group>
        );
      })}

    </Canvas>
  );
}
