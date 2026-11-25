const { platformTop, baseAt, FOOTPRINT } = require('./Hitbox');

const CELL = 0.5;
const PAD = 0.5;
const STEP = 0.49;
const LEDGE = 1.0;
const HEAD = 1.8;
const K = 4;
const MAX_EXPANSIONS = 90000;
const WEIGHT = 1.8;
const RAMP_SLAB = 0.4;

function buildGrid(half, objects, platforms) {
  const n = Math.ceil((half * 2) / CELL);
  const cells = n * n;
  const ys = new Float32Array(cells * K).fill(NaN);
  const blocked = new Uint8Array(cells * K);
  const cnt = new Uint8Array(cells);
  const solid = platforms.filter((p) => p.kind !== 'pit');
  const ramps = solid.filter((p) => p.ramp);
  const gridOf = (x, z) => ({ i: Math.floor((x + half) / CELL), j: Math.floor((z + half) / CELL) });
  const buckets = new Map();
  const reach = 1.2;
  for (const p of solid) {
    const a = gridOf(p.x - p.hx - reach, p.z - p.hz - reach);
    const b = gridOf(p.x + p.hx + reach, p.z + p.hz + reach);
    for (let j = Math.max(0, a.j); j <= Math.min(n - 1, b.j); j++) {
      for (let i = Math.max(0, a.i); i <= Math.min(n - 1, b.i); i++) {
        const key = j * n + i;
        let arr = buckets.get(key);
        if (!arr) { arr = []; buckets.set(key, arr); }
        arr.push(p);
      }
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cell = j * n + i;
      const x = -half + (i + 0.5) * CELL;
      const z = -half + (j + 0.5) * CELL;
      const edge = i === 0 || j === 0 || i === n - 1 || j === n - 1 || Math.abs(x) > half - 0.6 || Math.abs(z) > half - 0.6;
      const near = buckets.get(cell) || [];
      const entries = [];
      for (const p of near) {
        let top = platformTop(p, x, z);
        if (p.ramp) {
          for (const [ox, oz] of FOOTPRINT) {
            const t = platformTop(p, x + ox, z + oz);
            if (t !== null && (top === null || t > top)) top = t;
          }
        }
        if (top === null) continue;
        const bottom = p.ramp || p.slab ? top - (p.slab || RAMP_SLAB) : (p.y0 || 0);
        entries.push({ top, bottom });
      }
      const cands = [baseAt(platforms, x, z)];
      for (const e of entries) cands.push(e.top);
      cands.sort((a, b) => a - b);
      let c = 0;
      let last = -Infinity;
      for (const y of cands) {
        if (y - last < 0.05) continue;
        last = y;
        let ok = !edge;
        let ceil = Infinity;
        for (const e of entries) {
          if (e.bottom < y - 0.05 && e.top > y + 0.05) { ok = false; break; }
          if (e.bottom >= y - 0.05 && e.top > y + 0.05 && e.bottom < ceil) ceil = e.bottom;
        }
        if (!ok || ceil - y < HEAD) continue;
        if (c >= K) break;
        ys[cell * K + c] = y;
        c++;
      }
      cnt[cell] = c;
    }
  }
  for (const o of objects) {
    if (!(o.height > STEP)) continue;
    const r = o.radius + PAD;
    const a = gridOf(o.x - r, o.z - r);
    const b = gridOf(o.x + r, o.z + r);
    for (let j = Math.max(0, a.j); j <= Math.min(n - 1, b.j); j++) {
      for (let i = Math.max(0, a.i); i <= Math.min(n - 1, b.i); i++) {
        const cell = j * n + i;
        const x = -half + (i + 0.5) * CELL;
        const z = -half + (j + 0.5) * CELL;
        if (Math.abs(x - o.x) > r || Math.abs(z - o.z) > r) continue;
        for (let l = 0; l < cnt[cell]; l++) if (ys[cell * K + l] < 0.5 + 1e-3 && ys[cell * K + l] > -6) blocked[cell * K + l] = 1;
      }
    }
  }
  const padded = blocked.slice();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const cell = j * n + i;
      for (let l = 0; l < cnt[cell]; l++) {
        const node = cell * K + l;
        if (padded[node]) continue;
        const y = ys[node];
        let bad = false;
        for (let dj = -2; dj <= 2 && !bad; dj++) {
          for (let di = -2; di <= 2; di++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
            const nc = nj * n + ni;
            let okN = false;
            for (let m = 0; m < cnt[nc]; m++) {
              if (Math.abs(ys[nc * K + m] - y) <= LEDGE) { okN = true; break; }
            }
            if (!okN) { bad = true; break; }
          }
        }
        if (bad) padded[node] = 1;
      }
    }
  }
  return { n, half, K, ys, cnt, blocked: padded };
}

