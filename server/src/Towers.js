const Status = require('./Status');
const Hitbox = require('./Hitbox');

const TW = {
  laser: { need: 4, buildMs: 65000, aimSpeed: 6, pitchSpeed: 0.6, range: 40, speed: 26, contact: 1.5, chargeMs: 1300, cdMs: 22000, radius: 4.5, stunMs: 11000, bossStunMs: 3000, dmg: 70, bossDmg: 1400000 },
  rifle: { need: 2, buildMs: 14000, aimSpeed: 45, pitchSpeed: 4, range: 32, width: 0.9, ammo: 6, reloadMs: 2000, gapMs: 1600, stunMs: 900, flojera: 18 },
  hp0: 40,
  hpMax: 280,
  regenDelay: 5000,
  regen: 3,
  buildRadius: 5,
  sitRadius: 3.2,
  skillDmg: 35,
  bossDps: 40,
  bossRadius: 5,
  placeDist: 3,
  muzzle: 1.4,
  pitchMax: 0.75,
};

let seq = 1;

function list(room) {
  if (!room.gameState.towers) room.gameState.towers = [];
  return room.gameState.towers;
}

function isTowerCard(card) {
  return Boolean(card && card.tower);
}

function blocked(room, type) {
  if (list(room).some((t) => t.type === type)) return 'Ya hay una torre de este tipo';
  return null;
}

function place(room, playerId, entity, card, now, variant) {
  const type = variant === 'rifle' ? 'rifle' : 'laser';
  const fx = entity.faceX || 0;
  const fz = entity.faceZ || 1;
  const len = Math.hypot(fx, fz) || 1;
  const x = entity.x + (fx / len) * TW.placeDist;
  const z = entity.z + (fz / len) * TW.placeDist;
  const y = Hitbox.groundAt(room.allPlatforms(), x, z, entity.y || 0, 3);
  const y0 = Number.isFinite(y) ? y : entity.y || 0;
  const t = {
    id: `tw${seq++}`, type, owner: playerId, x, y: Number.isFinite(y) ? y : entity.y || 0, z,
    hp: TW.hp0, hpMax: TW.hp0, mods: 0, need: TW[type].need, prog: 0, started: false,
    seat: null, carrier: null, tx: x, tz: z + 6, ax: x, az: z + 6, pitch: 0, tpitch: 0, ay: y0 + TW.muzzle, proj: null, charging: 0, nextShot: 0,
    ammo: type === 'rifle' ? TW.rifle.ammo : 0, reloadUntil: 0, lastHit: now, last: now,
  };
  list(room).push(t);
  room.broadcast('hit_fx', { playerId, boxes: [{ x, z, y: t.y + 0.9, half: 1.2 }] });
  return t;
}

function complete(t) {
  return t.mods >= t.need;
}

function onModule(room, playerId, entity) {
  const hand = entity.hand || [];
  const has = hand.some((sl) => sl && sl.chosen === 'niche_tower');
  if (!has) return;
  const max = Math.max(...Object.values({ a: TW.laser.need, b: TW.rifle.need }));
  entity.towerBoxes = Math.min(max, (entity.towerBoxes || 0) + 1);
}

function enemies(room) {
  const out = [];
  for (const [id, p] of room.players) {
    if (!(p.isAsymRole || p.isBoss)) continue;
    const e = room.gameState.entities[id];
    if (!e || e.down || e.gone) continue;
    out.push({ id, e, boss: Boolean(p.isBoss) });
  }
  return out;
}

function stand(room, t, now) {
  if (!t.seat) return;
  const e = room.gameState.entities[t.seat];
  if (e) {
    Status.clear(e, 'seated');
    e.towerSeat = null;
  }
  t.seat = null;
  t.charging = 0;
}

function sit(room, playerId, entity, now) {
  const p = room.players.get(playerId);
  if (!p || p.isAsymRole || p.isBoss) return false;
  const patient = room.gameState.patients[playerId];
  if (!patient || patient.status !== 'alive') return false;
  if (entity.towerSeat) {
    const mine = list(room).find((t) => t.id === entity.towerSeat);
    if (mine) stand(room, mine, now);
    else {
      Status.clear(entity, 'seated');
      entity.towerSeat = null;
    }
    return true;
  }
  const t = list(room).find((tw) => Math.hypot(tw.x - entity.x, tw.z - entity.z) <= TW.sitRadius);
  if (!t) return false;
  if (t.carrier) return true;
  if (!complete(t)) {
    room.sendTo(playerId, 'error', { message: 'La torre aún se está construyendo' });
    return true;
  }
  if (Status.blocksMove(entity, now)) return true;
  if (t.seat && t.seat !== playerId) {
    if (playerId !== t.owner) {
      room.sendTo(playerId, 'error', { message: 'La torre está ocupada' });
      return true;
    }
    stand(room, t, now);
  }
  t.seat = playerId;
  entity.towerSeat = t.id;
  Status.apply(entity, 'seated', 3600000, now);
  entity.x = t.x;
  entity.z = t.z - 1.1;
  return true;
}

