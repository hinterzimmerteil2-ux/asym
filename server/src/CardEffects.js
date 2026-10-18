const { distanceBetween, euclid } = require('./Hitbox');
const C = require('./Constants');

function forEachCurator(room, entity, radius, fn) {
  for (const [otherId, other] of room.players) {
    if (!other.isAsymRole) continue;
    const target = room.gameState.entities[otherId];
    if (target && distanceBetween(entity, target) <= radius) fn(otherId, target);
  }
}

const handlers = {
  rodar({ entity, now }) {
    const inputLength = Math.hypot(entity.input.moveX, entity.input.moveZ);
    const dirX = inputLength > 0 ? entity.input.moveX / inputLength : entity.faceX;
    const dirZ = inputLength > 0 ? entity.input.moveZ / inputLength : entity.faceZ;
    entity.dashUntil = now + C.ROLL_DASH_MS;
    entity.dashVX = (dirX * C.ROLL_DISTANCE) / (C.ROLL_DASH_MS / 1000);
    entity.dashVZ = (dirZ * C.ROLL_DISTANCE) / (C.ROLL_DASH_MS / 1000);
    entity.flojera = Math.max(0, entity.flojera - C.ROLL_FLOJERA_COST);
    entity.dashExhausted = entity.flojera === 0;
    if (entity.dashExhausted) entity.flojeraLockedUntil = now + C.FLOJERA_EXHAUST_LOCKOUT_MS;
  },

  chicharron({ room, playerId }) {
    room.damagePatient(playerId, C.CHICHARRON_DAMAGE, C.CHICHARRON_FLOOR);
    room.checkGameEndConditions();
  },

  goyslop({ room, playerId }) {
    room.damagePatient(playerId, C.GOYSLOP_DAMAGE, C.GOYSLOP_FLOOR);
    room.checkGameEndConditions();
  },

  cascara_platano({ room, playerId, entity, card, now }) {
    room.addZone({
      kind: 'trap',
      x: entity.x,
      z: entity.z,
      radius: C.TRAP_RADIUS,
      ownerId: playerId,
      armedAt: now + C.TRAP_ARM_MS,
      until: now + C.TRAP_LIFETIME_MS,
      cardId: card.id,
      stunMs: 2000,
      hpLoss: card.curatorHpLoss || 0,
    });
  },

  agua_rimac({ room, playerId, entity, card, now }) {
    room.addZone({ kind: 'rimac', cardId: card.id, x: entity.x, z: entity.z, radius: 4, perSecond: 4, ownerId: playerId, until: now + 5000 });
  },

  receta_falsa({ room, entity, card, now }) {
    forEachCurator(room, entity, card.hitRadius, (id, target) => {
      target.marcaUntil = now + 10000;
    });
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
    });
  },

  red_mist({ room, playerId, entity, card, now }) {
    forEachCurator(room, entity, card.hitRadius, (id, target) => {
      const heavy = Math.random() < 0.1;
      const damage = heavy ? 90 : 25;
      room.stun(id, target, heavy ? 3000 : card.durationMs, now, 0);
      room.adjustCuratorHp(-damage);
      room.healPatient(playerId, damage * 0.25);
    });
    room.checkGameEndConditions();
  },

  tropiezo({ room, playerId, entity, card, now }) {
    room.endlag(playerId, entity, now, 1200);
    entity.slowedLevel = 3;
    forEachCurator(room, entity, C.TROPIEZO_RADIUS, (id, target) => {
      room.ragdoll(id, target, card.durationMs, now);
      room.adjustCuratorHp(-(card.curatorHpLoss || 0));
      const away = euclid(target, entity) || 1;
      target.kbX = ((target.x - entity.x) / away) * 8;
      target.kbZ = ((target.z - entity.z) / away) * 8;
      target.kbUntil = now + 500;
    });
  },
};

function apply(room, playerId, entity, card, now) {
  const handler = handlers[card.id];
  if (handler) handler({ room, playerId, entity, card, now });
}

module.exports = { apply, handlers };
