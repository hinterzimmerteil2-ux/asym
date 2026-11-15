const Status = require('./Status');
const Hitbox = require('./Hitbox');

const SHEETS = 3;
const TRAIL_STEP_MS = 250;
const TRAIL_KEEP_MS = 6000;
const REWIND_MS = 4500;
const NOTIFY_DELAY_MS = 6000;
const DEBT_BASE_MS = 1200;
const DEBT_STEP_MS = 500;
const DEBT_MAX_MS = 3600;
const NOTIFY_RANGE = 26;
const VUELVA_RANGE = 16;
const USE_GAP_MS = 700;
const TAX_NEED = 118;
const TAX_MODULE = 20;
const TAX_EVADE = 12;
const TAX_FINE = 10;
const TAX_IM_MAX = 8;
const TAX_IM_DECAY_MS = 25000;
const TAX_SPEED = 0.04;
const TAX_EVADE_GAP = 1500;
const TAX_EVADE_RANGE = 8;

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
const SPENT_PER_MANA = 12;
const MANA_MODULE = 6;
const MANA_PAIR = 12;
const STAB_RANGE = 2.6;
const LUNGE_RANGE = 14;
const SHOT_RANGE = 14;
const STAB_STUN_MS = 1100;
const SHOT_STUN_MS = 1300;
const SHOT_AMMO = 8;
const FREE_RELOADS = 2;
const MODULE_BULLETS_PER_MIN = 6;
const SHOT_RECOIL_MISS = 13;
const SHOT_RECOIL_HIT = 1.5;
const SHOT_STUN_BONUS = 0.6;
const SHOT_PUSH = 10;
const PUSH_MUL_CAP = 1.8;
const STAB_RECOIL = 0;
const DOME_MS = 1200;
const PARRY_CD = 9000;
const PARRY_RANGE = 6;
const PARRY_STUN_MS = 900;
const PARRY_PUSH = 7;
const PARRY_MANA = 8;
const FAIL_LAG_MS = 600;
const FAIL_SHIELD = 3;
const DECOY_SPEED = 5.5;
const DECOY_RUN_MS = 2200;
const FLY_RISE = 7;
const FLY_CEIL = 14;
const DOUBLE_JUMP_V = 15;
const DOUBLE_JUMP_COST = 4;
const DOUBLE_JUMP_MIN_AIR_MS = 120;
const FLY_HOLD_MS = 300;
const DOME_RADIUS = 2.5;
const QUEUE_MS = 2000;
const RESOLUTION_MS = 2000;
const FINE_MS = 12000;
const OBSERVED_STILL_MS = 1000;
const DECOY_MS = 4500;
const DECOY_BURST_RANGE = 2;
const DECOY_SLOW_MS = 1400;
const DECOY_HIDE_MS = 1500;
const CD = { bayoneta: 7000, bayonetaLunge: 11000, barrera: 22000, senuelo: 26000 };
const GLIDE_START_COST = 4;
const GLIDE_COST_PER_SEC = 3;
const GLIDE_FALL = -2.4;
const GLIDE_START_LAG_MS = 300;
const GLIDE_LAND_LAG_MS = 700;
const GLIDE_MIN_AIR_MS = 200;

let src = null;
let domes = [];

const DEFS = {
  town_level: { id: 'town_level', name: 'Town Level Verse Lol', modes: ['bayoneta', 'barrera', 'senuelo', 'carga'], charges: 0, wig: true, scale: 0.6 },
  sunat_paperwork: { id: 'sunat_paperwork', name: 'Sunat Paperwork', modes: ['notificacion', 'vuelva', 'anulacion'] },
  platinum_star: { id: 'platinum_star', name: 'Platinum Star', modes: ['rafaga', 'stellar', 'atrapar', 'pausa'] },
  minceraft: { id: 'minceraft', name: 'Minceraft', modes: ['andamio', 'telarana', 'escalera', 'slime', 'minar'] },
};

const STAR = { rhythmMax: 100, barrageMs: 1100, barrageStepMs: 100, rafagaRange: 5, rafagaWidth: 1.8, rafagaStun: 900, rafagaPush: 3, rafagaEndStun: 1500, rafagaEndPush: 9, rafagaGain: 1.5, stellarRange: 24, stellarWidth: 0.9, stellarWind: 400, stellarStun: 1300, stellarPush: 10, stellarGain: 12, catchMs: 300, catchRange: 8, catchWidth: 1.5, catchStun: 1800, catchPush: 13, catchGain: 20, catchFailLag: 500, pauseRange: 11, pauseStun: 1500, pauseCost: 50, rhythmStun: 0.006, reactCost: 30, reactStun: 1100, reactRange: 7, reactPush: 7, reactCd: 8000, cd: { rafaga: 6500, stellar: 9000, atrapar: 9000, pausa: 5000 } };