function pick(room, playerId, entity, moduleDist) {
  const t = list(room).find((tw) => tw.owner === playerId && !tw.carrier && Math.hypot(tw.x - entity.x, tw.z - entity.z) <= 3.4);
  if (!t) return false;
  if (Math.hypot(t.x - entity.x, t.z - entity.z) >= moduleDist) return false;
  stand(room, t, Date.now());
  t.carrier = playerId;
  entity.carryTower = t.id;
  return true;
}

function drop(room, playerId, entity) {
  const t = list(room).find((tw) => tw.id === entity.carryTower);
  entity.carryTower = null;
  if (!t) return;
  t.carrier = null;
  const y = Hitbox.groundAt(room.allPlatforms(), t.x, t.z, entity.y || 0, 3);
  t.y = Number.isFinite(y) ? y : entity.y || 0;
  t.last = Date.now();
}

function aim(room, playerId, x, z, pitch) {
  const t = list(room).find((tw) => tw.seat === playerId);
  if (!t) return;
  if (Number.isFinite(x) && Number.isFinite(z)) {
    t.tx = x;
    t.tz = z;
  }
  if (Number.isFinite(pitch)) t.tpitch = Math.max(-TW.pitchMax, Math.min(TW.pitchMax, pitch));
}

function dirOf(t) {
  let hx = t.ax - t.x;
  let hz = t.az - t.z;
  const hd = Math.hypot(hx, hz);
  if (hd < 0.001) {
    hx = 0;
    hz = 1;
  } else {
    hx /= hd;
    hz /= hd;
  }
  const dy = Math.tan(t.pitch);
  const n = Math.hypot(1, dy);
  return { x: hx / n, y: dy / n, z: hz / n };
}

function solidAt(platforms, x, y, z) {
  if (y <= Hitbox.baseAt(platforms, x, z) + 0.02) return true;
  for (const p of platforms) {
    if (p.oneway || p.kind === 'pit') continue;
    const top = Hitbox.platformTop(p, x, z);
    if (top !== null && y < top && y >= (p.y0 || 0) - 0.05) return true;
  }
  return false;
}

function center(f) {
  const sz = Math.max(1, f.e.size || 1);
  return { x: f.e.x, y: (f.e.y || 0) + 0.9 * sz, z: f.e.z, r: 1.4 * sz };
}

function damage(room, t, amount, now) {
  t.hp -= amount;
  t.lastHit = now;
  if (t.hp <= 0) {
    stand(room, t, now);
    const ce = t.carrier && room.gameState.entities[t.carrier];
    if (ce) ce.carryTower = null;
    const arr = list(room);
    const i = arr.indexOf(t);
    if (i >= 0) arr.splice(i, 1);
    room.broadcast('tower_fx', { kind: 'destroy', x: t.x, y: t.y, z: t.z, type: t.type });
  }
}

function blast(room, t, now, pos, direct) {
  const cfg = TW.laser;
  const owner = t.owner;
  const boxes = [{ x: pos.x, z: pos.z, y: pos.y, half: cfg.radius }];
  room.broadcast('hit_fx', { playerId: owner, boxes });
  let hit = false;
  for (const f of enemies(room)) {
    const c = center(f);
    if (Math.hypot(c.x - pos.x, c.y - pos.y, c.z - pos.z) > cfg.radius + (f.boss ? c.r : 0)) continue;
    hit = true;
    room.stun(f.id, f.e, f.boss ? cfg.bossStunMs : cfg.stunMs, now, 0);
    if (f.boss) require('./Boss').tntHit(room, cfg.bossDmg);
    else {
      room.dmgBy = owner;
      room.adjustCuratorHp(-cfg.dmg);
      room.dmgBy = null;
      room.checkGameEndConditions();
    }
  }
  room.broadcast('tower_fx', { kind: 'blast', towerId: t.id, x: pos.x, y: pos.y, z: pos.z, r: cfg.radius, hit, direct: Boolean(direct) });
}

