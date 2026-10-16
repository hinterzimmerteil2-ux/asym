const RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 10 };

const CARDS = {
  acetilcolina: {
    id: 'acetilcolina',
    keywords: ['veloz', 'flojera', 'aliado'],
    displayName: 'Acetilcolina',
    description: 'Velocidad masiva por 5s, sin gastar ni regenerar Flojera. Los Pacientes que te pasen por encima ganan un poco de velocidad. Al terminar, 1s sin regenerar y luego vas lento un rato.',
    rarity: 'rare',
    durationMs: 5000,
    cooldownMs: 30000,
  },
  rodar: {
    id: 'rodar',
    keywords: ['impulso', 'sabotaje', 'flojera'],
    displayName: 'Rodar',
    description: 'Dash largo que empuja al Curador en el camino, pero gasta 25 de Flojera.',
    rarity: 'uncommon',
    cooldownMs: 24000,
  },
  humo_yodo: {
    id: 'humo_yodo',
    hitRadius: 7,
    keywords: ['ralentizar','sabotaje'],
    displayName: 'Humo de Yodo',
    description: 'El Curador cercano (radio 7) va 50% más lento por 5s.',
    rarity: 'uncommon',
    durationMs: 5000,
    cooldownMs: 30000,
  },
  tropiezo: {
    id: 'tropiezo',
    hitRadius: 3,
    keywords: ['aturdir', 'sabotaje'],
    displayName: 'Tropiezo',
    description: 'Aturde 1.5s al Curador a menos de 3 de ti y le quita 25 HP.',
    curatorHpLoss: 25,
    rarity: 'rare',
    durationMs: 1500,
    cooldownMs: 28000,
  },
  chicharron: {
    id: 'chicharron',
    deck: 'Comediante',
    keywords: ['comida', 'daño'],
    displayName: 'Chicharrón',
    description: 'Comes: pierdes 25 de HP, hasta un mínimo de 40.',
    rarity: 'common',
    cooldownMs: 20000,
  },
  goyslop: {
    id: 'goyslop',
    deck: 'Comediante',
    corrupt: true,
    keywords: ['comida', 'daño', 'vida_max', 'corrupto'],
    displayName: 'Goyslop',
    description: 'Pierdes 45 de HP, hasta un mínimo de 15. Cada uso: HP máximo −30, sin límite.',
    maxHpDelta: -30,
    maxMode: 'use',
    rarity: 'rare',
    cooldownMs: 30000,
  },
  cascara_platano: {
    id: 'cascara_platano',
    deck: 'Comediante',
    keywords: ['trampa', 'aturdir'],
    displayName: 'Cáscara de Plátano',
    description: 'Dejas una trampa: aturde 2s al primer Curador que la pise.',
    rarity: 'uncommon',
    cooldownMs: 25000,
  },
  platano_podrido: {
    id: 'platano_podrido',
    deck: 'Comediante',
    corrupt: true,
    keywords: ['trampa', 'aturdir', 'corrupto'],
    displayName: 'Plátano Podrido',
    description: 'Trampa que aturde 3.5s y quita 35 HP al Curador, pero también te aturde si la pisas. Al elegirla: HP máximo −20.',
    maxHpDelta: -20,
    curatorHpLoss: 35,
    rarity: 'rare',
    cooldownMs: 22000,
  },
  agua_rimac: {
    id: 'agua_rimac',
    deck: 'Río',
    keywords: ['zona', 'daño'],
    displayName: 'Agua del Río Rímac',
    description: 'Zona 5s que daña a quien esté dentro. Si sales antes, recibes menos. Al Curador le quita Flojera.',
    rarity: 'uncommon',
    cooldownMs: 30000,
  },
  rimac_sin_filtrar: {
    id: 'rimac_sin_filtrar',
    deck: 'Río',
    corrupt: true,
    keywords: ['zona', 'daño', 'curacion', 'corrupto'],
    displayName: 'Rímac sin Filtrar',
    description: 'Zona grande y más dañina 6s, pero deja un charco que CURA a quien lo pise. Al elegirla: HP máximo baja a 100.',
    maxHpSet: 100,
    rarity: 'rare',
    cooldownMs: 30000,
  },
  red_mist: {
    id: 'red_mist',
    hitRadius: 6,
    deck: 'Sangre',
    corrupt: true,
    corruptOf: 'golpe_aturdidor',
    keywords: ['aturdir', 'curacion', 'sabotaje', 'corrupto'],
    displayName: 'IS THAT THE RED MIST?',
    description: 'Aturde 3s al Curador a menos de 6 y le quita 40 HP, pero TE CURA 35 de HP. Al elegirla: HP máximo sube a 180.',
    maxHpSet: 180,
    curatorHpLoss: 40,
    rarity: 'rare',
    durationMs: 3000,
    cooldownMs: 30000,
  },
  tajo_carmesi: {
    id: 'tajo_carmesi',
    hitRadius: 3.5,
    deck: 'Sangre',
    keywords: ['aturdir', 'sabotaje'],
    displayName: 'Tajo Carmesí',
    description: 'Aturde 1.8s al Curador a menos de 3.5. Sin efectos secundarios.',
    rarity: 'uncommon',
    durationMs: 1800,
    cooldownMs: 26000,
  },
  receta_falsa: {
    id: 'receta_falsa',
    deck: 'Farmacia',
    keywords: ['sabotaje', 'exacerbacion'],
    displayName: 'Receta Falsa',
    description: 'Las habilidades del Curador a menos de 8 tardan 6s más en recargar. Si aciertas, tu próximo auto-daño hace el doble.',
    hitRadius: 8,
    rarity: 'rare',
    cooldownMs: 30000,
  },
  risa_enlatada: {
    id: 'risa_enlatada',
    hitRadius: 8,
    deck: 'Circo',
    keywords: ['flojera', 'sabotaje'],
    displayName: 'Risa Enlatada',
    description: 'El Curador a menos de 8 pierde 60 de Flojera.',
    rarity: 'uncommon',
    cooldownMs: 28000,
  },
  humo_toxico: {
    id: 'humo_toxico',
    hitRadius: 9,
    corrupt: true,
    keywords: ['ralentizar', 'sabotaje', 'corrupto'],
    displayName: 'Humo Tóxico',
    description: 'El Curador a menos de 9 va 50% más lento por 7s y pierde 20 HP. Al elegirla: HP máximo −20.',
    maxHpDelta: -20,
    curatorHpLoss: 20,
    rarity: 'rare',
    durationMs: 7000,
    cooldownMs: 30000,
  },
  sobredosis: {
    id: 'sobredosis',
    deck: 'Farmacia',
    corrupt: true,
    keywords: ['sabotaje', 'exacerbacion', 'corrupto'],
    displayName: 'Sobredosis',
    hitRadius: 8,
    description: 'Las habilidades del Curador a menos de 8 tardan 10s más en recargar. Al elegirla: HP máximo −25 y Flojera máxima −20.',
    maxHpDelta: -25,
    flojeraMaxDelta: -20,
    rarity: 'rare',
    cooldownMs: 30000,
  },
  risa_macabra: {
    id: 'risa_macabra',
    hitRadius: 8,
    deck: 'Circo',
    corrupt: true,
    keywords: ['flojera', 'aturdir', 'corrupto'],
    displayName: 'Risa Macabra',
    description: 'El Curador a menos de 8 pierde toda la Flojera y queda aturdido 1.5s. Al elegirla: Flojera máxima −30.',
    flojeraMaxDelta: -30,
    rarity: 'rare',
    durationMs: 1500,
    cooldownMs: 30000,
  },
  grito_animo: {
    id: 'grito_animo',
    keywords: ['aliado', 'pereza'],
    displayName: 'Grito de Ánimo',
    description: 'Los demás Pacientes a menos de 8 ganan Pereza 6s: sus cooldowns bajan más rápido. Si no hay ninguno, te la aplicas a ti con más nivel.',
    rarity: 'uncommon',
    cooldownMs: 24000,
  },
  racion_compartida: {
    id: 'racion_compartida',
    keywords: ['aliado', 'daño', 'comida'],
    displayName: 'Ración Compartida',
    description: 'Los demás Pacientes a menos de 8 pierden 15 de HP (mínimo 20). Si no hay ninguno, tu próximo auto-daño hace el doble.',
    rarity: 'uncommon',
    cooldownMs: 24000,
  },
  regalo_envenenado: {
    id: 'regalo_envenenado',
    keywords: ['curacion', 'sabotaje'],
    displayName: 'Regalo Envenenado',
    description: 'El Curador a menos de 8 gana 40 HP. Si llega a 1500, pierde.',
    rarity: 'rare',
    cooldownMs: 30000,
  },
};

const SLOT_COUNT = 2;
const OPTIONS_PER_SLOT = 3;
const DRAFT_DURATION_MS = 12000;

for (const card of Object.values(CARDS)) card.weight = RARITY_WEIGHTS[card.rarity] || RARITY_WEIGHTS.common;

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

function listCards() {
  return Object.values(CARDS).map((card) => ({
    id: card.id,
    displayName: card.displayName,
    description: card.description,
    deck: card.deck || null,
    corrupt: Boolean(card.corrupt),
    corruptOf: card.corruptOf || null,
    maxMode: card.maxMode || 'pick',
    hitRadius: card.hitRadius || null,
    maxHpSet: card.maxHpSet || null,
    maxHpDelta: card.maxHpDelta || null,
    flojeraMaxDelta: card.flojeraMaxDelta || null,
    rarity: card.rarity,
    keywords: card.keywords,
  }));
}

module.exports = { listCards, CARDS, SLOT_COUNT, OPTIONS_PER_SLOT, DRAFT_DURATION_MS, getCard, dealSlots };
