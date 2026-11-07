const HALF = 80;
const F2 = 7.5;
const F3 = 15;
const ROOF = 22.5;
const WALL_H = 7.1;
const N_DOORS = [-30, -10, 10, 30];
const S_DOORS = [-30, -12.5, 12.5, 30];
const N_ROOMS = [-30, -10, 10, 30];
const S_ROOMS = [-30, -12.5, 12.5, 30];

function build(REF_HALF, sanitizeEvents) {
  const platforms = [];
  const collisionObjects = [];
  const selfDamageObjects = [];
  const serums = [];
  const plat = (id, x, z, hx, hz, h, ramp, kind, extra) =>
    platforms.push({ id, xFrac: x / HALF, zFrac: z / HALF, hxFrac: hx / REF_HALF, hzFrac: hz / REF_HALF, h, ramp: ramp || null, kind, ...(extra || {}) });
  const radii = { gurney: 0.04, shelf: 0.05, cart: 0.03, pillar: 0.033, bed: 0.045, vending: 0.03, mri: 0.08, wheelchair: 0.025, iv: 0.015, desk: 0.04, crate: 0.035, tank: 0.03, plant: 0.025 };
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
  const doors = (cs) => cs.map((c) => [c - 3, c + 3]);

  plat('w_n', 0, -32, 40, 0.5, 24, null, 'wall');
  plat('w_w', -40, 0, 0.5, 32, 24, null, 'wall');
  plat('w_e', 40, 0, 0.5, 32, 24, null, 'wall');
  plat('w_s1', -22.5, 32, 17.5, 0.5, 24, null, 'wall');
  plat('w_s2', 22.5, 32, 17.5, 0.5, 24, null, 'wall');

  [0, F2, F3].forEach((y0, f) => {
    const t = f + 1;
    hallWall(`wh_n${t}`, -12, doors(N_DOORS), y0);
    hallWall(`wh_s${t}`, 12, [...doors([-30, -12.5]), [-5, 5], ...doors([12.5, 30])].sort((a, b) => a[0] - b[0]), y0);
    [-20, 0, 20].forEach((x, i) => wallSeg(`wd_n${t}_${i}`, x, -22, 0.5, 10, y0));
    [-20, 20].forEach((x, i) => wallSeg(`wd_s${t}_${i}`, x, 22, 0.5, 10, y0));
    [-5, 5].forEach((x, i) => {
      wallSeg(`wd_sa${t}_${i}`, x, 14.5, 0.5, 2.5, y0);
      wallSeg(`wd_sb${t}_${i}`, x, 27.5, 0.5, 4.5, y0);
      const kind = i === 1 ? 'pgate' : t === 3 ? 'gate' : null;
      if (kind) plat(`dg_${t}_${i}`, x, 20, 0.3, 3, WALL_H, null, kind, y0 ? { y0 } : {});
    });
  });

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

  const bed = (id, x, z, y0, rot) => {
    const hx = rot ? 0.5 : 1;
    const hz = rot ? 1 : 0.5;
    plat(`${id}_a`, x, z, hx, hz, 0.8, null, null, { y0 });
    plat(`${id}_b`, rot ? x : x - 0.95, rot ? z - 0.95 : z, rot ? 0.5 : 0.08, rot ? 0.08 : 0.5, 1.4, null, null, { y0 });
  };
  const table = (id, x, z, y0) => plat(id, x, z, 1.2, 0.6, 1, null, null, { y0 });
  const counter = (id, x, z, hx, hz, y0) => plat(id, x, z, hx, hz, 1.1, null, null, { y0 });

  [F2].forEach((y0) => {
    [...N_ROOMS].forEach((cx, i) => { bed(`bf2n${i}a`, cx - 4, -28, y0); bed(`bf2n${i}b`, cx + 4, -28, y0); bed(`bf2n${i}c`, cx - 7, -18, y0, true); });
    [...S_ROOMS].forEach((cx, i) => { bed(`bf2s${i}a`, cx - 4, 28, y0); bed(`bf2s${i}b`, cx + 4, 28, y0); bed(`bf2s${i}c`, cx + 7, 18, y0, true); });
    counter('nurse_a', -8, 0, 3, 0.5, y0);
    counter('nurse_b', 8, 0, 3, 0.5, y0);
  });
  [F3].forEach((y0) => {
    [-30, -10].forEach((cx, i) => { table(`opn${i}`, cx, -22, y0); counter(`opc${i}`, cx - 8, -28, 1.5, 0.5, y0); });
    [10, 30].forEach((cx, i) => { bed(`icu_n${i}a`, cx - 4, -28, y0); bed(`icu_n${i}b`, cx + 4, -28, y0); bed(`icu_n${i}c`, cx, -18, y0); });
    [-30, -12.5].forEach((cx, i) => { table(`ops${i}`, cx, 22, y0); counter(`opsc${i}`, cx + 8, 28, 1.5, 0.5, y0); });
    [12.5, 30].forEach((cx, i) => { bed(`icu_s${i}a`, cx - 4, 28, y0); bed(`icu_s${i}b`, cx + 4, 28, y0); bed(`icu_s${i}c`, cx, 18, y0); });
    counter('f3_desk', 0, -8, 4, 0.5, y0);
  });
  [[-14, -26], [14, 26], [-30, 26], [30, -26], [0, 26], [0, -26]].forEach(([x, z], i) => {
    plat(`hvac${i}`, x, z, 2.2, 1.4, 1.6, null, null, { y0: ROOF });
  });
  plat('heli', 34, 6, 4, 4, 0.1, null, null, { y0: ROOF });
  plat('roof_tank_a', -34, 20, 2, 2, 3, null, null, { y0: ROOF });
  plat('roof_tank_b', -34, -20, 2, 2, 3, null, null, { y0: ROOF });

  col('bed', -35, -27); col('bed', -27, -27); col('iv', -31, -27); col('wheelchair', -37, -17);
  col('mri', -10, -26); col('iv', -17, -26); col('iv', -3, -26);
  col('desk', 6, -27); col('desk', 14, -27); col('cart', 4, -18); col('tank', 16, -18);
  col('shelf', 24, -27); col('shelf', 30, -28); col('shelf', 36, -27); col('crate', 36, -18);
  col('crate', -37, 27); col('crate', -33, 27); col('tank', -24, 27); col('cart', -37, 18);
  col('shelf', -18, 27); col('shelf', -12, 28); col('shelf', -8, 27); col('crate', -17, 17);
  col('desk', 8, 24); col('desk', 12, 24); col('desk', 16, 24); col('plant', 17, 17);
  col('cart', 25, 27); col('cart', 35, 27); col('tank', 36, 17);
  col('vending', -37, 10); col('vending', 37, -10); col('wheelchair', 30, 3); col('wheelchair', -30, -3);
  col('desk', -15, 8); col('desk', 15, -8); col('plant', -12, 11); col('plant', 12, -11);
  col('bed', -6, -5); col('bed', 6, -5); col('bed', -6, 5); col('tank', 7, -5); col('tank', -7, 5); col('iv', 0, -5); col('crate', 2, -2); col('iv', 4, 5);
  [[-45, 0], [45, 0], [0, 45], [-45, -20], [45, 20], [20, 45], [-20, 45], [0, -45]].forEach(([x, z], i) => col(i % 2 ? 'crate' : 'cart', x, z));

  [[-30, -22], [-10, -22], [10, -22], [30, -22], [-30, 22], [-12.5, 22], [12.5, 22], [30, 22], [-26, 6], [26, -6]].forEach(([x, z]) => sd(x, z, 0));
  [[-30, -24], [10, -24], [-30, 24], [30, 24], [-26, 6], [26, 6]].forEach(([x, z]) => sd(x, z, F2));
  [[-10, -24], [30, -24], [-12.5, 24], [30, 24], [-26, -6], [26, -6]].forEach(([x, z]) => sd(x, z, F3));
  [[-26, -22], [26, 22]].forEach(([x, z]) => sd(x, z, ROOF));
  [[-6, 0], [6, 3], [0, -5]].forEach(([x, z]) => sd(x, z, -4.5));

  serums.push(
    { id: 'su_0', xFrac: 0, zFrac: 4 / HALF, y: -4.5 },
    { id: 'su_1', xFrac: -24 / HALF, zFrac: -22 / HALF, y: 0 },
    { id: 'su_2', xFrac: 24 / HALF, zFrac: 22 / HALF, y: 0 },
    { id: 'su_3', xFrac: -24 / HALF, zFrac: 0, y: F2 },
    { id: 'su_4', xFrac: 24 / HALF, zFrac: 0, y: F3 },
    { id: 'su_5', xFrac: 0, zFrac: 24 / HALF, y: F2 },
    { id: 'su_6', xFrac: 0, zFrac: -24 / HALF, y: F3 },
  );

  const events = sanitizeEvents([
    { id: 'ev_blackout_base', kind: 'blackout', startSec: 60, warnSec: 8, durSec: 90, repeatSec: 100, rFrac: 0, yMax: -0.5 },
    { id: 'ev_alarm', kind: 'alarm', startSec: 130, warnSec: 6, durSec: 15, repeatSec: 140 },
    { id: 'ev_shuffle', kind: 'shuffle', startSec: 120, warnSec: 5, durSec: 1, repeatSec: 120 },
    { id: 'ev_collapse_1', kind: 'collapse', targetId: 'stB_w', startSec: 75, warnSec: 8, durSec: 40, repeatSec: 130 },
    { id: 'ev_collapse_2', kind: 'collapse', targetId: 'stC_e', startSec: 150, warnSec: 8, durSec: 45, repeatSec: 120 },
  ]);

  const patientSpawns = [[-55, -20], [55, 20], [-55, 20], [55, -20], [-30, 50], [30, -50], [30, 50], [-30, -50], [0, 55], [0, -55], [-55, 0], [55, 0]].map(([x, z]) => ({ xFrac: x / HALF, zFrac: z / HALF }));
  const curatorSpawns = [[-26, 3], [26, -3]].map(([x, z]) => ({ xFrac: x / HALF, zFrac: z / HALF }));
  return { id: 'general', name: 'Hospital General (3 pisos, sótano y azotea)', halfSize: HALF, selfDamageObjects, collisionObjects, platforms, events, serums, patientSpawns, curatorSpawns };
}

module.exports = { build };