function launch(room, t, now) {
  const d = dirOf(t);
  t.proj = { x: t.x + d.x * 1.2, y: t.y + TW.muzzle + d.y * 1.2, z: t.z + d.z * 1.2, dx: d.x, dy: d.y, dz: d.z, dist: 1.2 };
}

function flyProjectile(room, t, dt, now) {
  const cfg = TW.laser;
  const pr = t.proj;
  const platforms = room.allPlatforms();
  let left = cfg.speed * dt;
  while (left > 0 && t.proj) {
    const step = Math.min(0.4, left);
    left -= step;
    pr.x += pr.dx * step;
    pr.y += pr.dy * step;
    pr.z += pr.dz * step;
    pr.dist += step;
    let why = null;
    for (const f of enemies(room)) {
      const c = center(f);
      if (Math.hypot(c.x - pr.x, c.y - pr.y, c.z - pr.z) <= cfg.contact + c.r) why = 'direct';
    }
    if (!why && solidAt(platforms, pr.x, pr.y, pr.z)) why = 'wall';
    if (!why && pr.dist >= cfg.range) why = 'range';
    if (why) {
      t.proj = null;
      blast(room, t, now, { x: pr.x, y: pr.y, z: pr.z }, why === 'direct');
    }
  }
}

function shoot(room, t, now) {
  const cfg = TW.rifle;
  const d = dirOf(t);
  const m = { x: t.x, y: t.y + TW.muzzle, z: t.z };
  const platforms = room.allPlatforms();
  let endLen = cfg.range;
  for (let l = 0.6; l <= cfg.range; l += 0.4) {
    if (solidAt(platforms, m.x + d.x * l, m.y + d.y * l, m.z + d.z * l)) {
      endLen = l;
      break;
    }
  }
  let hit = false;
  for (const f of enemies(room)) {
    const c = center(f);
    const rx = c.x - m.x;
    const ry = c.y - m.y;
    const rz = c.z - m.z;
    const along = rx * d.x + ry * d.y + rz * d.z;
    if (along < 0 || along > endLen) continue;
    const side = Math.hypot(rx - d.x * along, ry - d.y * along, rz - d.z * along);
    if (side > cfg.width + 0.4 + c.r * 0.5) continue;
    hit = true;
    endLen = Math.min(endLen, along);
    room.stun(f.id, f.e, cfg.stunMs, now, 0);
    if (typeof f.e.flojera === 'number') f.e.flojera = Math.max(0, f.e.flojera - cfg.flojera);
  }
  room.broadcast('tower_fx', { kind: 'shot', towerId: t.id, x: m.x, y: m.y, z: m.z, dx: d.x, dy: d.y, dz: d.z, len: endLen, hit });
}

function fire(room, playerId, now) {
  const t = list(room).find((tw) => tw.seat === playerId);
  if (!t || !complete(t)) return;
  if (t.type === 'laser') {
    if (t.charging || t.proj || now < t.nextShot) return;
    t.charging = now + TW.laser.chargeMs;
    t.nextShot = now + TW.laser.cdMs;
  } else {
    if (now < t.nextShot || t.ammo <= 0 || t.reloadUntil > now) return;
    t.ammo -= 1;
    t.nextShot = now + TW.rifle.gapMs;
    shoot(room, t, now);
    if (t.ammo <= 0) t.reloadUntil = now + TW.rifle.reloadMs;
  }
}

function onCuratorSkill(room, entity, skill, now) {
  const reach = (skill && (skill.radius || 0)) + ((skill && skill.reach) || 0) + 1.5;
  for (const t of list(room).slice()) {
    if (Math.hypot(t.x - entity.x, t.z - entity.z) <= Math.max(3.5, reach)) damage(room, t, TW.skillDmg, now);
  }
}

