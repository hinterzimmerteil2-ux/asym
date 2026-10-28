import { ITEMS } from './cosmetics';

export const FREE_ITEMS = ['gorro_lana', 'correa', 'mochila'];

const PRICES = {
  gorra: 40, copa: 70, casco: 60, cuernos: 90, orejas_gato: 50,
  bufanda: 40, corbata: 40, tirantes: 40,
  capa: 70, alas: 120, megafono: 80,
};

export function priceOf(id) {
  return PRICES[id] ?? 50;
}

export function loadDesgracias(equipped) {
  let balance = 0;
  const owned = new Set(FREE_ITEMS);
  try {
    const stored = JSON.parse(localStorage.getItem('asym_desgracias') || 'null');
    if (stored) {
      balance = Number(stored.balance) || 0;
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
