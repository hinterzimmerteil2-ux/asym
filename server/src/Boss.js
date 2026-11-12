const Status = require('./Status');
const { MessageType } = require('./protocol');

const BOSS_DURATION_MS = 27 * 60 * 1000;
const BOSS_EVERY = 12;
const FATIGA_CAP_PER_COLLAPSE = 70;
const DEBT_DIVISOR = 20;
const HP_MULT = 8;
const FLOJERA_MULT = 2.5;
const SPEED_MULT = 0.95;
const SP_MAX = 0;
const SP_MIN = -45;
const SP_ULT = -34;
const TEMBLOR_RANGE = 16;
const TEMBLOR_MAX = 70;
const STRIKE_FATIGA = 8;
const STRIKE_DEBT = 90;
const BOSS_HP = 15000000;
const BOSS_HP_MAX = 30000000;
const BOSS_FLOJERA = 1200;
const DMG_M1 = 12500;
const DMG_MELEE = 25000;
const DMG_AREA = 40000;
const DMG_CARD = 9000;
const STRIKE_COOLDOWN_MS = 1400;
const SWARM_RANGE = 14;
const IDLE_SP_MS = 12000;
const DOWN_MS = 3600000;
const SP_HIT = 1.2;
const SP_MISS = 0.8;

const SIZES = [0.18, 0.4, 0.7, 1, 2, 3.5];
const SIZE_MIN = SIZES[0];
const SIZE_MAX = SIZES[SIZES.length - 1];
const NOCLIP_SIZE = 0.7;
const PLAYER_HALF = 0.36;
const PLAYER_H = 1.8;
const SIZE_CD_BASE = 6000;
const SIZE_CD_PER_OCTAVE = 6000;
const CROUCH_H = 0.4;
const CROUCH_W = 0.9;
const CROUCH_SPEED = 0.7;

const ABILITY_COUNT = 9;
const CD = { 2: 24000, 3: 26000, 4: 36000, 5: 70000, 6: 80000, 7: 30000, 8: 100000 };
const TP_CD_MS = 15000;
const TP_MIN_MARK_MS = 800;
const TP_DELAY_MS = 1400;
const TP_RADIUS = 9;
const TP_SP_PER_S = 1;
const SCREEN_DELAY_MS = 900;
const SCREEN_ARC_COS = Math.cos((135 * Math.PI) / 180);
const DRUNK_MS = 4500;
const CENSOR_MS = 4000;
const STATIC_MS = 3000;
const GRAB_TELEGRAPH_MS = 700;
const GRAB_RANGE = 34;
const GRAB_MS = 1500;
const STUN_IMMUNE_MS = 3000;
const SHADOW_MS = 8000;
const SHADOW_DELAY = 2000;
const SHADOW_RADIUS = 3;
const FRAME_RADIUS = 30;
const FRAME_SHIFT_MS = 3000;
const LIVE_MS = 8000;
const LIVE_RANGE = 400;
const SCAN_MS = 7000;
const BOSS_HOLD_MS = 60000;
const ULT_RADIUS = 60;
const ULT_TELEGRAPH_MS = 1600;
const ULT_PARALYSIS_MS = 1600;
const ULT_RED_MS = 7000;
const ULT_REAL = 90;
const ULT_DEBT = 60;
const RETRO_DEBT = 70;
const VMODES = ['azul', 'blanca', 'negra'];
const CHAT_EVERY_MS = 650;

const CHAT_GOOD = [
  'Estás haciendo un buen trabajo',
  'Respira, ya casi',
  'Hoy te ves muy bien',
  'Tu mamá estaría orgullosa',
  'Todo va a salir bien',
  'Eres más fuerte que un cubo con patas',
  'Un paso más y listo',
  'Qué bonito caminas',
  'La pantalla te quiere',
];
const CHAT_BAD = [
  'Dejaste la estufa prendida',
  'Nadie lee tus notas',
  'Tu sombra camina mejor que tú',
  'Ese gorro no te queda',
  'El cubo cocina mejor',
  'Olvidaste algo en casa',
  'Hasta la tele te ignora',
  'Tu cafetera te extraña menos de lo que crees',
  'Ya nadie contesta tus mensajes',
];

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

