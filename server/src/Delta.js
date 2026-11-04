const MAPS = new Set(['entities', 'ghosts', 'flojera']);
const KEYFRAME = 40;

function diff(player, snap, tick) {
  const prev = player.snapCache;
  const cache = { maps: {}, vals: {} };
  const full = !prev || tick < (player.snapKey || 0) || tick - (player.snapKey || 0) >= KEYFRAME;
  const out = {};
  for (const k of Object.keys(snap)) {
    const v = snap[k];
    if (MAPS.has(k) && v && typeof v === 'object') {
      const strs = {};
      for (const id of Object.keys(v)) strs[id] = JSON.stringify(v[id]);
      cache.maps[k] = strs;
      if (full) { out[k] = v; continue; }
      const old = prev.maps[k] || {};
      const ch = {};
      let any = false;
      for (const id of Object.keys(strs)) if (old[id] !== strs[id]) { ch[id] = v[id]; any = true; }
      const rm = Object.keys(old).filter((id) => !(id in strs));
      if (any) out[k] = ch;
      if (rm.length) (out.rm || (out.rm = {}))[k] = rm;
    } else {
      const s = JSON.stringify(v === undefined ? null : v);
      cache.vals[k] = s;
      if (full || prev.vals[k] !== s) out[k] = v;
    }
  }
  if (full) player.snapKey = tick;
  player.snapCache = cache;
  out.delta = !full;
  return out;
}

function reset(player) {
  player.snapCache = null;
}

module.exports = { diff, reset };
