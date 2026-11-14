const Status = require('./Status');

const SHEETS = 3;
const TRAIL_STEP_MS = 250;
const TRAIL_KEEP_MS = 6000;
const REWIND_MS = 4500;
const NOTIFY_DELAY_MS = 3500;
const NOTIFY_RANGE = 20;
const EMBARGO_MS = 1800;
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
const STAB_PUSH = 11;
const SHOT_PUSH = 10;
const PUSH_MUL_CAP = 1.8;
const STAB_RECOIL = 3;
const SHOT_RECOIL = 6;
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
const ANSWER_STILL_MS = 2000;
const FINE_MS = 10000;
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
};

const STAR = { rhythmMax: 100, barrageMs: 1100, barrageStepMs: 100, rafagaRange: 5, rafagaWidth: 1.8, rafagaStun: 900, rafagaPush: 3, rafagaEndStun: 1500, rafagaEndPush: 9, rafagaGain: 1.5, stellarRange: 24, stellarWidth: 0.9, stellarWind: 400, stellarStun: 1300, stellarPush: 10, stellarGain: 12, catchMs: 1100, catchRange: 8, catchStun: 1800, catchPush: 10, catchGain: 20, catchFailLag: 500, pauseRange: 11, pauseStun: 1500, pauseCost: 50, rhythmStun: 0.006, reactCost: 30, reactStun: 1100, reactRange: 7, reactPush: 7, reactCd: 8000, cd: { rafaga: 6500, stellar: 9000, atrapar: 9000, pausa: 5000 } };

