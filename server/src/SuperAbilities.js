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

const DEFS = {
  sunat_paperwork: { id: 'sunat_paperwork', name: 'Sunat Paperwork', modes: ['notificacion', 'vuelva', 'anulacion'] },
};

function grant(entity, id) {
  if (!DEFS[id]) {
    entity.sup = null;
    return;
  }
  entity.sup = { id, sheets: SHEETS, copyLeft: true, claims: 0, nextAt: 0 };
}

function claim(entity) {
  const s = entity && entity.sup;
  if (!s) return;
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
  if (mode === 'notificacion') {
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
  if (s.copyLeft) s.copyLeft = false;
  else s.sheets -= 1;
  s.nextAt = now + USE_GAP_MS;
  room.broadcast('super_result', { playerId, mode, sheets: s.sheets });
  return true;
}

function tick(room, now) {
  record(room, now);
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
  return { id: s.id, sheets: s.sheets, max: SHEETS, claims: s.claims, need: CLAIMS_FOR_SHEET, copy: s.copyLeft };
}

module.exports = { DEFS, grant, use, claim, tick, view };