function tick(room, now) {
  const arr = list(room);
  for (const t of arr.slice()) {
    const dt = Math.min(0.25, Math.max(0, (now - t.last) / 1000));
    t.last = now;
    const cfg = TW[t.type];
    const owner = room.gameState.entities[t.owner];
    if (t.carrier) {
      const ce = room.gameState.entities[t.carrier];
      const cp = room.gameState.patients[t.carrier];
      if (!ce || !cp || cp.status !== 'alive' || ce.down) {
        if (ce) ce.carryTower = null;
        t.carrier = null;
      } else {
        const len = Math.hypot(ce.faceX || 0, ce.faceZ || 1) || 1;
        t.x = ce.x + ((ce.faceX || 0) / len) * 1.6;
        t.z = ce.z + ((ce.faceZ || 1) / len) * 1.6;
        t.y = ce.y || 0;
        t.tx = t.x;
        t.tz = t.z + 6;
        t.ax = t.tx;
        t.az = t.tz;
        t.pitch = 0;
        t.tpitch = 0;
        t.proj = null;
        t.lastHit = now;
        continue;
      }
    }
    if (!complete(t) && owner && !owner.down && Math.hypot(owner.x - t.x, owner.z - t.z) <= TW.buildRadius) {
      if (!t.started && (owner.towerBoxes || 0) > 0) {
        owner.towerBoxes -= 1;
        t.started = true;
        t.prog = 0;
      }
      if (t.started) {
        t.prog += dt * 1000;
        const per = cfg.buildMs / cfg.need;
        if (t.prog >= per) {
          t.mods += 1;
          t.started = false;
          t.prog = 0;
          t.hpMax = TW.hp0 + (TW.hpMax - TW.hp0) * (t.mods / t.need);
        }
      }
    }
    if (now - t.lastHit > TW.regenDelay && t.hp < t.hpMax) t.hp = Math.min(t.hpMax, t.hp + TW.regen * dt);
    if (t.seat) {
      const sp = room.gameState.entities[t.seat];
      const pat = room.gameState.patients[t.seat];
      if (!sp || sp.down || !pat || pat.status !== 'alive' || Status.active(sp, 'ragdoll', now) || Status.active(sp, 'stun', now)) stand(room, t, now);
    }
    const step = cfg.aimSpeed * dt;
    let mx = t.tx - t.ax;
    let mz = t.tz - t.az;
    const md = Math.hypot(mx, mz);
    if (md > step) {
      mx = (mx / md) * step;
      mz = (mz / md) * step;
    }
    t.ax += mx;
    t.az += mz;
    const ox = t.ax - t.x;
    const oz = t.az - t.z;
    const od = Math.hypot(ox, oz);
    if (od > cfg.range) {
      t.ax = t.x + (ox / od) * cfg.range;
      t.az = t.z + (oz / od) * cfg.range;
    }
    const pstep = cfg.pitchSpeed * dt;
    const dp = t.tpitch - t.pitch;
    t.pitch += Math.abs(dp) > pstep ? Math.sign(dp) * pstep : dp;
    t.ay = t.y + TW.muzzle + Math.hypot(t.ax - t.x, t.az - t.z) * Math.tan(t.pitch);
    if (t.charging && now >= t.charging) {
      t.charging = 0;
      launch(room, t, now);
    }
    if (t.proj) flyProjectile(room, t, dt, now);
    if (t.type === 'rifle' && t.ammo <= 0 && t.reloadUntil && now >= t.reloadUntil) {
      t.ammo = cfg.ammo;
      t.reloadUntil = 0;
    }
    for (const f of enemies(room)) {
      if (f.boss && Math.hypot(f.e.x - t.x, f.e.z - t.z) <= TW.bossRadius) damage(room, t, TW.bossDps * dt, now);
    }
  }
}

function view(room, now) {
  const arr = list(room);
  if (!arr.length) return undefined;
  return arr.map((t) => ({
    id: t.id, type: t.type, owner: t.owner, x: t.x, y: t.y, z: t.z, hp: Math.ceil(t.hp), hpMax: Math.round(t.hpMax),
    mods: t.mods, need: t.need, prog: t.started ? Math.min(1, t.prog / (TW[t.type].buildMs / t.need)) : 0, seat: t.seat, carrier: t.carrier,
    ax: t.ax, ay: t.ay, az: t.az, pitch: t.pitch, proj: t.proj ? { x: t.proj.x, y: t.proj.y, z: t.proj.z } : undefined, charge: t.charging ? Math.max(0, Math.min(1, 1 - (t.charging - now) / TW.laser.chargeMs)) : 0,
    cd: Math.max(0, t.nextShot - now), ammo: t.ammo, reload: t.reloadUntil > now ? Math.max(0, t.reloadUntil - now) : 0,
  }));
}

function reset(room) {
  room.gameState.towers = [];
}

function entityReset(entity) {
  entity.towerBoxes = 0;
  entity.towerSeat = null;
  entity.carryTower = null;
}

module.exports = { TW, isTowerCard, blocked, pick, drop, place, onModule, sit, aim, fire, tick, view, reset, entityReset, onCuratorSkill, list, complete };
