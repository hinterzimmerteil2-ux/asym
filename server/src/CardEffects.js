const Status = require('./Status');
const { distanceBetween, euclid, reachPoint, HAND_Y } = require('./Hitbox');
const C = require('./Constants');

function forEachCurator(room, entity, radius, fn, reach = 0) {
  const origin = reach ? reachPoint(entity, reach) : entity;
  for (const [otherId, other] of room.players) {
    if (!other.isAsymRole) continue;
    const target = room.gameState.entities[otherId];
    if (target && distanceBetween(origin, target) <= radius) fn(otherId, target);
  }
}

function eatFood(room, playerId, entity, loss, floor) {
  const patient = room.gameState.patients[playerId];
  const margin = patient ? patient.hp - floor : 0;
  const free = margin <= C.FOOD_NEAR_FLOOR;
  let flojera = C.FOOD_BONUS_FLOJERA_SMALL;
  if (free) {
    flojera += loss;
  } else {
    const actual = Math.min(loss, margin);
    room.damagePatient(playerId, actual, floor);
    flojera += loss - actual;
  }
  entity.flojera = Math.min(entity.flojeraMax, entity.flojera + flojera);
  return { free };
}

function tigerState(entity, card) {
  if (!entity.tiger) entity.tiger = { mag: card.tiger.mag, reserve: card.tiger.start, dmg: 0, lastGain: 0, reloadUntil: 0 };
  return entity.tiger;
}

function tigerBlocked(entity, card, now) {
  const st = tigerState(entity, card);
  if (st.reloadUntil > now) return 'Recargando';
  if (st.mag <= 0) return 'Sin balas';
  return null;
}

function tigerReload(room, playerId, entity, card, now) {
  const st = tigerState(entity, card);
  if (st.mag > 0 || st.reserve <= 0) return false;
  st.reserve -= 1;
  st.mag = card.tiger.mag;
  st.reloadUntil = now + card.tiger.reloadMs;
  room.endlag(playerId, entity, now, card.tiger.reloadMs, 3);
  return true;
}

function tigerCredit(room, playerId, amount, now) {
  const entity = room.gameState.entities[playerId];
  if (!entity || !entity.hand) return;
  const slot = entity.hand.find((sl) => sl && sl.chosen === 'tigermark');
  if (!slot) return;
  const card = require('./Cards').getCard('tigermark');
  const st = tigerState(entity, card);
  st.dmg = Math.min(card.tiger.perReload * 2, st.dmg + amount);
  if (st.dmg >= card.tiger.perReload && now - st.lastGain >= card.tiger.gainEveryMs) {
    st.dmg -= card.tiger.perReload;
    st.lastGain = now;
    st.reserve += 1;
    if (st.mag <= 0 && !entity.tigerLeap) tigerReload(room, playerId, entity, card, now);
  } else if (st.dmg >= card.tiger.perReload) {
    st.dmg = card.tiger.perReload;
  }
}

function tigerLand(room, playerId, entity, now) {
  const card = require('./Cards').getCard('tigermark');
  const t = card.tiger;
  entity.tigerLeap = null;
  entity.dashUntil = now - 1;
  entity.dashVX = 0;
  entity.dashVZ = 0;
  const box = { x: entity.x, z: entity.z, y: (entity.y || 0) + HAND_Y, half: t.radius };
  room.broadcast('hit_fx', { playerId, boxes: [box] });
  let dealt = 0;
  for (const [otherId, other] of room.players) {
    if (!(other.isAsymRole || other.isBoss)) continue;
    const target = room.gameState.entities[otherId];
    if (!target || target.down || target.gone || target.corpse) continue;
    if (Math.hypot(target.x - entity.x, target.z - entity.z) > t.radius + (target.bossHitHalf || 0) || Math.abs((target.y || 0) - (entity.y || 0)) > 2.2) continue;
    room.ragdoll(otherId, target, card.durationMs, now);
    const away = Math.hypot(target.x - entity.x, target.z - entity.z) || 1;
    Status.push(target, (target.x - entity.x) / away, (target.z - entity.z) / away, 6, 400, now);
    if (other.isBoss) require('./Boss').tntHit(room, t.bossDmg);
    else {
      room.dmgBy = playerId;
      room.adjustCuratorHp(-card.curatorHpLoss);
      room.dmgBy = null;
      room.checkGameEndConditions();
    }
    dealt += 1;
  }
  const st = tigerState(entity, card);
  if (st.mag <= 0) tigerReload(room, playerId, entity, card, now);
  return dealt;
}

