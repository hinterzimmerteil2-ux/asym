const { platformTop } = require('./Hitbox');

const CELL = 0.5;
const PAD = 0.5;
const STEP = 0.45;
const MAX_EXPANSIONS = 8000;

function buildGrid(half, objects, platforms) {
  const n = Math.ceil((half * 2) / CELL);
  const h = new Float32Array(n * n);
  const blocked = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -half + (i + 0.5) * CELL;
      const z = -half + (j + 0.5) * CELL;
      const idx = j * n + i;
      let top = 0;
      for (const p of platforms) {
        const t = platformTop(p, x, z);
        if (t !== null && t > top) top = t;
      }
      h[idx] = top;
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1 || Math.abs(x) > half - 0.6 || Math.abs(z) > half - 0.6) blocked[idx] = 1;
      for (const o of objects) {
        if (o.height > STEP && Math.abs(x - o.x) <= o.radius + PAD && Math.abs(z - o.z) <= o.radius + PAD) {
          blocked[idx] = 1;
          break;
        }
      }
    }
  }
  const padded = blocked.slice();
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const idx = j * n + i;
      if (padded[idx]) continue;
      for (let dj = -2; dj <= 2 && !padded[idx]; dj++) {
        for (let di = -2; di <= 2; di++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
          if (Math.abs(h[nj * n + ni] - h[idx]) > STEP) { padded[idx] = 1; break; }
        }
      }
    }
  }
  return { n, half, h, blocked: padded };
}

function cellOf(grid, x, z) {
  const i = Math.max(0, Math.min(grid.n - 1, Math.floor((x + grid.half) / CELL)));
  const j = Math.max(0, Math.min(grid.n - 1, Math.floor((z + grid.half) / CELL)));
  return j * grid.n + i;
}

function centerOf(grid, idx) {
  const i = idx % grid.n;
  const j = Math.floor(idx / grid.n);
  return { x: -grid.half + (i + 0.5) * CELL, z: -grid.half + (j + 0.5) * CELL };
}

function nearestFree(grid, idx) {
  if (!grid.blocked[idx]) return idx;
  const i0 = idx % grid.n;
  const j0 = Math.floor(idx / grid.n);
  for (let r = 1; r < 14; r++) {
    let best = -1;
    let bestD = Infinity;
    for (let j = j0 - r; j <= j0 + r; j++) {
      for (let i = i0 - r; i <= i0 + r; i++) {
        if (i < 0 || j < 0 || i >= grid.n || j >= grid.n) continue;
        if (Math.max(Math.abs(i - i0), Math.abs(j - j0)) !== r) continue;
        const k = j * grid.n + i;
        const d = (i - i0) ** 2 + (j - j0) ** 2;
        if (!grid.blocked[k] && d < bestD) { bestD = d; best = k; }
      }
    }
    if (best >= 0) return best;
  }
  return idx;
}

class Heap {
  constructor() { this.a = []; }
  push(item) {
    const a = this.a;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

function walkable(grid, a, b) {
  return !grid.blocked[b] && Math.abs(grid.h[a] - grid.h[b]) <= STEP;
}

function lineClear(grid, ax, az, bx, bz) {
  const dist = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(dist / (CELL * 0.5)));
  let prev = cellOf(grid, ax, az);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const cur = cellOf(grid, ax + (bx - ax) * t, az + (bz - az) * t);
    if (cur !== prev && !walkable(grid, prev, cur)) return false;
    prev = cur;
  }
  return true;
}

function findPath(grid, from, to) {
  const start = nearestFree(grid, cellOf(grid, from.x, from.z));
  const goal = nearestFree(grid, cellOf(grid, to.x, to.z));
  if (start === goal) return [{ x: to.x, z: to.z }];
  const n = grid.n;
  const gScore = new Float32Array(n * n).fill(Infinity);
  const came = new Int32Array(n * n).fill(-1);
  const closed = new Uint8Array(n * n);
  const gi = goal % n;
  const gj = Math.floor(goal / n);
  const heuristic = (k) => {
    const dx = Math.abs((k % n) - gi);
    const dz = Math.abs(Math.floor(k / n) - gj);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  const heap = new Heap();
  gScore[start] = 0;
  heap.push([heuristic(start), start]);
  let expansions = 0;
  let found = false;
  while (heap.size && expansions < MAX_EXPANSIONS) {
    const [, cur] = heap.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    expansions++;
    if (cur === goal) { found = true; break; }
    const ci = cur % n;
    const cj = Math.floor(cur / n);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        const nk = nj * n + ni;
        if (closed[nk] || !walkable(grid, cur, nk)) continue;
        if (di && dj && (!walkable(grid, cur, cj * n + ni) || !walkable(grid, cur, nj * n + ci))) continue;
        let step = di && dj ? 1.414 : 1;
        for (let a = -1; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) {
            const xi = ni + a;
            const xj = nj + b;
            if ((a || b) && xi >= 0 && xj >= 0 && xi < n && xj < n && grid.blocked[xj * n + xi]) { step += 0.15; a = 2; break; }
          }
        }
        const g = gScore[cur] + step;
        if (g < gScore[nk]) {
          gScore[nk] = g;
          came[nk] = cur;
          heap.push([g + heuristic(nk), nk]);
        }
      }
    }
  }
  if (!found) return [];
  const cells = [];
  for (let k = goal; k !== -1; k = came[k]) cells.push(k);
  cells.reverse();
  const points = cells.map((k) => centerOf(grid, k));
  points[0] = { x: from.x, z: from.z };
  const out = [];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let far = anchor + 1;
    for (let k = points.length - 1; k > anchor + 1; k--) {
      if (lineClear(grid, points[anchor].x, points[anchor].z, points[k].x, points[k].z)) { far = k; break; }
    }
    out.push(points[far]);
    anchor = far;
  }
  if (out.length) out[out.length - 1] = grid.blocked[cellOf(grid, to.x, to.z)] ? out[out.length - 1] : { x: to.x, z: to.z };
  return out;
}

module.exports = { buildGrid, findPath, lineClear, cellOf };
