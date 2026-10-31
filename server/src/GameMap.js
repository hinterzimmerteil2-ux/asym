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

const LOBBY_PLATFORMS = [
  { id: 'lp1', x: 7, z: -9, hx: 1.3, hz: 1.3, h: 0.8, ramp: null },
  { id: 'lp2', x: 10, z: -9.5, hx: 1.2, hz: 1.2, h: 1.6, ramp: null },
  { id: 'lp3', x: 12.2, z: -6.8, hx: 1.2, hz: 1.2, h: 2.4, ramp: null },
  { id: 'lp4', x: 12.2, z: -3.2, hx: 1.1, hz: 1.1, h: 3.2, ramp: null },
  { id: 'lp5', x: 11.5, z: 0.6, hx: 1.8, hz: 1.8, h: 4.0, ramp: null },
];

const REF_HALF = 30;

const MATCH_AREA = {
  halfSize: 60,
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
    { id: 'col_8', type: 'cart', xFrac: -0.533, zFrac: 0.5, radiusFrac: 0.03 },
    { id: 'col_9', type: 'pillar', xFrac: 0.4, zFrac: 0.4, radiusFrac: 0.033 },
    { id: 'col_10', type: 'pillar', xFrac: -0.4, zFrac: 0.4, radiusFrac: 0.033 },
    { id: 'col_11', type: 'pillar', xFrac: 0.4, zFrac: -0.4, radiusFrac: 0.033 },
    { id: 'col_12', type: 'pillar', xFrac: -0.4, zFrac: -0.4, radiusFrac: 0.033 },
    { id: 'col_13', type: 'gurney', xFrac: 0.067, zFrac: 0.567, radiusFrac: 0.04 },
    { id: 'col_14', type: 'shelf', xFrac: -0.1, zFrac: -0.6, radiusFrac: 0.05 },
  ],

  platforms: [
    { id: 'plat_1', xFrac: -0.75, zFrac: 0.25, hxFrac: 0.15, hzFrac: 0.2, h: 2.4 },
    { id: 'ramp_1', xFrac: -0.48, zFrac: 0.25, hxFrac: 0.12, hzFrac: 0.1, h: 2.4, ramp: '-x' },
    { id: 'plat_2', xFrac: 0.75, zFrac: 0.25, hxFrac: 0.15, hzFrac: 0.2, h: 2.4 },
    { id: 'ramp_2', xFrac: 0.48, zFrac: 0.25, hxFrac: 0.12, hzFrac: 0.1, h: 2.4, ramp: '+x' },
    { id: 'plat_3', xFrac: 0, zFrac: -0.75, hxFrac: 0.2, hzFrac: 0.12, h: 1.6 },
    { id: 'ramp_3', xFrac: 0.3, zFrac: -0.75, hxFrac: 0.1, hzFrac: 0.08, h: 1.6, ramp: '-x' },
  ],
};