const handlers = {
  paraguayizador({ room, entity, now }) {
    entity.paraFrom = now + C.PARAGUAY_START_MS;
    entity.paraUntil = entity.paraFrom + C.PARAGUAY_DURATION_MS;
    entity.paraOn = false;
    Status.apply(entity, 'slow', C.PARAGUAY_START_MS, now, { tag: 'endlag', level: 2 });
  },

  rodar({ entity, now }) {
    const inputLength = Math.hypot(entity.input.moveX, entity.input.moveZ);
    const dirX = inputLength > 0 ? entity.input.moveX / inputLength : entity.faceX;
    const dirZ = inputLength > 0 ? entity.input.moveZ / inputLength : entity.faceZ;
    entity.dashUntil = now + C.ROLL_DASH_MS;
    entity.dashVX = (dirX * C.ROLL_DISTANCE) / (C.ROLL_DASH_MS / 1000);
    entity.dashVZ = (dirZ * C.ROLL_DISTANCE) / (C.ROLL_DASH_MS / 1000);
    entity.dashExhausted = entity.flojera < C.ROLL_FLOJERA_COST;
    entity.flojera = Math.max(0, entity.flojera - C.ROLL_FLOJERA_COST * require('./Oi').drainMult(entity));
    if (entity.dashExhausted) entity.flojeraLockedUntil = now + C.FLOJERA_EXHAUST_LOCKOUT_MS;
  },

  chicharron({ room, playerId, entity, now }) {
    const gained = eatFood(room, playerId, entity, C.CHICHARRON_DAMAGE, C.CHICHARRON_FLOOR);
    if (gained.free) {
      entity.sprintUntil = now + C.FOOD_BONUS_SPRINT_MS;
      entity.sprintFactor = C.FOOD_BONUS_SPRINT_FACTOR;
    }
    entity.hitScale = (entity.hitScale || 1) * 1.005;
    room.checkGameEndConditions();
  },

  goyslop({ room, playerId, entity, now }) {
    eatFood(room, playerId, entity, C.GOYSLOP_DAMAGE, C.GOYSLOP_FLOOR);
    entity.sprintUntil = now + C.GOYSLOP_SPRINT_MS;
    entity.sprintFactor = C.GOYSLOP_SPRINT_FACTOR;
    room.checkGameEndConditions();
  },

  lanza_quijote({ room, playerId, entity, card, now }) {
    const cfg = card.spear;
    const half = room.getCurrentArea().halfSize;
    const mine = room.gameState.zones.filter((z) => z.kind === 'spear');
    while (mine.length >= cfg.max) {
      const oldest = mine.shift();
      oldest.until = now;
    }
    room.addZone({
      kind: 'spear',
      mode: 'pull',
      hp: 1,
      x: Math.max(-half, Math.min(half, entity.x + entity.faceX * 2.2)),
      z: Math.max(-half, Math.min(half, entity.z + entity.faceZ * 2.2)),
      radius: cfg.radius,
      ownerId: playerId,
      cardId: card.id,
      placedAt: now,
      until: now + 120000,
      nextAt: 0,
      card,
    });
    room.endlagSlow(entity, now, 300);
  },

  cascara_platano({ room, playerId, entity, card, now }) {
    const half = room.getCurrentArea().halfSize;
    room.addZone({
      kind: 'trap',
      x: Math.max(-half, Math.min(half, entity.x + entity.faceX * C.TRAP_THROW_DISTANCE)),
      z: Math.max(-half, Math.min(half, entity.z + entity.faceZ * C.TRAP_THROW_DISTANCE)),
      radius: C.TRAP_RADIUS,
      ownerId: playerId,
      armedAt: now + C.TRAP_ARM_MS,
      ownerArmedAt: now + C.TRAP_OWNER_ARM_MS,
      until: now + C.TRAP_LIFETIME_MS,
      cardId: card.id,
      charges: C.TRAP_CHARGES,
      placedAt: now,
      cooldownUntil: 0,
    });
    room.endlagSlow(entity, now, C.TRAP_ENDLAG_MS);
  },

  astral_claw({ room, playerId, entity, card, now }) {
    room.startAstral(playerId, entity, card, now);
  },

  agua_rimac({ room, playerId, entity, card, now }) {
    room.addZone({ kind: 'rimac', cardId: card.id, x: entity.x, z: entity.z, radius: C.RIMAC_RADIUS, perSecond: C.RIMAC_CURATOR_PER_SEC, ownerId: playerId, until: now + C.RIMAC_LIFETIME_MS, placedAt: now, level: 3 });
    entity.flojera = Math.min(entity.flojeraMax, entity.flojera + C.RIMAC_FLOJERA_INITIAL);
    for (const [id, patient] of Object.entries(room.gameState.patients)) {
      if (id === playerId || patient.status !== 'alive') continue;
      const target = room.gameState.entities[id];
      if (!target || distanceBetween(entity, target) > C.RIMAC_MELEE_RADIUS) continue;
      room.damagePatient(id, C.RIMAC_DOT_INITIAL);
      target.rimacDot = { until: now + C.RIMAC_DOT_MS };
      room.award(playerId, 4, 'Botellazo');
    }
    room.checkGameEndConditions();
  },

  acetilcolina({ entity, card, now }) {
    entity.sprintUntil = now + card.durationMs;
    entity.sprintFactor = C.ACETIL_FACTOR;
    entity.acetilUntil = now + card.durationMs;
    entity.regenBlockedUntil = entity.acetilUntil + C.ACETIL_REGEN_DELAY_MS;
    entity.fatigueUntil = entity.acetilUntil + C.ACETIL_FATIGUE_MS;
  },

  niche_tower({ room, playerId, entity, card, now }) {
    require('./Towers').place(room, playerId, entity, card, now, entity.towerVariant);
  },

  oi_ojo({ room, playerId, entity, now }) {
    require('./Oi').use(room, playerId, entity, now);
  },

  tigermark({ room, playerId, entity, card, now }) {
    const t = card.tiger;
    const st = tigerState(entity, card);
    st.mag -= 1;
    let dx = entity.faceX || 0;
    let dz = entity.faceZ || 0;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) {
      dx = 0;
      dz = 1;
    } else {
      dx /= len;
      dz /= len;
    }
    entity.onGround = false;
    entity.velocityY = t.vy;
    entity.peakY = entity.y;
    entity.dashUntil = now + 3000;
    entity.dashVX = dx * t.speed;
    entity.dashVZ = dz * t.speed;
    entity.dashExhausted = false;
    entity.tigerLeap = { at: now };
  },

  grito_animo({ room, playerId, entity, card, now }) {
    const near = room.alliesNear(playerId, entity, card.radius);
    let possible = 0;
    for (const [id, pl] of room.players) if (id !== playerId && !pl.isAsymRole && !pl.isBoss && room.gameState.patients[id]) possible += 1;
    for (const id of near) {
      const ally = room.gameState.entities[id];
      if (ally) resetLongestCooldown(ally, 1, now, card.id);
    }
    const share = possible > 0 ? Math.max(0, Math.min(1, 1 - near.length / possible)) : 1;
    if (share > 0) {
      resetLongestCooldown(entity, share, now, card.id);
      const slot = entity.hand.findIndex((sl) => sl && sl.chosen === card.id);
      if (slot >= 0) {
        const left = Math.max(0, (entity.cardCooldowns[slot] || 0) - now);
        entity.cardCooldowns[slot] = now + left * (1 - card.selfRefund * share);
      }
    }
  },

  tajo_carmesi({ room, entity, card, now }) {
    forEachCurator(room, entity, card.hitRadius, (id, target) => {
      room.stun(id, target, card.durationMs, now, 0);
    }, card.reach);
  },

  red_mist({ room, playerId, entity, card, now }) {
    const cb = card.combo;
    const heavy = Boolean(entity.redMistWide);
    const damage = heavy ? cb.damage * cb.heavyDamageMult : cb.damage;
    const stunMs = heavy ? Math.round(card.durationMs * cb.heavyStunMult) : card.durationMs;
    const heal = damage * (heavy ? cb.heavyHealFrac : cb.healFrac);
    const hit = (id, target) => {
      room.stun(id, target, stunMs, now, 0);
      room.adjustCuratorHp(-damage);
      room.healPatient(playerId, heal);
    };
    if (heavy) {
      const done = new Set();
      for (const o of redMistLine(entity, card)) {
        forEachCurator(room, o, card.hitRadius, (id, target) => {
          if (done.has(id)) return;
          done.add(id);
          hit(id, target);
        });
      }
    } else {
      forEachCurator(room, entity, card.hitRadius, hit, card.reach);
    }
    room.checkGameEndConditions();
  },

  tropiezo({ room, playerId, entity, card, now }) {
    room.endlag(playerId, entity, now, 1200, 3);
    forEachCurator(room, entity, C.TROPIEZO_RADIUS, (id, target) => {
      room.ragdoll(id, target, card.durationMs, now);
      room.adjustCuratorHp(-(card.curatorHpLoss || 0));
      const away = euclid(target, entity) || 1;
      Status.push(target, (target.x - entity.x) / away, (target.z - entity.z) / away, 8, 500, now);
    });
  },
};

