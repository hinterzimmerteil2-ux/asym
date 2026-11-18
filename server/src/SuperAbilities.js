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
const PAD_EVERY_MS = 18000;
const PAD_LAG_MS = 900;
const PAD_RE = 9;
const PAD_IM = 0.5;
const PAD_MAX = 10;
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
const SLIDE_WINDOW_MS = 200;
const SLIDE_SPEED = 32;
const SLIDE_MS = 450;
const RELOAD_TACTICAL_MS = 1300;
const RELOAD_EMPTY_MS = 1900;
const FREE_RELOADS = 2;
const MODULE_BULLETS_PER_MIN = 6;
const SHOT_RECOIL_MISS = 21;
const SHOT_RECOIL_HIT = 4.5;
const SHOT_STUN_BONUS = 0.6;
const SHOT_PUSH = 10;
const PUSH_MUL_CAP = 1.8;
const STAB_RECOIL = 0;
const RECOIL_MS = 500;
const RECOIL_VERT = 1.3;
const CHAIN_MUL = 0.7;
const CHAIN_MAX = 2;
const CHAIN_VY_CAP = 11;
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
const FLY_HOLD_MS = 160;
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
const GLIDE_COST_PER_SEC = 2.2;
const GLIDE_FALL = -2.4;
const GLIDE_START_LAG_MS = 100;
const GLIDE_LAND_LAG_MS = 300;
const GLIDE_MIN_AIR_MS = 120;

let src = null;
let domes = [];

const DEFS = {
  town_level: { id: 'town_level', name: 'Town Level Verse Lol', modes: ['bayoneta', 'barrera', 'senuelo', 'carga'], charges: 0, wig: true, scale: 0.6 },
  sunat_paperwork: { id: 'sunat_paperwork', name: 'Sunat Paperwork', modes: ['notificacion', 'vuelva', 'anulacion'] },
  platinum_star: { id: 'platinum_star', name: 'Platinum Star', modes: ['rafaga', 'stellar', 'atrapar', 'pausa'] },
  minceraft: { id: 'minceraft', name: 'Minceraft', modes: ['andamio', 'telarana', 'slime', 'redstone', 'piston', 'pegajoso', 'polvo', 'tnt', 'miel', 'minar'] },
};

const STAR = { rhythmMax: 100, barrageMs: 1100, barrageStepMs: 100, rafagaRange: 5, rafagaWidth: 1.8, rafagaStun: 900, rafagaPush: 3, rafagaEndStun: 1500, rafagaEndPush: 9, rafagaGain: 1.5, stellarRange: 24, stellarWidth: 0.9, stellarWind: 400, stellarStun: 1300, stellarPush: 10, stellarGain: 12, catchMs: 300, catchRange: 8, catchWidth: 1.5, catchStun: 1800, catchPush: 13, throwMin: 7, throwMax: 28, throwRagMin: 800, throwRagMax: 2400, catchGain: 20, catchFailLag: 500, pauseRange: 11, pauseStun: 1500, pauseCost: 50, fabMs: 6000, fabPulseStun: 800, fabCdMul: 0.5, fabGainMul: 1.5, rhythmStun: 0.006, reactCost: 30, reactStun: 1100, reactRange: 7, reactPush: 7, reactCd: 8000, cd: { rafaga: 6500, stellar: 9000, atrapar: 9000, pausa: 12000 } };

let CUR = null;
function T(id, key, base) {
  const c = CUR && CUR.tune && CUR.tune[id];
  return c && c[key] !== undefined ? c[key] : base;
}
function wrapCfg(fn) {
  return function wrapped(a, ...rest) {
    const prev = CUR;
    if (a && a.gameState) CUR = a.superTune || null;
    else if (a && a.sup) CUR = a.sup.cfg || null;
    try {
      return fn.call(this, a, ...rest);
    } finally {
      CUR = prev;
    }
  };
}

function resetMatch(room) {
  const mine = new Set(Object.values(room.gameState.entities));
  domes = domes.filter((d) => !mine.has(d.owner));
  for (const e of mine) {
    e.sup = null;
    e.hitScale = 1;
    e.ntf = null;
    e.kbSoft = false;
  }
}

