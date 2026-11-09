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
      applySize(entity, 1);
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

function speedFactor(room, player, entity) {
  if (!room.bossActive || !player) return 1;
  if (player.isBoss) return Math.max(0.35, 1 / (0.6 + 0.4 * ((entity && entity.size) || 1)));
  return SPEED_MULT;
}

const SIZES = [0.14, 0.45, 1, 1.6, 2.5, 3.5];
const BASE_HALF = 2.5;
const BASE_H = 5;
const NOCLIP_SIZE = 1.6;
const PLAYER_HALF = 0.36;
const PLAYER_H = 1.8;

function applySize(entity, size) {
  entity.size = size;
  entity.bossHalf = Math.max(PLAYER_HALF, BASE_HALF * size);
  entity.bossH = Math.max(PLAYER_H, BASE_H * size);
}

function collision(player, entity) {
  if (!player || !player.isBoss || !entity.bossHalf) return { s: 1, h: PLAYER_H, noclip: false };
  return { s: entity.bossHalf / PLAYER_HALF, h: entity.bossH, noclip: (entity.size || 1) >= NOCLIP_SIZE };
}

function reachOf(size) {
  return Math.max(2.4, 3.2 * size + 1.8);
}

function dmgFactor(size) {
  return Math.max(0.5, Math.min(2.5, size));
}
const SIZE_CD_MS = 1500;
const TP_CD_MS = 9000;
const TP_MIN_MARK_MS = 800;
const TP_DELAY_MS = 1200;
const TP_RADIUS = 7;

function ready(entity, idx, now) {
  entity.bossCd = entity.bossCd || {};
  return (entity.bossCd[idx] || 0) <= now;
}

function ability(room, id, idx, now) {
  const entity = room.gameState.entities[id];
  if (!entity || entity.down || Status.blocksSkills(entity, now) || room.gameState.gameOver) return;
  if (!ready(entity, idx === 9 ? 0 : idx, now)) return;
  if (idx === 0 || idx === 9) {
    const cur = Math.max(0, SIZES.indexOf(entity.size || 1));
    const next = idx === 0 ? (cur + 1) % SIZES.length : (cur + SIZES.length - 1) % SIZES.length;
    applySize(entity, SIZES[next]);
    entity.bossCd = entity.bossCd || {};
    room.gameState.boss.size = entity.size;
    entity.bossCd[0] = now + SIZE_CD_MS;
    entity.lastAbilityAt = now;
  } else if (idx === 1) {
    if (entity.tpAt) return;
    if (!entity.tpMark) {
      entity.tpMark = { x: entity.x, z: entity.z, at: now };
      return;
    }
    if (now - entity.tpMark.at < TP_MIN_MARK_MS) return;
    entity.tpAt = now + TP_DELAY_MS;
    entity.paraFrom = now;
    entity.paraUntil = entity.tpAt + 200;
    entity.bossCd[1] = now + TP_CD_MS;
    entity.lastAbilityAt = now;
  } else if (idx >= 2 && idx < ABILITY_COUNT) {
    if (idx === 8 && entity.ultAt) return;
    if (extra(room, id, idx, now)) {
      entity.bossCd[idx] = now + (CD[idx] || 10000);
      entity.lastAbilityAt = now;
    }
  }
}

const ABILITY_COUNT = 9;
const CD = { 2: 14000, 3: 16000, 4: 22000, 5: 40000, 6: 45000, 7: 18000, 8: 60000 };
const BLUE_MS = 4000;
const STATIC_RADIUS = 16;
const CENSOR_RADIUS = 14;
const CENSOR_MS = 6000;
const GRAB_RANGE = 18;
const GRAB_MS = 3000;
const SHADOW_MS = 8000;
const SHADOW_DELAY = 2000;
const SHADOW_RADIUS = 3;
const FRAME_RADIUS = 25;
const FRAME_SHIFT_MS = 3000;
const LIVE_MS = 8000;
const LIVE_RANGE = 45;
const ULT_RADIUS = 45;
const ULT_TELEGRAPH_MS = 1500;
const ULT_PARALYSIS_MS = 3000;
const ULT_RED_MS = 7000;
const ULT_REAL = 30;
const ULT_DEBT = 20;
const RETRO_DEBT = 14;
const VMODES = ['azul', 'estatica', 'censura'];