function customHandler({ room, playerId, entity, card, now }) {
  if (card.customKind === 'invisible') {
    entity.paraFrom = now + card.paraStartMs;
    entity.paraUntil = entity.paraFrom + card.paraMs;
    entity.paraOn = false;
    Status.apply(entity, 'slow', card.paraStartMs, now, { tag: 'endlag', level: 2 });
    return;
  }
  if (card.customKind === 'sprint') {
    if (card.hpCost) room.damagePatient(playerId, card.hpCost, C.GOYSLOP_FLOOR);
    entity.sprintUntil = now + card.durationMs;
    entity.sprintFactor = card.sprintFactor;
    room.checkGameEndConditions();
    return;
  }
  if (card.endlagMs) room.endlag(playerId, entity, now, card.endlagMs, 1);
  forEachCurator(room, entity, card.hitRadius, (id, target) => {
    if (card.ragdollMs) room.ragdoll(id, target, card.ragdollMs, now);
    if (card.stunMs) room.stun(id, target, card.stunMs, now, 0);
    if (card.slowMs) Status.apply(target, 'slow', card.slowMs, now, { level: card.slowLevel || 2 });
    if (card.revealHealerMs) Status.apply(target, 'reveal', card.revealHealerMs, now);
    if (card.knockback) {
      const dx = target.x - entity.x;
      const dz = target.z - entity.z;
      const len = Math.hypot(dx, dz) || 1;
      Status.push(target, dx / len, dz / len, card.knockback, 400, now);
    }
    if (card.curatorHpLoss) room.adjustCuratorHp(-card.curatorHpLoss);
  }, card.reach || 0);
  room.checkGameEndConditions();
}

