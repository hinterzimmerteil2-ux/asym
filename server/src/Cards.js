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
    description: 'Aturde 1.5s al Curador a menos de 3 de ti y le quita 80 HP.',
    curatorHpLoss: 80,
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
  chicharron: {
    id: 'chicharron',
    deck: 'Comediante',
    keywords: ['comida', 'daño'],
    displayName: 'Chicharrón',
    description: 'Comes: pierdes 25 de HP, hasta un mínimo de 40.',
    rarity: 'common',
    weight: 34,
    cooldownMs: 14000,
  },
  goyslop: {
    id: 'goyslop',
    deck: 'Comediante',
    corrupt: true,
    keywords: ['comida', 'daño', 'vida_max', 'corrupto'],
    displayName: 'Goyslop',
    description: 'Pierdes 45 de HP, hasta un mínimo de 15, pero tu HP máximo baja 30.',
    rarity: 'rare',
    weight: 7,
    cooldownMs: 20000,
  },
  cascara_platano: {
    id: 'cascara_platano',
    deck: 'Comediante',
    keywords: ['trampa', 'aturdir'],
    displayName: 'Cáscara de Plátano',
    description: 'Dejas una trampa: aturde 2s al primer Curador que la pise.',
    rarity: 'uncommon',
    weight: 20,
    cooldownMs: 22000,
  },
  platano_podrido: {
    id: 'platano_podrido',
    deck: 'Comediante',
    corrupt: true,
    keywords: ['trampa', 'aturdir', 'corrupto'],
    displayName: 'Plátano Podrido',
    description: 'Trampa que aturde 3.5s y quita 100 HP al Curador, pero también te aturde a ti si la pisas.',
    curatorHpLoss: 100,
    rarity: 'rare',
    weight: 7,
    cooldownMs: 22000,
  },
  agua_rimac: {
    id: 'agua_rimac',
    deck: 'Río',
    keywords: ['zona', 'daño'],
    displayName: 'Agua del Río Rímac',
    description: 'Zona 5s que daña a quien esté dentro. Si sales antes, recibes menos. Al Curador le quita Flojera.',
    rarity: 'uncommon',
    weight: 20,
    cooldownMs: 26000,
  },
  rimac_sin_filtrar: {
    id: 'rimac_sin_filtrar',
    deck: 'Río',
    corrupt: true,
    keywords: ['zona', 'daño', 'curacion', 'corrupto'],
    displayName: 'Rímac sin Filtrar',
    description: 'Zona grande y más dañina 6s, pero deja un charco que CURA a quien lo pise.',
    rarity: 'rare',
    weight: 7,
    cooldownMs: 30000,
  },
  red_mist: {
    id: 'red_mist',
    deck: 'Sangre',
    corrupt: true,
    keywords: ['aturdir', 'curacion', 'sabotaje', 'corrupto'],
    displayName: 'IS THAT THE RED MIST?',
    description: 'Aturde 3s al Curador a menos de 6 y le quita 120 HP, pero TE CURA 35 de HP.',
    curatorHpLoss: 120,
    rarity: 'rare',
    weight: 12,
    durationMs: 3000,
    cooldownMs: 30000,
  },
  tajo_carmesi: {
    id: 'tajo_carmesi',
    deck: 'Sangre',
    keywords: ['aturdir', 'sabotaje'],
    displayName: 'Tajo Carmesí',
    description: 'Aturde 1.8s al Curador a menos de 3.5. Sin efectos secundarios.',
    rarity: 'uncommon',
    weight: 22,
    durationMs: 1800,
    cooldownMs: 24000,
  },
  regalo_envenenado: {
    id: 'regalo_envenenado',
    keywords: ['curacion', 'sabotaje'],
    displayName: 'Regalo Envenenado',
    description: 'El Curador a menos de 8 gana 150 HP. Si llega a 1500, pierde.',
    rarity: 'rare',
    weight: 9,
    cooldownMs: 30000,
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
