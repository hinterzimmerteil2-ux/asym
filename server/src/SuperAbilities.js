const Status = require('./Status');

const SHEETS = 3;
const TRAIL_STEP_MS = 250;
const TRAIL_KEEP_MS = 6000;
const REWIND_MS = 4500;
const NOTIFY_DELAY_MS = 3500;
const NOTIFY_RANGE = 20;
const EMBARGO_MS = 1800;
const VUELVA_RANGE = 16;
const CLAIMS_FOR_SHEET = 3;
const USE_GAP_MS = 700;

const ORB_DASH_MS = 450;
const ORB_DASH_DISTANCE = 17;
const CRATER_RANGE = 7;
const CRATER_STUN_MS = 1300;
const PRAYER_MS = 4500;
const PRAYER_FACTOR = 1.55;
const ORB_RUN_DISTANCE = 90;

const DEFS = {
  town_level: { id: 'town_level', name: 'Town Level Verse Lol', modes: ['orbe', 'crater', 'plegaria'], charges: 3, wig: true },
  sunat_paperwork: { id: 'sunat_paperwork', name: 'Sunat Paperwork', modes: ['notificacion', 'vuelva', 'anulacion'] },
};

function grant(entity, id) {
  if (!DEFS[id]) {
    entity.sup = null;
    return;
  }
  entity.sup = { id, sheets: DEFS[id].charges || SHEETS, copyLeft: true, claims: 0, nextAt: 0, run: 0, lx: null, lz: null };
}

function claim(entity) {
  const s = entity && entity.sup;
  if (!s || s.id !== 'sunat_paperwork') return;
  s.claims += 1;
  if (s.claims >= CLAIMS_FOR_SHEET) {
    s.claims = 0;
    if (s.sheets < SHEETS) s.sheets += 1;
  }
}

function record(room, now) {
  if (now - (room.supTrailAt || 0) < TRAIL_STEP_MS) return;
  room.supTrailAt = now;
  for (const e of Object.values(room.gameState.entities)) {
    if (e.down || e.gone || e.corpse) continue;
    const tr = e.trail || (e.trail = []);
    tr.push({ t: now, x: e.x, y: e.y || 0, z: e.z });
    while (tr.length && now - tr[0].t > TRAIL_KEEP_MS) tr.shift();
  }
}

function pastSpot(entity, now, ago) {
  const tr = entity.trail;
  if (!tr || !tr.length) return null;
  const want = now - ago;
  let best = tr[0];
  for (const p of tr) if (Math.abs(p.t - want) < Math.abs(best.t - want)) best = p;
  return best;
}

function rewind(entity, spot) {
  entity.x = spot.x;
  entity.y = spot.y;
  entity.z = spot.z;
  if (entity.vx !== undefined) entity.vx = 0;
  if (entity.vz !== undefined) entity.vz = 0;
  if (entity.vy !== undefined) entity.vy = 0;
}

function foes(room, from, range) {
  const out = [];
  for (const [id, p] of room.players) {
    const e = room.gameState.entities[id];
    if (!e || e.down || e.gone || e.corpse) continue;
    if (!(p.isAsymRole || p.isBoss)) continue;
    const d = Math.hypot(e.x - from.x, e.z - from.z);
    if (d <= range) out.push({ e, d });
  }
  return out.sort((a, b) => a.d - b.d);
}

