const Hitbox = require('./Hitbox');
const Status = require('./Status');
const C = require('./Constants');

const OI = { eyes: 30, refillMs: 28000, heat: 30, heatCost: 0.02, heatDrain: 0.015, costMax: 14, costMin: 5, loss: 5, regenEvery: 9000, bias: 3, slack: 2.5, quietMs: 5000, stepMs: 200, maxStep: 10, useFlojera: 8, useEyes: 2, cdMs: 1800, perMinute: 12, backDist: 4.5 };

const ANGLES = [90, -90, 45, -45, 135, -135, 0, 180].map((a) => (a * Math.PI) / 180);

function costFor(eyes, heat = 0) {
  const f = Math.max(0, Math.min(1, eyes / OI.eyes));
  const base = OI.costMin + (OI.costMax - OI.costMin) * (1 - f);
  return Math.round(base * (1 + OI.heatCost * heat) * 10) / 10;
}

function has(entity) {
  return (entity.hand || []).some((sl) => sl && sl.chosen === 'oi_ojo');
}

function state(entity) {
  if (!entity.oi) entity.oi = { eyes: OI.eyes, heat: 0, outAt: 0, lastHit: 0, lastUse: 0, lastRegen: 0, uses: [] };
  return entity.oi;
}

function depleted(entity) {
  return has(entity) && state(entity).eyes <= 0;
}

function active(entity) {
  return has(entity) && state(entity).eyes > 0;
}

function drainMult(entity) {
  if (!has(entity)) return 1;
  const s = state(entity);
  return (s.eyes <= 0 ? 2 : 1) * (1 + OI.heatDrain * s.heat);
}

function blocked(entity, now) {
  const s = state(entity);
  if (s.eyes <= 0) return 'Sin Ojos de Precognición';
  s.uses = s.uses.filter((t) => now - t < 60000);
  if (s.uses.length >= OI.perMinute) return 'Máximo 12 por minuto';
  return null;
}

function lose(room, id, e, n, now) {
  const s = state(e);
  if (s.eyes <= 0) {
    s.heat = Math.min(OI.heat, s.heat + n);
    return;
  }
  s.eyes = Math.max(0, s.eyes - n);
  if (s.eyes <= 0) {
    s.outAt = now + OI.refillMs;
    room.broadcast('oi_fx', { kind: 'close', playerId: id, x: e.x, y: e.y || 0, z: e.z });
  }
}

function use(room, playerId, entity, now) {
  const s = state(entity);
  s.uses.push(now);
  s.lastUse = now;
  entity.flojera = Math.max(0, entity.flojera - OI.useFlojera * (1 + OI.heatCost * s.heat));
  const platforms = room.allPlatforms();
  const cur = [...room.players].find(([, pl]) => pl.isAsymRole);
  const ce = cur && room.gameState.entities[cur[0]];
  let bx = -(entity.faceX || 0);
  let bz = -(entity.faceZ || 1);
  if (ce) {
    const dx = entity.x - ce.x;
    const dz = entity.z - ce.z;
    const l = Math.hypot(dx, dz);
    if (l > 0.01) {
      bx = dx / l;
      bz = dz / l;
    }
  }
  const bl = Math.hypot(bx, bz) || 1;
  bx /= bl;
  bz /= bl;
  let pick = null;
  for (const a of [0, 40, -40, 80, -80].map((g) => (g * Math.PI) / 180)) {
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const dx = bx * c - bz * sn;
    const dz = bx * sn + bz * c;
    for (let d = OI.backDist; d >= 1.5; d -= 1) {
      const x = entity.x + dx * d;
      const z = entity.z + dz * d;
      if (pathOk(platforms, entity, x, z)) {
        pick = { dx, dz, d, x, z };
        break;
      }
    }
    if (pick) break;
  }
  if (pick) {
    entity.dashUntil = now + OI.stepMs;
    entity.dashVX = (pick.dx * pick.d * 1000) / OI.stepMs;
    entity.dashVZ = (pick.dz * pick.d * 1000) / OI.stepMs;
    entity.dashExhausted = false;
    entity.oiStep = now + OI.stepMs;
    room.broadcast('oi_fx', { kind: 'step', playerId, x: entity.x, y: entity.y || 0, z: entity.z, tx: pick.x, tz: pick.z });
  }
  lose(room, playerId, entity, OI.useEyes, now);
}

function strike(room, win, owner, target) {
  if (win.kind === 'm1') return Hitbox.handHit(owner, target, C.M1_REACH, C.M1_RADIUS);
  if (win.kind === 'melee') return Hitbox.handHit(owner, target, win.skill.reach || 0, win.skill.radius);
  if (win.kind === 'area') return Hitbox.distanceBetween(owner, target) <= win.skill.radius;
  return false;
}

function pathOk(platforms, e, x, z) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x - e.x, z - e.z) / 0.5));
  for (let i = 1; i <= steps; i++) {
    const px = e.x + ((x - e.x) * i) / steps;
    const pz = e.z + ((z - e.z) * i) / steps;
    const y = e.y || 0;
    if (Hitbox.blockedAt(platforms, px, pz, y)) return false;
    if (Hitbox.groundAt(platforms, px, pz, y) < y - 1.2) return false;
  }
  return true;
}

