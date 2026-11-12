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

const MANA_MAX = 203;
const SHIELD_MAX = 28;
const MANA_STEP = 9;
const PUSH_PER_STEP = 0.04;
const STUN_PER_STEP = 0.02;
const CHARGE_RATE = 2;
const CHARGE_MAX_MANA = 50;
const CHARGE_PUSH_PER_MANA = 0.01;
const CHARGE_STUN_PER_MANA = 0.0075;
const CHARGE_PUSH_CAP = 0.4;
const CHARGE_STUN_CAP = 0.375;
const SHIELD_DECAY_MS = 3000;
const SPENT_PER_MANA = 18;
const MANA_MODULE = 4;
const MANA_PAIR = 8;
const STAB_RANGE = 2.6;
const LUNGE_RANGE = 11;
const LUNGE_DISTANCE = 9;
const LUNGE_MS = 340;
const STAB_STUN_MS = 700;
const LUNGE_STUN_MS = 900;
const STAB_PUSH = 6;
const LUNGE_PUSH = 5;
const DOME_MS = 3000;
const DOME_RADIUS = 3.2;
const DECOY_MS = 4500;
const DECOY_BURST_RANGE = 2;
const DECOY_SLOW_MS = 1400;
const DECOY_HIDE_MS = 1500;
const CD = { bayoneta: 7000, bayonetaLunge: 11000, barrera: 22000, senuelo: 26000 };
const GLIDE_START_COST = 6;
const GLIDE_COST_PER_SEC = 3;
const GLIDE_FALL = -2.4;
const GLIDE_START_LAG_MS = 500;
const GLIDE_LAND_LAG_MS = 700;
const GLIDE_MIN_AIR_MS = 250;

let src = null;
let domes = [];

const DEFS = {
  town_level: { id: 'town_level', name: 'Town Level Verse Lol', modes: ['bayoneta', 'barrera', 'senuelo', 'carga'], charges: 0, wig: true, scale: 0.6 },
  sunat_paperwork: { id: 'sunat_paperwork', name: 'Sunat Paperwork', modes: ['notificacion', 'vuelva', 'anulacion'] },
};

function grant(entity, id) {
  if (!DEFS[id]) {
    entity.sup = null;
    return;
  }
  entity.sup = { id, sheets: DEFS[id].charges || SHEETS, copyLeft: true, claims: 0, nextAt: 0 };
  if (id === 'town_level') {
    Object.assign(entity.sup, { mana: 0, shield: 0, shieldAt: 0, chain: 0, spent: 0, lastFlo: null, charging: false, chMana: 0, chAt: 0, chPush: 0, chStun: 0, cd: { bayoneta: 0, barrera: 0, senuelo: 0 }, glide: false, glideAt: 0, airAt: 0, dome: 0, decoy: null });
    entity.hitScale = (entity.hitScale || 1) * DEFS[id].scale;
  }
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
    if (d <= range) out.push({ id, e, d });
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
  if (s.id === 'town_level') return useTown(room, playerId, entity, mode, now);
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
  tickTown(room, now);
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
  if (s.id === 'town_level') {
    return { id: s.id, mana: Math.floor(s.mana), manaMax: MANA_MAX, shield: Math.floor(s.shield), shieldMax: SHIELD_MAX, charging: s.charging, charge: Math.round(s.chMana), chargeMax: CHARGE_MAX_MANA, cd: { bayoneta: Math.max(0, s.cd.bayoneta - now), barrera: Math.max(0, s.cd.barrera - now), senuelo: Math.max(0, s.cd.senuelo - now) }, glide: s.glide };
  }
  return { id: s.id, sheets: s.sheets, max: SHEETS, claims: s.claims, need: CLAIMS_FOR_SHEET, copy: s.copyLeft };
}

function steps(s) {
  return Math.floor(s.mana / MANA_STEP);
}

function gainMana(entity, n) {
  const s = entity.sup;
  if (!s || s.id !== 'town_level' || n <= 0) return;
  s.mana += n;
  if (s.mana > MANA_MAX) {
    const over = s.mana - MANA_MAX;
    s.mana = MANA_MAX;
    s.shield = Math.min(SHIELD_MAX, s.shield + over);
    s.shieldAt = 0;
  }
}