(function expandDefaultMap() {
  const half = 60;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (const ramp of DEFAULT_MAP_LAYOUT.platforms.filter((q) => q.ramp)) {
    const plat = DEFAULT_MAP_LAYOUT.platforms.find((q) => q.id === ramp.id.replace('ramp', 'plat'));
    const dir = Math.sign(ramp.xFrac - plat.xFrac);
    ramp.xFrac = (plat.xFrac * half + dir * (plat.hxFrac * REF_HALF + ramp.hxFrac * REF_HALF)) / half;
    ramp.zFrac = plat.zFrac;
  }
  const taken = [
    ...DEFAULT_MAP_LAYOUT.selfDamageObjects.map((o) => [o.xFrac * half, o.zFrac * half, 6]),
    ...DEFAULT_MAP_LAYOUT.platforms.map((p) => [p.xFrac * half, p.zFrac * half, 12]),
  ];
  const types = ['gurney', 'shelf', 'cart', 'pillar'];
  const radii = { gurney: 0.04, shelf: 0.05, cart: 0.03, pillar: 0.033 };
  let n = 0;
  let tries = 0;
  while (n < 46 && tries < 2000) {
    tries++;
    const x = (rnd() * 2 - 1) * 56;
    const z = (rnd() * 2 - 1) * 56;
    const r = Math.hypot(x, z);
    if (r < 6 || Math.abs(r - 21) < 4) continue;
    if (taken.some(([tx, tz, m]) => Math.hypot(x - tx, z - tz) < m)) continue;
    const type = types[Math.floor(rnd() * types.length)];
    taken.push([x, z, 5]);
    DEFAULT_MAP_LAYOUT.collisionObjects.push({ id: `col_x${n}`, type, xFrac: x / half, zFrac: z / half, radiusFrac: radii[type] });
    n++;
  }
  const outposts = [
    [-0.45, -0.55, 2.0, '+x'],
    [0.5, 0.65, 2.6, '-x'],
    [-0.2, 0.75, 1.4, '+x'],
    [0.2, -0.3, 1.2, '-x'],
    [0.88, -0.6, 3.0, '-x'],
    [-0.88, -0.6, 3.0, '+x'],
  ];
  outposts.forEach(([xf, zf, h, dir], i) => {
    const hx = 3.6;
    const hz = 3.6;
    DEFAULT_MAP_LAYOUT.platforms.push({ id: `op_${i}`, xFrac: xf, zFrac: zf, hxFrac: hx / REF_HALF, hzFrac: hz / REF_HALF, h });
    const rx = xf * half + (dir === '+x' ? hx + 3 : -(hx + 3));
    DEFAULT_MAP_LAYOUT.platforms.push({ id: `opr_${i}`, xFrac: rx / half, zFrac: zf, hxFrac: 3 / REF_HALF, hzFrac: 2.4 / REF_HALF, h, ramp: dir === '+x' ? '-x' : '+x' });
  });
})();

const MINIGAMES = ['rhythm', 'needle', 'mash', 'meter'];
const EVENT_KINDS = ['blackout', 'gates', 'alarm', 'shuffle'];