function cellIdx(grid, x, z) {
  const i = Math.max(0, Math.min(grid.n - 1, Math.floor((x + grid.half) / CELL)));
  const j = Math.max(0, Math.min(grid.n - 1, Math.floor((z + grid.half) / CELL)));
  return j * grid.n + i;
}

function centerOfCell(grid, cell) {
  return { x: -grid.half + ((cell % grid.n) + 0.5) * CELL, z: -grid.half + (Math.floor(cell / grid.n) + 0.5) * CELL };
}

function nodeAtHeight(grid, cell, y) {
  let best = -1;
  let bd = Infinity;
  for (let l = 0; l < grid.cnt[cell]; l++) {
    const node = cell * grid.K + l;
    if (grid.blocked[node]) continue;
    const d = Math.abs(grid.ys[node] - y);
    if (d <= STEP && d < bd) { bd = d; best = node; }
  }
  return best;
}

function nearestNode(grid, x, z, y) {
  const c0 = cellIdx(grid, x, z);
  const i0 = c0 % grid.n;
  const j0 = Math.floor(c0 / grid.n);
  const hasY = typeof y === 'number';
  let best = -1;
  let bestScore = Infinity;
  let foundR = -1;
  for (let r = 0; r < 24; r++) {
    for (let j = j0 - r; j <= j0 + r; j++) {
      for (let i = i0 - r; i <= i0 + r; i++) {
        if (i < 0 || j < 0 || i >= grid.n || j >= grid.n) continue;
        if (r && Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r) continue;
        const cell = j * grid.n + i;
        for (let l = 0; l < grid.cnt[cell]; l++) {
          const node = cell * grid.K + l;
          if (grid.blocked[node]) continue;
          const dy = hasY ? Math.abs(grid.ys[node] - y) : Math.abs(grid.ys[node]) * 0.2;
          if (hasY && dy > 2.5) continue;
          const score = (i - i0) ** 2 + (j - j0) ** 2 + dy * dy * 4;
          if (score < bestScore) { bestScore = score; best = node; }
        }
      }
    }
    if (best >= 0 && foundR < 0) foundR = r;
    if (best >= 0 && r >= foundR + 1) break;
  }
  return best;
}

class Heap {
  constructor(cap = 4096) {
    this.keys = new Float64Array(cap);
    this.vals = new Int32Array(cap);
    this.size = 0;
  }
  clear() { this.size = 0; }
  grow() {
    const cap = this.keys.length * 2;
    const k = new Float64Array(cap);
    const v = new Int32Array(cap);
    k.set(this.keys);
    v.set(this.vals);
    this.keys = k;
    this.vals = v;
  }
  push(key, val) {
    if (this.size >= this.keys.length) this.grow();
    const keys = this.keys;
    const vals = this.vals;
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      keys[i] = keys[p];
      vals[i] = vals[p];
      i = p;
    }
    keys[i] = key;
    vals[i] = val;
  }
  pop() {
    const keys = this.keys;
    const vals = this.vals;
    const top = vals[0];
    const n = --this.size;
    if (n > 0) {
      const key = keys[n];
      const val = vals[n];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        if (l >= n) break;
        const r = l + 1;
        const m = r < n && keys[r] < keys[l] ? r : l;
        if (keys[m] >= key) break;
        keys[i] = keys[m];
        vals[i] = vals[m];
        i = m;
      }
      keys[i] = key;
      vals[i] = val;
    }
    return top;
  }
}

function neighbors(grid, node, di, dj) {
  const cell = Math.floor(node / grid.K);
  const ni = (cell % grid.n) + di;
  const nj = Math.floor(cell / grid.n) + dj;
  if (ni < 0 || nj < 0 || ni >= grid.n || nj >= grid.n) return [];
  const nc = nj * grid.n + ni;
  const y = grid.ys[node];
  const out = [];
  for (let l = 0; l < grid.cnt[nc]; l++) {
    const nn = nc * grid.K + l;
    if (!grid.blocked[nn] && Math.abs(grid.ys[nn] - y) <= STEP) out.push(nn);
  }
  return out;
}

