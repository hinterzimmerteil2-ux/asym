const HALF = 80;
const F2 = 7.5;
const F3 = 15;
const ROOF = 22.5;
const WALL_H = 7.1;
const DOOR_WEIGHTS = [['open', 5], ['gate', 3], ['pgate', 1]];

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(seed, REF_HALF, sanitizeEvents) {
  const r = makeRng(seed);
  const rnd = (a, b) => a + r() * (b - a);
  const pick = (list) => list[Math.floor(r() * list.length)];
  const weighted = (pairs) => {
    const total = pairs.reduce((s, [, w]) => s + w, 0);
    let roll = r() * total;
    for (const [v, w] of pairs) {
      roll -= w;
      if (roll <= 0) return v;
    }
    return pairs[0][0];
  };

  const platforms = [];
  const collisionObjects = [];
  const selfDamageObjects = [];
  const serums = [];
  const plat = (id, x, z, hx, hz, h, ramp, kind, extra) =>
    platforms.push({ id, xFrac: x / HALF, zFrac: z / HALF, hxFrac: hx / REF_HALF, hzFrac: hz / REF_HALF, h, ramp: ramp || null, kind, ...(extra || {}) });
  const radii = { gurney: 0.04, shelf: 0.05, cart: 0.03, pillar: 0.033, bed: 0.045, vending: 0.03, mri: 0.08, wheelchair: 0.025, iv: 0.015, desk: 0.04, crate: 0.035, tank: 0.04, plant: 0.02 };
  let colN = 0;
  const col = (type, x, z) => collisionObjects.push({ id: `c${colN++}`, type, xFrac: x / HALF, zFrac: z / HALF, radiusFrac: radii[type] });
  let sdN = 0;
  const sd = (x, z, y) => selfDamageObjects.push({ id: `m${sdN++}`, xFrac: x / HALF, zFrac: z / HALF, y: y || 0 });
  const slab = (id, x, z, hx, hz, top) => plat(id, x, z, hx, hz, top, null, 'mezzanine', { slab: 0.4 });
  const wallSeg = (id, x, z, hx, hz, y0) => plat(id, x, z, hx, hz, WALL_H, null, 'wall', y0 ? { y0 } : {});
  const hallWall = (idp, z, gaps, y0) => {
    let x = -40;
    gaps.forEach(([a, b], i) => {
      if (a > x) wallSeg(`${idp}_${i}`, (x + a) / 2, z, (a - x) / 2, 0.5, y0);
      x = b;
    });
    if (x < 40) wallSeg(`${idp}_e`, (x + 40) / 2, z, (40 - x) / 2, 0.5, y0);
  };

  plat('w_n', 0, -32, 40, 0.5, 24, null, 'wall');
  plat('w_s', 0, 32, 40, 0.5, 24, null, 'wall');
  plat('w_w', -40, 0, 0.5, 32, 24, null, 'wall');
  plat('w_e', 40, 0, 0.5, 32, 24, null, 'wall');

  [[F2, 'f2'], [F3, 'f3'], [ROOF, 'rf']].forEach(([top, p]) => {
    slab(`${p}_n`, 0, -22, 40, 10, top);
    slab(`${p}_s`, 0, 22, 40, 10, top);
  });
  slab('f2_e1', 12, 0, 2, 12, F2); slab('f2_e2', 23, 3, 9, 9, F2); slab('f2_e3', 36, 0, 4, 12, F2);
  slab('f2_w1', -12, 0, 2, 12, F2); slab('f2_w2', -23, -3, 9, 9, F2); slab('f2_w3', -36, 0, 4, 12, F2);
  slab('f3_e1', 12, 0, 2, 12, F3); slab('f3_e2', 23, -3, 9, 9, F3); slab('f3_e3', 36, 0, 4, 12, F3);
  slab('f3_w1', -12, 0, 2, 12, F3); slab('f3_w2', -23, 3, 9, 9, F3); slab('f3_w3', -36, 0, 4, 12, F3);
  slab('rf_e1', 12, 0, 2, 12, ROOF); slab('rf_e2', 23, 3, 9, 9, ROOF); slab('rf_e3', 36, 0, 4, 12, ROOF);
  slab('rf_w1', -12, 0, 2, 12, ROOF); slab('rf_w2', -23, 0, 9, 12, ROOF); slab('rf_w3', -36, 0, 4, 12, ROOF);

  plat('stA_e', 25, -9, 7, 2.5, F2, '+x', 'ramp', { stairs: true });
  plat('stB_e', 25, 9, 7, 2.5, F2, '+x', 'ramp', { y0: F2, stairs: true });
  plat('stC_e', 25, -9, 7, 2.5, F2, '+x', 'ramp', { y0: F3, stairs: true });
  plat('stA_w', -25, 9, 7, 2.5, F2, '-x', 'ramp', { stairs: true });
  plat('stB_w', -25, -9, 7, 2.5, F2, '-x', 'ramp', { y0: F2, stairs: true });

  plat('pit_c', 0, 0, 10, 7, 4.5, null, 'pit');
  plat('pit_wr', -16, 0, 6, 2.5, 4.5, '-x', 'pit');
  plat('pit_er', 16, 0, 6, 2.5, 4.5, '+x', 'pit');

  const bed = (id, x, z, y0) => {
    plat(`${id}_a`, x, z, 1, 0.5, 0.8, null, null, { y0 });
    plat(`${id}_b`, x - 0.95, z, 0.08, 0.5, 1.4, null, null, { y0 });
  };
  const table = (id, x, z, y0) => plat(id, x, z, 1.2, 0.6, 1, null, null, { y0 });
  const counter = (id, x, z, hx, hz, y0) => plat(id, x, z, hx, hz, 1.1, null, null, { y0 });

  const floors = [0, F2, F3];
  const roomsByFloor = [];
  const doorCount = { open: 0, gate: 0, pgate: 0 };

  floors.forEach((y0, f) => {
    const t = f + 1;
    const rooms = [];
    [-1, 1].forEach((s) => {
      const row = s < 0 ? 'n' : 's';
      const n0 = pick([3, 4, 4, 5]);
      const w = 80 / n0;
      const bounds = [-40];
      for (let i = 1; i < n0; i++) {
        const j = Math.min(2.5, (w - 13) / 2);
        bounds.push(-40 + i * w + rnd(-j, j));
      }
      bounds.push(40);
      const slots = [-35.8, -14, 14, 35.8];
      if (f === 0) slots.push(s < 0 ? -24 : 24);
      for (let i = 1; i < bounds.length - 1; i++) {
        slots.forEach((slot) => {
          if (Math.abs(bounds[i] - slot) < 3.9) bounds[i] = bounds[i] < slot ? slot - 3.9 : slot + 3.9;
        });
      }
      for (let i = bounds.length - 2; i >= 1; i--) {
        if (bounds[i] - bounds[i - 1] < 10 || bounds[i + 1] - bounds[i] < 10) bounds.splice(i, 1);
      }
      const n = bounds.length - 1;
      const roomDoors = Array.from({ length: n }, () => []);
      slots.forEach((slot) => {
        const cx = slot + rnd(-0.4, 0.4);
        for (let i = 0; i < n; i++) {
          if (cx - 3 >= bounds[i] + 0.7 && cx + 3 <= bounds[i + 1] - 0.7) roomDoors[i].push(cx);
        }
      });
      const boundaryOpen = new Array(n + 1).fill(false);
      const access = roomDoors.map((d) => d.length > 0);
      for (let i = 0; i < n; i++) {
        if (access[i]) continue;
        let best = -1;
        for (let j = 0; j < n; j++) if (access[j] && (best < 0 || Math.abs(j - i) < Math.abs(best - i))) best = j;
        if (best < 0) continue;
        const [lo, hi] = i < best ? [i + 1, best] : [best + 1, i];
        for (let k = lo; k <= hi; k++) boundaryOpen[k] = true;
        for (let k = Math.min(i, best); k <= Math.max(i, best); k++) access[k] = true;
      }
      const hallGaps = [];
      const roomList = [];
      for (let i = 0; i < n; i++) {
        roomDoors[i].forEach((cx, di) => {
          const type = di === 0 ? 'open' : weighted(DOOR_WEIGHTS);
          doorCount[type]++;
          hallGaps.push([cx - 3, cx + 3, type, `${row}${t}_${i}_${di}`]);
        });
        roomList.push({ xa: bounds[i], xb: bounds[i + 1], cx: (bounds[i] + bounds[i + 1]) / 2, s, row });
      }
      hallGaps.sort((a, b) => a[0] - b[0]);
      hallWall(`wh_${row}${t}`, s * 12, hallGaps.map(([a, b]) => [a, b]), y0);
      hallGaps.forEach(([a, b, type, key]) => {
        if (type !== 'open') plat(`dgh_${key}`, (a + b) / 2, s * 12, 3, 0.35, WALL_H, null, type, y0 ? { y0 } : {});
      });
      for (let i = 1; i < n; i++) {
        const bx = bounds[i];
        const zlo = s < 0 ? -32 : 12;
        const zhi = s < 0 ? -12 : 32;
        if (boundaryOpen[i] || r() < 0.55) {
          const zc = s * rnd(16, 24);
          const type = boundaryOpen[i] ? 'open' : weighted(DOOR_WEIGHTS);
          doorCount[type]++;
          wallSeg(`wi_${row}${t}_${i}a`, bx, (zlo + zc - 2.5) / 2, 0.5, (zc - 2.5 - zlo) / 2 > 0 ? Math.abs(zc - 2.5 - zlo) / 2 : 0.1, y0);
          wallSeg(`wi_${row}${t}_${i}b`, bx, (zc + 2.5 + zhi) / 2, 0.5, Math.abs(zhi - zc - 2.5) / 2, y0);
          if (type !== 'open') plat(`dgi_${row}${t}_${i}`, bx, zc, 0.35, 2.5, WALL_H, null, type, y0 ? { y0 } : {});
        } else {
          wallSeg(`wi_${row}${t}_${i}`, bx, (zlo + zhi) / 2, 0.5, 10, y0);
        }
      }
      rooms.push(...roomList);
    });
    roomsByFloor.push(rooms);
  });

  const kinds = [['ward', 4], ['op', 2], ['office', 2], ['storage', 2]];
  floors.forEach((y0, f) => {
    roomsByFloor[f].forEach((room, ri) => {
      const kind = weighted(kinds);
      room.kind = kind;
      const s = room.s;
      const id = `${f}${room.row}${ri}`;
      const far = s * 28;
      const mid = s * 22;
      if (f === 0) {
        const types = { ward: ['bed', 'iv', 'wheelchair'], op: ['mri', 'iv', 'cart'], office: ['desk', 'plant', 'desk'], storage: ['shelf', 'crate', 'tank'] }[kind];
        let k = 0;
        for (let x = room.xa + 4; x <= room.xb - 4; x += kind === 'op' ? 9 : 6.5) {
          col(types[k % types.length], x, s * 27.5);
          k++;
        }
        return;
      }
      if (kind === 'ward') {
        for (let x = room.xa + 3.5, i = 0; x <= room.xb - 3.5; x += 8, i++) bed(`b${id}_${i}`, x, far, y0);
      } else if (kind === 'op') {
        table(`t${id}`, room.cx, mid, y0);
        counter(`c${id}`, room.xa + 4, far, 1.5, 0.5, y0);
      } else if (kind === 'office') {
        counter(`d${id}a`, room.cx - 4, far, 2, 0.5, y0);
        counter(`d${id}b`, room.cx + 4, far, 2, 0.5, y0);
        table(`t${id}`, room.cx, mid, y0);
      } else {
        for (let x = room.xa + 4, i = 0; x <= room.xb - 4; x += 6, i++) counter(`s${id}_${i}`, x, far, 1.5, 0.5, y0);
      }
    });
  });

  counter('nurse_a', -8, 0, 3, 0.5, F2);
  counter('nurse_b', 8, 0, 3, 0.5, F2);
  counter('f3_desk', 0, -8, 4, 0.5, F3);

  [[-14, -26], [14, 26], [-30, 26], [30, -26], [0, 26], [0, -26]].forEach(([x, z], i) => {
    plat(`hvac${i}`, x, z, 2.2, 1.4, 1.6, null, null, { y0: ROOF });
  });
  plat('heli', 34, 6, 4, 4, 0.1, null, null, { y0: ROOF });
  plat('roof_tank_a', -34, 20, 2, 2, 3, null, null, { y0: ROOF });
  plat('roof_tank_b', -34, -20, 2, 2, 3, null, null, { y0: ROOF });

  col('vending', -37, 10); col('vending', 37, -10); col('wheelchair', 30, 3); col('wheelchair', -30, -3);
  col('desk', -15, 8); col('desk', 15, -8); col('plant', -12, 11); col('plant', 12, -11);
  col('bed', -6, -5); col('bed', 6, -5); col('bed', -6, 5); col('tank', 7, -5); col('tank', -7, 5); col('iv', 0, -5); col('crate', 2, -2); col('iv', 4, 5);
  [[-45, 0], [45, 0], [0, 45], [-45, -20], [45, 20], [20, 45], [-20, 45], [0, -45]].forEach(([x, z], i) => col(i % 2 ? 'crate' : 'cart', x, z));

  floors.forEach((y0, f) => {
    const list = [...roomsByFloor[f]].sort(() => r() - 0.5).slice(0, 3);
    list.forEach((room) => sd(room.cx + 4.5, room.s * 19, y0));
  });
  [[-26, 6], [26, -6]].forEach(([x, z]) => sd(x, z, 0));
  [[-26, 6], [26, 6]].forEach(([x, z]) => sd(x, z, F2));
  [[-26, -6], [26, -6]].forEach(([x, z]) => sd(x, z, F3));
  [[-26, -22], [26, 22]].forEach(([x, z]) => sd(x, z, ROOF));
  [[-6, 0], [6, 3], [0, -5]].forEach(([x, z]) => sd(x, z, -4.5));

  const roomSerum = (f, id) => {
    const room = pick(roomsByFloor[f]);
    serums.push({ id, xFrac: (room.cx - 3) / HALF, zFrac: (room.s * 24) / HALF, y: floors[f] });
  };
  serums.push({ id: 'su_0', xFrac: 0, zFrac: 4 / HALF, y: -4.5 });
  roomSerum(0, 'su_1');
  roomSerum(0, 'su_2');
  serums.push({ id: 'su_3', xFrac: -24 / HALF, zFrac: 0, y: F2 });
  serums.push({ id: 'su_4', xFrac: 24 / HALF, zFrac: 0, y: F3 });
  roomSerum(1, 'su_5');
  roomSerum(2, 'su_6');

  const events = sanitizeEvents([
    { id: 'ev_blackout_base', kind: 'blackout', startSec: 60, warnSec: 8, durSec: 90, repeatSec: 100, rFrac: 0, yMax: -0.5 },
    { id: 'ev_alarm', kind: 'alarm', startSec: 130, warnSec: 6, durSec: 15, repeatSec: 140 },
    { id: 'ev_shuffle', kind: 'shuffle', startSec: 120, warnSec: 5, durSec: 1, repeatSec: 120 },
    { id: 'ev_collapse_1', kind: 'collapse', targetId: 'stB_w', startSec: 75, warnSec: 8, durSec: 40, repeatSec: 130 },
    { id: 'ev_collapse_2', kind: 'collapse', targetId: 'stC_e', startSec: 150, warnSec: 8, durSec: 45, repeatSec: 120 },
  ]);

  const patientSpawns = [[-55, -20], [55, 20], [-55, 20], [55, -20], [-30, 50], [30, -50], [30, 50], [-30, -50], [0, 55], [0, -55], [-55, 0], [55, 0]].map(([x, z]) => ({ xFrac: x / HALF, zFrac: z / HALF }));
  const curatorSpawns = [[-26, 3], [26, -3]].map(([x, z]) => ({ xFrac: x / HALF, zFrac: z / HALF }));
  return { id: 'general', name: 'Hospital aleatorio', halfSize: HALF, selfDamageObjects, collisionObjects, platforms, events, serums, patientSpawns, curatorSpawns, doorCount, rooms: roomsByFloor.map((l) => l.map(({ xa, xb, s: sg }) => ({ xa, xb, s: sg }))) };
}

module.exports = { build };