const HOSPITAL_LAYOUT = (() => {
  const half = MATCH_AREA.halfSize;
  const platforms = [];
  const plat = (id, x, z, hx, hz, h, ramp, kind, extra) =>
    platforms.push({ id, xFrac: x / half, zFrac: z / half, hxFrac: hx / REF_HALF, hzFrac: hz / REF_HALF, h, ramp: ramp || null, kind, ...(extra || {}) });
  const wall = (id, x, z, hx, hz) => plat(id, x, z, hx, hz, 9, null, 'wall');
  wall('w_n1', -22.75, -40, 17.75, 0.5);
  wall('w_n2', 22.75, -40, 17.75, 0.5);
  wall('w_s1', -12.75, 40, 27.75, 0.5);
  wall('w_s2', 32.75, 40, 7.75, 0.5);
  wall('w_w1', -40, -30.25, 0.5, 10.25);
  wall('w_w2', -40, 14.25, 0.5, 26.25);
  wall('w_e1', 40, -16.25, 0.5, 24.25);
  wall('w_e2', 40, 28.25, 0.5, 12.25);
  const collisionObjects = [];
  const selfDamageObjects = [];
  const radii = { gurney: 0.04, shelf: 0.05, cart: 0.03, pillar: 0.033 };
  const col = (id, type, x, z) => collisionObjects.push({ id, type, xFrac: x / half, zFrac: z / half, radiusFrac: radii[type] });
  const sd = (id, x, z) => selfDamageObjects.push({ id, xFrac: x / half, zFrac: z / half });
  const quadrants = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  quadrants.forEach(([sx, sz], q) => {
    wall(`wa_${q}_1`, 4 * sx, 9.75 * sz, 0.5, 6.25);
    wall(`wa_${q}_2`, 4 * sx, 26 * sz, 0.5, 4);
    wall(`wa_${q}_3`, 4 * sx, 37.25 * sz, 0.5, 3.25);
    wall(`wb_${q}_1`, 14.75 * sx, 4 * sz, 11.25, 0.5);
    wall(`wb_${q}_2`, 36.25 * sx, 4 * sz, 4.25, 0.5);
    plat(`wp_${q}`, 22 * sx, 9 * sz, 0.5, 5, 6, null, 'partition');
    const tower = (sx === sz);
    if (tower) {
      plat(`tw_${q}`, 30 * sx, 30 * sz, 6, 6, 6, null, 'tower');
      plat(`tr_${q}`, 16 * sx, 30 * sz, 8, 2.5, 6, sx > 0 ? '+x' : '-x', 'ramp');
    } else {
      plat(`rf_${q}`, 30 * sx, 30 * sz, 6, 6, 3, null, 'roof');
      plat(`rr_${q}`, 19 * sx, 30 * sz, 5, 2.5, 3, sx > 0 ? '+x' : '-x', 'ramp');
    }
    col(`c_${q}_1`, 'gurney', 10 * sx, 10 * sz);
    col(`c_${q}_2`, 'cart', 16 * sx, 8 * sz);
    col(`c_${q}_3`, 'shelf', 13 * sx, 13 * sz);
    col(`c_${q}_4`, 'gurney', 9 * sx, 37 * sz);
    col(`c_${q}_5`, 'shelf', 14 * sx, 37 * sz);
    col(`c_${q}_6`, 'pillar', 36 * sx, 12 * sz);
    col(`c_${q}_7`, 'cart', 36 * sx, 22 * sz);
    sd(`sd_room_${q}`, 32 * sx, 17 * sz);
    plat(`mz_${q}`, 14 * sx, 20 * sz, 5, 3.5, 3.5, null, 'mezzanine', { slab: 0.4 });
    plat(`mzr_${q}`, 24 * sx, 20 * sz, 5, 2.5, 3.5, sx > 0 ? '-x' : '+x', 'ramp');
    sd(`sd_mez_${q}`, 14 * sx, 20 * sz);
    sd(`sd_top_${q}`, 30 * sx, 30 * sz);
  });
  [[0, 20], [0, -20]].forEach(([x, z], i) => {
    col(`c_cor_${i}`, 'pillar', x, z);
    sd(`sd_cor_${i}`, x * 1.5, z * 1.5);
  });
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], q) => plat(`gate_${q}`, 4 * sx, 19 * sz, 0.3, 3, 3, null, 'gate'));
  plat('pit_w', -24, 0, 12, 3.5, 3.5, null, 'pit');
  plat('pit_wr', -8, 0, 4, 3.5, 3.5, '+x', 'pit');
  plat('pit_e', 24, 0, 12, 3.5, 3.5, null, 'pit');
  plat('pit_er', 8, 0, 4, 3.5, 3.5, '-x', 'pit');
  sd('sd_base_0', -32, 0);
  sd('sd_base_1', 32, 0);
  sd('sd_base_2', -22, 1.5);
  sd('sd_base_3', 22, -1.5);
  sd('sd_plaza', 0, 8);
  const events = sanitizeEvents([
    { id: 'ev_blackout_base', kind: 'blackout', startSec: 60, warnSec: 8, durSec: 40, repeatSec: 100, rFrac: 0, yMax: -0.5 },
    { id: 'ev_gates_lock', kind: 'gates', mode: 'lock', startSec: 90, warnSec: 8, durSec: 35, repeatSec: 130 },
    { id: 'ev_alarm', kind: 'alarm', startSec: 130, warnSec: 6, durSec: 15, repeatSec: 140 },
    { id: 'ev_shuffle', kind: 'shuffle', startSec: 120, warnSec: 5, durSec: 1, repeatSec: 120 },
  ]);
  return { id: 'hospital', name: 'Hospital de varios pisos', selfDamageObjects, collisionObjects, platforms, events };
})();

const HOSPITAL_SPAWNS = [
  [-50, -50], [50, 50], [50, -50], [-50, 50], [-50, 0], [50, 0], [0, -50], [0, 50],
  [-50, -25], [50, 25], [25, -50], [-25, 50],
];

// Catálogo de mapas disponibles — hoy solo uno, agregar otro es otra
// entrada acá con la misma forma que DEFAULT_MAP_LAYOUT.
const MAPS = {
  default: DEFAULT_MAP_LAYOUT,
  hospital: HOSPITAL_LAYOUT,
};

const HOSPITAL_ID = 'hospital';

