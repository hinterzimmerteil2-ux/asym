/**
 * Define el/los mapa(s) jugable(s). Las posiciones de objetos se
 * expresan como FRACCIONES del halfSize del área (rango -1 a 1 en cada
 * eje), no como unidades absolutas — así el mismo layout relativo
 * funciona sin cambios si el área crece o se achica. Esto reemplaza el
 * enfoque de coordenadas fijas (ej. {x: 20, z: 20}) que no escalaba a
 * mapas de tamaño distinto sin recalcular cada punto a mano.
 *
 * getSelfDamagePositions(area) / getCollisionObjects(area) convierten
 * las fracciones a unidades reales multiplicando por area.halfSize —
 * es el único lugar donde ese cálculo ocurre.
 */

const LOBBY_AREA = {
  halfSize: 15,
  spawnRadius: 3,
};

const MATCH_AREA = {
  halfSize: 30,
};

/**
 * Layout base de un mapa: todo en fracciones (-1 a 1), independiente del
 * tamaño real del área. Un mapa nuevo es otro objeto con esta misma
 * forma — no hace falta tocar el resto del archivo para agregarlo.
 */
const DEFAULT_MAP_LAYOUT = {
  id: 'default',
  name: 'Instalación médica abandonada',

  // Objetos de auto-daño — fracciones del halfSize en cada eje.
  selfDamageObjects: [
    { id: 'obj_1', xFrac: 0.667, zFrac: 0.667 },
    { id: 'obj_2', xFrac: -0.667, zFrac: 0.667 },
    { id: 'obj_3', xFrac: 0.667, zFrac: -0.667 },
    { id: 'obj_4', xFrac: -0.667, zFrac: -0.667 },
    { id: 'obj_5', xFrac: 0, zFrac: 0.833 },
    { id: 'obj_6', xFrac: 0, zFrac: -0.833 },
  ],

  // Elementos de ambientación con colisión. radiusFrac también es
  // relativo (fracción de halfSize), no una unidad de mundo fija — así
  // un objeto se ve/colisiona proporcionalmente igual sin importar el
  // tamaño del mapa.
  collisionObjects: [
    { id: 'col_1', type: 'gurney', xFrac: 0.333, zFrac: 0.133, radiusFrac: 0.04 },
    { id: 'col_2', type: 'gurney', xFrac: -0.4, zFrac: -0.2, radiusFrac: 0.04 },
    { id: 'col_3', type: 'shelf', xFrac: 0.2, zFrac: -0.467, radiusFrac: 0.05 },
    { id: 'col_4', type: 'shelf', xFrac: -0.267, zFrac: 0.433, radiusFrac: 0.05 },
    { id: 'col_5', type: 'shelf', xFrac: 0.5, zFrac: -0.1, radiusFrac: 0.05 },
    { id: 'col_6', type: 'cart', xFrac: -0.133, zFrac: 0.3, radiusFrac: 0.03 },
    { id: 'col_7', type: 'cart', xFrac: 0.133, zFrac: -0.3, radiusFrac: 0.03 },
    { id: 'col_8', type: 'cart', xFrac: -0.533, zFrac: 0.267, radiusFrac: 0.03 },
    { id: 'col_9', type: 'pillar', xFrac: 0.4, zFrac: 0.4, radiusFrac: 0.033 },
    { id: 'col_10', type: 'pillar', xFrac: -0.4, zFrac: 0.4, radiusFrac: 0.033 },
    { id: 'col_11', type: 'pillar', xFrac: 0.4, zFrac: -0.4, radiusFrac: 0.033 },
    { id: 'col_12', type: 'pillar', xFrac: -0.4, zFrac: -0.4, radiusFrac: 0.033 },
    { id: 'col_13', type: 'gurney', xFrac: 0.067, zFrac: 0.567, radiusFrac: 0.04 },
    { id: 'col_14', type: 'shelf', xFrac: -0.1, zFrac: -0.6, radiusFrac: 0.05 },
  ],
};