function use(room, playerId, mode, now) {
  const entity = room.gameState.entities[playerId];
  const player = room.players.get(playerId);
  if (!entity || !player || !entity.sup || !DEFS[entity.sup.id]) return false;
  if (player.isAsymRole || player.isBoss) return false;
  if (room.gameState.patients[playerId]?.status !== 'alive') return false;
  if (!DEFS[entity.sup.id].modes.includes(mode)) return false;
  const s = entity.sup;
  if (s.sheets <= 0 || now < s.nextAt) return false;
  if (mode !== 'anulacion' && Status.blocksSkills(entity, now)) return false;
  if (mode === 'orbe' || mode === 'crater' || mode === 'plegaria') {
    if (mode === 'crater' && !foes(room, entity, CRATER_RANGE).length) return false;
  } else if (mode === 'notificacion') {
    const t = foes(room, entity, NOTIFY_RANGE)[0];
    if (!t || (t.e.ntf && t.e.ntf.until > now)) return false;
    t.e.ntf = { until: now + NOTIFY_DELAY_MS, by: playerId };
  } else if (mode === 'vuelva') {
    const t = foes(room, entity, VUELVA_RANGE)[0];
    if (!t || (t.e.size || 1) > 2) return false;
    const spot = pastSpot(t.e, now, REWIND_MS);
    if (!spot) return false;
    rewind(t.e, spot);
  } else if (mode === 'anulacion') {
    const spot = pastSpot(entity, now, REWIND_MS);
    if (!spot) return false;
    rewind(entity, spot);
    Status.clear(entity, 'stun', 'ragdoll', 'slow');
    entity.rag = null;
    entity.flojera = Math.max(entity.flojera || 0, (entity.flojeraMax || 0) * 0.6);
  }
  if (mode === 'orbe') {
    const len = Math.hypot(entity.input.moveX, entity.input.moveZ);
    const dx = len > 0 ? entity.input.moveX / len : entity.faceX;
    const dz = len > 0 ? entity.input.moveZ / len : entity.faceZ;
    entity.dashUntil = now + ORB_DASH_MS;
    entity.dashVX = (dx * ORB_DASH_DISTANCE) / (ORB_DASH_MS / 1000);
    entity.dashVZ = (dz * ORB_DASH_DISTANCE) / (ORB_DASH_MS / 1000);
    entity.dashExhausted = false;
  } else if (mode === 'crater') {
    const hit = foes(room, entity, CRATER_RANGE);
    if (!hit.length) return false;
    for (const f of hit) Status.apply(f.e, 'stun', CRATER_STUN_MS, now);
  } else if (mode === 'plegaria') {
    entity.sprintUntil = now + PRAYER_MS;
    entity.sprintFactor = PRAYER_FACTOR;
    entity.flojera = entity.flojeraMax || entity.flojera;
  }
  if (s.copyLeft) s.copyLeft = false;
  else s.sheets -= 1;
  s.nextAt = now + USE_GAP_MS;
  room.broadcast('super_result', { playerId, mode, sheets: s.sheets });
  return true;
}

function tick(room, now) {
  record(room, now);
  for (const e of Object.values(room.gameState.entities)) {
    const s = e.sup;
    if (!s || s.id !== 'town_level' || e.down || e.gone) continue;
    if (s.lx !== null) {
      const d = Math.hypot(e.x - s.lx, e.z - s.lz);
      if (d < 4) s.run += d;
    }
    s.lx = e.x;
    s.lz = e.z;
    if (s.run >= ORB_RUN_DISTANCE) {
      s.run = 0;
      if (s.sheets < DEFS.town_level.charges) s.sheets += 1;
    }
  }
  for (const e of Object.values(room.gameState.entities)) {
    if (!e.ntf || e.ntf.until > now) continue;
    e.ntf = null;
    if (e.down) continue;
    Status.apply(e, 'stun', EMBARGO_MS, now);
  }
}

function view(entity, now) {
  const s = entity.sup;
  if (!s) return null;
  if (s.id === 'town_level') return { id: s.id, sheets: s.sheets, max: DEFS.town_level.charges, claims: Math.floor(s.run), need: ORB_RUN_DISTANCE, copy: s.copyLeft };
  return { id: s.id, sheets: s.sheets, max: SHEETS, claims: s.claims, need: CLAIMS_FOR_SHEET, copy: s.copyLeft };
}

module.exports = { DEFS, grant, use, claim, tick, view };