function fxOn(room, id, ent, f, now) {
  const ms = Math.round(f.durationSec * 1000);
  const isHealer = Boolean(room.players.get(id)?.isAsymRole);
  if (f.type === 'stun') room.stun(id, ent, ms, now, 0);
  else if (f.type === 'ragdoll') room.ragdoll(id, ent, ms, now);
  else if (f.type === 'slow') Status.apply(ent, 'slow', ms, now, { level: f.level });
  else if (f.type === 'endlag') Status.apply(ent, 'slow', ms, now, { tag: 'endlag', level: f.level });
  else if (f.type === 'reveal') { if (!room.isInvisible(ent, now)) Status.apply(ent, 'reveal', ms, now); }
  else if (f.type === 'exacerbacion') { ent.exacerbacionLevel = f.level; ent.exacerbacionUntil = now + ms; }
  else if (f.type === 'pereza') { ent.perezaLevel = f.level; ent.perezaUntil = now + ms; }
  else if (f.type === 'acetilcolina') {
    ent.sprintUntil = now + ms;
    ent.sprintFactor = C.ACETIL_FACTOR;
    ent.acetilUntil = now + ms;
    ent.regenBlockedUntil = ent.acetilUntil + C.ACETIL_REGEN_DELAY_MS;
    ent.fatigueUntil = ent.acetilUntil + C.ACETIL_FATIGUE_MS;
  } else if (f.type === 'fatiga') ent.fatigueUntil = now + ms;
  else if (f.type === 'impulso') { ent.allyBoostUntil = now + ms; ent.allyBoostLevel = f.level; }
  else if (f.type === 'respiro') ent.respiroUntil = now + ms;
  else if (f.type === 'ayuno') ent.regenBlockedUntil = now + ms;
  else if (f.type === 'paraguayizador') { ent.paraFrom = now; ent.paraUntil = now + ms; ent.paraOn = false; }
  else if (f.type === 'flojera') ent.flojera = Math.max(0, Math.min(ent.flojeraMax, ent.flojera + f.amount));
  else if (f.type === 'speed') {
    if (!isHealer) { ent.sprintUntil = now + ms; ent.sprintFactor = f.amount; }
  } else if (f.type === 'hp') {
    if (isHealer) room.adjustCuratorHp(f.amount);
    else if (f.amount < 0) room.damagePatient(id, -f.amount, 1);
    else room.healPatient(id, f.amount);
  }
}