const DEFAULT_MAP_ID = 'default';

/**
 * Mapas creados desde el editor visual (/editor) y guardados en el
 * servidor. Viven en memoria — igual que las salas — así que no
 * requieren Postgres; se pierden si el servidor se reinicia, que es
 * una limitación aceptable para un modo constructor de este alcance.
 */
function registerMap(layout, dryRun) {
  if (!layout || typeof layout.id !== 'string' || !layout.id.trim()) {
    throw new Error('El mapa necesita un id');
  }
  if (!Array.isArray(layout.selfDamageObjects) || !Array.isArray(layout.collisionObjects)) {
    throw new Error('El mapa necesita selfDamageObjects y collisionObjects');
  }
  const norm = {
    id: layout.id,
    name: typeof layout.name === 'string' && layout.name.trim() ? layout.name.trim() : layout.id,
    custom: true,
    halfSize: Math.max(20, Math.min(250, Number(layout.halfSize) || MATCH_AREA.halfSize)),
    curatorSpawns: (Array.isArray(layout.curatorSpawns) ? layout.curatorSpawns : []).slice(0, 64).map((s) => ({ xFrac: clampFrac(s.xFrac), zFrac: clampFrac(s.zFrac) })),
    patientSpawns: (Array.isArray(layout.patientSpawns) ? layout.patientSpawns : []).slice(0, 128).map((s) => ({ xFrac: clampFrac(s.xFrac), zFrac: clampFrac(s.zFrac) })),
    selfDamageObjects: layout.selfDamageObjects.map((o) => ({
      id: String(o.id),
      xFrac: clampFrac(o.xFrac),
      zFrac: clampFrac(o.zFrac),
      minigame: MINIGAMES.includes(o.minigame) ? o.minigame : null,
    })),
    events: sanitizeEvents(layout.events),
    collisionObjects: layout.collisionObjects.map((o) => ({
      id: String(o.id),
      type: typeof o.type === 'string' ? o.type : 'gurney',
      xFrac: clampFrac(o.xFrac),
      zFrac: clampFrac(o.zFrac),
      radiusFrac: Math.max(0.01, Math.min(0.5, Number(o.radiusFrac) || 0.04)),
    })),
    platforms: (Array.isArray(layout.platforms) ? layout.platforms : []).slice(0, 1500).map((p, i) => ({
      id: typeof p.id === 'string' ? p.id : `pl_${i}`,
      xFrac: clampFrac(p.xFrac),
      zFrac: clampFrac(p.zFrac),
      hxFrac: Math.max(0.02, Math.min(4, Number(p.hxFrac) || 0.1)),
      hzFrac: Math.max(0.02, Math.min(4, Number(p.hzFrac) || 0.1)),
      h: Math.max(0.4, Math.min(40, Number(p.h) || 1.6)),
      ramp: p.ramp === '+x' || p.ramp === '-x' ? p.ramp : null,
      kind: ['pit', 'gate', 'mezzanine'].includes(p.kind) ? p.kind : null,
      slab: p.kind === 'mezzanine' ? 0.4 : 0,
      y0: Math.max(0, Math.min(80, Number(p.y0) || 0)),
      tex: ['marble', 'tile', 'plaster', 'tower', 'roof', 'ramp', 'concrete', 'brick', 'wood', 'metal'].includes(p.tex) ? p.tex : null,
      tint: /^#[0-9a-fA-F]{6}$/.test(p.tint || '') ? p.tint : null,
    })),
  };
  if (!dryRun) MAPS[layout.id] = norm;
  return norm;
}


