'use client';
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CosmeticPieces } from './GameScene';

const PATIENT = '#5fd58c';
const CURATOR = '#f2a154';
const SKIN = '#f2d27a';
const PANTS = '#3a3d52';

function Fighter({ color, side, cosmetics }) {
  const root = useRef();
  const armL = useRef();
  const armR = useRef();
  const legL = useRef();
  const legR = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const lunge = Math.max(0, Math.sin(t * 5 + (side > 0 ? 0 : Math.PI / 2)));
    if (root.current) {
      root.current.position.x = side * (1.6 - lunge * 0.5);
      root.current.position.y = Math.abs(Math.sin(t * 6)) * 0.08;
      root.current.rotation.z = -side * lunge * 0.1;
    }
    const raise = -1.35 - lunge * 0.5;
    if (armL.current) armL.current.rotation.x = raise + Math.sin(t * 9) * 0.1;
    if (armR.current) armR.current.rotation.x = raise - Math.sin(t * 9) * 0.1;
    if (legL.current) legL.current.rotation.x = Math.sin(t * 6) * 0.35;
    if (legR.current) legR.current.rotation.x = -Math.sin(t * 6) * 0.35;
  });
  return (
    <group ref={root} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
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
      <group ref={armL} position={[-0.54, 1.44, 0]}><mesh position={[0, -0.36, 0]}><boxGeometry args={[0.36, 0.72, 0.36]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh></group>
      <group ref={armR} position={[0.54, 1.44, 0]}><mesh position={[0, -0.36, 0]}><boxGeometry args={[0.36, 0.72, 0.36]} /><meshStandardMaterial color={SKIN} roughness={0.6} /></mesh></group>
      <group ref={legL} position={[-0.18, 0.72, 0]}><mesh position={[0, -0.36, 0]}><boxGeometry args={[0.36, 0.72, 0.36]} /><meshStandardMaterial color={PANTS} roughness={0.6} /></mesh></group>
      <group ref={legR} position={[0.18, 0.72, 0]}><mesh position={[0, -0.36, 0]}><boxGeometry args={[0.36, 0.72, 0.36]} /><meshStandardMaterial color={PANTS} roughness={0.6} /></mesh></group>
    </group>
  );
}

function Spark() {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!ref.current) return;
    const s = 0.5 + Math.abs(Math.sin(t * 5)) * 0.7;
    ref.current.scale.setScalar(s);
    ref.current.rotation.z = t * 6;
    ref.current.rotation.y = t * 4;
  });
  return (
    <mesh ref={ref} position={[0, 1.2, 0.4]}>
      <octahedronGeometry args={[0.35, 0]} />
      <meshBasicMaterial color="#ffe27a" />
    </mesh>
  );
}

const LINES = ['LAST', 'MORON', 'STANDING'];
const TINTS = ['#ffd166', '#ff5d6c', '#5fd58c'];

const GIMMICK_TEXT = {
  adrenalina: 'Adrenalina: velocidad extra',
  reflejos: 'Reflejos: recargas más rápidas',
  escudo: 'Escudo: las curas valen la mitad',
  codicia: 'Codicia: Desgracias x2',
};

export default function LmsIntro({ patientCosmetics, curatorCosmetics, gimmick, survivorName }) {
  return (
    <div translate="no" style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none', overflow: 'hidden', animation: 'lmsFade 5.5s forwards' }}>
      <style>{`
@keyframes lmsFade{0%{opacity:0}8%{opacity:1}85%{opacity:1}100%{opacity:0}}
@keyframes lmsSlam{0%{transform:translateY(-140px) scale(3) rotate(var(--r));opacity:0}55%{transform:translateY(8px) scale(0.94) rotate(var(--r));opacity:1}75%{transform:translateY(-4px) scale(1.04) rotate(var(--r))}100%{transform:translateY(0) scale(1) rotate(var(--r))}}
@keyframes lmsShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-3px,2px)}40%{transform:translate(3px,-2px)}60%{transform:translate(-2px,-3px)}80%{transform:translate(2px,3px)}}
@keyframes lmsFlash{0%{opacity:.85}100%{opacity:0}}
`}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(10,6,20,0.55) 0, rgba(4,2,10,0.88) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: '#fff', animation: 'lmsFlash .5s forwards' }} />
      <div style={{ position: 'absolute', top: '5%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'lmsShake .35s 6' }}>
        {LINES.map((word, li) => (
          <div key={word} style={{ display: 'flex', justifyContent: 'center', lineHeight: 0.9 }}>
            {word.split('').map((ch, i) => {
              const r = ((i * 7 + li * 5) % 9) - 4;
              return (
                <span
                  key={i}
                  style={{
                    '--r': `${r * 2.2}deg`,
                    display: 'inline-block',
                    fontFamily: 'Impact, "Arial Black", sans-serif',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    fontSize: li === 1 ? 'min(18vw, 108px)' : 'min(13vw, 78px)',
                    color: TINTS[li],
                    WebkitTextStroke: '3px #12131a',
                    textShadow: '0 5px 0 #12131a, 0 10px 0 rgba(0,0,0,0.5), 0 0 28px ' + TINTS[li],
                    letterSpacing: 2,
                    transform: `rotate(${r * 2.2}deg)`,
                    animation: `lmsSlam .6s ${li * 0.35 + i * 0.05}s both cubic-bezier(.2,1.4,.4,1)`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      {gimmick && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '45%', textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 'min(5vw, 22px)', textShadow: '0 2px 0 #12131a, 0 0 14px #ffd166', animation: 'lmsSlam .5s 1.2s both' }}>
          {survivorName ? <span translate="no">{survivorName}: </span> : null}{GIMMICK_TEXT[gimmick]}
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' }}>
        <Canvas camera={{ position: [0, 1.0, 6.4], fov: 38 }} gl={{ alpha: true }} style={{ background: 'transparent' }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 5, 6]} intensity={1.3} />
          <pointLight position={[0, 1, 2]} intensity={2} color="#ffd166" />
          <group position={[0, -0.35, 0]}>
            <Fighter color={PATIENT} side={-1} cosmetics={patientCosmetics} />
            <Fighter color={CURATOR} side={1} cosmetics={curatorCosmetics} />
            <Spark />
          </group>
        </Canvas>
      </div>
    </div>
  );
}