// Catálogo de mapas disponibles — hoy solo uno, agregar otro es otra
// entrada acá con la misma forma que DEFAULT_MAP_LAYOUT.
const MAPS = {
  default: DEFAULT_MAP_LAYOUT,
};

const DEFAULT_MAP_ID = 'default';

/**
 * Mapas creados desde el editor visual (/editor) y guardados en el
 * servidor. Viven en memoria — igual que las salas — así que no
 * requieren Postgres; se pierden si el servidor se reinicia, que es
 * una limitación aceptable para un modo constructor de este alcance.
 */
function registerMap(layout) {
  if (!layout || typeof layout.id !== 'string' || !layout.id.trim()) {
    throw new Error('El mapa necesita un id');
  }
  if (!Array.isArray(layout.selfDamageObjects) || !Array.isArray(layout.collisionObjects)) {
    throw new Error('El mapa necesita selfDamageObjects y collisionObjects');
  }
  MAPS[layout.id] = {
    id: layout.id,
    name: typeof layout.name === 'string' && layout.name.trim() ? layout.name.trim() : layout.id,
    custom: true,
    selfDamageObjects: layout.selfDamageObjects.map((o) => ({
      id: String(o.id),
      xFrac: clampFrac(o.xFrac),
      zFrac: clampFrac(o.zFrac),
    })),
    collisionObjects: layout.collisionObjects.map((o) => ({
      id: String(o.id),
      type: typeof o.type === 'string' ? o.type : 'gurney',
      xFrac: clampFrac(o.xFrac),
      zFrac: clampFrac(o.zFrac),
      radiusFrac: Math.max(0.01, Math.min(0.2, Number(o.radiusFrac) || 0.04)),
    })),
  };
  return MAPS[layout.id];
}

function clampFrac(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

function listMaps() {
  return Object.values(MAPS).map((m) => ({ id: m.id, name: m.name, custom: Boolean(m.custom) }));
}

/**
 * Convierte el layout relativo de un mapa a coordenadas absolutas reales,
 * para el área dada. Es el único punto donde fracción -> unidad de mundo
 * ocurre — Room.js y el cliente trabajan siempre con el resultado de
 * esta función, nunca con las fracciones crudas.
 */
function resolveSelfDamagePositions(mapId, area) {
  const layout = MAPS[mapId] || MAPS[DEFAULT_MAP_ID];
  return layout.selfDamageObjects.map((obj) => ({
    id: obj.id,
    x: obj.xFrac * area.halfSize,
    z: obj.zFrac * area.halfSize,
  }));
}

function resolveCollisionObjects(mapId, area) {
  const layout = MAPS[mapId] || MAPS[DEFAULT_MAP_ID];
  return layout.collisionObjects.map((obj) => ({
    id: obj.id,
    type: obj.type,
    x: obj.xFrac * area.halfSize,
    z: obj.zFrac * area.halfSize,
    radius: obj.radiusFrac * area.halfSize,
  }));
}

/**
 * Genera N posiciones de spawn para Pacientes al arrancar la partida,
 * distribuidas en un círculo cerca del borde de MATCH_AREA. Ya usa
 * halfSize del área pasada, así que escala sola con el tamaño del mapa
 * sin necesitar cambios.
 */
function getPatientSpawnPositions(count, area) {
  const radius = area.halfSize * 0.7;
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / Math.max(count, 1);
    positions.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    });
  }
  return positions;
}

function getCuratorSpawn() {
  return { x: 0, z: 0 };
}

module.exports = {
  LOBBY_AREA,
  MATCH_AREA,
  MAPS,
  DEFAULT_MAP_ID,
  resolveSelfDamagePositions,
  resolveCollisionObjects,
  getPatientSpawnPositions,
  getCuratorSpawn,
  registerMap,
  listMaps,
};