function grant(entity, id, cfg) {
  if (!DEFS[id]) {
    entity.sup = null;
    return;
  }
  entity.sup = { cfg: cfg || null, id, sheets: DEFS[id].charges || SHEETS, copyLeft: false, claims: 0, nextAt: 0, pending: 0, still: 0, lx: null, lz: null, noticeUntil: 0, taxRe: 0, taxIm: 0, taxAt: 0, evAt: 0 };
  if (id === 'platinum_star') {
    Object.assign(entity.sup, { rhythm: 0, cd: { rafaga: 0, stellar: 0, atrapar: 0, pausa: 0, react: 0 }, fabUntil: 0, react: 0, poke: null, barrage: null, dome: 0, domeOn: false, parried: 0 });
  }
  if (id === 'minceraft') {
    Object.assign(entity.sup, { used: 0, mining: null, prev: null, pv: null });
  }
  if (id === 'town_level') {
    Object.assign(entity.sup, { mana: 0, shield: 0, shieldAt: 0, chain: 0, spent: 0, lastFlo: null, charging: false, chMana: 0, chAt: 0, chPush: 0, chStun: 0, ammo: Math.round(T('town_level', 'shotAmmo', SHOT_AMMO)), ammoMax: Math.round(T('town_level', 'shotAmmo', SHOT_AMMO)), freeReloads: FREE_RELOADS, modBullets: [], cd: { bayoneta: 0, barrera: 0, senuelo: 0 }, glide: false, glideAt: 0, airAt: 0, dome: 0, decoy: null });
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
  while (s.taxRe >= T('sunat_paperwork', 'taxNeed', TAX_NEED)) {
    if (s.sheets >= SHEETS) {
      s.taxRe = T('sunat_paperwork', 'taxNeed', TAX_NEED) - 1;
      break;
    }
    s.taxRe -= T('sunat_paperwork', 'taxNeed', TAX_NEED);
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

const AIM_CHEST = 1.0;
const AIM_MAX = 1.2;

function aimY(entity, now) {
  const a = entity.sup && entity.sup.ay;
  if (!a || now - a.at > 1500) return 0;
  return Math.max(-AIM_MAX, Math.min(AIM_MAX, a.v));
}

function lineBoxes(e, nx, nz, len, half, ny = 0) {
  const out = [];
  const h = Math.max(half, 1);
  for (let d = h; d - h < len && out.length < 14; d += h * 2) out.push({ x: Math.round((e.x + nx * d) * 100) / 100, z: Math.round((e.z + nz * d) * 100) / 100, y: Math.round(((e.y || 0) + AIM_CHEST + ny * d) * 100) / 100, half: h });
  return out;
}

function rayFoes(room, e, nx, nz, ny, range, width) {
  const w = Math.max(width, 1);
  const oy = (e.y || 0) + AIM_CHEST;
  return foes(room, e, range + w).filter((f) => {
    const rx = f.e.x - e.x;
    const rz = f.e.z - e.z;
    const along = rx * nx + rz * nz;
    if (along <= 0 || along > range + w) return false;
    if (Math.abs(rx * nz - rz * nx) > w) return false;
    const th = f.e.bossHitH ? f.e.bossHitH / 2 : 0.9;
    const cy = (f.e.y || 0) + th;
    return Math.abs(cy - (oy + ny * along)) <= w + th - 0.6;
  });
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
    if (s && s.id === 'sunat_paperwork' && !e.down && !e.gone && !e.corpse) {
      if (!s.padAt) s.padAt = now + T('sunat_paperwork', 'padEveryMs', PAD_EVERY_MS);
      if (now >= s.padAt && (s.padN || 0) < PAD_MAX && !Status.blocksSkills(e, now)) {
        s.padAt = now + T('sunat_paperwork', 'padEveryMs', PAD_EVERY_MS);
        s.padN = (s.padN || 0) + 1;
        Status.apply(e, 'slow', T('sunat_paperwork', 'padLagMs', PAD_LAG_MS), now, { tag: 'endlag', level: 3 });
        tax(e, PAD_RE, PAD_IM, now);
        room.broadcast('super_result', { playerId: Object.keys(room.gameState.entities).find((k) => room.gameState.entities[k] === e), mode: 'sunat_tramite', x: e.x, y: e.y || 0, z: e.z });
      }
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
    Status.apply(e, 'slow', T('sunat_paperwork', 'fineMs', FINE_MS), now, { level: 1 });
    tax(room.gameState.entities[by], TAX_FINE, 1, now);
  }
}

function view(entity, now) {
  const s = entity.sup;
  if (!s) return null;
  if (s.id === 'town_level') {
    return { id: s.id, mana: Math.floor(s.mana), manaMax: MANA_MAX, shield: Math.floor(s.shield), shieldMax: SHIELD_MAX, charging: s.charging, ammo: s.ammo, ammoMax: s.ammoMax, reload: s.reload ? Math.max(0, s.reload.until - now) : 0, reloadMax: s.reload ? s.reload.until - s.reload.at : 0, freeReloads: s.freeReloads, charge: Math.round(s.chMana), chargeMax: CHARGE_MAX_MANA, cd: { bayoneta: Math.max(0, s.cd.bayoneta - now), barrera: Math.max(0, s.cd.barrera - now), senuelo: Math.max(0, s.cd.senuelo - now) }, glide: s.glide };
  }
  if (s.id === 'minceraft') return { id: s.id, used: s.used, max: T('minceraft', 'max', MC.max), mining: s.mining ? Math.max(0, s.mining.until - now) : 0 };
  if (s.id === 'platinum_star') {
    return { id: s.id, rhythm: Math.floor(s.rhythm), rhythmMax: T('platinum_star', 'rhythmMax', STAR.rhythmMax), pauseCost: STAR.pauseCost, fab: Math.max(0, (s.fabUntil || 0) - now), fabMax: STAR.fabMs, ready: s.rhythm >= STAR.reactCost && now >= s.cd.react, windUp: Boolean(s.poke), barrage: Boolean(s.barrage), catching: s.domeOn, cd: { rafaga: Math.max(0, s.cd.rafaga - now), stellar: Math.max(0, s.cd.stellar - now), atrapar: Math.max(0, s.cd.atrapar - now), pausa: Math.max(0, s.cd.pausa - now) } };
  }
  return { id: s.id, sheets: s.sheets, max: SHEETS, taxRe: Math.floor(s.taxRe), taxIm: s.taxIm, taxNeed: T('sunat_paperwork', 'taxNeed', TAX_NEED), taxImMax: TAX_IM_MAX };
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
    if (s.reload) return false;
    if (s.charging) { s.charging = false; return true; }
    if (s.ammo < s.ammoMax + (s.ammo > 0 ? 1 : 0) && s.freeReloads > 0 && !Status.blocksSkills(entity, now)) {
      const tactical = s.ammo > 0;
      const ms = tactical ? T('town_level', 'reloadTacticalMs', RELOAD_TACTICAL_MS) : T('town_level', 'reloadEmptyMs', RELOAD_EMPTY_MS);
      s.reload = { until: now + ms, tactical, at: now };
      s.nextAt = now + USE_GAP_MS;
      Status.apply(entity, 'slow', ms, now, { level: 1 });
      room.broadcast('super_result', { playerId, mode: 'recarga_inicio', x: entity.x, y: entity.y || 0, z: entity.z, dur: ms, tactical });
      return true;
    }
    return false;
  }
  if (Status.blocksSkills(entity, now)) return false;
  if (s.reload && mode !== 'bayoneta') {
    s.reload = null;
    Status.clear && Status.clear(entity, 'slow');
  }
  const fx = entity.faceX || 0;
  const fz = entity.faceZ || 1;
  const flen = Math.hypot(fx, fz) || 1;
  const nx = fx / flen;
  const nz = fz / flen;
  let ok = false;
  let fxp = { x: entity.x, y: entity.y || 0, z: entity.z, dx: nx, dz: nz };
  if (mode === 'bayoneta') {
    if (now < s.cd.bayoneta) return false;
    const ny = aimY(entity, now);
    const close = foes(room, entity, STAB_RANGE).filter((f) => ((f.e.x - entity.x) * nx + (f.e.z - entity.z) * nz) > 0 && Math.abs((f.e.y || 0) - (entity.y || 0)) < 2.4);
    let recoil = 0;
    let shotBlocked = false;
    let chained = false;
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
        if (s.ammo <= 0 || s.reload) {
          shotBlocked = true;
          return;
        }
        s.ammo -= 1;
        if (!entity.onGround && (s.airShots || 0) < CHAIN_MAX && s.ammo > 0) {
          s.ammo -= 1;
          s.airShots = (s.airShots || 0) + 1;
          chained = true;
        }
        const path = rayFoes(room, entity, nx, nz, ny, LUNGE_RANGE, 1.2);
        const first = path[0];
        let len = T('town_level', 'shotRange', SHOT_RANGE);
        if (first) {
          const near = Math.max(0, 1 - first.d / T('town_level', 'shotRange', SHOT_RANGE));
          room.stun(first.id, first.e, Math.round(SHOT_STUN_MS * (1 + SHOT_STUN_BONUS * near)), now, 0);
          Status.push(first.e, nx, nz, SHOT_PUSH, 340, now);
          len = Math.min(T('town_level', 'shotRange', SHOT_RANGE), first.d);
          recoil = T('town_level', 'recoilHit', SHOT_RECOIL_HIT) + (T('town_level', 'recoilMiss', SHOT_RECOIL_MISS) - T('town_level', 'recoilHit', SHOT_RECOIL_HIT)) * (1 - near);
        } else {
          s.chain = 0;
          recoil = T('town_level', 'recoilMiss', SHOT_RECOIL_MISS);
        }
        s.cd.bayoneta = now + CD.bayonetaLunge;
        fxp.shot = true;
        fxp.len = len;
        fxp.boxes = lineBoxes(entity, nx, nz, LUNGE_RANGE, 1.2, ny);
        fxp.dy = ny;
        fxp.hit = Boolean(first);
        ok = true;
      }
    });
    if (shotBlocked) return false;
    if (ok) {
      if (recoil > 0) {
        const mul = chained ? 1 + CHAIN_MUL : 1;
        Status.push(entity, -nx, -nz, recoil * Math.sqrt(Math.max(0.15, 1 - ny * ny)), RECOIL_MS, now);
        entity.kbSoft = true;
        if (fxp.shot) {
          const vy = Math.max(-4, Math.min(CHAIN_VY_CAP, -ny * recoil * RECOIL_VERT * mul));
          if (vy > 0.5 || (vy < 0 && !entity.onGround)) {
            entity.velocityY = chained ? Math.min(CHAIN_VY_CAP, Math.max(entity.velocityY, 0) + vy) : vy;
            if (vy > 0.5) entity.onGround = false;
          }
        }
      }
      Status.apply(entity, 'slow', 300, now, { tag: 'endlag', level: 2 });
      s.wpnUntil = now + 1100;
    }
  } else if (mode === 'barrera') {
    if (now < s.cd.barrera) return false;
    s.slide = { aimUntil: now + SLIDE_WINDOW_MS, dx: nx, dz: nz, started: false };
    s.dome = now + DOME_MS;
    fxp.radius = DOME_RADIUS;
    s.domeOn = true;
    s.parried = 0;
    s.cd.barrera = now + CD.barrera;
    s.wpnUntil = 0;
    ok = true;
  } else if (mode === 'senuelo') {
    if (now < s.cd.senuelo) return false;
    s.decoy = { x: entity.x, y: entity.y || 0, z: entity.z, until: now + DECOY_MS, born: now, last: now, vx: -nx * DECOY_SPEED, vz: -nz * DECOY_SPEED };
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
    if (s.reload && now >= s.reload.until) {
      s.ammo = s.reload.tactical ? s.ammoMax + 1 : s.ammoMax;
      s.freeReloads = Math.max(0, s.freeReloads - 1);
      s.reload = null;
      room.broadcast('super_result', { playerId: id, mode: 'recarga', x: e.x, y: e.y || 0, z: e.z });
    }
    if (s.reload && (e.down || Status.blocksSkills(e, now))) s.reload = null;
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
    if (s.slide) {
      const sl = s.slide;
      if (now < sl.aimUntil) {
        const mx = e.input ? e.input.moveX : 0;
        const mz = e.input ? e.input.moveZ : 0;
        const ml = Math.hypot(mx, mz);
        if (ml > 0.1) {
          sl.dx = mx / ml;
          sl.dz = mz / ml;
        }
      } else if (!sl.started) {
        sl.started = true;
        if (!Status.blocksMove(e, now)) {
          Status.push(e, -sl.dx, -sl.dz, T('town_level', 'slideSpeed', SLIDE_SPEED), T('town_level', 'slideMs', SLIDE_MS), now, { boss: true });
          e.kbSoft = true;
          room.broadcast('super_result', { playerId: id, mode: 'deslizar', x: e.x, y: e.y || 0, z: e.z, dx: -sl.dx, dz: -sl.dz });
        }
        s.slideUntil = now + T('town_level', 'slideMs', SLIDE_MS);
        s.slide = null;
      }
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
  const mul = s.fabUntil > Date.now() ? STAR.fabGainMul : 1;
  s.rhythm = Math.min(T('platinum_star', 'rhythmMax', STAR.rhythmMax), s.rhythm + n * mul);
}

function starK(s) {
  return Math.max(0, Math.min(1, s.rhythm / T('platinum_star', 'rhythmMax', STAR.rhythmMax)));
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
  const k = starK(s);
  const fb = s.fabUntil > now;
  const out = { x: entity.x, y: entity.y || 0, z: entity.z, dx: nx, dz: nz };
  if (mode === 'rafaga') {
    const ny = aimY(entity, now);
    out.dy = ny;
    const ms = Math.round(STAR.barrageMs * (1 + 0.4 * k) * (fb ? 1.25 : 1));
    const range = STAR.rafagaRange * (1 + 0.3 * k) * (fb ? 1.2 : 1);
    const width = STAR.rafagaWidth * (fb ? 1.4 : 1);
    s.barrage = { until: now + ms, next: now, nx, nz, ny, range, width };
    out.len = range;
    out.ms = ms;
    out.boxes = lineBoxes(entity, nx, nz, range, width, ny);
    Status.apply(entity, 'slow', ms, now, { tag: 'endlag', level: 2 });
  } else if (mode === 'stellar') {
    const ny = aimY(entity, now);
    out.dy = ny;
    s.poke = { at: now + STAR.stellarWind, nx, nz, ny, range: T('platinum_star', 'stellarRange', STAR.stellarRange) * (1 + 0.25 * k), pierce: fb, pushMul: 1 + 0.5 * k };
    out.wind = STAR.stellarWind;
  } else if (mode === 'atrapar') {
    const ny = aimY(entity, now);
    out.dy = ny;
    const range = STAR.catchRange * (1 + 0.3 * k) * (fb ? 1.3 : 1);
    const width = STAR.catchWidth * (fb ? 1.3 : 1);
    s.grab = { at: now + STAR.catchMs, nx, nz, ny, range, width, forceMul: (1 + 0.3 * k) * (fb ? 1.3 : 1), safe: fb };
    out.wind = STAR.catchMs;
    out.len = range;
    out.boxes = lineBoxes(entity, nx, nz, range, width, ny);
  } else if (mode === 'pausa') {
    if (s.rhythm < STAR.pauseCost || fb) return false;
    s.poseUntil = now + 900;
    s.rhythm -= STAR.pauseCost;
    s.fabUntil = now + STAR.fabMs;
    for (const m of ['rafaga', 'stellar', 'atrapar']) if (s.cd[m] > now) s.cd[m] = now + (s.cd[m] - now) * STAR.fabCdMul;
    out.fab = STAR.fabMs;
    const all = foes(room, entity, STAR.pauseRange);
    for (const f of all) room.stun(f.id, f.e, STAR.fabPulseStun, now, 0);
    out.count = all.length;
    out.range = STAR.pauseRange;
    out.radius = STAR.pauseRange;
  } else return false;
  s.cd[mode] = now + STAR.cd[mode] * (fb && mode !== 'pausa' ? STAR.fabCdMul : 1);
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
      const targets = rayFoes(room, e, b.nx, b.nz, b.ny || 0, b.range || STAR.rafagaRange, b.width || STAR.rafagaWidth);
      for (const f of targets) {
        room.stun(f.id, f.e, starStun(s, last ? STAR.rafagaEndStun : STAR.rafagaStun), now, 0);
        Status.push(f.e, b.nx, b.nz, last ? STAR.rafagaEndPush : STAR.rafagaPush, last ? 320 : 120, now);
        starGain(s, STAR.rafagaGain);
      }
      if (last) s.barrage = null;
      else b.next = now + STAR.barrageStepMs;
    }
    if (s.poke && now >= s.poke.at) {
      const { nx, nz, ny, pierce, pushMul } = s.poke;
      const srange = s.poke.range || T('platinum_star', 'stellarRange', STAR.stellarRange);
      s.poke = null;
      const path = rayFoes(room, e, nx, nz, ny || 0, srange, STAR.stellarWidth);
      const first = path[0];
      let len = srange;
      for (const f of pierce ? path : path.slice(0, 1)) {
        room.stun(f.id, f.e, starStun(s, STAR.stellarStun), now, 0);
        Status.push(f.e, nx, nz, STAR.stellarPush * (pushMul || 1), 320, now);
        starGain(s, STAR.stellarGain);
        len = pierce ? Math.max(f.d, pierce && len === srange ? 0 : len) : f.d;
      }
      room.broadcast('super_result', { playerId: id, mode: 'stellar_hit', boxes: lineBoxes(e, nx, nz, srange, STAR.stellarWidth, ny || 0), dy: ny || 0, x: e.x, y: e.y || 0, z: e.z, dx: nx, dz: nz, len, hit: Boolean(first) });
    }
    if (s.grab && now >= s.grab.at) {
      const { nx, nz, ny } = s.grab;
      const grabRange = s.grab.range || STAR.catchRange;
      const grabWidth = s.grab.width || STAR.catchWidth;
      const forceMul = s.grab.forceMul || 1;
      const safe = s.grab.safe;
      s.grab = null;
      const target = rayFoes(room, e, nx, nz, ny || 0, grabRange, grabWidth)[0];
      if (target) {
        const tp = room.players.get(target.id);
        const boss = Boolean(tp && tp.isBoss);
        let frac = 0.5;
        if (boss && target.e.hpMax) frac = target.e.hp / target.e.hpMax;
        else if (room.gameState.curator && room.gameState.curator.max) frac = room.gameState.curator.hp / room.gameState.curator.max;
        frac = Math.max(0, Math.min(1, frac));
        const force = (T('platinum_star', 'throwMin', STAR.throwMin) + (T('platinum_star', 'throwMax', STAR.throwMax) - T('platinum_star', 'throwMin', STAR.throwMin)) * (1 - frac)) * (boss ? 0.5 : 1) * forceMul;
        room.stun(target.id, target.e, starStun(s, STAR.catchStun), now, 0);
        if (!boss) room.ragdoll(target.id, target.e, Math.round(T('platinum_star', 'throwRagMin', STAR.throwRagMin) + (T('platinum_star', 'throwRagMax', STAR.throwRagMax) - T('platinum_star', 'throwRagMin', STAR.throwRagMin)) * (1 - frac)), now);
        Status.push(target.e, nx, nz, force, 520, now);
        target.e.velocityY = Math.max(target.e.velocityY || 0, 3 + force * 0.14);
        target.e.onGround = false;
        target.e.peakY = target.e.y;
        starGain(s, STAR.catchGain);
      } else if (!safe) {
        Status.apply(e, 'slow', STAR.catchFailLag, now, { tag: 'endlag', level: 2 });
      }
      room.broadcast('super_result', { playerId: id, mode: 'atrapar_hit', boxes: lineBoxes(e, nx, nz, grabRange, grabWidth, ny || 0), dy: ny || 0, x: e.x, y: e.y || 0, z: e.z, dx: nx, dz: nz, len: target ? target.d : grabRange, hit: Boolean(target) });
    }
    if (s.dome > now) live.push({ x: e.x, y: e.y || 0, z: e.z, until: s.dome, owner: e });
  }
  domes = domes.concat(live);
}


