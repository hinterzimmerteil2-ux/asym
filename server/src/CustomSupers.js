const SPEC = {
  minceraft: {
    max: [8, 256, 64],
    lifeSec: [3, 60, 12],
    pistonPush: [4, 40, 14],
    pistonLifeSec: [2, 30, 6],
    tntDmg: [0, 100, 6],
    tntFuseSec: [0.3, 5, 1.4],
    tntR: [1, 12, 3.6],
    slimeV: [4, 30, 11],
  },
  town_level: {
    shotAmmo: [2, 30, 8],
    shotRange: [4, 40, 14],
    recoilMiss: [0, 60, 21],
    recoilHit: [0, 30, 4.5],
    slideSpeed: [8, 80, 32],
    slideMs: [150, 1200, 450],
    reloadTacticalMs: [300, 5000, 1300],
    reloadEmptyMs: [300, 6000, 1900],
  },
  platinum_star: {
    rhythmMax: [50, 300, 100],
    formDrain: [0, 30, 2],
    formMiss: [0, 40, 8],
    stellarRange: [4, 60, 24],
    throwMin: [0, 30, 7],
    throwMax: [0, 80, 28],
    throwRagMin: [0, 6000, 800],
    throwRagMax: [0, 8000, 2400],
  },
  sunat_paperwork: {
    taxNeed: [30, 400, 118],
    padEveryMs: [3000, 120000, 18000],
    padLagMs: [200, 5000, 900],
    fineMs: [3000, 60000, 12000],
  },
};

function sanitize(raw) {
  const enabled = {};
  const tune = {};
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const id of Object.keys(SPEC)) {
    enabled[id] = !(src.enabled && src.enabled[id] === false);
    const t = src.tune && src.tune[id];
    if (!t || typeof t !== 'object') continue;
    const out = {};
    for (const [key, [lo, hi]] of Object.entries(SPEC[id])) {
      const n = Number(t[key]);
      if (t[key] !== undefined && Number.isFinite(n)) out[key] = Math.round(Math.max(lo, Math.min(hi, n)) * 100) / 100;
    }
    if (Object.keys(out).length) tune[id] = out;
  }
  return { enabled, tune };
}

module.exports = { SPEC, sanitize };