function runFx(room, ownerId, ownerEntity, list, trigger, ctx, now) {
  if (!list || !list.length) return;
  const ownerIsHealer = Boolean(room.players.get(ownerId)?.isAsymRole);
  for (const f of list) {
    if (f.when !== trigger) continue;
    const targets = [];
    if (f.target === 'self') targets.push([ownerId, ownerEntity]);
    else if (f.target === 'allies') {
      if (!ownerIsHealer) for (const id of room.alliesNear(ownerId, ownerEntity, 8)) targets.push([id, room.gameState.entities[id]]);
    } else if (ctx && ctx.enemyIds) {
      for (const id of ctx.enemyIds) targets.push([id, room.gameState.entities[id]]);
    } else {
      for (const [id, p] of room.players) {
        if (Boolean(p.isAsymRole) === ownerIsHealer) continue;
        const e = room.gameState.entities[id];
        if (!e) continue;
        if (ownerIsHealer && room.gameState.patients[id]?.status !== 'alive') continue;
        targets.push([id, e]);
      }
    }
    for (const [id, ent] of targets) if (ent) fxOn(room, id, ent, f, now);
  }
  room.checkGameEndConditions();
}

function apply(room, playerId, entity, card, now) {
  if (card.astral) { room.startAstral(playerId, entity, card, now); return; }
  const handler = handlers[card.id] || (card.custom ? customHandler : null);
  if (handler) require('./SuperAbilities').withSource(entity, () => handler({ room, playerId, entity, card, now }));
}

function resetLongestCooldown(entity, fraction, now, excludeId) {
  let slot = -1;
  let left = 0;
  entity.hand.forEach((sl, i) => {
    if (!sl || !sl.chosen || sl.chosen === excludeId) return;
    const remain = (entity.cardCooldowns[i] || 0) - now;
    if (remain > left) { left = remain; slot = i; }
  });
  if (slot < 0) return;
  entity.cardCooldowns[slot] = now + left * (1 - fraction);
}

function comboPress(entity, card, now) {
  const cb = card.combo;
  const st = entity.redMist && now - entity.redMist.last <= cb.resetMs ? entity.redMist : { n: 0, last: now };
  st.n += 1;
  st.last = now;
  const heavy = st.n >= cb.hits;
  entity.redMist = heavy ? null : st;
  entity.redMistWide = heavy;
  const slot = entity.hand.findIndex((sl) => sl && sl.chosen === card.id);
  if (slot >= 0) entity.cardCooldowns[slot] = now + (heavy ? card.cooldownMs : cb.comboCooldownMs);
}

function redMistLine(entity, card) {
  const len = card.reach * card.combo.heavyReachMult;
  const n = Math.ceil(len / card.hitRadius);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const d = (len * i) / n;
    out.push({ x: entity.x + (entity.faceX || 0) * d, y: entity.y || 0, z: entity.z + (entity.faceZ || 0) * d });
  }
  return out;
}

function areaOf(card, entity) {
  if (card.id === 'red_mist' && entity.redMistWide) return redMistLine(entity, card).map((o) => ({ x: o.x, z: o.z, y: (entity.y || 0) + HAND_Y, half: card.hitRadius }));
  if (card.custom && card.customKind === 'burst') return [{ x: entity.x, z: entity.z, half: card.hitRadius }];
  if (card.id === 'rodar') {
    const len = Math.hypot(entity.dashVX || 0, entity.dashVZ || 0) || 1;
    const dx = (entity.dashVX || 0) / len;
    const dz = (entity.dashVZ || 0) / len;
    return [0, 1, 2, 3, 4].map((i) => ({ x: entity.x + (dx * C.ROLL_DISTANCE * i) / 4, z: entity.z + (dz * C.ROLL_DISTANCE * i) / 4, half: C.ROLL_HIT_WIDTH }));
  }
  if (card.id === 'acetilcolina') return [{ x: entity.x, z: entity.z, half: C.ACETIL_ALLY_RADIUS }];
  if (card.id === 'grito_animo') return [{ x: entity.x, z: entity.z, half: 8 }];
  return [];
}

module.exports = { apply, handlers, areaOf, runFx, comboPress, redMistLine, tigerBlocked, tigerLand, tigerCredit, tigerState };
