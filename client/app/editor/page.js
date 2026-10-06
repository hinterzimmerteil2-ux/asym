'use client';

import { useState, useRef, useCallback } from 'react';

// Tamaño en píxeles del lienzo cuadrado del editor — el área jugable
// (MATCH_AREA, halfSize=30 por defecto en GameMap.js) se dibuja a esta
// escala, y cada punto que se arrastra ahí adentro se convierte a
// fracción (-1 a 1) dividiendo por la mitad del lienzo. El halfSize real
// del mapa NO afecta el editor en sí — el editor siempre trabaja en
// fracciones, que es justamente el punto: el layout resultante funciona
// para cualquier tamaño de área que se use después.
const CANVAS_SIZE = 560;
const CANVAS_HALF = CANVAS_SIZE / 2;

const COLLISION_TYPES = ['gurney', 'shelf', 'cart', 'pillar'];

const TYPE_COLORS = {
  gurney: '#8a8674',
  shelf: '#6b6659',
  cart: '#9a9584',
  pillar: '#3d4a42',
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
  const [selfDamageObjects, setSelfDamageObjects] = useState([]);
  const [collisionObjects, setCollisionObjects] = useState([]);
  const [selectedTool, setSelectedTool] = useState('self_damage'); // 'self_damage' | tipo de collision
  const [draggingId, setDraggingId] = useState(null);
  const [exportedJson, setExportedJson] = useState(null);
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

    if (selectedTool === 'self_damage') {
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
  }

  function handleCanvasPointerMove(e) {
    if (!draggingId) return;
    const { xFrac, zFrac } = pixelToFraction(e.clientX, e.clientY);
    setSelfDamageObjects((prev) => prev.map((o) => (o.id === draggingId ? { ...o, xFrac, zFrac } : o)));
    setCollisionObjects((prev) => prev.map((o) => (o.id === draggingId ? { ...o, xFrac, zFrac } : o)));
  }

  function handlePointerUp() {
    setDraggingId(null);
  }

  function handleRemove(id, e) {
    e.stopPropagation();
    setSelfDamageObjects((prev) => prev.filter((o) => o.id !== id));
    setCollisionObjects((prev) => prev.filter((o) => o.id !== id));
  }

  function handleRadiusChange(id, newRadiusFrac) {
    setCollisionObjects((prev) => prev.map((o) => (o.id === id ? { ...o, radiusFrac: newRadiusFrac } : o)));
  }

  function handleExport() {
    // Mismo formato exacto que DEFAULT_MAP_LAYOUT en GameMap.js — así el
    // resultado se puede pegar directo ahí sin transformación adicional.
    const layout = {
      id: 'custom',
      name: 'Mapa personalizado',
      selfDamageObjects: selfDamageObjects.map((o) => ({
        id: o.id,
        xFrac: round3(o.xFrac),
        zFrac: round3(o.zFrac),
      })),
      collisionObjects: collisionObjects.map((o) => ({
        id: o.id,
        type: o.type,
        xFrac: round3(o.xFrac),
        zFrac: round3(o.zFrac),
        radiusFrac: round3(o.radiusFrac),
      })),
    };
    setExportedJson(JSON.stringify(layout, null, 2));
  }

  function handleClear() {
    setSelfDamageObjects([]);
    setCollisionObjects([]);
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

          <div style={styles.toolGroup}>
            <button
              style={styles.toolButton(selectedTool === 'self_damage', '#e0555f')}
              onClick={() => setSelectedTool('self_damage')}
            >
              Objeto de auto-daño
            </button>
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

          <div style={styles.countsBox}>
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
                    max="0.1"
                    step="0.005"
                    value={o.radiusFrac}
                    onChange={(e) => handleRadiusChange(o.id, parseFloat(e.target.value))}
                    style={styles.radiusSlider}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={styles.actionsRow}>
            <button style={styles.exportButton} onClick={handleExport}>
              Exportar JSON
            </button>
            <button style={styles.clearButton} onClick={handleClear}>
              Limpiar todo
            </button>
          </div>
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
  const labels = { gurney: 'Camilla', shelf: 'Estantería', cart: 'Carrito', pillar: 'Columna' };
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
