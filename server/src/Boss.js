const Status = require('./Status');

const BOSS_DURATION_MS = 27 * 60 * 1000;
const BOSS_EVERY = 12;
const FATIGA_CAP_PER_COLLAPSE = 70;
const DEBT_DIVISOR = 20;
const HP_MULT = 8;
const FLOJERA_MULT = 2.5;
const SPEED_MULT = 0.95;
const SP_MAX = 100;
const SP_ULT = 25;
const TEMBLOR_RANGE = 14;
const TEMBLOR_MAX = 100;
const STRIKE_REACH = 5;
const STRIKE_FATIGA = 12;
const STRIKE_DEBT = 6;
const STRIKE_COOLDOWN_MS = 1400;
const SWARM_RANGE = 12;
const IDLE_SP_MS = 10000;
const DOWN_MS = 3600000;

function isActive(room) {
  return Boolean(room.bossActive);
}

function isDue(room) {
  return room.isDefault && (room.matchCount + 1) % BOSS_EVERY === 0;
}

function pickBoss(room) {
  const curatorId = [...room.players.entries()].find(([, p]) => p.isAsymRole)?.[0];
  const humans = [...room.players.entries()].filter(([id, p]) => !p.isBot && id !== curatorId);
  if (room.bossId && room.bossId !== 'random' && room.players.has(room.bossId) && room.bossId !== curatorId) return room.bossId;
  if (humans.length > 1 || (humans.length === 1 && room.players.size > 2)) return humans[Math.floor(Math.random() * humans.length)][0];
  const bots = [...room.players.entries()].filter(([id, p]) => p.isBot && id !== curatorId);
  if (bots.length) return bots[Math.floor(Math.random() * bots.length)][0];
  return humans.length ? humans[0][0] : null;
}

function prepare(room) {
  for (const p of room.players.values()) p.isBoss = false;
  room.bossActive = false;
  if (!room.tutorial && (isDue(room) || room.bossOn)) {
    const id = pickBoss(room);
    if (id) {
      room.players.get(id).isBoss = true;
      room.bossActive = true;
    }
  }
}

function bossEntry(room) {
  for (const [id, p] of room.players) if (p.isBoss) return [id, room.gameState.entities[id]];
  return [null, null];
}

function setup(room) {
  const gs = room.gameState;
  gs.boss = null;
  if (!room.bossActive) return;
  gs.timeRemainingMs = BOSS_DURATION_MS;
  const [bossId] = bossEntry(room);
  gs.boss = { id: bossId, size: 1 };
  for (const [id, entity] of Object.entries(gs.entities)) {
    const player = room.players.get(id);
    entity.fatiga = 0;
    entity.debt = 0;
    entity.down = false;
    entity.fatigaCap = 1;
    entity.sp = undefined;
    entity.temblor = 0;
    if (!player) continue;
    if (player.isBoss) {
      entity.sp = SP_MAX;
      entity.lastAbilityAt = Date.now();
      entity.size = 1;
      entity.flojeraMax = 9999;
      entity.flojera = 9999;
      entity.spriteScale = 1;
      continue;
    }
    entity.fatigaCap = HP_MULT;
    entity.flojeraMax = Math.round(entity.flojeraMax * FLOJERA_MULT);
    entity.flojera = entity.flojeraMax;
    const patient = gs.patients[id];
    if (patient) {
      patient.hp *= HP_MULT;
      patient.maxHp *= HP_MULT;
    }
  }
  if (gs.curator) {
    gs.curator.hp *= HP_MULT;
    gs.curator.max *= HP_MULT;
  }
}

function speedFactor(room, player) {
  if (!room.bossActive || !player || player.isBoss) return 1;
  return SPEED_MULT;
}

function takeDown(room, id, entity, now) {
  if (entity.down) return;
  entity.down = true;
  entity.fatiga = 100;
  Status.apply(entity, 'stun', DOWN_MS, now);
  const patient = room.gameState.patients[id];
  if (patient && patient.status === 'alive') patient.status = 'down';
  if (room.players.get(id)?.isAsymRole) room.gameState.curatorDown = true;
}