function lineClear(grid, a, b) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(dist / (CELL * 0.5)));
  let y = a.y;
  let prev = cellIdx(grid, a.x, a.z);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const cur = cellIdx(grid, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    if (cur === prev) continue;
    const node = nodeAtHeight(grid, cur, y);
    if (node < 0) return false;
    y = grid.ys[node];
    prev = cur;
  }
  return Math.abs(y - b.y) <= STEP + 0.01;
}

const SCRATCHES = { sync: null, async: null };

function scratchFor(kind, total) {
  let sc = SCRATCHES[kind];
  if (!sc || sc.g.length < total) {
    sc = { g: new Float32Array(total), came: new Int32Array(total), mark: new Uint32Array(total), closed: new Uint32Array(total), heap: new Heap(), stamp: 0 };
    SCRATCHES[kind] = sc;
  }
  return sc;
}

class PathSearch {
  constructor(grid, from, to, kind = 'sync') {
    this.grid = grid;
    this.from = from;
    this.to = to;
    this.done = false;
    this.result = [];
    this.found = false;
    this.expansions = 0;
    const start = nearestNode(grid, from.x, from.z, from.y);
    const goal = nearestNode(grid, to.x, to.z, to.y);
    this.start = start;
    this.goal = goal;
    if (start < 0 || goal < 0) { this.done = true; return; }
    if (start === goal) { this.result = [{ x: to.x, y: grid.ys[goal], z: to.z }]; this.done = true; return; }
    const sc = scratchFor(kind, grid.n * grid.n * grid.K);
    sc.stamp++;
    this.sc = sc;
    this.stamp = sc.stamp;
    const gc = Math.floor(goal / grid.K);
    this.gi = gc % grid.n;
    this.gj = Math.floor(gc / grid.n);
    sc.heap.clear();
    sc.mark[start] = this.stamp;
    sc.g[start] = 0;
    sc.came[start] = -1;
    const h0 = this.heuristic(start);
    sc.heap.push(h0 * WEIGHT, start);
    this.best = start;
    this.bestH = h0;
  }

  heuristic(k) {
    const grid = this.grid;
    const c = Math.floor(k / grid.K);
    const dx = Math.abs((c % grid.n) - this.gi);
    const dz = Math.abs(Math.floor(c / grid.n) - this.gj);
    return dx > dz ? dx + 0.414 * dz : dz + 0.414 * dx;
  }

