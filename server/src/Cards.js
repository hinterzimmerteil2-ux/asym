const Synergy = require('./synergy');

const RARITY_WEIGHTS = { common: 50, uncommon: 25, rare: 10 };

const CARDS = {
  acetilcolina: {
    id: 'acetilcolina',
    keywords: ['veloz', 'flojera', 'aliado'],
    displayName: 'Acetilcolina',
    description: 'Velocidad masiva por 5s. Correr gasta Flojera y no se regenera; si llegas a 0 el boost sigue hasta que acabe. Los Pacientes que te pasen por encima ganan un poco de velocidad. Al terminar, 1s sin regenerar y luego vas lento un rato.',
    rarity: 'rare',
    durationMs: 5000,
    cooldownMs: 30000,
  },
  rodar: {
    id: 'rodar',
    keywords: ['impulso', 'sabotaje', 'flojera'],
    displayName: 'Rodar',
    description: 'Dash que empuja al Curador (ragdoll) y arrastra a tus aliados; sube plataformas de hasta 1.8 de alto. Gasta 25 de Flojera.',
    rarity: 'uncommon',
    cooldownMs: 24000,
  },
  tropiezo: {
    id: 'tropiezo',
    hitRadius: 3,
    keywords: ['aturdir', 'sabotaje'],
    displayName: 'Tropiezo',
    description: 'Derriba (ragdoll) 3s al Curador a menos de 3 de ti y le quita 25 HP. Tú quedas en endlag 1.2s al usarla.',
    curatorHpLoss: 25,
    rarity: 'rare',
    durationMs: 3000,
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
    description: 'Dejas una trampa: derriba 2s al primer Curador que la pise.',
    rarity: 'uncommon',
    cooldownMs: 25000,
  },
  agua_rimac: {
    id: 'agua_rimac',
    deck: 'Río',
    keywords: ['zona', 'daño'],
    displayName: 'Agua del Río Rímac',
    description: 'Zona 5s: los Pacientes dentro reciben daño que sube 1 por cada 5s que permanecen. El Curador pierde Flojera y, si tiene menos de la mitad de HP, recibe daño; si tiene más, se cura.',
    rarity: 'uncommon',
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
    description: 'Mimicry de Kali: tajo rápido al Curador a menos de 6: −25 HP y aturde 2s; 10% de tajo pesado (−90 HP, aturde 3s). Recuperas 25% del daño como HP. Al elegirla: HP máximo sube a 180.',
    maxHpSet: 180,
    rarity: 'rare',
    durationMs: 2000,
    cooldownMs: 30000,
  },
  tajo_carmesi: {
    id: 'tajo_carmesi',
    hitRadius: 3.5,
    deck: 'Sangre',
    keywords: ['aturdir', 'sabotaje'],
    displayName: 'Espada del UTTVM al (10^-30)%',
    description: 'Un tajo normal: aturde 1.8s al Curador a menos de 3.5. Sin efectos secundarios.',
    rarity: 'uncommon',
    durationMs: 1800,
    cooldownMs: 26000,
  },
  receta_falsa: {
    id: 'receta_falsa',
    deck: 'Farmacia',
    keywords: ['sabotaje', 'exacerbacion'],
    displayName: 'Receta Falsa',
    description: 'Marca al Curador a menos de 8 por 10s: cada habilidad que use tarda 6s más en recargar. Si aciertas, tu próximo auto-daño hace el doble.',
    hitRadius: 8,
    rarity: 'rare',
    cooldownMs: 30000,
  },
  grito_animo: {
    id: 'grito_animo',
    keywords: ['aliado', 'pereza'],
    displayName: 'Grito de Ánimo',
    description: 'Minijuego de 8s: te mueves a la mitad y cada acierto (pulsa E al ritmo) da Pereza a los aliados a menos de 8, o a ti si no hay. Los fallos no suman. Pereza se acumula.',
    rarity: 'uncommon',
    cooldownMs: 24000,
  },
};

const SLOT_COUNT = 2;
const OPTIONS_PER_SLOT = 3;
const DRAFT_DURATION_MS = 12000;

for (const card of Object.values(CARDS)) card.weight = RARITY_WEIGHTS[card.rarity] || RARITY_WEIGHTS.common;

function getCard(cardId) {
  return CARDS[cardId] || null;
}

function dealSlot(chosenIds = []) {
  const chosenCards = chosenIds.map((id) => CARDS[id]).filter(Boolean);
  const pool = Object.values(CARDS).filter((card) => !chosenIds.includes(card.id));
  const options = [];
  while (options.length < OPTIONS_PER_SLOT && pool.length > 0) {
    const weighted = pool.map((card) => ({ card, weight: card.weight * Synergy.synergyMultiplier(card, chosenCards) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    let picked = weighted[weighted.length - 1];
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) {
        picked = entry;
        break;
      }
    }
    options.push(picked.card.id);
    pool.splice(pool.indexOf(picked.card), 1);
  }
  return { options, chosen: null };
}

function dealSlots() {
  const slots = [dealSlot([])];
  for (let i = 1; i < SLOT_COUNT; i++) slots.push({ options: [], chosen: null });
  return slots;
}

Synergy.load(Object.values(CARDS));

function listCards() {
  return Object.values(CARDS).map((card) => ({
    id: card.id,
    displayName: card.displayName,
    description: card.description,
    deck: card.deck || null,
    corrupt: Boolean(card.corrupt),
    corruptOf: card.corruptOf || null,
    maxMode: card.maxMode || 'pick',
    maxHpSet: card.maxHpSet || null,
    maxHpDelta: card.maxHpDelta || null,
    flojeraMaxDelta: card.flojeraMaxDelta || null,
    hitRadius: card.hitRadius || null,
    rarity: card.rarity,
    keywords: card.keywords,
  }));
}

module.exports = { listCards, CARDS, SLOT_COUNT, OPTIONS_PER_SLOT, DRAFT_DURATION_MS, getCard, dealSlot, dealSlots };
