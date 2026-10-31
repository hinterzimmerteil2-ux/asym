'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { getTexture } from '../../lib/textures';
import { publishCommunityMap } from '../../lib/community';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

// Tamaño en píxeles del lienzo cuadrado del editor — el área jugable
// (MATCH_AREA, halfSize=30 por defecto en GameMap.js) se dibuja a esta
// escala, y cada punto que se arrastra ahí adentro se convierte a
// fracción (-1 a 1) dividiendo por la mitad del lienzo. El halfSize real
// del mapa NO afecta el editor en sí — el editor siempre trabaja en
// fracciones, que es justamente el punto: el layout resultante funciona
// para cualquier tamaño de área que se use después.
const CANVAS_SIZE = 560;
const CANVAS_HALF = CANVAS_SIZE / 2;

const TEXTURES = [['', 'Por defecto'], ['marble', 'Mármol'], ['tile', 'Azulejo'], ['plaster', 'Yeso celeste'], ['tower', 'Paneles'], ['roof', 'Teja celeste'], ['ramp', 'Franjas'], ['concrete', 'Concreto'], ['brick', 'Ladrillo'], ['wood', 'Madera'], ['metal', 'Metal']];
const TEX_COLORS = { marble: '#e7eef5', tile: '#eef3f8', plaster: '#8fc6ea', tower: '#b9dcf3', roof: '#9fd0f0', ramp: '#6fb6e8', concrete: '#c8d6e2', brick: '#d8dfe6', wood: '#c99a62', metal: '#b4c3d0' };
const COLLISION_TYPES = ['gurney', 'shelf', 'cart', 'pillar', 'crate', 'desk', 'plant', 'tank'];
const REF_HALF = 30;
const MAP_HALF = 60;
const OBJECT_HEIGHTS = { gurney: 0.9, shelf: 2.2, cart: 1, pillar: 3, crate: 1.1, desk: 1, plant: 1.4, tank: 2 };

const DEFAULT_TEX = { wall: 'plaster', partition: 'plaster', tower: 'tower', roof: 'roof', mezzanine: 'marble' };

function PlatformMesh({ p, onPick, selected, MAP_HALF }) {
  const hx = p.hxFrac * REF_HALF;
  const hz = p.hzFrac * REF_HALF;
  const x = p.xFrac * MAP_HALF;
  const z = p.zFrac * MAP_HALF;
  const y0 = p.y0 || 0;
  const texName = p.tex || (p.ramp ? 'ramp' : DEFAULT_TEX[p.kind] || 'concrete');
  const map = useMemo(() => getTexture(texName, Math.max(1, Math.round(hx * 2 / 3)), Math.max(1, Math.round(Math.max(hz * 2, p.h) / 3))), [texName, hx, hz, p.h]);
  const pick = onPick ? (e) => { e.stopPropagation(); onPick(p.id); } : undefined;
  const color = selected ? '#facc15' : p.tint || '#ffffff';
  if (p.kind === 'pit') {
    if (!p.ramp) {
      return (
        <mesh position={[x, -p.h + 0.05, z]} onClick={pick}>
          <boxGeometry args={[hx * 2, 0.1, hz * 2]} />
          <meshStandardMaterial color={selected ? '#facc15' : '#3b6ea5'} />
        </mesh>
      );
    }
    const len = hx * 2;
    const ang = Math.atan2(p.h, len) * (p.ramp === '+x' ? 1 : -1);
    return (
      <mesh position={[x, -p.h / 2, z]} rotation={[0, 0, ang]} onClick={pick}>
        <boxGeometry args={[Math.hypot(len, p.h), 0.1, hz * 2]} />
        <meshStandardMaterial color={selected ? '#facc15' : '#5b8fb0'} />
      </mesh>
    );
  }
  if (p.kind === 'gate') {
    return (
      <mesh position={[x, y0 + p.h / 2, z]} onClick={pick}>
        <boxGeometry args={[hx * 2, p.h, hz * 2]} />
        <meshStandardMaterial color={selected ? '#facc15' : '#f2a154'} transparent opacity={0.6} />
      </mesh>
    );
  }
  if (p.kind === 'mezzanine') {
    return (
      <mesh position={[x, y0 + p.h - 0.2, z]} onClick={pick}>
        <boxGeometry args={[hx * 2, 0.4, hz * 2]} />
        <meshStandardMaterial map={map} color={color} />
      </mesh>
    );
  }
  if (!p.ramp) {
    return (
      <mesh position={[x, y0 + p.h / 2, z]} onClick={pick}>
        <boxGeometry args={[hx * 2, p.h, hz * 2]} />
        <meshStandardMaterial map={map} color={color} />
      </mesh>
    );
  }
  const len = hx * 2;
  const angle = Math.atan2(p.h, len) * (p.ramp === '+x' ? 1 : -1);
  return (
    <mesh position={[x, y0 + p.h / 2, z]} rotation={[0, 0, angle]} onClick={pick}>
      <boxGeometry args={[Math.hypot(len, p.h), 0.3, hz * 2]} />
      <meshStandardMaterial map={map} color={color} />
    </mesh>
  );
}

