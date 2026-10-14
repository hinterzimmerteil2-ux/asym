const CARDS = {
  sprint_panico: {
    id: 'sprint_panico',
    keywords: ['veloz','sin_gasto'],
    displayName: 'Sprint de Pánico',
    description: 'Velocidad x1.5 por 4s sin gastar Flojera.',
    rarity: 'common',
    weight: 50,
    durationMs: 4000,
    cooldownMs: 18000,
  },
  segundo_aliento: {
    id: 'segundo_aliento',
    keywords: ['flojera'],
    displayName: 'Segundo Aliento',
    description: 'Recupera 60 de Flojera al instante.',
    rarity: 'common',
    weight: 45,
    cooldownMs: 25000,
  },
  rodar: {
    id: 'rodar',
    keywords: ['impulso'],
    displayName: 'Rodar',
    description: 'Dash corto en la dirección en que te mueves.',
    rarity: 'uncommon',
    weight: 25,
    cooldownMs: 12000,
  },
  jeringa_rota: {
    id: 'jeringa_rota',
    keywords: ['resistencia'],
    displayName: 'Jeringa Rota',
    description: 'Por 6s recibes 60% menos curación.',
    rarity: 'uncommon',
    weight: 22,
    durationMs: 6000,
    cooldownMs: 24000,
  },
  humo_yodo: {
    id: 'humo_yodo',
    keywords: ['ralentizar','sabotaje'],
    displayName: 'Humo de Yodo',
    description: 'El Curador cercano (radio 7) va 50% más lento por 4s.',
    rarity: 'rare',
    weight: 10,
    durationMs: 4000,
    cooldownMs: 30000,
  },
  tropiezo: {
    id: 'tropiezo',
    keywords: ['aturdir', 'sabotaje'],
    displayName: 'Tropiezo',
    description: 'Aturde 1.5s al Curador a menos de 3 de ti.',
    rarity: 'rare',
    weight: 9,
    durationMs: 1500,
    cooldownMs: 28000,
  },
  adrenalina: {
    id: 'adrenalina',
    keywords: ['sin_gasto', 'flojera'],
    displayName: 'Adrenalina',
    description: 'Correr no gasta Flojera por 6s.',
    rarity: 'uncommon',
    weight: 22,
    durationMs: 6000,
    cooldownMs: 22000,
  },
  golpe_doble: {
    id: 'golpe_doble',
    keywords: ['daño'],
    displayName: 'Golpe Doble',
    description: 'Tu próximo auto-daño hace el doble.',
    rarity: 'rare',
    weight: 10,
    cooldownMs: 30000,
  },
};

const SLOT_COUNT = 2;
const OPTIONS_PER_SLOT = 3;
const DRAFT_DURATION_MS = 12000;

function getCard(cardId) {
  return CARDS[cardId] || null;
}

function pickWeighted(pool) {
  const total = pool.reduce((sum, card) => sum + card.weight, 0);
  let roll = Math.random() * total;
  for (const card of pool) {
    roll -= card.weight;
    if (roll <= 0) return card;
  }
  return pool[pool.length - 1];
}

function dealSlot() {
  const pool = Object.values(CARDS);
  const options = [];
  while (options.length < OPTIONS_PER_SLOT && pool.length > 0) {
    const card = pickWeighted(pool);
    options.push(card.id);
    pool.splice(pool.indexOf(card), 1);
  }
  return { options, chosen: null };
}

function dealSlots() {
  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) slots.push(dealSlot());
  return slots;
}

module.exports = { CARDS, SLOT_COUNT, OPTIONS_PER_SLOT, DRAFT_DURATION_MS, getCard, dealSlots };