function landOk(platforms, e, x, z) {
  const y = e.y || 0;
  return !Hitbox.blockedAt(platforms, x, z, y) && Hitbox.groundAt(platforms, x, z, y) >= y - 2.5;
}

function safeSpot(room, win, owner, te, eyes, relaxed) {
  const platforms = room.allPlatforms();
  const f = Math.max(0, Math.min(1, eyes / OI.eyes));
  let ax = te.x - owner.x;
  let az = te.z - owner.z;
  const al = Math.hypot(ax, az);
  if (al < 0.01) {
    ax = -(owner.faceX || 0);
    az = -(owner.faceZ || 1);
  } else {
    ax /= al;
    az /= al;
  }
  let px = ax;
  let pz = az;
  const inp = te.input;
  if (inp && Math.hypot(inp.moveX || 0, inp.moveZ || 0) > 0.3) {
    const il = Math.hypot(inp.moveX, inp.moveZ);
    px = inp.moveX / il;
    pz = inp.moveZ / il;
  }
  let best = null;
  let bestScore = -Infinity;
  let dMin = null;
  for (let d = 1; d <= OI.maxStep; d += 0.5) {
    if (dMin !== null && d > dMin + OI.slack * f) break;
    for (const a of ANGLES) {
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const dx = ax * c - az * sn;
      const dz = ax * sn + az * c;
      const x = te.x + dx * d;
      const z = te.z + dz * d;
      if (strike(room, win, owner, { ...te, x, z })) continue;
      if (relaxed ? !landOk(platforms, te, x, z) : !pathOk(platforms, te, x, z)) continue;
      if (dMin === null) dMin = d;
      const score = (dx * px + dz * pz) * f * OI.bias - (d - dMin);
      if (score > bestScore) {
        bestScore = score;
        best = { x, z, dx, dz, d };
      }
    }
  }
  return best;
}

function dodge(room, win, owner, id, e, now) {
  const s0 = state(e);
  if (Status.blocksMove(e, now) || e.towerSeat || e.tigerLeap || e.flojera <= 0) return false;
  let spot = safeSpot(room, win, owner, e, s0.eyes, false);
  let blink = false;
  if (!spot) {
    spot = safeSpot(room, win, owner, e, s0.eyes, true);
    blink = true;
  }
  if (!spot) return false;
  e.flojera = Math.max(0, e.flojera - costFor(s0.eyes, s0.heat));
  if (blink) {
    e.x = spot.x;
    e.z = spot.z;
  } else {
    e.dashUntil = now + OI.stepMs;
    e.dashVX = (spot.dx * spot.d * 1000) / OI.stepMs;
    e.dashVZ = (spot.dz * spot.d * 1000) / OI.stepMs;
    e.dashExhausted = false;
    e.oiStep = now + OI.stepMs;
  }
  s0.lastUse = now;
  room.broadcast('oi_fx', { kind: 'step', playerId: id, x: e.x, y: e.y || 0, z: e.z, tx: spot.x, tz: spot.z });
  return true;
}

function predict(room, win, owner, now) {
  if (!win.dodge) win.dodge = new Set();
  for (const [id, p] of room.players) {
    if (p.isAsymRole || p.isBoss || win.dodge.has(id) || room.gameState.patients[id]?.status !== 'alive') continue;
    const e = room.gameState.entities[id];
    if (!e || !active(e) || !strike(room, win, owner, e)) continue;
    if (dodge(room, win, owner, id, e, now)) win.dodge.add(id);
  }
}

function evadePulse(room, owner, id, e, radius, now) {
  if (!active(e)) return false;
  const win = { kind: 'area', skill: { radius } };
  if (!strike(room, win, owner, e)) return false;
  return dodge(room, win, owner, id, e, now);
}

function onHit(room, id, now) {
  const e = room.gameState.entities[id];
  if (!e || !has(e)) return;
  const s = state(e);
  s.lastHit = now;
  room.broadcast('oi_fx', { kind: 'hurt', playerId: id, x: e.x, y: e.y || 0, z: e.z });
  lose(room, id, e, OI.loss, now);
}

function tick(room, now) {
  for (const e of Object.values(room.gameState.entities)) {
    if (!e || !e.oi || !has(e)) continue;
    const s = e.oi;
    if (s.eyes <= 0) {
      if (s.outAt && now >= s.outAt) {
        s.eyes = OI.eyes;
        s.outAt = 0;
      }
    }
    const quiet = now - s.lastHit > OI.quietMs && now - s.lastUse > OI.quietMs && now - s.lastRegen >= OI.regenEvery;
    if (s.heat > 0 && quiet) {
      s.lastRegen = now;
      s.heat -= 1;
    } else if (s.eyes > 0 && s.eyes < OI.eyes && now - s.lastHit > OI.quietMs && now - s.lastUse > OI.quietMs && now - s.lastRegen >= OI.regenEvery) {
      s.lastRegen = now;
      s.eyes += 1;
    }
  }
}

function view(entity, now) {
  const s = state(entity);
  return {
    eyes: s.eyes,
    heat: s.heat,
    on: s.eyes > 0,
    cost: costFor(s.eyes, s.heat),
    timer: s.eyes <= 0 && s.outAt ? Math.max(0, Math.min(1, 1 - (s.outAt - now) / OI.refillMs)) : null,
  };
}

module.exports = { OI, costFor, evadePulse, has, state, depleted, active, drainMult, blocked, use, predict, onHit, tick, view };