function onModule(entity) {
  gainMana(entity, MANA_MODULE);
}

function miss(entity) {
  if (entity && entity.sup && entity.sup.id === 'town_level') entity.sup.chain = 0;
}

function withSource(entity, fn) {
  const prev = src;
  src = entity && entity.sup && entity.sup.id === 'town_level' ? entity : null;
  try {
    return fn();
  } finally {
    if (src) {
      src.sup.chPush = 0;
      src.sup.chStun = 0;
    }
    src = prev;
  }
}

function scaleStun(ms) {
  if (!src) return ms;
  const s = src.sup;
  s.chain += 1;
  if (s.chain % 2 === 0) gainMana(src, MANA_PAIR);
  return Math.round(ms * (1 + steps(s) * STUN_PER_STEP + s.chStun));
}

function scalePush(speed) {
  if (!src) return speed;
  const s = src.sup;
  return speed * (1 + steps(s) * PUSH_PER_STEP + s.chPush);
}

function absorbHeal(entity, amount) {
  const s = entity && entity.sup;
  if (!s || s.id !== 'town_level' || s.shield <= 0 || amount <= 0) return amount;
  const taken = Math.min(s.shield, amount);
  s.shield -= taken;
  return amount - taken;
}

function domeBlocks(entity, now) {
  if (!domes.length || entity.skillCooldowns) return false;
  for (const d of domes) {
    if (d.until <= now) continue;
    if (Math.hypot(entity.x - d.x, entity.z - d.z) <= DOME_RADIUS && Math.abs((entity.y || 0) - d.y) < 2.5) return true;
  }
  return false;
}

function useTown(room, playerId, entity, mode, now) {
  const s = entity.sup;
  if (now < s.nextAt) return false;
  if (mode === 'carga') {
    if (s.charging) { s.charging = false; return true; }
    if (s.mana < CHARGE_RATE) return false;
    s.charging = true;
    s.chAt = now;
    return true;
  }
  if (Status.blocksSkills(entity, now)) return false;
  const fx = entity.faceX || 0;
  const fz = entity.faceZ || 1;
  const flen = Math.hypot(fx, fz) || 1;
  const nx = fx / flen;
  const nz = fz / flen;
  let ok = false;
  if (mode === 'bayoneta') {
    if (now < s.cd.bayoneta) return false;
    const inFront = (range, dot, width) => foes(room, entity, range).filter((f) => {
      const rx = f.e.x - entity.x;
      const rz = f.e.z - entity.z;
      const along = rx * nx + rz * nz;
      return along > 0 && along / (Math.hypot(rx, rz) || 1) >= dot && (width === undefined || Math.abs(rx * nz - rz * nx) <= width);
    });
    const close = inFront(STAB_RANGE, 0.2);
    withSource(entity, () => {
      if (close.length) {
        for (const f of close) {
          room.stun(f.id, f.e, STAB_STUN_MS, now, 0);
          Status.push(f.e, (f.e.x - entity.x) / (f.d || 1), (f.e.z - entity.z) / (f.d || 1), STAB_PUSH, 280, now);
        }
        s.cd.bayoneta = now + CD.bayoneta;
        Status.apply(entity, 'slow', 350, now, { tag: 'endlag', level: 2 });
        ok = true;
      } else {
        const path = inFront(LUNGE_RANGE, 0.7, 1.3);
        entity.dashUntil = now + LUNGE_MS;
        entity.dashVX = (nx * LUNGE_DISTANCE) / (LUNGE_MS / 1000);
        entity.dashVZ = (nz * LUNGE_DISTANCE) / (LUNGE_MS / 1000);
        entity.dashExhausted = false;
        for (const f of path) {
          room.stun(f.id, f.e, LUNGE_STUN_MS, now, 0);
          Status.push(f.e, nx, nz, LUNGE_PUSH, 320, now);
        }
        s.cd.bayoneta = now + CD.bayonetaLunge;
        if (!path.length) s.chain = 0;
        ok = true;
      }
    });
  } else if (mode === 'barrera') {
    if (now < s.cd.barrera) return false;
    s.dome = now + DOME_MS;
    s.cd.barrera = now + CD.barrera;
    ok = true;
  } else if (mode === 'senuelo') {
    if (now < s.cd.senuelo) return false;
    s.decoy = { x: entity.x, y: entity.y || 0, z: entity.z, until: now + DECOY_MS };
    entity.paraFrom = now;
    entity.paraUntil = now + DECOY_HIDE_MS;
    entity.paraOn = false;
    s.cd.senuelo = now + CD[mode];
    ok = true;
  }
  if (!ok) return false;
  s.nextAt = now + USE_GAP_MS;
  room.broadcast('super_result', { playerId, mode, sheets: 0 });
  return true;
}

