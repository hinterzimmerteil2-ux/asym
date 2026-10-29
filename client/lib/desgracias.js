import { ITEMS } from './cosmetics';

export const FREE_ITEMS = ['gorro_lana', 'correa', 'mochila'];

const PRICES = {
  gorra: 40, copa: 70, casco: 60, cuernos: 90, orejas_gato: 50,
  bufanda: 40, corbata: 40, tirantes: 40,
  capa: 70, alas: 120, megafono: 80,
};

export const AXES = ['r', 'i', 'j', 'k'];

export function emptyQ() {
  return { r: 0, i: 0, j: 0, k: 0 };
}

export function addQ(a, b) {
  return { r: a.r + b.r, i: a.i + b.i, j: a.j + b.j, k: a.k + b.k };
}

export function normQ(q) {
  return Math.sqrt(q.r * q.r + q.i * q.i + q.j * q.j + q.k * q.k);
}

export function spendQ(q, price) {
  const n = normQ(q);
  if (n <= 0 || n < price) return q;
  const f = (n - price) / n;
  return { r: q.r * f, i: q.i * f, j: q.j * f, k: q.k * f };
}

export function awardToQ(items) {
  const q = emptyQ();
  for (const it of items || []) if (AXES.includes(it.axis)) q[it.axis] += it.amount;
  return q;
}

export function formatQ(q) {
  const f = (x) => (Math.round(x * 10) / 10).toString();
  return `${f(q.r)} + ${f(q.i)}i + ${f(q.j)}j + ${f(q.k)}k`;
}

export function priceOf(id) {
  return PRICES[id] ?? 50;
}

export function loadDesgracias(equipped) {
  let balance = emptyQ();
  const owned = new Set(FREE_ITEMS);
  try {
    const stored = JSON.parse(localStorage.getItem('asym_desgracias') || 'null');
    if (stored) {
      balance = typeof stored.balance === 'number' ? { ...emptyQ(), r: stored.balance } : { ...emptyQ(), ...(stored.balance || {}) };
      for (const id of stored.owned || []) owned.add(id);
    }
  } catch {}
  for (const slot of Object.keys(ITEMS)) {
    const id = equipped && equipped[slot] && equipped[slot].id;
    if (id) owned.add(id);
  }
  return { balance, owned: [...owned] };
}

export function saveDesgracias(state) {
  try { localStorage.setItem('asym_desgracias', JSON.stringify(state)); } catch {}
}