function grant(entity, id) {
  if (!DEFS[id]) {
    entity.sup = null;
    return;
  }
  entity.sup = { id, sheets: DEFS[id].charges || SHEETS, copyLeft: false, claims: 0, nextAt: 0, pending: 0, still: 0, lx: null, lz: null, noticeUntil: 0, taxRe: 0, taxIm: 0, taxAt: 0, evAt: 0 };
  if (id === 'platinum_star') {
    Object.assign(entity.sup, { rhythm: 0, cd: { rafaga: 0, stellar: 0, atrapar: 0, pausa: 0, react: 0 }, react: 0, poke: null, barrage: null, dome: 0, domeOn: false, parried: 0 });
  }
  if (id === 'minceraft') {
    Object.assign(entity.sup, { used: 0, mining: null });
  }
  if (id === 'town_level') {
    Object.assign(entity.sup, { mana: 0, shield: 0, shieldAt: 0, chain: 0, spent: 0, lastFlo: null, charging: false, chMana: 0, chAt: 0, chPush: 0, chStun: 0, ammo: SHOT_AMMO, ammoMax: SHOT_AMMO, freeReloads: FREE_RELOADS, modBullets: [], cd: { bayoneta: 0, barrera: 0, senuelo: 0 }, glide: false, glideAt: 0, airAt: 0, dome: 0, decoy: null });
    entity.hitScale = (entity.hitScale || 1) * DEFS[id].scale;
  }
}

function claim() {}

function tax(entity, re, im, now) {
  const s = entity && entity.sup;
  if (!s || s.id !== 'sunat_paperwork') return;
  s.taxRe += re;
  if (im) {
    s.taxIm = Math.min(TAX_IM_MAX, s.taxIm + im);
    s.taxAt = now || Date.now();
  }
  while (s.taxRe >= TAX_NEED) {
    if (s.sheets >= SHEETS) {
      s.taxRe = TAX_NEED - 1;
      break;
    }
    s.taxRe -= TAX_NEED;
    s.sheets += 1;
    s.taxIm = Math.min(TAX_IM_MAX, s.taxIm + 1);
    s.taxAt = now || Date.now();
  }
}

function evade(room, ownerId, now) {
  const op = room.players.get(ownerId);
  const oe = room.gameState.entities[ownerId];
  if (!op || !oe || !(op.isAsymRole || op.isBoss)) return;
  for (const e of Object.values(room.gameState.entities)) {
    const s = e.sup;
    if (!s || s.id !== 'sunat_paperwork' || e.down || e.gone || now - s.evAt < TAX_EVADE_GAP) continue;
    if (Math.hypot(e.x - oe.x, e.z - oe.z) > TAX_EVADE_RANGE) continue;
    s.evAt = now;
    tax(e, TAX_EVADE, 0, now);
  }
}

