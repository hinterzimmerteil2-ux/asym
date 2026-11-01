const Status = require('./Status');
const { distanceBetween, euclid, reachPoint } = require('./Hitbox');
const C = require('./Constants');

function forEachCurator(room, entity, radius, fn, reach = 0) {
  const origin = reach ? reachPoint(entity, reach) : entity;
  for (const [otherId, other] of room.players) {
    if (!other.isAsymRole) continue;
    const target = room.gameState.entities[otherId];
    if (target && distanceBetween(origin, target) <= radius) fn(otherId, target);
  }
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
    entity.flojera = Math.max(0, entity.flojera - C.ROLL_FLOJERA_COST);
    if (entity.dashExhausted) entity.flojeraLockedUntil = now + C.FLOJERA_EXHAUST_LOCKOUT_MS;
  },

  chicharron({ room, playerId, entity, now }) {
    const hurt = room.damagePatient(playerId, C.CHICHARRON_DAMAGE, C.CHICHARRON_FLOOR);
    if (!hurt) {
      entity.sprintUntil = now + C.FOOD_BONUS_SPRINT_MS;
      entity.sprintFactor = C.FOOD_BONUS_SPRINT_FACTOR;
    }
    room.checkGameEndConditions();
  },

  goyslop({ room, playerId, entity, now }) {
    const hurt = room.damagePatient(playerId, C.GOYSLOP_DAMAGE, C.GOYSLOP_FLOOR);
    if (!hurt) entity.flojera = Math.min(entity.flojeraMax, entity.flojera + C.FOOD_BONUS_FLOJERA);
    entity.sprintUntil = now + C.GOYSLOP_SPRINT_MS;
    entity.sprintFactor = C.GOYSLOP_SPRINT_FACTOR;
    room.checkGameEndConditions();
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

  grito_animo({ entity, card, now }) {
    const slot = entity.hand.findIndex((s) => s && s.chosen === card.id);
    entity.channel = { cardId: card.id, slot, startedAt: now, endsAt: now + C.CHANNEL_MS, hits: 0, scored: {} };
  },

  tajo_carmesi({ room, entity, card, now }) {
    forEachCurator(room, entity, card.hitRadius, (id, target) => {
      room.stun(id, target, card.durationMs, now, 0);
    }, card.reach);
  },

  red_mist({ room, playerId, entity, card, now }) {
    forEachCurator(room, entity, card.hitRadius, (id, target) => {
      const heavy = Math.random() < 0.1;
      const damage = heavy ? 90 : 25;
      room.stun(id, target, heavy ? 3000 : card.durationMs, now, 0);
      room.adjustCuratorHp(-damage);
      room.healPatient(playerId, damage * 0.25);
    }, card.reach);
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
  const handler = handlers[card.id] || (card.custom ? customHandler : null);
  if (handler) handler({ room, playerId, entity, card, now });
}

function areaOf(card, entity) {
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

module.exports = { apply, handlers, areaOf, runFx };