function addFatiga(room, id, real, imag, now) {
  const entity = room.gameState.entities[id];
  if (!entity || entity.down || room.players.get(id)?.isBoss) return;
  const cap = entity.fatigaCap || 1;
  entity.fatiga = Math.min(100, entity.fatiga + real / cap);
  entity.debt += imag / cap;
  if (entity.fatiga >= 100) takeDown(room, id, entity, now);
}

function collapse(room, id, now) {
  const entity = room.gameState.entities[id];
  if (!entity || entity.down || entity.debt <= 0) return 0;
  const applied = Math.min(FATIGA_CAP_PER_COLLAPSE, (entity.debt * entity.debt) / DEBT_DIVISOR);
  entity.debt = 0;
  entity.fatiga = Math.min(100, entity.fatiga + applied);
  if (entity.fatiga >= 100) takeDown(room, id, entity, now);
  return applied;
}

function loseSp(entity, amount) {
  if (entity.sp === undefined) return;
  entity.sp = Math.max(0, entity.sp - amount);
}

function strike(room, bossId, now) {
  const entity = room.gameState.entities[bossId];
  if (!entity || entity.down || Status.blocksSkills(entity, now)) return;
  if (entity.baseCooldownUntil > now) return;
  entity.baseCooldownUntil = now + STRIKE_COOLDOWN_MS;
  entity.lastAbilityAt = now;
  const reach = STRIKE_REACH * (entity.size || 1);
  let hit = 0;
  for (const [id, other] of Object.entries(room.gameState.entities)) {
    if (id === bossId || other.down || other.gone || other.corpse) continue;
    if (Math.hypot(other.x - entity.x, other.z - entity.z) > reach) continue;
    addFatiga(room, id, STRIKE_FATIGA, STRIKE_DEBT, now);
    hit++;
  }
  if (hit) loseSp(entity, 3);
  else loseSp(entity, 2);
}

function onCollapseTick(room, now) {
  for (const [id, entity] of Object.entries(room.gameState.entities)) {
    if (entity.down || room.players.get(id)?.isBoss) continue;
    if (entity.debt >= 40) collapse(room, id, now);
  }
}

function tick(room, now, dt) {
  if (!room.bossActive || room.gameState.gameOver) return;
  const gs = room.gameState;
  const [bossId, boss] = bossEntry(room);
  if (!boss) return;
  const sec = dt;
  const players = Object.entries(gs.entities).filter(([id, e]) => id !== bossId && !e.down && !e.gone);
  const near = players.filter(([, e]) => Math.hypot(e.x - boss.x, e.z - boss.z) <= SWARM_RANGE).length;
  if (near >= 3) boss.sp = Math.max(0, boss.sp - sec);
  if (now - (boss.lastAbilityAt || now) > IDLE_SP_MS) {
    boss.lastAbilityAt = now;
    loseSp(boss, 5);
  }
  const rage = 1 + (SP_MAX - boss.sp) / SP_MAX;
  for (const [, e] of players) {
    const d = Math.hypot(e.x - boss.x, e.z - boss.z);
    if (d <= TEMBLOR_RANGE) e.temblor = Math.min(TEMBLOR_MAX, (e.temblor || 0) + sec * 12 * rage);
    else e.temblor = Math.max(0, (e.temblor || 0) - sec * 8);
  }
  boss.ultReady = boss.sp <= SP_ULT;
  onCollapseTick(room, now);
}

function checkEnd(room) {
  if (!room.bossActive) return null;
  const gs = room.gameState;
  const patients = Object.values(gs.patients);
  const anyAlive = patients.some((p) => p.status === 'alive');
  if (anyAlive) return null;
  if (patients.every((p) => p.status === 'down')) return gs.curatorDown ? 'boss_won' : null;
  return 'all_resolved';
}

module.exports = {
  BOSS_DURATION_MS,
  BOSS_EVERY,
  isActive,
  isDue,
  prepare,
  setup,
  speedFactor,
  addFatiga,
  collapse,
  loseSp,
  strike,
  tick,
  checkEnd,
  bossEntry,
};