function speedBonus(entity) {
  const s = entity.sup;
  return s && s.id === 'sunat_paperwork' ? 1 + Math.min(TAX_IM_MAX, s.taxIm) * TAX_SPEED : 1;
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

function lineBoxes(e, nx, nz, len, half) {
  const out = [];
  const y = (e.y || 0) + 0.95;
  for (let d = half; d - half < len && out.length < 14; d += half * 2) out.push({ x: Math.round((e.x + nx * d) * 100) / 100, z: Math.round((e.z + nz * d) * 100) / 100, y, half });
  return out;
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
  let fx = {};
  if (s.id === 'town_level') return useTown(room, playerId, entity, mode, now);
  if (s.id === 'platinum_star') return useStar(room, playerId, entity, mode, now);
  if (s.id === 'minceraft') return useMine(room, playerId, entity, mode, now);
  if (s.sheets <= 0 || now < s.nextAt) return false;
  if (mode !== 'anulacion' && Status.blocksSkills(entity, now)) return false;
  if (mode === 'notificacion') {
    const t = foes(room, entity, NOTIFY_RANGE)[0];
    if (!t || (t.e.ntf && t.e.ntf.until > now)) return false;
    Status.apply(t.e, 'reveal', NOTIFY_DELAY_MS, now);
    t.e.ntf = { until: now + NOTIFY_DELAY_MS, by: playerId, debt: 0, sat: now };
    s.noticeUntil = now + NOTIFY_DELAY_MS;
    fx = { tx: t.e.x, tz: t.e.z, tid: t.id, radius: NOTIFY_RANGE };
  } else if (mode === 'vuelva') {
    const t = foes(room, entity, VUELVA_RANGE)[0];
    if (!t || (t.e.size || 1) > 2) return false;
    const spot = pastSpot(t.e, now, REWIND_MS);
    if (!spot) return false;
    fx = { fx: t.e.x, fz: t.e.z, tx: spot.x, tz: spot.z, tid: t.id, radius: VUELVA_RANGE };
    rewind(t.e, spot);
    Status.apply(t.e, 'queue', QUEUE_MS, now);
  } else if (mode === 'anulacion') {
    const spot = pastSpot(entity, now, REWIND_MS);
    if (!spot) return false;
    fx = { fx: entity.x, fz: entity.z, tx: spot.x, tz: spot.z };
    rewind(entity, spot);
    Status.clear(entity, 'stun', 'ragdoll', 'slow');
    entity.rag = null;
    entity.flojera = Math.max(entity.flojera || 0, (entity.flojeraMax || 0) * 0.6);
    Status.apply(entity, 'slow', RESOLUTION_MS, now, { level: 1 });
  }
  if (s.copyLeft) s.copyLeft = false;
  else s.sheets -= 1;
  s.nextAt = now + USE_GAP_MS;
  tax(entity, 0, 1, now);
  room.broadcast('super_result', { playerId, mode, sheets: s.sheets, ...fx });
  return true;
}

function tick(room, now) {
  record(room, now);
  tickTown(room, now);
  tickStar(room, now);
  tickMine(room, now);
  for (const e of Object.values(room.gameState.entities)) {
    const s = e.sup;
    if (s && s.id === 'sunat_paperwork' && s.taxIm > 0 && s.taxAt && now - s.taxAt >= TAX_IM_DECAY_MS) {
      s.taxIm = Math.max(0, s.taxIm - 1);
      s.taxAt = now;
    }
    if (!e.ntf) continue;
    if (e.ntf.until > now) {
      continue;
    }
    const by = e.ntf.by;
    const embargo = Math.min(DEBT_MAX_MS, DEBT_BASE_MS + DEBT_STEP_MS * (e.ntf.debt || 0));
    e.ntf = null;
    if (e.down) continue;
    Status.apply(e, 'stun', embargo, now);
    Status.apply(e, 'queue', embargo, now);
    Status.apply(e, 'slow', FINE_MS, now, { level: 1 });
    tax(room.gameState.entities[by], TAX_FINE, 1, now);
  }
}

function view(entity, now) {
  const s = entity.sup;
  if (!s) return null;
  if (s.id === 'town_level') {
    return { id: s.id, mana: Math.floor(s.mana), manaMax: MANA_MAX, shield: Math.floor(s.shield), shieldMax: SHIELD_MAX, charging: s.charging, ammo: s.ammo, ammoMax: s.ammoMax, freeReloads: s.freeReloads, charge: Math.round(s.chMana), chargeMax: CHARGE_MAX_MANA, cd: { bayoneta: Math.max(0, s.cd.bayoneta - now), barrera: Math.max(0, s.cd.barrera - now), senuelo: Math.max(0, s.cd.senuelo - now) }, glide: s.glide };
  }
  if (s.id === 'minceraft') return { id: s.id, used: s.used, max: MC.max, mining: s.mining ? Math.max(0, s.mining.until - now) : 0 };
  if (s.id === 'platinum_star') {
    return { id: s.id, rhythm: Math.floor(s.rhythm), rhythmMax: STAR.rhythmMax, pauseCost: STAR.pauseCost, ready: s.rhythm >= STAR.reactCost && now >= s.cd.react, windUp: Boolean(s.poke), barrage: Boolean(s.barrage), catching: s.domeOn, cd: { rafaga: Math.max(0, s.cd.rafaga - now), stellar: Math.max(0, s.cd.stellar - now), atrapar: Math.max(0, s.cd.atrapar - now), pausa: Math.max(0, s.cd.pausa - now) } };
  }
  return { id: s.id, sheets: s.sheets, max: SHEETS, taxRe: Math.floor(s.taxRe), taxIm: s.taxIm, taxNeed: TAX_NEED, taxImMax: TAX_IM_MAX };
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
  const ts = entity && entity.sup;
  if (ts && ts.id === 'town_level' && ts.ammo < ts.ammoMax) {
    const t = Date.now();
    ts.modBullets = ts.modBullets.filter((x) => t - x < 60000);
    if (ts.modBullets.length < MODULE_BULLETS_PER_MIN) {
      ts.modBullets.push(t);
      ts.ammo += 1;
    }
  }
  tax(entity, TAX_MODULE, 0);
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
  return speed * Math.min(PUSH_MUL_CAP, 1 + steps(s) * PUSH_PER_STEP + s.chPush);
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
    if (Math.hypot(entity.x - d.x, entity.z - d.z) <= DOME_RADIUS && Math.abs((entity.y || 0) - d.y) < 2.5) {
      if (d.owner && d.owner.sup) d.owner.sup.parried = now;
      return true;
    }
  }
  return false;
}