function tickTown(room, now) {
  const live = [];
  for (const [id, e] of Object.entries(room.gameState.entities)) {
    const s = e.sup;
    if (!s || s.id !== 'town_level' || e.down || e.gone) continue;
    if (s.lastFlo !== null && e.flojera < s.lastFlo) {
      s.spent += s.lastFlo - e.flojera;
      while (s.spent >= SPENT_PER_MANA) {
        s.spent -= SPENT_PER_MANA;
        gainMana(e, 1);
      }
    }
    s.lastFlo = e.flojera;
    if (s.charging) {
      if (now - s.chAt >= 1000 && s.mana >= CHARGE_RATE && s.chMana < CHARGE_MAX_MANA) {
        s.chAt = now;
        s.mana -= CHARGE_RATE;
        s.chMana += CHARGE_RATE;
        s.chPush = Math.min(CHARGE_PUSH_CAP, s.chMana * CHARGE_PUSH_PER_MANA);
        s.chStun = Math.min(CHARGE_STUN_CAP, s.chMana * CHARGE_STUN_PER_MANA);
      }
      if (s.mana < CHARGE_RATE || s.chMana >= CHARGE_MAX_MANA) s.charging = false;
    } else if (s.chMana > 0 && !s.chPush && !s.chStun) {
      s.chMana = 0;
    }
    if (s.shield > 0) {
      if (!s.shieldAt) s.shieldAt = now;
      if (now - s.shieldAt >= SHIELD_DECAY_MS) {
        s.shield = Math.max(0, s.shield - 1);
        s.shieldAt = now;
      }
    }
    if (s.dome > now) live.push({ x: e.x, y: e.y || 0, z: e.z, until: s.dome });
    if (s.decoy) {
      if (s.decoy.until <= now) s.decoy = null;
      else {
        for (const f of foes(room, s.decoy, DECOY_BURST_RANGE)) {
          Status.apply(f.e, 'slow', DECOY_SLOW_MS, now, { level: 3 });
          Status.apply(f.e, 'reveal', 1500, now);
          s.decoy = null;
          break;
        }
      }
    }
  }
  domes = live;
}

function glide(room, entity, now, dt) {
  const s = entity.sup;
  if (!s || s.id !== 'town_level') return false;
  if (entity.onGround) {
    if (s.glide) {
      s.glide = false;
      Status.apply(entity, 'slow', GLIDE_LAND_LAG_MS, now, { tag: 'endlag', level: 2 });
    }
    s.airAt = 0;
    return false;
  }
  if (!s.airAt) s.airAt = now;
  const want = entity.input.jump && entity.velocityY < 0 && now - s.airAt >= GLIDE_MIN_AIR_MS && !Status.blocksMove(entity, now);
  if (!want) {
    s.glide = false;
    return false;
  }
  if (!s.glide) {
    if (s.mana < GLIDE_START_COST) return false;
    s.mana -= GLIDE_START_COST;
    s.glide = true;
    Status.apply(entity, 'slow', GLIDE_START_LAG_MS, now, { tag: 'endlag', level: 2 });
  } else {
    s.mana -= GLIDE_COST_PER_SEC * dt;
    if (s.mana <= 0) {
      s.mana = 0;
      s.glide = false;
      return false;
    }
  }
  if (entity.velocityY < GLIDE_FALL) return false;
  entity.velocityY = Math.max(entity.velocityY, GLIDE_FALL);
  return true;
}

module.exports = { DEFS, grant, use, claim, tick, view, gainMana, onModule, miss, withSource, scaleStun, scalePush, absorbHeal, domeBlocks, glide, domeRadius: DOME_RADIUS };
