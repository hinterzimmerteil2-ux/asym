'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BoxGeometry } from 'three';

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

function useKeyboardInput(sendInput) {
  const keysPressed = useRef(new Set());

  useEffect(() => {
    function handleKeyDown(e) { keysPressed.current.add(e.code); }
    function handleKeyUp(e) { keysPressed.current.delete(e.code); }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const keys = keysPressed.current;
      let moveX = 0, moveZ = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) moveZ -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) moveZ += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) moveX += 1;
      const jump = keys.has('Space');
      if (moveX !== 0 && moveZ !== 0) {
        const norm = Math.SQRT1_2;
        moveX *= norm;
        moveZ *= norm;
      }
      sendInput({ moveX, moveZ, jump });
    }, 50);
    return () => clearInterval(interval);
  }, [sendInput]);
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
}) {
  useKeyboardInput(sendInput);

  const playerById = new Map(players.map((p) => [p.id, p]));
  const areaHalfSize = phase === 'action' ? MATCH_HALF_SIZE : LOBBY_HALF_SIZE;

  return (
    <Canvas shadows camera={{ position: [12, 10, 12], fov: 50 }}>
      <ambientLight intensity={phase === 'action' ? 0.5 : 0.4} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />

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

      <OrbitControls
        makeDefault
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={4}
        maxDistance={areaHalfSize * 2}
      />
    </Canvas>
  );
}