function refreshExtents(entity) {
  const size = entity.size || 1;
  const cr = entity.crouch ? 1 : 0;
  entity.bossHalf = Math.max(PLAYER_HALF, 2.4 * size - 0.4) * (cr ? CROUCH_W : 1);
  entity.bossH = Math.max(cr ? 1.2 : PLAYER_H, 5.5 * size * (cr ? CROUCH_H : 1));
  entity.bossHitHalf = Math.max(0.8, 2.2 * size) * (cr ? CROUCH_W : 1);
  entity.bossHitH = Math.max(2.4, 5.5 * size * (cr ? 0.55 : 1));
}

function applySize(entity, size) {
  entity.size = size;
  refreshExtents(entity);
}

function freeSpot(room, from, dx, dz, half) {
  const GameMap = require('./GameMap');
  const plats = GameMap.resolvePlatforms(room.mapId, GameMap.areaFor(room.mapId)).filter((p) => p.kind !== 'pit' && !p.ramp && !p.slab && (p.h || 0) >= 1.2);
  const clear = (x, z) => !plats.some((p) => Math.abs(x - p.x) <= p.hx + 5 && Math.abs(z - p.z) <= p.hz + 5);
  const base = Math.atan2(dz, dx);
  for (let r = half; r >= half * 0.3; r -= half * 0.05) {
    for (const off of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1]) {
      const a = base + off;
      const x = Math.max(-half, Math.min(half, from.x + Math.cos(a) * r));
      const z = Math.max(-half, Math.min(half, from.z + Math.sin(a) * r));
      if (clear(x, z)) return { x, z };
    }
  }
  return { x: Math.max(-half, Math.min(half, from.x + dx * half)), z: Math.max(-half, Math.min(half, from.z + dz * half)) };
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
      entity.holdUntil = Date.now() + BOSS_HOLD_MS;
      entity.paraUntil = entity.holdUntil;
      Status.apply(entity, 'stun', BOSS_HOLD_MS, Date.now());
      entity.crouch = false;
      applySize(entity, 1);
      entity.flojeraMax = BOSS_FLOJERA;
      entity.flojera = BOSS_FLOJERA;
      entity.hp = BOSS_HP;
      entity.hpMax = BOSS_HP_MAX;
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
  if (player.isBoss) {
    const base = Math.max(0.4, 1 / (0.6 + 0.3 * ((entity && entity.size) || 1)));
    return entity && entity.crouch ? base * CROUCH_SPEED : base;
  }
  return SPEED_MULT;
}

function collision(player, entity) {
  if (!player || !player.isBoss || !entity.bossHalf) return { s: 1, h: PLAYER_H, noclip: false };
  return { s: entity.bossHalf / PLAYER_HALF, h: entity.bossH, noclip: (entity.size || 1) >= NOCLIP_SIZE && !entity.crouch };
}

function reachOf(size) {
  return Math.max(2.6, 5 * size + 3);
}

function dmgFactor(size) {
  return Math.max(0.5, Math.min(2.5, size));
}

function facing(entity) {
  const fx = entity.faceX || 0;
  const fz = entity.faceZ || 0;
  const l = Math.hypot(fx, fz);
  return l > 0.01 ? [fx / l, fz / l] : [0, 1];
}

function ready(entity, idx, now) {
  entity.bossCd = entity.bossCd || {};
  return (entity.bossCd[idx] || 0) <= now;
}

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