function Preview3D({ platforms, collisionObjects, selfDamageObjects, onGround, onPick, selectedId, MAP_HALF }) {
  return (
    <Canvas camera={{ position: [0, 70, 80], fov: 50 }} style={{ width: CANVAS_SIZE, height: 380, background: '#0b0d14', borderRadius: 8 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[30, 60, 20]} intensity={0.9} />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { if (e.delta > 4) return; e.stopPropagation(); onGround(e.point.x / MAP_HALF, e.point.z / MAP_HALF); }}>
        <planeGeometry args={[MAP_HALF * 2, MAP_HALF * 2]} />
        <meshStandardMaterial color="#d9d5c7" />
      </mesh>
      <gridHelper args={[MAP_HALF * 2, 24, '#5468ff', '#b8b4a6']} position={[0, 0.02, 0]} />
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.8, 0.8, 0.6, 12]} /><meshBasicMaterial color="#5468ff" /></mesh>
      {platforms.map((p) => <PlatformMesh key={p.id} p={p} onPick={onPick} selected={p.id === selectedId} MAP_HALF={MAP_HALF} />)}
      {collisionObjects.map((o) => {
        const h = OBJECT_HEIGHTS[o.type] || 1.2;
        return (
          <mesh key={o.id} position={[o.xFrac * MAP_HALF, h / 2, o.zFrac * MAP_HALF]}>
            <cylinderGeometry args={[o.radiusFrac * REF_HALF, o.radiusFrac * REF_HALF, h, 12]} />
            <meshStandardMaterial color={TYPE_COLORS[o.type] || '#888'} />
          </mesh>
        );
      })}
      {selfDamageObjects.map((o) => (
        <mesh key={o.id} position={[o.xFrac * MAP_HALF, 0.6, o.zFrac * MAP_HALF]}>
          <sphereGeometry args={[0.6, 12, 12]} />
          <meshStandardMaterial color="#e0555f" emissive="#e0555f" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </Canvas>
  );
}

const TYPE_COLORS = {
  gurney: '#8a8674',
  shelf: '#6b6659',
  cart: '#9a9584',
  pillar: '#3d4a42',
  crate: '#a47c48',
  desk: '#7a5a3a',
  plant: '#4f9a5a',
  tank: '#5b8fb0',
};

// Mismos criterios usados para verificar a mano el mapa 'default' en
// GameMap.js — replicados acá para detectar en tiempo real los mismos
// problemas que antes solo se detectaban corriendo un script aparte.
// Todo en FRACCIONES (el editor nunca trabaja en unidades absolutas).
const INTERACTION_RADIUS_FRAC = 2.5 / 30; // INTERACTION_RADIUS del server (2.5) / halfSize de referencia (MATCH_AREA=30)
const CURATOR_SPAWN_MARGIN_FRAC = 1 / 30; // margen de +1 unidad usado en la verificación original
const PATIENT_RING_RADIUS_FRAC = 0.7; // GameMap.getPatientSpawnPositions usa halfSize*0.7
const PATIENT_RING_MARGIN_FRAC = 1 / 30;

/**
 * Devuelve un set de ids de objetos con al menos un conflicto — usado
 * para colorear en rojo/advertencia esos marcadores en el lienzo. No
 * bloquea el export (el usuario puede decidir ignorarlo), solo avisa.
 */
function computeConflicts(selfDamageObjects, collisionObjects) {
  const conflicts = new Set();

  const dist = (a, b) => Math.sqrt((a.xFrac - b.xFrac) ** 2 + (a.zFrac - b.zFrac) ** 2);

  for (const col of collisionObjects) {
    // vs. centro (spawn del Curador)
    const distToCenter = Math.sqrt(col.xFrac ** 2 + col.zFrac ** 2);
    if (distToCenter < col.radiusFrac + CURATOR_SPAWN_MARGIN_FRAC) {
      conflicts.add(col.id);
    }

    // vs. anillo de spawn de Pacientes — cualquier objeto cuya distancia
    // al centro caiga cerca del radio del anillo (sin importar el ángulo,
    // porque no sabemos cuántos Pacientes ni en qué ángulos van a caer)
    if (Math.abs(distToCenter - PATIENT_RING_RADIUS_FRAC) < col.radiusFrac + PATIENT_RING_MARGIN_FRAC) {
      conflicts.add(col.id);
    }

    // vs. objetos de auto-daño
    for (const obj of selfDamageObjects) {
      if (dist(col, obj) < col.radiusFrac + INTERACTION_RADIUS_FRAC) {
        conflicts.add(col.id);
        conflicts.add(obj.id);
      }
    }

    // vs. otros objetos de colisión
    for (const other of collisionObjects) {
      if (other.id === col.id) continue;
      if (dist(col, other) < col.radiusFrac + other.radiusFrac) {
        conflicts.add(col.id);
        conflicts.add(other.id);
      }
    }
  }

  return conflicts;
}

let nextIdCounter = 1;
function generateId(prefix) {
  return `${prefix}_${nextIdCounter++}`;
}

export default function MapEditorPage() {
  const [mapHalf, setMapHalf] = useState(60);
  const MAP_HALF = mapHalf;
  const [selfDamageObjects, setSelfDamageObjects] = useState([]);
  const [collisionObjects, setCollisionObjects] = useState([]);
  const [curatorSpawns, setCuratorSpawns] = useState([]);
  const [patientSpawns, setPatientSpawns] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [mapEvents, setMapEvents] = useState([]);
  const [selEvent, setSelEvent] = useState(null);
  const [buildTex, setBuildTex] = useState('');
  const [buildY0, setBuildY0] = useState(0);
  const [buildTint, setBuildTint] = useState('#ffffff');
  const [buildH, setBuildH] = useState(1.6);
  const [buildSize, setBuildSize] = useState(3);
  const [rampDir, setRampDir] = useState('-x');
  const [selectedTool, setSelectedTool] = useState('self_damage'); // 'self_damage' | 'block' | 'ramp' | tipo de collision
  const [draggingId, setDraggingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [exportedJson, setExportedJson] = useState(null);
  const [mapName, setMapName] = useState('');
  const [mapId, setMapId] = useState('');
  const [pubStatus, setPubStatus] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | { error }
  const canvasRef = useRef(null);

  /**
   * Convierte una posición de click/drag en píxeles del lienzo a
   * fracción (-1 a 1) relativa al centro — el mismo formato que
   * xFrac/zFrac en GameMap.js. Este es el único lugar donde ocurre esa
   * conversión; todo lo demás en el componente trabaja con fracciones.
   */
  const pixelToFraction = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left - CANVAS_HALF;
    const y = clientY - rect.top - CANVAS_HALF;
    return {
      xFrac: Math.max(-1, Math.min(1, x / CANVAS_HALF)),
      zFrac: Math.max(-1, Math.min(1, y / CANVAS_HALF)),
    };
  }, []);

  function handleCanvasClick(e) {
    if (draggingId) return; // un click que termina un drag no debe crear un objeto nuevo
    const { xFrac, zFrac } = pixelToFraction(e.clientX, e.clientY);
    if (selectedTool === 'edit') {
      const hits = platforms.filter((p) => Math.abs(xFrac - p.xFrac) * MAP_HALF <= p.hxFrac * REF_HALF && Math.abs(zFrac - p.zFrac) * MAP_HALF <= p.hzFrac * REF_HALF);
      hits.sort((a, b) => a.hxFrac * a.hzFrac - b.hxFrac * b.hzFrac);
      setSelectedId(hits.length ? hits[0].id : null);
      return;
    }
    placeAt(xFrac, zFrac);
  }

  function placeAt(xFrac, zFrac) {
    if (selectedTool === 'edit') { setSelectedId(null); return; }
    xFrac = Math.max(-1, Math.min(1, xFrac));
    zFrac = Math.max(-1, Math.min(1, zFrac));
    if (selectedTool === 'pit' || selectedTool === 'pit_ramp' || selectedTool === 'gate' || selectedTool === 'slab') {
      const kind = selectedTool === 'gate' ? 'gate' : selectedTool === 'slab' ? 'mezzanine' : 'pit';
      setPlatforms((prev) => [...prev, {
        id: generateId(kind),
        xFrac, zFrac,
        hxFrac: (selectedTool === 'gate' ? 0.3 : buildSize) / REF_HALF,
        hzFrac: (selectedTool === 'gate' ? buildSize : selectedTool === 'slab' ? buildSize : buildSize * 0.8) / REF_HALF,
        h: selectedTool === 'gate' ? 3 : buildH,
        ramp: selectedTool === 'pit_ramp' ? rampDir : null,
        kind,
        tex: buildTex || null,
        tint: buildTint !== '#ffffff' ? buildTint : null,
        y0: kind === 'pit' ? 0 : buildY0,
      }]);
    } else if (selectedTool === 'block' || selectedTool === 'ramp') {
      setPlatforms((prev) => [...prev, {
        id: generateId(selectedTool === 'ramp' ? 'ramp' : 'block'),
        xFrac, zFrac,
        hxFrac: buildSize / REF_HALF,
        hzFrac: (selectedTool === 'ramp' ? buildSize * 0.8 : buildSize) / REF_HALF,
        h: buildH,
        ramp: selectedTool === 'ramp' ? rampDir : null,
        kind: null,
        tex: buildTex || null,
        tint: buildTint !== '#ffffff' ? buildTint : null,
        y0: buildY0,
      }]);
    } else if (selectedTool === 'curator_spawn') {
      setCuratorSpawns((prev) => [...prev, { id: generateId('cs'), xFrac, zFrac }]);
    } else if (selectedTool === 'patient_spawn') {
      setPatientSpawns((prev) => [...prev, { id: generateId('ps'), xFrac, zFrac }]);
    } else if (selectedTool === 'self_damage') {
      setSelfDamageObjects((prev) => [...prev, { id: generateId('obj'), xFrac, zFrac }]);
    } else {
      setCollisionObjects((prev) => [
        ...prev,
        { id: generateId('col'), type: selectedTool, xFrac, zFrac, radiusFrac: 0.04 },
      ]);
    }
  }

  function handleMarkerPointerDown(e, id) {
    e.stopPropagation(); // no disparar handleCanvasClick al arrancar un drag sobre un marcador existente
    setDraggingId(id);
    setSelectedId(id);
  }

  function handleCanvasPointerMove(e) {
    if (!draggingId) return;
    const { xFrac, zFrac } = pixelToFraction(e.clientX, e.clientY);
    setSelfDamageObjects((prev) => prev.map((o) => (o.id === draggingId ? { ...o, xFrac, zFrac } : o)));
    setCollisionObjects((prev) => prev.map((o) => (o.id === draggingId ? { ...o, xFrac, zFrac } : o)));
    setPlatforms((prev) => prev.map((o) => (o.id === draggingId ? { ...o, xFrac, zFrac } : o)));
    setCuratorSpawns((prev) => prev.map((o) => (o.id === draggingId ? { ...o, xFrac, zFrac } : o)));
    setPatientSpawns((prev) => prev.map((o) => (o.id === draggingId ? { ...o, xFrac, zFrac } : o)));
  }

  function handlePointerUp() {
    setDraggingId(null);
  }

  function handleRemove(id, e) {
    e.stopPropagation();
    setSelfDamageObjects((prev) => prev.filter((o) => o.id !== id));
    setCollisionObjects((prev) => prev.filter((o) => o.id !== id));
    setPlatforms((prev) => prev.filter((o) => o.id !== id));
    setCuratorSpawns((prev) => prev.filter((o) => o.id !== id));
    setPatientSpawns((prev) => prev.filter((o) => o.id !== id));
  }

  function handleRadiusChange(id, newRadiusFrac) {
    setCollisionObjects((prev) => prev.map((o) => (o.id === id ? { ...o, radiusFrac: newRadiusFrac } : o)));
  }

  function buildLayout(id, name) {
    // Mismo formato exacto que DEFAULT_MAP_LAYOUT en GameMap.js — así el
    // resultado se puede pegar directo ahí sin transformación adicional,
    // y es exactamente lo que acepta POST /maps en el servidor.
    return {
      id,
      name,
      halfSize: mapHalf,
      curatorSpawns: curatorSpawns.map((o) => ({ xFrac: round3(o.xFrac), zFrac: round3(o.zFrac) })),
      patientSpawns: patientSpawns.map((o) => ({ xFrac: round3(o.xFrac), zFrac: round3(o.zFrac) })),
      selfDamageObjects: selfDamageObjects.map((o) => ({
        id: o.id,
        xFrac: round3(o.xFrac),
        zFrac: round3(o.zFrac),
        minigame: o.minigame || null,
      })),
      events: mapEvents.map((e) => ({ ...e })),
      collisionObjects: collisionObjects.map((o) => ({
        id: o.id,
        type: o.type,
        xFrac: round3(o.xFrac),
        zFrac: round3(o.zFrac),
        radiusFrac: round3(o.radiusFrac),
      })),
      platforms: platforms.map((p) => ({
        id: p.id,
        xFrac: round3(p.xFrac),
        zFrac: round3(p.zFrac),
        hxFrac: round3(p.hxFrac),
        hzFrac: round3(p.hzFrac),
        h: round3(p.h),
        ramp: p.ramp,
        kind: p.kind || null,
        tex: p.tex || null,
        tint: p.tint || null,
        y0: round3(p.y0 || 0),
      })),
    };
  }

  function handleExport() {
    const layout = buildLayout(mapId.trim() || 'custom', mapName.trim() || 'Mapa personalizado');
    setExportedJson(JSON.stringify(layout, null, 2));
  }

  async function handlePublish() {
    if (selfDamageObjects.length === 0) {
      setPubStatus({ error: 'Coloca al menos un objeto de auto-daño antes de publicar.' });
      return;
    }
    const name = (mapName.trim() || mapId.trim()).slice(0, 40);
    if (!name) {
      setPubStatus({ error: 'Ponle un nombre al mapa.' });
      return;
    }
    setPubStatus('saving');
    try {
      await publishCommunityMap(buildLayout('tmp', name), name);
      setPubStatus('done');
    } catch (err) {
      setPubStatus({ error: err.message });
    }
  }

  async function handleSaveToServer() {
    const trimmedId = mapId.trim();
    const trimmedName = mapName.trim();
    if (!trimmedId) {
      setSaveStatus({ error: 'Poné un id para el mapa (sin espacios, ej. "quirofano_2").' });
      return;
    }
    if (selfDamageObjects.length === 0 && collisionObjects.length === 0 && platforms.length === 0) {
      setSaveStatus({ error: 'El mapa está vacío — colocá al menos un objeto antes de guardar.' });
      return;
    }
    setSaveStatus('saving');
    try {
      const layout = buildLayout(trimmedId, trimmedName || trimmedId);
      const res = await fetch(`${SERVER_URL}/maps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el mapa.');
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus({ error: err.message });
    }
  }

  function handleClear() {
    setMapEvents([]);
    setSelEvent(null);
    setSelfDamageObjects([]);
    setCollisionObjects([]);
    setPlatforms([]);
    setCuratorSpawns([]);
    setPatientSpawns([]);
    setExportedJson(null);
  }

  const conflicts = computeConflicts(selfDamageObjects, collisionObjects);
  const hasAnyConflict = conflicts.size > 0;

  return (
    <main style={styles.main}>
      <div style={styles.layout}>
        <div style={styles.toolPanel}>
          <h2 style={styles.title}>Editor de mapas</h2>
          <p style={styles.hint}>
            Elegí una herramienta, click en el lienzo para colocar, arrastrá para mover,
            click derecho o el botón × para borrar.
          </p>

          <div style={styles.countsBox}>
            <label style={styles.countLine}>Tamaño del mapa (mitad): {mapHalf}
              <input type="range" min="20" max="250" step="5" value={mapHalf} onChange={(e) => setMapHalf(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
            </label>
          </div>
          <p style={styles.countLine}>Herramienta</p>
          <div style={{ ...styles.toolGroup, borderBottom: '1px solid #3a3d52', paddingBottom: 8, marginBottom: 8 }}>
            <button style={styles.toolButton(selectedTool === 'edit', '#facc15')} onClick={() => setSelectedTool('edit')}>✎ Editar (altura / escala)</button>
          </div>
          {selectedTool === 'edit' && (() => {
            const sp = platforms.find((q) => q.id === selectedId);
            const upd = (patch) => setPlatforms((prev) => prev.map((q) => (q.id === selectedId ? { ...q, ...patch } : q)));
            if (!sp) return <div style={styles.countsBox}><p style={styles.countLine}>Toca un bloque del mapa para editarlo (también puedes arrastrarlo).</p></div>;
            const pitLike = sp.kind === 'pit';
            return (
              <div style={styles.countsBox}>
                <p style={styles.countLine}>Editando: {sp.id}</p>
                <label style={styles.countLine}>{pitLike ? 'Profundidad' : 'Altura'}: {sp.h.toFixed(1)}
                  <input type="range" min="0.4" max={pitLike ? 20 : 40} step="0.1" value={sp.h} onChange={(e) => upd({ h: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                </label>
                {!pitLike && (
                  <label style={styles.countLine}>Elevación (en qué piso está): {(sp.y0 || 0).toFixed(1)}
                    <input type="range" min="0" max="60" step="0.5" value={sp.y0 || 0} onChange={(e) => upd({ y0: parseFloat(e.target.value) })} style={{ width: '100%' }} />
                  </label>
                )}
                <label style={styles.countLine}>Textura:{' '}
                  <select value={sp.tex || ''} onChange={(e) => upd({ tex: e.target.value || null })}>
                    {TEXTURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>{' '}
                  <input type="color" value={sp.tint || '#ffffff'} onChange={(e) => upd({ tint: e.target.value === '#ffffff' ? null : e.target.value })} />
                </label>
                <label style={styles.countLine}>Largo (X): {(sp.hxFrac * REF_HALF * 2).toFixed(1)}
                  <input type="range" min="0.6" max="200" step="0.2" value={sp.hxFrac * REF_HALF * 2} onChange={(e) => upd({ hxFrac: parseFloat(e.target.value) / 2 / REF_HALF })} style={{ width: '100%' }} />
                </label>
                <label style={styles.countLine}>Ancho (Z): {(sp.hzFrac * REF_HALF * 2).toFixed(1)}
                  <input type="range" min="0.6" max="200" step="0.2" value={sp.hzFrac * REF_HALF * 2} onChange={(e) => upd({ hzFrac: parseFloat(e.target.value) / 2 / REF_HALF })} style={{ width: '100%' }} />
                </label>
                {sp.ramp && (
                  <p style={styles.countLine}>
                    Sube hacia:{' '}
                    <button style={styles.toolButton(sp.ramp === '-x', '#5468ff')} onClick={() => upd({ ramp: '-x' })}>-X</button>{' '}
                    <button style={styles.toolButton(sp.ramp === '+x', '#5468ff')} onClick={() => upd({ ramp: '+x' })}>+X</button>
                  </p>
                )}
                <p style={styles.countLine}>
                  <button style={styles.toolButton(false, '#e0555f')} onClick={() => { setPlatforms((prev) => prev.filter((q) => q.id !== sp.id)); setSelectedId(null); }}>Eliminar</button>
                </p>
              </div>
            );
          })()}

          <p style={styles.countLine}>Elementos para colocar</p>
          <div style={styles.toolGroup}>
            <button style={styles.toolButton(selectedTool === 'curator_spawn', '#f2a154')} onClick={() => setSelectedTool('curator_spawn')}>Spawn del Curador</button>
            <button style={styles.toolButton(selectedTool === 'patient_spawn', '#5fd58c')} onClick={() => setSelectedTool('patient_spawn')}>Spawn de sobrevivientes</button>
          </div>
          <div style={styles.toolGroup}>
            <button
              style={styles.toolButton(selectedTool === 'self_damage', '#e0555f')}
              onClick={() => setSelectedTool('self_damage')}
            >
              Objeto de auto-daño
            </button>
            <button style={styles.toolButton(selectedTool === 'block', '#6b7280')} onClick={() => setSelectedTool('block')}>Bloque</button>
            <button style={styles.toolButton(selectedTool === 'ramp', '#9ca3af')} onClick={() => setSelectedTool('ramp')}>Rampa</button>
            <button style={styles.toolButton(selectedTool === 'pit', '#3b6ea5')} onClick={() => setSelectedTool('pit')}>Sótano (foso)</button>
            <button style={styles.toolButton(selectedTool === 'pit_ramp', '#5b8fb0')} onClick={() => setSelectedTool('pit_ramp')}>Rampa de sótano (bajada)</button>
            <button style={styles.toolButton(selectedTool === 'slab', '#8fc6ea')} onClick={() => setSelectedTool('slab')}>Entrepiso (pasable por debajo)</button>
            <button style={styles.toolButton(selectedTool === 'gate', '#f2a154')} onClick={() => setSelectedTool('gate')}>Puerta solo Curador</button>
            {COLLISION_TYPES.map((type) => (
              <button
                key={type}
                style={styles.toolButton(selectedTool === type, TYPE_COLORS[type])}
                onClick={() => setSelectedTool(type)}
              >
                {labelForType(type)}
              </button>
            ))}
          </div>

          {(selectedTool === 'block' || selectedTool === 'ramp' || selectedTool === 'pit' || selectedTool === 'pit_ramp' || selectedTool === 'gate' || selectedTool === 'slab') && (
            <div style={styles.countsBox}>
              <label style={styles.countLine}>Textura:{' '}
                <select value={buildTex} onChange={(e) => setBuildTex(e.target.value)}>
                  {TEXTURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>{' '}
                <input type="color" value={buildTint} onChange={(e) => setBuildTint(e.target.value)} />
              </label>
              <label style={styles.countLine}>Elevación (piso): {buildY0.toFixed(1)}
                <input type="range" min="0" max="40" step="0.5" value={buildY0} onChange={(e) => setBuildY0(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label style={styles.countLine}>Altura: {buildH.toFixed(1)}
                <input type="range" min="0.4" max="20" step="0.2" value={buildH} onChange={(e) => setBuildH(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </label>
              <label style={styles.countLine}>Tamaño: {buildSize.toFixed(1)}
                <input type="range" min="1.5" max="40" step="0.5" value={buildSize} onChange={(e) => setBuildSize(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </label>
              {(selectedTool === 'ramp' || selectedTool === 'pit_ramp') && (
                <p style={styles.countLine}>
                  Sube hacia:{' '}
                  <button style={styles.toolButton(rampDir === '-x', '#5468ff')} onClick={() => setRampDir('-x')}>-X</button>{' '}
                  <button style={styles.toolButton(rampDir === '+x', '#5468ff')} onClick={() => setRampDir('+x')}>+X</button>
                </p>
              )}
            </div>
          )}

          {platforms.length > 0 && (
            <div style={styles.countsBox}>
              <p style={styles.countLine}>Texturas de bloques</p>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {platforms.map((p) => (
                  <div key={p.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.id}</span>
                    <select value={p.tex || ''} onChange={(e) => setPlatforms((prev) => prev.map((q) => (q.id === p.id ? { ...q, tex: e.target.value || null } : q)))}>
                      {TEXTURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input type="color" value={p.tint || '#ffffff'} onChange={(e) => setPlatforms((prev) => prev.map((q) => (q.id === p.id ? { ...q, tint: e.target.value === '#ffffff' ? null : e.target.value } : q)))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selfDamageObjects.length > 0 && (
            <div style={styles.countsBox}>
              <p style={styles.countLine}>Minijuego por bloque de auto-daño</p>
              <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                {selfDamageObjects.map((o) => (
                  <div key={o.id} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.id}</span>
                    <select value={o.minigame || ''} onChange={(e) => setSelfDamageObjects((prev) => prev.map((q) => (q.id === o.id ? { ...q, minigame: e.target.value || null } : q)))}>
                      <option value="">Al azar</option>
                      <option value="rhythm">Ritmo</option>
                      <option value="needle">Aguja</option>
                      <option value="mash">Machacar</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.countsBox}>
            <p style={styles.countLine}>Eventos del mapa vivo: {mapEvents.length}</p>
            <button style={styles.toolButton(false, '#9aa5ff')} onClick={() => {
              const ev = { id: generateId('ev'), kind: 'blackout', mode: 'lock', startSec: 60, warnSec: 8, durSec: 20, repeatSec: 0, xFrac: 0, zFrac: 0, rFrac: 0, yMin: null, yMax: null };
              setMapEvents((prev) => [...prev, ev]);
              setSelEvent(ev.id);
            }}>+ Evento</button>
            {mapEvents.map((e) => (
              <div key={e.id} style={{ marginTop: 4, padding: 4, border: `1px solid ${e.id === selEvent ? '#facc15' : '#3d4a42'}`, borderRadius: 6 }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button style={{ fontSize: 11 }} onClick={() => setSelEvent(e.id === selEvent ? null : e.id)}>{e.id === selEvent ? '▾' : '▸'}</button>
                  <select value={e.kind} onChange={(ev) => setMapEvents((prev) => prev.map((q) => (q.id === e.id ? { ...q, kind: ev.target.value } : q)))}>
                    <option value="blackout">Apagón</option>
                    <option value="gates">Puertas del Curador</option>
                    <option value="alarm">Alarma (revela Pacientes)</option>
                    <option value="shuffle">Reubicar auto-daño</option>
                  </select>
                  <span style={{ fontSize: 11 }}>a los {e.startSec}s</span>
                  <button style={{ fontSize: 11, marginLeft: 'auto' }} onClick={() => setMapEvents((prev) => prev.filter((q) => q.id !== e.id))}>✕</button>
                </div>
                {e.id === selEvent && (() => {
                  const upd = (patch) => setMapEvents((prev) => prev.map((q) => (q.id === e.id ? { ...q, ...patch } : q)));
                  const num = (label, key, min, max, step) => (
                    <label style={styles.countLine}>{label}: {e[key]}
                      <input type="range" min={min} max={max} step={step} value={e[key]} onChange={(ev) => upd({ [key]: parseFloat(ev.target.value) })} style={{ width: '100%' }} />
                    </label>
                  );
                  return (
                    <div>
                      {e.kind === 'gates' && (
                        <p style={styles.countLine}>
                          Modo:{' '}
                          <button style={styles.toolButton(e.mode === 'lock', '#ffb454')} onClick={() => upd({ mode: 'lock' })}>Cierra al Curador</button>{' '}
                          <button style={styles.toolButton(e.mode === 'open', '#5fd58c')} onClick={() => upd({ mode: 'open' })}>Abre a Pacientes</button>
                        </p>
                      )}
                      {num('Empieza (s)', 'startSec', 0, 900, 5)}
                      {num('Aviso previo (s)', 'warnSec', 0, 30, 1)}
                      {e.kind !== 'shuffle' && num('Dura (s)', 'durSec', 1, 120, 1)}
                      {num('Se repite cada (s, 0 = una vez)', 'repeatSec', 0, 600, 5)}
                      {e.kind === 'blackout' && (
                        <>
                          {num('Centro X', 'xFrac', -1, 1, 0.05)}
                          {num('Centro Z', 'zFrac', -1, 1, 0.05)}
                          {num('Radio (0 = todo el mapa)', 'rFrac', 0, 2, 0.05)}
                          <label style={styles.countLine}>Altura mínima:{' '}
                            <input type="number" style={{ width: 60 }} value={e.yMin ?? ''} placeholder="—" onChange={(ev) => upd({ yMin: ev.target.value === '' ? null : parseFloat(ev.target.value) })} />
                            {' '}máxima:{' '}
                            <input type="number" style={{ width: 60 }} value={e.yMax ?? ''} placeholder="—" onChange={(ev) => upd({ yMax: ev.target.value === '' ? null : parseFloat(ev.target.value) })} />
                          </label>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          <div style={styles.countsBox}>
            <p style={styles.countLine}>Bloques y rampas: {platforms.length}</p>
            <p style={styles.countLine}>Spawns de Curador: {curatorSpawns.length} (al azar si hay varios; sin ninguno, el centro)</p>
            <p style={styles.countLine}>Spawns de sobrevivientes: {patientSpawns.length}</p>
            <p style={styles.countLine}>Objetos de auto-daño: {selfDamageObjects.length}</p>
            <p style={styles.countLine}>Objetos de colisión: {collisionObjects.length}</p>
            {hasAnyConflict && (
              <p style={styles.conflictWarning}>
                ⚠ {conflicts.size} objeto{conflicts.size !== 1 ? 's' : ''} en conflicto (marcados en
                amarillo) — muy cerca del centro, del anillo de spawn de Pacientes, o de otro objeto.
              </p>
            )}
          </div>

          {collisionObjects.length > 0 && (
            <div style={styles.radiusPanel}>
              <p style={styles.radiusPanelTitle}>Radio de colisión</p>
              {collisionObjects.map((o) => (
                <div key={o.id} style={styles.radiusRow}>
                  <span style={styles.radiusLabel}>{labelForType(o.type)} ({o.id})</span>
                  <input
                    type="range"
                    min="0.01"
                    max="0.3"
                    step="0.005"
                    value={o.radiusFrac}
                    onChange={(e) => handleRadiusChange(o.id, parseFloat(e.target.value))}
                    style={styles.radiusSlider}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={styles.saveBox}>
            <label style={styles.saveLabel}>
              Id del mapa
              <input
                style={styles.saveInput}
                value={mapId}
                onChange={(e) => { setMapId(e.target.value.trim()); setSaveStatus(null); }}
                placeholder="ej. quirofano_2"
                maxLength={40}
              />
            </label>
            <label style={styles.saveLabel}>
              Nombre
              <input
                style={styles.saveInput}
                value={mapName}
                onChange={(e) => { setMapName(e.target.value); setSaveStatus(null); }}
                placeholder="ej. Quirófano 2"
                maxLength={60}
              />
            </label>
            <button
              style={styles.saveButton(saveStatus === 'saving')}
              onClick={handleSaveToServer}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Guardando...' : 'Guardar mapa en el servidor'}
            </button>
            {saveStatus === 'saved' && (
              <p style={styles.saveSuccess}>
                ✓ Guardado. Ya se puede elegir "{mapName.trim() || mapId}" desde el lobby.
              </p>
            )}
            {saveStatus && saveStatus.error && (
              <p style={styles.saveError}>{saveStatus.error}</p>
            )}
            <button style={styles.saveButton(pubStatus === 'saving')} onClick={handlePublish} disabled={pubStatus === 'saving'}>
              {pubStatus === 'saving' ? 'Publicando...' : 'Publicar en la comunidad'}
            </button>
            {pubStatus === 'done' && <p style={styles.saveSuccess}>✓ Publicado. Ya aparece en "Mapas de la comunidad" del lobby.</p>}
            {pubStatus && pubStatus.error && <p style={styles.saveError}>{pubStatus.error}</p>}
          </div>

          <div style={styles.actionsRow}>
            <button style={styles.exportButton} onClick={handleExport}>
              Exportar JSON
            </button>
            <button style={styles.clearButton} onClick={handleClear}>
              Limpiar todo
            </button>
          </div>

          <Link href="/" style={styles.backLink}>← Volver al lobby</Link>
        </div>

        <div style={styles.canvasArea}>
          <svg
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={styles.canvas}
            onClick={handleCanvasClick}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Fondo del área jugable */}
            <rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE} fill="#e8e4d8" />

            {/* Grid de referencia */}
            {Array.from({ length: 9 }, (_, i) => (i + 1) * (CANVAS_SIZE / 10)).map((pos) => (
              <g key={pos}>
                <line x1={pos} y1={0} x2={pos} y2={CANVAS_SIZE} stroke="#c9c5b8" strokeWidth={1} />
                <line x1={0} y1={pos} x2={CANVAS_SIZE} y2={pos} stroke="#c9c5b8" strokeWidth={1} />
              </g>
            ))}

            {/* Ejes centrales, más marcados — referencia visual del centro
                del área (donde spawnea el Curador en el juego real) */}
            <line x1={CANVAS_HALF} y1={0} x2={CANVAS_HALF} y2={CANVAS_SIZE} stroke="#5468ff" strokeWidth={1.5} strokeDasharray="4 4" />
            <line x1={0} y1={CANVAS_HALF} x2={CANVAS_SIZE} y2={CANVAS_HALF} stroke="#5468ff" strokeWidth={1.5} strokeDasharray="4 4" />
            <circle cx={CANVAS_HALF} cy={CANVAS_HALF} r={5} fill="#5468ff" />
            <text x={CANVAS_HALF + 8} y={CANVAS_HALF - 8} fontSize={11} fill="#5468ff">
              Centro (spawn Curador)
            </text>

            {mapEvents.filter((e) => e.id === selEvent && e.kind === 'blackout' && e.rFrac > 0).map((e) => (
              <circle key={e.id} cx={e.xFrac * CANVAS_HALF + CANVAS_HALF} cy={e.zFrac * CANVAS_HALF + CANVAS_HALF} r={e.rFrac * CANVAS_HALF} fill="#1b1f4a" fillOpacity={0.22} stroke="#5468ff" strokeDasharray="6 4" />
            ))}

            {platforms.map((p) => {
              const w = p.hxFrac * REF_HALF / MAP_HALF * CANVAS_HALF;
              const d = p.hzFrac * REF_HALF / MAP_HALF * CANVAS_HALF;
              return (
                <g
                  key={p.id}
                  transform={`translate(${p.xFrac * CANVAS_HALF + CANVAS_HALF}, ${p.zFrac * CANVAS_HALF + CANVAS_HALF})`}
                  onPointerDown={(e) => handleMarkerPointerDown(e, p.id)}
                  onContextMenu={(e) => { e.preventDefault(); handleRemove(p.id, e); }}
                  style={{ cursor: 'grab' }}
                >
                  <rect x={-w} y={-d} width={w * 2} height={d * 2} fill={p.kind === 'gate' ? '#f2a154' : p.kind === 'pit' ? '#3b6ea5' : p.ramp ? '#9ca3af' : '#6b7280'} fillOpacity={0.55} stroke={p.id === selectedId ? '#facc15' : '#3d4a42'} strokeWidth={p.id === selectedId ? 4 : 2} />
                  <text x={0} y={4} fontSize={10} fill="#111" textAnchor="middle">{p.ramp ? `${p.ramp === '+x' ? '→' : '←'} ${p.h.toFixed(1)}` : p.h.toFixed(1)}</text>
                </g>
              );
            })}

            {curatorSpawns.map((o) => (
              <g key={o.id} transform={`translate(${o.xFrac * CANVAS_HALF + CANVAS_HALF}, ${o.zFrac * CANVAS_HALF + CANVAS_HALF})`}
                onPointerDown={(e) => handleMarkerPointerDown(e, o.id)} onContextMenu={(e) => { e.preventDefault(); handleRemove(o.id, e); }} style={{ cursor: 'grab' }}>
                <polygon points="0,-11 3,-3 11,-3 5,2 7,10 0,5 -7,10 -5,2 -11,-3 -3,-3" fill="#f2a154" stroke="#fff" strokeWidth={2} />
              </g>
            ))}
            {patientSpawns.map((o) => (
              <g key={o.id} transform={`translate(${o.xFrac * CANVAS_HALF + CANVAS_HALF}, ${o.zFrac * CANVAS_HALF + CANVAS_HALF})`}
                onPointerDown={(e) => handleMarkerPointerDown(e, o.id)} onContextMenu={(e) => { e.preventDefault(); handleRemove(o.id, e); }} style={{ cursor: 'grab' }}>
                <circle r={9} fill="#5fd58c" stroke="#fff" strokeWidth={2} />
                <text x={0} y={4} fontSize={10} fill="#0b3b1f" textAnchor="middle">S</text>
              </g>
            ))}

            {/* Marcadores de objetos de auto-daño */}
            {selfDamageObjects.map((o) => {
              const inConflict = conflicts.has(o.id);
              return (
                <g
                  key={o.id}
                  transform={`translate(${o.xFrac * CANVAS_HALF + CANVAS_HALF}, ${o.zFrac * CANVAS_HALF + CANVAS_HALF})`}
                  onPointerDown={(e) => handleMarkerPointerDown(e, o.id)}
                  onContextMenu={(e) => { e.preventDefault(); handleRemove(o.id, e); }}
                  style={{ cursor: 'grab' }}
                >
                  <circle r={10} fill={inConflict ? '#f2c14e' : '#e0555f'} stroke={inConflict ? '#e0555f' : '#fff'} strokeWidth={inConflict ? 3 : 2} />
                  <text x={14} y={4} fontSize={10} fill="#3d4a42">{o.id}</text>
                  <text
                    x={-4} y={4} fontSize={11} fill="#fff"
                    onClick={(e) => handleRemove(o.id, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    ×
                  </text>
                </g>
              );
            })}

            {/* Marcadores de objetos de colisión */}
            {collisionObjects.map((o) => {
              const pixelRadius = o.radiusFrac * CANVAS_HALF;
              const inConflict = conflicts.has(o.id);
              return (
                <g
                  key={o.id}
                  transform={`translate(${o.xFrac * CANVAS_HALF + CANVAS_HALF}, ${o.zFrac * CANVAS_HALF + CANVAS_HALF})`}
                  onPointerDown={(e) => handleMarkerPointerDown(e, o.id)}
                  onContextMenu={(e) => { e.preventDefault(); handleRemove(o.id, e); }}
                  style={{ cursor: 'grab' }}
                >
                  <circle
                    r={Math.max(pixelRadius, 8)}
                    fill={TYPE_COLORS[o.type]}
                    stroke={inConflict ? '#f2c14e' : '#fff'}
                    strokeWidth={inConflict ? 4 : 2}
                    fillOpacity={0.85}
                  />
                  <text x={0} y={4} fontSize={9} fill="#fff" textAnchor="middle">{labelForType(o.type)[0]}</text>
                </g>
              );
            })}
          </svg>
          <p style={styles.canvasCaption}>Vista 3D: arrastra para girar, rueda para acercar y haz clic en el suelo para colocar la herramienta elegida.</p>
          <Preview3D platforms={platforms} collisionObjects={collisionObjects} selfDamageObjects={selfDamageObjects} onGround={placeAt} onPick={selectedTool === 'edit' ? setSelectedId : null} selectedId={selectedId} MAP_HALF={MAP_HALF} />
          <p style={styles.canvasCaption}>
            El lienzo representa el área de partida completa (MATCH_AREA). Las posiciones
            se guardan como fracción del centro, no en unidades fijas — el mismo layout
            funciona igual si el área real es más chica o más grande.
          </p>
        </div>
      </div>

      {exportedJson && (
        <div style={styles.exportOverlay} onClick={() => setExportedJson(null)}>
          <div style={styles.exportCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.exportTitle}>Layout exportado</h3>
            <p style={styles.exportHint}>
              Copiá este bloque y pegalo como una nueva entrada en <code>MAPS</code> dentro de{' '}
              <code>server/src/GameMap.js</code>. Esto NO se aplica automáticamente al juego —
              es un layout generado, listo para copiar a mano.
            </p>
            <textarea readOnly style={styles.exportTextarea} value={exportedJson} onClick={(e) => e.target.select()} />
            <button style={styles.closeExportButton} onClick={() => setExportedJson(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </main>
  );
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function labelForType(type) {
  const labels = { gurney: 'Camilla', shelf: 'Estantería', cart: 'Carrito', pillar: 'Columna', crate: 'Caja', desk: 'Escritorio', plant: 'Planta', tank: 'Tanque' };
  return labels[type] || type;
}

const styles = {
  main: {
    minHeight: '100vh',
    background: '#12131a',
    color: '#e8e8ef',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
  },
  layout: { display: 'flex', gap: 24, maxWidth: 1000, margin: '0 auto' },
  toolPanel: {
    width: 260,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  hint: { fontSize: 12, color: '#8a8da3', margin: 0, lineHeight: 1.5 },
  toolGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  toolButton: (active, color) => ({
    padding: '8px 12px',
    borderRadius: 6,
    border: active ? `2px solid ${color}` : '1px solid #2a2d3d',
    background: active ? `${color}22` : '#1b1d29',
    color: '#e8e8ef',
    fontSize: 13,
    textAlign: 'left',
    cursor: 'pointer',
  }),
  countsBox: {
    padding: 12,
    borderRadius: 8,
    background: '#1b1d29',
    border: '1px solid #2a2d3d',
  },
  countLine: { fontSize: 12, color: '#8a8da3', margin: '4px 0' },
  conflictWarning: { fontSize: 11, color: '#f2c14e', margin: '8px 0 0', lineHeight: 1.5 },
  radiusPanel: {
    padding: 12,
    borderRadius: 8,
    background: '#1b1d29',
    border: '1px solid #2a2d3d',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  radiusPanelTitle: { fontSize: 12, fontWeight: 600, margin: '0 0 4px', color: '#8a8da3' },
  radiusRow: { display: 'flex', flexDirection: 'column', gap: 2 },
  radiusLabel: { fontSize: 11, color: '#8a8da3' },
  radiusSlider: { width: '100%' },
  saveBox: {
    padding: 12,
    borderRadius: 8,
    background: '#1b1d29',
    border: '1px solid #2a2d3d',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  saveLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#8a8da3' },
  saveInput: {
    padding: '7px 10px',
    borderRadius: 6,
    border: '1px solid #2a2d3d',
    background: '#12131a',
    color: '#e8e8ef',
    fontSize: 13,
  },
  saveButton: (saving) => ({
    padding: '9px 14px',
    borderRadius: 6,
    border: 'none',
    background: saving ? '#2a2d3d' : '#5fd58c',
    color: saving ? '#8a8da3' : '#12131a',
    fontSize: 13,
    fontWeight: 600,
    cursor: saving ? 'default' : 'pointer',
  }),
  saveSuccess: { fontSize: 11, color: '#5fd58c', margin: 0, lineHeight: 1.5 },
  saveError: { fontSize: 11, color: '#e0555f', margin: 0, lineHeight: 1.5 },
  backLink: { fontSize: 12, color: '#8a8da3', textDecoration: 'none' },
  actionsRow: { display: 'flex', gap: 8 },
  exportButton: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#5468ff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  clearButton: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #2a2d3d',
    background: 'transparent',
    color: '#8a8da3',
    fontSize: 13,
    cursor: 'pointer',
  },
  canvasArea: { flex: 1 },
  canvas: {
    borderRadius: 8,
    border: '2px solid #2a2d3d',
    cursor: 'crosshair',
    userSelect: 'none',
  },
  canvasCaption: { fontSize: 11, color: '#565a6e', marginTop: 8, lineHeight: 1.5 },
  exportOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 11, 16, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  exportCard: {
    width: 560,
    maxHeight: '80vh',
    padding: 24,
    borderRadius: 12,
    background: '#1b1d29',
    border: '1px solid #2a2d3d',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  exportTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  exportHint: { fontSize: 12, color: '#8a8da3', margin: 0, lineHeight: 1.5 },
  exportTextarea: {
    width: '100%',
    height: 280,
    padding: 12,
    borderRadius: 8,
    border: '1px solid #2a2d3d',
    background: '#12131a',
    color: '#5fd58c',
    fontSize: 12,
    fontFamily: 'monospace',
    resize: 'vertical',
  },
  closeExportButton: {
    padding: '8px 14px',
    borderRadius: 6,
    border: 'none',
    background: '#5468ff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
};