const MC = {
  max: 64, life: 12000, cell: 1, gap: 300, endlag: 250, mineMs: 400, mineRange: 4.2, range: 7, size: 1, jumpV: 7.3, climbV: 4.2, fallSlow: 1.8,
  w: { andamio: 1, telarana: 1, slime: 2, redstone: 2, piston: 3, pegajoso: 4, polvo: 1, tnt: 4, miel: 2 },
  pistonPush: 14, pistonLen: 1.8, pistonStun: 350, pistonLife: 6000, pistonPlaneV: 13, pistonMax: 5, tntDmg: 6, tntBossDmg: 150000, tntRagMs: 1300, tntFuse: 1400, tntR: 3.6, tntPush: 13, tntUp: 6.5, tntStun: 900, honeyLevel: 3, honeyFall: 1.4,
  webSlow: 2, slimeV: 11, chainStep: 200, chainReach: 1.1, redstoneReach: 2.1, redstoneR: 2.6, redstoneStun: 600, chainCool: 1500, pieceLimit: 160,
};

function mcLife(d) {
  return d.life || (T('minceraft', 'lifeSec', MC.life / 1000) * 1000);
}

function mcStage(d, now) {
  return Math.min(2, Math.floor(((now - d.born) / mcLife(d)) * 3));
}