function useTown(room, playerId, entity, mode, now) {
  const s = entity.sup;
  if (now < s.nextAt) return false;
  if (mode === 'carga') {
    if (s.charging) { s.charging = false; return true; }
    if (s.ammo <= 0 && s.freeReloads > 0) {
      s.freeReloads -= 1;
      s.ammo = s.ammoMax;
      s.nextAt = now + USE_GAP_MS;
      room.broadcast('super_result', { playerId, mode: 'recarga', x: entity.x, y: entity.y || 0, z: entity.z });
      return true;
    }
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
  let fxp = { x: entity.x, y: entity.y || 0, z: entity.z, dx: nx, dz: nz };
  if (mode === 'bayoneta') {
    if (now < s.cd.bayoneta) return false;
    const inFront = (range, dot, width) => foes(room, entity, range).filter((f) => {
      const rx = f.e.x - entity.x;
      const rz = f.e.z - entity.z;
      const along = rx * nx + rz * nz;
      return along > 0 && along / (Math.hypot(rx, rz) || 1) >= dot && (width === undefined || Math.abs(rx * nz - rz * nx) <= width);
    });
    const close = inFront(STAB_RANGE, 0);
    let recoil = 0;
    let shotBlocked = false;
    withSource(entity, () => {
      if (close.length) {
        for (const f of close) {
          room.stun(f.id, f.e, STAB_STUN_MS, now, 0);
        }
        s.cd.bayoneta = now + CD.bayoneta;
        recoil = STAB_RECOIL;
        fxp.shot = false;
        fxp.len = STAB_RANGE;
        fxp.radius = STAB_RANGE;
        ok = true;
      } else {
        if (s.ammo <= 0) {
          shotBlocked = true;
          return;
        }
        s.ammo -= 1;
        const path = inFront(LUNGE_RANGE, 0.85, 1.2);
        const first = path[0];
        let len = SHOT_RANGE;
        if (first) {
          const near = Math.max(0, 1 - first.d / SHOT_RANGE);
          room.stun(first.id, first.e, Math.round(SHOT_STUN_MS * (1 + SHOT_STUN_BONUS * near)), now, 0);
          Status.push(first.e, nx, nz, SHOT_PUSH, 340, now);
          len = Math.min(SHOT_RANGE, first.d);
          recoil = SHOT_RECOIL_HIT + (SHOT_RECOIL_MISS - SHOT_RECOIL_HIT) * (1 - near);
        } else {
          s.chain = 0;
          recoil = SHOT_RECOIL_MISS;
        }
        s.cd.bayoneta = now + CD.bayonetaLunge;
        fxp.shot = true;
        fxp.len = len;
        fxp.boxes = lineBoxes(entity, nx, nz, LUNGE_RANGE, 1.2);
        fxp.hit = Boolean(first);
        ok = true;
      }
    });
    if (shotBlocked) return false;
    if (ok) {
      if (recoil > 0) Status.push(entity, -nx, -nz, recoil, 240, now);
      Status.apply(entity, 'slow', 300, now, { tag: 'endlag', level: 2 });
      s.wpnUntil = now + 1100;
    }
  } else if (mode === 'barrera') {
    if (now < s.cd.barrera) return false;
    s.dome = now + DOME_MS;
    fxp.radius = DOME_RADIUS;
    s.domeOn = true;
    s.parried = 0;
    s.cd.barrera = now + CD.barrera;
    s.wpnUntil = 0;
    ok = true;
  } else if (mode === 'senuelo') {
    if (now < s.cd.senuelo) return false;
    s.decoy = { x: entity.x, y: entity.y || 0, z: entity.z, until: now + DECOY_MS, born: now, last: now, vx: nx * DECOY_SPEED, vz: nz * DECOY_SPEED };
    entity.paraFrom = now;
    entity.paraUntil = now + DECOY_HIDE_MS;
    entity.paraOn = false;
    s.cd.senuelo = now + CD[mode];
    fxp.decoy = true;
    fxp.radius = DECOY_BURST_RANGE;
    ok = true;
  }
  if (!ok) return false;
  s.nextAt = now + USE_GAP_MS;
  room.broadcast('super_result', { playerId, mode, ...fxp });
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
    if (s.parried) {
      s.parried = 0;
      s.dome = 0;
      s.domeOn = false;
      s.cd.barrera = now + PARRY_CD;
      gainMana(e, PARRY_MANA);
      const target = foes(room, e, PARRY_RANGE)[0];
      if (target) {
        const ddx = (target.e.x - e.x) / (target.d || 1);
        const ddz = (target.e.z - e.z) / (target.d || 1);
        withSource(e, () => {
          room.stun(target.id, target.e, PARRY_STUN_MS, now, 0);
          Status.push(target.e, ddx, ddz, PARRY_PUSH, 300, now);
        });
      }
      room.broadcast('super_result', { playerId: id, mode: 'parry', radius: DOME_RADIUS, x: e.x, y: e.y || 0, z: e.z, dx: e.faceX || 0, dz: e.faceZ || 1 });
    } else if (s.domeOn && s.dome <= now) {
      s.domeOn = false;
      Status.apply(e, 'slow', FAIL_LAG_MS, now, { tag: 'endlag', level: 2 });
      s.shield = Math.min(SHIELD_MAX, s.shield + FAIL_SHIELD);
      s.shieldAt = 0;
    }
    if (s.dome > now) live.push({ x: e.x, y: e.y || 0, z: e.z, until: s.dome, owner: e });
    if (s.decoy) {
      if (s.decoy.until <= now) s.decoy = null;
      else {
        const dd = Math.min(0.1, (now - s.decoy.last) / 1000);
        s.decoy.last = now;
        if (now - s.decoy.born < DECOY_RUN_MS) {
          s.decoy.x += s.decoy.vx * dd;
          s.decoy.z += s.decoy.vz * dd;
        }
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

function starGain(s, n) {
  s.rhythm = Math.min(STAR.rhythmMax, s.rhythm + n);
}

function starStun(s, ms) {
  return Math.round(ms * (1 + s.rhythm * STAR.rhythmStun));
}

function onStunned(entity, now) {
  entity.sup.react = now;
}

function useStar(room, playerId, entity, mode, now) {
  const s = entity.sup;
  if (now < s.nextAt || s.poke || s.grab || s.barrage) return false;
  if (Status.blocksSkills(entity, now)) return false;
  if (now < s.cd[mode]) return false;
  const fx = entity.faceX || 0;
  const fz = entity.faceZ || 1;
  const flen = Math.hypot(fx, fz) || 1;
  const nx = fx / flen;
  const nz = fz / flen;
  const out = { x: entity.x, y: entity.y || 0, z: entity.z, dx: nx, dz: nz };
  if (mode === 'rafaga') {
    s.barrage = { until: now + STAR.barrageMs, next: now, nx, nz };
    out.len = STAR.rafagaRange;
    out.ms = STAR.barrageMs;
    out.boxes = lineBoxes(entity, nx, nz, STAR.rafagaRange, STAR.rafagaWidth);
    Status.apply(entity, 'slow', STAR.barrageMs, now, { tag: 'endlag', level: 2 });
  } else if (mode === 'stellar') {
    s.poke = { at: now + STAR.stellarWind, nx, nz };
    out.wind = STAR.stellarWind;
  } else if (mode === 'atrapar') {
    s.grab = { at: now + STAR.catchMs, nx, nz };
    out.wind = STAR.catchMs;
    out.len = STAR.catchRange;
    out.boxes = lineBoxes(entity, nx, nz, STAR.catchRange, STAR.catchWidth);
  } else if (mode === 'pausa') {
    if (s.rhythm < STAR.pauseCost) return false;
    s.poseUntil = now + 900;
    s.rhythm -= STAR.pauseCost;
    const all = foes(room, entity, STAR.pauseRange);
    for (const f of all) room.stun(f.id, f.e, STAR.pauseStun, now, 0);
    out.count = all.length;
    out.range = STAR.pauseRange;
    out.radius = STAR.pauseRange;
  } else return false;
  s.cd[mode] = now + STAR.cd[mode];
  s.nextAt = now + USE_GAP_MS;
  room.broadcast('super_result', { playerId, mode, ...out });
  return true;
}

function tickStar(room, now) {
  const live = [];
  for (const [id, e] of Object.entries(room.gameState.entities)) {
    const s = e.sup;
    if (!s || s.id !== 'platinum_star' || e.down || e.gone) continue;
    if (s.react) {
      s.react = 0;
      if (s.rhythm >= STAR.reactCost && now >= s.cd.react) {
        const tgt = foes(room, e, STAR.reactRange)[0];
        if (tgt) {
          s.rhythm -= STAR.reactCost;
          s.cd.react = now + STAR.reactCd;
          room.stun(tgt.id, tgt.e, starStun(s, STAR.reactStun), now, 0);
          Status.push(tgt.e, (tgt.e.x - e.x) / (tgt.d || 1), (tgt.e.z - e.z) / (tgt.d || 1), STAR.reactPush, 280, now);
          room.broadcast('super_result', { playerId: id, mode: 'react', radius: STAR.reactRange, x: e.x, y: e.y || 0, z: e.z, tx: tgt.e.x, tz: tgt.e.z });
        }
      }
    }
    if (s.barrage && now >= s.barrage.next) {
      const b = s.barrage;
      const last = now >= b.until;
      const targets = foes(room, e, STAR.rafagaRange).filter((f) => {
        const rx = f.e.x - e.x;
        const rz = f.e.z - e.z;
        return rx * b.nx + rz * b.nz > 0 && Math.abs(rx * b.nz - rz * b.nx) <= STAR.rafagaWidth;
      });
      for (const f of targets) {
        room.stun(f.id, f.e, starStun(s, last ? STAR.rafagaEndStun : STAR.rafagaStun), now, 0);
        Status.push(f.e, b.nx, b.nz, last ? STAR.rafagaEndPush : STAR.rafagaPush, last ? 320 : 120, now);
        starGain(s, STAR.rafagaGain);
      }
      if (last) s.barrage = null;
      else b.next = now + STAR.barrageStepMs;
    }
    if (s.poke && now >= s.poke.at) {
      const { nx, nz } = s.poke;
      s.poke = null;
      const path = foes(room, e, STAR.stellarRange).filter((f) => {
        const rx = f.e.x - e.x;
        const rz = f.e.z - e.z;
        return rx * nx + rz * nz > 0 && Math.abs(rx * nz - rz * nx) <= STAR.stellarWidth;
      });
      const first = path[0];
      let len = STAR.stellarRange;
      if (first) {
        room.stun(first.id, first.e, starStun(s, STAR.stellarStun), now, 0);
        Status.push(first.e, nx, nz, STAR.stellarPush, 320, now);
        len = first.d;
        starGain(s, STAR.stellarGain);
      }
      room.broadcast('super_result', { playerId: id, mode: 'stellar_hit', boxes: lineBoxes(e, nx, nz, STAR.stellarRange, STAR.stellarWidth), x: e.x, y: e.y || 0, z: e.z, dx: nx, dz: nz, len, hit: Boolean(first) });
    }
    if (s.grab && now >= s.grab.at) {
      const { nx, nz } = s.grab;
      s.grab = null;
      const target = foes(room, e, STAR.catchRange).filter((f) => {
        const rx = f.e.x - e.x;
        const rz = f.e.z - e.z;
        return rx * nx + rz * nz > 0 && Math.abs(rx * nz - rz * nx) <= STAR.catchWidth;
      })[0];
      if (target) {
        room.stun(target.id, target.e, starStun(s, STAR.catchStun), now, 0);
        Status.push(target.e, -nx, -nz, STAR.catchPush, 380, now);
        starGain(s, STAR.catchGain);
      } else {
        Status.apply(e, 'slow', STAR.catchFailLag, now, { tag: 'endlag', level: 2 });
      }
      room.broadcast('super_result', { playerId: id, mode: 'atrapar_hit', boxes: lineBoxes(e, nx, nz, STAR.catchRange, STAR.catchWidth), x: e.x, y: e.y || 0, z: e.z, dx: nx, dz: nz, len: target ? target.d : STAR.catchRange, hit: Boolean(target) });
    }
    if (s.dome > now) live.push({ x: e.x, y: e.y || 0, z: e.z, until: s.dome, owner: e });
  }
  domes = domes.concat(live);
}


const MC = {
  max: 12, life: 20000, cell: 1.8, gap: 300, endlag: 250, mineMs: 400, mineRange: 3.4, jumpV: 7.3, maxLevels: 3,
  w: { andamio: 1, telarana: 2, escalera: 1, slime: 3 },
  webR: 2.5, webSlow: 2, slimeV: 11, chainStep: 200, chainReach: 2.3, chainCool: 1500, pieceLimit: 40,
};

function mcStage(d, now) {
  return Math.min(2, Math.floor(((now - d.born) / MC.life) * 3));
}

function mcBase(room, x, z, y) {
  return Hitbox.groundAt(room.allPlatforms(), x, z, y, 3);
}

function mcSnap(v) {
  return Math.round(v / MC.cell) * MC.cell;
}

function mcChain(room, d, now) {
  const dyn = room.gameState.dyn;
  const seen = new Set([d.id]);
  let frontier = [d];
  let hop = 0;
  while (frontier.length && hop < 12) {
    hop += 1;
    const next = [];
    for (const f of frontier) {
      for (const o of dyn) {
        if (seen.has(o.id) || o.owner !== d.owner) continue;
        if (Math.hypot(o.x - f.x, o.z - f.z) > MC.chainReach || Math.abs(o.y0 - f.y0) > 2.2) continue;
        seen.add(o.id);
        next.push(o);
        if (now >= (o.cool || 0)) {
          o.pulse = now + hop * MC.chainStep;
          o.cool = o.pulse + MC.chainCool;
        }
      }
    }
    frontier = next;
  }
}

function mcActivate(room, d, now) {
  if (now < (d.cool || 0)) return;
  d.pulse = now;
  d.cool = now + MC.chainCool;
  mcChain(room, d, now);
}

function useMine(room, playerId, entity, mode, now) {
  const s = entity.sup;
  if (now < s.nextAt || Status.blocksSkills(entity, now) || s.mining) return false;
  const gs = room.gameState;
  const fx = entity.faceX || 0;
  const fz = entity.faceZ || 1;
  const fl = Math.hypot(fx, fz) || 1;
  const nx = fx / fl;
  const nz = fz / fl;
  if (mode === 'minar') {
    let best = null;
    for (const d of gs.dyn) {
      if (d.owner !== playerId) continue;
      const dist = Math.hypot(d.x - entity.x, d.z - entity.z);
      if (dist > MC.mineRange || Math.abs((entity.y || 0) + 1 - (d.y0 + d.h / 2)) > 3) continue;
      const facing = ((d.x - entity.x) * nx + (d.z - entity.z) * nz) / (dist || 1);
      const score = dist - facing * 1.2;
      if (!best || score < best.score) best = { d, score };
    }
    if (!best) return false;
    s.mining = { id: best.d.id, until: now + MC.mineMs, x: entity.x, z: entity.z };
    s.nextAt = now + 150;
    room.broadcast('super_result', { playerId, mode, x: best.d.x, y: best.d.y0, z: best.d.z, ms: MC.mineMs, boxes: [{ x: best.d.x, z: best.d.z, y: best.d.y0 + best.d.h / 2, half: Math.max(best.d.hx, best.d.hz) }] });
    return true;
  }
  const w = MC.w[mode];
  if (!w || s.used + w > MC.max) return false;
  if (gs.dyn.length >= MC.pieceLimit) return false;
  const reach = mode === 'telarana' ? 2.6 : 2.2;
  const px = mcSnap(entity.x + nx * reach);
  const pz = mcSnap(entity.z + nz * reach);
  const ey = entity.y || 0;
  let base = mcBase(room, px, pz, ey);
  const rock = gs.dyn.filter((o) => o.solid && Math.abs(o.x - px) < 0.1 && Math.abs(o.z - pz) < 0.1 && !o.ramp);
  let level = 0;
  if (rock.length && mode !== 'telarana') {
    const top = Math.max(...rock.map((o) => o.y0 + o.h));
    if (top > ey + 1.7) return false;
    base = top;
    level = rock.filter((o) => o.kind === 'andamio').length;
    if (level >= MC.maxLevels || mode !== 'andamio') return false;
  } else if (base > ey + 1.2 && mode !== 'telarana') return false;
  const piece = { id: `mc${(gs.dynSeq = (gs.dynSeq || 0) + 1)}`, kind: mode, owner: playerId, born: now, x: px, z: pz, y0: base, hx: 0.9, hz: 0.9, h: 1.2, ramp: null, solid: true, pulse: 0, cool: 0, fired: 0, w };
  let boxes;
  if (mode === 'telarana') {
    Object.assign(piece, { solid: false, r: MC.webR, hx: MC.webR, hz: MC.webR, h: 0.3 });
    piece.x = Math.round((entity.x + nx * reach) * 10) / 10;
    piece.z = Math.round((entity.z + nz * reach) * 10) / 10;
    piece.y0 = mcBase(room, piece.x, piece.z, ey);
  } else if (mode === 'escalera') {
    const horiz = Math.abs(nx) > Math.abs(nz);
    piece.ramp = horiz ? (nx > 0 ? '+x' : '-x') : nz > 0 ? '+z' : '-z';
    piece.hx = horiz ? 1.4 : 0.9;
    piece.hz = horiz ? 0.9 : 1.4;
    piece.h = 1.8;
  } else if (mode === 'slime') {
    piece.h = 0.9;
  }
  for (const o of gs.dyn) {
    if (o.solid && piece.solid && Math.abs(o.x - piece.x) < 0.1 && Math.abs(o.z - piece.z) < 0.1 && Math.abs(o.y0 - piece.y0) < 0.05) return false;
  }
  for (const [, e] of Object.entries(gs.entities)) {
    if (piece.solid && !e.down && Math.abs(e.x - piece.x) < piece.hx + 0.35 && Math.abs(e.z - piece.z) < piece.hz + 0.35 && (e.y || 0) < piece.y0 + piece.h - 0.2 && (e.y || 0) + 1.6 > piece.y0) return false;
  }
  boxes = piece.kind === 'telarana' ? undefined : [{ x: piece.x, z: piece.z, y: piece.y0 + piece.h / 2, half: Math.max(piece.hx, piece.hz) }];
  gs.dyn.push(piece);
  gs.dynVer += 1;
  s.used += w;
  s.nextAt = now + MC.gap;
  Status.apply(entity, 'slow', MC.endlag, now, { tag: 'endlag', level: 1 });
  room.broadcast('super_result', { playerId, mode, x: piece.x, y: piece.y0, z: piece.z, radius: piece.r, boxes, used: s.used });
  mcActivate(room, piece, now);
  return true;
}

function mcRemove(room, d) {
  const gs = room.gameState;
  gs.dyn = gs.dyn.filter((o) => o !== d);
  gs.dynVer += 1;
  const owner = gs.entities[d.owner];
  if (owner && owner.sup && owner.sup.id === 'minceraft') owner.sup.used = Math.max(0, owner.sup.used - d.w);
}

function tickMine(room, now) {
  const gs = room.gameState;
  if (!gs.dyn || !gs.dyn.length) {
    for (const e of Object.values(gs.entities)) if (e.sup && e.sup.id === 'minceraft') e.sup.mining = null;
    return;
  }
  for (const e of Object.values(gs.entities)) {
    const s = e.sup;
    if (!s || s.id !== 'minceraft' || !s.mining) continue;
    const d = gs.dyn.find((o) => o.id === s.mining.id);
    if (!d || Status.blocksSkills(e, now) || Math.hypot(e.x - s.mining.x, e.z - s.mining.z) > 1.2) { s.mining = null; continue; }
    if (now >= s.mining.until) {
      s.mining = null;
      mcRemove(room, d);
      room.broadcast('super_result', { playerId: Object.keys(gs.entities).find((k) => gs.entities[k] === e), mode: 'roto', x: d.x, y: d.y0, z: d.z });
    }
  }
  const asym = [];
  for (const [id, p] of room.players) {
    const e = gs.entities[id];
    if (e && (p.isAsymRole || p.isBoss)) asym.push(e);
  }
  for (const d of gs.dyn.slice()) {
    if (now - d.born >= MC.life) {
      mcRemove(room, d);
      continue;
    }
    const stage = mcStage(d, now);
    const fire = d.pulse && now >= d.pulse && d.fired !== d.pulse;
    if (fire) d.fired = d.pulse;
    if (d.kind === 'telarana') {
      const slow = Math.max(1, MC.webSlow - (stage === 2 ? 1 : 0)) + (d.pulse && now - d.pulse < 1500 ? 1 : 0);
      for (const e of asym) {
        if (e.down || e.gone || e.corpse) continue;
        if (Math.hypot(e.x - d.x, e.z - d.z) > d.r || Math.abs((e.y || 0) - d.y0) > 2) continue;
        Status.apply(e, 'slow', 400, now, { level: Math.min(3, slow) });
        if (now >= (d.cool || 0)) mcActivate(room, d, now);
      }
    } else if (d.kind === 'slime' && (fire || now - (d.lastCheck || 0) > 100)) {
      d.lastCheck = now;
      const v = MC.slimeV - stage * 1.5;
      for (const e of Object.values(gs.entities)) {
        if (e.down || e.gone || e.corpse || !e.onGround) continue;
        if (Math.abs(e.x - d.x) > d.hx + 0.2 || Math.abs(e.z - d.z) > d.hz + 0.2 || Math.abs((e.y || 0) - (d.y0 + d.h)) > 0.3) continue;
        mcActivate(room, d, now);
        e.velocityY = v;
        e.onGround = false;
        e.peakY = e.y;
      }
    } else if (d.kind === 'andamio' && !d.pulse) {
      for (const e of Object.values(gs.entities)) {
        if (e.onGround && Math.abs(e.x - d.x) <= d.hx && Math.abs(e.z - d.z) <= d.hz && Math.abs((e.y || 0) - (d.y0 + d.h)) < 0.2) {
          mcActivate(room, d, now);
          break;
        }
      }
    }
  }
}

function minceraftView(room, now) {
  return (room.gameState.dyn || []).map((d) => ({ id: d.id, k: d.kind, x: d.x, z: d.z, y: Math.round(d.y0 * 100) / 100, hx: d.hx, hz: d.hz, h: d.h, r: d.ramp || undefined, o: d.owner, st: mcStage(d, now), lit: d.pulse && now - d.pulse < 400 ? 1 : undefined, ra: d.r || undefined }));
}

function glide(room, entity, now, dt) {
  const s = entity.sup;
  if (!s || s.id !== 'town_level') return false;
  if (entity.onGround) {
    s.baseY = entity.y || 0;
    if (s.glide) {
      s.glide = false;
      s.flying = false;
      Status.apply(entity, 'slow', GLIDE_LAND_LAG_MS, now, { tag: 'endlag', level: 2 });
    }
    s.airAt = 0;
    s.dj = false;
    s.jumpHeld = Boolean(entity.input.jump);
    s.holdAt = s.jumpHeld ? (s.holdAt || now) : 0;
    return false;
  }
  if (!s.airAt) s.airAt = now;
  if (s.baseY === undefined) s.baseY = entity.y || 0;
  const jumping = Boolean(entity.input.jump);
  const edge = jumping && !s.jumpHeld;
  s.jumpHeld = jumping;
  if (!jumping) s.holdAt = 0; else if (edge || !s.holdAt) s.holdAt = now;
  if (edge && !s.dj && !s.flying && now - s.airAt >= DOUBLE_JUMP_MIN_AIR_MS && s.mana >= DOUBLE_JUMP_COST && !Status.blocksMove(entity, now)) {
    s.dj = true;
    s.mana -= DOUBLE_JUMP_COST;
    entity.velocityY = DOUBLE_JUMP_V;
    entity.peakY = entity.y;
    return true;
  }
  const want = jumping && now - s.holdAt >= FLY_HOLD_MS && now - s.airAt >= GLIDE_MIN_AIR_MS && !Status.blocksMove(entity, now);
  if (want) {
    if (!s.flying && s.mana >= GLIDE_START_COST) {
      s.mana -= GLIDE_START_COST;
      s.flying = true;
      s.glide = true;
      Status.apply(entity, 'slow', GLIDE_START_LAG_MS, now, { tag: 'endlag', level: 2 });
    }
    if (s.flying) {
      s.mana -= GLIDE_COST_PER_SEC * dt;
      if (s.mana <= 0) {
        s.mana = 0;
        s.flying = false;
      } else {
        if ((entity.y || 0) < s.baseY + FLY_CEIL) entity.velocityY = Math.max(entity.velocityY, FLY_RISE);
        else entity.velocityY = 0;
        return true;
      }
    }
  } else {
    s.flying = false;
  }
  if (s.glide && entity.velocityY < GLIDE_FALL) {
    entity.velocityY = GLIDE_FALL;
    return true;
  }
  return false;
}

module.exports = { minceraftView, MC, onStunned, evade, speedBonus, tax, DEFS, wpnActive: (e, now) => Boolean(e.sup && e.sup.wpnUntil > now), grant, use, claim, tick, view, gainMana, onModule, miss, withSource, scaleStun, scalePush, absorbHeal, domeBlocks, glide, domeRadius: DOME_RADIUS };
