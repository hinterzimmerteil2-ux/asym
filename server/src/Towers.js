const Status = require('./Status');
const Hitbox = require('./Hitbox');

const TW = {
  laser: { need: 4, buildMs: 87000, aimSpeed: 6, range: 40, chargeMs: 1300, cdMs: 22000, radius: 4.5, stunMs: 11000, bossStunMs: 3000, dmg: 70, bossDmg: 1400000 },
  rifle: { need: 2, buildMs: 18000, aimSpeed: 45, range: 32, width: 0.9, ammo: 6, reloadMs: 2000, gapMs: 1600, stunMs: 900, flojera: 18 },
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
};

let seq = 1;

function list(room) {
  if (!room.gameState.towers) room.gameState.towers = [];
  return room.gameState.towers;
}

function isTowerCard(card) {
  return Boolean(card && card.tower);
}

function blocked(room, card) {
  if (list(room).some((t) => t.type === card.tower.type)) return 'Ya hay una torre de este tipo';
  return null;
}

function place(room, playerId, entity, card, now) {
  const type = card.tower.type;
  const fx = entity.faceX || 0;
  const fz = entity.faceZ || 1;
  const len = Math.hypot(fx, fz) || 1;
  const x = entity.x + (fx / len) * TW.placeDist;
  const z = entity.z + (fz / len) * TW.placeDist;
  const y = Hitbox.groundAt(room.allPlatforms(), x, z, entity.y || 0, 3);
  const t = {
    id: `tw${seq++}`, type, owner: playerId, x, y: Number.isFinite(y) ? y : entity.y || 0, z,
    hp: TW.hp0, hpMax: TW.hp0, mods: 0, need: TW[type].need, prog: 0, started: false,
    seat: null, tx: x, tz: z + 6, ax: x, az: z + 6, charging: 0, nextShot: 0,
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
  const has = hand.some((sl) => sl && sl.chosen && String(sl.chosen).startsWith('tower_'));
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

function aim(room, playerId, x, z) {
  const t = list(room).find((tw) => tw.seat === playerId);
  if (!t || !Number.isFinite(x) || !Number.isFinite(z)) return;
  t.tx = x;
  t.tz = z;
}

function damage(room, t, amount, now) {
  t.hp -= amount;
  t.lastHit = now;
  if (t.hp <= 0) {
    stand(room, t, now);
    const arr = list(room);
    const i = arr.indexOf(t);
    if (i >= 0) arr.splice(i, 1);
    room.broadcast('tower_fx', { kind: 'destroy', x: t.x, y: t.y, z: t.z, type: t.type });
  }
}

function blast(room, t, now) {
  const cfg = TW.laser;
  const owner = t.owner;
  const boxes = [{ x: t.ax, z: t.az, y: t.y + 1, half: cfg.radius }];
  room.broadcast('hit_fx', { playerId: owner, boxes });
  let hit = false;
  for (const f of enemies(room)) {
    if (Math.hypot(f.e.x - t.ax, f.e.z - t.az) > cfg.radius || Math.abs((f.e.y || 0) - t.y) > 5) continue;
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
  room.broadcast('tower_fx', { kind: 'blast', towerId: t.id, x: t.ax, y: t.y, z: t.az, r: cfg.radius, hit });
}

function shoot(room, t, now) {
  const cfg = TW.rifle;
  const dx = t.ax - t.x;
  const dz = t.az - t.z;
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len;
  const nz = dz / len;
  let hit = false;
  let endLen = cfg.range;
  for (const f of enemies(room)) {
    const rx = f.e.x - t.x;
    const rz = f.e.z - t.z;
    const along = rx * nx + rz * nz;
    if (along < 0 || along > cfg.range) continue;
    const side = Math.abs(rx * nz - rz * nx);
    if (side > cfg.width + 0.6 || Math.abs((f.e.y || 0) - t.y) > 4) continue;
    hit = true;
    endLen = Math.min(endLen, along);
    room.stun(f.id, f.e, cfg.stunMs, now, 0);
    if (typeof f.e.flojera === 'number') f.e.flojera = Math.max(0, f.e.flojera - cfg.flojera);
  }
  room.broadcast('tower_fx', { kind: 'shot', towerId: t.id, x: t.x, y: t.y + 1.4, z: t.z, nx, nz, len: endLen, hit });
}

function fire(room, playerId, now) {
  const t = list(room).find((tw) => tw.seat === playerId);
  if (!t || !complete(t)) return;
  if (t.type === 'laser') {
    if (t.charging || now < t.nextShot) return;
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
    if (t.charging && now >= t.charging) {
      t.charging = 0;
      blast(room, t, now);
    }
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
    mods: t.mods, need: t.need, prog: t.started ? Math.min(1, t.prog / (TW[t.type].buildMs / t.need)) : 0, seat: t.seat,
    ax: t.ax, az: t.az, charge: t.charging ? Math.max(0, Math.min(1, 1 - (t.charging - now) / TW.laser.chargeMs)) : 0,
    cd: Math.max(0, t.nextShot - now), ammo: t.ammo, reload: t.reloadUntil > now ? Math.max(0, t.reloadUntil - now) : 0,
  }));
}

function reset(room) {
  room.gameState.towers = [];
}

function entityReset(entity) {
  entity.towerBoxes = 0;
  entity.towerSeat = null;
}

module.exports = { TW, isTowerCard, blocked, place, onModule, sit, aim, fire, tick, view, reset, entityReset, onCuratorSkill, list, complete };