function mcBase(room, x, z, y) {
  return Hitbox.groundAt(room.allPlatforms(), x, z, y, 3);
}

function mcSnap(v) {
  return Math.round(v / MC.cell) * MC.cell;
}

const MC_CONDUCT = new Set(['polvo', 'redstone']);
const MC_CONSUME = new Set(['piston', 'tnt', 'redstone']);

function mcAdjacent(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  const dy = Math.abs(a.y0 - b.y0);
  if (dx + dz > 1.15) return false;
  if (dx + dz < 0.5) return dy > 0.5 && dy <= 1.1;
  return dy <= 1.1;
}

function mcChain(room, d, now) {
  const dyn = room.gameState.dyn;
  const seen = new Set([d.id]);
  let frontier = [d];
  let hop = 0;
  while (frontier.length && hop < 16) {
    hop += 1;
    const next = [];
    for (const f of frontier) {
      if (f !== d && !MC_CONDUCT.has(f.kind)) continue;
      for (const o of dyn) {
        if (seen.has(o.id) || o.owner !== d.owner) continue;
        if (!MC_CONDUCT.has(o.kind) && !MC_CONSUME.has(o.kind)) continue;
        if (!mcAdjacent(f, o)) continue;
        seen.add(o.id);
        if (now < (o.cool || 0)) continue;
        o.pw = true;
        o.pulse = now + hop * MC.chainStep;
        o.cool = o.pulse + MC.chainCool;
        next.push(o);
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

function mcPlan(room, playerId, entity, mode, now) {
  const w = MC.w[mode];
  if (!w) return null;
  const s = entity.sup;
  const gs = room.gameState;
  const fl = Math.hypot(entity.faceX || 0, entity.faceZ || 1) || 1;
  const nx = (entity.faceX || 0) / fl;
  const nz = (entity.faceZ || 1) / fl;
  let ok = s.used + w <= T('minceraft', 'max', MC.max) && gs.dyn.length < MC.pieceLimit;
  let tx = entity.x + nx * 1.6;
  let tz = entity.z + nz * 1.6;
  let adx = nx;
  let adz = nz;
  if (s.aim && now - s.aim.at < 1500) {
    const dx = s.aim.x - entity.x;
    const dz = s.aim.z - entity.z;
    const dl = Math.hypot(dx, dz);
    if (dl > 0.01) {
      adx = dx / dl;
      adz = dz / dl;
      const reach = Math.min(dl, MC.range);
      tx = entity.x + adx * reach;
      tz = entity.z + adz * reach;
    }
  }
  let px = mcSnap(tx);
  let pz = mcSnap(tz);
  if (Math.hypot(px - entity.x, pz - entity.z) > MC.range) {
    px = mcSnap(tx - adx * MC.cell * 0.6);
    pz = mcSnap(tz - adz * MC.cell * 0.6);
  }
  const ey = entity.y || 0;
  const inCell = (o) => Math.abs(o.x - px) < 0.1 && Math.abs(o.z - pz) < 0.1;
  const stack = gs.dyn.filter((o) => inCell(o) && o.solid);
  let base = mcBase(room, px, pz, ey);
  const under = gs.dyn.find((o) => o.solid && Math.abs(entity.x - o.x) <= o.hx && Math.abs(entity.z - o.z) <= o.hz && Math.abs(o.y0 + o.h - ey) < 0.3);
  if (stack.length) base = Math.max(...stack.map((o) => o.y0 + o.h));
  else if (under && base < under.y0 - 0.5) base = under.y0;
  if (base > ey + 2.2) ok = false;
  const piece = { id: `mc${(gs.dynSeq = (gs.dynSeq || 0) + 1)}`, kind: mode, owner: playerId, born: now, x: px, z: pz, y0: base, hx: 0.5, hz: 0.5, h: 1, ramp: null, solid: true, pulse: 0, cool: 0, fired: 0, w };
  if (mode === 'andamio') piece.oneway = true;
  if (mode === 'telarana') piece.solid = false;
  if (mode === 'polvo') {
    piece.solid = false;
    piece.h = 0.08;
    const below = stack.find((o) => Math.abs(o.y0 + o.h - base) < 0.1);
    if (below) piece.sup = below.id;
    else ok = false;
  }
  if (mode === 'piston' || mode === 'pegajoso') {
    const ny = aimY(entity, now);
    piece.kind = 'piston';
    if (mode === 'pegajoso') piece.sticky = true;
    piece.life = (T('minceraft', 'pistonLifeSec', MC.pistonLife / 1000) * 1000);
    piece.dx = 0;
    piece.dz = 0;
    piece.dy = 0;
    if (Math.abs(ny) > 0.4) piece.dy = ny > 0 ? 1 : -1;
    else if (Math.abs(adx) >= Math.abs(adz)) piece.dx = adx >= 0 ? 1 : -1;
    else piece.dz = adz >= 0 ? 1 : -1;
  }
  for (const o of gs.dyn) {
    if (inCell(o) && Math.abs(o.y0 - piece.y0) < 0.1) ok = false;
  }
  if (piece.solid && !piece.oneway) {
    for (const e of Object.values(gs.entities)) {
      if (!e.down && Math.abs(e.x - piece.x) < piece.hx + 0.35 && Math.abs(e.z - piece.z) < piece.hz + 0.35 && (e.y || 0) < piece.y0 + piece.h - 0.2 && (e.y || 0) + 1.6 > piece.y0) ok = false;
    }
  }
  return { piece, ok };
}

function scaffoldAt(room, entity) {
  const dyn = room.gameState.dyn;
  if (!dyn || !dyn.length) return null;
  const y = entity.y || 0;
  for (const d of dyn) {
    if (d.kind !== 'andamio') continue;
    if (Math.abs(entity.x - d.x) <= d.hx + 0.2 && Math.abs(entity.z - d.z) <= d.hz + 0.2 && y >= d.y0 - 0.2 && y < d.y0 + d.h - 0.1) return d;
  }
  return null;
}

function climb(room, entity, input) {
  if (!scaffoldAt(room, entity)) return;
  if (input.jump) entity.velocityY = MC.climbV;
  else if (input.slow) entity.velocityY = 0;
  else if (entity.velocityY < -MC.fallSlow) entity.velocityY = -MC.fallSlow;
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
  const plan = mcPlan(room, playerId, entity, mode, now);
  if (!plan || !plan.ok) return false;
  const piece = plan.piece;
  const w = piece.w;
  const boxes = piece.kind === 'telarana' || piece.kind === 'polvo' ? undefined : [{ x: piece.x, z: piece.z, y: piece.y0 + piece.h / 2, half: Math.max(piece.hx, piece.hz) }];
  gs.dyn.push(piece);
  gs.dynVer += 1;
  if (piece.kind === 'redstone') mcChain(room, piece, now);
  else if (piece.kind === 'piston' || piece.kind === 'tnt') {
    const src = gs.dyn.find((o) => o !== piece && o.kind === 'redstone' && o.owner === playerId && mcAdjacent(o, piece));
    if (src) {
      piece.pw = true;
      piece.pulse = now + MC.chainStep;
      piece.cool = piece.pulse + MC.chainCool;
    }
  }
  s.used += w;
  s.nextAt = now + MC.gap;
  Status.apply(entity, 'slow', MC.endlag, now, { tag: 'endlag', level: 1 });
  room.broadcast('super_result', { playerId, mode, x: piece.x, y: piece.y0, z: piece.z, radius: piece.r, boxes, used: s.used });
  return true;
}

function mcRemove(room, d) {
  const gs = room.gameState;
  gs.dyn = gs.dyn.filter((o) => o !== d);
  gs.dynVer += 1;
  const owner = gs.entities[d.owner];
  if (owner && owner.sup && owner.sup.id === 'minceraft') owner.sup.used = Math.max(0, owner.sup.used - d.w);
  for (const o of gs.dyn.slice()) if (o.sup === d.id) mcRemove(room, o);
}

function mcPistonFire(room, d, stage, now) {
  const gs = room.gameState;
  const dx = d.dx || 0;
  const dz = d.dz || 0;
  const dy = d.dy || 0;
  const len = MC.pistonLen;
  for (const [pid, e] of Object.entries(gs.entities)) {
    if (e.down || e.gone || e.corpse) continue;
    const ey = e.y || 0;
    let inside = false;
    if (dy) {
      const along = dy > 0 ? ey - (d.y0 + d.h) : d.y0 - (ey + 1.6);
      inside = Math.abs(e.x - d.x) <= 0.95 && Math.abs(e.z - d.z) <= 0.95 && along > -0.6 && along < len;
    } else {
      const cx = d.x + dx * (0.5 + len / 2);
      const cz = d.z + dz * (0.5 + len / 2);
      const along = (e.x - cx) * dx + (e.z - cz) * dz;
      const side = Math.abs((e.x - cx) * dz) + Math.abs((e.z - cz) * dx);
      inside = Math.abs(along) <= len / 2 + 0.3 && side <= 0.95 && ey >= d.y0 - 0.6 && ey <= d.y0 + 1.8;
    }
    if (!inside) continue;
    const pl = room.players.get(pid);
    const asymE = Boolean(pl && (pl.isAsymRole || pl.isBoss));
    if (asymE) room.stun(pid, e, MC.pistonStun - stage * 80, now, 0);
    if (dy) {
      e.velocityY = dy * MC.pistonPlaneV;
      e.onGround = false;
      e.peakY = e.y;
    } else {
      Status.push(e, dx, dz, T('minceraft', 'pistonPush', MC.pistonPush), 320, now);
      if (e.onGround) {
        e.velocityY = 3;
        e.onGround = false;
      }
    }
  }
  const sameCell = (o, x, z) => Math.abs(o.x - x) < 0.1 && Math.abs(o.z - z) < 0.1;
  const at = (x, z, y0) => gs.dyn.find((o) => o !== d && sameCell(o, x, z) && Math.abs(o.y0 - y0) < 0.6 && o.solid);
  const moved = [];
  let cx = d.x + dx;
  let cz = d.z + dz;
  let cy = dy > 0 ? d.y0 + d.h : dy < 0 ? d.y0 - 1 : d.y0;
  let freeAt = null;
  for (let k = 0; k < MC.pistonMax + 1; k++) {
    const hit = at(cx, cz, cy);
    if (!hit) {
      freeAt = k;
      break;
    }
    moved.push(hit);
    cx += dx;
    cz += dz;
    cy += dy;
  }
  if (d.sticky && freeAt === 0) {
    const far = at(d.x + dx * 2, d.z + dz * 2, d.y0 + dy * 2 + (dy > 0 ? d.h - 1 : 0));
    if (far) d.pull = { ids: [far.id], at: now + 520, dx, dy, dz };
  }
  if (freeAt !== null && moved.length) {
    const set = new Set(moved);
    const addDependents = (p) => {
      for (const o of gs.dyn) {
        if (set.has(o) || o === d) continue;
        if (o.sup === p.id || (sameCell(o, p.x, p.z) && Math.abs(o.y0 - (p.y0 + p.h)) < 0.15 && !(dy < 0))) {
          set.add(o);
          addDependents(o);
        }
      }
    };
    for (const p of moved.slice()) addDependents(p);
    const lim = room.gameState.halfSize || 60;
    let ok = true;
    for (const p of set) {
      const nx = p.x + dx;
      const nz = p.z + dz;
      if (Math.abs(nx) > lim || Math.abs(nz) > lim || p.y0 + dy < -0.01) ok = false;
    }
    if (ok) {
      for (const p of set) {
        p.x += dx;
        p.z += dz;
        p.y0 += dy;
      }
      gs.dynVer += 1;
      for (const p of set) {
        if (p.kind !== 'slime') continue;
        for (const [pid2, e2] of Object.entries(gs.entities)) {
          if (e2.down || e2.gone || e2.corpse) continue;
          const ey2 = e2.y || 0;
          if (Math.abs(e2.x - p.x) > 1 || Math.abs(e2.z - p.z) > 1 || ey2 < p.y0 - 0.5 || ey2 > p.y0 + p.h + 0.4) continue;
          if (dy) {
            e2.velocityY = dy * MC.pistonPlaneV * 2.1;
            e2.onGround = false;
            e2.peakY = e2.y;
          } else {
            Status.push(e2, dx, dz, T('minceraft', 'pistonPush', MC.pistonPush) * 2.8, 450, now);
            e2.velocityY = Math.max(e2.velocityY || 0, 6);
            e2.onGround = false;
          }
        }
      }
      if (d.sticky) d.pull = { ids: [...set].map((p) => p.id), at: now + 520, dx, dy, dz };
    }
  }
  room.broadcast('super_result', { playerId: d.owner, mode: 'piston_golpe', x: d.x + dx, y: d.y0 + 0.5 + dy, z: d.z + dz });
}

function mcPistonPull(room, d) {
  const gs = room.gameState;
  const pl = d.pull;
  d.pull = null;
  const set = pl.ids.map((id) => gs.dyn.find((o) => o.id === id)).filter(Boolean);
  if (!set.length) return;
  const mem = new Set(set);
  for (const p of set) {
    const nx = p.x - pl.dx;
    const nz = p.z - pl.dz;
    const ny = p.y0 - pl.dy;
    if (gs.dyn.some((o) => !mem.has(o) && o !== d && o.solid && Math.abs(o.x - nx) < 0.1 && Math.abs(o.z - nz) < 0.1 && Math.abs(o.y0 - ny) < 0.6)) return;
    if (Math.abs(nx - d.x) < 0.1 && Math.abs(nz - d.z) < 0.1 && Math.abs(ny - d.y0) < 0.6) return;
  }
  for (const p of set) {
    p.x -= pl.dx;
    p.z -= pl.dz;
    p.y0 -= pl.dy;
  }
  gs.dynVer += 1;
  room.broadcast('super_result', { playerId: d.owner, mode: 'piston_golpe', x: d.x + pl.dx, y: d.y0 + 0.5 + pl.dy, z: d.z + pl.dz });
}

function mcExplode(room, d, now) {
  const gs = room.gameState;
  const stage = mcStage(d, now);
  const cy = d.y0 + 0.5;
  let hit = 0;
  let dmgDone = false;
  for (const [pid, e] of Object.entries(gs.entities)) {
    if (e.down || e.gone || e.corpse) continue;
    const dx = e.x - d.x;
    const dz = e.z - d.z;
    const dist = Math.hypot(dx, dz);
    if (dist > T('minceraft', 'tntR', MC.tntR) || Math.abs((e.y || 0) + 0.9 - cy) > 3) continue;
    const k = 1 - Math.min(1, dist / T('minceraft', 'tntR', MC.tntR)) * 0.5;
    const pl = room.players.get(pid);
    const isBoss = Boolean(pl && pl.isBoss);
    const asymE = Boolean(pl && (pl.isAsymRole || isBoss));
    const near = dist < 1.6 ? 1.3 : 1;
    if (asymE) {
      room.stun(pid, e, MC.tntStun - stage * 150, now, 0);
      hit += 1;
      if (isBoss) {
        const Boss = require('./Boss');
        Boss.tntHit(room, MC.tntBossDmg);
      } else if (!dmgDone) {
        dmgDone = true;
        room.adjustCuratorHp(-T('minceraft', 'tntDmg', MC.tntDmg));
        room.checkGameEndConditions();
      }
    }
    const prevOn = (e.kbUntil || 0) > now;
    const px = prevOn ? e.kbX || 0 : 0;
    const pz = prevOn ? e.kbZ || 0 : 0;
    Status.push(e, dx / (dist || 1), dz / (dist || 1), MC.tntPush * k * near, 380, now);
    let sx = e.kbX + px;
    let sz = e.kbZ + pz;
    const sl = Math.hypot(sx, sz);
    const cap = MC.tntPush * 2.4;
    if (sl > cap) {
      sx = (sx / sl) * cap;
      sz = (sz / sl) * cap;
    }
    e.kbX = sx;
    e.kbZ = sz;
    e.kbUntil = now + 380;
    if (asymE && !isBoss) room.ragdoll(pid, e, MC.tntRagMs, now);
    e.velocityY = Math.min(MC.tntUp * 2.2, Math.max(0, e.velocityY || 0) + MC.tntUp * k * near);
    e.onGround = false;
    e.peakY = e.y;
  }
  const wasHere = gs.dyn.filter((o) => o !== d && Math.hypot(o.x - d.x, o.z - d.z) <= 1.9 && Math.abs(o.y0 - d.y0) <= 1.5);
  mcRemove(room, d);
  for (const o of wasHere) {
    if (!gs.dyn.includes(o)) continue;
    if (o.kind === 'tnt') {
      if (!o.fuse) o.fuse = now + 250;
    } else mcRemove(room, o);
  }
  room.broadcast('super_result', { playerId: d.owner, mode: 'tnt_boom', x: d.x, y: cy, z: d.z, radius: T('minceraft', 'tntR', MC.tntR), hit });
}

function tickMine(room, now) {
  const gs = room.gameState;
  for (const [pid, e] of Object.entries(gs.entities)) {
    const sp = e.sup;
    if (!sp || sp.id !== 'minceraft') continue;
    if (sp.prev && sp.prev.until > now) {
      const pl = mcPlan(room, pid, e, sp.prev.mode, now);
      sp.pv = pl ? { k: pl.piece.kind, x: pl.piece.x, z: pl.piece.z, y: Math.round(pl.piece.y0 * 100) / 100, hx: pl.piece.hx, hz: pl.piece.hz, h: pl.piece.h, r: pl.piece.ramp || undefined, ra: pl.piece.r || undefined, ok: pl.ok ? 1 : 0, dx: pl.piece.dx, dz: pl.piece.dz, dy: pl.piece.dy, sk: pl.piece.sticky ? 1 : undefined } : null;
    } else sp.pv = null;
  }
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
    if (now - d.born >= mcLife(d)) {
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
        if (Math.abs(e.x - d.x) > d.hx + 0.35 || Math.abs(e.z - d.z) > d.hz + 0.35 || (e.y || 0) < d.y0 - 1.5 || (e.y || 0) > d.y0 + d.h) continue;
        Status.apply(e, 'slow', 400, now, { level: Math.min(3, slow) });
        if (now >= (d.cool || 0)) mcActivate(room, d, now);
      }
    } else if (d.kind === 'redstone' && fire && d.pw) {
      d.pw = false;
      let hit = 0;
      for (const e of asym) {
        if (e.down || e.gone || e.corpse) continue;
        const dist = Math.hypot(e.x - d.x, e.z - d.z);
        if (dist > MC.redstoneR || Math.abs((e.y || 0) - (d.y0 + 0.5)) > 2.5) continue;
        const pid = Object.keys(gs.entities).find((k) => gs.entities[k] === e);
        room.stun(pid, e, MC.redstoneStun - stage * 150, now, 0);
        Status.push(e, (e.x - d.x) / (dist || 1), (e.z - d.z) / (dist || 1), 6, 250, now);
        hit += 1;
      }
      room.broadcast('super_result', { playerId: d.owner, mode: 'redstone_pulso', x: d.x, y: d.y0 + 0.5, z: d.z, radius: MC.redstoneR, hit });
    } else if (d.kind === 'slime' && (fire || now - (d.lastCheck || 0) > 100)) {
      d.lastCheck = now;
      const v = T('minceraft', 'slimeV', MC.slimeV) - stage * 1.5;
      for (const e of Object.values(gs.entities)) {
        if (e.down || e.gone || e.corpse || !e.onGround) continue;
        if (Math.abs(e.x - d.x) > d.hx + 0.2 || Math.abs(e.z - d.z) > d.hz + 0.2 || Math.abs((e.y || 0) - (d.y0 + d.h)) > 0.3) continue;
        mcActivate(room, d, now);
        e.velocityY = v;
        e.onGround = false;
        e.peakY = e.y;
      }
    } else if (d.kind === 'piston') {
      if (d.pull && now >= d.pull.at) mcPistonPull(room, d);
      if (fire && d.pw) {
        d.pw = false;
        d.ext = now + 450;
        mcPistonFire(room, d, stage, now);
      } else if (fire) d.pw = false;
    } else if (d.kind === 'polvo') {
      for (const e of asym) {
        if (e.down || e.gone || e.corpse) continue;
        if (Math.abs(e.x - d.x) > 0.6 || Math.abs(e.z - d.z) > 0.6 || Math.abs((e.y || 0) - d.y0) > 0.5) continue;
        if (now >= (d.cool || 0)) mcActivate(room, d, now);
      }
    } else if (d.kind === 'tnt') {
      if (fire && d.pw && !d.fuse) d.fuse = now + (T('minceraft', 'tntFuseSec', MC.tntFuse / 1000) * 1000);
      if (fire) d.pw = false;
      if (d.fuse && now >= d.fuse) mcExplode(room, d, now);
    } else if (d.kind === 'miel') {
      for (const e of asym) {
        if (e.down || e.gone || e.corpse) continue;
        const yy = e.y || 0;
        if (Math.abs(e.x - d.x) > d.hx + 0.55 || Math.abs(e.z - d.z) > d.hz + 0.55 || yy < d.y0 - 0.4 || yy > d.y0 + d.h + 0.15) continue;
        Status.apply(e, 'slow', 400, now, { level: MC.honeyLevel });
        if (!e.onGround && e.velocityY < -MC.honeyFall) e.velocityY = -MC.honeyFall;
        if (now >= (d.cool || 0)) mcActivate(room, d, now);
      }
    } else if (d.kind === 'andamio' && now >= (d.cool || 0)) {
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
  return (room.gameState.dyn || []).map((d) => ({ id: d.id, k: d.kind, x: d.x, z: d.z, y: Math.round(d.y0 * 100) / 100, hx: d.hx, hz: d.hz, h: d.h, r: d.ramp || undefined, o: d.owner, st: mcStage(d, now), lit: d.pulse && now - d.pulse < 400 ? 1 : undefined, ra: d.r || undefined, dx: d.dx, dz: d.dz, dy: d.dy, ex: d.ext && d.ext > now ? 1 : undefined, fz: d.fuse ? Math.max(0, d.fuse - now) : undefined, ow: d.oneway ? 1 : undefined, sk: d.sticky ? 1 : undefined }));
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
        if (entity.input.slow) entity.velocityY = -4.5;
        else if ((entity.y || 0) < s.baseY + FLY_CEIL) entity.velocityY = Math.max(entity.velocityY, FLY_RISE * 0.8);
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

const API = {
  resetMatch, minceraftView, climb, MC, onStunned, evade, speedBonus, tax, DEFS, wpnActive: (e, now) => Boolean(e.sup && e.sup.wpnUntil > now), grant, use, claim, tick, view, gainMana, onModule, miss, withSource, scaleStun, scalePush, absorbHeal, domeBlocks, glide, domeRadius: DOME_RADIUS,
};
for (const k of Object.keys(API)) if (typeof API[k] === 'function' && !['grant', 'wpnActive'].includes(k)) API[k] = wrapCfg(API[k]);
API.grant = function grantCfg(entity, id, cfg) {
  const prev = CUR;
  CUR = cfg || null;
  try {
    return grant(entity, id, cfg);
  } finally {
    CUR = prev;
  }
};
module.exports = API;