function sanitizeEvents(list) {
  const num = (v, lo, hi, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
  };
  return (Array.isArray(list) ? list : []).slice(0, 24).filter((e) => e && EVENT_KINDS.includes(e.kind)).map((e, i) => ({
    id: typeof e.id === 'string' ? e.id.slice(0, 40) : `ev_${i}`,
    kind: e.kind,
    mode: e.mode === 'open' ? 'open' : 'lock',
    startSec: num(e.startSec, 0, 3600, 60),
    warnSec: num(e.warnSec, 0, 60, 8),
    durSec: num(e.durSec, 1, 900, 40),
    repeatSec: num(e.repeatSec, 0, 3600, 0),
    xFrac: clampFrac(e.xFrac),
    zFrac: clampFrac(e.zFrac),
    rFrac: num(e.rFrac, 0, 2, 0),
    yMin: e.yMin === null || e.yMin === undefined || e.yMin === '' ? null : num(e.yMin, -40, 80, null),
    yMax: e.yMax === null || e.yMax === undefined || e.yMax === '' ? null : num(e.yMax, -40, 80, null),
  }));
}

function getEvents(mapId) {
  const layout = MAPS[mapId] || MAPS[DEFAULT_MAP_ID];
  return layout.events || [];
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
    minigame: obj.minigame || null,
  }));
}

const OBJECT_HEIGHTS = { gurney: 0.9, shelf: 2.2, cart: 1, pillar: 3, crate: 1.1, desk: 1, plant: 1.4, tank: 2 };

function resolveCollisionObjects(mapId, area) {
  const layout = MAPS[mapId] || MAPS[DEFAULT_MAP_ID];
  return layout.collisionObjects.map((obj) => ({
    id: obj.id,
    type: obj.type,
    x: obj.xFrac * area.halfSize,
    z: obj.zFrac * area.halfSize,
    radius: obj.radiusFrac * REF_HALF,
    height: OBJECT_HEIGHTS[obj.type] || 1.2,
  }));
}

/**
 * Genera N posiciones de spawn para Pacientes al arrancar la partida,
 * distribuidas en un círculo cerca del borde de MATCH_AREA. Ya usa
 * halfSize del área pasada, así que escala sola con el tamaño del mapa
 * sin necesitar cambios.
 */
function getPatientSpawnPositions(count, area, mapId) {
  const custom = resolveSpawns((MAPS[mapId] || {}).patientSpawns, area);
  if (custom.length) {
    const pool = custom.slice().sort(() => Math.random() - 0.5);
    return Array.from({ length: count }, (_, i) => pool[i % pool.length]);
  }
  if (mapId === HOSPITAL_ID) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const [x, z] = HOSPITAL_SPAWNS[i % HOSPITAL_SPAWNS.length];
      out.push({ x, z });
    }
    return out;
  }
  const radius = Math.min(area.halfSize * 0.7, 21);
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

function resolvePlatforms(mapId, area) {
  const layout = MAPS[mapId] || MAPS[DEFAULT_MAP_ID];
  return (layout.platforms || []).map((p) => ({
    id: p.id,
    x: p.xFrac * area.halfSize,
    z: p.zFrac * area.halfSize,
    hx: p.hxFrac * REF_HALF,
    hz: p.hzFrac * REF_HALF,
    h: p.h,
    ramp: p.ramp || null,
    kind: p.kind || null,
    slab: p.slab || 0,
    y0: p.y0 || 0,
    tex: p.tex || null,
    tint: p.tint || null,
  }));
}

function areaFor(mapId) {
  const h = (MAPS[mapId] || {}).halfSize;
  return h ? { ...MATCH_AREA, halfSize: h } : MATCH_AREA;
}

function resolveSpawns(list, area) {
  return (list || []).map((s) => ({ x: s.xFrac * area.halfSize, z: s.zFrac * area.halfSize }));
}

function getCuratorSpawn(mapId, pick) {
  const spawns = resolveSpawns((MAPS[mapId] || {}).curatorSpawns, areaFor(mapId));
  if (!spawns.length) return { x: 0, z: 0 };
  return spawns[pick === undefined ? Math.floor(Math.random() * spawns.length) : pick % spawns.length];
}

module.exports = {
  getEvents,
  sanitizeEvents,
  LOBBY_AREA,
  LOBBY_PLATFORMS,
  MATCH_AREA,
  areaFor,
  MAPS,
  DEFAULT_MAP_ID,
  HOSPITAL_ID,
  resolveSelfDamagePositions,
  resolveCollisionObjects,
  resolvePlatforms,
  getPatientSpawnPositions,
  getCuratorSpawn,
  registerMap,
  listMaps,
};