  step(maxExpansions) {
    if (this.done) return true;
    const grid = this.grid;
    const sc = this.sc;
    const stamp = this.stamp;
    if (sc.stamp !== stamp) { this.done = true; this.result = []; return true; }
    const gScore = sc.g;
    const came = sc.came;
    const mark = sc.mark;
    const closedArr = sc.closed;
    const heap = sc.heap;
    const goal = this.goal;
    const n = grid.n;
    const Kk = grid.K;
    let budget = maxExpansions;
    while (heap.size && this.expansions < MAX_EXPANSIONS && budget-- > 0) {
      const cur = heap.pop();
      if (closedArr[cur] === stamp) continue;
      closedArr[cur] = stamp;
      this.expansions++;
      const hc = this.heuristic(cur);
      if (hc < this.bestH) { this.bestH = hc; this.best = cur; }
      if (cur === goal) { this.found = true; break; }
      const cc = Math.floor(cur / Kk);
      const ci = cc % n;
      const cj = Math.floor(cc / n);
      const cy = grid.ys[cur];
      const gCur = gScore[cur];
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
          const nc = nj * n + ni;
          const diag = di && dj;
          for (let l = 0; l < grid.cnt[nc]; l++) {
            const nk = nc * Kk + l;
            if (grid.blocked[nk] || Math.abs(grid.ys[nk] - cy) > STEP || closedArr[nk] === stamp) continue;
            if (diag) {
              let okA = false;
              let okB = false;
              const ca = cj * n + ni;
              for (let m = 0; m < grid.cnt[ca]; m++) { const k2 = ca * Kk + m; if (!grid.blocked[k2] && Math.abs(grid.ys[k2] - cy) <= STEP && Math.abs(grid.ys[k2] - grid.ys[nk]) <= STEP) { okA = true; break; } }
              const cb = nj * n + ci;
              for (let m = 0; m < grid.cnt[cb]; m++) { const k2 = cb * Kk + m; if (!grid.blocked[k2] && Math.abs(grid.ys[k2] - cy) <= STEP && Math.abs(grid.ys[k2] - grid.ys[nk]) <= STEP) { okB = true; break; } }
              if (!okA || !okB) continue;
            }
            const g = gCur + (diag ? 1.414 : 1);
            if (mark[nk] !== stamp || g < gScore[nk]) {
              mark[nk] = stamp;
              gScore[nk] = g;
              came[nk] = cur;
              heap.push(g + this.heuristic(nk) * WEIGHT, nk);
            }
          }
        }
      }
    }
    if (!this.found && heap.size && this.expansions < MAX_EXPANSIONS) return false;
    this.finish();
    return true;
  }

  finish() {
    this.done = true;
    const grid = this.grid;
    const sc = this.sc;
    const stamp = this.stamp;
    const end = this.found ? this.goal : this.best;
    if (!this.found && end === this.start) { this.result = []; return; }
    const nodes = [];
    for (let k = end; k !== -1; k = sc.mark[k] === stamp ? sc.came[k] : -1) nodes.push(k);
    nodes.reverse();
    const points = nodes.map((k) => ({ ...centerOfCell(grid, Math.floor(k / grid.K)), y: grid.ys[k] }));
    points[0] = { x: this.from.x, z: this.from.z, y: grid.ys[this.start] };
    const out = [];
    let anchor = 0;
    while (anchor < points.length - 1) {
      let far = anchor + 1;
      for (let k = points.length - 1; k > anchor + 1; k--) {
        if (lineClear(grid, points[anchor], points[k])) { far = k; break; }
      }
      out.push(points[far]);
      anchor = far;
    }
    if (this.found && out.length) out[out.length - 1] = { x: this.to.x, z: this.to.z, y: out[out.length - 1].y };
    this.result = out;
  }
}

function findPath(grid, from, to) {
  const job = new PathSearch(grid, from, to, 'sync');
  job.step(Infinity);
  return job.result;
}

const queue = [];
let active = null;

function requestPath(grid, from, to, cb) {
  const job = { grid, from, to, cb, cancelled: false, search: null };
  queue.push(job);
  return job;
}

function cancelPath(job) {
  if (job) job.cancelled = true;
}

function pumpPaths(maxMs, now = () => Number(process.hrtime.bigint()) / 1e6) {
  const t0 = now();
  let guard = 0;
  while (guard++ < 64) {
    if (!active) {
      while (queue.length && queue[0].cancelled) queue.shift();
      if (!queue.length) return;
      active = queue.shift();
      active.search = new PathSearch(active.grid, active.from, active.to, 'async');
    }
    if (active.cancelled) { active = null; continue; }
    const done = active.search.step(1500);
    if (done) {
      const job = active;
      active = null;
      job.cb(job.search.result);
    }
    if (now() - t0 >= maxMs) return;
  }
}

function pendingPaths() {
  return queue.length + (active ? 1 : 0);
}

function reachableFrom(grid, from) {
  const seen = new Uint8Array(grid.n * grid.n * grid.K);
  const start = nearestNode(grid, from.x, from.z, from.y);
  if (start < 0) return seen;
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const cur = stack.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (const nk of neighbors(grid, cur, di, dj)) {
        if (!seen[nk]) { seen[nk] = 1; stack.push(nk); }
      }
    }
  }
  return seen;
}

function isReachableNear(grid, seen, x, z, cells = 2, y) {
  const c = cellIdx(grid, x, z);
  const ci = c % grid.n;
  const cj = Math.floor(c / grid.n);
  for (let dj = -cells; dj <= cells; dj++) {
    for (let di = -cells; di <= cells; di++) {
      const ni = ci + di;
      const nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= grid.n || nj >= grid.n) continue;
      const nc = nj * grid.n + ni;
      for (let l = 0; l < grid.cnt[nc]; l++) {
        const node = nc * grid.K + l;
        if (seen[node] && (typeof y !== 'number' || Math.abs(grid.ys[node] - y) <= 1)) return true;
      }
    }
  }
  return false;
}

module.exports = { buildGrid, findPath, requestPath, cancelPath, pumpPaths, pendingPaths, PathSearch, lineClear, reachableFrom, isReachableNear };