function grant(entity, id) {
  if (!DEFS[id]) {
    entity.sup = null;
    return;
  }
  entity.sup = { id, sheets: DEFS[id].charges || SHEETS, copyLeft: false, claims: 0, nextAt: 0, pending: 0, still: 0, lx: null, lz: null, noticeUntil: 0, taxRe: 0, taxIm: 0, taxAt: 0, evAt: 0 };
  if (id === 'platinum_star') {
    Object.assign(entity.sup, { rhythm: 0, cd: { rafaga: 0, stellar: 0, atrapar: 0, pausa: 0, react: 0 }, react: 0, poke: null, barrage: null, dome: 0, domeOn: false, parried: 0 });
  }
  if (id === 'town_level') {
    Object.assign(entity.sup, { mana: 0, shield: 0, shieldAt: 0, chain: 0, spent: 0, lastFlo: null, charging: false, chMana: 0, chAt: 0, chPush: 0, chStun: 0, cd: { bayoneta: 0, barrera: 0, senuelo: 0 }, glide: false, glideAt: 0, airAt: 0, dome: 0, decoy: null });
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
  if (s.sheets <= 0 || now < s.nextAt) return false;
  if (mode !== 'anulacion' && Status.blocksSkills(entity, now)) return false;
  if (mode === 'notificacion') {
    const t = foes(room, entity, NOTIFY_RANGE)[0];
    if (!t || (t.e.ntf && t.e.ntf.until > now)) return false;
    t.e.ntf = { until: now + NOTIFY_DELAY_MS, by: playerId, still: 0, sx: t.e.x, sz: t.e.z, sat: now };
    s.noticeUntil = now + NOTIFY_DELAY_MS;
    fx = { tx: t.e.x, tz: t.e.z, tid: t.id };
  } else if (mode === 'vuelva') {
    const t = foes(room, entity, VUELVA_RANGE)[0];
    if (!t || (t.e.size || 1) > 2) return false;
    const spot = pastSpot(t.e, now, REWIND_MS);
    if (!spot) return false;
    fx = { fx: t.e.x, fz: t.e.z, tx: spot.x, tz: spot.z, tid: t.id };
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
  for (const e of Object.values(room.gameState.entities)) {
    const s = e.sup;
    if (s && s.id === 'sunat_paperwork' && s.taxIm > 0 && s.taxAt && now - s.taxAt >= TAX_IM_DECAY_MS) {
      s.taxIm = Math.max(0, s.taxIm - 1);
      s.taxAt = now;
    }
    if (!e.ntf) continue;
    if (e.ntf.until > now) {
      const moved = Math.hypot(e.x - e.ntf.sx, e.z - e.ntf.sz) > 0.5;
      e.ntf.sx = e.x;
      e.ntf.sz = e.z;
      e.ntf.still = moved ? 0 : e.ntf.still + 50;
      if (e.ntf.still >= ANSWER_STILL_MS) e.ntf = null;
      continue;
    }
    const by = e.ntf.by;
    e.ntf = null;
    if (e.down) continue;
    Status.apply(e, 'stun', EMBARGO_MS, now);
    Status.apply(e, 'slow', FINE_MS, now, { level: 1 });
    tax(room.gameState.entities[by], TAX_FINE, 1, now);
  }
}

function view(entity, now) {
  const s = entity.sup;
  if (!s) return null;
  if (s.id === 'town_level') {
    return { id: s.id, mana: Math.floor(s.mana), manaMax: MANA_MAX, shield: Math.floor(s.shield), shieldMax: SHIELD_MAX, charging: s.charging, charge: Math.round(s.chMana), chargeMax: CHARGE_MAX_MANA, cd: { bayoneta: Math.max(0, s.cd.bayoneta - now), barrera: Math.max(0, s.cd.barrera - now), senuelo: Math.max(0, s.cd.senuelo - now) }, glide: s.glide };
  }
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
    withSource(entity, () => {
      if (close.length) {
        for (const f of close) {
          room.stun(f.id, f.e, STAB_STUN_MS, now, 0);
          Status.push(f.e, (f.e.x - entity.x) / (f.d || 1), (f.e.z - entity.z) / (f.d || 1), STAB_PUSH, 300, now);
        }
        s.cd.bayoneta = now + CD.bayoneta;
        recoil = STAB_RECOIL;
        fxp.shot = false;
        fxp.len = STAB_RANGE;
        ok = true;
      } else {
        const path = inFront(LUNGE_RANGE, 0.85, 1.2);
        const first = path[0];
        let len = SHOT_RANGE;
        if (first) {
          room.stun(first.id, first.e, SHOT_STUN_MS, now, 0);
          Status.push(first.e, nx, nz, SHOT_PUSH, 340, now);
          len = Math.min(SHOT_RANGE, first.d);
        } else {
          s.chain = 0;
        }
        s.cd.bayoneta = now + CD.bayonetaLunge;
        recoil = SHOT_RECOIL;
        fxp.shot = true;
        fxp.len = len;
        fxp.hit = Boolean(first);
        ok = true;
      }
    });
    if (ok) {
      Status.push(entity, -nx, -nz, recoil, 240, now);
      Status.apply(entity, 'slow', 300, now, { tag: 'endlag', level: 2 });
      s.wpnUntil = now + 1100;
    }
  } else if (mode === 'barrera') {
    if (now < s.cd.barrera) return false;
    s.dome = now + DOME_MS;
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
      room.broadcast('super_result', { playerId: id, mode: 'parry', x: e.x, y: e.y || 0, z: e.z, dx: e.faceX || 0, dz: e.faceZ || 1 });
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
  if (now < s.nextAt || s.poke || s.domeOn || s.barrage) return false;
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
    Status.apply(entity, 'slow', STAR.barrageMs, now, { tag: 'endlag', level: 2 });
  } else if (mode === 'stellar') {
    s.poke = { at: now + STAR.stellarWind, nx, nz };
    out.wind = STAR.stellarWind;
  } else if (mode === 'atrapar') {
    s.dome = now + STAR.catchMs;
    s.domeOn = true;
    s.parried = 0;
  } else if (mode === 'pausa') {
    if (s.rhythm < STAR.pauseCost) return false;
    s.poseUntil = now + 900;
    s.rhythm -= STAR.pauseCost;
    const all = foes(room, entity, STAR.pauseRange);
    for (const f of all) room.stun(f.id, f.e, STAR.pauseStun, now, 0);
    out.count = all.length;
    out.range = STAR.pauseRange;
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
          room.broadcast('super_result', { playerId: id, mode: 'react', x: e.x, y: e.y || 0, z: e.z, tx: tgt.e.x, tz: tgt.e.z });
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
      room.broadcast('super_result', { playerId: id, mode: 'stellar_hit', x: e.x, y: e.y || 0, z: e.z, dx: nx, dz: nz, len, hit: Boolean(first) });
    }
    if (s.parried) {
      s.parried = 0;
      s.dome = 0;
      s.domeOn = false;
      s.cd.atrapar = now + STAR.cd.atrapar;
      starGain(s, STAR.catchGain);
      const target = foes(room, e, STAR.catchRange)[0];
      if (target) {
        room.stun(target.id, target.e, starStun(s, STAR.catchStun), now, 0);
        Status.push(target.e, (target.e.x - e.x) / (target.d || 1), (target.e.z - e.z) / (target.d || 1), STAR.catchPush, 300, now);
      }
      room.broadcast('super_result', { playerId: id, mode: 'parry', star: true, x: e.x, y: e.y || 0, z: e.z, dx: e.faceX || 0, dz: e.faceZ || 1 });
    } else if (s.domeOn && s.dome <= now) {
      s.domeOn = false;
      Status.apply(e, 'slow', STAR.catchFailLag, now, { tag: 'endlag', level: 2 });
    }
    if (s.dome > now) live.push({ x: e.x, y: e.y || 0, z: e.z, until: s.dome, owner: e });
  }
  domes = domes.concat(live);
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

module.exports = { onStunned, evade, speedBonus, tax, DEFS, wpnActive: (e, now) => Boolean(e.sup && e.sup.wpnUntil > now), grant, use, claim, tick, view, gainMana, onModule, miss, withSource, scaleStun, scalePush, absorbHeal, domeBlocks, glide, domeRadius: DOME_RADIUS };