function nearestPlayer(room, bossId, boss, range) {
  let best = null;
  let bd = range;
  for (const [id, e] of Object.entries(room.gameState.entities)) {
    if (id === bossId || e.down || e.gone || e.corpse) continue;
    const d = Math.hypot(e.x - boss.x, e.z - boss.z);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

function inRadius(room, bossId, x, z, r) {
  const out = [];
  for (const [id, e] of Object.entries(room.gameState.entities)) {
    if (id === bossId || e.down || e.gone || e.corpse) continue;
    if (Math.hypot(e.x - x, e.z - z) <= r) out.push(id);
  }
  return out;
}

function extra(room, id, idx, now) {
  const gs = room.gameState;
  const boss = gs.entities[id];
  const ents = gs.entities;
  if (idx === 2) {
    const mode = VMODES[boss.vmode || 0];
    boss.vmode = ((boss.vmode || 0) + 1) % VMODES.length;
    if (mode === 'azul') {
      const t = nearestPlayer(room, id, boss, 40);
      if (!t) return false;
      ents[t].blueUntil = now + BLUE_MS;
    } else if (mode === 'estatica') {
      for (const t of inRadius(room, id, boss.x, boss.z, STATIC_RADIUS)) {
        Status.apply(ents[t], 'reveal', 4000, now);
        Status.apply(ents[t], 'slow', 4000, now, { level: 2 });
      }
    } else {
      gs.censors = (gs.censors || []).filter((c) => c.until > now);
      gs.censors.push({ x: boss.x, z: boss.z, r: CENSOR_RADIUS, until: now + CENSOR_MS });
    }
    return true;
  }
  if (idx === 3) {
    const t = nearestPlayer(room, id, boss, GRAB_RANGE);
    if (!t) { loseSp(boss, 2); return true; }
    Status.apply(ents[t], 'stun', GRAB_MS, now);
    ents[t].noCureUntil = now + GRAB_MS;
    addFatiga(room, t, 6, 4, now);
    return true;
  }
  if (idx === 4) {
    const t = nearestPlayer(room, id, boss, 45);
    if (!t) return false;
    boss.shadow = { target: t, until: now + SHADOW_MS, nextHit: now + 500, x: ents[t].x, z: ents[t].z, trail: [] };
    return true;
  }
  if (idx === 5) {
    const ids = inRadius(room, id, boss.x, boss.z, FRAME_RADIUS);
    if (!ids.length) { loseSp(boss, 2); return true; }
    const back = Math.random() < 0.5;
    for (const t of ids) {
      const e = ents[t];
      const sign = back ? 1 : -1;
      for (const m of [e.skillCooldowns, e.cardCooldowns]) {
        if (!m) continue;
        for (const k of Object.keys(m)) if (m[k] > now) m[k] = Math.max(now, m[k] + sign * FRAME_SHIFT_MS);
      }
      if (e.baseCooldownUntil > now) e.baseCooldownUntil = Math.max(now, e.baseCooldownUntil + sign * FRAME_SHIFT_MS);
      if (back) {
        const past = (e.hist || []).find((h) => h.t >= now - FRAME_SHIFT_MS);
        if (past) { e.x = past.x; e.z = past.z; }
      } else {
        const h = e.hist || [];
        const old = h.find((p) => p.t >= now - 1000);
        if (old) {
          e.x += (e.x - old.x) * 3;
          e.z += (e.z - old.z) * 3;
        }
      }
    }
    return true;
  }
  if (idx === 6) {
    const lp = room.lastPulse;
    const radius = lp && now - lp.at < 60000 ? Math.max(5, Math.min(20, lp.radius || 8)) : 8;
    let hit = 0;
    for (const t of inRadius(room, id, boss.x, boss.z, radius)) {
      addFatiga(room, t, 0, RETRO_DEBT, now);
      hit++;
    }
    loseSp(boss, hit ? 3 : 2);
    return true;
  }
  if (idx === 7) {
    const t = nearestPlayer(room, id, boss, LIVE_RANGE);
    if (!t) return false;
    ents[t].liveUntil = now + LIVE_MS;
    return true;
  }
  if (idx === 8) {
    if (!(boss.sp <= SP_ULT)) return false;
    boss.ultAt = now + ULT_TELEGRAPH_MS;
    return true;
  }
  return false;
}

function fireUlt(room, id, boss, now) {
  boss.ultAt = 0;
  for (const t of inRadius(room, id, boss.x, boss.z, ULT_RADIUS)) {
    const e = room.gameState.entities[t];
    Status.apply(e, 'stun', ULT_PARALYSIS_MS, now);
    e.redUntil = now + ULT_RED_MS;
    e.redKind = room.players.get(t)?.isAsymRole ? 'n' : 'p';
    addFatiga(room, t, ULT_REAL, ULT_DEBT, now);
  }
  boss.sp = SP_MAX;
}

function finishTeleport(room, id, entity, now) {
  const mark = entity.tpMark;
  entity.tpAt = 0;
  entity.tpMark = null;
  entity.paraFrom = 0;
  entity.paraUntil = 0;
  if (!mark) return;
  entity.x = mark.x;
  entity.z = mark.z;
  let hit = 0;
  for (const [oid, other] of Object.entries(room.gameState.entities)) {
    if (oid === id || other.down || other.gone || other.corpse) continue;
    if (Math.hypot(other.x - entity.x, other.z - entity.z) > TP_RADIUS) continue;
    addFatiga(room, oid, STRIKE_FATIGA, STRIKE_DEBT, now);
    hit++;
  }
  loseSp(entity, hit ? 3 : 2);
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
  const reach = reachOf(entity.size || 1) + (entity.bossHalf || 0) * 0.5;
  entity.strikeAt = now;
  const dmg = dmgFactor(entity.size || 1);
  let hit = 0;
  for (const [id, other] of Object.entries(room.gameState.entities)) {
    if (id === bossId || other.down || other.gone || other.corpse) continue;
    if (Math.hypot(other.x - entity.x, other.z - entity.z) > reach) continue;
    addFatiga(room, id, STRIKE_FATIGA * dmg, STRIKE_DEBT * dmg, now);
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
  if (boss.tpAt && now >= boss.tpAt) finishTeleport(room, bossId, boss, now);
  if (boss.ultAt && now >= boss.ultAt) fireUlt(room, bossId, boss, now);
  if (boss.shadow) tickShadow(room, bossId, boss, now);
  for (const [id, e] of players) {
    e.hist = e.hist || [];
    const last = e.hist[e.hist.length - 1];
    if (!last || now - last.t >= 200) e.hist.push({ t: now, x: e.x, z: e.z });
    while (e.hist.length && e.hist[0].t < now - 6000) e.hist.shift();
  }
  const bcd = [];
  for (let i = 0; i < ABILITY_COUNT; i++) bcd.push(Math.max(0, Math.round((((boss.bossCd || {})[i] || 0) - now) / 100) / 10));
  boss.bcdPub = bcd;
  onCollapseTick(room, now);
}

function tickShadow(room, bossId, boss, now) {
  const sh = boss.shadow;
  const target = room.gameState.entities[sh.target];
  if (!target || now > sh.until) { boss.shadow = null; return; }
  sh.trail.push({ t: now, x: target.x, z: target.z });
  while (sh.trail.length > 1 && sh.trail[1].t <= now - SHADOW_DELAY) sh.trail.shift();
  sh.x = sh.trail[0].x;
  sh.z = sh.trail[0].z;
  if (now >= sh.nextHit) {
    sh.nextHit = now + 500;
    for (const t of inRadius(room, bossId, sh.x, sh.z, SHADOW_RADIUS)) addFatiga(room, t, 4, 2, now);
  }
}

function censored(room, entity, now) {
  const list = room.gameState.censors;
  if (!list || !entity) return false;
  for (const c of list) if (c.until > now && Math.hypot(entity.x - c.x, entity.z - c.z) <= c.r) return true;
  return false;
}

function cureBlocked(room, entity, now) {
  return Boolean(entity) && ((entity.noCureUntil || 0) > now || censored(room, entity, now));
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
  collision,
  reachOf,
  censored,
  cureBlocked,
  ability,
  tick,
  checkEnd,
  bossEntry,
};