function loseSp(entity, amount, why) {
  if (entity.sp === undefined) return;
  const before = entity.sp;
  entity.sp = Math.max(SP_MIN, entity.sp - amount);
  const d = before - entity.sp;
  if (d <= 0) return;
  const ev = entity.spEv || (entity.spEv = { d: 0, t: 0, w: why || '' });
  if (!ev.t) ev.t = Date.now();
  ev.d += d;
  if (why) ev.w = why;
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

function curatorHp(room, id, fatPts) {
  const c = room.gameState.curator;
  if (!c || !room.players.get(id)?.isAsymRole) return;
  room.adjustCuratorHp(-(fatPts / 100) * (c.max / 2));
}

function addFatiga(room, id, real, imag, now) {
  const entity = room.gameState.entities[id];
  if (!entity || entity.down || room.players.get(id)?.isBoss) return;
  const cap = entity.fatigaCap || 1;
  entity.fatiga = Math.min(100, entity.fatiga + real / cap);
  entity.debt += imag / cap;
  curatorHp(room, id, real / cap);
  if (entity.fatiga >= 100) takeDown(room, id, entity, now);
}

function collapse(room, id, now) {
  const entity = room.gameState.entities[id];
  if (!entity || entity.down || entity.debt <= 0) return 0;
  const applied = Math.min(FATIGA_CAP_PER_COLLAPSE, (entity.debt * entity.debt) / DEBT_DIVISOR);
  entity.debt = 0;
  entity.fatiga = Math.min(100, entity.fatiga + applied);
  curatorHp(room, id, applied);
  if (entity.fatiga >= 100) takeDown(room, id, entity, now);
  return applied;
}

function setSize(room, id, size, now) {
  const entity = room.gameState.entities[id];
  if (!entity || entity.down || Status.blocksSkills(entity, now) || entity.tpAt) return false;
  if (!ready(entity, 0, now)) return false;
  const next = Math.max(SIZE_MIN, Math.min(SIZE_MAX, Number(size)));
  if (!Number.isFinite(next)) return false;
  const cur = entity.size || 1;
  const octaves = Math.abs(Math.log2(next / cur));
  if (octaves < 0.05) return false;
  applySize(entity, next);
  room.gameState.boss.size = next;
  entity.bossCd[0] = now + SIZE_CD_BASE + SIZE_CD_PER_OCTAVE * octaves;
  entity.bfx = { k: next > cur ? 0 : 9, t: now };
  entity.lastAbilityAt = now;
  return true;
}

function setCrouch(room, id, on) {
  const entity = room.gameState.entities[id];
  if (!entity || !room.players.get(id)?.isBoss || entity.down) return;
  const v = Boolean(on);
  if (Boolean(entity.crouch) === v) return;
  entity.crouch = v;
  refreshExtents(entity);
}

function ability(room, id, idx, now) {
  const entity = room.gameState.entities[id];
  if (!entity || entity.down || Status.blocksSkills(entity, now) || room.gameState.gameOver) return;
  if (!ready(entity, idx === 9 ? 0 : idx, now)) return;
  if (idx === 0 || idx === 9) {
    const cur = Math.max(0, SIZES.findIndex((s) => Math.abs(s - (entity.size || 1)) < 0.001));
    const next = idx === 0 ? Math.min(SIZES.length - 1, cur + 1) : Math.max(0, cur - 1);
    if (next === cur) return;
    setSize(room, id, SIZES[next], now);
  } else if (idx === 1) {
    if (entity.tpAt) return;
    if (!entity.tpMark) {
      entity.tpMark = { x: entity.x, z: entity.z, at: now };
      return;
    }
    if (now - entity.tpMark.at < TP_MIN_MARK_MS) return;
    entity.bfx = { k: 1, t: now };
    entity.tpAt = now + TP_DELAY_MS;
    entity.paraFrom = now;
    entity.paraUntil = entity.tpAt + 200;
    entity.bossCd[1] = now + TP_CD_MS;
    entity.lastAbilityAt = now;
    loseSp(entity, 2, 'canal');
  } else if (idx >= 2 && idx < ABILITY_COUNT) {
    if (idx === 8 && entity.ultAt) return;
    entity.bfxT = null;
    entity.bfxExtra = null;
    if (extra(room, id, idx, now)) {
      const T = entity.bfxT;
      entity.bfx = { k: idx, t: now, tx: T ? Math.round(T.x * 10) / 10 : undefined, tz: T ? Math.round(T.z * 10) / 10 : undefined, ...(entity.bfxExtra || {}) };
      entity.bossCd[idx] = now + (CD[idx] || 10000);
      entity.lastAbilityAt = now;
    }
  }
}

function extra(room, id, idx, now) {
  const gs = room.gameState;
  const boss = gs.entities[id];
  const ents = gs.entities;
  if (idx === 2) {
    const mode = boss.vmode || 0;
    boss.vmode = (mode + 1) % VMODES.length;
    const [dx, dz] = facing(boss);
    const r = Math.min(70, 30 + 8 * (boss.size || 1));
    boss.screenFx = { at: now + SCREEN_DELAY_MS, mode, dx, dz, r };
    boss.bfxExtra = { m: mode, fx: Math.round(dx * 100) / 100, fz: Math.round(dz * 100) / 100, r: Math.round(r) };
    return true;
  }
  if (idx === 3) {
    let t = null;
    {
      const [afx, afz] = facing(boss);
      let bs = Infinity;
      for (const [pid, pe] of Object.entries(ents)) {
        if (pid === id || pe.down || pe.gone || pe.corpse) continue;
        const rx = pe.x - boss.x;
        const rz = pe.z - boss.z;
        const d = Math.hypot(rx, rz);
        if (d > GRAB_RANGE || d < 0.01) continue;
        const cos = (rx * afx + rz * afz) / d;
        const score = d * (1 + 3 * (1 - cos)) * (room.players.get(pid)?.isAsymRole ? 0.7 : 1);
        if (score < bs) { bs = score; t = pid; }
      }
    }
    for (const [pid, pe] of Object.entries(room.gameState.entities)) {
      if (pid !== id && !pe.down && !pe.gone && pe.sig && pe.sig.m === 0 && pe.sig.until > now && Math.hypot(pe.x - boss.x, pe.z - boss.z) <= GRAB_RANGE * 1.4) { t = pid; break; }
    }
    if (!t) return false;
    const e = ents[t];
    const dist = Math.hypot(e.x - boss.x, e.z - boss.z) || 1;
    const w = Math.max(3, 2.2 * (boss.size || 1) + 2);
    boss.grab = { t, at: now + GRAB_TELEGRAPH_MS, dx: (e.x - boss.x) / dist, dz: (e.z - boss.z) / dist, len: Math.min(GRAB_RANGE + 6, dist + 4), w };
    boss.bfxT = { x: e.x, z: e.z };
    boss.bfxExtra = { w: Math.round(w * 10) / 10, len: Math.round(boss.grab.len) };
    return true;
  }
  if (idx === 4) {
    const t = nearestPlayer(room, id, boss, 60);
    if (!t) return false;
    boss.shadow = { target: t, until: now + SHADOW_MS, nextHit: now + 500, x: ents[t].x, z: ents[t].z, trail: [] };
    boss.bfxT = { x: ents[t].x, z: ents[t].z };
    return true;
  }
  if (idx === 5) {
    const ids = inRadius(room, id, boss.x, boss.z, FRAME_RADIUS);
    boss.bfxExtra = { r: FRAME_RADIUS };
    if (!ids.length) { loseSp(boss, SP_MISS, 'fallo'); return true; }
    const back = Math.random() < 0.5;
    boss.bfxExtra.back = back ? 1 : 0;
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
    const radius = lp && now - lp.at < 60000 ? Math.max(6, Math.min(24, lp.radius || 9)) : 9;
    boss.bfxExtra = { r: Math.round(radius) };
    let hit = 0;
    for (const t of inRadius(room, id, boss.x, boss.z, radius)) {
      addFatiga(room, t, 0, RETRO_DEBT, now);
      hit++;
    }
    loseSp(boss, hit ? SP_HIT : SP_MISS, hit ? 'golpe' : 'fallo');
    return true;
  }
  if (idx === 7) {
    const t = nearestPlayer(room, id, boss, LIVE_RANGE);
    if (!t) return false;
    ents[t].liveUntil = now + LIVE_MS;
    boss.scanUntil = now + SCAN_MS;
    boss.bfxT = { x: ents[t].x, z: ents[t].z };
    return true;
  }
  if (idx === 8) {
    if (!(boss.sp <= SP_ULT)) return false;
    boss.ultAt = now + ULT_TELEGRAPH_MS;
    return true;
  }
  return false;
}

function fireScreen(room, id, boss, now) {
  const fx = boss.screenFx;
  boss.screenFx = null;
  if (!fx) return;
  let hit = 0;
  for (const t of inRadius(room, id, boss.x, boss.z, fx.r)) {
    const e = room.gameState.entities[t];
    const rx = e.x - boss.x;
    const rz = e.z - boss.z;
    const d = Math.hypot(rx, rz) || 1;
    if ((rx * fx.dx + rz * fx.dz) / d < SCREEN_ARC_COS) continue;
    hit++;
    e.sig = { m: fx.mode, until: now + 8000 };
    if (fx.mode === 0) {
      e.drunkUntil = now + DRUNK_MS;
      e.drunkAmt = 1;
      e.drunkNext = 0;
    } else if (fx.mode === 1) {
      Status.apply(e, 'reveal', STATIC_MS, now);
      Status.apply(e, 'slow', STATIC_MS, now, { level: 2 });
    } else {
      e.censorUntil = now + CENSOR_MS;
      e.noCureUntil = now + CENSOR_MS;
    }
  }
  loseSp(boss, hit ? SP_HIT : SP_MISS, hit ? 'golpe' : 'fallo');
}

function stunOnce(e, ms, now) {
  if ((e.stunImmuneUntil || 0) > now) return false;
  Status.apply(e, 'stun', ms, now);
  e.stunImmuneUntil = now + ms + STUN_IMMUNE_MS;
  return true;
}

function fireGrab(room, id, boss, now) {
  const g = boss.grab;
  boss.grab = null;
  if (!g) return;
  let hit = 0;
  const lock = g.t && room.gameState.entities[g.t];
  if (lock && !lock.down && !lock.gone && !lock.corpse) {
    const lx = lock.x - boss.x;
    const lz = lock.z - boss.z;
    const ld = Math.hypot(lx, lz) || 1;
    if (ld <= GRAB_RANGE + 8) {
      g.dx = lx / ld;
      g.dz = lz / ld;
      g.len = Math.max(g.len, ld + 1);
    }
  }
  for (const [t, e] of Object.entries(room.gameState.entities)) {
    if (t === id || e.down || e.gone || e.corpse) continue;
    const rx = e.x - boss.x;
    const rz = e.z - boss.z;
    const f = rx * g.dx + rz * g.dz;
    const s = Math.abs(rx * g.dz - rz * g.dx);
    if (t !== g.t && (f < 0 || f > g.len || s > g.w / 2 + 0.4)) continue;
    if (t === g.t && Math.hypot(rx, rz) > GRAB_RANGE + 8) continue;
    const stunned = stunOnce(e, GRAB_MS, now);
    if (stunned) e.noCureUntil = now + GRAB_MS;
    addFatiga(room, t, 20, 30, now);
    const stop = (boss.bossHalf || 1) + 1.6;
    if (stunned) e.reel = { until: now + 600, tx: boss.x + g.dx * stop, tz: boss.z + g.dz * stop };
    hit++;
  }
  loseSp(boss, hit ? SP_HIT : SP_MISS, hit ? 'golpe' : 'fallo');
}

function fireUlt(room, id, boss, now) {
  boss.ultAt = 0;
  for (const t of inRadius(room, id, boss.x, boss.z, ULT_RADIUS)) {
    const e = room.gameState.entities[t];
    stunOnce(e, ULT_PARALYSIS_MS, now);
    e.redUntil = now + ULT_RED_MS;
    e.redKind = room.players.get(t)?.isAsymRole ? 'n' : 'p';
    e.redChatAt = now;
    addFatiga(room, t, ULT_REAL, ULT_DEBT, now);
  }
  boss.sp = SP_MAX;
  boss.bfx = { k: 'ultfire', t: now };
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
  entity.bfx = { k: 'tparrive', t: now };
  loseSp(entity, hit ? SP_HIT : SP_MISS, hit ? 'golpe' : 'fallo');
}

function glitch(room, boss, now) {
  const gs = room.gameState;
  if (!players_near(room, boss)) return;
  const GameMap = require('./GameMap');
  const cands = GameMap.resolvePlatforms(room.mapId, GameMap.areaFor(room.mapId)).filter((p) => {
    if (p.kind === 'pit' || p.ramp || p.slab || (p.h || 0) < 1.2 || p.blockMax > 0) return false;
    if ((gs.plankBroken || {})[p.id] !== undefined) return false;
    return Math.hypot(p.x - boss.x, p.z - boss.z) <= 40;
  });
  if (!cands.length) return;
  const p = cands[Math.floor(Math.random() * cands.length)];
  for (const e of Object.values(gs.entities)) {
    if (e.boss || e.down) continue;
    if (Math.abs(e.x - p.x) <= p.hx + 0.6 && Math.abs(e.z - p.z) <= p.hz + 0.6) return;
  }
  gs.plankBroken = gs.plankBroken || {};
  gs.plankBroken[p.id] = now + 2800;
  gs.plankHp = gs.plankHp || {};
  gs.plankHp[p.id] = 0;
  gs.glitchIds = gs.glitchIds || {};
  gs.glitchIds[p.id] = now + 2800;
}

function players_near(room, boss) {
  for (const e of Object.values(room.gameState.entities)) {
    if (e.boss || e.down) continue;
    if ((e.temblor || 0) > 20) return true;
  }
  return false;
}

function smash(room, entity) {
  if ((entity.size || 1) < 0.5) return;
  const gs = room.gameState;
  const GameMap = require('./GameMap');
  const R = reachOf(entity.size) * 0.85 + (entity.bossHalf || 0);
  let broke = 0;
  const near = [];
  for (const p of GameMap.resolvePlatforms(room.mapId, GameMap.areaFor(room.mapId))) {
    if (p.kind === 'pit' || p.ramp || p.slab || (p.h || 0) < 1.2) continue;
    if ((gs.plankBroken || {})[p.id] !== undefined || gs.blockBroken?.[p.id]) continue;
    const nx = Math.max(p.x - p.hx, Math.min(p.x + p.hx, entity.x));
    const nz = Math.max(p.z - p.hz, Math.min(p.z + p.hz, entity.z));
    const d = Math.hypot(nx - entity.x, nz - entity.z);
    if (d <= R) near.push([d, p]);
  }
  near.sort((a, c) => a[0] - c[0]);
  for (const [, p] of near.slice(0, 8)) {
    if (p.blockMax > 0) {
      gs.blockHp[p.id] = p.blockMax;
      gs.blockBroken[p.id] = true;
    } else {
      gs.plankBroken = gs.plankBroken || {};
      gs.plankBroken[p.id] = Infinity;
      gs.plankHp = gs.plankHp || {};
      gs.plankHp[p.id] = 0;
    }
    broke++;
  }
}

function defeat(room, bossId, entity) {
  entity.hp = 0;
  entity.down = true;
  entity.gone = true;
  room.bossActive = false;
  room.gameState.boss = null;
  room.gameState.bossDefeated = true;
  if (room.gameState.curatorDown) room.endGame('curator_depleted', true);
  else room.checkGameEndConditions();
}

function hurt(room, owner, win, now) {
  if (!room.bossActive) return;
  const [bossId, boss] = bossEntry(room);
  if (!boss || boss.down || boss.paraUntil > now) return;
  const [fx, fz] = facing(owner);
  let px = owner.x;
  let pz = owner.z;
  let radius;
  let dmg;
  if (win.kind === 'm1') {
    px += fx * 1.6;
    pz += fz * 1.6;
    radius = 1.2;
    dmg = DMG_M1;
  } else if (win.kind === 'melee') {
    px += fx * (win.skill.reach || 0);
    pz += fz * (win.skill.reach || 0);
    radius = win.skill.radius || 0.5;
    dmg = DMG_MELEE;
  } else if (win.kind === 'area') {
    radius = win.skill.radius || 1;
    dmg = DMG_AREA;
  } else if (win.kind === 'card') {
    px += fx * (win.card.reach || 0);
    pz += fz * (win.card.reach || 0);
    radius = win.card.hitRadius || 0.8;
    dmg = DMG_CARD;
  } else return;
  if (Math.hypot(px - boss.x, pz - boss.z) > radius + (boss.bossHitHalf || 1)) return;
  boss.hp = Math.max(0, boss.hp - dmg);
  loseSp(boss, SP_HIT, 'golpe');
  if (boss.hp <= 0) defeat(room, bossId, boss);
}

function strike(room, bossId, now) {
  const entity = room.gameState.entities[bossId];
  if (!entity || entity.down || Status.blocksSkills(entity, now) || entity.tpAt) return;
  if (entity.baseCooldownUntil > now) return;
  entity.baseCooldownUntil = now + STRIKE_COOLDOWN_MS;
  entity.lastAbilityAt = now;
  const size = entity.size || 1;
  const [fx, fz] = facing(entity);
  const L = reachOf(size) + (entity.bossHalf || 0) * 0.4;
  const W = Math.max(3, 2 * (1.2 + 1.2 * size));
  entity.strikeAt = now;
  entity.bfx = { k: 'm1', t: now, fx: Math.round(fx * 100) / 100, fz: Math.round(fz * 100) / 100, L: Math.round(L * 10) / 10, w: Math.round(W * 10) / 10 };
  smash(room, entity);
  const dmg = dmgFactor(size);
  let hit = 0;
  for (const [id, other] of Object.entries(room.gameState.entities)) {
    if (id === bossId || other.down || other.gone || other.corpse) continue;
    const rx = other.x - entity.x;
    const rz = other.z - entity.z;
    const f = rx * fx + rz * fz;
    const s = Math.abs(rx * fz - rz * fx);
    if (f < -(entity.bossHalf || 0) * 0.3 || f > L || s > W / 2 + 0.4) continue;
    const mk = other.sig && other.sig.m === 1 && other.sig.until > now ? 1.5 : 1;
    addFatiga(room, id, STRIKE_FATIGA * dmg * mk, STRIKE_DEBT * dmg * mk, now);
    hit++;
  }
  loseSp(entity, hit ? SP_HIT : SP_MISS, hit ? 'golpe' : 'fallo');
}

function steer(entity, vx, vz, now) {
  let x = vx;
  let z = vz;
  if ((entity.drunkUntil || 0) > now) {
    const a = entity.drunkAng || 0;
    const c = Math.cos(a);
    const s = Math.sin(a);
    x = vx * c - vz * s + (entity.drunkPushX || 0);
    z = vx * s + vz * c + (entity.drunkPushZ || 0);
  }
  if (entity.temblor > 30) {
    const k = ((entity.temblor - 30) / 70) * 0.9;
    x += (Math.random() - 0.5) * k;
    z += (Math.random() - 0.5) * k;
  }
  return [x, z];
}

function tick(room, now, dt) {
  if (!room.bossActive || room.gameState.gameOver) return;
  const gs = room.gameState;
  const [bossId, boss] = bossEntry(room);
  if (!boss) return;
  const sec = dt;
  for (const e of Object.values(gs.entities)) {
    if (!e.reel) continue;
    if (now >= e.reel.until || e.down) { e.reel = null; continue; }
    const k = Math.min(1, dt * 7);
    e.x += (e.reel.tx - e.x) * k;
    e.z += (e.reel.tz - e.z) * k;
    e.velocityX = 0;
    e.velocityZ = 0;
  }
  if (boss.spEv && boss.spEv.t && now - boss.spEv.t >= 500) {
    boss.spPub = { d: Math.round(boss.spEv.d * 10) / 10, w: boss.spEv.w, id: (boss.spPub?.id || 0) + 1 };
    boss.spEv = null;
  }
  const players = Object.entries(gs.entities).filter(([id, e]) => id !== bossId && !e.down && !e.gone);
  const near = players.filter(([, e]) => Math.hypot(e.x - boss.x, e.z - boss.z) <= SWARM_RANGE + 3 * (boss.size || 1)).length;
  if (near >= 3) loseSp(boss, 0.4 * sec, 'rodeado');
  if (now - (boss.lastAbilityAt || now) > IDLE_SP_MS) {
    boss.lastAbilityAt = now;
    loseSp(boss, 2, 'inactividad');
  }
  if (boss.tpAt) loseSp(boss, TP_SP_PER_S * sec, 'canal');
  const rage = 1 + (SP_MAX - boss.sp) / -SP_MIN;
  if (now >= (boss.glitchNext || 0)) {
    boss.glitchNext = now + 3200 / rage + Math.random() * 1500;
    glitch(room, boss, now);
  }
  for (const [pid, e] of players) {
    const d = Math.hypot(e.x - boss.x, e.z - boss.z);
    const range = TEMBLOR_RANGE + 6 * (boss.size || 1);
    if (d <= range) e.temblor = Math.min(TEMBLOR_MAX, (e.temblor || 0) + sec * 7 * rage);
    else e.temblor = Math.max(0, (e.temblor || 0) - sec * 14);
    if ((e.drunkUntil || 0) > now && now >= (e.drunkNext || 0)) {
      e.drunkNext = now + 450;
      e.drunkAng = (Math.random() * 2 - 1) * 1.3 * (e.drunkAmt || 1);
      const a = Math.random() * Math.PI * 2;
      const m = 2.2 * (e.drunkAmt || 1);
      e.drunkPushX = Math.cos(a) * m;
      e.drunkPushZ = Math.sin(a) * m;
    }
    if ((e.redUntil || 0) > now && now >= (e.redChatAt || 0)) {
      e.redChatAt = now + CHAT_EVERY_MS;
      const pool = e.redKind === 'n' ? CHAT_BAD : CHAT_GOOD;
      room.sendTo(pid, MessageType.CHAT_BROADCAST, {
        playerId: 'jeffrey',
        playerName: 'Jeffrey',
        text: pool[Math.floor(Math.random() * pool.length)],
        timestamp: now,
      });
    }
  }
  boss.ultReady = boss.sp <= SP_ULT;
  for (const [id, e] of Object.entries(gs.entities)) {
    if (e.down || room.players.get(id)?.isBoss) continue;
    if (e.debt >= 40) collapse(room, id, now);
  }
  if (boss.tpAt && now >= boss.tpAt) finishTeleport(room, bossId, boss, now);
  if (boss.ultAt && now >= boss.ultAt) fireUlt(room, bossId, boss, now);
  if (boss.screenFx && now >= boss.screenFx.at) fireScreen(room, bossId, boss, now);
  if (boss.grab && now >= boss.grab.at) fireGrab(room, bossId, boss, now);
  if (boss.shadow) tickShadow(room, bossId, boss, now);
  for (const [, e] of players) {
    e.hist = e.hist || [];
    const last = e.hist[e.hist.length - 1];
    if (!last || now - last.t >= 200) e.hist.push({ t: now, x: e.x, z: e.z });
    while (e.hist.length && e.hist[0].t < now - 6000) e.hist.shift();
  }
  const bcd = [];
  for (let i = 0; i < ABILITY_COUNT; i++) bcd.push(Math.max(0, Math.round((((boss.bossCd || {})[i] || 0) - now) / 100) / 10));
  boss.bcdPub = bcd;
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
    for (const t of inRadius(room, bossId, sh.x, sh.z, SHADOW_RADIUS)) addFatiga(room, t, 10, 12, now);
  }
}

function censored(room, entity, now) {
  return Boolean(entity) && (entity.censorUntil || 0) > now;
}

function cureBlocked(room, entity, now) {
  return Boolean(entity) && ((entity.noCureUntil || 0) > now || censored(room, entity, now));
}

function checkEnd(room) {
  if (!room.bossActive) return null;
  const gs = room.gameState;
  if (!gs.curatorDown) return null;
  if (Object.values(gs.patients).some((p) => p.status === 'alive')) return null;
  return 'boss_won';
}

module.exports = {
  freeSpot,
  BOSS_DURATION_MS,
  BOSS_EVERY,
  BOSS_HP_MAX,
  SIZES,
  SP_MIN,
  SP_ULT,
  isActive,
  isDue,
  prepare,
  setup,
  speedFactor,
  addFatiga,
  collapse,
  loseSp,
  strike,
  hurt,
  collision,
  reachOf,
  ability,
  setSize,
  setCrouch,
  steer,
  tick,
  censored,
  cureBlocked,
  checkEnd,
  bossEntry,
};
